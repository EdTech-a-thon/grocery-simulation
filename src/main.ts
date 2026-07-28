import './style.css'
import { productById } from './products'
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

type AisleConfig = {
  title: string
  items: Array<{ id: string; price?: number; sale?: boolean }>
}

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
type Coupon = {
  code: string
  percent?: number
  discountType?: 'percent' | 'dollars'
  discountAmount?: number
  itemId: string
  startsAt: string
  endsAt: string
  copies?: number
}
type ClassSettings = { prices: Record<string, number>; coupons: Coupon[] }

const aisles = [
  dryGoodsAisle,
  cannedAndSaucesAisle,
  saucesAndCondimentsAisle,
  dairyAisle,
  frozenFoodsAisle,
  bakeryAisle,
  produceAisle,
  meatAisle,
  seafoodAisle,
  beveragesAisle,
  snacksAisle,
  householdAisle,
] as AisleConfig[]

const cartStorageKey = 'fresh-mart-cart'
const settingsStorageKey = 'fresh-mart-class-settings'
const priceResetStorageKey = 'fresh-mart-price-reset-v1'
const studentClassCodeStorageKey = 'fresh-mart-student-class-code'
const teacherCodeStorageKey = 'fresh-mart-teacher-code'
const teacherUnlockStorageKey = 'fresh-mart-teacher-unlocked'
const defaultTeacherCode = 'TEACH-2026'
const shelfCapacity = 9
const allAisleItems = aisles.flatMap((aisle) => aisle.items)
const defaultSettings: ClassSettings = { prices: {}, coupons: [] }
const requestedTeacherAccess = new URLSearchParams(location.search).get('access')?.trim().toUpperCase()
const teacherAccessGranted = requestedTeacherAccess === defaultTeacherCode

if (teacherAccessGranted) {
  history.replaceState({}, '', '/teacher')
}

const state = {
  role: null as Role | null,
  screen: 'welcome' as 'welcome' | 'student-dashboard' | 'store' | 'teacher' | 'coupons',
  activeAisleIndex: 0,
  cart: loadCart(),
  settings: loadSettings(),
  appliedCoupons: [] as Coupon[],
  salesTax: 0,
  message: '',
  teacherCode: loadTeacherCode(),
  teacherUnlocked: teacherAccessGranted || loadTeacherUnlock(),
  classCodeInput: '',
  classCode: loadClassCode(),
  studentClassCode: loadStudentClassCode(),
  refreshingClass: false,
}

resetLegacyPriceOverrides()

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('App root not found')

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] ?? character)
}

function loadCart() {
  try {
    const lines = JSON.parse(localStorage.getItem(cartStorageKey) ?? '[]') as Array<[string, CartLine]>
    return new Map(Array.isArray(lines) ? lines : [])
  } catch {
    return new Map<string, CartLine>()
  }
}

function validSettings(value: unknown): value is ClassSettings {
  if (!value || typeof value !== 'object') return false
  const settings = value as ClassSettings
  return Boolean(settings.prices && typeof settings.prices === 'object' && Array.isArray(settings.coupons))
}

function loadTeacherCode() {
  try {
    return localStorage.getItem(teacherCodeStorageKey) ?? defaultTeacherCode
  } catch {
    // The fixed access code still works when browser storage is restricted.
  }
  return defaultTeacherCode
}

async function loadTeacherCodeFromServer() {
  try {
    const response = await fetch('/api/teacher-code')
    if (!response.ok) return
    const data = await response.json() as { code?: string }
    const code = normalizeClassCode(String(data.code ?? ''))
    if (!code || code === state.teacherCode) return
    state.teacherCode = code
    try {
      localStorage.setItem(teacherCodeStorageKey, code)
    } catch {
      // The server-synced teacher code remains active for this page.
    }
    render()
  } catch {
    // Fall back to the local or default teacher code.
  }
}

function saveTeacherCode(code: string) {
  state.teacherCode = normalizeClassCode(code)
  try {
    localStorage.setItem(teacherCodeStorageKey, state.teacherCode)
  } catch {
    // The updated teacher code remains available for this page.
  }
  void publishTeacherCode()
}

function loadClassCode() {
  try {
    return localStorage.getItem('fresh-mart-class-code') ?? ''
  } catch {
    return ''
  }
}

function loadStudentClassCode() {
  try {
    return localStorage.getItem(studentClassCodeStorageKey) ?? ''
  } catch {
    return ''
  }
}

function saveStudentClassCode(code: string) {
  state.studentClassCode = normalizeClassCode(code)
  try {
    localStorage.setItem(studentClassCodeStorageKey, state.studentClassCode)
  } catch {
    // The active class code remains available for this session.
  }
}

function normalizeClassCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20)
}

function saveClassCode(code: string) {
  state.classCode = normalizeClassCode(code)
  try {
    localStorage.setItem('fresh-mart-class-code', state.classCode)
  } catch {
    // The code remains available until the page is closed.
  }
}

async function publishClassSettings() {
  if (!state.classCode) return false

  try {
    const response = await fetch(`/api/classes/${encodeURIComponent(state.classCode)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.settings),
    })
    return response.ok
  } catch {
    return false
  }
}

async function publishTeacherCode() {
  if (!state.teacherCode) return false

  try {
    const response = await fetch('/api/teacher-code', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: state.teacherCode }),
    })
    return response.ok
  } catch {
    return false
  }
}

async function fetchClassSettings(code: string) {
  try {
    const response = await fetch(`/api/classes/${encodeURIComponent(normalizeClassCode(code))}`)
    if (!response.ok) return null
    const settings = await response.json() as unknown
    return validSettings(settings) ? settings : null
  } catch {
    return null
  }
}

async function refreshStudentClass() {
  if (state.role !== 'student' || !state.studentClassCode || state.refreshingClass) return

  state.refreshingClass = true
  const settings = await fetchClassSettings(state.studentClassCode)
  state.refreshingClass = false

  if (!settings || JSON.stringify(settings) === JSON.stringify(state.settings)) return

  state.settings = settings
  try {
    localStorage.setItem(settingsStorageKey, JSON.stringify(settings))
  } catch {
    // The refreshed prices remain active for the current page.
  }
  render()
}

function loadTeacherUnlock() {
  try {
    return sessionStorage.getItem(teacherUnlockStorageKey) === 'true'
  } catch {
    return false
  }
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(settingsStorageKey) ?? 'null') as unknown
    return validSettings(saved) ? saved : structuredClone(defaultSettings)
  } catch {
    return structuredClone(defaultSettings)
  }
}

function resetLegacyPriceOverrides() {
  try {
    if (localStorage.getItem(priceResetStorageKey) === 'done') return
    state.settings.prices = {}
    localStorage.setItem(settingsStorageKey, JSON.stringify(state.settings))
    localStorage.setItem(priceResetStorageKey, 'done')
  } catch {
    state.settings.prices = {}
  }
}

function saveCart() {
  localStorage.setItem(cartStorageKey, JSON.stringify([...state.cart.entries()]))
}

function saveSettings() {
  localStorage.setItem(settingsStorageKey, JSON.stringify(state.settings))
  void publishClassSettings()
}

function setTeacherUnlocked(value: boolean) {
  state.teacherUnlocked = value
  try {
    if (value) sessionStorage.setItem(teacherUnlockStorageKey, 'true')
    else sessionStorage.removeItem(teacherUnlockStorageKey)
  } catch {
    // In-memory access remains active for this page when storage is restricted.
  }
}

function priceFor(item: AisleConfig['items'][number]) {
  return state.settings.prices[item.id] ?? item.price ?? productById[item.id]?.price ?? 0
}

function toShelfItem(aisle: AisleConfig, item: AisleConfig['items'][number]): ShelfItem | null {
  const product = productById[item.id]
  if (!product) return null
  return { ...product, price: priceFor(item), aisleTitle: aisle.title, sale: item.sale }
}

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

function couponStatus(coupon: Coupon) {
  const now = Date.now()
  if (coupon.startsAt && now < new Date(coupon.startsAt).getTime()) return 'This coupon is not active yet.'
  if (coupon.endsAt && now > new Date(coupon.endsAt).getTime()) return 'This coupon has expired.'
  if (coupon.itemId !== 'all' && ![...state.cart.values()].some((item) => item.id === coupon.itemId)) {
    return `Add ${productById[coupon.itemId]?.name ?? 'the coupon item'} to the cart first.`
  }
  return ''
}

function receiptTotals() {
  const { totalPrice } = cartTotals()
  const couponDiscounts = state.appliedCoupons.map((coupon) => {
    const eligibleTotal = [...state.cart.values()]
      .filter((item) => coupon.itemId === 'all' || item.id === coupon.itemId)
      .reduce((itemSum, item) => itemSum + item.price * item.quantity, 0)
    return { coupon, amount: couponDiscountAmount(coupon, eligibleTotal) }
  })
  const discount = couponDiscounts.reduce((sum, item) => sum + item.amount, 0)
  const discountedPrice = Math.max(0, totalPrice - discount)
  const salesTaxAmount = discountedPrice * state.salesTax / 100
  return { totalPrice, couponDiscounts, discount: Math.min(totalPrice, discount), discountedPrice, salesTaxAmount, finalTotal: discountedPrice + salesTaxAmount }
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size))
  return chunks
}

function renderWelcomePage() {
  return `
    <main class="welcome-page">
      <section class="welcome-card role-welcome" aria-labelledby="welcome-title">
        <div class="welcome-copy">
          <p class="welcome-kicker">Real-life math adventure</p>
          <h1 id="welcome-title">Fresh Mart Classroom</h1>
          <p class="welcome-intro">Choose how you are joining today. Teachers set the class prices and make coupons. Students shop and practice checkout math.</p>
          <div class="role-actions">
            <label class="join-card">
              <span class="join-label">Student class code</span>
              <div class="join-row">
                <input type="text" data-class-code-input placeholder="FM1. ..." aria-label="Student class code" value="${escapeHtml(state.classCodeInput)}">
                <button class="role-button student-role" type="button" data-join-class>Student join class</button>
              </div>
              <small>Students type the code their teacher gives them.</small>
            </label>
            <button class="teacher-link-button" type="button" data-teacher-access>Teacher access</button>
          </div>
        </div>
        <div class="student-store-scene" aria-label="Fresh Market grocery store illustration">
          <div class="student-sun"></div><div class="student-cloud student-cloud-one"></div><div class="student-cloud student-cloud-two"></div>
          <div class="student-ground"></div>
          <div class="student-market-building">
            <div class="student-market-sign"><span>FRESH</span> MARKET</div>
            <div class="student-market-awning"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
            <div class="student-market-window student-market-window-left"><p>FRESH<br>MARKET</p></div>
            <div class="student-market-door"><span>OPEN</span><i></i></div>
            <div class="student-market-window student-market-window-right"><p>WELCOME<br>SHOPPERS</p></div>
          </div>
        </div>
      </section>
    </main>`
}

function renderStudentDashboard() {
  const itemCount = cartTotals().totalItems
  return `<main class="student-dashboard-page">
    <section class="student-dashboard-card" aria-labelledby="student-dashboard-title">
      <div class="student-dashboard-copy">
        <p class="welcome-kicker">Welcome to your class store</p>
        <h1 id="student-dashboard-title">Fresh Market<br>Grocery Store</h1>
        <p>Explore the aisles, choose items for your cart, and practice real-life shopping skills at checkout.</p>
        ${state.studentClassCode ? `<p class="student-class-badge">Class code: ${escapeHtml(state.studentClassCode)}</p>` : ''}
        <button class="student-shop-button" type="button" data-start-student-shopping>Enter the store <span aria-hidden="true">→</span></button>
        ${itemCount ? `<p class="saved-cart-note">Your cart has ${itemCount} item${itemCount === 1 ? '' : 's'} waiting.</p>` : ''}
      </div>
      <div class="student-store-scene" aria-label="Fresh Market grocery store illustration">
        <div class="student-sun"></div><div class="student-cloud student-cloud-one"></div><div class="student-cloud student-cloud-two"></div>
        <div class="student-ground"></div>
        <div class="student-market-building">
          <div class="student-market-sign"><span>FRESH</span> MARKET</div>
          <div class="student-market-awning"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <div class="student-market-window student-market-window-left"><p>FRESH<br>MARKET</p></div>
          <div class="student-market-door"><span>OPEN</span><i></i></div>
          <div class="student-market-window student-market-window-right"><p>WELCOME<br>SHOPPERS</p></div>
        </div>
      </div>
    </section>
  </main>`
}

function renderTeacherLogin() {
  return `<main class="teacher-login-page">
    <form class="teacher-login-card" data-teacher-login>
      <p class="welcome-kicker">Protected teacher area</p>
      <h1>Open teacher tools</h1>
      <p>Enter the teacher code, then use the Prices and Coupons tabs in your dashboard.</p>
      <label>Teacher access code<input name="teacherCode" type="password" autocomplete="off" autocapitalize="characters" placeholder="Enter teacher access code" required autofocus></label>
      ${state.message ? `<p class="login-error" role="alert">${escapeHtml(state.message)}</p>` : ''}
      <button class="primary-button teacher-login-submit" type="submit">Continue to teacher dashboard</button>
      <button class="teacher-link-button" type="button" data-back-home>Back to student sign in</button>
    </form>
  </main>`
}

function renderAppHeader(title: string) {
  return `<header class="app-header">
    <div><button class="brand-button" type="button" data-home>Fresh Mart</button><span class="role-chip">${state.role ?? 'class'} view</span></div>
    <h1>${escapeHtml(title)}</h1>
    <nav>
      ${state.role === 'teacher' ? '<button type="button" data-teacher-prices>Prices</button><button type="button" data-teacher-coupons>Coupons</button><button type="button" data-preview-store>Student preview</button>' : ''}
      <button type="button" data-switch-role>Switch role</button>
    </nav>
  </header>`
}

function renderTeacherDashboard() {
  if (!state.teacherUnlocked) {
    return renderWelcomePage()
  }
  const aisle = aisles[state.activeAisleIndex]
  return `<main class="teacher-shell">
    ${renderAppHeader('Class price studio')}
    <section class="teacher-hero">
      <div><p class="eyebrow">Teacher controls</p><h2>Build today’s life skills challenge</h2><p>Choose a short student join code, then copy it to share with your class. Price and coupon changes save to that shared class automatically.</p></div>
      <div class="teacher-access-panel"><label class="class-code-field">Student join code<input type="text" maxlength="20" value="${escapeHtml(state.classCode)}" placeholder="Example: ROOM-204" data-teacher-class-code aria-label="Student join code"></label><div class="class-code-actions"><button class="teacher-secondary-button" type="button" data-save-class-code>Save class code</button></div><p>Teacher access code: <strong>${escapeHtml(state.teacherCode)}</strong></p><label class="teacher-access-code-field">Change teacher access code<input type="text" maxlength="20" value="${escapeHtml(state.teacherCode)}" placeholder="Enter a new teacher code" data-teacher-access-code-input aria-label="Change teacher access code"></label><div class="class-code-actions"><button class="teacher-secondary-button" type="button" data-save-teacher-code>Save teacher access code</button></div></div>
    </section>
    ${state.message ? `<p class="status-message">${escapeHtml(state.message)}</p>` : ''}
    <section class="teacher-workspace">
      <aside class="aisle-picker"><h3>Food class</h3>${aisles.map((item, index) => `<button class="${index === state.activeAisleIndex ? 'active' : ''}" type="button" data-pick-aisle="${index}">${escapeHtml(item.title)}</button>`).join('')}</aside>
      <section class="price-editor">
        <div class="section-heading"><div><p class="eyebrow">Aisle ${state.activeAisleIndex + 1}</p><h2>${escapeHtml(aisle.title)}</h2></div><button class="primary-button" type="button" data-save-prices ${state.classCode ? '' : 'disabled'}>Save price changes</button></div>
        <p class="helper-text">Edit any item price, then save to update the shared student store for this class code.</p>
        <div class="price-grid">${aisle.items.map((item) => {
          const product = productById[item.id]
          return `<label class="price-edit-card"><img src="${product.image}" alt=""><span>${escapeHtml(product.name)}</span><span class="teacher-money-input">$<input type="number" min="0" max="999" step="0.01" value="${priceFor(item).toFixed(2)}" data-price-id="${item.id}" aria-label="Price for ${escapeHtml(product.name)}"></span></label>`
        }).join('')}</div>
      </section>
    </section>
  </main>`
}

function formatCouponItem(coupon: Coupon) {
  return coupon.itemId === 'all' ? 'entire purchase' : productById[coupon.itemId]?.name ?? coupon.itemId
}

function formatDate(value: string) {
  return value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'No limit'
}

function couponCopies(coupon: Coupon) {
  return Math.min(100, Math.max(1, Math.round(coupon.copies ?? 1)))
}

function couponDiscountType(coupon: Coupon) {
  return coupon.discountType ?? 'percent'
}

function couponDiscountValue(coupon: Coupon) {
  return coupon.discountAmount ?? coupon.percent ?? 0
}

function couponDiscountLabel(coupon: Coupon) {
  return couponDiscountType(coupon) === 'dollars'
    ? `${money(couponDiscountValue(coupon))} off`
    : `${couponDiscountValue(coupon)}% off`
}

function couponDiscountAmount(coupon: Coupon, eligibleTotal: number) {
  return couponDiscountType(coupon) === 'dollars'
    ? couponDiscountValue(coupon)
    : eligibleTotal * couponDiscountValue(coupon) / 100
}

function newCoupon(discountType: 'percent' | 'dollars', discountAmount: number, itemId: string, startsAt = '', endsAt = '', copies = 1): Coupon {
  return {
    code: `FM-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
    discountType,
    discountAmount,
    itemId,
    startsAt,
    endsAt,
    copies,
  }
}

function renderCouponStudio() {
  const productOptions = allAisleItems.map((item) => `<option value="${item.id}">${escapeHtml(productById[item.id]?.name ?? item.id)}</option>`).join('')
  const totalPrintableCoupons = state.settings.coupons.reduce((total, coupon) => total + couponCopies(coupon), 0)
  return `<main class="teacher-shell">
    ${renderAppHeader('Coupon workshop')}
    <section class="teacher-hero coupon-hero"><div><p class="eyebrow">Printable rewards</p><h2>Turn savings into a classroom surprise</h2><p>Create coupons manually or generate a random set. Printable sheets hold 10 coupons per page.</p></div>${state.settings.coupons.length ? `<div class="print-all-panel"><strong>${totalPrintableCoupons} total coupon${totalPrintableCoupons === 1 ? '' : 's'}</strong><span>${Math.ceil(totalPrintableCoupons / 10)} PDF page${Math.ceil(totalPrintableCoupons / 10) === 1 ? '' : 's'}</span><button class="primary-button" type="button" data-print-coupons>Print all coupons to PDF</button></div>` : ''}</section>
    ${state.message ? `<p class="status-message">${escapeHtml(state.message)}</p>` : ''}
    <section class="coupon-workspace">
      <form class="coupon-form" data-coupon-form>
        <div><p class="eyebrow">New coupon</p><h2>Discount details</h2></div>
        <label>Discount type<select name="discountType" data-discount-type><option value="percent">Percent off</option><option value="dollars">Dollar amount off</option></select></label>
        <label data-discount-amount-label>Percent off<input required name="discountAmount" type="number" min="1" max="100" step="1" value="10" data-discount-amount><span class="field-suffix" data-discount-suffix>%</span></label>
        <label>Applies to<select required name="itemId"><option value="all">Entire purchase</option>${productOptions}</select></label>
        <label>Starts<input name="startsAt" type="datetime-local"></label>
        <label>Ends<input name="endsAt" type="datetime-local"></label>
        <label>Number of this coupon<input required name="copies" type="number" min="1" max="100" step="1" value="10"></label>
        <button class="primary-button" type="submit">Create coupon</button>
        <div class="random-coupon-box">
          <div><p class="eyebrow">Quick surprise</p><h3>Generate random coupons</h3></div>
          <label>Different coupon designs<input type="number" min="1" max="10" step="1" value="3" data-random-coupon-count></label>
          <label>Copies of each design<input type="number" min="1" max="100" step="1" value="10" data-random-coupon-copies></label>
          <button class="randomize-button" type="button" data-random-coupons>Generate random coupons</button>
        </div>
      </form>
      <section class="coupon-list"><div class="section-heading"><div><p class="eyebrow">Class coupons</p><h2>${state.settings.coupons.length} ready to use</h2></div></div>
        ${state.settings.coupons.length ? state.settings.coupons.map((coupon) => `<article class="coupon-summary"><div><strong>${couponDiscountLabel(coupon)} ${escapeHtml(formatCouponItem(coupon))}</strong><span>${escapeHtml(coupon.code)} · ${escapeHtml(formatDate(coupon.startsAt))} to ${escapeHtml(formatDate(coupon.endsAt))}</span></div><label class="coupon-copy-control">Copies <input type="number" min="1" max="100" step="1" value="${couponCopies(coupon)}" data-coupon-copies="${coupon.code}"></label><button type="button" data-print-one-coupon="${coupon.code}">Print</button><button type="button" data-delete-coupon="${coupon.code}" aria-label="Delete coupon ${coupon.code}">Delete</button></article>`).join('') : '<div class="empty-coupons">Your created coupons will appear here.</div>'}
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

function renderShelfCard(aisle: AisleConfig, aisleNumber: number) {
  const groups = chunkItems(aisle.items, shelfCapacity)
  return `<section class="shelf-stage"><div class="shelf-topline"><p>Aisle ${aisleNumber}</p><h2>${escapeHtml(aisle.title)}</h2></div><div class="shelf-row">${groups.map((group, index) => {
    const items: Array<ShelfItem | null> = group.map((item) => toShelfItem(aisle, item))
    while (items.length < shelfCapacity) items.push(null)
    return `<section class="shelf-unit" aria-label="Shelf ${index + 1}"><div class="shelf-skin" style="background-image:url('/groceryshelf.svg')"></div><div class="shelf-grid">${items.map(renderShelfProduct).join('')}</div></section>`
  }).join('')}</div><div class="aisle-nav"><button class="nav-arrow" type="button" data-nav="prev" aria-label="Previous aisle"><span>‹</span></button><button class="nav-arrow" type="button" data-nav="next" aria-label="Next aisle"><span>›</span></button></div></section>`
}

function renderCart() {
  const { totalItems, totalPrice } = cartTotals()
  const totals = receiptTotals()
  const lines = [...state.cart.entries()]
  return `<aside class="cart-panel"><div class="cart-header"><h2>Shopping cart</h2><button class="ghost" type="button" data-clear-cart ${lines.length ? '' : 'disabled'}>Clear</button></div><p class="cart-summary">${totalItems} item${totalItems === 1 ? '' : 's'} in cart</p>
    <div class="cart-lines">${lines.length ? lines.map(([key, item]) => `<div class="cart-line"><span class="cart-item-image" style="background-image:url('${item.image}')"></span><div class="cart-item-details"><strong>${escapeHtml(item.name)}</strong><span>${money(item.price)} each</span><span class="cart-line-total">${item.quantity} x ${money(item.price)} = ${money(item.price * item.quantity)}</span></div><div class="cart-controls"><button class="ghost" type="button" data-remove-item="${escapeHtml(key)}" aria-label="Remove one ${escapeHtml(item.name)}">-</button><span aria-label="Quantity">${item.quantity}</span><button class="ghost" type="button" data-add-item-to-cart="${escapeHtml(key)}" aria-label="Add one more ${escapeHtml(item.name)}">+</button></div></div>`).join('') : '<div class="empty-cart">Click products on any shelf. Your cart stays here while you switch aisles.</div>'}</div>
    <div class="cart-total"><span>Total bill</span><strong>${money(totalPrice)}</strong></div>
    <section class="coupon-checkout"><h3>Have a class coupon?</h3><p>Scan up to 5 coupon barcodes or enter their printed codes.</p><div class="coupon-entry"><input type="text" data-coupon-code placeholder="FM-XXXXXX" aria-label="Coupon code"><button type="button" data-apply-coupon ${state.appliedCoupons.length >= 5 ? 'disabled' : ''}>Apply</button></div><button class="scan-button" type="button" data-scan-coupon ${state.appliedCoupons.length >= 5 ? 'disabled' : ''}>Scan with camera</button><p class="coupon-count">${state.appliedCoupons.length} of 5 coupons applied</p>${state.message ? `<p class="checkout-message">${escapeHtml(state.message)}</p>` : ''}</section>
    <section class="receipt"><div class="receipt-heading"><div><p class="receipt-kicker">Grocery receipt</p><h3>Your estimated checkout</h3></div><button class="copy-receipt" type="button" data-copy-receipt>Copy</button></div><div class="receipt-rule"></div><div class="receipt-row"><span>Shopping list total</span><strong>${money(totalPrice)}</strong></div>${totals.couponDiscounts.length ? `<div class="receipt-coupon-lines">${totals.couponDiscounts.map(({ coupon, amount }) => `<div class="receipt-row coupon-saving"><span>${escapeHtml(formatCouponItem(coupon))} · ${couponDiscountLabel(coupon)}</span><strong>-${money(amount)}</strong></div>`).join('')}</div>` : ''}<div class="receipt-row receipt-subtotal"><span>Subtotal after savings</span><strong>${money(totals.discountedPrice)}</strong></div><label class="receipt-input-row"><span>Sales tax</span><span class="percent-input"><input type="number" min="0" step="0.01" value="${state.salesTax || ''}" placeholder="0" data-sales-tax><span>%</span></span></label><div class="receipt-row"><span>Tax amount</span><strong>${money(totals.salesTaxAmount)}</strong></div><div class="receipt-rule"></div><div class="receipt-final"><span>Final total</span><strong>${money(totals.finalTotal)}</strong></div>${totals.couponDiscounts.length ? `<div class="receipt-rule"></div><div class="receipt-row coupon-total"><span>Total Amount Saved Today</span><strong>${money(totals.discount)}</strong></div>` : ''}</section>
  </aside>`
}

function renderStore() {
  const aisle = aisles[state.activeAisleIndex]
  const refreshButton = state.role === 'student' && state.studentClassCode
    ? `<button type="button" data-refresh-class ${state.refreshingClass ? 'disabled' : ''}>Refresh class prices</button>`
    : ''
  return `<main class="storefront-shell">${renderAppHeader(state.role === 'teacher' ? 'Student preview' : 'Class grocery challenge')}<section class="storefront"><div class="shelf-column">${state.role === 'student' && state.studentClassCode ? `<p class="class-status">Joined class: <strong>${escapeHtml(state.studentClassCode)}</strong> ${refreshButton}</p>` : ''}${renderShelfCard(aisle, state.activeAisleIndex + 1)}</div>${renderCart()}</section></main>`
}

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
  const product = coupon.itemId === 'all' ? null : productById[coupon.itemId]
  const productImage = product
    ? `<img class="coupon-product-image" src="${product.image}" alt="${escapeHtml(product.name)}">`
    : '<span class="coupon-cart-icon" aria-hidden="true">$</span>'

  return `<article class="print-coupon"><div class="coupon-burst">${escapeHtml(couponDiscountType(coupon) === 'dollars' ? money(couponDiscountValue(coupon)) : `${couponDiscountValue(coupon)}%`)}<small>OFF</small></div>${productImage}<div class="print-coupon-copy"><p>FRESH MART CLASS COUPON</p><h2>${escapeHtml(couponDiscountLabel(coupon))} ${escapeHtml(formatCouponItem(coupon))}</h2><span>Valid ${escapeHtml(formatDate(coupon.startsAt))}<br>through ${escapeHtml(formatDate(coupon.endsAt))}</span>${barcodeSvg(coupon.code)}<strong>${escapeHtml(coupon.code)}</strong></div></article>`
}

function renderPrintSheet(coupons: Coupon[]) {
  const printable = coupons.flatMap((coupon) => Array.from({ length: couponCopies(coupon) }, () => coupon))
  const pages = chunkItems(printable, 10)
  app.innerHTML = `<main class="print-sheet"><div class="print-toolbar"><button type="button" data-close-print>Back</button><p>${printable.length} coupons, 10 per page. Choose <strong>Save to PDF</strong> in the print window.</p><button class="primary-button" type="button" data-browser-print>Print / Save PDF</button></div>${pages.map((page) => `<section class="coupon-sheet">${page.map(renderPrintableCoupon).join('')}</section>`).join('')}</main>`
  app.querySelector('[data-browser-print]')?.addEventListener('click', () => window.print())
  app.querySelector('[data-close-print]')?.addEventListener('click', () => render())
}

function applyCouponCode(rawCode: string) {
  const code = rawCode.trim().toUpperCase()
  const coupon = state.settings.coupons.find((item) => item.code === code)
  if (!coupon) {
    state.message = 'That coupon code was not found in this class.'
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

function attachSharedHeaderEvents() {
  app.querySelector('[data-home]')?.addEventListener('click', () => { state.screen = state.role === 'teacher' ? 'teacher' : 'student-dashboard'; render() })
  app.querySelector('[data-switch-role]')?.addEventListener('click', () => { state.role = null; state.screen = 'welcome'; state.message = ''; setTeacherUnlocked(false); render() })
  app.querySelector('[data-teacher-prices]')?.addEventListener('click', () => { state.screen = 'teacher'; render() })
  app.querySelector('[data-teacher-coupons]')?.addEventListener('click', () => { state.screen = 'coupons'; render() })
  app.querySelector('[data-preview-store]')?.addEventListener('click', () => { state.screen = 'store'; render() })
}

function attachTeacherEvents() {
  app.querySelectorAll<HTMLElement>('[data-pick-aisle]').forEach((button) => button.addEventListener('click', () => { state.activeAisleIndex = Number(button.dataset.pickAisle); render() }))
  app.querySelectorAll<HTMLInputElement>('[data-price-id]').forEach((input) => input.addEventListener('change', () => {
    const value = Number(input.value)
    if (Number.isFinite(value) && value >= 0) {
      state.settings.prices[input.dataset.priceId ?? ''] = Math.round(value * 100) / 100
      localStorage.setItem(settingsStorageKey, JSON.stringify(state.settings))
    }
    render()
  }))
  app.querySelector('[data-save-prices]')?.addEventListener('click', async () => {
    if (await publishClassSettings()) state.message = 'Price changes saved. Students who join this class code will see the updated prices.'
    else state.message = 'Price changes were saved here, but the shared class server was unavailable. Try saving again.'
    render()
  })
  app.querySelector('[data-save-class-code]')?.addEventListener('click', async () => {
    const entered = app.querySelector<HTMLInputElement>('[data-teacher-class-code]')?.value ?? ''
    const code = normalizeClassCode(entered)
    if (code.length < 3) { state.message = 'Use at least 3 letters or numbers for the class code.'; render(); return }
    saveClassCode(code)
    if (await publishClassSettings()) state.message = `Class code ${code} saved. Students can join now.`
    else state.message = 'The class code was saved here, but the shared class server was unavailable. Try again.'
    render()
  })
  app.querySelector('[data-save-teacher-code]')?.addEventListener('click', async () => {
    const entered = app.querySelector<HTMLInputElement>('[data-teacher-access-code-input]')?.value ?? ''
    const code = normalizeClassCode(entered)
    if (code.length < 3) {
      state.message = 'Use at least 3 letters or numbers for the teacher access code.'
      render()
      return
    }
    saveTeacherCode(code)
    state.message = (await publishTeacherCode())
      ? `Teacher access code updated to ${code}.`
      : `Teacher access code updated to ${code}, but the shared server was unavailable.`
    render()
  })
}

function attachWelcomeEvents() {
  app.querySelector<HTMLInputElement>('[data-class-code-input]')?.addEventListener('input', (event) => {
    state.classCodeInput = event.currentTarget.value
  })

  app.querySelector('[data-join-class]')?.addEventListener('click', async () => {
    const settings = await fetchClassSettings(state.classCodeInput)

    if (!settings) {
      state.message = 'That class code was not found. Check the code with your teacher.'
      render()
      return
    }

    state.settings = settings
    try {
      localStorage.setItem(settingsStorageKey, JSON.stringify(settings))
    } catch {
      // The joined class remains active for this page.
    }
    saveStudentClassCode(state.classCodeInput)
    state.role = 'student'
    state.screen = 'student-dashboard'
    state.message = 'Class joined.'
    render()
  })

  app.querySelector('[data-teacher-access]')?.addEventListener('click', () => {
    history.pushState({}, '', '/teacher')
    state.message = ''
    render()
  })
}

function attachTeacherLoginEvents() {
  app.querySelector<HTMLFormElement>('[data-teacher-login]')?.addEventListener('submit', (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const entered = String(data.get('teacherCode') ?? '').trim().toUpperCase()

    if (entered !== state.teacherCode) {
      state.message = 'That teacher access code did not match.'
      render()
      return
    }

    setTeacherUnlocked(true)
    state.role = 'teacher'
    state.screen = 'teacher'
    state.message = ''
    render()
  })

  app.querySelector('[data-back-home]')?.addEventListener('click', () => {
    history.pushState({}, '', '/')
    state.screen = 'welcome'
    state.message = ''
    render()
  })
}

function attachCouponEvents() {
  const discountType = app.querySelector<HTMLSelectElement>('[data-discount-type]')
  const discountAmount = app.querySelector<HTMLInputElement>('[data-discount-amount]')
  const discountAmountLabel = app.querySelector<HTMLElement>('[data-discount-amount-label]')
  const discountSuffix = app.querySelector<HTMLElement>('[data-discount-suffix]')

  function updateDiscountField() {
    const isDollarDiscount = discountType?.value === 'dollars'
    if (discountAmountLabel) discountAmountLabel.firstChild!.textContent = isDollarDiscount ? 'Dollar amount off' : 'Percent off'
    if (discountAmount) {
      discountAmount.min = isDollarDiscount ? '0.01' : '1'
      discountAmount.max = isDollarDiscount ? '999' : '100'
      discountAmount.step = isDollarDiscount ? '0.01' : '1'
      discountAmount.value = isDollarDiscount ? '1.00' : '10'
    }
    if (discountSuffix) discountSuffix.textContent = isDollarDiscount ? '$' : '%'
  }

  discountType?.addEventListener('change', updateDiscountField)
  app.querySelector<HTMLFormElement>('[data-coupon-form]')?.addEventListener('submit', (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const startsAt = String(data.get('startsAt') ?? '')
    const endsAt = String(data.get('endsAt') ?? '')
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) { state.message = 'The ending time must be after the starting time.'; render(); return }
    const discountType = String(data.get('discountType')) === 'dollars' ? 'dollars' : 'percent'
    const discountAmount = Number(data.get('discountAmount'))
    if (!Number.isFinite(discountAmount) || discountAmount <= 0) { state.message = 'Enter a discount greater than zero.'; render(); return }
    const coupon = newCoupon(discountType, discountAmount, String(data.get('itemId')), startsAt, endsAt, Number(data.get('copies')))
    state.settings.coupons.push(coupon); saveSettings(); state.message = `${coupon.code} created.`
    renderPrintSheet([coupon])
  })
  app.querySelector('[data-random-coupons]')?.addEventListener('click', () => {
    const count = Math.min(10, Math.max(1, Number(app.querySelector<HTMLInputElement>('[data-random-coupon-count]')?.value) || 1))
    const copies = Math.min(100, Math.max(1, Number(app.querySelector<HTMLInputElement>('[data-random-coupon-copies]')?.value) || 10))
    const percents = [5, 10, 15, 20, 25, 30, 40, 50]
    const itemIds = ['all', ...allAisleItems.map((item) => item.id)]
    const coupons = Array.from({ length: count }, () => newCoupon(
      'percent',
      percents[Math.floor(Math.random() * percents.length)],
      itemIds[Math.floor(Math.random() * itemIds.length)],
      '',
      '',
      copies,
    ))
    state.settings.coupons.push(...coupons)
    saveSettings()
    state.message = `${count} random coupon design${count === 1 ? '' : 's'} created with ${copies} copies each.`
    render()
  })
  app.querySelectorAll<HTMLInputElement>('[data-coupon-copies]').forEach((input) => input.addEventListener('change', () => {
    const coupon = state.settings.coupons.find((item) => item.code === input.dataset.couponCopies)
    if (!coupon) return
    coupon.copies = Math.min(100, Math.max(1, Number(input.value) || 1))
    saveSettings()
    render()
  }))
  app.querySelectorAll<HTMLElement>('[data-print-one-coupon]').forEach((button) => button.addEventListener('click', () => {
    const coupon = state.settings.coupons.find((item) => item.code === button.dataset.printOneCoupon)
    if (coupon) renderPrintSheet([coupon])
  }))
  app.querySelectorAll<HTMLElement>('[data-delete-coupon]').forEach((button) => button.addEventListener('click', () => { state.settings.coupons = state.settings.coupons.filter((coupon) => coupon.code !== button.dataset.deleteCoupon); saveSettings(); render() }))
  app.querySelector('[data-print-coupons]')?.addEventListener('click', () => renderPrintSheet(state.settings.coupons))
}

function attachStoreEvents() {
  app.querySelectorAll<HTMLElement>('[data-add-item]').forEach((button) => button.addEventListener('click', () => addToCart(JSON.parse(decodeURIComponent(button.dataset.addItem ?? '{}')) as ShelfItem)))
  app.querySelectorAll<HTMLElement>('[data-add-item-to-cart]').forEach((button) => button.addEventListener('click', () => increaseCartItem(button.dataset.addItemToCart ?? '')))
  app.querySelectorAll<HTMLElement>('[data-remove-item]').forEach((button) => button.addEventListener('click', () => removeFromCart(button.dataset.removeItem ?? '')))
  app.querySelector('[data-clear-cart]')?.addEventListener('click', () => { state.cart.clear(); state.appliedCoupons = []; saveCart(); render() })
  app.querySelector('[data-refresh-class]')?.addEventListener('click', () => void refreshStudentClass())
  app.querySelectorAll<HTMLElement>('[data-nav]').forEach((button) => button.addEventListener('click', () => { state.activeAisleIndex = (state.activeAisleIndex + (button.dataset.nav === 'prev' ? -1 : 1) + aisles.length) % aisles.length; render() }))
  app.querySelector<HTMLInputElement>('[data-sales-tax]')?.addEventListener('change', (event) => { state.salesTax = Math.max(0, Number((event.target as HTMLInputElement).value) || 0); render() })
  app.querySelector('[data-apply-coupon]')?.addEventListener('click', () => applyCouponCode(app.querySelector<HTMLInputElement>('[data-coupon-code]')?.value ?? ''))
  app.querySelector<HTMLInputElement>('[data-coupon-code]')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') applyCouponCode(event.currentTarget.value) })
  app.querySelector('[data-scan-coupon]')?.addEventListener('click', () => void scanCoupon())
  app.querySelector('[data-copy-receipt]')?.addEventListener('click', async () => {
    const totals = receiptTotals()
    const text = `FRESH MART RECEIPT\nShopping total: ${money(totals.totalPrice)}\n${totals.couponDiscounts.map(({ coupon, amount }) => `${formatCouponItem(coupon)} (${couponDiscountLabel(coupon)}): -${money(amount)}`).join('\n')}\nClass coupon savings: -${money(totals.discount)}\nSubtotal after savings: ${money(totals.discountedPrice)}\nTax: ${money(totals.salesTaxAmount)}\nFINAL TOTAL: ${money(totals.finalTotal)}`
    try { await navigator.clipboard.writeText(text); state.message = 'Receipt copied.' } catch { window.prompt('Copy your receipt:', text) }
    render()
  })
}

function render() {
  if (window.location.pathname.replace(/\/+$/, '') === '/teacher' && !state.teacherUnlocked) {
    app.innerHTML = renderTeacherLogin()
    attachTeacherLoginEvents()
    return
  }

  if (state.screen === 'welcome') {
    app.innerHTML = renderWelcomePage()
    attachWelcomeEvents()
    return
  }
  if (state.screen === 'student-dashboard') {
    app.innerHTML = renderStudentDashboard()
    app.querySelector('[data-start-student-shopping]')?.addEventListener('click', () => { state.screen = 'store'; render() })
    return
  }
  if (state.screen === 'teacher' && !state.teacherUnlocked) {
    history.pushState({}, '', '/teacher')
    render()
    return
  }
  if (state.screen === 'teacher') app.innerHTML = renderTeacherDashboard()
  if (state.screen === 'coupons') app.innerHTML = renderCouponStudio()
  if (state.screen === 'store') app.innerHTML = renderStore()
  if (state.screen === 'welcome') attachWelcomeEvents()
  attachSharedHeaderEvents()
  if (state.screen === 'teacher') attachTeacherEvents()
  if (state.screen === 'coupons') attachCouponEvents()
  if (state.screen === 'store') attachStoreEvents()
  if (state.screen === 'store' && state.role === 'student' && state.studentClassCode) {
    window.setTimeout(() => void refreshStudentClass(), 10000)
  }
}

const requestedRole = new URLSearchParams(location.search).get('role')
if (requestedRole === 'student' || requestedRole === 'teacher') {
  state.role = requestedRole
  state.screen = requestedRole === 'teacher' && state.teacherUnlocked ? 'teacher' : 'student-dashboard'
}

if (!state.teacherUnlocked && state.screen === 'teacher') {
  state.screen = 'welcome'
}

render()
void loadTeacherCodeFromServer()
