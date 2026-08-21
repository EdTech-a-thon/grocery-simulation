<script lang="ts">
  import type { Snippet } from 'svelte'
  import StoreHeader from '$lib/components/StoreHeader.svelte'
  import { aisles } from '$lib/catalog'
  import { errorMessage, saveStoreItem } from '$lib/pocketbase'
  import { isStoreBrand, priceEndingInNine, productById } from '$lib/products'
  import { isStocked, priceFor, shop } from '$lib/shop.svelte'
  import { teacher, withBusy, type StorePage } from '$lib/teacher.svelte'

  let { header, onGo, onViewAsStudent }: {
    header: Snippet
    onGo: (next: StorePage) => void
    onViewAsStudent: () => void
  } = $props()

  /** Off by default: a store that sells one brand line only edits that line. */
  let showOtherBrands = $state(false)

  const aisle = $derived(aisles[teacher.priceAisleIndex])
  const brandMode = $derived(shop.store?.brandMode ?? 'name')
  const otherBrandLabel = $derived(brandMode === 'store' ? 'the name brands' : 'the CG Value store brands')

  /**
   * A store that sells one brand line has no use for the other line's cards, so
   * they stay out of the grid until the teacher asks for them. Anything already
   * on the shelves is always shown, whichever line it belongs to.
   */
  function inThisStoresBrandLine(productId: string) {
    if (showOtherBrands || brandMode === 'both') return true
    return isStoreBrand(productId) === (brandMode === 'store') || isStocked(productId)
  }

  const visibleItems = $derived(aisle.items.filter((item) => inThisStoresBrandLine(item.id)))
  const stockedInAisle = $derived(visibleItems.filter((item) => isStocked(item.id)).length)

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
    // A CG Value price always ends in 9 cents, so whatever a teacher types is
    // snapped to the nearest one before it is saved.
    void save(productId, {
      price: isStoreBrand(productId) ? priceEndingInNine(price) : Math.round(price * 100) / 100,
    })
  }

  function changeStock(productId: string, stocked: boolean) {
    const item = aisle.items.find((entry) => entry.id === productId)
    void save(productId, { price: item ? priceFor(item) : 0, hidden: !stocked })
  }

  /** Stocks or clears the cards the teacher can see, never the hidden brand line. */
  function stockWholeAisle(hidden: boolean) {
    const storeId = shop.store?.id
    if (!storeId) return
    const items = visibleItems
    void withBusy(async () => {
      try {
        await Promise.all(items.map((item) => saveStoreItem(storeId, shop.items, item.id, { price: priceFor(item), hidden })))
        teacher.message = hidden ? `${aisle.title} taken off the shelves.` : `${aisle.title} fully stocked.`
      } catch (error) {
        teacher.message = errorMessage(error, 'Those changes could not be saved.')
      }
    })
  }
</script>

<main class="teacher-shell">
  {@render header()}
  <StoreHeader
    page="prices"
    title="Choose what this store sells"
    lede="Uncheck an item to take it off the shelves for this store only. Prices save as you type."
    {onGo}
    {onViewAsStudent}
  />
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
          <p class="eyebrow">Aisle {teacher.priceAisleIndex + 1} &middot; {stockedInAisle} of {visibleItems.length} stocked</p>
          <h2>{aisle.title}</h2>
        </div>
        <div class="stock-bulk-actions">
          {#if brandMode !== 'both'}
            <label class="brand-view-toggle">
              <input type="checkbox" bind:checked={showOtherBrands} />
              Also show {otherBrandLabel}
            </label>
          {/if}
          <button type="button" onclick={() => stockWholeAisle(false)}>Stock all</button>
          <button type="button" onclick={() => stockWholeAisle(true)}>Stock none</button>
        </div>
      </div>
      <p class="helper-text">
        {#if brandMode === 'both' || showOtherBrands}
          Every product comes in two brands: the name brand, and the cheaper CG Value store brand beside it. Edit any price, or uncheck an item to remove it from this store's shelves.
        {:else}
          This store sells {brandMode === 'store' ? 'the CG Value store brand' : 'the name brands'} only, so that is what this aisle shows. Edit any price, or uncheck an item to remove it from this store's shelves.
        {/if}
      </p>
      <div class="price-grid">
        {#each visibleItems as item (item.id)}
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
