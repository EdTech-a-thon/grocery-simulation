<script lang="ts">
  import PrintableCoupon from './PrintableCoupon.svelte'
  import RichText from './RichText.svelte'
  import ReceiptBody from './ReceiptBody.svelte'
  import { cart } from '$lib/cart.svelte'
  import { chunkItems, money } from '$lib/catalog'
  import { couponCopies } from '$lib/coupons'
  import { current, t } from '$lib/i18n/index.svelte'
  import { closePrintSheet, printing } from '$lib/printing.svelte'
  import { buildReceipt } from '$lib/receipt'
  import { shop } from '$lib/shop.svelte'

  const job = $derived(printing.job)
  const receipt = $derived(buildReceipt())

  /** Every copy of every coupon, split into the ten that fit on a page. */
  const couponPages = $derived.by(() => {
    if (job?.kind !== 'coupons') return []
    return chunkItems(job.coupons.flatMap((coupon) => Array.from({ length: couponCopies(coupon) }, () => coupon)), 10)
  })
  const couponCount = $derived(couponPages.reduce((total, page) => total + page.length, 0))
</script>

<main class="print-sheet">
  <div class="print-toolbar">
    <button type="button" onclick={closePrintSheet}>{t('print.back')}</button>
    {#if job?.kind === 'coupons'}
      <p><RichText key="print.couponSheet" count={couponCount} /></p>
    {:else}
      <p><RichText key="print.receiptSheet" /></p>
    {/if}
    <button class="primary-button" type="button" onclick={() => window.print()}>{t('print.button')}</button>
  </div>

  {#if job?.kind === 'coupons'}
    {#each couponPages as page, pageIndex (pageIndex)}
      <section class="coupon-sheet">
        {#each page as coupon, index (index)}
          <PrintableCoupon {coupon} />
        {/each}
      </section>
    {/each}
  {:else}
    <section class="receipt-sheet">
      <article class="print-receipt">
        <header class="print-receipt-head">
          <h1>CLASSGROCERY</h1>
          <p>{shop.store?.name ?? t('print.defaultStore')}</p>
          <p>{new Date().toLocaleString(current().locale, { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </header>
        <div class="receipt-rule"></div>
        <ReceiptBody {receipt} />
        {#if shop.store?.taxEnabled}<div class="receipt-row"><span>{t('receipt.salesTaxPercent', { percent: cart.salesTax })}</span><strong>{money(receipt.salesTaxAmount)}</strong></div>{/if}
        <div class="receipt-rule"></div>
        <div class="receipt-final"><span>{t('receipt.finalTotal')}</span><strong>{money(receipt.finalTotal)}</strong></div>
        <div class="receipt-rule"></div>
        <div class="receipt-row coupon-total receipt-saved"><span>{t('receipt.savedToday')}</span><strong>{money(receipt.discount)}</strong></div>
        <footer class="print-receipt-foot"><p>{t('print.thanks')}</p></footer>
      </article>
    </section>
  {/if}
</main>
