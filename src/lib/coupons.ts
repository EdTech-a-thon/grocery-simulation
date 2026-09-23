import { cart } from './cart.svelte'
import { money } from './catalog'
import { current, productName, t } from './i18n/index.svelte'
import type { Coupon } from './pocketbase'

export function formatCouponItem(coupon: Coupon) {
  return coupon.productId === 'all' ? t('coupon.entirePurchase') : productName(coupon.productId)
}

export function formatDate(value: string) {
  return value
    ? new Date(value).toLocaleString(current().locale, { dateStyle: 'medium', timeStyle: 'short' })
    : t('coupon.noLimit')
}

export function couponCopies(coupon: Coupon) {
  return Math.min(100, Math.max(1, Math.round(coupon.copies || 1)))
}

export function couponDiscountLabel(coupon: Coupon) {
  return coupon.discountType === 'dollars'
    ? t('coupon.dollarsOff', { amount: money(coupon.discountAmount) })
    : t('coupon.percentOff', { amount: coupon.discountAmount })
}

/** The whole offer as one phrase: "10% off Milk", "10 % de réduction sur Lait". */
export function couponOffer(coupon: Coupon) {
  return t('coupon.offer', { discount: couponDiscountLabel(coupon), item: formatCouponItem(coupon) })
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
  if (coupon.startsAt && now < new Date(coupon.startsAt).getTime()) return t('coupon.notActiveYet')
  if (coupon.endsAt && now > new Date(coupon.endsAt).getTime()) return t('coupon.expired')
  if (coupon.productId !== 'all' && !cart.lines.some((line) => line.id === coupon.productId)) {
    return t('coupon.needsItem', { name: productName(coupon.productId) || t('coupon.theItem') })
  }
  return ''
}
