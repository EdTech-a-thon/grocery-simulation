import { browser } from '$app/environment'
import { aisles, catalogPrice, type AisleConfig, type AisleItem } from './catalog'
import { joinKey } from './joincodes'
import { isStoreBrand, nameBrandIdOf, storeBrandPrice } from './products'
import { cart } from './cart.svelte'
import {
  fetchStoreByJoinCode, loadCoupons, loadStoreItems,
  type Coupon, type Store, type StoreItem,
} from './pocketbase'

const studentJoinCodeStorageKey = 'classgrocery-student-class-code'

/**
 * The store currently open — the one a teacher is editing, or the one a student
 * joined. Every price on screen is read through the helpers below, so switching
 * stores is a matter of replacing what is held here.
 */
export const shop = $state({
  store: null as Store | null,
  /** Per-product price and stocking overrides, keyed by product id. */
  items: {} as Record<string, StoreItem>,
  coupons: [] as Coupon[],
  /** Which shoppable aisle the shopper is standing in. Survives a print sheet. */
  aisleIndex: 0,
  /** The code a student typed, remembered so they come back to the same store. */
  studentJoinCode: browser ? localStorage.getItem(studentJoinCodeStorageKey) ?? '' : '',
  refreshing: false,
})

export function rememberStudentJoinCode(code: string) {
  shop.studentJoinCode = joinKey(code)
  try {
    localStorage.setItem(studentJoinCodeStorageKey, shop.studentJoinCode)
  } catch {
    // The joined store remains active for this session.
  }
}

export function forgetStore() {
  shop.store = null
  shop.items = {}
  shop.coupons = []
}

// ------------------------------------------------------- prices and stocking

export function isStocked(productId: string) {
  const override = shop.items[productId]
  if (override) return !override.hidden
  // With nothing recorded either way, a store carries the name brands — that is
  // what a shop looks like out of the box — and leaves the CG line off the
  // shelves until a teacher asks for it.
  return !isStoreBrand(productId)
}

/** Store price, then the aisle's own price, then the catalog price. */
export function priceFor(item: AisleItem) {
  return priceIn(shop.items, item)
}

/** The same lookup against any store's overrides, not just the open one. */
function priceIn(items: Record<string, StoreItem>, item: AisleItem) {
  const override = items[item.id]
  if (override) return override.price
  return item.price ?? catalogPrice(item.id)
}

/**
 * Every product in the catalog with the price a store should charge for it.
 * The server has no catalog of its own, so a brand restock is told the whole
 * list, and a teacher's own prices ride along with it.
 */
export function everyProductWithItsPrice(items: Record<string, StoreItem>) {
  const priced: Array<{ id: string; price: number }> = []
  for (const aisle of aisles) {
    const inThisAisle = new Map(aisle.items.map((item) => [item.id, item]))
    for (const item of aisle.items) {
      // A CG item nobody has priced yet starts 15% under whatever the name
      // brand costs *in this store*, so a teacher's own prices carry across.
      const nameBrand = inThisAisle.get(nameBrandIdOf(item.id))
      const price = isStoreBrand(item.id) && !items[item.id] && nameBrand
        ? storeBrandPrice(priceIn(items, nameBrand))
        : priceIn(items, item)
      priced.push({ id: item.id, price })
    }
  }
  return priced
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

// ------------------------------------------------------------- opening stores

/** Loads everything a teacher needs to edit one of their own stores. */
export async function openStore(store: Store) {
  shop.store = store
  shop.items = await loadStoreItems(store.id)
  shop.coupons = await loadCoupons(store.id)
  shop.aisleIndex = 0
  syncCartToStore(store)
}

/**
 * Puts the store's own rules on the cart: the tax rate the class practices
 * with, and no coupons at all where the teacher turned them off.
 */
export function syncCartToStore(store: Store) {
  cart.salesTax = store.taxEnabled ? store.salesTax : 0
  if (!store.couponsEnabled) cart.appliedCoupons = []
}

/** Loads a store from the public join route, which is all a student can read. */
export async function joinStore(joinCode: string) {
  const joined = await fetchStoreByJoinCode(joinCode)
  if (!joined) return false
  shop.store = joined.store
  shop.coupons = joined.coupons
  shop.items = Object.fromEntries(Object.entries(joined.items).map(([productId, entry]) => [
    productId,
    { id: '', productId, price: entry.price ?? catalogPrice(productId), hidden: Boolean(entry.hidden) },
  ]))
  syncCartToStore(joined.store)
  return true
}

/** Picks up price changes a teacher makes while the class is shopping. */
export async function refreshJoinedStore() {
  if (!shop.studentJoinCode || shop.refreshing) return
  shop.refreshing = true
  try {
    await joinStore(shop.studentJoinCode)
  } finally {
    shop.refreshing = false
  }
}
