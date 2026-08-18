import { cart, type CartLine } from './cart.svelte'
import { money } from './catalog'
import { couponDiscountLabel, discountFor } from './coupons'
import type { Coupon } from './pocketbase'

export type ReceiptCoupon = { coupon: Coupon; amount: number }
export type ReceiptLine = { item: CartLine; lineTotal: number; coupons: ReceiptCoupon[] }
export type Receipt = ReturnType<typeof buildReceipt>

/** Works out what the cart costs once every applied coupon has been counted. */
export function buildReceipt() {
  const lines: ReceiptLine[] = cart.lines.map((item) => ({
    item, lineTotal: item.price * item.quantity, coupons: [],
  }))
  const totalPrice = lines.reduce((sum, line) => sum + line.lineTotal, 0)
  const purchaseCoupons: ReceiptCoupon[] = []

  for (const coupon of cart.appliedCoupons) {
    if (coupon.productId === 'all') {
      purchaseCoupons.push({ coupon, amount: discountFor(coupon, totalPrice) })
      continue
    }
    const matching = lines.filter((line) => line.item.id === coupon.productId)
    const eligible = matching.reduce((sum, line) => sum + line.lineTotal, 0)
    if (eligible <= 0) continue
    const amount = discountFor(coupon, eligible)
    // One product can sit on several cart lines, because a price change splits
    // them, so share the saving out in proportion to what each line costs.
    for (const line of matching) line.coupons.push({ coupon, amount: amount * (line.lineTotal / eligible) })
  }

  const lineDiscount = lines.reduce((sum, line) => sum + line.coupons.reduce((total, entry) => total + entry.amount, 0), 0)
  const purchaseDiscount = purchaseCoupons.reduce((sum, entry) => sum + entry.amount, 0)
  const discount = Math.min(totalPrice, lineDiscount + purchaseDiscount)
  const discountedPrice = Math.max(0, totalPrice - discount)
  const salesTaxAmount = discountedPrice * cart.salesTax / 100

  return { lines, purchaseCoupons, totalPrice, discount, discountedPrice, salesTaxAmount, finalTotal: discountedPrice + salesTaxAmount }
}

/** The same receipt as plain text, for the Copy button. */
export function receiptText() {
  const receipt = buildReceipt()
  const rows = ['FRESH MART RECEIPT', '']
  for (const line of receipt.lines) {
    rows.push(`${line.item.name}  ${line.item.quantity} x ${money(line.item.price)} = ${money(line.lineTotal)}`)
    for (const entry of line.coupons) rows.push(`   ${entry.coupon.code}  ${couponDiscountLabel(entry.coupon)}: -${money(entry.amount)}`)
  }
  for (const entry of receipt.purchaseCoupons) {
    rows.push(`Entire purchase  ${entry.coupon.code}  ${couponDiscountLabel(entry.coupon)}: -${money(entry.amount)}`)
  }
  rows.push('', `Shopping list total: ${money(receipt.totalPrice)}`)
  rows.push(`Subtotal after savings: ${money(receipt.discountedPrice)}`)
  rows.push(`Sales tax (${cart.salesTax}%): ${money(receipt.salesTaxAmount)}`)
  rows.push(`FINAL TOTAL: ${money(receipt.finalTotal)}`)
  rows.push('', `TOTAL AMOUNT SAVED TODAY: ${money(receipt.discount)}`)
  return rows.join('\n')
}
