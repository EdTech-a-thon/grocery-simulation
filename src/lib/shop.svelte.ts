import { browser } from '$app/environment'
import { aisles, catalogPrice, type AisleConfig, type AisleItem } from './catalog'
import { isStoreBrand, nameBrandIdOf, storeBrandPrice } from './products'
import { cart, forgetCartOf, useCartOf } from './cart.svelte'
import { catalogSize } from './sizes'
import { stockedByDefault, storeColors, type Store, type StoreColor } from './store'

const studentStoreStorageKey = 'classgrocery-student-store'
const studentStoresStorageKey = 'classgrocery-student-stores'

/**
 * A store link a student has opened in this browser. The name and colour are
 * kept beside the link so the list of stores can be shown without unpacking
 * every link in it.
 */
export type StudentStore = { encoded: string; name: string; color: StoreColor }

/**
 * The store currently open — the one a teacher is editing, or the one a student
 * arrived at through a link. Every price on screen is read through the helpers
 * below, so switching stores is a matter of replacing what is held here.
 */
export const shop = $state({
  store: null as Store | null,
  /** Which shoppable aisle the shopper is standing in. Survives a print sheet. */
  aisleIndex: 0,
  /** The store link a student has open, so they come back to the same store. */
  studentStore: browser ? readStudentStore() : '',
  /** Every store link a student has opened here, newest first, so they can switch between them. */
  studentStores: browser ? readStudentStores() : ([] as StudentStore[]),
})

function readStudentStore() {
  try {
    return localStorage.getItem(studentStoreStorageKey) ?? ''
  } catch {
    return ''
  }
}

function readStudentStores(): StudentStore[] {
  try {
    const stored = JSON.parse(localStorage.getItem(studentStoresStorageKey) ?? '[]')
    if (!Array.isArray(stored)) return []
    return stored.filter(
      (entry) =>
        typeof entry?.encoded === 'string' && typeof entry.name === 'string' && storeColors.includes(entry.color),
    )
  } catch {
    return []
  }
}

function saveStudentStores() {
  try {
    localStorage.setItem(studentStoresStorageKey, JSON.stringify(shop.studentStores))
  } catch {
    // The list still works until the page closes.
  }
}

/** Opens a store, with its own cart, and puts its rules on that cart. */
export function openStore(store: Store) {
  shop.store = store
  shop.aisleIndex = 0
  useCartOf(store.name)
  syncCartToStore(store)
}

/**
 * Makes a student's store the one the front page opens, and puts it on their
 * list of stores. A store with the same name as one already on the list takes
 * its place there, since it is almost always the teacher's updated link. A
 * store already on the list keeps its place, so the list does not reshuffle
 * every time a student switches.
 */
export function rememberStudentStore(encoded: string, store: Store) {
  shop.studentStore = encoded
  try {
    localStorage.setItem(studentStoreStorageKey, encoded)
  } catch {
    // The store stays open for this visit; it just will not be remembered.
  }

  const entry = { encoded, name: store.name, color: store.color }
  const index = shop.studentStores.findIndex((existing) => existing.encoded === encoded || existing.name === store.name)
  if (index === -1) shop.studentStores.unshift(entry)
  else shop.studentStores[index] = entry
  saveStudentStores()
}

/** Takes a store and its cart off a student's list, and stops the front page opening it. */
export function removeStudentStore(encoded: string) {
  const removed = shop.studentStores.find((entry) => entry.encoded === encoded)
  if (removed) forgetCartOf(removed.name)
  shop.studentStores = shop.studentStores.filter((entry) => entry.encoded !== encoded)
  saveStudentStores()
  if (shop.studentStore === encoded) forgetStudentStore()
}

/**
 * Stops this browser opening a student store from the front page. The list of
 * stores is kept, so a student who wanders into the teacher pages loses nothing.
 */
export function forgetStudentStore() {
  shop.studentStore = ''
  try {
    localStorage.removeItem(studentStoreStorageKey)
  } catch {
    // Nothing was remembered, or nothing can be.
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
  if (isStoreBrand(item.id) && nameBrandId in prices) return storeBrandPrice(nameBrandId, prices[nameBrandId])
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
