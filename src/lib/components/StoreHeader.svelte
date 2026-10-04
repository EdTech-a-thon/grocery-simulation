<script lang="ts">
  import { t } from '$lib/i18n/index.svelte'
  import { isSaved, saveStore } from '$lib/savedStores.svelte'
  import { copyText, studentLink } from '$lib/sharing'
  import { shop } from '$lib/shop.svelte'
  import { teacher, type StorePage } from '$lib/teacher.svelte'

  /**
   * The green bar every page of an open store wears. It says which store the
   * teacher is in, moves them between that store's three pages, and keeps the
   * class's way in — the student link and the student's-eye view — in the same
   * place on all three, beside the ways of keeping the store.
   */
  let { page, title, lede, onGo, onViewAsStudent }: {
    page: StorePage
    title: string
    lede: string
    onGo: (next: StorePage) => void
    onViewAsStudent: () => void
  } = $props()

  const savedHere = $derived(isSaved(teacher.savedId))

  async function copyStudentLink() {
    if (!teacher.encoded) return
    const link = studentLink(teacher.encoded)
    teacher.message = (await copyText(link)) ? t('store.linkCopied') : t('store.linkFallback', { link })
  }

  function saveHere() {
    if (!shop.store) return
    teacher.savedId = saveStore(shop.store, teacher.savedId)
    teacher.message = t('store.savedHere', { name: shop.store.name })
  }
</script>

<!-- Everything here is about this one store; moving around the rest of the
     site is the dark header's job. -->
<section class="teacher-hero">
  <div>
    <p class="eyebrow">{t('store.workspace')}</p>
    <h2>{shop.store?.name ?? ''}</h2>
    <p class="hero-lede">{t('store.workspaceLede')}</p>
  </div>
  <div class="teacher-access-panel">
    <div class="class-code-actions">
      <button class="primary-button" type="button" disabled={!teacher.encoded} onclick={copyStudentLink}>{t('store.copyLink')}</button>
      <button class="teacher-secondary-button" type="button" onclick={onViewAsStudent}>{t('store.viewAsStudent')}</button>
      {#if savedHere}
        <span class="saved-here-badge">{t('store.savedBadge')}</span>
      {:else}
        <button class="teacher-secondary-button" type="button" onclick={saveHere}>{t('store.saveHere')}</button>
      {/if}
    </div>
    <p class="keep-store-note">{savedHere ? t('store.keepNoteSaved') : t('store.keepNote')}</p>
  </div>
</section>

<nav class="store-tabs" aria-label={t('store.tabsLabel')}>
  <div class="store-tab-list">
    <button class:active={page === 'prices'} aria-current={page === 'prices' ? 'page' : undefined} type="button" onclick={() => onGo('prices')}>{t('teacher.pricesTitle')}</button>
    {#if shop.store?.couponsEnabled}
      <button class:active={page === 'coupons'} aria-current={page === 'coupons' ? 'page' : undefined} type="button" onclick={() => onGo('coupons')}>{t('teacher.couponsTitle')}</button>
    {/if}
    <button class:active={page === 'settings'} aria-current={page === 'settings' ? 'page' : undefined} type="button" onclick={() => onGo('settings')}>{t('teacher.settingsTitle')}</button>
  </div>
</nav>

<section class="store-page-heading">
  <h2>{title}</h2>
  <p>{lede}</p>
</section>
