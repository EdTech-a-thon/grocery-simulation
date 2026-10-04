<script lang="ts">
  import type { Snippet } from 'svelte'
  import StoreSettingsModal from '$lib/components/StoreSettingsModal.svelte'
  import { current, plural, t } from '$lib/i18n/index.svelte'
  import { forgetSavedStore, saveStore, saved, type SavedStore } from '$lib/savedStores.svelte'
  import { copyText, encodeStore, studentLink } from '$lib/sharing'
  import type { Store } from '$lib/store'
  import { teacher, type StorePage } from '$lib/teacher.svelte'

  let { header, onOpenStore }: {
    header: Snippet
    onOpenStore: (store: Store, savedId: string | null, page?: StorePage) => void
  } = $props()

  // A store that already exists edits its settings on its own page; the modal is
  // only for a store that does not exist yet, and so has no page to open.
  let creating = $state(false)

  /** Newest first: the store a teacher was just working on is the one they want. */
  const stores = $derived([...saved.stores].sort((a, b) => b.savedAt.localeCompare(a.savedAt)))

  /** Opens a copy, so nothing reaches the saved list until it is saved again. */
  function edit(entry: SavedStore, page?: StorePage) {
    onOpenStore($state.snapshot(entry.store) as Store, entry.id, page)
  }

  function savedOn(entry: SavedStore) {
    return new Date(entry.savedAt).toLocaleDateString(current().locale, { dateStyle: 'medium' })
  }

  async function share(entry: SavedStore) {
    const link = studentLink(await encodeStore(entry.store))
    teacher.message = (await copyText(link))
      ? t('stores.linkCopied', { name: entry.store.name })
      : t('stores.linkFallback', { name: entry.store.name, link })
  }

  function duplicate(entry: SavedStore) {
    const name = window.prompt(t('stores.copyNamePrompt'), t('stores.copyNameDefault', { name: entry.store.name }))?.trim()
    if (!name) return
    saveStore({ ...($state.snapshot(entry.store) as Store), name: name.slice(0, 60) })
    teacher.message = t('stores.duplicated', { name })
  }

  function remove(entry: SavedStore) {
    if (!window.confirm(t('stores.deleteConfirm', { name: entry.store.name }))) return
    forgetSavedStore(entry.id)
    teacher.message = t('stores.deleted', { name: entry.store.name })
  }
</script>

<main class="teacher-shell">
  {@render header()}
  <section class="teacher-hero">
    <div>
      <p class="eyebrow">{t('stores.eyebrow')}</p>
      <h2>{t('stores.title')}</h2>
      <p>{t('stores.body')}</p>
      <button class="primary-button create-store-button" type="button" onclick={() => (creating = true)}>{t('stores.create')}</button>
    </div>
  </section>
  {#if teacher.message}<p class="status-message">{teacher.message}</p>{/if}
  <section class="store-workspace">
    <section class="store-list">
      <div class="section-heading">
        <div>
          <p class="eyebrow">{t('stores.yours')}</p>
          <h2>{plural('stores.count', stores.length)}</h2>
        </div>
      </div>
      <p class="helper-text saved-stores-note">{t('stores.browserOnly')}</p>
      {#each stores as entry (entry.id)}
        <article class="store-summary" data-color={entry.store.color}>
          <span class="store-swatch" aria-hidden="true"></span>
          <div class="store-summary-copy">
            <button class="store-name-button" type="button" onclick={() => edit(entry)}>{entry.store.name}</button>
            <span>{t('stores.savedOn', { date: savedOn(entry) })}</span>
          </div>
          <button class="primary-button store-open-button" type="button" onclick={() => edit(entry)}>{t('stores.edit')}</button>
          <div class="store-summary-actions">
            <button type="button" onclick={() => void share(entry)}>{t('stores.copyLink')}</button>
            <button type="button" onclick={() => duplicate(entry)}>{t('stores.duplicate')}</button>
            <button type="button" onclick={() => edit(entry, 'settings')}>{t('stores.settings')}</button>
            <button class="icon-button" data-delete-store type="button" title={t('stores.delete')} aria-label={t('stores.deleteLabel', { name: entry.store.name })} onclick={() => remove(entry)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /><path d="M10 11v5" /><path d="M14 11v5" />
              </svg>
            </button>
          </div>
        </article>
      {:else}
        <div class="empty-coupons">{t('stores.empty')}</div>
      {/each}
    </section>
  </section>
</main>

{#if creating}
  <StoreSettingsModal store={null} onClose={() => (creating = false)} onCreated={(store) => onOpenStore(store, null)} />
{/if}
