<script lang="ts">
  import Icon from '$lib/components/Icon.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { copyText, studentLink } from '$lib/sharing'
  import { shop } from '$lib/shop.svelte'
  import { teacher, type StorePage } from '$lib/teacher.svelte'

  /**
   * The panel down the left of every page of an open store: the way back to
   * the list, a little picture of the store (its gear opens the settings), the
   * store's pages, and the class's two ways in.
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
  <!-- The whole shopfront is the way into the store's settings; the gear says so. -->
  <button
    class="sidebar-storefront"
    class:active={page === 'settings'}
    aria-current={page === 'settings' ? 'page' : undefined}
    type="button"
    title={t('teacher.settingsTitle')}
    aria-label={`${t('teacher.settingsTitle')}: ${shop.store?.name ?? ''}`}
    onclick={() => onGo('settings')}
  >
    <span class="sidebar-storefront-gear" aria-hidden="true"><Icon name="gear" /></span>
    <span class="sidebar-storefront-sign">{shop.store?.name ?? ''}</span>
    <span class="sidebar-storefront-awning" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
    <span class="sidebar-storefront-front" aria-hidden="true">
      <span class="sidebar-storefront-window"></span>
      <span class="sidebar-storefront-door"><span>{t('store.welcomeIn')}</span></span>
      <span class="sidebar-storefront-window"></span>
    </span>
  </button>

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
      <Icon name="link" />{linkOutdated ? t('store.copyNewLink') : t('store.copyLink')}
    </button>
  </div>
</aside>
