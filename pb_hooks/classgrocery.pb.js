/// <reference path="../pb_data/types.d.ts" />

// ClassGrocery keeps its product catalog in the browser bundle (src/products.ts).
// PocketBase only stores who the teacher is, which stores they run, which products
// each store stocks and at what price, and the coupons for that store.
//
// Helpers live in classgrocery_shared.js — see the note at the top of that file.

// A store's join code is not the teacher's to type: it is their class identifier
// plus the label they gave this class. These two hooks fill it in on the way
// past, so whatever the browser sent for joinKey is replaced by the real thing.
onRecordCreateRequest((e) => {
  const shared = require(`${__hooks}/classgrocery_shared.js`)

  const resolved = shared.resolveJoinKey(e.app, e.auth.id, e.record.getString('joinLabel'), '')
  e.record.set('joinLabel', resolved.label)
  e.record.set('joinKey', resolved.joinKey)

  e.next()
}, 'stores')

onRecordUpdateRequest((e) => {
  const shared = require(`${__hooks}/classgrocery_shared.js`)

  const resolved = shared.resolveJoinKey(e.app, e.record.getString('owner'), e.record.getString('joinLabel'), e.record.id)
  e.record.set('joinLabel', resolved.label)
  e.record.set('joinKey', resolved.joinKey)

  e.next()
}, 'stores')

// Students have no account, so joining a store cannot go through the collection
// API: an owner-scoped list rule (correctly) hides every store from them.
// This route is the one public read, and it returns only what a shopper needs.
routerAdd('GET', '/api/classgrocery/store/{joinCode}', (e) => {
  const shared = require(`${__hooks}/classgrocery_shared.js`)

  // Students type what is on the board. Dashes, spaces and lower case are all
  // forgiven, because none of them change which store is meant.
  const key = shared.joinKey(e.request.pathValue('joinCode'))
  if (key.length < 4) throw new NotFoundError('Store not found')

  let store
  try {
    store = e.app.findFirstRecordByData('stores', 'joinKey', key)
  } catch (_) {
    throw new NotFoundError('Store not found')
  }

  // The tidy form of the code, so the student's screen shows OTTER-P3 however
  // they happened to type it.
  let joinCode = key
  try {
    const owner = e.app.findRecordById('teachers', store.getString('owner'))
    joinCode = shared.joinCodeFor(owner.getString('joinPrefix'), store.getString('joinLabel'))
  } catch (_) {
    // A store with no readable owner still opens; it just shows the plain code.
  }

  const items = {}
  for (const record of e.app.findRecordsByFilter('store_items', 'store = {:store}', '', 0, 0, { store: store.id })) {
    const entry = {}
    // An unset price means "use the catalog price", which is not the same as 0.
    if (record.get('price') !== null && record.get('price') !== '') entry.price = record.getFloat('price')
    if (record.getBool('hidden')) entry.hidden = true
    items[record.getString('productId')] = entry
  }

  const coupons = store.getBool('couponsDisabled') ? [] : e.app
    .findRecordsByFilter('coupons', 'store = {:store}', 'created', 0, 0, { store: store.id })
    .map(shared.couponPayload) // `copies` is a teacher-only printing detail and stays out of this payload

  return e.json(200, {
    store: {
      id: store.id,
      name: store.getString('name'),
      color: store.getString('color'),
      joinLabel: store.getString('joinLabel'),
      joinCode,
      brandMode: store.getString('brandMode') || 'name',
      couponsEnabled: !store.getBool('couponsDisabled'),
      taxEnabled: store.getBool('taxEnabled'),
      salesTax: store.getFloat('salesTax'),
    },
    items,
    coupons,
  })
})

// Copying a store touches many records at once and has to be all-or-nothing,
// so it belongs here rather than in a loop in the browser.
routerAdd('POST', '/api/classgrocery/stores/{id}/duplicate', (e) => {
  const shared = require(`${__hooks}/classgrocery_shared.js`)

  const body = new DynamicModel({ name: '', color: '', joinLabel: '' })
  e.bindBody(body)

  const name = String(body.name || '').trim().slice(0, 60)
  if (!name) throw new BadRequestError('Give the new store a name.')

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

    // The saves below go straight to the database, so they skip the request
    // hooks above and have to work the code out for themselves.
    const resolved = shared.resolveJoinKey(tx, teacherId, body.joinLabel, '')

    const copy = new Record(tx.findCollectionByNameOrId('stores'))
    copy.set('owner', teacherId)
    copy.set('name', name)
    copy.set('color', String(body.color || source.getString('color')))
    copy.set('joinLabel', resolved.label)
    copy.set('joinKey', resolved.joinKey)
    copy.set('brandMode', source.getString('brandMode'))
    copy.set('couponsDisabled', source.getBool('couponsDisabled'))
    copy.set('taxEnabled', source.getBool('taxEnabled'))
    copy.set('salesTax', source.getFloat('salesTax'))
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

    response = {
      id: copy.id,
      name,
      color: copy.getString('color'),
      joinLabel: resolved.label,
      joinCode: resolved.joinCode,
      brandMode: copy.getString('brandMode') || 'name',
      couponsEnabled: !copy.getBool('couponsDisabled'),
      taxEnabled: copy.getBool('taxEnabled'),
      salesTax: copy.getFloat('salesTax'),
    }
  })

  return e.json(200, response)
}, $apis.requireAuth('teachers'), $apis.bodyLimit(2048))

// Switching a store between the name brands and the CG line touches every
// product at once — around 350 rows — so it is one transactional request rather
// than a few hundred from the browser. The catalog is not in the database, so
// the browser sends the ids and the price each one should start at; a product
// that already has a row keeps the price the teacher typed.
routerAdd('POST', '/api/classgrocery/stores/{id}/brands', (e) => {
  const body = new DynamicModel({ mode: '', items: [] })
  e.bindBody(body)

  const mode = String(body.mode || '')
  if (mode !== 'name' && mode !== 'store' && mode !== 'both') throw new BadRequestError('Choose which brands to stock.')

  const items = body.items || []
  if (!items.length) throw new BadRequestError('Nothing to stock.')

  const storeId = e.request.pathValue('id')
  const teacherId = e.auth.id
  let stocked = 0

  e.app.runInTransaction((tx) => {
    let store
    try {
      store = tx.findFirstRecordByFilter('stores', 'id = {:id} && owner = {:owner}', { id: storeId, owner: teacherId })
    } catch (_) {
      throw new NotFoundError('Store not found') // same answer whether it is missing or someone else's
    }
    store.set('brandMode', mode)
    tx.save(store)

    const existing = {}
    for (const row of tx.findRecordsByFilter('store_items', 'store = {:store}', '', 0, 0, { store: store.id })) {
      existing[row.getString('productId')] = row
    }

    const collection = tx.findCollectionByNameOrId('store_items')
    for (const item of items) {
      const productId = String(item.id || '')
      if (!productId) continue

      // '-cg' is what marks a product as part of the store-brand line; see
      // storeBrandSuffix in src/lib/products.ts.
      const isStoreBrand = productId.slice(-3) === '-cg'
      const wanted = mode === 'both' || (mode === 'store') === isStoreBrand
      if (wanted) stocked += 1

      const row = existing[productId]
      if (row) {
        // Leave the price alone: it may be one the teacher typed.
        row.set('hidden', !wanted)
        tx.save(row)
        continue
      }

      const fresh = new Record(collection)
      fresh.set('store', store.id)
      fresh.set('productId', productId)
      fresh.set('price', Number(item.price) || 0)
      fresh.set('hidden', !wanted)
      tx.save(fresh)
      // Some catalog items appear in more than one aisle. Reuse the row when
      // that product id comes around again instead of violating the per-store
      // uniqueness rule.
      existing[productId] = fresh
    }
  })

  return e.json(200, { mode: mode, stocked: stocked })
}, $apis.requireAuth('teachers'), $apis.bodyLimit(65536))
