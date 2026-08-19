import { browser } from '$app/environment'
import { aisles, catalogPrice, type AisleConfig, type AisleItem } from './catalog'
import {
  fetchStoreByJoinCode, loadCoupons, loadStoreItems, normalizeJoinCode,
  type Coupon, type Store, type StoreItem,
} from './pocketbase'

const studentJoinCodeStorageKey = 'fresh-mart-student-class-code'

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
  shop.studentJoinCode = normalizeJoinCode(code)
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
  return !shop.items[productId]?.hidden
}

/** Store price, then the aisle's own price, then the catalog price. */
export function priceFor(item: AisleItem) {
  const override = shop.items[item.id]
  if (override) return override.price
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

// ------------------------------------------------------------- opening stores

/** Loads everything a teacher needs to edit one of their own stores. */
export async function openStore(store: Store) {
  shop.store = store
  shop.items = await loadStoreItems(store.id)
  shop.coupons = await loadCoupons(store.id)
  shop.aisleIndex = 0
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
