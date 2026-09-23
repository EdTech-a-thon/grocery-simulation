<script lang="ts">
  import type { Snippet } from 'svelte'
  import RichText from '$lib/components/RichText.svelte'
  import StoreSettingsModal from '$lib/components/StoreSettingsModal.svelte'
  import { plural, t } from '$lib/i18n/index.svelte'
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
    const copyName = window.prompt(t('stores.copyNamePrompt'), t('stores.copyNameDefault', { name: store.name }))
    if (!copyName) return
    const copyColor = window.prompt(t('stores.copyColorPrompt', { colors: storeColors.join(', ') }), store.color)
    if (!copyColor) return
    const copyLabel = window.prompt(t('stores.copyCodePrompt', { prefix }), '')
    if (!copyLabel) return
    void withBusy(async () => {
      try {
        const copy = await duplicateStore(store.id, copyName, copyColor as StoreColor, copyLabel)
        await refreshStores()
        teacher.message = t('stores.duplicated', { name: copy.name, code: copy.joinCode })
      } catch (error) {
        teacher.message = errorMessage(error, t('stores.duplicateFailed'))
      }
    })
  }

  async function share(store: Store) {
    teacher.message = (await copyJoinLink(store))
      ? t('stores.linkCopied', { name: store.name })
      : t('stores.linkFallback', { name: store.name, link: joinLinkFor(store) })
  }

  function remove(store: Store) {
    if (!window.confirm(t('stores.deleteConfirm', { name: store.name }))) return
    void withBusy(async () => {
      try {
        await deleteStore(store.id)
        if (shop.store?.id === store.id) forgetStore()
        await refreshStores()
        teacher.message = t('stores.deleted', { name: store.name })
      } catch (error) {
        teacher.message = errorMessage(error, t('stores.deleteFailed'))
      }
    })
  }
</script>

<main class="teacher-shell">
  {@render header()}
  <section class="teacher-hero">
    <div>
      <p class="eyebrow">{t('stores.eyebrow')}</p>
      <h2>{t('stores.title')}</h2>
      <p>{t('stores.body')}</p>
      <p class="teacher-identity-note"><RichText key="stores.prefixNote" values={{ prefix }} /></p>
      <button class="primary-button create-store-button" type="button" onclick={() => (creating = true)}>{t('stores.create')}</button>
    </div>
  </section>
  {#if teacher.message}<p class="status-message">{teacher.message}</p>{/if}
  <section class="store-workspace">
    <section class="store-list">
      <div class="section-heading">
        <div>
          <p class="eyebrow">{t('stores.yours')}</p>
          <h2>{plural('stores.count', teacher.stores.length)}</h2>
        </div>
      </div>
      {#each teacher.stores as store (store.id)}
        <article class="store-summary" data-color={store.color}>
          <span class="store-swatch" aria-hidden="true"></span>
          <div class="store-summary-copy">
            <button class="store-name-button" type="button" onclick={() => void withBusy(() => onOpenStore(store))}>{store.name}</button>
            <span>{t('stores.joinWith')} <code>{store.joinCode}</code></span>
          </div>
          <button class="primary-button store-open-button" type="button" onclick={() => void withBusy(() => onOpenStore(store))}>{t('stores.edit')}</button>
          <div class="store-summary-actions">
            <button type="button" onclick={() => void share(store)}>{t('stores.copyLink')}</button>
            <button type="button" onclick={() => duplicate(store)}>{t('stores.duplicate')}</button>
            <button type="button" onclick={() => void withBusy(() => onOpenStore(store, 'settings'))}>{t('stores.settings')}</button>
            <button class="icon-button" data-delete-store type="button" title={t('stores.delete')} aria-label={t('stores.deleteLabel', { name: store.name })} onclick={() => remove(store)}>
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
  <StoreSettingsModal store={null} onClose={() => (creating = false)} onCreated={onOpenStore} />
{/if}
