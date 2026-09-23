<script lang="ts">
  import { money } from '$lib/catalog'
  import { couponDiscountLabel } from '$lib/coupons'
  import { productName, t } from '$lib/i18n/index.svelte'
  import type { Receipt } from '$lib/receipt'

  let { receipt }: { receipt: Receipt } = $props()
</script>

<div class="receipt-items">
  {#each receipt.lines as line (line.item.key)}
    <div class="receipt-item">
      <div class="receipt-row receipt-item-row">
        <span class="receipt-item-name">{productName(line.item.id)}</span>
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
    <p class="receipt-empty">{t('receipt.empty')}</p>
  {/each}
</div>
<div class="receipt-rule"></div>
<div class="receipt-row"><span>{t('receipt.listTotal')}</span><strong>{money(receipt.totalPrice)}</strong></div>
{#each receipt.purchaseCoupons as entry (entry.coupon.id)}
  <div class="receipt-row coupon-saving">
    <span>{t('receipt.entirePurchase')} &middot; {entry.coupon.code} &middot; {couponDiscountLabel(entry.coupon)}</span>
    <strong>-{money(entry.amount)}</strong>
  </div>
{/each}
<div class="receipt-row receipt-subtotal"><span>{t('receipt.subtotal')}</span><strong>{money(receipt.discountedPrice)}</strong></div>
