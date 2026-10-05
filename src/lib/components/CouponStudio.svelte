<script lang="ts">
  import CouponEditor from '$lib/components/CouponEditor.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import PrintableCoupon from '$lib/components/PrintableCoupon.svelte'
  import { couponOffer } from '$lib/coupons'
  import { t } from '$lib/i18n/index.svelte'
  import { printCoupons } from '$lib/printing.svelte'
  import { shop, stockedProductIds } from '$lib/shop.svelte'
  import { addCoupon, randomCoupon, type Coupon } from '$lib/store'

  /**
   * The store's coupons, each drawn exactly as it prints. They are added and
   * changed in a window of their own, and printed in sheets of ten.
   */
  let editor = $state<{ editing: Coupon | null } | null>(null)
  let addMenuOpen = $state(false)
  let printTarget = $state<'all' | string | null>(null)
  let printCopies = $state<Record<string, string>>({})

  const coupons = $derived(shop.store?.coupons ?? [])
  const couponsToPrint = $derived(
    printTarget === 'all'
      ? coupons
      : coupons.filter((coupon) => coupon.code === printTarget),
  )

  /** The count every coupon shares, or blank once the teacher has made them differ. */
  const sharedCopies = $derived.by(() => {
    const counts = new Set(couponsToPrint.map((coupon) => printCopies[coupon.code]))
    return counts.size === 1 ? [...counts][0] : ''
  })

  function setEveryCopies(event: Event & { currentTarget: HTMLInputElement }) {
    for (const coupon of couponsToPrint) printCopies[coupon.code] = event.currentTarget.value
  }

  function copiesFor(code: string) {
    return Math.min(100, Math.max(1, Number(printCopies[code]) || 1))
  }

  function choosePrint(target: 'all' | string) {
    printTarget = target
    for (const coupon of target === 'all' ? coupons : coupons.filter((item) => item.code === target)) {
      printCopies[coupon.code] ??= '1'
    }
  }

  function closePrintModal() {
    printTarget = null
  }

  function handlePrintModalKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') closePrintModal()
  }

  function openPrintPreview() {
    printCoupons(couponsToPrint.map((coupon) => ({ ...coupon, copies: copiesFor(coupon.code) })))
    printTarget = null
  }

  function addManual() {
    addMenuOpen = false
    editor = { editing: null }
  }

  function addRandom() {
    addMenuOpen = false
    if (!shop.store) return
    addCoupon(shop.store, randomCoupon(stockedProductIds()))
  }

  /** The add menu closes when the teacher clicks anywhere outside it. */
  function closeMenuOutside(event: MouseEvent) {
    if (addMenuOpen && !(event.target as HTMLElement).closest('.add-coupon-menu')) addMenuOpen = false
  }

  function remove(code: string) {
    if (shop.store) shop.store.coupons = shop.store.coupons.filter((coupon) => coupon.code !== code)
  }
</script>

<svelte:window
  onkeydown={(event) => {
    handlePrintModalKeydown(event)
    if (event.key === 'Escape') addMenuOpen = false
  }}
  onclick={closeMenuOutside}
/>

<section class="coupons-page">
  <div class="store-list-heading">
    <div>
      <h2>{t('coupons.title')}</h2>
      <p>{t('coupons.intro')} <strong>{t('coupons.ready', { count: coupons.length })}</strong></p>
    </div>
    <div class="store-list-actions">
      {#if coupons.length}
        <button class="teacher-secondary-button" type="button" onclick={() => choosePrint('all')}>{t('coupons.printAll')}</button>
      {/if}
      <div class="add-coupon-menu">
        <button class="primary-button" type="button" aria-haspopup="menu" aria-expanded={addMenuOpen} onclick={() => (addMenuOpen = !addMenuOpen)}>
          {t('coupons.add')}<Icon name="plus" />
        </button>
        {#if addMenuOpen}
          <div class="add-coupon-options" role="menu">
            <button role="menuitem" type="button" onclick={addManual}>
              <strong>{t('coupons.manual')}</strong><span>{t('coupons.manualHelp')}</span>
            </button>
            <button role="menuitem" type="button" onclick={addRandom}>
              <strong>{t('coupons.random')}</strong><span>{t('coupons.randomHelp')}</span>
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <div class="coupon-grid">
    {#each coupons as coupon (coupon.code)}
      <article class="coupon-tile" aria-label={couponOffer(coupon)}>
        <PrintableCoupon {coupon} />
        <div class="coupon-tile-actions">
          <button type="button" onclick={() => (editor = { editing: coupon })}>{t('coupons.edit')}</button>
          <button data-print-one-coupon type="button" onclick={() => choosePrint(coupon.code)}>{t('coupons.print')}</button>
          <button class="icon-button" data-delete-coupon type="button" title={t('coupons.delete')} aria-label={t('coupons.deleteLabel', { code: coupon.code })} onclick={() => remove(coupon.code)}>
            <Icon name="trash" />
          </button>
        </div>
      </article>
    {:else}
      <button class="store-list-empty" type="button" onclick={addManual}>{t('coupons.empty')}</button>
    {/each}
  </div>
</section>

{#if editor}
  <CouponEditor editing={editor.editing} onClose={() => (editor = null)} />
{/if}

{#if printTarget}
  <div class="modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && closePrintModal()}>
    <div class="print-coupon-modal" role="dialog" aria-modal="true" aria-labelledby="print-coupon-title">
      <div class="print-modal-heading">
        <div>
          <p class="eyebrow">{t('coupons.printEyebrow')}</p>
          <h2 id="print-coupon-title">{printTarget === 'all' ? t('coupons.printAllTitle') : t('coupons.printOneTitle')}</h2>
        </div>
        <button class="modal-close-button" type="button" aria-label={t('coupons.printCloseLabel')} onclick={closePrintModal}>×</button>
      </div>
      <p class="helper-text">{t('coupons.printHelp')}</p>
      {#if couponsToPrint.length > 1}
        <label class="coupon-copy-control coupon-copy-every">
          <span><strong>{t('coupons.copiesEach')}</strong></span>
          <input type="number" min="1" max="100" step="1" value={sharedCopies} oninput={setEveryCopies} />
        </label>
      {/if}
      <div class="print-copy-list">
        {#each couponsToPrint as coupon (coupon.code)}
          <label class="coupon-copy-control">
            <span><strong>{couponOffer(coupon)}</strong><small>{coupon.code}</small></span>
            {t('coupons.copies')}
            <input type="number" min="1" max="100" step="1" bind:value={printCopies[coupon.code]} />
          </label>
        {/each}
      </div>
      <div class="print-modal-actions">
        <button type="button" onclick={closePrintModal}>{t('action.cancel')}</button>
        <button class="primary-button" type="button" onclick={openPrintPreview}>{t('coupons.openPreview')}</button>
      </div>
    </div>
  </div>
{/if}
