<script lang="ts">
  import { untrack } from 'svelte'
  import RichText from '$lib/components/RichText.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { joinLabelPattern, normalizeJoinLabel } from '$lib/joincodes'
  import {
    createStore, errorMessage, loadStoreItems, stockBrands, storeColors, teacherJoinPrefix,
    updateStore, type BrandMode, type Store, type StoreColor,
  } from '$lib/pocketbase'
  import { everyProductWithItsPrice, shop, syncCartToStore } from '$lib/shop.svelte'
  import { refreshStores, teacher, withBusy } from '$lib/teacher.svelte'

  /**
   * Everything a store is configured with, in one form. `store` is the store
   * being edited, or null when the form is building a new one. `onClose` is set
   * only when the form sits in a modal, which is the one place it can be backed
   * out of; the settings page has nowhere to close to.
   */
  let { store, onClose, onCreated }: {
    store: Store | null
    onClose?: () => void
    onCreated?: (created: Store) => Promise<void>
  } = $props()

  const prefix = teacherJoinPrefix()

  // The fields are seeded once, on purpose: from here on the teacher owns them.
  const seed = untrack(() => store)
  let name = $state(seed?.name ?? '')
  let color = $state<StoreColor>(seed?.color ?? 'green')
  let joinLabel = $state(seed?.joinLabel ?? '')
  let brandMode = $state<BrandMode>(seed?.brandMode ?? 'name')
  let couponsEnabled = $state(seed?.couponsEnabled ?? true)
  let taxEnabled = $state(seed?.taxEnabled ?? false)
  let salesTax = $state(seed?.salesTax ?? 0)

  const label = $derived(normalizeJoinLabel(joinLabel))

  /** What the form is asking for, with the tax rate a store without tax keeps. */
  function settingsFromForm() {
    return {
      name,
      color,
      joinLabel: label,
      brandMode,
      couponsEnabled,
      taxEnabled,
      salesTax: taxEnabled ? Math.min(100, Math.max(0, Number(salesTax) || 0)) : 0,
    }
  }

  function submit(event: SubmitEvent) {
    event.preventDefault()
    if (!joinLabelPattern.test(label)) {
      teacher.message = t('settings.badCode')
      return
    }
    void withBusy(store ? saveEdits(store) : create)
  }

  async function create() {
    try {
      const created = await createStore(settingsFromForm())
      if (brandMode !== 'name') await stockBrands(created.id, brandMode, everyProductWithItsPrice({}))
      await refreshStores()
      await onCreated?.(created)
      teacher.message = t('settings.created', { name: created.name, code: created.joinCode })
      onClose?.()
    } catch (error) {
      teacher.message = errorMessage(error, t('settings.createFailed'))
    }
  }

  function saveEdits(editing: Store) {
    return async () => {
      try {
        const updated = await updateStore(editing.id, settingsFromForm())
        // Only a changed brand line reshelves the store: restocking rewrites
        // every stock flag, and prices the teacher set stay as they are.
        if (updated.brandMode !== editing.brandMode) {
          await stockBrands(updated.id, updated.brandMode, everyProductWithItsPrice(await loadStoreItems(updated.id)))
        }
        if (shop.store?.id === updated.id) {
          shop.store = updated
          shop.items = await loadStoreItems(updated.id)
          syncCartToStore(updated)
        }
        await refreshStores()
        teacher.message = t('settings.updated', { name: updated.name, code: updated.joinCode })
        onClose?.()
      } catch (error) {
        teacher.message = errorMessage(error, t('settings.updateFailed'))
      }
    }
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
    <label>{t('settings.code')}<input required bind:value={joinLabel} type="text" maxlength="6" autocapitalize="characters" placeholder="P3" /></label>
  </div>
  <p class="join-code-preview">
    {#if joinLabelPattern.test(label)}<RichText key="settings.codePreview" values={{ code: `${prefix}-${label}` }} />
    {:else}<RichText key="settings.codeHint" values={{ prefix }} />{/if}
  </p>
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
    <button class="primary-button" type="submit" disabled={teacher.busy}>{store ? t('settings.save') : t('settings.create')}</button>
  </div>
</form>
