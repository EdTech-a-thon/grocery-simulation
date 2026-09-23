<script lang="ts">
  import { money } from '$lib/catalog'
  import { couponOffer } from '$lib/coupons'
  import { productName, t } from '$lib/i18n/index.svelte'
  import { productById } from '$lib/products'
  import type { Coupon } from '$lib/pocketbase'

  let { coupon }: { coupon: Coupon } = $props()

  const product = $derived(coupon.productId === 'all' ? null : productById[coupon.productId])
  const burst = $derived(coupon.discountType === 'dollars' ? money(coupon.discountAmount) : `${coupon.discountAmount}%`)
</script>

<article class="print-coupon">
  <div class="coupon-burst">{burst}<small>{t('print.couponOff')}</small></div>
  <div class="print-coupon-copy">
    <div class="coupon-offer">
      {#if product}
        <img class="coupon-product-image" src={product.image} alt={productName(coupon.productId)} />
      {:else}
        <span class="coupon-cart-icon" aria-hidden="true">$</span>
      {/if}
      <div>
        <p>{t('print.couponHeading')}</p>
        <h2>{couponOffer(coupon)}</h2>
      </div>
    </div>
    <div class="coupon-code-block">
      <div><small>{t('print.couponCode')}</small><strong>{coupon.code}</strong></div>
    </div>
  </div>
</article>
