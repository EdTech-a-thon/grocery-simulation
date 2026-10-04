<script lang="ts">
  import type { Snippet } from 'svelte'
  import StoreHeader from '$lib/components/StoreHeader.svelte'
  import { aisles } from '$lib/catalog'
  import { aisleTitle, productName, t, unitPriceText } from '$lib/i18n/index.svelte'
  import { isStoreBrand, priceEndingInNine, productById } from '$lib/products'
  import { isStocked, priceFor, setStocked, shop, sizeFor } from '$lib/shop.svelte'
  import { catalogSize, isSizeUnit, sizeUnits, type PackageSize } from '$lib/sizes'
  import { teacher, type StorePage } from '$lib/teacher.svelte'

  let { header, onGo, onViewAsStudent }: {
    header: Snippet
    onGo: (next: StorePage) => void
    onViewAsStudent: () => void
  } = $props()

  /** Off by default: a store that sells one brand line only edits that line. */
  let showOtherBrands = $state(false)

  const aisle = $derived(aisles[teacher.priceAisleIndex])
  const brandMode = $derived(shop.store?.brandMode ?? 'name')
  const otherBrandLabel = $derived(
    brandMode === 'store' ? t('prices.otherBrandsName') : t('prices.otherBrandsStore'),
  )

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

  function changePrice(productId: string, value: string) {
    const price = Number(value)
    if (!shop.store || !Number.isFinite(price) || price < 0) return
    // A CG Value price always ends in 9 cents, so whatever a teacher types is
    // snapped to the nearest one.
    shop.store.prices[productId] = isStoreBrand(productId) ? priceEndingInNine(price) : Math.round(price * 100) / 100
  }

  /**
   * A blank or zero amount goes back to the catalog size, and so does a size
   * that matches it, so only a teacher's real changes are stored.
   */
  function changeSize(productId: string, amountText: string, unitText: string) {
    const amount = Math.round(Number(amountText) * 100) / 100
    const usual = catalogSize(productId)
    let size: PackageSize | null = null
    if (amountText.trim() && amount > 0 && isSizeUnit(unitText)) size = { amount, unit: unitText }
    if (size && usual && size.amount === usual.amount && size.unit === usual.unit) size = null
    if (shop.store) {
      if (size) shop.store.sizes[productId] = size
      else delete shop.store.sizes[productId]
    }
    return size ?? usual
  }

  /** Stocks or clears the cards the teacher can see, never the hidden brand line. */
  function stockWholeAisle(stocked: boolean) {
    if (!shop.store) return
    for (const item of visibleItems) setStocked(item.id, stocked)
    teacher.message = stocked
      ? t('prices.aisleStocked', { aisle: aisleTitle(aisle.title) })
      : t('prices.aisleCleared', { aisle: aisleTitle(aisle.title) })
  }
</script>

<main class="teacher-shell">
  {@render header()}
  <StoreHeader
    page="prices"
    title={t('prices.pageTitle')}
    lede={t('prices.pageLede')}
    {onGo}
    {onViewAsStudent}
  />
  {#if teacher.message}<p class="status-message">{teacher.message}</p>{/if}
  <section class="teacher-workspace">
    <aside class="aisle-picker">
      <h3>{t('prices.aisleListTitle')}</h3>
      {#each aisles as item, index (item.title)}
        <button class:active={index === teacher.priceAisleIndex} type="button" onclick={() => (teacher.priceAisleIndex = index)}>
          {aisleTitle(item.title)}
        </button>
      {/each}
    </aside>
    <section class="price-editor">
      <div class="section-heading">
        <div>
          <p class="eyebrow">{t('prices.summary', { number: teacher.priceAisleIndex + 1, stocked: stockedInAisle, total: visibleItems.length })}</p>
          <h2>{aisleTitle(aisle.title)}</h2>
        </div>
        <div class="stock-bulk-actions">
          {#if brandMode !== 'both'}
            <label class="brand-view-toggle">
              <input type="checkbox" bind:checked={showOtherBrands} />
              {t('prices.alsoShow', { brands: otherBrandLabel })}
            </label>
          {/if}
          <button type="button" onclick={() => stockWholeAisle(true)}>{t('prices.stockAll')}</button>
          <button type="button" onclick={() => stockWholeAisle(false)}>{t('prices.stockNone')}</button>
        </div>
      </div>
      <p class="helper-text">
        {#if brandMode === 'both' || showOtherBrands}
          {t('prices.helpBoth')}
        {:else}
          {t('prices.helpOne', {
            brands: brandMode === 'store' ? t('prices.brandStoreOnly') : t('prices.brandNameOnly'),
          })}
        {/if}
      </p>
      <p class="helper-text">{t('prices.sizeHelp')}</p>
      <div class="price-grid">
        {#each visibleItems as item (item.id)}
          {@const product = productById[item.id]}
          {@const name = productName(item.id)}
          {@const size = sizeFor(item.id)}
          <label class="price-edit-card" class:price-edit-card-hidden={!isStocked(item.id)}>
            <img src={product.image} alt="" />
            <span>
              {name}
              {#if isStoreBrand(item.id)}<span class="brand-tag">{t('prices.cgTag')}</span>{/if}
            </span>
            <span class="teacher-money-input">
              $<input
                type="number"
                min="0"
                max="999"
                step="0.01"
                value={priceFor(item).toFixed(2)}
                aria-label={t('prices.priceLabel', { name })}
                onchange={(event) => changePrice(item.id, event.currentTarget.value)}
              />
            </span>
            <span class="teacher-size-input">
              <input
                type="number"
                min="0"
                step="any"
                value={size?.amount ?? ''}
                aria-label={t('prices.sizeLabel', { name })}
                onchange={(event) => {
                  // A cleared box refills with the usual size straight away.
                  const shown = changeSize(item.id, event.currentTarget.value, size?.unit ?? 'oz')
                  event.currentTarget.value = String(shown?.amount ?? '')
                }}
              />
              <select
                value={size?.unit ?? 'oz'}
                aria-label={t('prices.sizeUnitLabel', { name })}
                onchange={(event) => changeSize(item.id, String(size?.amount ?? 1), event.currentTarget.value)}
              >
                {#each sizeUnits as unit (unit)}<option value={unit}>{unit}</option>{/each}
              </select>
            </span>
            {#if size}<span class="teacher-unit-price">{unitPriceText(priceFor(item), size)}</span>{/if}
            <span class="stock-toggle">
              <input
                type="checkbox"
                checked={isStocked(item.id)}
                aria-label={t('prices.stockLabel', { name })}
                onchange={(event) => setStocked(item.id, event.currentTarget.checked)}
              /> {t('prices.inStore')}
            </span>
          </label>
        {/each}
      </div>
    </section>
  </section>
</main>
