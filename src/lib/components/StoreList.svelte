<script lang="ts">
  import type { Snippet } from 'svelte'
  import Icon from '$lib/components/Icon.svelte'
  import ImportStoreModal from '$lib/components/ImportStoreModal.svelte'
  import { current, t } from '$lib/i18n/index.svelte'
  import { forgetSavedStore, saveStore, saved, type SavedStore } from '$lib/savedStores.svelte'
  import { copyText, downloadStoreFile, encodeStore, studentLink } from '$lib/sharing'
  import type { Store } from '$lib/store'
  import { teacher, type StorePage } from '$lib/teacher.svelte'

  let { header, onOpenStore, onCreate }: {
    header: Snippet
    onOpenStore: (store: Store, savedId: string, page?: StorePage, fromStudentLink?: boolean) => void
    onCreate: () => void
  } = $props()

  let importing = $state(false)

  /** Newest first: the store a teacher was just working on is the one they want. */
  const stores = $derived([...saved.stores].sort((a, b) => b.savedAt.localeCompare(a.savedAt)))

  /** Opens a copy, so nothing reaches the saved list until it is saved again. */
  function edit(entry: SavedStore, page?: StorePage) {
    onOpenStore($state.snapshot(entry.store) as Store, entry.id, page)
  }

  /** An imported store goes straight onto the list, so there is nothing to remember to save. */
  function imported(store: Store, fromLink: boolean) {
    importing = false
    onOpenStore(store, saveStore(store), 'inventory', fromLink)
    teacher.message = t(fromLink ? 'stores.openedFromLink' : 'import.done', { name: store.name })
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
  <section class="store-list">
    <div class="store-list-heading">
      <div>
        <h1>{t('stores.yours')}</h1>
        <p>{t('stores.definition')}</p>
      </div>
      <div class="store-list-actions">
        <button class="teacher-secondary-button" type="button" onclick={() => (importing = true)}>{t('stores.import')}<Icon name="import" /></button>
        <button class="primary-button" type="button" onclick={onCreate}>{t('stores.create')}<Icon name="plus" /></button>
      </div>
    </div>
    {#if teacher.message}<p class="status-message">{teacher.message}</p>{/if}
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
          <button type="button" onclick={() => downloadStoreFile(entry.store)}>{t('stores.download')}</button>
          <button type="button" onclick={() => edit(entry, 'settings')}>{t('stores.settings')}</button>
          <button class="icon-button" data-delete-store type="button" title={t('stores.delete')} aria-label={t('stores.deleteLabel', { name: entry.store.name })} onclick={() => remove(entry)}>
            <Icon name="trash" />
          </button>
        </div>
      </article>
    {:else}
      <button class="store-list-empty" type="button" onclick={onCreate}>{t('stores.empty')}</button>
    {/each}
  </section>
</main>

{#if importing}
  <ImportStoreModal onClose={() => (importing = false)} onImported={imported} />
{/if}
