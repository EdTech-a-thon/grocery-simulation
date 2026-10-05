import { browser } from '$app/environment'
import type { ShelfItem } from './catalog'
import type { Coupon } from './store'

export type CartLine = ShelfItem & { key: string; quantity: number }

const cartsStorageKey = 'classgrocery-carts'
/** Where the app kept its one cart before every store had its own. */
const oldCartStorageKey = 'fresh-mart-cart'

/**
 * The shopping cart on screen, plus the two things that turn it into a bill:
 * the coupons the shopper handed over and the sales tax the class is
 * practicing with.
 */
export const cart = $state({
  lines: [] as CartLine[],
  appliedCoupons: [] as Coupon[],
  salesTax: 0,
  /** The currency the line prices are in. */
  currency: 'USD',
  /** The line a shopper last took off a shelf, and a count that ticks each time, so the cart can show it. */
  lastAdded: { key: '', count: 0 },
})

/** The same product at a different price is a separate line on the receipt. */
function cartKey(item: ShelfItem) {
  return `${item.id}:${item.price.toFixed(2)}:${item.aisleTitle}`
}

// Every store keeps its own cart, by store name, so a student who hops to
// another store and back finds their cart as they left it. A teacher's
// updated link keeps the store's name, so it keeps the cart too.
type SavedCart = { lines: CartLine[]; coupons: Coupon[]; currency?: string }
const carts: Record<string, SavedCart> = browser ? loadCarts() : {}
/** Whose cart is on screen: a store name, or null before any store opens. */
let cartOwner: string | null = null
/** A cart left from before stores had their own. The first store opened takes it. */
let unclaimedLines: CartLine[] = browser ? loadOldCart() : []

function cleanLines(value: unknown): CartLine[] {
  return Array.isArray(value) ? value.filter((line) => line && typeof line.key === 'string') : []
}

function loadCarts() {
  try {
    const stored = JSON.parse(localStorage.getItem(cartsStorageKey) ?? '{}')
    const loaded: Record<string, SavedCart> = {}
    for (const [name, saved] of Object.entries(stored ?? {})) {
      const { lines, coupons, currency } = (saved ?? {}) as Partial<SavedCart>
      loaded[name] = {
        lines: cleanLines(lines),
        coupons: Array.isArray(coupons) ? coupons.filter((coupon) => typeof coupon?.code === 'string') : [],
        currency: typeof currency === 'string' ? currency : 'USD',
      }
    }
    return loaded
  } catch {
    return {}
  }
}

function loadOldCart() {
  try {
    return cleanLines(JSON.parse(localStorage.getItem(oldCartStorageKey) ?? '[]'))
  } catch {
    return []
  }
}

function save() {
  if (cartOwner === null) return
  if (cart.lines.length || cart.appliedCoupons.length) {
    carts[cartOwner] = $state.snapshot({ lines: cart.lines, coupons: cart.appliedCoupons, currency: cart.currency })
  } else delete carts[cartOwner]
  try {
    localStorage.setItem(cartsStorageKey, JSON.stringify(carts))
  } catch {
    // The cart still works for this page when browser storage is restricted.
  }
}

/** Puts a store's own cart on screen, just as it was left. */
export function useCartOf(storeName: string) {
  if (storeName === cartOwner) return
  cartOwner = storeName
  const saved = carts[storeName]
  cart.lines = saved?.lines ?? unclaimedLines
  cart.appliedCoupons = saved?.coupons ?? []
  cart.currency = saved?.currency ?? 'USD'
  if (!saved && unclaimedLines.length) save()
  if (unclaimedLines.length) {
    unclaimedLines = []
    try {
      localStorage.removeItem(oldCartStorageKey)
    } catch {
      // It stays behind, unread.
    }
  }
}

/** Throws away a store's cart, for a store the shopper has taken off their list. */
export function forgetCartOf(storeName: string) {
  delete carts[storeName]
  if (storeName === cartOwner) {
    cart.lines = []
    cart.appliedCoupons = []
  }
  save()
}

/**
 * A cart's prices are in the money they were picked up in, so a store that
 * changes currency starts a fresh cart rather than show dollars as yen.
 */
export function priceCartIn(currency: string) {
  if (cart.currency === currency) return
  cart.currency = currency
  cart.lines = []
  cart.appliedCoupons = []
  save()
}

export function addToCart(item: ShelfItem) {
  const key = cartKey(item)
  const existing = cart.lines.find((line) => line.key === key)
  if (existing) existing.quantity += 1
  else cart.lines.push({ ...item, key, quantity: 1 })
  cart.lastAdded = { key, count: cart.lastAdded.count + 1 }
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

export function applyCoupon(coupon: Coupon) {
  cart.appliedCoupons.push(coupon)
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
