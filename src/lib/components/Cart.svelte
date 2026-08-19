<script lang="ts">
  import CouponScanner from './CouponScanner.svelte'
  import ReceiptBody from './ReceiptBody.svelte'
  import { cart, cartTotals, clearCart, increaseCartLine, removeFromCart } from '$lib/cart.svelte'
  import { money } from '$lib/catalog'
  import { couponDiscountLabel, couponStatus, formatCouponItem } from '$lib/coupons'
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
    if (!window.confirm(`Apply ${couponDiscountLabel(coupon)} ${formatCouponItem(coupon)}?`)) return
    if (couponLimitReached) message = `You can apply up to ${maxCoupons} class coupons.`
    else if (cart.appliedCoupons.some((item) => item.code === coupon.code)) message = 'That coupon has already been applied.'
    else {
      cart.appliedCoupons.push(coupon)
      message = `${coupon.code} applied!`
    }
  }

  function startScanning() {
    const canScan = 'BarcodeDetector' in window && Boolean(navigator.mediaDevices?.getUserMedia)
    if (!canScan) {
      message = 'Camera barcode scanning is blocked or unavailable. Type the code printed below the barcode instead.'
      return
    }
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
      <div class="cart-line">
        <span class="cart-item-image" style="background-image:url('{line.image}')"></span>
        <div class="cart-item-details">
          <strong>{line.name}</strong>
          <span>{money(line.price)} each</span>
          <span class="cart-line-total">{line.quantity} x {money(line.price)} = {money(line.price * line.quantity)}</span>
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

  <div class="cart-total"><span>Total bill</span><strong>{money(totals.totalPrice)}</strong></div>

  <div class="cart-actions">
    <button class="coupon-action" type="button" onclick={() => { openModal = 'coupon' }}>Apply Coupon</button>
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
          <p>Scan up to {maxCoupons} coupon barcodes or enter their printed codes.</p>
          <div class="coupon-entry">
            <input
              type="text"
              placeholder="FM-XXXXXX"
              aria-label="Coupon code"
              bind:value={couponCode}
              onkeydown={(event) => { if (event.key === 'Enter') applyCouponCode(couponCode) }}
            />
            <button type="button" disabled={couponLimitReached} onclick={() => applyCouponCode(couponCode)}>Apply</button>
          </div>
          <button class="scan-button" type="button" disabled={couponLimitReached} onclick={startScanning}>Scan with camera</button>
          <p class="coupon-count">{cart.appliedCoupons.length} of {maxCoupons} coupons applied</p>
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
          <label class="receipt-input-row">
            <span>Sales tax</span>
            <span class="percent-input">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={cart.salesTax || ''}
                onchange={(event) => { cart.salesTax = Math.max(0, Number(event.currentTarget.value) || 0) }}
              />
              <span>%</span>
            </span>
          </label>
          <div class="receipt-row"><span>Tax amount</span><strong>{money(receipt.salesTaxAmount)}</strong></div>
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
