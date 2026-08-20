<script lang="ts">
  import type { Snippet } from 'svelte'
  import { joinLabelPattern, normalizeJoinLabel } from '$lib/joincodes'
  import {
    createStore, deleteStore, duplicateStore, errorMessage, loadStoreItems, stockBrands,
    storeColors, teacherJoinPrefix, updateStore, type BrandMode, type Store, type StoreColor,
  } from '$lib/pocketbase'
  import { copyJoinLink, joinLinkFor } from '$lib/sharing'
  import { everyProductWithItsPrice, forgetStore, shop, syncCartToStore } from '$lib/shop.svelte'
  import { refreshStores, teacher, withBusy } from '$lib/teacher.svelte'

  let { header, onOpenStore }: { header: Snippet; onOpenStore: (store: Store) => Promise<void> } = $props()

  let name = $state('')
  let color = $state<StoreColor>('green')
  let joinLabel = $state('')
  let brandMode = $state<BrandMode>('name')
  let couponsEnabled = $state(true)
  let taxEnabled = $state(false)
  let salesTax = $state(0)
  /** The store the form is editing, or null when it is making a new one. */
  let editing = $state<Store | null>(null)
  let modalOpen = $state(false)

  const prefix = teacherJoinPrefix()
  const label = $derived(normalizeJoinLabel(joinLabel))

  function capitalize(value: string) {
    return `${value[0].toUpperCase()}${value.slice(1)}`
  }

  function openCreateModal() {
    editing = null
    name = ''
    color = 'green'
    joinLabel = ''
    brandMode = 'name'
    couponsEnabled = true
    taxEnabled = false
    salesTax = 0
    modalOpen = true
  }

  function openEditModal(store: Store) {
    editing = store
    name = store.name
    color = store.color
    joinLabel = store.joinLabel
    brandMode = store.brandMode
    couponsEnabled = store.couponsEnabled
    taxEnabled = store.taxEnabled
    salesTax = store.salesTax
    modalOpen = true
  }

  function closeModal() {
    modalOpen = false
    editing = null
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
    void withBusy(editing ? saveEdits(editing) : create)
  }

  async function create() {
    try {
      const store = await createStore(settingsFromForm())
      if (brandMode !== 'name') await stockBrands(store.id, brandMode, everyProductWithItsPrice({}))
      await refreshStores()
      await onOpenStore(store)
      teacher.message = `${store.name} is ready. Students join with ${store.joinCode}.`
      closeModal()
    } catch (error) {
      teacher.message = errorMessage(error, 'That store could not be created.')
    }
  }

  function saveEdits(store: Store) {
    return async () => {
      try {
        const updated = await updateStore(store.id, settingsFromForm())
        // Only a changed brand line reshelves the store: restocking rewrites
        // every stock flag, and prices the teacher set stay as they are.
        if (updated.brandMode !== store.brandMode) {
          await stockBrands(store.id, updated.brandMode, everyProductWithItsPrice(await loadStoreItems(store.id)))
        }
        if (shop.store?.id === updated.id) {
          shop.store = updated
          shop.items = await loadStoreItems(updated.id)
          syncCartToStore(updated)
        }
        await refreshStores()
        teacher.message = `${updated.name} updated. Students join with ${updated.joinCode}.`
        closeModal()
      } catch (error) {
        teacher.message = errorMessage(error, 'That store could not be updated.')
      }
    }
  }

  function duplicate(store: Store) {
    const copyName = window.prompt('Name for the copy', `${store.name} (copy)`)
    if (!copyName) return
    const copyColor = window.prompt(`Color for the copy (${storeColors.join(', ')})`, store.color)
    if (!copyColor) return
    const copyLabel = window.prompt(`Class code for the copy, after ${prefix}-`, '')
    if (!copyLabel) return
    void withBusy(async () => {
      try {
        const copy = await duplicateStore(store.id, copyName, copyColor as StoreColor, copyLabel)
        await refreshStores()
        teacher.message = `${copy.name} created with the same prices, stock and coupons. Students join with ${copy.joinCode}.`
      } catch (error) {
        teacher.message = errorMessage(error, 'That store could not be duplicated.')
      }
    })
  }

  async function share(store: Store) {
    teacher.message = (await copyJoinLink(store))
      ? `Join link for ${store.name} copied. Paste it wherever your class will see it.`
      : `Join link for ${store.name}: ${joinLinkFor(store)}`
  }

  function remove(store: Store) {
    if (!window.confirm(`Delete ${store.name}? Its prices and coupons are deleted too. This cannot be undone.`)) return
    void withBusy(async () => {
      try {
        await deleteStore(store.id)
        if (shop.store?.id === store.id) forgetStore()
        await refreshStores()
        teacher.message = `${store.name} deleted.`
      } catch (error) {
        teacher.message = errorMessage(error, 'That store could not be deleted.')
      }
    })
  }
</script>

<svelte:window onkeydown={(event) => { if (event.key === 'Escape') closeModal() }} />

<main class="teacher-shell">
  {@render header()}
  <section class="teacher-hero">
    <div>
      <p class="eyebrow">Teacher controls</p>
      <h2>Set up a store for each class</h2>
      <p>Every store keeps its own prices, its own stocked items and its own coupons. Duplicate one to reuse it with another class.</p>
      <p class="teacher-identity-note">Your class codes all start with <strong>{prefix}</strong>.</p>
      <button class="primary-button create-store-button" type="button" onclick={openCreateModal}>Create New Store</button>
    </div>
  </section>
  {#if teacher.message}<p class="status-message">{teacher.message}</p>{/if}
  <section class="store-workspace">
    <section class="store-list">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Your stores</p>
          <h2>{teacher.stores.length} store{teacher.stores.length === 1 ? '' : 's'}</h2>
        </div>
      </div>
      {#each teacher.stores as store (store.id)}
        <article class="store-summary" data-color={store.color}>
          <span class="store-swatch" aria-hidden="true"></span>
          <div class="store-summary-copy">
            <strong>{store.name}</strong>
            <span>Students join with <code>{store.joinCode}</code></span>
          </div>
          <div class="store-summary-actions">
            <button class="primary-button" type="button" onclick={() => void withBusy(() => onOpenStore(store))}>Open</button>
            <button type="button" onclick={() => void share(store)}>Copy join link</button>
            <button type="button" onclick={() => duplicate(store)}>Duplicate</button>
            <button type="button" onclick={() => openEditModal(store)}>Edit</button>
            <button type="button" onclick={() => remove(store)}>Delete</button>
          </div>
        </article>
      {:else}
        <div class="empty-coupons">Create your first store to get started.</div>
      {/each}
    </section>
  </section>
</main>

{#if modalOpen}
  <div class="store-modal-overlay" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) closeModal() }}>
    <div class="store-modal" role="dialog" aria-modal="true" aria-labelledby="store-modal-title">
    <form class="store-form" onsubmit={submit}>
      <button class="store-modal-close" type="button" aria-label="Close" onclick={closeModal}>&times;</button>
      <div>
        <p class="eyebrow">{editing ? 'Store settings' : 'New store'}</p>
        <h2 id="store-modal-title">{editing ? `Edit ${editing.name}` : 'Create New Store'}</h2>
      </div>
      <div class="store-form-grid">
        <label>Store name<input required bind:value={name} type="text" maxlength="60" placeholder="Room 204 Market" /></label>
        <label>Store color<select bind:value={color}>{#each storeColors as option (option)}<option value={option}>{capitalize(option)}</option>{/each}</select></label>
        <label>Class code<input required bind:value={joinLabel} type="text" maxlength="6" autocapitalize="characters" placeholder="P3" /></label>
      </div>
      <p class="join-code-preview">
        {#if joinLabelPattern.test(label)}Students will join with <strong>{prefix}-{label}</strong>
        {:else}Your identifier is <strong>{prefix}</strong>. Add a short code such as P3 or ROOM1.{/if}
      </p>
      <fieldset>
        <legend>Brands on the shelves</legend>
        <label><input type="radio" bind:group={brandMode} value="name" /> Name brands</label>
        <label><input type="radio" bind:group={brandMode} value="store" /> CG Value store brand</label>
        <label><input type="radio" bind:group={brandMode} value="both" /> Both</label>
        {#if editing && brandMode !== editing.brandMode}
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
        <button type="button" onclick={closeModal}>Cancel</button>
        <button class="primary-button" type="submit" disabled={teacher.busy}>{editing ? 'Save changes' : 'Create store'}</button>
      </div>
    </form>
    </div>
  </div>
{/if}
