import './style.css'
import { productById } from './products'
import {
  createCoupon, createStore, currentTeacher, deleteCoupon, deleteStore, duplicateStore,
  fetchStoreByJoinCode, fromDateInput, listStores, loadCoupons, loadStoreItems, pb,
  newCouponCode, normalizeJoinCode, saveStoreItem, signIn, signOut, signUp, storeColors,
  updateCouponCopies, updateStore,
  type Coupon, type Store, type StoreColor, type StoreItem,
} from './pocketbase'
import dryGoodsAisle from './aisles/dry-goods.json'
import cannedAndSaucesAisle from './aisles/canned-and-sauces.json'
import saucesAndCondimentsAisle from './aisles/sauces-and-condiments.json'
import dairyAisle from './aisles/dairy.json'
import frozenFoodsAisle from './aisles/frozen-foods.json'
import bakeryAisle from './aisles/bakery.json'
import produceAisle from './aisles/produce.json'
import meatAisle from './aisles/meat.json'
import seafoodAisle from './aisles/seafood.json'
import beveragesAisle from './aisles/beverages.json'
import snacksAisle from './aisles/snacks.json'
import householdAisle from './aisles/household.json'

type AisleItem = { id: string; price?: number; sale?: boolean }
type AisleConfig = { title: string; items: AisleItem[] }

type ShelfItem = {
  id: string
  name: string
  note: string
  image: string
  price: number
  aisleTitle: string
  sale?: boolean
}

type CartLine = ShelfItem & { quantity: number }
type Role = 'teacher' | 'student'
type Screen = 'welcome' | 'student-dashboard' | 'store' | 'stores' | 'prices' | 'coupons'

type ReceiptCoupon = { coupon: Coupon; amount: number }
type ReceiptLine = { key: string; item: CartLine; lineTotal: number; coupons: ReceiptCoupon[] }

// The product catalogue lives in the bundle, not the database. PocketBase only
// records which of these a store stocks and what it charges for them.
const aisles = [
  dryGoodsAisle, cannedAndSaucesAisle, saucesAndCondimentsAisle, dairyAisle,
  frozenFoodsAisle, bakeryAisle, produceAisle, meatAisle, seafoodAisle,
  beveragesAisle, snacksAisle, householdAisle,
] as AisleConfig[]

const cartStorageKey = 'fresh-mart-cart'
const studentJoinCodeStorageKey = 'fresh-mart-student-class-code'
const shelfCapacity = 9

const state = {
  role: null as Role | null,
  screen: 'welcome' as Screen,
  presenting: false,
  /** Indexes `aisles` — the teacher's price studio shows every aisle. */
  activeAisleIndex: 0,
  /** Indexes `shoppableAisles()` — a fully unstocked aisle is not shown to shoppers. */
  shopAisleIndex: 0,
  cart: loadCart(),
  stores: [] as Store[],
  store: null as Store | null,
  storeItems: new Map<string, StoreItem>(),
  coupons: [] as Coupon[],
  appliedCoupons: [] as Coupon[],
  salesTax: 0,
  message: '',
  joinCodeInput: '',
  studentJoinCode: loadStudentJoinCode(),
  refreshing: false,
  busy: false,
  /** Set while a full-page print sheet is showing; render() dispatches on it. */
  printing: null as { kind: 'coupons'; coupons: Coupon[] } | { kind: 'receipt' } | null,
}

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('App root not found')

// ------------------------------------------------------------------ helpers

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] ?? character)
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size))
  return chunks
}

function loadCart() {
  try {
    const lines = JSON.parse(localStorage.getItem(cartStorageKey) ?? '[]') as Array<[string, CartLine]>
    return new Map(Array.isArray(lines) ? lines : [])
  } catch {
    return new Map<string, CartLine>()
  }
}

function saveCart() {
  try {
    localStorage.setItem(cartStorageKey, JSON.stringify([...state.cart.entries()]))
  } catch {
    // The cart still works for this page when browser storage is restricted.
  }
}

function loadStudentJoinCode() {
  try {
    return localStorage.getItem(studentJoinCodeStorageKey) ?? ''
  } catch {
    return ''
  }
}

function saveStudentJoinCode(code: string) {
  state.studentJoinCode = normalizeJoinCode(code)
  try {
    localStorage.setItem(studentJoinCodeStorageKey, state.studentJoinCode)
  } catch {
    // The joined store remains active for this session.
  }
}

// ------------------------------------------------------- prices and stocking

// A product's shelf price before any store override: the aisle may set one
// (only milk does today), otherwise the catalogue price applies.
const aisleItemById = new Map<string, AisleItem>()
for (const aisle of aisles) for (const item of aisle.items) if (!aisleItemById.has(item.id)) aisleItemById.set(item.id, item)

function catalogPrice(productId: string) {
  return aisleItemById.get(productId)?.price ?? productById[productId]?.price ?? 0
}

function overrideFor(productId: string) {
  return state.storeItems.get(productId)
}

function isStocked(productId: string) {
  return !overrideFor(productId)?.hidden
}

/** Store price, then the aisle's own price, then the catalogue price. */
function priceFor(item: AisleItem) {
  const override = overrideFor(item.id)
  if (override) return override.price
  return item.price ?? productById[item.id]?.price ?? 0
}

/** Aisles with at least one stocked product, in catalogue order. */
function shoppableAisles(): AisleConfig[] {
  return aisles
    .map((aisle) => ({ ...aisle, items: aisle.items.filter((item) => isStocked(item.id)) }))
    .filter((aisle) => aisle.items.length > 0)
}

function stockedProductIds() {
  const ids: string[] = []
  for (const aisle of shoppableAisles()) for (const item of aisle.items) if (!ids.includes(item.id)) ids.push(item.id)
  return ids
}

function toShelfItem(aisle: AisleConfig, item: AisleItem): ShelfItem | null {
  const product = productById[item.id]
  if (!product) return null
  return { ...product, price: priceFor(item), aisleTitle: aisle.title, sale: item.sale }
}

// ------------------------------------------------------------------ the cart

function cartKey(item: ShelfItem) {
  return `${item.id}:${item.price.toFixed(2)}:${item.aisleTitle}`
}

function addToCart(item: ShelfItem) {
  const key = cartKey(item)
  const existing = state.cart.get(key)
  state.cart.set(key, existing ? { ...existing, quantity: existing.quantity + 1 } : { ...item, quantity: 1 })
  saveCart()
  render()
}

function removeFromCart(key: string) {
  const existing = state.cart.get(key)
  if (!existing) return
  if (existing.quantity > 1) state.cart.set(key, { ...existing, quantity: existing.quantity - 1 })
  else state.cart.delete(key)
  saveCart()
  render()
}

function increaseCartItem(key: string) {
  const existing = state.cart.get(key)
  if (!existing) return
  state.cart.set(key, { ...existing, quantity: existing.quantity + 1 })
  saveCart()
  render()
}

function cartTotals() {
  const items = [...state.cart.values()]
  return {
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  }
}

// ------------------------------------------------------------------ coupons

function formatCouponItem(coupon: Coupon) {
  return coupon.productId === 'all' ? 'entire purchase' : productById[coupon.productId]?.name ?? coupon.productId
}

function formatDate(value: string) {
  return value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'No limit'
}

function couponCopies(coupon: Coupon) {
  return Math.min(100, Math.max(1, Math.round(coupon.copies || 1)))
}

function couponDiscountLabel(coupon: Coupon) {
  return coupon.discountType === 'dollars'
    ? `${money(coupon.discountAmount)} off`
    : `${coupon.discountAmount}% off`
}

/** A coupon can never take off more than the items it applies to actually cost. */
function discountFor(coupon: Coupon, eligibleTotal: number) {
  const raw = coupon.discountType === 'dollars'
    ? coupon.discountAmount
    : eligibleTotal * coupon.discountAmount / 100
  return Math.max(0, Math.min(raw, eligibleTotal))
}

function couponStatus(coupon: Coupon) {
  const now = Date.now()
  if (coupon.startsAt && now < new Date(coupon.startsAt).getTime()) return 'This coupon is not active yet.'
  if (coupon.endsAt && now > new Date(coupon.endsAt).getTime()) return 'This coupon has expired.'
  if (coupon.productId !== 'all' && ![...state.cart.values()].some((item) => item.id === coupon.productId)) {
    return `Add ${productById[coupon.productId]?.name ?? 'the coupon item'} to the cart first.`
  }
  return ''
}

// ------------------------------------------------------------------ receipt

function buildReceipt() {
  const lines: ReceiptLine[] = [...state.cart.entries()].map(([key, item]) => ({
    key, item, lineTotal: item.price * item.quantity, coupons: [],
  }))
  const totalPrice = lines.reduce((sum, line) => sum + line.lineTotal, 0)
  const purchaseCoupons: ReceiptCoupon[] = []

  for (const coupon of state.appliedCoupons) {
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
  const salesTaxAmount = discountedPrice * state.salesTax / 100

  return { lines, purchaseCoupons, totalPrice, discount, discountedPrice, salesTaxAmount, finalTotal: discountedPrice + salesTaxAmount }
}

function receiptText() {
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
  rows.push(`Sales tax (${state.salesTax}%): ${money(receipt.salesTaxAmount)}`)
  rows.push(`FINAL TOTAL: ${money(receipt.finalTotal)}`)
  rows.push('', `TOTAL AMOUNT SAVED TODAY: ${money(receipt.discount)}`)
  return rows.join('\n')
}

// ------------------------------------------------------------------ renderers

function renderWelcomePage() {
  return `
    <main class="welcome-page">
      <section class="welcome-card role-welcome" aria-labelledby="welcome-title">
        <div class="welcome-copy">
          <p class="welcome-kicker">Real-life math adventure</p>
          <h1 id="welcome-title">Fresh Mart Classroom</h1>
          <p class="welcome-intro">Choose how you are joining today. Teachers set up their stores, prices and coupons. Students shop and practice checkout math.</p>
          ${state.message ? `<p class="status-message" role="alert">${escapeHtml(state.message)}</p>` : ''}
          <div class="role-actions">
            <label class="join-card">
              <span class="join-label">Store code</span>
              <div class="join-row">
                <input type="text" data-join-code-input placeholder="ROOM-204" aria-label="Store code" value="${escapeHtml(state.joinCodeInput)}">
                <button class="role-button student-role" type="button" data-join-store ${state.busy ? 'disabled' : ''}>Student join store</button>
              </div>
              <small>Students type the code their teacher gives them.</small>
            </label>
            <button class="teacher-link-button" type="button" data-teacher-access>Teacher sign in</button>
          </div>
        </div>
        ${renderStoreScene()}
      </section>
    </main>`
}

function renderStoreScene() {
  return `<div class="student-store-scene" aria-label="Fresh Market grocery store illustration">
    <div class="student-sun"></div><div class="student-cloud student-cloud-one"></div><div class="student-cloud student-cloud-two"></div>
    <div class="student-ground"></div>
    <div class="student-market-building">
      <div class="student-market-sign"><span>FRESH</span> MARKET</div>
      <div class="student-market-awning"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="student-market-window student-market-window-left"><p>FRESH<br>MARKET</p></div>
      <div class="student-market-door"><span>OPEN</span><i></i></div>
      <div class="student-market-window student-market-window-right"><p>WELCOME<br>SHOPPERS</p></div>
    </div>
  </div>`
}

function renderStudentDashboard() {
  const itemCount = cartTotals().totalItems
  return `<main class="student-dashboard-page">
    <section class="student-dashboard-card" aria-labelledby="student-dashboard-title">
      <div class="student-dashboard-copy">
        <p class="welcome-kicker">Welcome to your class store</p>
        <h1 id="student-dashboard-title">${escapeHtml(state.store?.name ?? 'Fresh Market')}<br>Grocery Store</h1>
        <p>Explore the aisles, choose items for your cart, and practice real-life shopping skills at checkout.</p>
        ${state.studentJoinCode ? `<p class="student-class-badge">Store code: ${escapeHtml(state.studentJoinCode)}</p>` : ''}
        <button class="student-shop-button" type="button" data-start-student-shopping>Enter the store <span aria-hidden="true">&rarr;</span></button>
        ${itemCount ? `<p class="saved-cart-note">Your cart has ${itemCount} item${itemCount === 1 ? '' : 's'} waiting.</p>` : ''}
      </div>
      ${renderStoreScene()}
    </section>
  </main>`
}

function renderTeacherLogin() {
  return `<main class="teacher-login-page">
    <form class="teacher-login-card" data-teacher-login>
      <p class="welcome-kicker">Teacher area</p>
      <h1>Sign in to your stores</h1>
      <p>Your stores, prices and coupons are saved to your account. Only you can see them.</p>
      <label>School email<input name="email" type="email" autocomplete="email" placeholder="you@school.org" required autofocus></label>
      <label>Password<input name="password" type="password" autocomplete="current-password" placeholder="Your password" required></label>
      ${state.message ? `<p class="login-error" role="alert">${escapeHtml(state.message)}</p>` : ''}
      <button class="primary-button teacher-login-submit" type="submit" ${state.busy ? 'disabled' : ''}>Sign in</button>
      <button class="teacher-link-button" type="button" data-show-signup>Create a teacher account</button>
      <button class="teacher-link-button" type="button" data-back-home>Back to student sign in</button>
    </form>
  </main>`
}

function renderTeacherSignup() {
  return `<main class="teacher-login-page">
    <form class="teacher-login-card" data-teacher-signup>
      <p class="welcome-kicker">Teacher area</p>
      <h1>Create your account</h1>
      <p>You will use this to sign in and pick up your stores on any computer.</p>
      <label>Your name<input name="displayName" type="text" maxlength="80" placeholder="Ms. Rivera" required autofocus></label>
      <label>School email<input name="email" type="email" autocomplete="email" placeholder="you@school.org" required></label>
      <label>Password<input name="password" type="password" autocomplete="new-password" minlength="8" placeholder="At least 8 characters" required></label>
      ${state.message ? `<p class="login-error" role="alert">${escapeHtml(state.message)}</p>` : ''}
      <button class="primary-button teacher-login-submit" type="submit" ${state.busy ? 'disabled' : ''}>Create account</button>
      <button class="teacher-link-button" type="button" data-show-signin>I already have an account</button>
    </form>
  </main>`
}

function renderAppHeader(title: string) {
  const storeChip = state.store
    ? `<span class="store-chip" data-color="${escapeHtml(state.store.color)}">${escapeHtml(state.store.name)}</span>`
    : ''
  return `<header class="app-header">
    <div><button class="brand-button" type="button" data-home>Fresh Mart</button><span class="role-chip">${state.role ?? 'class'} view</span>${storeChip}</div>
    <h1>${escapeHtml(title)}</h1>
    <nav>
      ${state.role === 'teacher' ? `
        <button type="button" data-teacher-stores>My stores</button>
        ${state.store ? '<button type="button" data-teacher-prices>Prices &amp; stock</button><button type="button" data-teacher-coupons>Coupons</button><button type="button" data-preview-store>Student preview</button><button type="button" data-present-store>Present</button>' : ''}
        <button type="button" data-sign-out>Sign out</button>` : '<button type="button" data-switch-role>Switch role</button>'}
    </nav>
  </header>`
}

function renderColorOptions(selected: string) {
  return storeColors.map((color) => `<option value="${color}" ${color === selected ? 'selected' : ''}>${color[0].toUpperCase()}${color.slice(1)}</option>`).join('')
}

function renderStoreList() {
  return `<main class="teacher-shell">
    ${renderAppHeader('My stores')}
    <section class="teacher-hero">
      <div><p class="eyebrow">Teacher controls</p><h2>Set up a store for each class</h2><p>Every store keeps its own prices, its own stocked items and its own coupons. Duplicate one to reuse it with another class.</p></div>
    </section>
    ${state.message ? `<p class="status-message">${escapeHtml(state.message)}</p>` : ''}
    <section class="store-workspace">
      <form class="store-form" data-store-form>
        <div><p class="eyebrow">New store</p><h2>Store details</h2></div>
        <label>Store name<input required name="name" type="text" maxlength="60" placeholder="Room 204 Market"></label>
        <label>Store color<select name="color">${renderColorOptions('green')}</select></label>
        <label>Student join code<input required name="joinCode" type="text" maxlength="20" placeholder="ROOM-204"></label>
        <button class="primary-button" type="submit" ${state.busy ? 'disabled' : ''}>Create store</button>
      </form>
      <section class="store-list">
        <div class="section-heading"><div><p class="eyebrow">Your stores</p><h2>${state.stores.length} store${state.stores.length === 1 ? '' : 's'}</h2></div></div>
        ${state.stores.length ? state.stores.map((store) => `
          <article class="store-summary" data-color="${escapeHtml(store.color)}">
            <span class="store-swatch" aria-hidden="true"></span>
            <div class="store-summary-copy">
              <strong>${escapeHtml(store.name)}</strong>
              <span>Students join with <code>${escapeHtml(store.joinCode)}</code></span>
            </div>
            <div class="store-summary-actions">
              <button class="primary-button" type="button" data-open-store="${store.id}">Open</button>
              <button type="button" data-duplicate-store="${store.id}">Duplicate</button>
              <button type="button" data-rename-store="${store.id}">Edit</button>
              <button type="button" data-delete-store="${store.id}">Delete</button>
            </div>
          </article>`).join('') : '<div class="empty-coupons">Create your first store to get started.</div>'}
      </section>
    </section>
  </main>`
}

function renderPriceStudio() {
  const aisle = aisles[state.activeAisleIndex]
  const stockedInAisle = aisle.items.filter((item) => isStocked(item.id)).length
  return `<main class="teacher-shell">
    ${renderAppHeader('Prices and stock')}
    <section class="teacher-hero">
      <div><p class="eyebrow">${escapeHtml(state.store?.name ?? '')}</p><h2>Choose what this store sells</h2><p>Untick an item to take it off the shelves for this store only. Prices save as you type.</p></div>
      <div class="teacher-access-panel"><p>Students join with <strong>${escapeHtml(state.store?.joinCode ?? '')}</strong></p><div class="class-code-actions"><button class="teacher-secondary-button" type="button" data-copy-join-code>Copy join code</button></div></div>
    </section>
    ${state.message ? `<p class="status-message">${escapeHtml(state.message)}</p>` : ''}
    <section class="teacher-workspace">
      <aside class="aisle-picker"><h3>Food class</h3>${aisles.map((item, index) => `<button class="${index === state.activeAisleIndex ? 'active' : ''}" type="button" data-pick-aisle="${index}">${escapeHtml(item.title)}</button>`).join('')}</aside>
      <section class="price-editor">
        <div class="section-heading">
          <div><p class="eyebrow">Aisle ${state.activeAisleIndex + 1} &middot; ${stockedInAisle} of ${aisle.items.length} stocked</p><h2>${escapeHtml(aisle.title)}</h2></div>
          <div class="stock-bulk-actions"><button type="button" data-stock-all>Stock all</button><button type="button" data-stock-none>Stock none</button></div>
        </div>
        <p class="helper-text">Edit any item price, or untick it to remove it from this store's shelves.</p>
        <div class="price-grid">${aisle.items.map((item) => {
          const product = productById[item.id]
          const stocked = isStocked(item.id)
          return `<label class="price-edit-card${stocked ? '' : ' price-edit-card-hidden'}">
            <img src="${product.image}" alt="">
            <span>${escapeHtml(product.name)}</span>
            <span class="teacher-money-input">$<input type="number" min="0" max="999" step="0.01" value="${priceFor(item).toFixed(2)}" data-price-id="${item.id}" aria-label="Price for ${escapeHtml(product.name)}"></span>
            <span class="stock-toggle"><input type="checkbox" ${stocked ? 'checked' : ''} data-stock-id="${item.id}" aria-label="Stock ${escapeHtml(product.name)} in this store"> In this store</span>
          </label>`
        }).join('')}</div>
      </section>
    </section>
  </main>`
}

function renderCouponStudio() {
  const productOptions = stockedProductIds()
    .map((id) => `<option value="${id}">${escapeHtml(productById[id]?.name ?? id)}</option>`).join('')
  const totalPrintableCoupons = state.coupons.reduce((total, coupon) => total + couponCopies(coupon), 0)
  const pages = Math.ceil(totalPrintableCoupons / 10)
  return `<main class="teacher-shell">
    ${renderAppHeader('Coupon workshop')}
    <section class="teacher-hero coupon-hero">
      <div><p class="eyebrow">Printable rewards &middot; ${escapeHtml(state.store?.name ?? '')}</p><h2>Turn savings into a classroom surprise</h2><p>Create coupons manually or generate a random set. Printable sheets hold 10 coupons per page.</p></div>
      ${state.coupons.length ? `<div class="print-all-panel"><strong>${totalPrintableCoupons} total coupon${totalPrintableCoupons === 1 ? '' : 's'}</strong><span>${pages} PDF page${pages === 1 ? '' : 's'}</span><button class="primary-button" type="button" data-print-coupons>Print all coupons to PDF</button></div>` : ''}
    </section>
    ${state.message ? `<p class="status-message">${escapeHtml(state.message)}</p>` : ''}
    <section class="coupon-workspace">
      <form class="coupon-form" data-coupon-form>
        <div><p class="eyebrow">New coupon</p><h2>Discount details</h2></div>
        <label>Discount type<select name="discountType" data-discount-type><option value="percent">Percent off</option><option value="dollars">Dollar amount off</option></select></label>
        <label data-discount-amount-label>Percent off<input required name="discountAmount" type="number" min="1" max="100" step="1" value="10" data-discount-amount><span class="field-suffix" data-discount-suffix>%</span></label>
        <label>Applies to<select required name="productId"><option value="all">Entire purchase</option>${productOptions}</select></label>
        <label>Starts<input name="startsAt" type="datetime-local"></label>
        <label>Ends<input name="endsAt" type="datetime-local"></label>
        <label>Number of this coupon<input required name="copies" type="number" min="1" max="100" step="1" value="10"></label>
        <button class="primary-button" type="submit" ${state.busy ? 'disabled' : ''}>Create coupon</button>
        <div class="random-coupon-box">
          <div><p class="eyebrow">Quick surprise</p><h3>Generate random coupons</h3></div>
          <label>Different coupon designs<input type="number" min="1" max="10" step="1" value="3" data-random-coupon-count></label>
          <label>Copies of each design<input type="number" min="1" max="100" step="1" value="10" data-random-coupon-copies></label>
          <button class="randomize-button" type="button" data-random-coupons ${state.busy ? 'disabled' : ''}>Generate random coupons</button>
        </div>
      </form>
      <section class="coupon-list">
        <div class="section-heading"><div><p class="eyebrow">Store coupons</p><h2>${state.coupons.length} ready to use</h2></div></div>
        ${state.coupons.length ? state.coupons.map((coupon) => `<article class="coupon-summary"><div><strong>${couponDiscountLabel(coupon)} ${escapeHtml(formatCouponItem(coupon))}</strong><span>${escapeHtml(coupon.code)} &middot; ${escapeHtml(formatDate(coupon.startsAt))} to ${escapeHtml(formatDate(coupon.endsAt))}</span></div><label class="coupon-copy-control">Copies <input type="number" min="1" max="100" step="1" value="${couponCopies(coupon)}" data-coupon-copies="${coupon.id}"></label><button type="button" data-print-one-coupon="${coupon.id}">Print</button><button type="button" data-delete-coupon="${coupon.id}" aria-label="Delete coupon ${escapeHtml(coupon.code)}">Delete</button></article>`).join('') : '<div class="empty-coupons">Your created coupons will appear here.</div>'}
      </section>
    </section>
  </main>`
}

function renderShelfProduct(item: ShelfItem | null) {
  if (!item) return '<div class="shelf-slot shelf-slot-empty" aria-hidden="true"></div>'
  const itemData = encodeURIComponent(JSON.stringify(item))
  const quantity = state.cart.get(cartKey(item))?.quantity ?? 0
  return `<div class="shelf-product-card"><button class="shelf-product" type="button" data-add-item="${itemData}" aria-label="Add ${escapeHtml(item.name)} for ${money(item.price)}"><span class="shelf-product-image" style="background-image:url('${item.image}')"></span><span class="shelf-product-name">${escapeHtml(item.name)}</span><span class="price-tag${item.sale ? ' price-tag-sale' : ''}">${money(item.price)}</span>${quantity ? `<span class="shelf-quantity-badge" aria-label="${quantity} in cart">${quantity}</span>` : ''}</button><div class="shelf-quantity-controls">${quantity ? `<button class="shelf-product-minus" type="button" data-remove-item="${cartKey(item)}" aria-label="Remove one ${escapeHtml(item.name)}">-</button>` : ''}<button class="shelf-product-plus" type="button" data-add-item="${itemData}" aria-label="Add one more ${escapeHtml(item.name)}">+</button></div></div>`
}

function renderShelfCard(aisle: AisleConfig, aisleNumber: number, aisleCount: number) {
  const groups = chunkItems(aisle.items, shelfCapacity)
  return `<section class="shelf-stage"><div class="shelf-topline"><p>Aisle ${aisleNumber}</p><h2>${escapeHtml(aisle.title)}</h2></div><div class="shelf-row">${groups.map((group, index) => {
    const items: Array<ShelfItem | null> = group.map((item) => toShelfItem(aisle, item))
    while (items.length < shelfCapacity) items.push(null)
    return `<section class="shelf-unit" aria-label="Shelf ${index + 1}"><div class="shelf-skin" style="background-image:url('/groceryshelf.svg')"></div><div class="shelf-grid">${items.map(renderShelfProduct).join('')}</div></section>`
  }).join('')}</div>${aisleCount > 1 ? '<div class="aisle-nav"><button class="nav-arrow" type="button" data-nav="prev" aria-label="Previous aisle"><span>&lsaquo;</span></button><button class="nav-arrow" type="button" data-nav="next" aria-label="Next aisle"><span>&rsaquo;</span></button></div>' : ''}</section>`
}

function renderReceiptBody(receipt: ReturnType<typeof buildReceipt>) {
  const itemRows = receipt.lines.length
    ? receipt.lines.map((line) => `
        <div class="receipt-item">
          <div class="receipt-row receipt-item-row">
            <span class="receipt-item-name">${escapeHtml(line.item.name)}</span>
            <span class="receipt-item-count">${line.item.quantity} &times; ${money(line.item.price)}</span>
            <strong>${money(line.lineTotal)}</strong>
          </div>
          ${line.coupons.map((entry) => `<div class="receipt-row receipt-item-coupon coupon-saving"><span>&#8627; ${escapeHtml(entry.coupon.code)} &middot; ${couponDiscountLabel(entry.coupon)}</span><strong>-${money(entry.amount)}</strong></div>`).join('')}
        </div>`).join('')
    : '<p class="receipt-empty">Your cart is empty. Add items from the shelves to build a receipt.</p>'

  const purchaseRows = receipt.purchaseCoupons.map((entry) => `
    <div class="receipt-row coupon-saving"><span>Entire purchase &middot; ${escapeHtml(entry.coupon.code)} &middot; ${couponDiscountLabel(entry.coupon)}</span><strong>-${money(entry.amount)}</strong></div>`).join('')

  return `
    <div class="receipt-items">${itemRows}</div>
    <div class="receipt-rule"></div>
    <div class="receipt-row"><span>Shopping list total</span><strong>${money(receipt.totalPrice)}</strong></div>
    ${purchaseRows}
    <div class="receipt-row receipt-subtotal"><span>Subtotal after savings</span><strong>${money(receipt.discountedPrice)}</strong></div>`
}

function renderCart() {
  const { totalItems, totalPrice } = cartTotals()
  const receipt = buildReceipt()
  const lines = [...state.cart.entries()]
  return `<aside class="cart-panel"><div class="cart-header"><h2>Shopping cart</h2><button class="ghost" type="button" data-clear-cart ${lines.length ? '' : 'disabled'}>Clear</button></div><p class="cart-summary">${totalItems} item${totalItems === 1 ? '' : 's'} in cart</p>
    <div class="cart-lines">${lines.length ? lines.map(([key, item]) => `<div class="cart-line"><span class="cart-item-image" style="background-image:url('${item.image}')"></span><div class="cart-item-details"><strong>${escapeHtml(item.name)}</strong><span>${money(item.price)} each</span><span class="cart-line-total">${item.quantity} x ${money(item.price)} = ${money(item.price * item.quantity)}</span></div><div class="cart-controls"><button class="ghost" type="button" data-remove-item="${escapeHtml(key)}" aria-label="Remove one ${escapeHtml(item.name)}">-</button><span aria-label="Quantity">${item.quantity}</span><button class="ghost" type="button" data-add-item-to-cart="${escapeHtml(key)}" aria-label="Add one more ${escapeHtml(item.name)}">+</button></div></div>`).join('') : '<div class="empty-cart">Click products on any shelf. Your cart stays here while you switch aisles.</div>'}</div>
    <div class="cart-total"><span>Total bill</span><strong>${money(totalPrice)}</strong></div>
    <section class="coupon-checkout"><h3>Have a class coupon?</h3><p>Scan up to 5 coupon barcodes or enter their printed codes.</p><div class="coupon-entry"><input type="text" data-coupon-code placeholder="FM-XXXXXX" aria-label="Coupon code"><button type="button" data-apply-coupon ${state.appliedCoupons.length >= 5 ? 'disabled' : ''}>Apply</button></div><button class="scan-button" type="button" data-scan-coupon ${state.appliedCoupons.length >= 5 ? 'disabled' : ''}>Scan with camera</button><p class="coupon-count">${state.appliedCoupons.length} of 5 coupons applied</p>${state.message ? `<p class="checkout-message">${escapeHtml(state.message)}</p>` : ''}</section>
    <section class="receipt">
      <div class="receipt-heading"><div><p class="receipt-kicker">Grocery receipt</p><h3>Your estimated checkout</h3></div><div class="receipt-heading-actions"><button class="copy-receipt" type="button" data-print-receipt>Print</button><button class="copy-receipt" type="button" data-copy-receipt>Copy</button></div></div>
      <div class="receipt-rule"></div>
      ${renderReceiptBody(receipt)}
      <label class="receipt-input-row"><span>Sales tax</span><span class="percent-input"><input type="number" min="0" step="0.01" value="${state.salesTax || ''}" placeholder="0" data-sales-tax><span>%</span></span></label>
      <div class="receipt-row"><span>Tax amount</span><strong>${money(receipt.salesTaxAmount)}</strong></div>
      <div class="receipt-rule"></div>
      <div class="receipt-final"><span>Final total</span><strong>${money(receipt.finalTotal)}</strong></div>
      <div class="receipt-rule"></div>
      <div class="receipt-row coupon-total"><span>Total Amount Saved Today</span><strong>${money(receipt.discount)}</strong></div>
    </section>
  </aside>`
}

function renderReceiptSheet() {
  const receipt = buildReceipt()
  return `<main class="print-sheet">
    <div class="print-toolbar"><button type="button" data-close-print>Back</button><p>Choose <strong>Save to PDF</strong> in the print window to keep a copy.</p><button class="primary-button" type="button" data-browser-print>Print / Save PDF</button></div>
    <section class="receipt-sheet">
      <article class="print-receipt">
        <header class="print-receipt-head"><h1>FRESH MART</h1><p>${escapeHtml(state.store?.name ?? 'Classroom store')}</p><p>${escapeHtml(new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }))}</p></header>
        <div class="receipt-rule"></div>
        ${renderReceiptBody(receipt)}
        <div class="receipt-row"><span>Sales tax (${state.salesTax}%)</span><strong>${money(receipt.salesTaxAmount)}</strong></div>
        <div class="receipt-rule"></div>
        <div class="receipt-final"><span>Final total</span><strong>${money(receipt.finalTotal)}</strong></div>
        <div class="receipt-rule"></div>
        <div class="receipt-row coupon-total receipt-saved"><span>Total Amount Saved Today</span><strong>${money(receipt.discount)}</strong></div>
        <footer class="print-receipt-foot"><p>Thank you for shopping at Fresh Mart!</p></footer>
      </article>
    </section>
  </main>`
}

function renderStore() {
  const shoppable = shoppableAisles()
  if (!shoppable.length) {
    return `<main class="storefront-shell">${state.presenting ? '' : renderAppHeader('Class grocery challenge')}<section class="storefront"><div class="shelf-column"><div class="empty-cart">This store has no items on its shelves yet. ${state.role === 'teacher' ? 'Tick some items in Prices &amp; stock.' : 'Check back with your teacher.'}</div></div>${renderCart()}</section></main>`
  }
  const index = Math.min(state.shopAisleIndex, shoppable.length - 1)
  const aisle = shoppable[index]
  const refreshButton = state.role === 'student' && state.studentJoinCode
    ? `<button type="button" data-refresh-store ${state.refreshing ? 'disabled' : ''}>Refresh store prices</button>`
    : ''
  const statusLine = state.role === 'student' && state.studentJoinCode
    ? `<p class="class-status">Shopping at: <strong>${escapeHtml(state.store?.name ?? state.studentJoinCode)}</strong> ${refreshButton}</p>`
    : ''
  return `<main class="storefront-shell">
    ${state.presenting ? '<button class="exit-present" type="button" data-exit-present>Exit presentation</button>' : renderAppHeader(state.role === 'teacher' ? 'Student preview' : 'Class grocery challenge')}
    <section class="storefront"><div class="shelf-column">${statusLine}${renderShelfCard(aisle, index + 1, shoppable.length)}</div>${renderCart()}</section>
  </main>`
}

// ------------------------------------------------------------ printed coupons

const code39Patterns: Record<string, string> = {
  '0':'nnnwwnwnn','1':'wnnwnnnnw','2':'nnwwnnnnw','3':'wnwwnnnnn','4':'nnnwwnnnw','5':'wnnwwnnnn','6':'nnwwwnnnn','7':'nnnwnnwnw','8':'wnnwnnwnn','9':'nnwwnnwnn',
  A:'wnnnnwnnw',B:'nnwnnwnnw',C:'wnwnnwnnn',D:'nnnnwwnnw',E:'wnnnwwnnn',F:'nnwnwwnnn',G:'nnnnnwwnw',H:'wnnnnwwnn',I:'nnwnnwwnn',J:'nnnnwwwnn',
  K:'wnnnnnnww',L:'nnwnnnnww',M:'wnwnnnnwn',N:'nnnnwnnww',O:'wnnnwnnwn',P:'nnwnwnnwn',Q:'nnnnnnwww',R:'wnnnnnwwn',S:'nnwnnnwwn',T:'nnnnwnwwn',
  U:'wwnnnnnnw',V:'nwwnnnnnw',W:'wwwnnnnnn',X:'nwnnwnnnw',Y:'wwnnwnnnn',Z:'nwwnwnnnn','-':'nwnnnnwnw','.':'wwnnnnwnn',' ':'nwwnnnwnn','$':'nwnwnwnnn','/':'nwnwnnnwn','+':'nwnnnwnwn','%':'nnnwnwnwn','*':'nwnnwnwnn',
}

function barcodeSvg(code: string) {
  const encoded = `*${code.toUpperCase()}*`
  let x = 10
  const bars: string[] = []
  for (const character of encoded) {
    const pattern = code39Patterns[character]
    if (!pattern) continue
    ;[...pattern].forEach((width, index) => {
      const pixels = width === 'w' ? 4 : 2
      if (index % 2 === 0) bars.push(`<rect x="${x}" y="5" width="${pixels}" height="48"/>`)
      x += pixels
    })
    x += 2
  }
  return `<svg class="coupon-barcode" viewBox="0 0 ${x + 8} 60" role="img" aria-label="Barcode ${escapeHtml(code)}">${bars.join('')}</svg>`
}

function renderPrintableCoupon(coupon: Coupon) {
  const product = coupon.productId === 'all' ? null : productById[coupon.productId]
  const productImage = product
    ? `<img class="coupon-product-image" src="${product.image}" alt="${escapeHtml(product.name)}">`
    : '<span class="coupon-cart-icon" aria-hidden="true">$</span>'
  const burst = coupon.discountType === 'dollars' ? money(coupon.discountAmount) : `${coupon.discountAmount}%`
  return `<article class="print-coupon"><div class="coupon-burst">${escapeHtml(burst)}<small>OFF</small></div>${productImage}<div class="print-coupon-copy"><p>FRESH MART CLASS COUPON</p><h2>${escapeHtml(couponDiscountLabel(coupon))} ${escapeHtml(formatCouponItem(coupon))}</h2><span>Valid ${escapeHtml(formatDate(coupon.startsAt))}<br>through ${escapeHtml(formatDate(coupon.endsAt))}</span>${barcodeSvg(coupon.code)}<strong>${escapeHtml(coupon.code)}</strong></div></article>`
}

function renderPrintSheet(coupons: Coupon[]) {
  const printable = coupons.flatMap((coupon) => Array.from({ length: couponCopies(coupon) }, () => coupon))
  const pages = chunkItems(printable, 10)
  return `<main class="print-sheet"><div class="print-toolbar"><button type="button" data-close-print>Back</button><p>${printable.length} coupons, 10 per page. Choose <strong>Save to PDF</strong> in the print window.</p><button class="primary-button" type="button" data-browser-print>Print / Save PDF</button></div>${pages.map((page) => `<section class="coupon-sheet">${page.map(renderPrintableCoupon).join('')}</section>`).join('')}</main>`
}

function attachPrintSheetEvents() {
  app!.querySelector('[data-browser-print]')?.addEventListener('click', () => window.print())
  app!.querySelector('[data-close-print]')?.addEventListener('click', () => { state.printing = null; render() })
}

function printCoupons(coupons: Coupon[]) {
  state.printing = { kind: 'coupons', coupons }
  render()
}

// --------------------------------------------------------------- store access

async function openStore(store: Store) {
  state.store = store
  state.storeItems = await loadStoreItems(store.id)
  state.coupons = await loadCoupons(store.id)
  state.activeAisleIndex = 0
  state.shopAisleIndex = 0
}

async function refreshTeacherStores() {
  state.stores = await listStores()
}

function applyJoinedStore(joined: NonNullable<Awaited<ReturnType<typeof fetchStoreByJoinCode>>>) {
  state.store = joined.store
  state.coupons = joined.coupons
  state.storeItems = new Map(Object.entries(joined.items).map(([productId, entry]) => [
    productId,
    { id: '', productId, price: entry.price ?? catalogPrice(productId), hidden: Boolean(entry.hidden) },
  ]))
}

async function refreshStudentStore() {
  if (state.role !== 'student' || !state.studentJoinCode || state.refreshing) return
  state.refreshing = true
  const joined = await fetchStoreByJoinCode(state.studentJoinCode)
  state.refreshing = false
  if (!joined) return
  applyJoinedStore(joined)
  render()
}

function errorMessage(error: unknown, fallback: string) {
  const response = (error as { response?: { message?: string } })?.response
  return response?.message || (error as Error)?.message || fallback
}

async function withBusy(work: () => Promise<void>) {
  if (state.busy) return
  state.busy = true
  render()
  try {
    await work()
  } finally {
    state.busy = false
    render()
  }
}

// ---------------------------------------------------------------- coupon use

function applyCouponCode(rawCode: string) {
  const code = rawCode.trim().toUpperCase()
  const coupon = state.coupons.find((item) => item.code === code)
  if (!coupon) {
    state.message = 'That coupon code was not found in this store.'
    render()
    return
  }
  const problem = couponStatus(coupon)
  if (problem) {
    state.message = problem
    render()
    return
  }
  if (window.confirm(`Apply ${couponDiscountLabel(coupon)} ${formatCouponItem(coupon)}?`)) {
    if (state.appliedCoupons.length >= 5) {
      state.message = 'You can apply up to 5 class coupons.'
    } else if (state.appliedCoupons.some((item) => item.code === coupon.code)) {
      state.message = 'That coupon has already been applied.'
    } else {
      state.appliedCoupons.push(coupon)
      state.message = `${coupon.code} applied!`
    }
    render()
  }
}

async function scanCoupon() {
  const Detector = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => { detect(source: ImageBitmapSource): Promise<Array<{ rawValue: string }>> } }).BarcodeDetector
  if (!Detector || !navigator.mediaDevices?.getUserMedia) {
    state.message = 'Camera barcode scanning is blocked or unavailable. Type the code printed below the barcode instead.'
    render()
    return
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    const overlay = document.createElement('div')
    overlay.className = 'scanner-overlay'
    overlay.innerHTML = '<div class="scanner-dialog"><h2>Point the camera at the coupon barcode</h2><video autoplay playsinline></video><button type="button">Cancel</button></div>'
    document.body.append(overlay)
    const video = overlay.querySelector('video') as HTMLVideoElement
    video.srcObject = stream
    const detector = new Detector({ formats: ['code_39'] })
    let active = true
    const close = () => { active = false; stream.getTracks().forEach((track) => track.stop()); overlay.remove() }
    overlay.querySelector('button')?.addEventListener('click', close)
    await video.play()
    const check = async () => {
      if (!active) return
      const results = await detector.detect(video)
      if (results[0]?.rawValue) { const code = results[0].rawValue; close(); applyCouponCode(code); return }
      window.setTimeout(check, 250)
    }
    void check()
  } catch {
    state.message = 'Camera access was not allowed. Type the coupon code instead.'
    render()
  }
}

// ------------------------------------------------------------ presentation

function startPresenting() {
  state.presenting = true
  state.role = 'teacher'
  state.screen = 'store'
  void document.documentElement.requestFullscreen?.().catch(() => {
    // Full screen can be refused; the stripped-down view is still useful.
  })
  render()
}

function stopPresenting() {
  if (!state.presenting) return
  state.presenting = false
  if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {})
  state.screen = 'prices'
  render()
}

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && state.presenting) stopPresenting()
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.presenting) stopPresenting()
})

// ------------------------------------------------------------------ events

function attachSharedHeaderEvents() {
  app!.querySelector('[data-home]')?.addEventListener('click', () => {
    state.screen = state.role === 'teacher' ? 'stores' : 'student-dashboard'
    state.message = ''
    render()
  })
  app!.querySelector('[data-switch-role]')?.addEventListener('click', () => {
    state.role = null
    state.screen = 'welcome'
    state.message = ''
    render()
  })
  app!.querySelector('[data-sign-out]')?.addEventListener('click', () => {
    signOut()
    state.role = null
    state.store = null
    state.stores = []
    state.screen = 'welcome'
    state.message = ''
    history.pushState({}, '', '/')
    render()
  })
  app!.querySelector('[data-teacher-stores]')?.addEventListener('click', () => { state.screen = 'stores'; state.message = ''; render() })
  app!.querySelector('[data-teacher-prices]')?.addEventListener('click', () => { state.screen = 'prices'; state.message = ''; render() })
  app!.querySelector('[data-teacher-coupons]')?.addEventListener('click', () => { state.screen = 'coupons'; state.message = ''; render() })
  app!.querySelector('[data-preview-store]')?.addEventListener('click', () => { state.screen = 'store'; state.shopAisleIndex = 0; state.message = ''; render() })
  app!.querySelector('[data-present-store]')?.addEventListener('click', () => startPresenting())
}

function attachWelcomeEvents() {
  const joinInput = app!.querySelector<HTMLInputElement>('[data-join-code-input]')
  joinInput?.addEventListener('input', () => { state.joinCodeInput = joinInput.value })
  app!.querySelector('[data-join-store]')?.addEventListener('click', () => void withBusy(async () => {
    const joined = await fetchStoreByJoinCode(state.joinCodeInput)
    if (!joined) {
      state.message = 'That store code was not found. Check the code with your teacher.'
      return
    }
    applyJoinedStore(joined)
    saveStudentJoinCode(state.joinCodeInput)
    state.role = 'student'
    state.screen = 'student-dashboard'
    state.shopAisleIndex = 0
    state.message = ''
  }))
  app!.querySelector('[data-teacher-access]')?.addEventListener('click', () => {
    history.pushState({}, '', '/teacher')
    state.message = ''
    render()
  })
}

let showSignup = false

function attachTeacherLoginEvents() {
  app!.querySelector<HTMLFormElement>('[data-teacher-login]')?.addEventListener('submit', (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget as HTMLFormElement)
    void withBusy(async () => {
      try {
        await signIn(String(data.get('email') ?? ''), String(data.get('password') ?? ''))
        await enterTeacherArea()
      } catch (error) {
        state.message = errorMessage(error, 'That email and password did not match.')
      }
    })
  })
  app!.querySelector<HTMLFormElement>('[data-teacher-signup]')?.addEventListener('submit', (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget as HTMLFormElement)
    void withBusy(async () => {
      try {
        await signUp(String(data.get('email') ?? ''), String(data.get('password') ?? ''), String(data.get('displayName') ?? ''))
        showSignup = false
        await enterTeacherArea()
      } catch (error) {
        state.message = errorMessage(error, 'That account could not be created. Try a different email.')
      }
    })
  })
  app!.querySelector('[data-show-signup]')?.addEventListener('click', () => { showSignup = true; state.message = ''; render() })
  app!.querySelector('[data-show-signin]')?.addEventListener('click', () => { showSignup = false; state.message = ''; render() })
  app!.querySelector('[data-back-home]')?.addEventListener('click', () => {
    history.pushState({}, '', '/')
    state.role = null
    state.screen = 'welcome'
    state.message = ''
    render()
  })
}

async function enterTeacherArea() {
  state.role = 'teacher'
  await refreshTeacherStores()
  state.screen = 'stores'
  state.message = ''
}

function attachStoreListEvents() {
  app!.querySelector<HTMLFormElement>('[data-store-form]')?.addEventListener('submit', (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget as HTMLFormElement)
    const joinCode = normalizeJoinCode(String(data.get('joinCode') ?? ''))
    if (joinCode.length < 3) { state.message = 'Use at least 3 letters or numbers for the join code.'; render(); return }
    void withBusy(async () => {
      try {
        const store = await createStore(String(data.get('name') ?? ''), data.get('color') as StoreColor, joinCode)
        await refreshTeacherStores()
        await openStore(store)
        state.screen = 'prices'
        state.message = `${store.name} is ready. Students join with ${store.joinCode}.`
      } catch (error) {
        state.message = errorMessage(error, 'That store could not be created. The join code may already be taken.')
      }
    })
  })

  app!.querySelectorAll<HTMLElement>('[data-open-store]').forEach((button) => button.addEventListener('click', () => void withBusy(async () => {
    const store = state.stores.find((item) => item.id === button.dataset.openStore)
    if (!store) return
    await openStore(store)
    state.screen = 'prices'
    state.message = ''
  })))

  app!.querySelectorAll<HTMLElement>('[data-duplicate-store]').forEach((button) => button.addEventListener('click', () => {
    const store = state.stores.find((item) => item.id === button.dataset.duplicateStore)
    if (!store) return
    const name = window.prompt('Name for the copy', `${store.name} (copy)`)
    if (!name) return
    const color = window.prompt(`Color for the copy (${storeColors.join(', ')})`, store.color)
    if (!color) return
    const joinCode = window.prompt('Student join code for the copy', '')
    if (!joinCode) return
    void withBusy(async () => {
      try {
        const copy = await duplicateStore(store.id, name, color as StoreColor, joinCode)
        await refreshTeacherStores()
        state.message = `${copy.name} created with the same prices, stock and coupons. Students join with ${copy.joinCode}.`
      } catch (error) {
        state.message = errorMessage(error, 'That store could not be duplicated.')
      }
    })
  }))

  app!.querySelectorAll<HTMLElement>('[data-rename-store]').forEach((button) => button.addEventListener('click', () => {
    const store = state.stores.find((item) => item.id === button.dataset.renameStore)
    if (!store) return
    const name = window.prompt('Store name', store.name)
    if (!name) return
    const color = window.prompt(`Store color (${storeColors.join(', ')})`, store.color)
    if (!color) return
    const joinCode = window.prompt('Student join code', store.joinCode)
    if (!joinCode) return
    void withBusy(async () => {
      try {
        const updated = await updateStore(store.id, { name, color: color as StoreColor, joinCode })
        if (state.store?.id === updated.id) state.store = updated
        await refreshTeacherStores()
        state.message = `${updated.name} updated.`
      } catch (error) {
        state.message = errorMessage(error, 'That store could not be updated. The join code may already be taken.')
      }
    })
  }))

  app!.querySelectorAll<HTMLElement>('[data-delete-store]').forEach((button) => button.addEventListener('click', () => {
    const store = state.stores.find((item) => item.id === button.dataset.deleteStore)
    if (!store) return
    if (!window.confirm(`Delete ${store.name}? Its prices and coupons are deleted too. This cannot be undone.`)) return
    void withBusy(async () => {
      try {
        await deleteStore(store.id)
        if (state.store?.id === store.id) { state.store = null; state.storeItems = new Map(); state.coupons = [] }
        await refreshTeacherStores()
        state.message = `${store.name} deleted.`
      } catch (error) {
        state.message = errorMessage(error, 'That store could not be deleted.')
      }
    })
  }))
}

function attachPriceStudioEvents() {
  const storeId = state.store?.id
  if (!storeId) return

  app!.querySelectorAll<HTMLElement>('[data-pick-aisle]').forEach((button) => button.addEventListener('click', () => {
    state.activeAisleIndex = Number(button.dataset.pickAisle)
    render()
  }))

  app!.querySelectorAll<HTMLInputElement>('[data-price-id]').forEach((input) => input.addEventListener('change', () => {
    const productId = input.dataset.priceId ?? ''
    const value = Number(input.value)
    if (!Number.isFinite(value) || value < 0) { render(); return }
    void saveStoreItem(storeId, state.storeItems, productId, { price: Math.round(value * 100) / 100 })
      .then(() => { state.message = 'Saved.'; render() })
      .catch((error) => { state.message = errorMessage(error, 'That price could not be saved.'); render() })
  }))

  app!.querySelectorAll<HTMLInputElement>('[data-stock-id]').forEach((input) => input.addEventListener('change', () => {
    const productId = input.dataset.stockId ?? ''
    const item = aisles[state.activeAisleIndex].items.find((entry) => entry.id === productId)
    void saveStoreItem(storeId, state.storeItems, productId, { price: item ? priceFor(item) : 0, hidden: !input.checked })
      .then(() => { state.message = 'Saved.'; render() })
      .catch((error) => { state.message = errorMessage(error, 'That change could not be saved.'); render() })
  }))

  const bulkStock = (hidden: boolean) => void withBusy(async () => {
    const aisle = aisles[state.activeAisleIndex]
    try {
      await Promise.all(aisle.items.map((item) => saveStoreItem(storeId, state.storeItems, item.id, { price: priceFor(item), hidden })))
      state.message = hidden ? `${aisle.title} taken off the shelves.` : `${aisle.title} fully stocked.`
    } catch (error) {
      state.message = errorMessage(error, 'Those changes could not be saved.')
    }
  })
  app!.querySelector('[data-stock-all]')?.addEventListener('click', () => bulkStock(false))
  app!.querySelector('[data-stock-none]')?.addEventListener('click', () => bulkStock(true))

  app!.querySelector('[data-copy-join-code]')?.addEventListener('click', async () => {
    const code = state.store?.joinCode ?? ''
    try { await navigator.clipboard.writeText(code); state.message = `Join code ${code} copied.` }
    catch { window.prompt('Copy the join code:', code) }
    render()
  })
}

function attachCouponEvents() {
  const storeId = state.store?.id
  if (!storeId) return

  const discountType = app!.querySelector<HTMLSelectElement>('[data-discount-type]')
  const discountAmount = app!.querySelector<HTMLInputElement>('[data-discount-amount]')
  const discountAmountLabel = app!.querySelector<HTMLElement>('[data-discount-amount-label]')
  const discountSuffix = app!.querySelector<HTMLElement>('[data-discount-suffix]')

  function updateDiscountField() {
    const isDollarDiscount = discountType?.value === 'dollars'
    if (discountAmountLabel?.firstChild) discountAmountLabel.firstChild.textContent = isDollarDiscount ? 'Dollar amount off' : 'Percent off'
    if (discountAmount) {
      discountAmount.min = isDollarDiscount ? '0.01' : '1'
      discountAmount.max = isDollarDiscount ? '999' : '100'
      discountAmount.step = isDollarDiscount ? '0.01' : '1'
      discountAmount.value = isDollarDiscount ? '1.00' : '10'
    }
    if (discountSuffix) discountSuffix.textContent = isDollarDiscount ? '$' : '%'
  }
  discountType?.addEventListener('change', updateDiscountField)

  app!.querySelector<HTMLFormElement>('[data-coupon-form]')?.addEventListener('submit', (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget as HTMLFormElement)
    const startsAt = fromDateInput(String(data.get('startsAt') ?? ''))
    const endsAt = fromDateInput(String(data.get('endsAt') ?? ''))
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) { state.message = 'The ending time must be after the starting time.'; render(); return }
    const amount = Number(data.get('discountAmount'))
    if (!Number.isFinite(amount) || amount <= 0) { state.message = 'Enter a discount greater than zero.'; render(); return }

    void withBusy(async () => {
      try {
        const coupon = await createCoupon(storeId, {
          code: newCouponCode(),
          discountType: String(data.get('discountType')) === 'dollars' ? 'dollars' : 'percent',
          discountAmount: amount,
          productId: String(data.get('productId') ?? 'all'),
          startsAt, endsAt,
          copies: Math.min(100, Math.max(1, Number(data.get('copies')) || 1)),
        })
        state.coupons.push(coupon)
        state.message = `${coupon.code} created.`
        state.printing = { kind: 'coupons', coupons: [coupon] }
      } catch (error) {
        state.message = errorMessage(error, 'That coupon could not be created.')
      }
    })
  })

  app!.querySelector('[data-random-coupons]')?.addEventListener('click', () => {
    const count = Math.min(10, Math.max(1, Number(app!.querySelector<HTMLInputElement>('[data-random-coupon-count]')?.value) || 1))
    const copies = Math.min(100, Math.max(1, Number(app!.querySelector<HTMLInputElement>('[data-random-coupon-copies]')?.value) || 10))
    const percents = [5, 10, 15, 20, 25, 30, 40, 50]
    const productIds = ['all', ...stockedProductIds()]
    void withBusy(async () => {
      try {
        for (let index = 0; index < count; index++) {
          const coupon = await createCoupon(storeId, {
            code: newCouponCode(),
            discountType: 'percent',
            discountAmount: percents[Math.floor(Math.random() * percents.length)],
            productId: productIds[Math.floor(Math.random() * productIds.length)],
            startsAt: '', endsAt: '', copies,
          })
          state.coupons.push(coupon)
        }
        state.message = `${count} random coupon design${count === 1 ? '' : 's'} created with ${copies} copies each.`
      } catch (error) {
        state.message = errorMessage(error, 'Those coupons could not be created.')
      }
    })
  })

  app!.querySelectorAll<HTMLInputElement>('[data-coupon-copies]').forEach((input) => input.addEventListener('change', () => {
    const coupon = state.coupons.find((item) => item.id === input.dataset.couponCopies)
    if (!coupon) return
    const copies = Math.min(100, Math.max(1, Number(input.value) || 1))
    coupon.copies = copies
    void updateCouponCopies(coupon.id, copies)
      .then(() => render())
      .catch((error) => { state.message = errorMessage(error, 'That change could not be saved.'); render() })
  }))

  app!.querySelectorAll<HTMLElement>('[data-print-one-coupon]').forEach((button) => button.addEventListener('click', () => {
    const coupon = state.coupons.find((item) => item.id === button.dataset.printOneCoupon)
    if (coupon) printCoupons([coupon])
  }))

  app!.querySelectorAll<HTMLElement>('[data-delete-coupon]').forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.deleteCoupon ?? ''
    void withBusy(async () => {
      try {
        await deleteCoupon(id)
        state.coupons = state.coupons.filter((coupon) => coupon.id !== id)
        state.appliedCoupons = state.appliedCoupons.filter((coupon) => coupon.id !== id)
      } catch (error) {
        state.message = errorMessage(error, 'That coupon could not be deleted.')
      }
    })
  }))

  app!.querySelector('[data-print-coupons]')?.addEventListener('click', () => printCoupons(state.coupons))
}

function attachStoreEvents() {
  app!.querySelectorAll<HTMLElement>('[data-add-item]').forEach((button) => button.addEventListener('click', () => addToCart(JSON.parse(decodeURIComponent(button.dataset.addItem ?? '{}')) as ShelfItem)))
  app!.querySelectorAll<HTMLElement>('[data-add-item-to-cart]').forEach((button) => button.addEventListener('click', () => increaseCartItem(button.dataset.addItemToCart ?? '')))
  app!.querySelectorAll<HTMLElement>('[data-remove-item]').forEach((button) => button.addEventListener('click', () => removeFromCart(button.dataset.removeItem ?? '')))
  app!.querySelector('[data-clear-cart]')?.addEventListener('click', () => { state.cart.clear(); state.appliedCoupons = []; saveCart(); render() })
  app!.querySelector('[data-refresh-store]')?.addEventListener('click', () => void refreshStudentStore())
  app!.querySelector('[data-exit-present]')?.addEventListener('click', () => stopPresenting())
  app!.querySelectorAll<HTMLElement>('[data-nav]').forEach((button) => button.addEventListener('click', () => {
    const count = shoppableAisles().length
    if (!count) return
    state.shopAisleIndex = (state.shopAisleIndex + (button.dataset.nav === 'prev' ? -1 : 1) + count) % count
    render()
  }))
  app!.querySelector<HTMLInputElement>('[data-sales-tax]')?.addEventListener('change', (event) => {
    state.salesTax = Math.max(0, Number((event.target as HTMLInputElement).value) || 0)
    render()
  })
  app!.querySelector('[data-apply-coupon]')?.addEventListener('click', () => applyCouponCode(app!.querySelector<HTMLInputElement>('[data-coupon-code]')?.value ?? ''))
  const couponInput = app!.querySelector<HTMLInputElement>('[data-coupon-code]')
  couponInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') applyCouponCode(couponInput.value)
  })
  app!.querySelector('[data-scan-coupon]')?.addEventListener('click', () => void scanCoupon())
  app!.querySelector('[data-print-receipt]')?.addEventListener('click', () => { state.printing = { kind: 'receipt' }; render() })
  app!.querySelector('[data-copy-receipt]')?.addEventListener('click', async () => {
    const text = receiptText()
    try { await navigator.clipboard.writeText(text); state.message = 'Receipt copied.' }
    catch { window.prompt('Copy your receipt:', text) }
    render()
  })
}

// -------------------------------------------------------------------- render

function render() {
  document.body.classList.toggle('presenting', state.presenting)
  if (state.store) document.body.dataset.storeColor = state.store.color
  else delete document.body.dataset.storeColor

  if (state.printing) {
    app!.innerHTML = state.printing.kind === 'receipt' ? renderReceiptSheet() : renderPrintSheet(state.printing.coupons)
    attachPrintSheetEvents()
    return
  }

  const onTeacherPath = window.location.pathname.replace(/\/+$/, '') === '/teacher'

  if (onTeacherPath && !currentTeacher()) {
    app!.innerHTML = showSignup ? renderTeacherSignup() : renderTeacherLogin()
    attachTeacherLoginEvents()
    return
  }

  if (state.screen === 'welcome') {
    app!.innerHTML = renderWelcomePage()
    attachWelcomeEvents()
    return
  }

  if (state.screen === 'student-dashboard') {
    app!.innerHTML = renderStudentDashboard()
    app!.querySelector('[data-start-student-shopping]')?.addEventListener('click', () => { state.screen = 'store'; render() })
    return
  }

  if (state.role === 'teacher' && !currentTeacher()) {
    // The session expired while the teacher was working.
    state.role = null
    state.screen = 'welcome'
    state.message = 'Your session ended. Please sign in again.'
    render()
    return
  }

  if (state.screen === 'stores') app!.innerHTML = renderStoreList()
  if (state.screen === 'prices') app!.innerHTML = state.store ? renderPriceStudio() : renderStoreList()
  if (state.screen === 'coupons') app!.innerHTML = state.store ? renderCouponStudio() : renderStoreList()
  if (state.screen === 'store') app!.innerHTML = renderStore()

  if (!state.presenting) attachSharedHeaderEvents()
  if (state.screen === 'stores' || (!state.store && (state.screen === 'prices' || state.screen === 'coupons'))) attachStoreListEvents()
  else if (state.screen === 'prices') attachPriceStudioEvents()
  else if (state.screen === 'coupons') attachCouponEvents()
  if (state.screen === 'store') attachStoreEvents()

  if (state.screen === 'store' && state.role === 'student' && state.studentJoinCode) {
    window.setTimeout(() => void refreshStudentStore(), 10000)
  }
}

// ---------------------------------------------------------------------- boot

async function boot() {
  if (currentTeacher()) {
    try {
      await pb.collection('teachers').authRefresh()
      state.role = 'teacher'
      await refreshTeacherStores()
      state.screen = 'stores'
    } catch {
      signOut()
    }
  } else if (state.studentJoinCode) {
    const joined = await fetchStoreByJoinCode(state.studentJoinCode)
    if (joined) {
      applyJoinedStore(joined)
      state.role = 'student'
      state.screen = 'student-dashboard'
    }
  }
  render()
}

window.addEventListener('popstate', () => render())

render()
void boot()
