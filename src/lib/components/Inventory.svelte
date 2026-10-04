<script lang="ts">
  import Icon from '$lib/components/Icon.svelte'
  import { aisles, type AisleItem } from '$lib/catalog'
  import { aisleTitle, productName, t, unitPriceText } from '$lib/i18n/index.svelte'
  import { isStoreBrand, priceEndingInNine, productById } from '$lib/products'
  import { isStocked, priceFor, setStocked, shop, sizeFor } from '$lib/shop.svelte'
  import { catalogSize, isSizeUnit, sizeUnits, type PackageSize } from '$lib/sizes'
  import { teacher } from '$lib/teacher.svelte'

  // Name brands and CG Value products are listed side by side, unless the
  // teacher hides the CG line. What is on the shelves is decided card by card,
  // or a whole aisle at a time.
  const aisle = $derived(aisles[teacher.inventoryAisleIndex])
  const visibleItems = $derived(listed(aisle.items))

  function listed(items: AisleItem[]) {
    return teacher.showStoreBrand ? items : items.filter((item) => !isStoreBrand(item.id))
  }

  /** How many of an aisle's listed products are on the shelves. */
  function stockCount(items: AisleItem[]) {
    const shown = listed(items)
    return { stocked: shown.filter((item) => isStocked(item.id)).length, total: shown.length }
  }

  const count = $derived(stockCount(aisle.items))

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

  function stockWholeAisle(stocked: boolean) {
    if (!shop.store) return
    for (const item of visibleItems) setStocked(item.id, stocked)
    teacher.message = stocked
      ? t('prices.aisleStocked', { aisle: aisleTitle(aisle.title) })
      : t('prices.aisleCleared', { aisle: aisleTitle(aisle.title) })
  }

  /** A new aisle starts at its first products, wherever the last one was scrolled to. */
  function chooseAisle(index: number) {
    teacher.inventoryAisleIndex = index
    document.querySelector('.store-main')?.scrollTo({ top: 0 })
  }

  /**
   * A click anywhere on a card, picture included, puts the product on or off
   * the shelves, unless it landed in one of the card's own fields.
   */
  function toggleFromCard(event: MouseEvent, productId: string) {
    if ((event.target as HTMLElement).closest('input, select, button, .teacher-money-input, .teacher-size-input')) return
    setStocked(productId, !isStocked(productId))
  }
</script>

<section class="teacher-workspace">
    <aside class="aisle-picker">
      <h3>{t('prices.aisleListTitle')}</h3>
      {#each aisles as item, index (item.title)}
        {@const aisleCount = stockCount(item.items)}
        <button class:active={index === teacher.inventoryAisleIndex} type="button" onclick={() => chooseAisle(index)}>
          <span>{aisleTitle(item.title)}</span>
          <span class="aisle-count" title={t('prices.aisleCount', aisleCount)}><strong>{aisleCount.stocked}</strong>/{aisleCount.total}</span>
        </button>
      {/each}

      <!-- The CG Value line can be hidden to see the name brands alone; the
           i explains what CG Value is, on hover or with a click. -->
      <div class="cg-controls">
        <button class="cg-toggle" type="button" aria-pressed={teacher.showStoreBrand} onclick={() => (teacher.showStoreBrand = !teacher.showStoreBrand)}>
          <Icon name="dollar" />{t('prices.cgTag')}
        </button>
        <span class="cg-info-wrap">
          <button class="cg-info-icon" type="button" aria-label={t('prices.cgInfoButton')} popovertarget="cg-info"><Icon name="info" /></button>
          <span class="cg-tooltip" aria-hidden="true">{t('prices.cgInfoBody')}</span>
        </span>
      </div>
    </aside>
    <section class="price-editor">
      <div class="section-heading">
        <div>
          <p class="eyebrow">{t('prices.summary', { number: teacher.inventoryAisleIndex + 1, ...count })}</p>
          <h2>{aisleTitle(aisle.title)}</h2>
        </div>
        <div class="stock-bulk-actions">
          <button type="button" onclick={() => stockWholeAisle(true)}>{t('prices.stockAll')}</button>
          <button type="button" onclick={() => stockWholeAisle(false)}>{t('prices.stockNone')}</button>
        </div>
      </div>
      <div id="cg-info" class="cg-info" popover>
        <h3>{t('prices.cgInfoTitle')}</h3>
        <p>{t('prices.cgInfoBody')}</p>
        <button class="primary-button" type="button" popovertarget="cg-info" popovertargetaction="hide">{t('prices.cgInfoClose')}</button>
      </div>
      <div class="price-grid">
        {#each visibleItems as item (item.id)}
          {@const product = productById[item.id]}
          {@const name = productName(item.id)}
          {@const size = sizeFor(item.id)}
          <!-- The checkbox is the keyboard's way to do what a click on the card does. -->
          <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
          <div class="price-edit-card" class:price-edit-card-hidden={!isStocked(item.id)} onclick={(event) => toggleFromCard(event, item.id)}>
            <input
              class="stock-checkbox"
              type="checkbox"
              checked={isStocked(item.id)}
              aria-label={t('prices.stockLabel', { name })}
              onchange={(event) => setStocked(item.id, event.currentTarget.checked)}
            />
            {#if isStoreBrand(item.id)}
              <button class="brand-tag" type="button" popovertarget="cg-info"><Icon name="dollar" />{t('prices.cgTag')}</button>
            {/if}
            <img src={product.image} alt="" />
            <span>{name}</span>
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
          </div>
        {/each}
      </div>
    </section>
  </section>
