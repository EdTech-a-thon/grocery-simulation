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
  /** The store whose ⋯ menu is open, if any. */
  let menuFor = $state<string | null>(null)

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

  /** Runs a ⋯ menu choice and closes the menu. */
  function choose(action: () => void) {
    menuFor = null
    action()
  }

  /** A menu closes when the teacher clicks anywhere outside it. */
  function closeMenuOutside(event: MouseEvent) {
    if (menuFor && !(event.target as HTMLElement).closest('.store-card-menu')) menuFor = null
  }

  function remove(entry: SavedStore) {
    if (!window.confirm(t('stores.deleteConfirm', { name: entry.store.name }))) return
    forgetSavedStore(entry.id)
    teacher.message = t('stores.deleted', { name: entry.store.name })
  }
</script>

<svelte:window onclick={closeMenuOutside} onkeydown={(event) => { if (event.key === 'Escape') menuFor = null }} />

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
    <div class="store-cards">
      {#each stores as entry (entry.id)}
        <!-- The whole card opens the store; its two buttons sit on top of it. -->
        <article class="store-card" data-color={entry.store.color}>
          <button class="store-card-open" type="button" aria-label={t('stores.openLabel', { name: entry.store.name })} onclick={() => edit(entry)}></button>
          <h2>{entry.store.name}</h2>
          <p>{t('stores.savedOn', { date: savedOn(entry) })}</p>
          <div class="store-card-tools">
            <div class="store-card-menu">
              <button class="store-card-icon" type="button" aria-haspopup="menu" aria-expanded={menuFor === entry.id} aria-label={t('stores.moreLabel', { name: entry.store.name })} onclick={() => (menuFor = menuFor === entry.id ? null : entry.id)}>
                <Icon name="more" />
              </button>
              {#if menuFor === entry.id}
                <div class="store-card-options" role="menu">
                  <button role="menuitem" type="button" onclick={() => choose(() => duplicate(entry))}>{t('stores.duplicate')}</button>
                  <button role="menuitem" type="button" onclick={() => choose(() => downloadStoreFile(entry.store))}>{t('stores.download')}</button>
                  <button role="menuitem" type="button" onclick={() => choose(() => edit(entry, 'settings'))}>{t('stores.settings')}</button>
                  <button role="menuitem" class="store-card-delete" type="button" onclick={() => choose(() => remove(entry))}>{t('stores.delete')}</button>
                </div>
              {/if}
            </div>
            <button class="store-card-icon" type="button" title={t('stores.copyLink')} aria-label={t('stores.copyLinkLabel', { name: entry.store.name })} onclick={() => void share(entry)}>
              <Icon name="copy" />
            </button>
          </div>
        </article>
      {:else}
        <button class="store-list-empty" type="button" onclick={onCreate}>{t('stores.empty')}</button>
      {/each}
    </div>
  </section>
</main>

{#if importing}
  <ImportStoreModal onClose={() => (importing = false)} onImported={imported} />
{/if}
