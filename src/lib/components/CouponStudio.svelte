<script lang="ts">
  import type { Snippet } from 'svelte'
  import StoreHeader from '$lib/components/StoreHeader.svelte'
  import { couponOffer } from '$lib/coupons'
  import {
    createCoupon, deleteCoupon, errorMessage, newCouponCode,
  } from '$lib/pocketbase'
  import { plural, productName, t } from '$lib/i18n/index.svelte'
  import { printCoupons } from '$lib/printing.svelte'
  import { shop, stockedProductIds } from '$lib/shop.svelte'
  import { teacher, withBusy, type StorePage } from '$lib/teacher.svelte'

  let { header, onGo, onViewAsStudent }: {
    header: Snippet
    onGo: (next: StorePage) => void
    onViewAsStudent: () => void
  } = $props()

  let discountType = $state<'percent' | 'dollars'>('percent')
  let discountAmount = $state('10')
  let productId = $state('all')
  let couponCode = $state('')
  let randomDesigns = $state('3')
  let printTarget = $state<'all' | string | null>(null)
  let printCopies = $state<Record<string, string>>({})

  const inDollars = $derived(discountType === 'dollars')
  const couponsToPrint = $derived(
    printTarget === 'all'
      ? shop.coupons
      : shop.coupons.filter((coupon) => coupon.id === printTarget),
  )

  function copiesFor(couponId: string) {
    return Math.min(100, Math.max(1, Number(printCopies[couponId]) || 1))
  }

  function choosePrint(target: 'all' | string) {
    printTarget = target
    for (const coupon of target === 'all' ? shop.coupons : shop.coupons.filter((item) => item.id === target)) {
      printCopies[coupon.id] ??= '1'
    }
  }

  function closePrintModal() {
    printTarget = null
  }

  function handlePrintModalKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') closePrintModal()
  }

  function openPrintPreview() {
    printCoupons(couponsToPrint.map((coupon) => ({ ...coupon, copies: copiesFor(coupon.id) })))
    printTarget = null
  }

  /** Percent and dollar discounts want different limits, steps and starting values. */
  function changeDiscountType(event: Event & { currentTarget: HTMLSelectElement }) {
    discountType = event.currentTarget.value === 'dollars' ? 'dollars' : 'percent'
    discountAmount = discountType === 'dollars' ? '1.00' : '10'
  }

  function create(event: SubmitEvent) {
    event.preventDefault()
    const storeId = shop.store?.id
    if (!storeId) return
    const code = couponCode.trim().toUpperCase()
    if (!/^[A-Z0-9 .$/+%-]{3,20}$/.test(code)) {
      teacher.message = t('coupons.badCode')
      return
    }
    const amount = Number(discountAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      teacher.message = t('coupons.badAmount')
      return
    }
    void withBusy(async () => {
      try {
        const coupon = await createCoupon(storeId, {
          code,
          discountType,
          discountAmount: amount,
          productId,
          startsAt: '',
          endsAt: '',
          copies: 1,
        })
        shop.coupons.push(coupon)
        teacher.message = t('coupons.created', { code: coupon.code })
        couponCode = ''
      } catch (error) {
        teacher.message = errorMessage(error, t('coupons.createFailed'))
      }
    })
  }

  function createRandomCoupons() {
    const storeId = shop.store?.id
    if (!storeId) return
    const designs = Math.min(10, Math.max(1, Number(randomDesigns) || 1))
    const percents = [5, 10, 15, 20, 25, 30, 40, 50]
    const productIds = ['all', ...stockedProductIds()]
    void withBusy(async () => {
      try {
        for (let index = 0; index < designs; index++) {
          shop.coupons.push(await createCoupon(storeId, {
            code: newCouponCode(),
            discountType: 'percent',
            discountAmount: percents[Math.floor(Math.random() * percents.length)],
            productId: productIds[Math.floor(Math.random() * productIds.length)],
            startsAt: '',
            endsAt: '',
            copies: 1,
          }))
        }
        teacher.message = plural('coupons.randomCreated', designs)
      } catch (error) {
        teacher.message = errorMessage(error, t('coupons.randomFailed'))
      }
    })
  }

  function remove(couponId: string) {
    void withBusy(async () => {
      try {
        await deleteCoupon(couponId)
        shop.coupons = shop.coupons.filter((coupon) => coupon.id !== couponId)
      } catch (error) {
        teacher.message = errorMessage(error, t('coupons.deleteFailed'))
      }
    })
  }
</script>

<svelte:window onkeydown={handlePrintModalKeydown} />

<main class="teacher-shell">
  {@render header()}
  <StoreHeader
    page="coupons"
    title={t('coupons.pageTitle')}
    lede={t('coupons.pageLede')}
    {onGo}
    {onViewAsStudent}
  />
  {#if teacher.message}<p class="status-message">{teacher.message}</p>{/if}
  <section class="coupon-workspace">
    <form class="coupon-form" onsubmit={create}>
      <div><p class="eyebrow">{t('coupons.newEyebrow')}</p><h2>{t('coupons.detailsTitle')}</h2></div>
      <label>
        {t('coupons.type')}
        <select value={discountType} onchange={changeDiscountType}>
          <option value="percent">{t('coupons.percentOption')}</option>
          <option value="dollars">{t('coupons.dollarsOption')}</option>
        </select>
      </label>
      <label>
        {inDollars ? t('coupons.dollarsOption') : t('coupons.percentOption')}
        <input
          required
          data-discount-amount
          bind:value={discountAmount}
          type="number"
          min={inDollars ? '0.01' : '1'}
          max={inDollars ? '999' : '100'}
          step={inDollars ? '0.01' : '1'}
        />
        <span class="field-suffix">{inDollars ? '$' : '%'}</span>
      </label>
      <label>
        {t('coupons.appliesTo')}
        <select required bind:value={productId}>
          <option value="all">{t('coupons.entirePurchase')}</option>
          {#each stockedProductIds() as id (id)}
            <option value={id}>{productName(id)}</option>
          {/each}
        </select>
      </label>
      <label>
        {t('coupons.codeWord')}
        <input required bind:value={couponCode} minlength="3" maxlength="20" pattern="[A-Za-z0-9 .$/+%\-]+" placeholder={t('coupons.codePlaceholder')} />
        <span class="field-help">{t('coupons.codeHelp')}</span>
      </label>
      <button class="primary-button" type="submit" disabled={teacher.busy}>{t('coupons.create')}</button>
      <div class="random-coupon-box">
        <div><p class="eyebrow">{t('coupons.quickSet')}</p><h3>{t('coupons.randomTitle')}</h3></div>
        <label>{t('coupons.designs')}<input bind:value={randomDesigns} type="number" min="1" max="10" step="1" /></label>
        <button class="randomize-button" type="button" disabled={teacher.busy} onclick={createRandomCoupons}>{t('coupons.generate')}</button>
      </div>
    </form>
    <section class="coupon-list">
      <div class="section-heading">
        <div><p class="eyebrow">{t('coupons.listEyebrow')}</p><h2>{t('coupons.ready', { count: shop.coupons.length })}</h2></div>
        {#if shop.coupons.length}
          <button class="primary-button" type="button" onclick={() => choosePrint('all')}>{t('coupons.printAll')}</button>
        {/if}
      </div>
      {#each shop.coupons as coupon (coupon.id)}
        <article class="coupon-summary">
          <div>
            <strong>{couponOffer(coupon)}</strong>
            <span>{coupon.code}</span>
          </div>
          <button data-print-one-coupon type="button" onclick={() => choosePrint(coupon.id)}>{t('coupons.print')}</button>
          <button type="button" aria-label={t('coupons.deleteLabel', { code: coupon.code })} onclick={() => remove(coupon.id)}>{t('coupons.delete')}</button>
        </article>
      {:else}
        <div class="empty-coupons">{t('coupons.empty')}</div>
      {/each}
    </section>
  </section>
</main>

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
      <div class="print-copy-list">
        {#each couponsToPrint as coupon (coupon.id)}
          <label class="coupon-copy-control">
            <span><strong>{couponOffer(coupon)}</strong><small>{coupon.code}</small></span>
            {t('coupons.copies')}
            <input type="number" min="1" max="100" step="1" bind:value={printCopies[coupon.id]} />
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
