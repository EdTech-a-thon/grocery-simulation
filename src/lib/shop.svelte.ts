import { browser } from '$app/environment'
import { aisles, catalogPrice, type AisleConfig, type AisleItem } from './catalog'
import { isStoreBrand, nameBrandIdOf, storeBrandPrice } from './products'
import { cart } from './cart.svelte'
import { catalogSize } from './sizes'
import { stockedByDefault, type Store } from './store'

const studentStoreStorageKey = 'classgrocery-student-store'

/**
 * The store currently open — the one a teacher is editing, or the one a student
 * arrived at through a link. Every price on screen is read through the helpers
 * below, so switching stores is a matter of replacing what is held here.
 */
export const shop = $state({
  store: null as Store | null,
  /** Which shoppable aisle the shopper is standing in. Survives a print sheet. */
  aisleIndex: 0,
  /** The last store link a student opened, so they come back to the same store. */
  studentStore: browser ? readStudentStore() : '',
})

function readStudentStore() {
  try {
    return localStorage.getItem(studentStoreStorageKey) ?? ''
  } catch {
    return ''
  }
}

/** Opens a store and puts its rules on the cart. */
export function openStore(store: Store) {
  shop.store = store
  shop.aisleIndex = 0
  syncCartToStore(store)
}

export function rememberStudentStore(encoded: string) {
  shop.studentStore = encoded
  try {
    localStorage.setItem(studentStoreStorageKey, encoded)
  } catch {
    // The store stays open for this visit; it just will not be remembered.
  }
}

export function forgetStore() {
  shop.store = null
}

// ------------------------------------------------------- prices and stocking

export function isStocked(productId: string) {
  const store = shop.store
  if (store && productId in store.stocked) return store.stocked[productId]
  return stockedByDefault(store?.brandMode ?? 'name', productId)
}

/** The store's own package size for a product, else the catalog's. */
export function sizeFor(productId: string) {
  return shop.store?.sizes[productId] ?? catalogSize(productId)
}

/**
 * Puts a product on the open store's shelves or takes it off. Only a choice
 * that differs from what the brand setting stocks anyway is recorded, which
 * keeps the store's link short.
 */
export function setStocked(productId: string, stocked: boolean) {
  const store = shop.store
  if (!store) return
  if (stocked === stockedByDefault(store.brandMode, productId)) delete store.stocked[productId]
  else store.stocked[productId] = stocked
}

/**
 * The teacher's price, then the aisle's own price, then the catalog price. A
 * CG item nobody has priced follows the name brand beside it, so a teacher who
 * raises the price of milk sees the CG milk go up with it.
 */
export function priceFor(item: AisleItem) {
  const prices = shop.store?.prices ?? {}
  if (item.id in prices) return prices[item.id]
  const nameBrandId = nameBrandIdOf(item.id)
  if (isStoreBrand(item.id) && nameBrandId in prices) return storeBrandPrice(prices[nameBrandId])
  return item.price ?? catalogPrice(item.id)
}

/** Aisles with at least one stocked product, in catalog order. */
export function shoppableAisles(): AisleConfig[] {
  return aisles
    .map((aisle) => ({ ...aisle, items: aisle.items.filter((item) => isStocked(item.id)) }))
    .filter((aisle) => aisle.items.length > 0)
}

export function stockedProductIds() {
  const ids: string[] = []
  for (const aisle of shoppableAisles()) for (const item of aisle.items) if (!ids.includes(item.id)) ids.push(item.id)
  return ids
}

/**
 * Puts the store's own rules on the cart: the tax rate the class practices
 * with, and no coupons at all where the teacher turned them off.
 */
export function syncCartToStore(store: Store) {
  cart.salesTax = store.taxEnabled ? store.salesTax : 0
  if (!store.couponsEnabled) cart.appliedCoupons = []
}
