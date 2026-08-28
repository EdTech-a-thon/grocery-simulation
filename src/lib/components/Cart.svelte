<script lang="ts">
  import CouponScanner from './CouponScanner.svelte'
  import ReceiptBody from './ReceiptBody.svelte'
  import { cart, cartTotals, clearCart, increaseCartLine, removeFromCart } from '$lib/cart.svelte'
  import { money } from '$lib/catalog'
  import { couponDiscountLabel, couponStatus } from '$lib/coupons'
  import { printReceipt } from '$lib/printing.svelte'
  import { buildReceipt, receiptText } from '$lib/receipt'
  import { shop } from '$lib/shop.svelte'

  const maxCoupons = 5

  let couponCode = $state('')
  let message = $state('')
  let scanning = $state(false)
  let openModal = $state<'coupon' | 'checkout' | null>(null)

  const totals = $derived(cartTotals())
  const receipt = $derived(buildReceipt())
  const couponLimitReached = $derived(cart.appliedCoupons.length >= maxCoupons)

  function applyCouponCode(rawCode: string) {
    const code = rawCode.trim().toUpperCase()
    const coupon = shop.coupons.find((item) => item.code === code)
    if (!coupon) {
      message = 'That coupon code was not found in this store.'
      return
    }
    const problem = couponStatus(coupon)
    if (problem) {
      message = problem
      return
    }
    if (couponLimitReached) message = `You can apply up to ${maxCoupons} class coupons.`
    else if (cart.appliedCoupons.some((item) => item.code === coupon.code)) message = 'That coupon has already been applied.'
    else {
      cart.appliedCoupons.push(coupon)
      message = `${coupon.code} applied!`
    }
  }

  function startScanning() {
    if (!navigator.mediaDevices?.getUserMedia) {
      message = 'Camera access is not available here. Enter the code printed below the barcode.'
      return
    }
    message = ''
    scanning = true
  }

  async function copyReceipt() {
    const text = receiptText()
    try {
      await navigator.clipboard.writeText(text)
      message = 'Receipt copied.'
    } catch {
      window.prompt('Copy your receipt:', text)
    }
  }

  function closeModal() {
    openModal = null
  }
</script>

<svelte:window onkeydown={(event) => { if (event.key === 'Escape' && !scanning) closeModal() }} />

<aside class="cart-panel">
  <div class="cart-header">
    <h2>Shopping cart</h2>
    <button class="ghost" type="button" disabled={cart.lines.length === 0} onclick={clearCart}>Clear</button>
  </div>
  <p class="cart-summary">{totals.totalItems} item{totals.totalItems === 1 ? '' : 's'} in cart</p>

  <div class="cart-lines">
    {#each cart.lines as line (line.key)}
      {@const receiptLine = receipt.lines.find((item) => item.item.key === line.key)}
      {@const lineSavings = receiptLine?.coupons.reduce((sum, entry) => sum + entry.amount, 0) ?? 0}
      <div class="cart-line">
        <span class="cart-item-image" style="background-image:url('{line.image}')"></span>
        <div class="cart-item-details">
          <strong>{line.name}</strong>
          <span>{money(line.price)} each</span>
          <span class:cart-line-discounted={lineSavings > 0} class="cart-line-total">
            {line.quantity} x {money(line.price)} =
            {#if lineSavings > 0}<s>{money(line.price * line.quantity)}</s> <strong>{money(line.price * line.quantity - lineSavings)}</strong>{:else}{money(line.price * line.quantity)}{/if}
          </span>
          {#each receiptLine?.coupons ?? [] as entry (entry.coupon.id)}
            <span class="cart-line-coupon">{entry.coupon.code} · {couponDiscountLabel(entry.coupon)} · -{money(entry.amount)}</span>
          {/each}
        </div>
        <div class="cart-controls">
          <button class="ghost" type="button" aria-label="Remove one {line.name}" onclick={() => removeFromCart(line.key)}>-</button>
          <span aria-label="Quantity">{line.quantity}</span>
          <button class="ghost" type="button" aria-label="Add one more {line.name}" onclick={() => increaseCartLine(line.key)}>+</button>
        </div>
      </div>
    {:else}
      <div class="empty-cart">Click products on any shelf. Your cart stays here while you switch aisles.</div>
    {/each}
  </div>

  <div class="cart-totals">
    {#if receipt.discount > 0}
      <div><span>Shopping list total</span><strong>{money(receipt.totalPrice)}</strong></div>
      {#each receipt.purchaseCoupons as entry (entry.coupon.id)}
        <div class="cart-purchase-coupon"><span>{entry.coupon.code} · {couponDiscountLabel(entry.coupon)}</span><strong>-{money(entry.amount)}</strong></div>
      {/each}
      <div class="cart-savings"><span>Coupon savings</span><strong>-{money(receipt.discount)}</strong></div>
    {/if}
    <div class="cart-total"><span>Total bill</span><strong>{money(receipt.discountedPrice)}</strong></div>
  </div>

  <div class="cart-actions">
    {#if shop.store?.couponsEnabled}<button class="coupon-action" type="button" onclick={() => { openModal = 'coupon' }}>Apply Coupon</button>{/if}
    <button class="checkout-action" type="button" disabled={cart.lines.length === 0} onclick={() => { openModal = 'checkout' }}>Check out</button>
  </div>
</aside>

{#if openModal}
  <div class="cart-modal-overlay" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) closeModal() }}>
    <div class="cart-modal" role="dialog" aria-modal="true" aria-labelledby="cart-modal-title">
      <button class="cart-modal-close" type="button" aria-label="Close" onclick={closeModal}>&times;</button>
      {#if openModal === 'coupon'}
        <div class="coupon-checkout">
          <p class="modal-kicker">Class coupon</p>
          <h2 id="cart-modal-title">Apply a coupon</h2>
          <p>Enter the code printed below the barcode, or scan it with your camera.</p>
          <div class="coupon-entry">
            <input
              type="text"
              placeholder="Coupon code"
              aria-label="Coupon code"
              bind:value={couponCode}
              onkeydown={(event) => { if (event.key === 'Enter') applyCouponCode(couponCode) }}
            />
            <button type="button" disabled={couponLimitReached} onclick={() => applyCouponCode(couponCode)}>Apply code</button>
          </div>
          <button class="scan-button" type="button" disabled={couponLimitReached} onclick={startScanning}>Use camera to scan</button>
          <p class="coupon-count">Coupons applied: {cart.appliedCoupons.length} / {maxCoupons}</p>
          {#if message}<p class="checkout-message">{message}</p>{/if}
        </div>
      {:else}
        <section class="receipt">
          <div class="receipt-heading">
            <div>
              <p class="receipt-kicker">Grocery receipt</p>
              <h2 id="cart-modal-title">Your estimated total</h2>
            </div>
            <div class="receipt-heading-actions">
              <button class="copy-receipt" type="button" onclick={printReceipt}>Print</button>
              <button class="copy-receipt" type="button" onclick={copyReceipt}>Copy</button>
            </div>
          </div>
          <div class="receipt-rule"></div>
          <ReceiptBody {receipt} />
          {#if shop.store?.taxEnabled}<div class="receipt-input-row">
            <span>Sales tax</span>
            <span class="percent-input">
              <strong>{cart.salesTax}</strong>
              <span>%</span>
            </span>
          </div>
          <div class="receipt-row"><span>Tax amount</span><strong>{money(receipt.salesTaxAmount)}</strong></div>{/if}
          <div class="receipt-rule"></div>
          <div class="receipt-final"><span>Final total</span><strong>{money(receipt.finalTotal)}</strong></div>
          <div class="receipt-rule"></div>
          <div class="receipt-row coupon-total"><span>Total Amount Saved Today</span><strong>{money(receipt.discount)}</strong></div>
        </section>
      {/if}
    </div>
  </div>
{/if}

{#if scanning}
  <CouponScanner
    onDetected={(code) => { scanning = false; applyCouponCode(code) }}
    onClose={() => { scanning = false }}
    onError={(problem) => { scanning = false; message = problem }}
  />
{/if}
