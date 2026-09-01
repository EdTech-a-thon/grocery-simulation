<script lang="ts">
  import { money } from '$lib/catalog'
  import { couponDiscountLabel, formatCouponItem } from '$lib/coupons'
  import { productById } from '$lib/products'
  import type { Coupon } from '$lib/pocketbase'

  let { coupon }: { coupon: Coupon } = $props()

  const product = $derived(coupon.productId === 'all' ? null : productById[coupon.productId])
  const burst = $derived(coupon.discountType === 'dollars' ? money(coupon.discountAmount) : `${coupon.discountAmount}%`)
</script>

<article class="print-coupon">
  <div class="coupon-burst">{burst}<small>OFF</small></div>
  <div class="print-coupon-copy">
    <div class="coupon-offer">
      {#if product}
        <img class="coupon-product-image" src={product.image} alt={product.name} />
      {:else}
        <span class="coupon-cart-icon" aria-hidden="true">$</span>
      {/if}
      <div>
        <p>CLASSGROCERY COUPON</p>
        <h2>{couponDiscountLabel(coupon)} {formatCouponItem(coupon)}</h2>
      </div>
    </div>
    <div class="coupon-code-block">
      <div><small>COUPON CODE</small><strong>{coupon.code}</strong></div>
    </div>
  </div>
</article>
