<script lang="ts">
  import type { Snippet } from 'svelte'
  import StoreHeader from '$lib/components/StoreHeader.svelte'
  import { couponDiscountLabel, formatCouponItem } from '$lib/coupons'
  import {
    createCoupon, deleteCoupon, errorMessage, newCouponCode,
  } from '$lib/pocketbase'
  import { printCoupons } from '$lib/printing.svelte'
  import { productById } from '$lib/products'
  import { shop, stockedProductIds } from '$lib/shop.svelte'
  import { teacher, withBusy, type StorePage } from '$lib/teacher.svelte'

  let { header, onGo, onViewAsStudent }: {
    header: Snippet
    onGo: (next: StorePage) => void
    onViewAsStudent: () => void
  } = $props()

  let discountType = $state<'percent' | 'dollars'>('percent')
  let discountAmount = $state('10')
  let productId = $state('all')
  let couponCode = $state('')
  let randomDesigns = $state('3')
  let printTarget = $state<'all' | string | null>(null)
  let printCopies = $state<Record<string, string>>({})

  const inDollars = $derived(discountType === 'dollars')

  function copiesFor(couponId: string) {
    return Math.min(100, Math.max(1, Number(printCopies[couponId]) || 1))
  }

  function choosePrint(target: 'all' | string) {
    printTarget = printTarget === target ? null : target
    for (const coupon of target === 'all' ? shop.coupons : shop.coupons.filter((item) => item.id === target)) {
      printCopies[coupon.id] ??= '1'
    }
  }

  function openPrintPreview(coupons = shop.coupons) {
    printCoupons(coupons.map((coupon) => ({ ...coupon, copies: copiesFor(coupon.id) })))
    printTarget = null
  }

  /** Percent and dollar discounts want different limits, steps and starting values. */
  function changeDiscountType(event: Event & { currentTarget: HTMLSelectElement }) {
    discountType = event.currentTarget.value === 'dollars' ? 'dollars' : 'percent'
    discountAmount = discountType === 'dollars' ? '1.00' : '10'
  }

  function create(event: SubmitEvent) {
    event.preventDefault()
    const storeId = shop.store?.id
    if (!storeId) return
    const code = couponCode.trim().toUpperCase()
    if (!/^[A-Z0-9 .$/+%-]{3,20}$/.test(code)) {
      teacher.message = 'Use 3 to 20 letters, numbers, spaces, or simple punctuation for the coupon code.'
      return
    }
    const amount = Number(discountAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      teacher.message = 'Enter a discount greater than zero.'
      return
    }
    void withBusy(async () => {
      try {
        const coupon = await createCoupon(storeId, {
          code,
          discountType,
          discountAmount: amount,
          productId,
          startsAt: '',
          endsAt: '',
          copies: 1,
        })
        shop.coupons.push(coupon)
        teacher.message = `${coupon.code} created.`
        couponCode = ''
      } catch (error) {
        teacher.message = errorMessage(error, 'That coupon could not be created.')
      }
    })
  }

  function createRandomCoupons() {
    const storeId = shop.store?.id
    if (!storeId) return
    const designs = Math.min(10, Math.max(1, Number(randomDesigns) || 1))
    const percents = [5, 10, 15, 20, 25, 30, 40, 50]
    const productIds = ['all', ...stockedProductIds()]
    void withBusy(async () => {
      try {
        for (let index = 0; index < designs; index++) {
          shop.coupons.push(await createCoupon(storeId, {
            code: newCouponCode(),
            discountType: 'percent',
            discountAmount: percents[Math.floor(Math.random() * percents.length)],
            productId: productIds[Math.floor(Math.random() * productIds.length)],
            startsAt: '',
            endsAt: '',
            copies: 1,
          }))
        }
        teacher.message = `${designs} random coupon design${designs === 1 ? '' : 's'} created.`
      } catch (error) {
        teacher.message = errorMessage(error, 'Those coupons could not be created.')
      }
    })
  }

  function remove(couponId: string) {
    void withBusy(async () => {
      try {
        await deleteCoupon(couponId)
        shop.coupons = shop.coupons.filter((coupon) => coupon.id !== couponId)
      } catch (error) {
        teacher.message = errorMessage(error, 'That coupon could not be deleted.')
      }
    })
  }
</script>

<main class="teacher-shell">
  {@render header()}
  <StoreHeader
    page="coupons"
    title="Give your class something to budget with"
    lede="Hand these out so students practice clipping and comparing before they shop. Create coupons one at a time or generate a random set. Printable sheets hold 10 coupons per page."
    {onGo}
    {onViewAsStudent}
  />
  {#if teacher.message}<p class="status-message">{teacher.message}</p>{/if}
  <section class="coupon-workspace">
    <form class="coupon-form" onsubmit={create}>
      <div><p class="eyebrow">New coupon</p><h2>Discount details</h2></div>
      <label>
        Discount type
        <select value={discountType} onchange={changeDiscountType}>
          <option value="percent">Percent off</option>
          <option value="dollars">Dollar amount off</option>
        </select>
      </label>
      <label>
        {inDollars ? 'Dollar amount off' : 'Percent off'}
        <input
          required
          data-discount-amount
          bind:value={discountAmount}
          type="number"
          min={inDollars ? '0.01' : '1'}
          max={inDollars ? '999' : '100'}
          step={inDollars ? '0.01' : '1'}
        />
        <span class="field-suffix">{inDollars ? '$' : '%'}</span>
      </label>
      <label>
        Applies to
        <select required bind:value={productId}>
          <option value="all">Entire purchase</option>
          {#each stockedProductIds() as id (id)}
            <option value={id}>{productById[id]?.name ?? id}</option>
          {/each}
        </select>
      </label>
      <label>
        Coupon code word
        <input required bind:value={couponCode} minlength="3" maxlength="20" pattern="[A-Za-z0-9 .$/+%\-]+" placeholder="Example: SAVE10" />
        <span class="field-help">Students will type this code at checkout. It does not need to start with CG.</span>
      </label>
      <button class="primary-button" type="submit" disabled={teacher.busy}>Create coupon</button>
      <div class="random-coupon-box">
        <div><p class="eyebrow">Quick set</p><h3>Generate random coupons</h3></div>
        <label>Different coupon designs<input bind:value={randomDesigns} type="number" min="1" max="10" step="1" /></label>
        <button class="randomize-button" type="button" disabled={teacher.busy} onclick={createRandomCoupons}>Generate random coupons</button>
      </div>
    </form>
    <section class="coupon-list">
      <div class="section-heading">
        <div><p class="eyebrow">Store coupons</p><h2>{shop.coupons.length} ready to use</h2></div>
        {#if shop.coupons.length}
          <div class="print-all-panel">
            <button class="primary-button" type="button" onclick={() => choosePrint('all')}>Print all coupons to PDF</button>
            {#if printTarget === 'all'}
              <span>Choose the number of copies for each coupon below.</span>
              <button type="button" onclick={() => openPrintPreview()}>Open print preview</button>
            {/if}
          </div>
        {/if}
      </div>
      {#each shop.coupons as coupon (coupon.id)}
        <article class="coupon-summary">
          <div>
            <strong>{couponDiscountLabel(coupon)} {formatCouponItem(coupon)}</strong>
            <span>{coupon.code}</span>
          </div>
          {#if printTarget === 'all' || printTarget === coupon.id}
            <label class="coupon-copy-control">
              Copies to print
              <input type="number" min="1" max="100" step="1" bind:value={printCopies[coupon.id]} />
            </label>
          {/if}
          {#if printTarget === coupon.id}
            <button type="button" onclick={() => openPrintPreview([coupon])}>Open print preview</button>
          {:else if printTarget !== 'all'}
            <button type="button" onclick={() => choosePrint(coupon.id)}>Print</button>
          {/if}
          <button type="button" aria-label="Delete coupon {coupon.code}" onclick={() => remove(coupon.id)}>Delete</button>
        </article>
      {:else}
        <div class="empty-coupons">Your created coupons will appear here.</div>
      {/each}
    </section>
  </section>
</main>
