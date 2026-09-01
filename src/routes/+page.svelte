<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import AppHeader from '$lib/components/AppHeader.svelte'
  import StoreFront from '$lib/components/StoreFront.svelte'
  import StoreScene from '$lib/components/StoreScene.svelte'
  import SiteFooter from '$lib/components/SiteFooter.svelte'
  import { cartTotals } from '$lib/cart.svelte'
  import { joinStore, rememberStudentJoinCode, shop } from '$lib/shop.svelte'

  type Screen = 'welcome' | 'dashboard' | 'store'

  let screen = $state<Screen>('welcome')
  let joinCodeInput = $state('')
  let message = $state('')
  let busy = $state(false)
  let joinInput = $state<HTMLInputElement | null>(null)

  const itemCount = $derived(cartTotals().totalItems)

  // A student who joined earlier comes straight back to their class store.
  onMount(async () => {
    if (!shop.studentJoinCode) return
    if (await joinStore(shop.studentJoinCode)) screen = 'dashboard'
  })

  /** The landing page is long, so its lower buttons send the class back up to the code box. */
  function focusJoin() {
    joinInput?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    joinInput?.focus({ preventScroll: true })
  }

  async function joinWithCode() {
    if (busy) return
    busy = true
    try {
      if (!(await joinStore(joinCodeInput))) {
        message = 'That store code was not found. Check the code with your teacher.'
        return
      }
      rememberStudentJoinCode(joinCodeInput)
      message = ''
      screen = 'dashboard'
    } finally {
      busy = false
    }
  }
</script>

{#if screen === 'welcome'}
  <main class="landing-page">
    <section class="landing-hero" aria-labelledby="welcome-title">
      <StoreScene />
      <div class="landing-hero-content">
        <p class="landing-hero-kicker">Real-life grocery shopping</p>
        <h1 id="welcome-title">ClassGrocery</h1>
        <p class="landing-hero-intro">
          A grocery store you run for your class. Teachers set the prices and the coupons.
          Students shop on a budget and read the receipt.
        </p>
        <div class="join-panel">
          <label class="join-panel-label" for="store-code">Store code</label>
          <div class="join-panel-row">
            <input
              id="store-code"
              bind:this={joinInput}
              type="text"
              placeholder="OTTER-P3"
              autocapitalize="characters"
              bind:value={joinCodeInput}
              onkeydown={(event) => { if (event.key === 'Enter') void joinWithCode() }}
            />
            <button type="button" disabled={busy} onclick={joinWithCode}>Join store</button>
          </div>
          <small>Type the code your teacher gives you. The dash is optional.</small>
          {#if message}<p class="join-panel-error" role="alert">{message}</p>{/if}
        </div>
        <button class="landing-teacher-link" type="button" onclick={() => goto('/teacher')}>
          Teacher sign in <span aria-hidden="true">&rarr;</span>
        </button>
      </div>
    </section>

    <section class="landing-band landing-steps-band" aria-labelledby="how-title">
      <div class="landing-inner">
        <h2 id="how-title" class="visually-hidden">How it works</h2>
        <ol class="landing-steps">
          <li>
            <span class="landing-step-number" aria-hidden="true">1</span>
            <h3>Build the store</h3>
            <p>Choose what it stocks, what it charges, and which coupons it prints.</p>
          </li>
          <li>
            <span class="landing-step-number" aria-hidden="true">2</span>
            <h3>Share the code</h3>
            <p>Each class gets a code like <code>OTTER-P3</code>, and a link that opens it.</p>
          </li>
          <li>
            <span class="landing-step-number" aria-hidden="true">3</span>
            <h3>Shop the aisles</h3>
            <p>Students fill a cart, clip coupons and check out with a receipt.</p>
          </li>
        </ol>
      </div>
    </section>

    <section class="landing-band landing-roles-band" aria-labelledby="roles-title">
      <div class="landing-inner landing-roles">
        <h2 id="roles-title" class="visually-hidden">What teachers and students can do</h2>
        <article class="landing-role landing-role-teacher">
          <p class="landing-eyebrow">For teachers</p>
          <h3>You set the prices</h3>
          <ul class="landing-list">
            <li>Price anything, or take it off the shelf</li>
            <li>Sell name brands, the CG&nbsp;Value store brand, or both</li>
            <li>Print coupons with easy-to-type codes</li>
            <li>Turn on sales tax, per store</li>
            <li>Duplicate a store for the next class</li>
          </ul>
          <button class="landing-cta" type="button" onclick={() => goto('/teacher')}>
            Set up a store <span aria-hidden="true">&rarr;</span>
          </button>
        </article>
        <article class="landing-role landing-role-student">
          <p class="landing-eyebrow">For students</p>
          <h3>They do the shopping</h3>
          <ul class="landing-list">
            <li>Join with a code &mdash; no account needed</li>
            <li>Shop 12 aisles of 175 groceries</li>
            <li>Compare brands right on the shelf</li>
            <li>Type in a coupon code</li>
            <li>Check out with an itemized receipt</li>
          </ul>
          <button class="landing-cta landing-cta-student" type="button" onclick={focusJoin}>
            Enter a store code <span aria-hidden="true">&uarr;</span>
          </button>
        </article>
      </div>
    </section>

    <SiteFooter />
  </main>
{:else if screen === 'dashboard'}
  <main class="student-dashboard-page">
    <section class="student-dashboard-card" aria-labelledby="student-dashboard-title">
      <div class="student-dashboard-copy">
        <p class="welcome-kicker">Welcome to your class store</p>
        <h1 id="student-dashboard-title">{shop.store?.name ?? 'Class'}<br />Grocery Store</h1>
        <p>
          Plan what you want to make, walk the aisles, and compare prices before anything goes in
          your cart. Coupons stretch your budget, so bring the ones your teacher printed.
        </p>
        {#if shop.store?.joinCode}
          <p class="student-class-badge">Store code: {shop.store.joinCode}</p>
        {/if}
        <button class="student-shop-button" type="button" onclick={() => (screen = 'store')}>
          Enter the store <span aria-hidden="true">&rarr;</span>
        </button>
        {#if itemCount}
          <p class="saved-cart-note">Your cart has {itemCount} item{itemCount === 1 ? '' : 's'} waiting.</p>
        {/if}
      </div>
      <StoreScene />
    </section>
  </main>
{:else}
  <StoreFront header={studentHeader} />
{/if}

{#snippet studentHeader()}
  <AppHeader title="Class grocery challenge" role="student" onHome={() => (screen = 'dashboard')}>
    {#snippet nav()}
      <button type="button" onclick={() => (screen = 'welcome')}>Switch role</button>
    {/snippet}
  </AppHeader>
{/snippet}
