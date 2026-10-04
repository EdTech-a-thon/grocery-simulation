<script lang="ts">
  import { untrack } from 'svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { shop, syncCartToStore } from '$lib/shop.svelte'
  import { newStore, storeColors, type BrandMode, type Store, type StoreColor } from '$lib/store'
  import { teacher } from '$lib/teacher.svelte'

  /**
   * Everything a store is configured with, in one form. `store` is the store
   * being edited, or null when the form is building a new one. `onClose` is set
   * only when the form sits in a modal, which is the one place it can be backed
   * out of; the settings page has nowhere to close to.
   */
  let { store, onClose, onCreated }: {
    store: Store | null
    onClose?: () => void
    onCreated?: (created: Store) => void
  } = $props()

  // The fields are seeded once, on purpose: from here on the teacher owns them.
  const seed = untrack(() => store)
  let name = $state(seed?.name ?? '')
  let color = $state<StoreColor>(seed?.color ?? 'green')
  let brandMode = $state<BrandMode>(seed?.brandMode ?? 'name')
  let couponsEnabled = $state(seed?.couponsEnabled ?? true)
  let taxEnabled = $state(seed?.taxEnabled ?? false)
  let salesTax = $state(seed?.salesTax ?? 0)

  /** What the form is asking for, with the tax rate a store without tax keeps. */
  function settingsFromForm() {
    return {
      name: name.trim().slice(0, 60),
      color,
      brandMode,
      couponsEnabled,
      taxEnabled,
      salesTax: taxEnabled ? Math.min(100, Math.max(0, Number(salesTax) || 0)) : 0,
    }
  }

  function submit(event: SubmitEvent) {
    event.preventDefault()
    const settings = settingsFromForm()
    if (!settings.name) return
    if (!store) {
      const created = newStore(settings)
      onCreated?.(created)
      teacher.message = t('settings.created', { name: created.name })
      onClose?.()
      return
    }
    // A changed brand line reshelves the store: what the teacher stocked or
    // cleared by hand is forgotten, and the prices they set stay as they are.
    const restock = settings.brandMode !== store.brandMode
    Object.assign(store, settings)
    if (restock) store.stocked = {}
    if (shop.store === store) syncCartToStore(store)
    teacher.message = t('settings.updated', { name: store.name })
    onClose?.()
  }
</script>

<form class="store-form" onsubmit={submit}>
  {#if onClose}
    <button class="store-modal-close" type="button" aria-label={t('action.close')} onclick={onClose}>&times;</button>
  {/if}
  <div>
    <p class="eyebrow">{store ? t('settings.eyebrowEdit') : t('settings.eyebrowNew')}</p>
    <h2 id="store-modal-title">{store ? t('settings.editTitle', { name: store.name }) : t('settings.newTitle')}</h2>
  </div>
  <div class="store-form-grid">
    <label>{t('settings.name')}<input required bind:value={name} type="text" maxlength="60" placeholder={t('settings.namePlaceholder')} /></label>
    <label>{t('settings.color')}<select bind:value={color}>{#each storeColors as option (option)}<option value={option}>{t(`color.${option}`)}</option>{/each}</select></label>
  </div>
  <fieldset>
    <legend>{t('settings.sells')}</legend>
    <label><input type="radio" bind:group={brandMode} value="name" /> {t('settings.brandName')}</label>
    <label><input type="radio" bind:group={brandMode} value="store" /> {t('settings.brandStore')}</label>
    <label><input type="radio" bind:group={brandMode} value="both" /> {t('settings.brandBoth')}</label>
    {#if store && brandMode !== store.brandMode}
      <p class="helper-text">{t('settings.restockNote')}</p>
    {/if}
  </fieldset>
  <div class="store-options-grid">
    <fieldset>
      <legend>{t('settings.tax')}</legend>
      <label><input type="radio" bind:group={taxEnabled} value={false} /> {t('settings.noTax')}</label>
      <label><input type="radio" bind:group={taxEnabled} value={true} /> {t('settings.useTax')}</label>
      {#if taxEnabled}<label>{t('settings.taxRate')}<input required bind:value={salesTax} type="number" min="0" max="100" step="0.01" /></label>{/if}
    </fieldset>
    <fieldset>
      <legend>{t('settings.coupons')}</legend>
      <label><input type="radio" bind:group={couponsEnabled} value={true} /> {t('settings.allowCoupons')}</label>
      <label><input type="radio" bind:group={couponsEnabled} value={false} /> {t('settings.noCoupons')}</label>
    </fieldset>
  </div>
  <div class="store-modal-actions">
    {#if onClose}<button type="button" onclick={onClose}>{t('action.cancel')}</button>{/if}
    <button class="primary-button" type="submit">{store ? t('settings.save') : t('settings.create')}</button>
  </div>
</form>
