<script lang="ts">
  import { money } from '$lib/catalog'
  import { couponDiscountLabel } from '$lib/coupons'
  import type { Receipt } from '$lib/receipt'

  let { receipt }: { receipt: Receipt } = $props()
</script>

<div class="receipt-items">
  {#each receipt.lines as line (line.item.key)}
    <div class="receipt-item">
      <div class="receipt-row receipt-item-row">
        <span class="receipt-item-name">{line.item.name}</span>
        <span class="receipt-item-count">{line.item.quantity} &times; {money(line.item.price)}</span>
        <strong>{money(line.lineTotal)}</strong>
      </div>
      {#each line.coupons as entry (entry.coupon.id)}
        <div class="receipt-row receipt-item-coupon coupon-saving">
          <span>&#8627; {entry.coupon.code} &middot; {couponDiscountLabel(entry.coupon)}</span>
          <strong>-{money(entry.amount)}</strong>
        </div>
      {/each}
    </div>
  {:else}
    <p class="receipt-empty">Your cart is empty. Add items from the shelves to build a receipt.</p>
  {/each}
</div>
<div class="receipt-rule"></div>
<div class="receipt-row"><span>Shopping list total</span><strong>{money(receipt.totalPrice)}</strong></div>
{#each receipt.purchaseCoupons as entry (entry.coupon.id)}
  <div class="receipt-row coupon-saving">
    <span>Entire purchase &middot; {entry.coupon.code} &middot; {couponDiscountLabel(entry.coupon)}</span>
    <strong>-{money(entry.amount)}</strong>
  </div>
{/each}
<div class="receipt-row receipt-subtotal"><span>Subtotal after savings</span><strong>{money(receipt.discountedPrice)}</strong></div>
