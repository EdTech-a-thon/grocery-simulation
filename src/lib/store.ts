import { aisles } from './catalog'
import { convert, currencyOf, isCurrencyCode, maxPrice, roundToRoundNumber } from './currency'
import { productById, isStoreBrand, nameBrandIdOf } from './products'
import { isSizeUnit, type Measure, type PackageSize } from './sizes'
import { isPackagedProduct } from './unbranded'

// A store is nothing more than this object. There are no accounts and no
// database: a teacher builds one in the browser, and it travels to the class
// inside a link (see sharing.ts). Everything here is plain data so that it can.

export const storeColors = ['green', 'blue', 'purple', 'orange', 'yellow', 'pink', 'red'] as const
export type StoreColor = (typeof storeColors)[number]

/** Which brand line the shelves carry: the name brands, the CG Value line, or both. */
export type BrandMode = 'name' | 'store' | 'both'

/**
 * What the shelf tag under each product shows besides its price: the package
 * size and the unit price worked out from it, the size alone so students do the
 * dividing themselves, or neither.
 */
export type UnitPricing = 'unit' | 'size' | 'off'

export type Coupon = {
  /** What a student types at the till. Unique within one store. */
  code: string
  /** 'dollars' is any money off, in the store's currency; the name predates currencies. */
  discountType: 'percent' | 'dollars'
  discountAmount: number
  /** A product slug from products.ts, or the literal 'all' for a whole-purchase discount. */
  productId: string
  /** How many to print. Only the print sheet reads it; it is not part of a link. */
  copies: number
}

export type Store = {
  name: string
  color: StoreColor
  brandMode: BrandMode
  unitPricing: UnitPricing
  /** Whether shelf tags give sizes in US units or metric ones. */
  measure: Measure
  /** The ISO code of the money every price in this store is in — see currency.ts. */
  currency: string
  /** Whether every price is snapped to the currency's round number (0,10 €, ¥10...) — see roundPrices(). */
  rounded: boolean
  couponsEnabled: boolean
  taxEnabled: boolean
  salesTax: number
  /**
   * Prices the teacher changed, by product id, in the store's currency.
   * Everything else sells at its catalog price, converted from US dollars.
   */
  prices: Record<string, number>
  /**
   * Products the teacher put on or took off the shelves by hand. A product
   * that is not listed follows the brand setting — see stockedByDefault().
   */
  stocked: Record<string, boolean>
  /** Package sizes the teacher changed. Everything else comes in its catalog size (sizes.ts). */
  sizes: Record<string, PackageSize>
  /**
   * Aisles the teacher renamed, by the aisle's English title. These are the
   * teacher's own words, so they show as typed in every language.
   */
  aisleNames: Record<string, string>
  /**
   * Products the teacher renamed, by the name brand's id. The CG twin takes the
   * same name with the brand in front, and like aisle names these show as typed
   * in every language.
   */
  productNames: Record<string, string>
  coupons: Coupon[]
}

/** The settings a teacher fills in on the store form. */
export type StoreSettings = Pick<Store, 'name' | 'color' | 'brandMode' | 'unitPricing' | 'measure' | 'currency' | 'couponsEnabled' | 'taxEnabled' | 'salesTax'>

export function newStore(settings: StoreSettings): Store {
  return { ...settings, rounded: false, prices: {}, stocked: {}, sizes: {}, aisleNames: {}, productNames: {}, coupons: [] }
}

/**
 * Whether a product is on the shelves when the teacher has not said otherwise.
 * Loose food — fruit, raw cuts, the bakery — has no CG twin, so it is sold
 * whichever brand line the store carries.
 */
export function stockedByDefault(brandMode: BrandMode, productId: string) {
  if (!isPackagedProduct(nameBrandIdOf(productId))) return true
  return brandMode === 'both' || (brandMode === 'store') === isStoreBrand(productId)
}

/** Long enough for "Breakfast & Cereal", short enough to fit the aisle sign. */
export const maxAisleNameLength = 30

/** Long enough for "Chocolate Chip Cookies", short enough for a shelf tag. */
export const maxProductNameLength = 30

export function newCouponCode() {
  // Keep printed codes short and unambiguous for students to type.
  return `CG-${crypto.randomUUID().replace(/[^0-9a-f]/g, '').slice(0, 6).toUpperCase()}`
}

/**
 * Moves a store to another currency. The teacher's own prices and money-off
 * coupons are converted at the fixed rates, so a store that was priced by hand
 * keeps the same price differences instead of reading ¥3.49.
 */
export function changeCurrency(store: Store, currency: string) {
  if (!isCurrencyCode(currency) || currency === store.currency) return
  for (const [id, price] of Object.entries(store.prices)) store.prices[id] = convert(price, store.currency, currency)
  for (const coupon of store.coupons) {
    if (coupon.discountType === 'dollars') coupon.discountAmount = convert(coupon.discountAmount, store.currency, currency)
  }
  store.currency = currency
  // The old round number means nothing in the new money, so the teacher is
  // offered the new one instead.
  store.rounded = false
}

/**
 * Snaps every price to the currency's round number, for sums students can do
 * in their heads: the teacher's own prices and money-off coupons now, and the
 * catalog prices from here on (see priceFor() in shop.svelte.ts).
 */
export function roundPrices(store: Store) {
  for (const [id, price] of Object.entries(store.prices)) store.prices[id] = roundToRoundNumber(price, store.currency)
  for (const coupon of store.coupons) {
    if (coupon.discountType === 'dollars') coupon.discountAmount = roundToRoundNumber(coupon.discountAmount, store.currency)
  }
  store.rounded = true
}

/** The amount a store's prices move by: its currency's step, or its round number once rounded. */
export function priceStepOf(store: Store) {
  const currency = currencyOf(store.currency)
  return store.rounded ? currency.roundTo : currency.step
}

/** A percent-off coupon with a random amount, on the whole purchase or one of `productIds`. */
export function randomCoupon(productIds: string[]): Coupon {
  const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)]
  return {
    code: newCouponCode(),
    discountType: 'percent',
    discountAmount: pick([5, 10, 15, 20, 25, 30, 40, 50]),
    productId: pick(['all', ...productIds]),
    copies: 1,
  }
}

/** A store with coupons always shows students the coupon button. */
export function addCoupon(store: Store, coupon: Coupon) {
  store.coupons.push(coupon)
  store.couponsEnabled = true
}

// ------------------------------------------------------------ packing
// The short form a store takes inside a link or in browser storage. Every key
// is one letter and anything at its default is left out, so a store with a few
// changed prices fits in a link short enough to paste into a class page.

type PackedCoupon = [code: string, type: 'p' | 'd', amount: number, productId: string]

export type PackedStore = {
  /** Format version, so an old link can still be read if this ever changes. */
  v: 1
  n: string
  /** Omitted for green. */
  c?: StoreColor
  /** Omitted for name brands. */
  b?: 'store' | 'both'
  /** Omitted for unit prices on the shelf tags. */
  u?: 'size' | 'off'
  /** Omitted for US units. */
  m?: 'metric'
  /** The currency code. Omitted for US dollars. */
  e?: string
  /** Present only when prices are rounded to the currency's round number. */
  r?: 1
  /** The sales tax rate; present only when the store charges tax. */
  t?: number
  /** Present only when coupons are turned off. */
  x?: 1
  p?: Record<string, number>
  s?: Record<string, 0 | 1>
  z?: Record<string, [amount: number, unit: string]>
  /** Renamed aisles, by English title. */
  a?: Record<string, string>
  /** Renamed products, by name-brand id. */
  i?: Record<string, string>
  q?: PackedCoupon[]
}

export function packStore(store: Store): PackedStore {
  const packed: PackedStore = { v: 1, n: store.name }
  if (store.color !== 'green') packed.c = store.color
  if (store.brandMode !== 'name') packed.b = store.brandMode
  if (store.unitPricing !== 'unit') packed.u = store.unitPricing
  if (store.measure !== 'us') packed.m = store.measure
  if (store.currency !== 'USD') packed.e = store.currency
  if (store.rounded) packed.r = 1
  if (store.taxEnabled) packed.t = store.salesTax
  if (!store.couponsEnabled) packed.x = 1
  if (Object.keys(store.prices).length) packed.p = { ...store.prices }
  if (Object.keys(store.stocked).length) {
    packed.s = Object.fromEntries(Object.entries(store.stocked).map(([id, on]) => [id, on ? 1 : 0]))
  }
  if (Object.keys(store.sizes).length) {
    packed.z = Object.fromEntries(Object.entries(store.sizes).map(([id, size]) => [id, [size.amount, size.unit]]))
  }
  if (Object.keys(store.aisleNames).length) packed.a = { ...store.aisleNames }
  if (Object.keys(store.productNames).length) packed.i = { ...store.productNames }
  if (store.coupons.length) {
    packed.q = store.coupons.map((coupon) => [
      coupon.code, coupon.discountType === 'dollars' ? 'd' : 'p', coupon.discountAmount, coupon.productId,
    ])
  }
  return packed
}

/**
 * Reads a packed store back, or returns null. A link can be typed, truncated or
 * edited by anyone, so nothing in it is trusted: unknown products are dropped,
 * numbers are clamped, and anything malformed is ignored rather than shown.
 */
export function unpackStore(value: unknown): Store | null {
  if (!isRecord(value) || value.v !== 1) return null
  const name = typeof value.n === 'string' ? value.n.trim().slice(0, 60) : ''
  if (!name) return null
  const currency = isCurrencyCode(value.e) ? value.e : 'USD'
  const isMoney = (amount: unknown): amount is number =>
    typeof amount === 'number' && Number.isFinite(amount) && amount >= 0 && amount <= maxPrice(currency)

  const prices: Record<string, number> = {}
  if (isRecord(value.p)) {
    for (const [id, price] of Object.entries(value.p)) {
      if (productById[id] && isMoney(price)) prices[id] = price
    }
  }

  const stocked: Record<string, boolean> = {}
  if (isRecord(value.s)) {
    for (const [id, on] of Object.entries(value.s)) {
      if (productById[id] && (on === 0 || on === 1)) stocked[id] = on === 1
    }
  }

  const sizes: Record<string, PackageSize> = {}
  if (isRecord(value.z)) {
    for (const [id, size] of Object.entries(value.z)) {
      if (!productById[id] || !Array.isArray(size)) continue
      const [amount, unit] = size
      if (typeof amount === 'number' && amount > 0 && amount <= 100000 && isSizeUnit(unit)) sizes[id] = { amount, unit }
    }
  }

  const aisleNames: Record<string, string> = {}
  if (isRecord(value.a)) {
    for (const [title, aisleName] of Object.entries(value.a)) {
      const trimmed = typeof aisleName === 'string' ? aisleName.trim().slice(0, maxAisleNameLength) : ''
      if (trimmed && aisles.some((aisle) => aisle.title === title)) aisleNames[title] = trimmed
    }
  }

  const productNames: Record<string, string> = {}
  if (isRecord(value.i)) {
    for (const [id, productName] of Object.entries(value.i)) {
      const trimmed = typeof productName === 'string' ? productName.trim().slice(0, maxProductNameLength) : ''
      if (trimmed && productById[id] && !isStoreBrand(id)) productNames[id] = trimmed
    }
  }

  const coupons: Coupon[] = []
  if (Array.isArray(value.q)) {
    for (const entry of value.q) {
      const coupon = unpackCoupon(entry, isMoney)
      if (coupon && !coupons.some((other) => other.code === coupon.code)) coupons.push(coupon)
    }
  }

  const salesTax = typeof value.t === 'number' && Number.isFinite(value.t) ? Math.min(100, Math.max(0, value.t)) : null
  return {
    name,
    color: storeColors.includes(value.c as StoreColor) ? (value.c as StoreColor) : 'green',
    brandMode: value.b === 'store' || value.b === 'both' ? value.b : 'name',
    unitPricing: value.u === 'size' || value.u === 'off' ? value.u : 'unit',
    measure: value.m === 'metric' ? 'metric' : 'us',
    currency,
    rounded: value.r === 1,
    couponsEnabled: value.x !== 1,
    taxEnabled: salesTax !== null,
    salesTax: salesTax ?? 0,
    prices,
    stocked,
    sizes,
    aisleNames,
    productNames,
    coupons,
  }
}

function unpackCoupon(entry: unknown, isMoney: (amount: unknown) => amount is number): Coupon | null {
  if (!Array.isArray(entry)) return null
  const [code, type, amount, productId] = entry
  if (typeof code !== 'string' || !/^[A-Z0-9 .$/+%-]{3,20}$/.test(code)) return null
  if (type !== 'p' && type !== 'd') return null
  if (!isMoney(amount) || amount <= 0 || (type === 'p' && amount > 100)) return null
  if (productId !== 'all' && !productById[productId]) return null
  return { code, discountType: type === 'd' ? 'dollars' : 'percent', discountAmount: amount, productId, copies: 1 }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
