<script lang="ts">
  import type { Snippet } from 'svelte'
  import { couponCopies, couponDiscountLabel, formatCouponItem, formatDate } from '$lib/coupons'
  import {
    createCoupon, deleteCoupon, errorMessage, fromDateInput, newCouponCode, updateCouponCopies,
  } from '$lib/pocketbase'
  import { printCoupons } from '$lib/printing.svelte'
  import { productById } from '$lib/products'
  import { shop, stockedProductIds } from '$lib/shop.svelte'
  import { teacher, withBusy } from '$lib/teacher.svelte'

  let { header }: { header: Snippet } = $props()

  let discountType = $state<'percent' | 'dollars'>('percent')
  let discountAmount = $state('10')
  let productId = $state('all')
  let startsAt = $state('')
  let endsAt = $state('')
  let copies = $state('10')
  let randomDesigns = $state('3')
  let randomCopies = $state('10')

  const inDollars = $derived(discountType === 'dollars')
  const totalPrintableCoupons = $derived(shop.coupons.reduce((total, coupon) => total + couponCopies(coupon), 0))
  const pages = $derived(Math.ceil(totalPrintableCoupons / 10))

  /** Percent and dollar discounts want different limits, steps and starting values. */
  function changeDiscountType(event: Event & { currentTarget: HTMLSelectElement }) {
    discountType = event.currentTarget.value === 'dollars' ? 'dollars' : 'percent'
    discountAmount = discountType === 'dollars' ? '1.00' : '10'
  }

  function create(event: SubmitEvent) {
    event.preventDefault()
    const storeId = shop.store?.id
    if (!storeId) return
    const starts = fromDateInput(startsAt)
    const ends = fromDateInput(endsAt)
    if (starts && ends && new Date(ends) <= new Date(starts)) {
      teacher.message = 'The ending time must be after the starting time.'
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
          code: newCouponCode(),
          discountType,
          discountAmount: amount,
          productId,
          startsAt: starts,
          endsAt: ends,
          copies: Math.min(100, Math.max(1, Number(copies) || 1)),
        })
        shop.coupons.push(coupon)
        teacher.message = `${coupon.code} created.`
        printCoupons([coupon])
      } catch (error) {
        teacher.message = errorMessage(error, 'That coupon could not be created.')
      }
    })
  }

  function createRandomCoupons() {
    const storeId = shop.store?.id
    if (!storeId) return
    const designs = Math.min(10, Math.max(1, Number(randomDesigns) || 1))
    const each = Math.min(100, Math.max(1, Number(randomCopies) || 10))
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
            copies: each,
          }))
        }
        teacher.message = `${designs} random coupon design${designs === 1 ? '' : 's'} created with ${each} copies each.`
      } catch (error) {
        teacher.message = errorMessage(error, 'Those coupons could not be created.')
      }
    })
  }

  function changeCopies(couponId: string, value: string) {
    const coupon = shop.coupons.find((item) => item.id === couponId)
    if (!coupon) return
    coupon.copies = Math.min(100, Math.max(1, Number(value) || 1))
    void updateCouponCopies(coupon.id, coupon.copies)
      .catch((error) => { teacher.message = errorMessage(error, 'That change could not be saved.') })
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
  <section class="teacher-hero coupon-hero">
    <div>
      <p class="eyebrow">Printable rewards &middot; {shop.store?.name ?? ''}</p>
      <h2>Turn savings into a classroom surprise</h2>
      <p>Create coupons manually or generate a random set. Printable sheets hold 10 coupons per page.</p>
    </div>
    {#if shop.coupons.length}
      <div class="print-all-panel">
        <strong>{totalPrintableCoupons} total coupon{totalPrintableCoupons === 1 ? '' : 's'}</strong>
        <span>{pages} PDF page{pages === 1 ? '' : 's'}</span>
        <button class="primary-button" type="button" onclick={() => printCoupons(shop.coupons)}>Print all coupons to PDF</button>
      </div>
    {/if}
  </section>
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
      <label>Starts<input bind:value={startsAt} type="datetime-local" /></label>
      <label>Ends<input bind:value={endsAt} type="datetime-local" /></label>
      <label>Number of this coupon<input required bind:value={copies} type="number" min="1" max="100" step="1" /></label>
      <button class="primary-button" type="submit" disabled={teacher.busy}>Create coupon</button>
      <div class="random-coupon-box">
        <div><p class="eyebrow">Quick surprise</p><h3>Generate random coupons</h3></div>
        <label>Different coupon designs<input bind:value={randomDesigns} type="number" min="1" max="10" step="1" /></label>
        <label>Copies of each design<input bind:value={randomCopies} type="number" min="1" max="100" step="1" /></label>
        <button class="randomize-button" type="button" disabled={teacher.busy} onclick={createRandomCoupons}>Generate random coupons</button>
      </div>
    </form>
    <section class="coupon-list">
      <div class="section-heading">
        <div><p class="eyebrow">Store coupons</p><h2>{shop.coupons.length} ready to use</h2></div>
      </div>
      {#each shop.coupons as coupon (coupon.id)}
        <article class="coupon-summary">
          <div>
            <strong>{couponDiscountLabel(coupon)} {formatCouponItem(coupon)}</strong>
            <span>{coupon.code} &middot; {formatDate(coupon.startsAt)} to {formatDate(coupon.endsAt)}</span>
          </div>
          <label class="coupon-copy-control">
            Copies
            <input
              type="number"
              min="1"
              max="100"
              step="1"
              value={couponCopies(coupon)}
              onchange={(event) => changeCopies(coupon.id, event.currentTarget.value)}
            />
          </label>
          <button type="button" onclick={() => printCoupons([coupon])}>Print</button>
          <button type="button" aria-label="Delete coupon {coupon.code}" onclick={() => remove(coupon.id)}>Delete</button>
        </article>
      {:else}
        <div class="empty-coupons">Your created coupons will appear here.</div>
      {/each}
    </section>
  </section>
</main>
