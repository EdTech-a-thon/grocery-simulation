<script lang="ts">
  import type { Snippet } from 'svelte'
  import {
    createStore, deleteStore, duplicateStore, errorMessage, normalizeJoinCode, storeColors,
    updateStore, type Store, type StoreColor,
  } from '$lib/pocketbase'
  import { forgetStore, shop } from '$lib/shop.svelte'
  import { refreshStores, teacher, withBusy } from '$lib/teacher.svelte'

  let { header, onOpenStore }: { header: Snippet; onOpenStore: (store: Store) => Promise<void> } = $props()

  let name = $state('')
  let color = $state<StoreColor>('green')
  let joinCode = $state('')

  function capitalize(value: string) {
    return `${value[0].toUpperCase()}${value.slice(1)}`
  }

  function create(event: SubmitEvent) {
    event.preventDefault()
    const code = normalizeJoinCode(joinCode)
    if (code.length < 3) {
      teacher.message = 'Use at least 3 letters or numbers for the join code.'
      return
    }
    void withBusy(async () => {
      try {
        const store = await createStore(name, color, code)
        await refreshStores()
        await onOpenStore(store)
        teacher.message = `${store.name} is ready. Students join with ${store.joinCode}.`
        name = ''
        joinCode = ''
      } catch (error) {
        teacher.message = errorMessage(error, 'That store could not be created. The join code may already be taken.')
      }
    })
  }

  function duplicate(store: Store) {
    const copyName = window.prompt('Name for the copy', `${store.name} (copy)`)
    if (!copyName) return
    const copyColor = window.prompt(`Color for the copy (${storeColors.join(', ')})`, store.color)
    if (!copyColor) return
    const copyJoinCode = window.prompt('Student join code for the copy', '')
    if (!copyJoinCode) return
    void withBusy(async () => {
      try {
        const copy = await duplicateStore(store.id, copyName, copyColor as StoreColor, copyJoinCode)
        await refreshStores()
        teacher.message = `${copy.name} created with the same prices, stock and coupons. Students join with ${copy.joinCode}.`
      } catch (error) {
        teacher.message = errorMessage(error, 'That store could not be duplicated.')
      }
    })
  }

  function rename(store: Store) {
    const newName = window.prompt('Store name', store.name)
    if (!newName) return
    const newColor = window.prompt(`Store color (${storeColors.join(', ')})`, store.color)
    if (!newColor) return
    const newJoinCode = window.prompt('Student join code', store.joinCode)
    if (!newJoinCode) return
    void withBusy(async () => {
      try {
        const updated = await updateStore(store.id, { name: newName, color: newColor as StoreColor, joinCode: newJoinCode })
        if (shop.store?.id === updated.id) shop.store = updated
        await refreshStores()
        teacher.message = `${updated.name} updated.`
      } catch (error) {
        teacher.message = errorMessage(error, 'That store could not be updated. The join code may already be taken.')
      }
    })
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

<main class="teacher-shell">
  {@render header()}
  <section class="teacher-hero">
    <div>
      <p class="eyebrow">Teacher controls</p>
      <h2>Set up a store for each class</h2>
      <p>Every store keeps its own prices, its own stocked items and its own coupons. Duplicate one to reuse it with another class.</p>
    </div>
  </section>
  {#if teacher.message}<p class="status-message">{teacher.message}</p>{/if}
  <section class="store-workspace">
    <form class="store-form" onsubmit={create}>
      <div><p class="eyebrow">New store</p><h2>Store details</h2></div>
      <label>Store name<input required bind:value={name} type="text" maxlength="60" placeholder="Room 204 Market" /></label>
      <label>
        Store color
        <select bind:value={color}>
          {#each storeColors as option (option)}<option value={option}>{capitalize(option)}</option>{/each}
        </select>
      </label>
      <label>Student join code<input required bind:value={joinCode} type="text" maxlength="20" placeholder="ROOM-204" /></label>
      <button class="primary-button" type="submit" disabled={teacher.busy}>Create store</button>
    </form>
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
            <button type="button" onclick={() => duplicate(store)}>Duplicate</button>
            <button type="button" onclick={() => rename(store)}>Edit</button>
            <button type="button" onclick={() => remove(store)}>Delete</button>
          </div>
        </article>
      {:else}
        <div class="empty-coupons">Create your first store to get started.</div>
      {/each}
    </section>
  </section>
</main>
