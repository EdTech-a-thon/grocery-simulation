/// <reference path="../pb_data/types.d.ts" />

// PocketBase runs every route handler in its own JS runtime, so handlers cannot
// see file-scope helpers in classgrocery.pb.js. Shared code lives here and each
// handler pulls it in with require(`${__hooks}/classgrocery_shared.js`).

// A teacher's class identifier, and the short label they give one class.
const JOIN_PREFIX_PATTERN = /^[A-Z0-9]{3,12}$/
const JOIN_LABEL_PATTERN = /^[A-Z0-9]{1,6}$/

/**
 * The form join codes are compared in: letters and digits only, uppercase. The
 * dash in OTTER-P3 is decoration, so a student who leaves it out — or adds one
 * of their own — still lands in the right store.
 */
function joinKey(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 19)
}

function normalizeJoinPrefix(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
}

function normalizeJoinLabel(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

/** What the teacher hands out and what students read off the board. */
function joinCodeFor(prefix, label) {
  return `${prefix}-${label}`
}

// PocketBase stores dates as "2026-07-22 08:57:00.000Z". Browsers only parse the
// "T" form reliably, so hand the frontend something new Date() always understands.
function isoDate(record, field) {
  const raw = record.getString(field)
  return raw ? raw.replace(' ', 'T') : ''
}

function couponPayload(record) {
  return {
    code: record.getString('code'),
    discountType: record.getString('discountType'),
    discountAmount: record.getFloat('discountAmount'),
    productId: record.getString('productId'),
    startsAt: isoDate(record, 'startsAt'),
    endsAt: isoDate(record, 'endsAt'),
  }
}

function freshCouponCode(tx) {
  // Codes are printed as Code 39 barcodes, so they stay short and unambiguous.
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = 'CG-' + $security.randomStringWithAlphabet(6, '0123456789ABCDEF')
    try {
      tx.findFirstRecordByData('coupons', 'code', code)
    } catch (_) {
      return code // nothing found, so the code is free
    }
  }
  throw new BadRequestError('Could not generate a unique coupon code.')
}

/**
 * Works out a store's joinKey from its owner's class identifier, and refuses
 * the save if the teacher has not chosen one or has used this label already.
 * Shared by the collection hooks and by the duplicate route.
 */
function resolveJoinKey(tx, ownerId, rawLabel, ignoreStoreId) {
  const owner = tx.findRecordById('teachers', ownerId)
  const prefix = normalizeJoinPrefix(owner.getString('joinPrefix'))
  if (!JOIN_PREFIX_PATTERN.test(prefix)) {
    throw new BadRequestError('Choose your class identifier before creating a store.')
  }

  const label = normalizeJoinLabel(rawLabel)
  if (!JOIN_LABEL_PATTERN.test(label)) {
    throw new BadRequestError('Give the class a short code of 1 to 6 letters or numbers, such as P3.')
  }

  let clash = null
  try {
    clash = tx.findFirstRecordByFilter(
      'stores', 'owner = {:owner} && joinLabel = {:label}', { owner: ownerId, label },
    )
  } catch (_) {
    clash = null // nothing found, so the label is free
  }
  if (clash && clash.id !== ignoreStoreId) {
    throw new BadRequestError(`You already have a class called ${label}. Give this one a different code.`)
  }

  return { prefix, label, joinKey: joinKey(prefix + label), joinCode: joinCodeFor(prefix, label) }
}

module.exports = {
  JOIN_PREFIX_PATTERN, JOIN_LABEL_PATTERN,
  joinKey, normalizeJoinPrefix, normalizeJoinLabel, joinCodeFor,
  isoDate, couponPayload, freshCouponCode, resolveJoinKey,
}
