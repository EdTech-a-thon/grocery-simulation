/// <reference path="../pb_data/types.d.ts" />

// PocketBase runs every route handler in its own JS runtime, so handlers cannot
// see file-scope helpers in freshmart.pb.js. Shared code lives here and each
// handler pulls it in with require(`${__hooks}/freshmart_shared.js`).

const JOIN_CODE_PATTERN = /^[A-Z0-9-]{3,20}$/

function normalizeJoinCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20)
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
    const code = 'FM-' + $security.randomStringWithAlphabet(6, '0123456789ABCDEF')
    try {
      tx.findFirstRecordByData('coupons', 'code', code)
    } catch (_) {
      return code // nothing found, so the code is free
    }
  }
  throw new BadRequestError('Could not generate a unique coupon code.')
}

module.exports = { JOIN_CODE_PATTERN, normalizeJoinCode, isoDate, couponPayload, freshCouponCode }
