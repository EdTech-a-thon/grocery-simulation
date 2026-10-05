<script lang="ts">
  import Icon from '$lib/components/Icon.svelte'
  import { aisleImage, aisles, type AisleItem } from '$lib/catalog'
  import { aisleTitle, productName, t, unitPriceText } from '$lib/i18n/index.svelte'
  import { currencySymbol, decimalsOf, maxPrice } from '$lib/currency'
  import { isStoreBrand, productById } from '$lib/products'
  import { aisleNameFor, isStocked, priceFor, setStocked, shop, sizeFor, snapPrice, usualSizeFor } from '$lib/shop.svelte'
  import { isSizeUnit, unitsFor, type PackageSize } from '$lib/sizes'
  import { maxAisleNameLength, priceStepOf } from '$lib/store'
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
  const units = $derived(unitsFor(shop.store?.measure ?? 'us'))
  const currency = $derived(shop.store?.currency ?? 'USD')
  const priceStep = $derived(shop.store ? priceStepOf(shop.store) : 0.01)

  function changePrice(productId: string, value: string) {
    const price = Number(value)
    if (!shop.store || !Number.isFinite(price) || price < 0) return
    // Whatever a teacher types is snapped the way the store prices: a CG Value
    // price to one ending in 9, or every price to the round number once rounded.
    shop.store.prices[productId] = snapPrice(productId, price)
  }

  /**
   * A blank or zero amount goes back to the catalog size, and so does a size
   * that matches it as the shelf shows it, so only a teacher's real changes
   * are stored.
   */
  function changeSize(productId: string, amountText: string, unitText: string) {
    const amount = Math.round(Number(amountText) * 100) / 100
    const usual = usualSizeFor(productId)
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
  }

  /** A new aisle starts at its first products, wherever the last one was scrolled to. */
  function chooseAisle(index: number) {
    renaming = false
    teacher.inventoryAisleIndex = index
    document.querySelector('.store-main')?.scrollTo({ top: 0 })
  }

  /** Whether the aisle's name in the heading is open for typing. */
  let renaming = $state(false)

  /**
   * Gives the aisle the teacher's name for it. A blank name, or the catalog's
   * own, puts the catalog name back, so only real renames are stored.
   */
  function renameAisle(value: string) {
    renaming = false
    if (!shop.store) return
    const name = value.trim().slice(0, maxAisleNameLength)
    if (name && name !== aisleTitle(aisle.title)) shop.store.aisleNames[aisle.title] = name
    else delete shop.store.aisleNames[aisle.title]
  }

  /** The field takes the keyboard as soon as it opens, with the old name selected to type over. */
  function focusAndSelect(input: HTMLInputElement) {
    input.focus()
    input.select()
  }

  /** The product last clicked on or off, where a shift-click's run starts. */
  let anchorId: string | null = null

  /**
   * Puts a product on or off the shelves. With shift held, every product from
   * the last one clicked to this one goes the same way, as in a file list.
   */
  function toggle(productId: string, shiftKey: boolean) {
    const stocked = !isStocked(productId)
    const from = visibleItems.findIndex((item) => item.id === anchorId)
    const to = visibleItems.findIndex((item) => item.id === productId)
    anchorId = productId
    if (!shiftKey || from === -1 || from === to) {
      setStocked(productId, stocked)
      return
    }
    const run = visibleItems.slice(Math.min(from, to), Math.max(from, to) + 1)
    for (const item of run) setStocked(item.id, stocked)
  }

  /**
   * A click anywhere on a card, picture included, does what its checkbox does,
   * unless it landed in one of the card's own fields.
   */
  function toggleFromCard(event: MouseEvent, productId: string) {
    if ((event.target as HTMLElement).closest('input, select, button, .teacher-money-input, .teacher-size-input')) return
    toggle(productId, event.shiftKey)
  }
</script>

<section class="teacher-workspace">
    <aside class="aisle-picker">
      <h3>{t('prices.aisleListTitle')}</h3>
      {#each aisles as item, index (item.title)}
        {@const aisleCount = stockCount(item.items)}
        <button class:active={index === teacher.inventoryAisleIndex} type="button" onclick={() => chooseAisle(index)}>
          <img class="aisle-icon" src={aisleImage(item.title)} alt="" />
          <span class="aisle-name">{aisleNameFor(item.title)}</span>
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
          <!-- Enter or leaving the field keeps the new name; Escape keeps the old one. -->
          {#if renaming}
            <input
              class="aisle-rename-input"
              type="text"
              maxlength={maxAisleNameLength}
              value={aisleNameFor(aisle.title)}
              placeholder={aisleTitle(aisle.title)}
              aria-label={t('prices.aisleNameLabel')}
              use:focusAndSelect
              onkeydown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur()
                if (event.key === 'Escape') renaming = false
              }}
              onblur={(event) => renaming && renameAisle(event.currentTarget.value)}
            />
          {:else}
            <h2 class="aisle-heading">
              {aisleNameFor(aisle.title)}
              <button class="aisle-rename-button" type="button" title={t('prices.renameAisle')} aria-label={t('prices.renameAisle')} onclick={() => (renaming = true)}>
                <Icon name="pencil" />
              </button>
            </h2>
          {/if}
        </div>
        <div class="stock-bulk-actions">
          <span class="shift-click-hint">{t('prices.shiftClickHint')}</span>
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
              onclick={(event) => toggle(item.id, event.shiftKey)}
            />
            {#if isStoreBrand(item.id)}
              <button class="brand-tag" type="button" popovertarget="cg-info"><Icon name="dollar" />{t('prices.cgTag')}</button>
            {/if}
            <img src={product.image} alt="" />
            <span>{name}</span>
            <span class="teacher-money-input">
              {currencySymbol(currency)}<input
                type="number"
                min="0"
                max={maxPrice(currency)}
                step={priceStep}
                value={priceFor(item).toFixed(decimalsOf(currency))}
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
                  const shown = changeSize(item.id, event.currentTarget.value, size?.unit ?? units[0])
                  event.currentTarget.value = String(shown?.amount ?? '')
                }}
              />
              <select
                value={size?.unit ?? units[0]}
                aria-label={t('prices.sizeUnitLabel', { name })}
                onchange={(event) => changeSize(item.id, String(size?.amount ?? 1), event.currentTarget.value)}
              >
                {#each units as unit (unit)}<option value={unit}>{unit}</option>{/each}
              </select>
            </span>
            {#if size}<span class="teacher-unit-price">{unitPriceText(priceFor(item), size)}</span>{/if}
          </div>
        {/each}
      </div>
    </section>
  </section>
