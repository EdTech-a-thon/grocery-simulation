import { browser } from '$app/environment'
import type { ShelfItem } from './catalog'
import type { Coupon } from './pocketbase'

export type CartLine = ShelfItem & { key: string; quantity: number }

const cartStorageKey = 'fresh-mart-cart'

/**
 * The shopping cart, plus the two things that turn it into a bill: the coupons
 * the shopper handed over and the sales tax the class is practicing with.
 */
export const cart = $state({
  lines: [] as CartLine[],
  appliedCoupons: [] as Coupon[],
  salesTax: 0,
})

/** The same product at a different price is a separate line on the receipt. */
function cartKey(item: ShelfItem) {
  return `${item.id}:${item.price.toFixed(2)}:${item.aisleTitle}`
}

function save() {
  try {
    localStorage.setItem(cartStorageKey, JSON.stringify(cart.lines))
  } catch {
    // The cart still works for this page when browser storage is restricted.
  }
}

if (browser) {
  try {
    const stored = JSON.parse(localStorage.getItem(cartStorageKey) ?? '[]')
    if (Array.isArray(stored)) cart.lines = stored.filter((line) => line && typeof line.key === 'string')
  } catch {
    cart.lines = []
  }
}

export function addToCart(item: ShelfItem) {
  const key = cartKey(item)
  const existing = cart.lines.find((line) => line.key === key)
  if (existing) existing.quantity += 1
  else cart.lines.push({ ...item, key, quantity: 1 })
  save()
}

export function increaseCartLine(key: string) {
  const existing = cart.lines.find((line) => line.key === key)
  if (!existing) return
  existing.quantity += 1
  save()
}

export function removeFromCart(key: string) {
  const index = cart.lines.findIndex((line) => line.key === key)
  if (index === -1) return
  const existing = cart.lines[index]
  if (existing.quantity > 1) existing.quantity -= 1
  else cart.lines.splice(index, 1)
  save()
}

export function clearCart() {
  cart.lines = []
  cart.appliedCoupons = []
  save()
}

export function quantityInCart(item: ShelfItem) {
  return cart.lines.find((line) => line.key === cartKey(item))?.quantity ?? 0
}

export function keyInCart(item: ShelfItem) {
  return cartKey(item)
}

export function cartTotals() {
  return {
    totalItems: cart.lines.reduce((sum, line) => sum + line.quantity, 0),
    totalPrice: cart.lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
  }
}
