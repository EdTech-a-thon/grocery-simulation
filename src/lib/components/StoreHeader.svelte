<script lang="ts">
  import { copyJoinLink, copyText, joinLinkFor } from '$lib/sharing'
  import { shop } from '$lib/shop.svelte'
  import { teacher, type StorePage } from '$lib/teacher.svelte'

  /**
   * The green bar every page of an open store wears. It says which store the
   * teacher is in, moves them between that store's three pages, and keeps the
   * class's way in — the join code, the join link and the student's-eye view —
   * in the same place on all three.
   */
  let { page, title, lede, onGo, onViewAsStudent }: {
    page: StorePage
    title: string
    lede: string
    onGo: (next: StorePage) => void
    onViewAsStudent: () => void
  } = $props()

  const joinCode = $derived(shop.store?.joinCode ?? '')

  async function copyJoinCode() {
    if (!(await copyText(joinCode))) {
      window.prompt('Copy the join code:', joinCode)
      return
    }
    teacher.message = `Join code ${joinCode} copied.`
  }

  async function shareJoinLink() {
    if (!shop.store) return
    teacher.message = (await copyJoinLink(shop.store))
      ? 'Join link copied. Paste it wherever your class will see it.'
      : `Join link: ${joinLinkFor(shop.store)}`
  }
</script>

<!-- Everything here is about this one store; moving around the rest of the
     site is the dark header's job. -->
<section class="teacher-hero">
  <div>
    <p class="eyebrow">{shop.store?.name ?? ''}</p>
    <h2>{title}</h2>
    <p class="hero-lede">{lede}</p>
  </div>
  <div class="teacher-access-panel">
    <p>
      Students join with
      <button class="join-code-copy" type="button" title="Copy join code" aria-label="Copy join code {joinCode}" onclick={copyJoinCode}>
        <strong>{joinCode}</strong>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>
    </p>
    <div class="class-code-actions">
      <button class="teacher-secondary-button" type="button" onclick={shareJoinLink}>Copy join link</button>
      <button class="teacher-secondary-button" type="button" onclick={onViewAsStudent}>View as Student</button>
    </div>
  </div>
</section>

<nav class="store-tabs" aria-label="Store pages">
  <span class="store-tabs-label">Store pages</span>
  <div class="store-tab-list">
    <button class:active={page === 'prices'} aria-current={page === 'prices' ? 'page' : undefined} type="button" onclick={() => onGo('prices')}>Prices and stock</button>
    {#if shop.store?.couponsEnabled}
      <button class:active={page === 'coupons'} aria-current={page === 'coupons' ? 'page' : undefined} type="button" onclick={() => onGo('coupons')}>Coupons</button>
    {/if}
    <button class:active={page === 'settings'} aria-current={page === 'settings' ? 'page' : undefined} type="button" onclick={() => onGo('settings')}>Store settings</button>
  </div>
</nav>
