<script lang="ts">
  import { untrack } from 'svelte'
  import PrintableCoupon from '$lib/components/PrintableCoupon.svelte'
  import { plural, productName, t } from '$lib/i18n/index.svelte'
  import { shop, stockedProductIds } from '$lib/shop.svelte'
  import { newCouponCode, type Coupon } from '$lib/store'
  import { teacher } from '$lib/teacher.svelte'

  /**
   * The window for making coupons, or changing one. `editing` is the coupon
   * being changed, or null to add new ones: by hand, or a random batch.
   */
  let { editing, onClose }: { editing: Coupon | null; onClose: () => void } = $props()

  // The fields are seeded once, on purpose: from here on the teacher owns them.
  const seed = untrack(() => editing)
  let mode = $state<'manual' | 'random'>('manual')
  let discountType = $state<'percent' | 'dollars'>(seed?.discountType ?? 'percent')
  let discountAmount = $state(seed ? String(seed.discountAmount) : '10')
  let productId = $state(seed?.productId ?? 'all')
  let couponCode = $state(seed?.code ?? '')
  let randomDesigns = $state('3')
  let problem = $state('')

  const inDollars = $derived(discountType === 'dollars')
  const coupons = $derived(shop.store?.coupons ?? [])

  /** The coupon as the form stands, drawn exactly as it will print. */
  const draft = $derived<Coupon>({
    code: couponCode.trim().toUpperCase() || t('coupons.codePlaceholderCode'),
    discountType,
    discountAmount: Number(discountAmount) || 0,
    productId,
    copies: 1,
  })

  /** Percent and dollar discounts want different limits, steps and starting values. */
  function changeDiscountType(event: Event & { currentTarget: HTMLSelectElement }) {
    discountType = event.currentTarget.value === 'dollars' ? 'dollars' : 'percent'
    discountAmount = discountType === 'dollars' ? '1.00' : '10'
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
      teacher.message = t('coupons.updated', { code })
    } else {
      add([coupon])
      teacher.message = t('coupons.created', { code })
    }
    onClose()
  }

  function createRandom(event: SubmitEvent) {
    event.preventDefault()
    const designs = Math.min(10, Math.max(1, Number(randomDesigns) || 1))
    const percents = [5, 10, 15, 20, 25, 30, 40, 50]
    const productIds = ['all', ...stockedProductIds()]
    const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]
    add(Array.from({ length: designs }, () => ({
      code: newCouponCode(),
      discountType: 'percent' as const,
      discountAmount: pick(percents),
      productId: pick(productIds),
      copies: 1,
    })))
    teacher.message = plural('coupons.randomCreated', designs)
    onClose()
  }

  /** A store with coupons always shows students the coupon button. */
  function add(added: Coupon[]) {
    if (!shop.store) return
    shop.store.coupons.push(...added)
    shop.store.couponsEnabled = true
  }
</script>

<svelte:window onkeydown={(event) => { if (event.key === 'Escape') onClose() }} />

<div class="store-modal-overlay" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) onClose() }}>
  <div class="store-modal coupon-editor" role="dialog" aria-modal="true" aria-labelledby="coupon-editor-title">
    <button class="store-modal-close" type="button" aria-label={t('action.close')} onclick={onClose}>&times;</button>
    <h2 id="coupon-editor-title">{editing ? t('coupons.editTitle') : t('coupons.addTitle')}</h2>

    {#if !editing}
      <div class="coupon-editor-modes" role="radiogroup" aria-label={t('coupons.addTitle')}>
        <label><input type="radio" name="coupon-mode" value="manual" bind:group={mode} /> {t('coupons.manual')}</label>
        <label><input type="radio" name="coupon-mode" value="random" bind:group={mode} /> {t('coupons.random')}</label>
      </div>
    {/if}

    {#if mode === 'manual'}
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
        </div>
        <div class="coupon-editor-preview" aria-hidden="true"><PrintableCoupon coupon={draft} /></div>
        {#if problem}<p class="coupon-editor-problem" role="alert">{problem}</p>{/if}
        <div class="coupon-editor-actions">
          <button type="button" onclick={onClose}>{t('action.cancel')}</button>
          <button class="primary-button" type="submit">{editing ? t('coupons.save') : t('coupons.create')}</button>
        </div>
      </form>
    {:else}
      <form class="coupon-editor-random" onsubmit={createRandom}>
        <p>{t('coupons.randomHelp')}</p>
        <label>{t('coupons.designs')}<input bind:value={randomDesigns} type="number" min="1" max="10" step="1" /></label>
        <div class="coupon-editor-actions">
          <button type="button" onclick={onClose}>{t('action.cancel')}</button>
          <button class="primary-button" type="submit">{t('coupons.generate')}</button>
        </div>
      </form>
    {/if}
  </div>
</div>
