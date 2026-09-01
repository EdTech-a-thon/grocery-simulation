<script lang="ts">
  import type { Snippet } from 'svelte'
  import StoreSettingsModal from '$lib/components/StoreSettingsModal.svelte'
  import {
    deleteStore, duplicateStore, errorMessage, storeColors, teacherJoinPrefix,
    type Store, type StoreColor,
  } from '$lib/pocketbase'
  import { copyJoinLink, joinLinkFor } from '$lib/sharing'
  import { forgetStore, shop } from '$lib/shop.svelte'
  import { refreshStores, teacher, withBusy, type StorePage } from '$lib/teacher.svelte'

  let { header, onOpenStore }: {
    header: Snippet
    onOpenStore: (store: Store, page?: StorePage) => Promise<void>
  } = $props()

  // A store that already exists edits its settings on its own page; the modal is
  // only for a store that does not exist yet, and so has no page to open.
  let creating = $state(false)

  const prefix = teacherJoinPrefix()

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

<main class="teacher-shell">
  {@render header()}
  <section class="teacher-hero">
    <div>
      <p class="eyebrow">Teacher controls</p>
      <h2>Set up a store for each class</h2>
      <p>Every store keeps its own prices, its own stocked items and its own coupons. Duplicate one to reuse it with another class.</p>
      <p class="teacher-identity-note">Your class codes all start with <strong>{prefix}</strong>.</p>
      <button class="primary-button create-store-button" type="button" onclick={() => (creating = true)}>Create New Store</button>
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
            <button class="store-name-button" type="button" onclick={() => void withBusy(() => onOpenStore(store))}>{store.name}</button>
            <span>Students join with <code>{store.joinCode}</code></span>
          </div>
          <button class="primary-button store-open-button" type="button" onclick={() => void withBusy(() => onOpenStore(store))}>Edit Store</button>
          <div class="store-summary-actions">
            <button type="button" onclick={() => void share(store)}>Copy join link</button>
            <button type="button" onclick={() => duplicate(store)}>Duplicate</button>
            <button type="button" onclick={() => void withBusy(() => onOpenStore(store, 'settings'))}>Settings</button>
            <button class="icon-button" data-delete-store type="button" title="Delete store" aria-label="Delete {store.name}" onclick={() => remove(store)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /><path d="M10 11v5" /><path d="M14 11v5" />
              </svg>
            </button>
          </div>
        </article>
      {:else}
        <div class="empty-coupons">Create your first store to get started.</div>
      {/each}
    </section>
  </section>
</main>

{#if creating}
  <StoreSettingsModal store={null} onClose={() => (creating = false)} onCreated={onOpenStore} />
{/if}
