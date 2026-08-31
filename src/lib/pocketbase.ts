import PocketBase from 'pocketbase'
import { joinCodeFor, joinKey, normalizeJoinLabel, normalizeJoinPrefix } from './joincodes'

// The browser talks to PocketBase directly. There is no backend proxy.
export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090')
pb.autoCancellation(false)

export const storeColors = ['green', 'blue', 'purple', 'orange', 'pink', 'red'] as const
export type StoreColor = (typeof storeColors)[number]

/**
 * `joinLabel` is the short code the teacher gave this class; `joinCode` is the
 * whole thing students are given, their identifier and that label together.
 */
export type BrandMode = 'name' | 'store' | 'both'
export type Store = {
  id: string
  name: string
  color: StoreColor
  joinLabel: string
  joinCode: string
  brandMode: BrandMode
  couponsEnabled: boolean
  taxEnabled: boolean
  salesTax: number
}

/**
 * A per-store override. A product with no row is stocked at its catalog price.
 * `price` is always a real number: PocketBase's REST API reports an unset number
 * field as 0, so a row that left it unset would be indistinguishable from one
 * priced at $0.00. Callers therefore always send the price they want.
 */
export type StoreItem = { id: string; productId: string; price: number; hidden: boolean }

export type Coupon = {
  id: string
  code: string
  discountType: 'percent' | 'dollars'
  discountAmount: number
  /** A product slug from products.ts, or the literal 'all' for a whole-purchase discount. */
  productId: string
  /** ISO 8601, or '' for no limit. */
  startsAt: string
  endsAt: string
  copies: number
}

/** What an anonymous student gets back when they join a store by its code. */
export type JoinedStore = {
  store: Store
  items: Record<string, { price?: number; hidden?: boolean }>
  coupons: Coupon[]
}

/** PocketBase's own wording for a failure, so the screen can explain it. */
export function errorMessage(error: unknown, fallback: string) {
  const response = (error as { response?: { message?: string } })?.response
  return response?.message || (error as Error)?.message || fallback
}

// ---------------------------------------------------------------- dates
// Coupon windows are typed into <input type="datetime-local">, which speaks
// local time with no zone, while PocketBase stores UTC. Convert at the edges.


export function fromDateInput(value: string) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

// ---------------------------------------------------------------- auth

export function currentTeacher() {
  if (!pb.authStore.isValid) return null
  const record = pb.authStore.record
  return record && record.collectionName === 'teachers' ? record : null
}

export async function signUp(email: string, password: string, displayName: string) {
  // The teachers collection's create rule requires these privacy fields to be
  // explicitly false. Keep them in sync with that rule so public signup works.
  await pb.collection('teachers').create({
    email, password, passwordConfirm: password, displayName,
    emailVisibility: false, verified: false,
  })
  await pb.collection('teachers').authWithPassword(email, password)
}

export async function signIn(email: string, password: string) {
  await pb.collection('teachers').authWithPassword(email, password)
}

export function signOut() {
  pb.authStore.clear()
}

/** The teacher's class identifier, or '' while they have yet to choose one. */
export function teacherJoinPrefix() {
  return normalizeJoinPrefix(String(currentTeacher()?.joinPrefix ?? ''))
}

/**
 * Claims an identifier for this teacher. It can only be set once — every code
 * already printed for a class is built from it — which the collection's update
 * rule enforces, so a second attempt is refused by the server, not just here.
 */
export async function claimJoinPrefix(prefix: string) {
  const teacher = currentTeacher()
  if (!teacher) throw new Error('Not signed in')
  await pb.collection('teachers').update(teacher.id, { joinPrefix: normalizeJoinPrefix(prefix) })
  await pb.collection('teachers').authRefresh()
}

// ---------------------------------------------------------------- stores

// Stores are saved with the label only; the code students see is that label
// behind the owner's identifier, which is the teacher reading the screen.
function toStore(record: Record<string, unknown>): Store {
  const joinLabel = String(record.joinLabel)
  return {
    id: String(record.id),
    name: String(record.name),
    color: record.color as StoreColor,
    joinLabel,
    joinCode: joinCodeFor(teacherJoinPrefix(), joinLabel),
    brandMode: record.brandMode === 'store' || record.brandMode === 'both' ? record.brandMode : 'name',
    couponsEnabled: !Boolean(record.couponsDisabled),
    taxEnabled: Boolean(record.taxEnabled),
    salesTax: Math.max(0, Number(record.salesTax) || 0),
  }
}

export async function listStores(): Promise<Store[]> {
  const records = await pb.collection('stores').getFullList({ sort: 'created' })
  return records.map((record) => toStore(record as unknown as Record<string, unknown>))
}

// `joinKey` is not sent: a hook fills it in from the owner's identifier before
// the record is validated, and overwrites anything a browser tried to set.
export type NewStoreSettings = {
  name: string
  color: StoreColor
  joinLabel: string
  brandMode: BrandMode
  couponsEnabled: boolean
  taxEnabled: boolean
  salesTax: number
}

export async function createStore(settings: NewStoreSettings) {
  const teacher = currentTeacher()
  if (!teacher) throw new Error('Not signed in')
  const record = await pb.collection('stores').create({
    owner: teacher.id,
    name: settings.name,
    color: settings.color,
    joinLabel: normalizeJoinLabel(settings.joinLabel),
    brandMode: settings.brandMode,
    couponsDisabled: !settings.couponsEnabled,
    taxEnabled: settings.taxEnabled,
    salesTax: settings.taxEnabled ? settings.salesTax : 0,
  })
  return toStore(record as unknown as Record<string, unknown>)
}

export async function updateStore(id: string, changes: Partial<NewStoreSettings>) {
  const body: Record<string, unknown> = {}
  if (changes.name !== undefined) body.name = changes.name
  if (changes.color !== undefined) body.color = changes.color
  if (changes.joinLabel !== undefined) body.joinLabel = normalizeJoinLabel(changes.joinLabel)
  if (changes.brandMode !== undefined) body.brandMode = changes.brandMode
  if (changes.couponsEnabled !== undefined) body.couponsDisabled = !changes.couponsEnabled
  if (changes.taxEnabled !== undefined) body.taxEnabled = changes.taxEnabled
  // A store with tax turned off carries no rate, so turning it back on later
  // never resurrects a number the teacher has forgotten about.
  if (changes.taxEnabled === false) body.salesTax = 0
  else if (changes.salesTax !== undefined) body.salesTax = changes.salesTax
  const record = await pb.collection('stores').update(id, body)
  return toStore(record as unknown as Record<string, unknown>)
}

export async function deleteStore(id: string) {
  await pb.collection('stores').delete(id)
}

/** Copies the store's prices, stocking and coupons in one transaction on the server. */
export async function duplicateStore(id: string, name: string, color: StoreColor, joinLabel: string) {
  return await pb.send<Store>(`/api/classgrocery/stores/${encodeURIComponent(id)}/duplicate`, {
    method: 'POST',
    body: { name, color, joinLabel: normalizeJoinLabel(joinLabel) },
  })
}

// ---------------------------------------------------------------- store items

function toStoreItem(record: Record<string, unknown>): StoreItem {
  return {
    id: String(record.id),
    productId: String(record.productId),
    price: Number(record.price) || 0,
    hidden: Boolean(record.hidden),
  }
}

export async function loadStoreItems(storeId: string) {
  const records = await pb.collection('store_items').getFullList({ filter: pb.filter('store = {:store}', { store: storeId }) })
  const items: Record<string, StoreItem> = {}
  for (const record of records) {
    const item = toStoreItem(record as unknown as Record<string, unknown>)
    items[item.productId] = item
  }
  return items
}

/**
 * Stocks a whole brand line across every aisle in one transaction. The catalog
 * is not in the database, so the browser sends every product with the price it
 * should start at; products that already have a price keep it.
 */
export async function stockBrands(storeId: string, mode: BrandMode, items: Array<{ id: string; price: number }>) {
  return await pb.send<{ mode: BrandMode; stocked: number }>(`/api/classgrocery/stores/${encodeURIComponent(storeId)}/brands`, {
    method: 'POST',
    body: { mode, items },
  })
}

// PocketBase has no upsert, and (store, productId) is uniquely indexed, so two
// quick edits to the same product must not both try to create a row. Saves for
// one product are chained; different products still run in parallel.
const pendingItemSaves = new Map<string, Promise<StoreItem | null>>()

/**
 * `price` is the price this store should charge, which callers read off the
 * screen — for an untouched product that is simply the catalog price.
 */
export function saveStoreItem(storeId: string, existing: Record<string, StoreItem>, productId: string, changes: { price: number; hidden?: boolean }) {
  const previous = pendingItemSaves.get(productId) ?? Promise.resolve(null)
  const next = previous
    .catch(() => null)
    .then(async () => {
      const current = existing[productId]
      const price = changes.price
      const hidden = changes.hidden !== undefined ? changes.hidden : current?.hidden ?? false

      const body = { store: storeId, productId, price, hidden }
      const record = current
        ? await pb.collection('store_items').update(current.id, body)
        : await pb.collection('store_items').create(body)
      const saved = toStoreItem(record as unknown as Record<string, unknown>)
      existing[productId] = saved
      return saved
    })
  pendingItemSaves.set(productId, next)
  return next
}

// ---------------------------------------------------------------- coupons

function toCoupon(record: Record<string, unknown>): Coupon {
  return {
    id: String(record.id),
    code: String(record.code),
    discountType: record.discountType === 'dollars' ? 'dollars' : 'percent',
    discountAmount: Number(record.discountAmount) || 0,
    productId: String(record.productId),
    startsAt: record.startsAt ? new Date(String(record.startsAt)).toISOString() : '',
    endsAt: record.endsAt ? new Date(String(record.endsAt)).toISOString() : '',
    copies: Number(record.copies) || 1,
  }
}

export async function loadCoupons(storeId: string) {
  const records = await pb.collection('coupons').getFullList({
    filter: pb.filter('store = {:store}', { store: storeId }), sort: 'created',
  })
  return records.map((record) => toCoupon(record as unknown as Record<string, unknown>))
}

export function newCouponCode() {
  // Keep printed codes short and unambiguous for students to type.
  return `CG-${crypto.randomUUID().replace(/[^0-9a-f]/g, '').slice(0, 6).toUpperCase()}`
}

export async function createCoupon(storeId: string, coupon: Omit<Coupon, 'id'>) {
  const record = await pb.collection('coupons').create({
    store: storeId,
    code: coupon.code,
    discountType: coupon.discountType,
    discountAmount: coupon.discountAmount,
    productId: coupon.productId,
    startsAt: coupon.startsAt,
    endsAt: coupon.endsAt,
    copies: coupon.copies,
  })
  return toCoupon(record as unknown as Record<string, unknown>)
}

export async function updateCouponCopies(id: string, copies: number) {
  await pb.collection('coupons').update(id, { copies })
}

export async function deleteCoupon(id: string) {
  await pb.collection('coupons').delete(id)
}

// ---------------------------------------------------------------- joining

/**
 * Students have no account, so this goes through the public hook rather than
 * the collection API — the owner-scoped list rule hides stores from them.
 */
export async function fetchStoreByJoinCode(joinCode: string): Promise<JoinedStore | null> {
  const key = joinKey(joinCode)
  if (key.length < 4) return null
  try {
    return await pb.send<JoinedStore>(`/api/classgrocery/store/${encodeURIComponent(key)}`, { method: 'GET' })
  } catch {
    return null
  }
}
