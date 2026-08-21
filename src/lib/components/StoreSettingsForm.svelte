<script lang="ts">
  import { untrack } from 'svelte'
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

  function capitalize(value: string) {
    return `${value[0].toUpperCase()}${value.slice(1)}`
  }

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
      teacher.message = 'Give the class a short code of 1 to 6 letters or numbers, such as P3.'
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
      teacher.message = `${created.name} is ready. Students join with ${created.joinCode}.`
      onClose?.()
    } catch (error) {
      teacher.message = errorMessage(error, 'That store could not be created.')
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
        teacher.message = `${updated.name} updated. Students join with ${updated.joinCode}.`
        onClose?.()
      } catch (error) {
        teacher.message = errorMessage(error, 'That store could not be updated.')
      }
    }
  }
</script>

<form class="store-form" onsubmit={submit}>
  {#if onClose}
    <button class="store-modal-close" type="button" aria-label="Close" onclick={onClose}>&times;</button>
  {/if}
  <div>
    <p class="eyebrow">{store ? 'Store settings' : 'New store'}</p>
    <h2 id="store-modal-title">{store ? `Edit ${store.name}` : 'Create New Store'}</h2>
  </div>
  <div class="store-form-grid">
    <label>Store name<input required bind:value={name} type="text" maxlength="60" placeholder="Room 204 Market" /></label>
    <label>Store color<select bind:value={color}>{#each storeColors as option (option)}<option value={option}>{capitalize(option)}</option>{/each}</select></label>
    <label>Store code<input required bind:value={joinLabel} type="text" maxlength="6" autocapitalize="characters" placeholder="P3" /></label>
  </div>
  <p class="join-code-preview">
    {#if joinLabelPattern.test(label)}Students will join with <strong>{prefix}-{label}</strong>
    {:else}Your identifier is <strong>{prefix}</strong>. Add a short code such as Period3 or FreshMart.{/if}
  </p>
  <fieldset>
    <legend>This store sells</legend>
    <label><input type="radio" bind:group={brandMode} value="name" /> Name brands</label>
    <label><input type="radio" bind:group={brandMode} value="store" /> CG Value store brand</label>
    <label><input type="radio" bind:group={brandMode} value="both" /> Both</label>
    {#if store && brandMode !== store.brandMode}
      <p class="helper-text">Saving restocks every aisle to match. Your prices stay as you set them.</p>
    {/if}
  </fieldset>
  <div class="store-options-grid">
    <fieldset>
      <legend>Sales tax</legend>
      <label><input type="radio" bind:group={taxEnabled} value={false} /> No sales tax</label>
      <label><input type="radio" bind:group={taxEnabled} value={true} /> Use sales tax</label>
      {#if taxEnabled}<label>Default sales tax (%)<input required bind:value={salesTax} type="number" min="0" max="100" step="0.01" /></label>{/if}
    </fieldset>
    <fieldset>
      <legend>Coupons</legend>
      <label><input type="radio" bind:group={couponsEnabled} value={true} /> Allow coupons</label>
      <label><input type="radio" bind:group={couponsEnabled} value={false} /> No coupons</label>
    </fieldset>
  </div>
  <div class="store-modal-actions">
    {#if onClose}<button type="button" onclick={onClose}>Cancel</button>{/if}
    <button class="primary-button" type="submit" disabled={teacher.busy}>{store ? 'Save changes' : 'Create store'}</button>
  </div>
</form>
