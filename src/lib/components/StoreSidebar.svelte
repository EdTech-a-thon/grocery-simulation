<script lang="ts">
  import Icon from '$lib/components/Icon.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { copyText, studentLink } from '$lib/sharing'
  import { shop } from '$lib/shop.svelte'
  import { teacher, type StorePage } from '$lib/teacher.svelte'

  /**
   * The panel down the left of every page of an open store: the way back to
   * the list, the store's three pages, and the class's two ways in.
   */
  let { page, onGo, onBack, onViewAsStudent }: {
    page: StorePage
    onGo: (next: StorePage) => void
    onBack: () => void
    onViewAsStudent: () => void
  } = $props()

  const pages: Array<{ page: StorePage; label: string }> = $derived([
    { page: 'inventory', label: t('teacher.inventoryTitle') },
    { page: 'coupons', label: t('teacher.couponsTitle') },
    { page: 'settings', label: t('teacher.settingsTitle') },
  ])

  // A student link is a snapshot, so a change made after copying it never
  // reaches the class. The button says so by asking for a new link.
  const linkOutdated = $derived(teacher.sharedEncoded !== '' && teacher.encoded !== teacher.sharedEncoded)

  async function copyStudentLink() {
    if (!teacher.encoded) return
    const link = studentLink(teacher.encoded)
    teacher.sharedEncoded = teacher.encoded
    teacher.message = (await copyText(link)) ? t('store.linkCopied') : t('store.linkFallback', { link })
  }
</script>

<aside class="store-sidebar" data-color={shop.store?.color}>
  <button class="store-sidebar-back" type="button" onclick={onBack}><Icon name="back" />{t('teacher.myStores')}</button>
  <p class="store-sidebar-name"><span class="store-swatch" aria-hidden="true"></span>{shop.store?.name ?? ''}</p>

  <nav class="store-sidebar-pages" aria-label={t('store.pagesLabel')}>
    {#each pages as item (item.page)}
      <button class:active={page === item.page} aria-current={page === item.page ? 'page' : undefined} type="button" onclick={() => onGo(item.page)}>
        <Icon name={item.page} />{item.label}
      </button>
    {/each}
  </nav>

  <div class="store-sidebar-actions">
    <button type="button" onclick={onViewAsStudent}><Icon name="preview" />{t('store.viewAsStudent')}</button>
    <button class="primary-button" class:link-outdated={linkOutdated} type="button" disabled={!teacher.encoded} onclick={copyStudentLink}>
      <Icon name="link" />{linkOutdated ? t('store.copyNewLink') : t('store.copyLink')}
    </button>
  </div>
</aside>
