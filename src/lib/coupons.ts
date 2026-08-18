import { cart } from './cart.svelte'
import { money } from './catalog'
import { productById } from './products'
import type { Coupon } from './pocketbase'

export function formatCouponItem(coupon: Coupon) {
  return coupon.productId === 'all' ? 'entire purchase' : productById[coupon.productId]?.name ?? coupon.productId
}

export function formatDate(value: string) {
  return value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'No limit'
}

export function couponCopies(coupon: Coupon) {
  return Math.min(100, Math.max(1, Math.round(coupon.copies || 1)))
}

export function couponDiscountLabel(coupon: Coupon) {
  return coupon.discountType === 'dollars'
    ? `${money(coupon.discountAmount)} off`
    : `${coupon.discountAmount}% off`
}

/** A coupon can never take off more than the items it applies to actually cost. */
export function discountFor(coupon: Coupon, eligibleTotal: number) {
  const raw = coupon.discountType === 'dollars'
    ? coupon.discountAmount
    : eligibleTotal * coupon.discountAmount / 100
  return Math.max(0, Math.min(raw, eligibleTotal))
}

/** Why this coupon cannot be used right now, or '' when it can. */
export function couponStatus(coupon: Coupon) {
  const now = Date.now()
  if (coupon.startsAt && now < new Date(coupon.startsAt).getTime()) return 'This coupon is not active yet.'
  if (coupon.endsAt && now > new Date(coupon.endsAt).getTime()) return 'This coupon has expired.'
  if (coupon.productId !== 'all' && !cart.lines.some((line) => line.id === coupon.productId)) {
    return `Add ${productById[coupon.productId]?.name ?? 'the coupon item'} to the cart first.`
  }
  return ''
}

// ---------------------------------------------------------------- barcodes

const code39Patterns: Record<string, string> = {
  '0':'nnnwwnwnn','1':'wnnwnnnnw','2':'nnwwnnnnw','3':'wnwwnnnnn','4':'nnnwwnnnw','5':'wnnwwnnnn','6':'nnwwwnnnn','7':'nnnwnnwnw','8':'wnnwnnwnn','9':'nnwwnnwnn',
  A:'wnnnnwnnw',B:'nnwnnwnnw',C:'wnwnnwnnn',D:'nnnnwwnnw',E:'wnnnwwnnn',F:'nnwnwwnnn',G:'nnnnnwwnw',H:'wnnnnwwnn',I:'nnwnnwwnn',J:'nnnnwwwnn',
  K:'wnnnnnnww',L:'nnwnnnnww',M:'wnwnnnnwn',N:'nnnnwnnww',O:'wnnnwnnwn',P:'nnwnwnnwn',Q:'nnnnnnwww',R:'wnnnnnwwn',S:'nnwnnnwwn',T:'nnnnwnwwn',
  U:'wwnnnnnnw',V:'nwwnnnnnw',W:'wwwnnnnnn',X:'nwnnwnnnw',Y:'wwnnwnnnn',Z:'nwwnwnnnn','-':'nwnnnnwnw','.':'wwnnnnwnn',' ':'nwwnnnwnn','$':'nwnwnwnnn','/':'nwnwnnnwn','+':'nwnnnwnwn','%':'nnnwnwnwn','*':'nwnnwnwnn',
}

/** The black bars of a Code 39 barcode, so a coupon can be scanned by camera. */
export function barcodeBars(code: string) {
  const encoded = `*${code.toUpperCase()}*`
  const bars: Array<{ x: number; width: number }> = []
  let x = 10
  for (const character of encoded) {
    const pattern = code39Patterns[character]
    if (!pattern) continue
    ;[...pattern].forEach((width, index) => {
      const pixels = width === 'w' ? 4 : 2
      if (index % 2 === 0) bars.push({ x, width: pixels })
      x += pixels
    })
    x += 2
  }
  return { bars, width: x + 8 }
}
