<script lang="ts">
  import ReceiptBody from './ReceiptBody.svelte'
  import { cart, cartTotals, clearCart, increaseCartLine, removeFromCart } from '$lib/cart.svelte'
  import { money } from '$lib/catalog'
  import { couponDiscountLabel, couponStatus } from '$lib/coupons'
  import { plural, productName, t } from '$lib/i18n/index.svelte'
  import { printReceipt } from '$lib/printing.svelte'
  import { buildReceipt, receiptText } from '$lib/receipt'
  import { shop } from '$lib/shop.svelte'

  const maxCoupons = 5

  let couponCode = $state('')
  let message = $state('')
  let openModal = $state<'coupon' | 'checkout' | null>(null)

  const totals = $derived(cartTotals())
  const receipt = $derived(buildReceipt())
  const couponLimitReached = $derived(cart.appliedCoupons.length >= maxCoupons)

  function applyCouponCode(rawCode: string) {
    const code = rawCode.trim().toUpperCase()
    const coupon = shop.coupons.find((item) => item.code === code)
    if (!coupon) {
      message = t('coupon.notFound')
      return
    }
    const problem = couponStatus(coupon)
    if (problem) {
      message = problem
      return
    }
    if (couponLimitReached) message = t('coupon.limitReached', { max: maxCoupons })
    else if (cart.appliedCoupons.some((item) => item.code === coupon.code)) message = t('coupon.alreadyApplied')
    else {
      cart.appliedCoupons.push(coupon)
      message = t('coupon.applied', { code: coupon.code })
    }
  }

  async function copyReceipt() {
    const text = receiptText()
    try {
      await navigator.clipboard.writeText(text)
      message = t('receipt.copied')
    } catch {
      window.prompt(t('receipt.copyPrompt'), text)
    }
  }

  function closeModal() {
    openModal = null
  }
</script>

<svelte:window onkeydown={(event) => { if (event.key === 'Escape') closeModal() }} />

<aside class="cart-panel">
  <div class="cart-header">
    <h2>{t('cart.title')}</h2>
    <button class="ghost" type="button" disabled={cart.lines.length === 0} onclick={clearCart}>{t('cart.clear')}</button>
  </div>
  <p class="cart-summary">{plural('cart.count', totals.totalItems)}</p>

  <div class="cart-lines">
    {#each cart.lines as line (line.key)}
      {@const receiptLine = receipt.lines.find((item) => item.item.key === line.key)}
      {@const lineSavings = receiptLine?.coupons.reduce((sum, entry) => sum + entry.amount, 0) ?? 0}
      <div class="cart-line">
        <span class="cart-item-image" style="background-image:url('{line.image}')"></span>
        <div class="cart-item-details">
          <strong>{productName(line.id)}</strong>
          <span>{t('cart.each', { price: money(line.price) })}</span>
          <span class:cart-line-discounted={lineSavings > 0} class="cart-line-total">
            {line.quantity} x {money(line.price)} =
            {#if lineSavings > 0}<s>{money(line.price * line.quantity)}</s> <strong>{money(line.price * line.quantity - lineSavings)}</strong>{:else}{money(line.price * line.quantity)}{/if}
          </span>
          {#each receiptLine?.coupons ?? [] as entry (entry.coupon.id)}
            <span class="cart-line-coupon">{entry.coupon.code} · {couponDiscountLabel(entry.coupon)} · -{money(entry.amount)}</span>
          {/each}
        </div>
        <div class="cart-controls">
          <button class="ghost" type="button" aria-label={t('product.removeOne', { name: productName(line.id) })} onclick={() => removeFromCart(line.key)}>-</button>
          <span aria-label={t('cart.quantity')}>{line.quantity}</span>
          <button class="ghost" type="button" aria-label={t('product.addOne', { name: productName(line.id) })} onclick={() => increaseCartLine(line.key)}>+</button>
        </div>
      </div>
    {:else}
      <div class="empty-cart">{t('cart.empty')}</div>
    {/each}
  </div>

  <div class="cart-totals">
    {#if receipt.discount > 0}
      <div><span>{t('cart.listTotal')}</span><strong>{money(receipt.totalPrice)}</strong></div>
      {#each receipt.purchaseCoupons as entry (entry.coupon.id)}
        <div class="cart-purchase-coupon"><span>{entry.coupon.code} · {couponDiscountLabel(entry.coupon)}</span><strong>-{money(entry.amount)}</strong></div>
      {/each}
      <div class="cart-savings"><span>{t('cart.savings')}</span><strong>-{money(receipt.discount)}</strong></div>
    {/if}
    <div class="cart-total"><span>{t('cart.total')}</span><strong>{money(receipt.discountedPrice)}</strong></div>
  </div>

  <div class="cart-actions">
    {#if shop.store?.couponsEnabled}<button class="coupon-action" type="button" onclick={() => { openModal = 'coupon' }}>{t('cart.applyCoupon')}</button>{/if}
    <button class="checkout-action" type="button" disabled={cart.lines.length === 0} onclick={() => { openModal = 'checkout' }}>{t('cart.checkout')}</button>
  </div>
</aside>

{#if openModal}
  <div class="cart-modal-overlay" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) closeModal() }}>
    <div class="cart-modal" role="dialog" aria-modal="true" aria-labelledby="cart-modal-title">
      <button class="cart-modal-close" type="button" aria-label={t('action.close')} onclick={closeModal}>&times;</button>
      {#if openModal === 'coupon'}
        <div class="coupon-checkout">
          <p class="modal-kicker">{t('coupon.modalKicker')}</p>
          <h2 id="cart-modal-title">{t('coupon.modalTitle')}</h2>
          <p>{t('coupon.modalBody')}</p>
          <div class="coupon-entry">
            <input
              type="text"
              placeholder={t('coupon.codeLabel')}
              aria-label={t('coupon.codeLabel')}
              bind:value={couponCode}
              onkeydown={(event) => { if (event.key === 'Enter') applyCouponCode(couponCode) }}
            />
            <button type="button" disabled={couponLimitReached} onclick={() => applyCouponCode(couponCode)}>{t('coupon.apply')}</button>
          </div>
          <p class="coupon-count">{t('coupon.appliedCount', { count: cart.appliedCoupons.length, max: maxCoupons })}</p>
          {#if message}<p class="checkout-message">{message}</p>{/if}
        </div>
      {:else}
        <section class="receipt">
          <div class="receipt-heading">
            <div>
              <p class="receipt-kicker">{t('receipt.kicker')}</p>
              <h2 id="cart-modal-title">{t('receipt.title')}</h2>
            </div>
            <div class="receipt-heading-actions">
              <button class="copy-receipt" type="button" onclick={printReceipt}>{t('receipt.print')}</button>
              <button class="copy-receipt" type="button" onclick={copyReceipt}>{t('receipt.copy')}</button>
            </div>
          </div>
          <div class="receipt-rule"></div>
          <ReceiptBody {receipt} />
          {#if shop.store?.taxEnabled}<div class="receipt-input-row">
            <span>{t('receipt.salesTax')}</span>
            <span class="percent-input">
              <strong>{cart.salesTax}</strong>
              <span>%</span>
            </span>
          </div>
          <div class="receipt-row"><span>{t('receipt.taxAmount')}</span><strong>{money(receipt.salesTaxAmount)}</strong></div>{/if}
          <div class="receipt-rule"></div>
          <div class="receipt-final"><span>{t('receipt.finalTotal')}</span><strong>{money(receipt.finalTotal)}</strong></div>
          <div class="receipt-rule"></div>
          <div class="receipt-row coupon-total"><span>{t('receipt.savedToday')}</span><strong>{money(receipt.discount)}</strong></div>
        </section>
      {/if}
    </div>
  </div>
{/if}
