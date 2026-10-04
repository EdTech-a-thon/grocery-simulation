<script lang="ts">
  import { couponOffer } from '$lib/coupons'
  import { plural, productName, t } from '$lib/i18n/index.svelte'
  import { printCoupons } from '$lib/printing.svelte'
  import { shop, stockedProductIds, syncCartToStore } from '$lib/shop.svelte'
  import { newCouponCode, type Coupon } from '$lib/store'
  import { teacher } from '$lib/teacher.svelte'

  let discountType = $state<'percent' | 'dollars'>('percent')
  let discountAmount = $state('10')
  let productId = $state('all')
  let couponCode = $state('')
  let randomDesigns = $state('3')
  let printTarget = $state<'all' | string | null>(null)
  let printCopies = $state<Record<string, string>>({})

  const coupons = $derived(shop.store?.coupons ?? [])
  const inDollars = $derived(discountType === 'dollars')
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

  /** Percent and dollar discounts want different limits, steps and starting values. */
  function changeDiscountType(event: Event & { currentTarget: HTMLSelectElement }) {
    discountType = event.currentTarget.value === 'dollars' ? 'dollars' : 'percent'
    discountAmount = discountType === 'dollars' ? '1.00' : '10'
  }

  function add(coupon: Coupon) {
    shop.store?.coupons.push(coupon)
  }

  function create(event: SubmitEvent) {
    event.preventDefault()
    const code = couponCode.trim().toUpperCase()
    if (!/^[A-Z0-9 .$/+%-]{3,20}$/.test(code)) {
      teacher.message = t('coupons.badCode')
      return
    }
    if (coupons.some((coupon) => coupon.code === code)) {
      teacher.message = t('coupons.codeTaken', { code })
      return
    }
    const amount = Number(discountAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      teacher.message = t('coupons.badAmount')
      return
    }
    add({ code, discountType, discountAmount: amount, productId, copies: 1 })
    teacher.message = t('coupons.created', { code })
    couponCode = ''
  }

  function createRandomCoupons() {
    const designs = Math.min(10, Math.max(1, Number(randomDesigns) || 1))
    const percents = [5, 10, 15, 20, 25, 30, 40, 50]
    const productIds = ['all', ...stockedProductIds()]
    for (let index = 0; index < designs; index++) {
      add({
        code: newCouponCode(),
        discountType: 'percent',
        discountAmount: percents[Math.floor(Math.random() * percents.length)],
        productId: productIds[Math.floor(Math.random() * productIds.length)],
        copies: 1,
      })
    }
    teacher.message = plural('coupons.randomCreated', designs)
  }

  // Coupons and sales tax are both settled at the checkout, so they are set
  // here, beside the coupons themselves, and take effect straight away.
  function setCouponsEnabled(enabled: boolean) {
    if (!shop.store) return
    shop.store.couponsEnabled = enabled
    syncCartToStore(shop.store)
  }

  function setTax(enabled: boolean, rateText = String(shop.store?.salesTax ?? 0)) {
    if (!shop.store) return
    shop.store.taxEnabled = enabled
    shop.store.salesTax = enabled ? Math.min(100, Math.max(0, Number(rateText) || 0)) : 0
    syncCartToStore(shop.store)
  }

  function remove(code: string) {
    if (shop.store) shop.store.coupons = shop.store.coupons.filter((coupon) => coupon.code !== code)
  }
</script>

<svelte:window onkeydown={handlePrintModalKeydown} />

<section class="checkout-settings" aria-label={t('coupons.checkoutLabel')}>
  <fieldset>
    <legend>{t('settings.coupons')}</legend>
    <label><input type="radio" name="coupons" checked={shop.store?.couponsEnabled} onchange={() => setCouponsEnabled(true)} /> {t('settings.allowCoupons')}</label>
    <label><input type="radio" name="coupons" checked={!shop.store?.couponsEnabled} onchange={() => setCouponsEnabled(false)} /> {t('settings.noCoupons')}</label>
  </fieldset>
  <fieldset>
    <legend>{t('settings.tax')}</legend>
    <label><input type="radio" name="tax" checked={!shop.store?.taxEnabled} onchange={() => setTax(false)} /> {t('settings.noTax')}</label>
    <label><input type="radio" name="tax" checked={shop.store?.taxEnabled} onchange={() => setTax(true)} /> {t('settings.useTax')}</label>
    {#if shop.store?.taxEnabled}
      <label class="tax-rate">
        {t('settings.taxRate')}
        <input type="number" min="0" max="100" step="0.01" value={shop.store.salesTax} onchange={(event) => setTax(true, event.currentTarget.value)} />
      </label>
    {/if}
  </fieldset>
</section>

{#if !shop.store?.couponsEnabled}
  <p class="empty-coupons">{t('coupons.off')}</p>
{:else}
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
      <button class="primary-button" type="submit">{t('coupons.create')}</button>
      <div class="random-coupon-box">
        <div><p class="eyebrow">{t('coupons.quickSet')}</p><h3>{t('coupons.randomTitle')}</h3></div>
        <label>{t('coupons.designs')}<input bind:value={randomDesigns} type="number" min="1" max="10" step="1" /></label>
        <button class="randomize-button" type="button" onclick={createRandomCoupons}>{t('coupons.generate')}</button>
      </div>
    </form>
    <section class="coupon-list">
      <div class="section-heading">
        <div><p class="eyebrow">{t('coupons.listEyebrow')}</p><h2>{t('coupons.ready', { count: coupons.length })}</h2></div>
        {#if coupons.length}
          <button class="primary-button" type="button" onclick={() => choosePrint('all')}>{t('coupons.printAll')}</button>
        {/if}
      </div>
      {#each coupons as coupon (coupon.code)}
        <article class="coupon-summary">
          <div>
            <strong>{couponOffer(coupon)}</strong>
            <span>{coupon.code}</span>
          </div>
          <button data-print-one-coupon type="button" onclick={() => choosePrint(coupon.code)}>{t('coupons.print')}</button>
          <button type="button" aria-label={t('coupons.deleteLabel', { code: coupon.code })} onclick={() => remove(coupon.code)}>{t('coupons.delete')}</button>
        </article>
      {:else}
        <div class="empty-coupons">{t('coupons.empty')}</div>
      {/each}
    </section>
  </section>
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
