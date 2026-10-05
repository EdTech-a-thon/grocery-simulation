<script lang="ts">
  import { money } from '$lib/catalog'
  import { formatCouponItem } from '$lib/coupons'
  import { productName, t } from '$lib/i18n/index.svelte'
  import { productById } from '$lib/products'
  import { shop } from '$lib/shop.svelte'
  import type { Coupon } from '$lib/store'

  let { coupon }: { coupon: Coupon } = $props()

  const product = $derived(coupon.productId === 'all' ? null : productById[coupon.productId])
  const amount = $derived(coupon.discountType === 'dollars' ? money(coupon.discountAmount) : `${coupon.discountAmount}%`)

  /**
   * Stripes that make the code look like a real coupon's barcode. They are only
   * decoration, but they come from the code itself so every coupon's differ.
   */
  const bars = $derived.by(() => {
    const widths = [...coupon.code].flatMap((char) => {
      const value = char.charCodeAt(0)
      return [1 + (value % 3), 1 + ((value >> 2) % 2), 1 + ((value >> 3) % 3), 1 + ((value >> 5) % 2)]
    })
    let x = 0
    return widths.map((width, index) => {
      const bar = { x, width, ink: index % 2 === 0 }
      x += width
      return bar
    })
  })
  const barsWidth = $derived(bars.reduce((total, bar) => total + bar.width, 0))
</script>

<article class="print-coupon">
  <div class="coupon-card">
    <header class="coupon-brand">
      <span>{shop.store?.name ?? t('print.defaultStore')}</span>
      <span class="coupon-tag">{t('print.couponHeading')}</span>
    </header>
    <div class="coupon-body">
      <div class="coupon-art">
        {#if product}
          <img src={product.image} alt={productName(coupon.productId)} />
        {:else}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 4h2.2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.76L20.4 7H6.2" />
            <circle cx="9.5" cy="19" r="1.5" />
            <circle cx="17" cy="19" r="1.5" />
          </svg>
        {/if}
      </div>
      <div class="coupon-deal">
        <p class="coupon-amount">{amount} <span>{t('print.couponOff')}</span></p>
        <p class="coupon-item">{t('print.couponItem', { item: formatCouponItem(coupon) })}</p>
      </div>
    </div>
    <footer class="coupon-code-row">
      <div class="coupon-code">
        <small>{t('print.couponCode')}</small>
        <strong>{coupon.code}</strong>
      </div>
      <svg class="coupon-barcode" viewBox="0 0 {barsWidth} 10" preserveAspectRatio="none" aria-hidden="true">
        {#each bars as bar, index (index)}
          {#if bar.ink}<rect x={bar.x} width={bar.width} height="10" />{/if}
        {/each}
      </svg>
    </footer>
  </div>
</article>
