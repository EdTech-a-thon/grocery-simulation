<script lang="ts">
  import { onMount } from 'svelte'
  import StorePreview from '$lib/components/StorePreview.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { shop, syncCartToStore } from '$lib/shop.svelte'
  import { storeColors, type UnitPricing } from '$lib/store'

  /**
   * How the store looks and charges: its name, colour, shelf tags, units and
   * sales tax, with the store itself beside the form. Every change applies as it is made, so the
   * preview is always the store the class will see.
   */
  let { isNew = false }: { isNew?: boolean } = $props()

  let nameInput = $state<HTMLInputElement>()

  const tagOptions: Array<{ value: UnitPricing; label: string }> = $derived([
    { value: 'unit', label: t('settings.unitPricingUnit') },
    { value: 'size', label: t('settings.unitPricingSize') },
    { value: 'off', label: t('settings.unitPricingOff') },
  ])

  // A store that was just created is called "New store" until the teacher
  // names it, so the name is ready to be typed over.
  onMount(() => {
    if (isNew) nameInput?.select()
  })

  /** A store always keeps a name: a cleared box leaves the last one in place. */
  function rename(value: string) {
    const name = value.trim().slice(0, 60)
    if (shop.store && name) shop.store.name = name
  }

  /** The rate students practise with at checkout; turning tax off forgets it. */
  function setTax(enabled: boolean, rateText = String(shop.store?.salesTax ?? 0)) {
    if (!shop.store) return
    shop.store.taxEnabled = enabled
    shop.store.salesTax = enabled ? Math.min(100, Math.max(0, Number(rateText) || 0)) : 0
    syncCartToStore(shop.store)
  }
</script>

{#if shop.store}
  <div class="store-settings-page">
    <form class="store-settings-form" onsubmit={(event) => event.preventDefault()}>
      <label>
        {t('settings.name')}
        <input bind:this={nameInput} value={shop.store.name} type="text" maxlength="60" placeholder={t('settings.namePlaceholder')} oninput={(event) => rename(event.currentTarget.value)} />
      </label>

      <fieldset class="color-choices">
        <legend>{t('settings.color')}</legend>
        {#each storeColors as color (color)}
          <label class="color-choice" data-color={color} title={t(`color.${color}`)}>
            <input class="visually-hidden" type="radio" name="color" value={color} bind:group={shop.store.color} />
            <span aria-hidden="true"></span>
            <span class="visually-hidden">{t(`color.${color}`)}</span>
          </label>
        {/each}
      </fieldset>

      <fieldset>
        <legend>{t('settings.unitPricing')}</legend>
        {#each tagOptions as option (option.value)}
          <label><input type="radio" name="unit-pricing" value={option.value} bind:group={shop.store.unitPricing} /> {option.label}</label>
        {/each}
      </fieldset>

      <fieldset>
        <legend>{t('settings.measure')}</legend>
        <label><input type="radio" name="measure" value="us" bind:group={shop.store.measure} /> {t('settings.measureUs')}</label>
        <label><input type="radio" name="measure" value="metric" bind:group={shop.store.measure} /> {t('settings.measureMetric')}</label>
      </fieldset>

      <fieldset>
        <legend>{t('settings.tax')}</legend>
        <label><input type="radio" name="tax" checked={!shop.store.taxEnabled} onchange={() => setTax(false)} /> {t('settings.noTax')}</label>
        <label><input type="radio" name="tax" checked={shop.store.taxEnabled} onchange={() => setTax(true)} /> {t('settings.useTax')}</label>
        {#if shop.store.taxEnabled}
          <label class="tax-rate">
            {t('settings.taxRate')}
            <input type="number" min="0" max="100" step="0.01" value={shop.store.salesTax} onchange={(event) => setTax(true, event.currentTarget.value)} />
          </label>
        {/if}
      </fieldset>
    </form>

    <StorePreview store={shop.store} />
  </div>
{/if}
