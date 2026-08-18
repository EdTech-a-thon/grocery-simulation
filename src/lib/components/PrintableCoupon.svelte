<script lang="ts">
  import Barcode from './Barcode.svelte'
  import { money } from '$lib/catalog'
  import { couponDiscountLabel, formatCouponItem, formatDate } from '$lib/coupons'
  import { productById } from '$lib/products'
  import type { Coupon } from '$lib/pocketbase'

  let { coupon }: { coupon: Coupon } = $props()

  const product = $derived(coupon.productId === 'all' ? null : productById[coupon.productId])
  const burst = $derived(coupon.discountType === 'dollars' ? money(coupon.discountAmount) : `${coupon.discountAmount}%`)
</script>

<article class="print-coupon">
  <div class="coupon-burst">{burst}<small>OFF</small></div>
  {#if product}
    <img class="coupon-product-image" src={product.image} alt={product.name} />
  {:else}
    <span class="coupon-cart-icon" aria-hidden="true">$</span>
  {/if}
  <div class="print-coupon-copy">
    <p>FRESH MART CLASS COUPON</p>
    <h2>{couponDiscountLabel(coupon)} {formatCouponItem(coupon)}</h2>
    <span>Valid {formatDate(coupon.startsAt)}<br />through {formatDate(coupon.endsAt)}</span>
    <Barcode code={coupon.code} />
    <strong>{coupon.code}</strong>
  </div>
</article>
