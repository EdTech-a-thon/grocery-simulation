<script lang="ts">
  import PrintableCoupon from './PrintableCoupon.svelte'
  import ReceiptBody from './ReceiptBody.svelte'
  import { cart } from '$lib/cart.svelte'
  import { chunkItems, money } from '$lib/catalog'
  import { couponCopies } from '$lib/coupons'
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
    <button type="button" onclick={closePrintSheet}>Back</button>
    {#if job?.kind === 'coupons'}
      <p>{couponCount} coupons, 10 per page. Choose <strong>Save to PDF</strong> in the print window.</p>
    {:else}
      <p>Choose <strong>Save to PDF</strong> in the print window to keep a copy.</p>
    {/if}
    <button class="primary-button" type="button" onclick={() => window.print()}>Print / Save PDF</button>
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
          <h1>FRESH MART</h1>
          <p>{shop.store?.name ?? 'Classroom store'}</p>
          <p>{new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </header>
        <div class="receipt-rule"></div>
        <ReceiptBody {receipt} />
        <div class="receipt-row"><span>Sales tax ({cart.salesTax}%)</span><strong>{money(receipt.salesTaxAmount)}</strong></div>
        <div class="receipt-rule"></div>
        <div class="receipt-final"><span>Final total</span><strong>{money(receipt.finalTotal)}</strong></div>
        <div class="receipt-rule"></div>
        <div class="receipt-row coupon-total receipt-saved"><span>Total Amount Saved Today</span><strong>{money(receipt.discount)}</strong></div>
        <footer class="print-receipt-foot"><p>Thank you for shopping at Fresh Mart!</p></footer>
      </article>
    </section>
  {/if}
</main>
