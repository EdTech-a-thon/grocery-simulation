<script lang="ts">
  import type { Snippet } from 'svelte'
  import { joinLabelPattern, normalizeJoinLabel } from '$lib/joincodes'
  import {
    createStore, deleteStore, duplicateStore, errorMessage, storeColors,
    teacherJoinPrefix, updateStore, type Store, type StoreColor,
  } from '$lib/pocketbase'
  import { copyJoinLink, joinLinkFor } from '$lib/sharing'
  import { forgetStore, shop } from '$lib/shop.svelte'
  import { refreshStores, teacher, withBusy } from '$lib/teacher.svelte'

  let { header, onOpenStore }: { header: Snippet; onOpenStore: (store: Store) => Promise<void> } = $props()

  let name = $state('')
  let color = $state<StoreColor>('green')
  let joinLabel = $state('')

  const prefix = teacherJoinPrefix()
  const label = $derived(normalizeJoinLabel(joinLabel))

  function capitalize(value: string) {
    return `${value[0].toUpperCase()}${value.slice(1)}`
  }

  function create(event: SubmitEvent) {
    event.preventDefault()
    if (!joinLabelPattern.test(label)) {
      teacher.message = 'Give the class a short code of 1 to 6 letters or numbers, such as P3.'
      return
    }
    void withBusy(async () => {
      try {
        const store = await createStore(name, color, label)
        await refreshStores()
        await onOpenStore(store)
        teacher.message = `${store.name} is ready. Students join with ${store.joinCode}.`
        name = ''
        joinLabel = ''
      } catch (error) {
        teacher.message = errorMessage(error, 'That store could not be created.')
      }
    })
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

  function rename(store: Store) {
    const newName = window.prompt('Store name', store.name)
    if (!newName) return
    const newColor = window.prompt(`Store color (${storeColors.join(', ')})`, store.color)
    if (!newColor) return
    const newLabel = window.prompt(`Class code, after ${prefix}-`, store.joinLabel)
    if (!newLabel) return
    void withBusy(async () => {
      try {
        const updated = await updateStore(store.id, { name: newName, color: newColor as StoreColor, joinLabel: newLabel })
        if (shop.store?.id === updated.id) shop.store = updated
        await refreshStores()
        teacher.message = `${updated.name} updated. Students join with ${updated.joinCode}.`
      } catch (error) {
        teacher.message = errorMessage(error, 'That store could not be updated.')
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

<main class="teacher-shell">
  {@render header()}
  <section class="teacher-hero">
    <div>
      <p class="eyebrow">Teacher controls</p>
      <h2>Set up a store for each class</h2>
      <p>Every store keeps its own prices, its own stocked items and its own coupons. Duplicate one to reuse it with another class.</p>
      <p class="teacher-identity-note">Your class codes all start with <strong>{prefix}</strong>.</p>
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
      <label>
        Class code
        <input required bind:value={joinLabel} type="text" maxlength="6" autocapitalize="characters" placeholder="P3" />
      </label>
      <p class="join-code-preview">
        {#if joinLabelPattern.test(label)}
          Students will join with <strong>{prefix}-{label}</strong>
        {:else}
          Your identifier is <strong>{prefix}</strong>. Add a short code for this class, such as P3 or ROOM1.
        {/if}
      </p>
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
            <button type="button" onclick={() => void share(store)}>Copy join link</button>
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
