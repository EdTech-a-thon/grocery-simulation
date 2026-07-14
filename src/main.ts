import './style.css'
import { productById } from './products'
import dryGoodsAisle from './aisles/dry-goods.json'
import dairyAisle from './aisles/dairy.json'

type AisleConfig = {
  title: string
  items: Array<{
    id: string
    price?: number
  }>
}

type ShelfItem = {
  id: string
  name: string
  note: string
  image: string
  price: number
  aisleTitle: string
}

type CartLine = ShelfItem & {
  quantity: number
}

const aisles = [dryGoodsAisle, dairyAisle] as AisleConfig[]
const cartStorageKey = 'shopping-cart'

const state = {
  activeAisleIndex: 0,
  cart: loadCart(),
}

const shelfCapacity = 9

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('App root not found')
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function cartKey(item: ShelfItem) {
  return `${item.id}:${item.price.toFixed(2)}:${item.aisleTitle}`
}

function loadCart() {
  if (typeof window === 'undefined') {
    return new Map<string, CartLine>()
  }

  try {
    const raw = window.localStorage.getItem(cartStorageKey)

    if (!raw) {
      return new Map<string, CartLine>()
    }

    const parsed = JSON.parse(raw) as { lines?: unknown }

    if (!parsed || !Array.isArray(parsed.lines)) {
      return new Map<string, CartLine>()
    }

    const entries: Array<[string, CartLine]> = []

    for (const entry of parsed.lines) {
      if (!Array.isArray(entry) || entry.length !== 2) {
        continue
      }

      const [key, value] = entry

      if (
        typeof key !== 'string' ||
        !value ||
        typeof value !== 'object' ||
        typeof (value as CartLine).id !== 'string' ||
        typeof (value as CartLine).name !== 'string' ||
        typeof (value as CartLine).image !== 'string' ||
        typeof (value as CartLine).price !== 'number' ||
        typeof (value as CartLine).aisleTitle !== 'string' ||
        typeof (value as CartLine).quantity !== 'number'
      ) {
        continue
      }

      entries.push([key, value as CartLine])
    }

    return new Map(entries)
  } catch {
    return new Map<string, CartLine>()
  }
}

function saveCart() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(cartStorageKey, JSON.stringify({ lines: [...state.cart.entries()] }))
  } catch {
    // Ignore storage failures in restricted browser modes.
  }
}

function toShelfItem(aisle: AisleConfig, itemId: string, priceOverride?: number) {
  const product = productById[itemId]

  if (!product) {
    return null
  }

  return {
    id: product.id,
    name: product.name,
    note: product.note,
    image: product.image,
    price: priceOverride ?? product.price,
    aisleTitle: aisle.title,
  }
}

function addToCart(item: ShelfItem) {
  const key = cartKey(item)
  const existing = state.cart.get(key)

  if (existing) {
    state.cart.set(key, {
      ...existing,
      quantity: existing.quantity + 1,
    })
  } else {
    state.cart.set(key, {
      ...item,
      quantity: 1,
    })
  }

  saveCart()
  render()
}

function removeFromCart(key: string) {
  const existing = state.cart.get(key)

  if (!existing) {
    return
  }

  if (existing.quantity > 1) {
    state.cart.set(key, {
      ...existing,
      quantity: existing.quantity - 1,
    })
  } else {
    state.cart.delete(key)
  }

  saveCart()
  render()
}

function clearCart() {
  state.cart.clear()
  saveCart()
  render()
}

function cartTotals() {
  const items = [...state.cart.values()]
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return { totalItems, totalPrice }
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

function renderShelfProduct(item: ShelfItem | null) {
  if (!item) {
    return '<div class="shelf-slot shelf-slot-empty" aria-hidden="true"></div>'
  }

  return `
    <button
      class="shelf-product"
      type="button"
      data-add-item="${encodeURIComponent(JSON.stringify(item))}"
      aria-label="Add ${item.name} for ${money(item.price)}"
      title="${item.name}"
    >
      <span class="shelf-product-image" style="background-image: url('${item.image}')"></span>
      <span class="price-tag">${money(item.price)}</span>
    </button>
  `
}

function renderShelfUnit(aisle: AisleConfig, items: Array<AisleConfig['items'][number]>, shelfIndex: number) {
  const shelfItems = items.map((item) => {
    const shelfItem = toShelfItem(aisle, item.id, item.price)

    if (!shelfItem) {
      console.warn(`Unknown product id in aisle config: ${item.id}`)
      return null
    }

    return shelfItem
  })

  while (shelfItems.length < shelfCapacity) {
    shelfItems.push(null)
  }

  return `
    <section class="shelf-unit" aria-label="Shelf ${shelfIndex + 1}">
      <div class="shelf-skin" style="background-image: url('/groceryshelf.svg')"></div>
      <div class="shelf-grid">
        ${shelfItems.map((item) => renderShelfProduct(item)).join('')}
      </div>
    </section>
  `
}

function renderShelfCard(aisle: AisleConfig) {
  const shelfGroups = chunkItems(aisle.items, shelfCapacity)

  return `
    <section class="shelf-stage">
      <div class="shelf-topline">
        <h2>${aisle.title}</h2>
      </div>
      <div class="shelf-row">
        ${shelfGroups.map((group, index) => renderShelfUnit(aisle, group, index)).join('')}
      </div>
      <div class="aisle-nav" aria-label="Aisle navigation">
        <button class="nav-arrow nav-left" type="button" data-nav="prev" aria-label="Previous shelf">
          <span>‹</span>
        </button>
        <button class="nav-arrow nav-right" type="button" data-nav="next" aria-label="Next shelf">
          <span>›</span>
        </button>
      </div>
    </section>
  `
}

function renderCart() {
  const { totalItems, totalPrice } = cartTotals()
  const lines = [...state.cart.entries()]

  return `
    <aside class="cart-panel">
      <div class="cart-header">
        <div>
          <h2>Shopping cart</h2>
        </div>
        <button class="ghost" type="button" data-clear-cart ${lines.length === 0 ? 'disabled' : ''}>Clear</button>
      </div>
      <p class="cart-summary">${totalItems} item${totalItems === 1 ? '' : 's'} in cart</p>
      <div class="cart-lines">
        ${
          lines.length === 0
            ? '<div class="empty-cart">Click products on any shelf. Your cart stays here while you switch aisles.</div>'
            : lines
                .map(
                  ([key, item]) => `
                    <div class="cart-line">
                      <span class="cart-item-image" style="background-image: url('${item.image}')"></span>
                      <div class="cart-item-details">
                        <strong>${item.name}</strong>
                        <span>${money(item.price)}</span>
                      </div>
                      <div class="cart-controls">
                        <button class="ghost" type="button" data-remove-item="${key}">-</button>
                        <span>${item.quantity}</span>
                      </div>
                    </div>
                  `,
                )
                .join('')
        }
      </div>
      <div class="cart-total">
        <span>Total bill</span>
        <strong>${money(totalPrice)}</strong>
      </div>
    </aside>
  `
}

function render() {
  const activeAisle = aisles[state.activeAisleIndex]

  app.innerHTML = `
    <main class="storefront-shell">
      <section class="storefront">
        <div class="shelf-column">
          ${renderShelfCard(activeAisle)}
        </div>
        ${renderCart()}
      </section>
    </main>
  `

  app.querySelectorAll<HTMLElement>('[data-add-item]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = JSON.parse(decodeURIComponent(button.dataset.addItem ?? '{}')) as ShelfItem
      addToCart(item)
    })
  })

  app.querySelectorAll<HTMLElement>('[data-remove-item]').forEach((button) => {
    button.addEventListener('click', () => {
      removeFromCart(button.dataset.removeItem ?? '')
    })
  })

  app.querySelector<HTMLElement>('[data-clear-cart]')?.addEventListener('click', clearCart)

  app.querySelectorAll<HTMLElement>('[data-nav]').forEach((button) => {
    button.addEventListener('click', () => {
      const direction = button.dataset.nav

      if (direction === 'prev') {
        state.activeAisleIndex = (state.activeAisleIndex - 1 + aisles.length) % aisles.length
      }

      if (direction === 'next') {
        state.activeAisleIndex = (state.activeAisleIndex + 1) % aisles.length
      }

      render()
    })
  })
}

render()
