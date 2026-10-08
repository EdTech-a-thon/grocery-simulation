<script lang="ts">
  import { untrack } from 'svelte'
  import PrintableCoupon from '$lib/components/PrintableCoupon.svelte'
  import { currencyOf, currencySymbol, decimalsOf, fromDollars, maxPrice } from '$lib/currency'
  import { t } from '$lib/i18n/index.svelte'
  import { productNameFor, shop, stockedProductIds } from '$lib/shop.svelte'
  import { addCoupon, type Coupon } from '$lib/store'

  /**
   * The window for making a coupon by hand, or changing one. `editing` is the
   * coupon being changed, or null for a new one.
   */
  let { editing, onClose }: { editing: Coupon | null; onClose: () => void } = $props()

  // The fields are seeded once, on purpose: from here on the teacher owns them.
  const seed = untrack(() => editing)
  let discountType = $state<'percent' | 'dollars'>(seed?.discountType ?? 'percent')
  let discountAmount = $state(seed ? String(seed.discountAmount) : '10')
  let productId = $state(seed?.productId ?? 'all')
  let couponCode = $state(seed?.code ?? '')
  let problem = $state('')

  const inDollars = $derived(discountType === 'dollars')
  const currency = $derived(shop.store?.currency ?? 'USD')
  const coupons = $derived(shop.store?.coupons ?? [])

  /** The coupon as the form stands, drawn exactly as it will print. */
  const draft = $derived<Coupon>({
    code: couponCode.trim().toUpperCase() || t('coupons.codePlaceholderCode'),
    discountType,
    discountAmount: Number(discountAmount) || 0,
    productId,
    copies: 1,
  })

  /** Percent and money-off discounts want different limits, steps and starting values. */
  function changeDiscountType(event: Event & { currentTarget: HTMLSelectElement }) {
    discountType = event.currentTarget.value === 'dollars' ? 'dollars' : 'percent'
    // Money off starts at what a dollar is worth in the store's currency: $1, €0.89, ¥158.
    discountAmount = discountType === 'dollars' ? fromDollars(1, currency).toFixed(decimalsOf(currency)) : '10'
  }

  function save(event: SubmitEvent) {
    event.preventDefault()
    if (!shop.store) return
    const code = couponCode.trim().toUpperCase()
    if (!/^[A-Z0-9 .$/+%-]{3,20}$/.test(code)) {
      problem = t('coupons.badCode')
      return
    }
    if (coupons.some((coupon) => coupon.code === code && coupon.code !== editing?.code)) {
      problem = t('coupons.codeTaken', { code })
      return
    }
    const amount = Number(discountAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      problem = t('coupons.badAmount')
      return
    }
    const coupon: Coupon = { code, discountType, discountAmount: amount, productId, copies: 1 }
    if (editing) {
      shop.store.coupons = shop.store.coupons.map((existing) => (existing.code === editing.code ? coupon : existing))
    } else {
      addCoupon(shop.store, coupon)
    }
    onClose()
  }

</script>

<svelte:window onkeydown={(event) => { if (event.key === 'Escape') onClose() }} />

<div class="store-modal-overlay" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) onClose() }}>
  <div class="store-modal coupon-editor" role="dialog" aria-modal="true" aria-labelledby="coupon-editor-title">
    <button class="store-modal-close" type="button" aria-label={t('action.close')} onclick={onClose}>&times;</button>
    <h2 id="coupon-editor-title">{editing ? t('coupons.editTitle') : t('coupons.addTitle')}</h2>

    <form class="coupon-editor-manual" onsubmit={save}>
      <div class="coupon-editor-fields">
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
            min={inDollars ? currencyOf(currency).step : 1}
            max={inDollars ? maxPrice(currency) : 100}
            step={inDollars ? currencyOf(currency).step : 1}
          />
          <span class="field-suffix">{inDollars ? currencySymbol(currency) : '%'}</span>
        </label>
        <label>
          {t('coupons.appliesTo')}
          <select required bind:value={productId}>
            <option value="all">{t('coupons.entirePurchase')}</option>
            {#each stockedProductIds() as id (id)}
              <option value={id}>{productNameFor(id)}</option>
            {/each}
          </select>
        </label>
        <label>
          {t('coupons.codeWord')}
          <input required bind:value={couponCode} minlength="3" maxlength="20" pattern="[A-Za-z0-9 .$/+%\-]+" placeholder={t('coupons.codePlaceholder')} />
          <span class="field-help">{t('coupons.codeHelp')}</span>
        </label>
      </div>
      <div class="coupon-editor-preview" aria-hidden="true"><PrintableCoupon coupon={draft} /></div>
      {#if problem}<p class="coupon-editor-problem" role="alert">{problem}</p>{/if}
      <div class="coupon-editor-actions">
        <button type="button" onclick={onClose}>{t('action.cancel')}</button>
        <button class="primary-button" type="submit">{editing ? t('coupons.save') : t('coupons.create')}</button>
      </div>
    </form>
  </div>
</div>
