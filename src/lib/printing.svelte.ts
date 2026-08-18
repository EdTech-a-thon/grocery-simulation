import type { Coupon } from './pocketbase'

export type PrintJob = { kind: 'coupons'; coupons: Coupon[] } | { kind: 'receipt' }

/**
 * A print sheet takes over the whole page, so the layout watches this and the
 * pages themselves do not have to know about printing at all.
 */
export const printing = $state({ job: null as PrintJob | null })

export function printCoupons(coupons: Coupon[]) {
  printing.job = { kind: 'coupons', coupons }
}

export function printReceipt() {
  printing.job = { kind: 'receipt' }
}

export function closePrintSheet() {
  printing.job = null
}
