<script lang="ts">
  import Icon from '$lib/components/Icon.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { copyLink, studentLink } from '$lib/sharing'
  import { shop } from '$lib/shop.svelte'
  import { teacher, type StorePage } from '$lib/teacher.svelte'

  /**
   * The panel down the left of every page of an open store: the way back to
   * the list, a little picture of the store, the store's pages, and the
   * class's two ways in.
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
    { page: 'settings', label: t('teacher.settingsNav') },
  ])

  // A student link is a snapshot, so a change made after copying it never
  // reaches the class. The button says so by asking for a new link.
  const linkOutdated = $derived(teacher.sharedEncoded !== '' && teacher.encoded !== teacher.sharedEncoded)

  /** True for a moment after a copy, while the button says Copied. */
  let copied = $state(false)

  async function copyStudentLink() {
    if (!teacher.encoded) return
    teacher.sharedEncoded = teacher.encoded
    if (!(await copyLink(studentLink(teacher.encoded), t('store.copyPrompt')))) return
    copied = true
    setTimeout(() => (copied = false), 2000)
  }
</script>

<aside class="store-sidebar" data-color={shop.store?.color}>
  <button class="store-sidebar-back" type="button" onclick={onBack}><Icon name="back" />{t('teacher.myStores')}</button>
  <div class="sidebar-storefront">
    <span class="sidebar-storefront-sign">{shop.store?.name ?? ''}</span>
    <span class="sidebar-storefront-awning" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
    <span class="sidebar-storefront-front" aria-hidden="true">
      <span class="sidebar-storefront-window"></span>
      <span class="sidebar-storefront-door"><span>{t('store.welcomeIn')}</span></span>
      <span class="sidebar-storefront-window"></span>
    </span>
  </div>

  <nav class="store-sidebar-pages" aria-label={t('store.pagesLabel')}>
    {#each pages as item (item.page)}
      <button class:active={page === item.page} aria-current={page === item.page ? 'page' : undefined} type="button" onclick={() => onGo(item.page)}>
        <Icon name={item.page} />{item.label}
      </button>
    {/each}
  </nav>

  <div class="store-sidebar-actions">
    <button class="preview-button" type="button" onclick={onViewAsStudent}><Icon name="preview" />{t('store.viewAsStudent')}</button>
    <button class="primary-button" class:link-outdated={linkOutdated} type="button" disabled={!teacher.encoded} onclick={copyStudentLink}>
      {#if copied}
        <Icon name="check" />{t('store.copied')}
      {:else}
        <Icon name="link" />{linkOutdated ? t('store.copyNewLink') : t('store.copyLink')}
      {/if}
    </button>
  </div>
</aside>
