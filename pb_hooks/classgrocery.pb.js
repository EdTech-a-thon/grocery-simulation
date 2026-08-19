/// <reference path="../pb_data/types.d.ts" />

// ClassGrocery keeps its product catalogue in the browser bundle (src/products.ts).
// PocketBase only stores who the teacher is, which stores they run, which products
// each store stocks and at what price, and the coupons for that store.
//
// Helpers live in classgrocery_shared.js — see the note at the top of that file.

// Students have no account, so joining a store cannot go through the collection
// API: an owner-scoped list rule (correctly) hides every store from them.
// This route is the one public read, and it returns only what a shopper needs.
routerAdd('GET', '/api/classgrocery/store/{joinCode}', (e) => {
  const shared = require(`${__hooks}/classgrocery_shared.js`)

  const joinCode = shared.normalizeJoinCode(e.request.pathValue('joinCode'))
  if (!shared.JOIN_CODE_PATTERN.test(joinCode)) throw new NotFoundError('Store not found')

  let store
  try {
    store = e.app.findFirstRecordByData('stores', 'joinCode', joinCode)
  } catch (_) {
    throw new NotFoundError('Store not found')
  }

  const items = {}
  for (const record of e.app.findRecordsByFilter('store_items', 'store = {:store}', '', 0, 0, { store: store.id })) {
    const entry = {}
    // An unset price means "use the catalogue price", which is not the same as 0.
    if (record.get('price') !== null && record.get('price') !== '') entry.price = record.getFloat('price')
    if (record.getBool('hidden')) entry.hidden = true
    items[record.getString('productId')] = entry
  }

  const coupons = e.app
    .findRecordsByFilter('coupons', 'store = {:store}', 'created', 0, 0, { store: store.id })
    .map(shared.couponPayload) // `copies` is a teacher-only printing detail and stays out of this payload

  return e.json(200, {
    store: { id: store.id, name: store.getString('name'), color: store.getString('color'), joinCode },
    items,
    coupons,
  })
})

// Copying a store touches many records at once and has to be all-or-nothing,
// so it belongs here rather than in a loop in the browser.
routerAdd('POST', '/api/classgrocery/stores/{id}/duplicate', (e) => {
  const shared = require(`${__hooks}/classgrocery_shared.js`)

  const body = new DynamicModel({ name: '', color: '', joinCode: '' })
  e.bindBody(body)

  const name = String(body.name || '').trim().slice(0, 60)
  const joinCode = shared.normalizeJoinCode(body.joinCode)
  if (!name) throw new BadRequestError('Give the new store a name.')
  if (!shared.JOIN_CODE_PATTERN.test(joinCode)) throw new BadRequestError('Use 3 to 20 letters, numbers or dashes for the join code.')

  const sourceId = e.request.pathValue('id')
  const teacherId = e.auth.id
  let response

  e.app.runInTransaction((tx) => {
    let source
    try {
      source = tx.findFirstRecordByFilter('stores', 'id = {:id} && owner = {:owner}', { id: sourceId, owner: teacherId })
    } catch (_) {
      throw new NotFoundError('Store not found') // same answer whether it is missing or someone else's
    }

    let taken = true
    try {
      tx.findFirstRecordByData('stores', 'joinCode', joinCode)
    } catch (_) {
      taken = false
    }
    if (taken) throw new BadRequestError('That join code is already taken. Pick another.')

    const copy = new Record(tx.findCollectionByNameOrId('stores'))
    copy.set('owner', teacherId)
    copy.set('name', name)
    copy.set('color', String(body.color || source.getString('color')))
    copy.set('joinCode', joinCode)
    tx.save(copy)

    for (const item of tx.findRecordsByFilter('store_items', 'store = {:store}', '', 0, 0, { store: source.id })) {
      const clone = new Record(tx.findCollectionByNameOrId('store_items'))
      clone.set('store', copy.id)
      clone.set('productId', item.getString('productId'))
      clone.set('price', item.get('price'))
      clone.set('hidden', item.getBool('hidden'))
      tx.save(clone)
    }

    for (const coupon of tx.findRecordsByFilter('coupons', 'store = {:store}', '', 0, 0, { store: source.id })) {
      const clone = new Record(tx.findCollectionByNameOrId('coupons'))
      clone.set('store', copy.id)
      // Deliberately a new code: coupons already printed for the old class must
      // not be spendable in the new one.
      clone.set('code', shared.freshCouponCode(tx))
      clone.set('discountType', coupon.getString('discountType'))
      clone.set('discountAmount', coupon.getFloat('discountAmount'))
      clone.set('productId', coupon.getString('productId'))
      clone.set('startsAt', coupon.get('startsAt'))
      clone.set('endsAt', coupon.get('endsAt'))
      clone.set('copies', coupon.getInt('copies'))
      tx.save(clone)
    }

    response = { id: copy.id, name, color: copy.getString('color'), joinCode }
  })

  return e.json(200, response)
}, $apis.requireAuth('teachers'), $apis.bodyLimit(2048))
