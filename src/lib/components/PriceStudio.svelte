<script lang="ts">
  import type { Snippet } from 'svelte'
  import { aisles } from '$lib/catalog'
  import { errorMessage, loadStoreItems, saveStoreItem, stockBrands, type BrandMode } from '$lib/pocketbase'
  import { isStoreBrand, productById } from '$lib/products'
  import { copyJoinLink, joinLinkFor } from '$lib/sharing'
  import { everyProductWithItsPrice, isStocked, priceFor, shop } from '$lib/shop.svelte'
  import { teacher, withBusy } from '$lib/teacher.svelte'

  let { header }: { header: Snippet } = $props()

  const aisle = $derived(aisles[teacher.priceAisleIndex])
  const stockedInAisle = $derived(aisle.items.filter((item) => isStocked(item.id)).length)

  /** Saves through the store's id, which is always set on this screen. */
  function save(productId: string, changes: { price: number; hidden?: boolean }) {
    const storeId = shop.store?.id
    if (!storeId) return Promise.resolve()
    return saveStoreItem(storeId, shop.items, productId, changes)
      .then(() => { teacher.message = 'Saved.' })
      .catch((error) => { teacher.message = errorMessage(error, 'That change could not be saved.') })
  }

  function changePrice(productId: string, value: string) {
    const price = Number(value)
    if (!Number.isFinite(price) || price < 0) return
    void save(productId, { price: Math.round(price * 100) / 100 })
  }

  function changeStock(productId: string, stocked: boolean) {
    const item = aisle.items.find((entry) => entry.id === productId)
    void save(productId, { price: item ? priceFor(item) : 0, hidden: !stocked })
  }

  function stockWholeAisle(hidden: boolean) {
    const storeId = shop.store?.id
    if (!storeId) return
    void withBusy(async () => {
      try {
        await Promise.all(aisle.items.map((item) => saveStoreItem(storeId, shop.items, item.id, { price: priceFor(item), hidden })))
        teacher.message = hidden ? `${aisle.title} taken off the shelves.` : `${aisle.title} fully stocked.`
      } catch (error) {
        teacher.message = errorMessage(error, 'Those changes could not be saved.')
      }
    })
  }

  const brandModeLabels: Record<BrandMode, string> = {
    name: 'Name brands on the shelves. The CG Value line is put away.',
    store: 'CG Value store brands on the shelves. The name brands are put away.',
    both: 'Both brands on the shelves, side by side.',
  }

  /** Stocks one brand line across the whole store, every aisle at once. */
  function stockWholeStore(mode: BrandMode) {
    const store = shop.store
    if (!store) return
    const items = everyProductWithItsPrice(shop.items)
    void withBusy(async () => {
      try {
        await stockBrands(store.id, mode, items)
        shop.items = await loadStoreItems(store.id)
        // The endpoint records the mode on the store; keep the open copy level with it.
        shop.store = { ...store, brandMode: mode }
        teacher.message = brandModeLabels[mode]
      } catch (error) {
        teacher.message = errorMessage(error, 'Those changes could not be saved.')
      }
    })
  }

  async function copyJoinCode() {
    const code = shop.store?.joinCode ?? ''
    try {
      await navigator.clipboard.writeText(code)
      teacher.message = `Join code ${code} copied.`
    } catch {
      window.prompt('Copy the join code:', code)
    }
  }

  async function shareJoinLink() {
    if (!shop.store) return
    teacher.message = (await copyJoinLink(shop.store))
      ? 'Join link copied. Paste it wherever your class will see it.'
      : `Join link: ${joinLinkFor(shop.store)}`
  }
</script>

<main class="teacher-shell">
  {@render header()}
  <section class="teacher-hero">
    <div>
      <p class="eyebrow">{shop.store?.name ?? ''}</p>
      <h2>Choose what this store sells</h2>
      <p class="hero-lede">Uncheck an item to take it off the shelves for this store only. Prices save as you type.</p>
      <div class="brand-bulk-actions">
        <span>Stock the whole store with</span>
        <button type="button" onclick={() => stockWholeStore('name')}>Name brands</button>
        <button type="button" onclick={() => stockWholeStore('store')}>CG Value store brands</button>
        <button type="button" onclick={() => stockWholeStore('both')}>Both brands</button>
      </div>
    </div>
    <div class="teacher-access-panel">
      <p>Students join with <strong>{shop.store?.joinCode ?? ''}</strong></p>
      <div class="class-code-actions">
        <button class="teacher-secondary-button" type="button" onclick={copyJoinCode}>Copy join code</button>
        <button class="teacher-secondary-button" type="button" onclick={shareJoinLink}>Copy join link</button>
      </div>
    </div>
  </section>
  {#if teacher.message}<p class="status-message">{teacher.message}</p>{/if}
  <section class="teacher-workspace">
    <aside class="aisle-picker">
      <h3>Food class</h3>
      {#each aisles as item, index (item.title)}
        <button class:active={index === teacher.priceAisleIndex} type="button" onclick={() => (teacher.priceAisleIndex = index)}>
          {item.title}
        </button>
      {/each}
    </aside>
    <section class="price-editor">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Aisle {teacher.priceAisleIndex + 1} &middot; {stockedInAisle} of {aisle.items.length} stocked</p>
          <h2>{aisle.title}</h2>
        </div>
        <div class="stock-bulk-actions">
          <button type="button" onclick={() => stockWholeAisle(false)}>Stock all</button>
          <button type="button" onclick={() => stockWholeAisle(true)}>Stock none</button>
        </div>
      </div>
      <p class="helper-text">Every product comes in two brands: the name brand, and the cheaper CG Value store brand beside it. Edit any price, or uncheck an item to remove it from this store's shelves.</p>
      <div class="price-grid">
        {#each aisle.items as item (item.id)}
          {@const product = productById[item.id]}
          <label class="price-edit-card" class:price-edit-card-hidden={!isStocked(item.id)}>
            <img src={product.image} alt="" />
            <span>
              {product.name}
              {#if isStoreBrand(item.id)}<span class="brand-tag">CG Value</span>{/if}
            </span>
            <span class="teacher-money-input">
              $<input
                type="number"
                min="0"
                max="999"
                step="0.01"
                value={priceFor(item).toFixed(2)}
                aria-label="Price for {product.name}"
                onchange={(event) => changePrice(item.id, event.currentTarget.value)}
              />
            </span>
            <span class="stock-toggle">
              <input
                type="checkbox"
                checked={isStocked(item.id)}
                aria-label="Stock {product.name} in this store"
                onchange={(event) => changeStock(item.id, event.currentTarget.checked)}
              /> In this store
            </span>
          </label>
        {/each}
      </div>
    </section>
  </section>
</main>
