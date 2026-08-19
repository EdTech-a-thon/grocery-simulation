<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import AppHeader from '$lib/components/AppHeader.svelte'
  import StoreFront from '$lib/components/StoreFront.svelte'
  import StoreScene from '$lib/components/StoreScene.svelte'
  import { cartTotals } from '$lib/cart.svelte'
  import { joinStore, rememberStudentJoinCode, shop } from '$lib/shop.svelte'

  type Screen = 'welcome' | 'dashboard' | 'store'

  let screen = $state<Screen>('welcome')
  let joinCodeInput = $state('')
  let message = $state('')
  let busy = $state(false)

  const itemCount = $derived(cartTotals().totalItems)

  // A student who joined earlier comes straight back to their class store.
  onMount(async () => {
    if (!shop.studentJoinCode) return
    if (await joinStore(shop.studentJoinCode)) screen = 'dashboard'
  })

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
  <main class="welcome-page">
    <section class="welcome-card role-welcome" aria-labelledby="welcome-title">
      <div class="welcome-copy">
        <p class="welcome-kicker">Real-life math adventure</p>
        <h1 id="welcome-title">ClassGrocery</h1>
        <p class="welcome-intro">
          Choose how you are joining today. Teachers set up their stores, prices and coupons.
          Students shop and practice checkout math.
        </p>
        {#if message}<p class="status-message" role="alert">{message}</p>{/if}
        <div class="role-actions">
          <label class="join-card">
            <span class="join-label">Store code</span>
            <div class="join-row">
              <input type="text" placeholder="ROOM-204" aria-label="Store code" bind:value={joinCodeInput} />
              <button class="role-button student-role" type="button" disabled={busy} onclick={joinWithCode}>Student join store</button>
            </div>
            <small>Students type the code their teacher gives them.</small>
          </label>
          <button class="teacher-link-button" type="button" onclick={() => goto('/teacher')}>Teacher sign in</button>
        </div>
      </div>
      <StoreScene />
    </section>
  </main>
{:else if screen === 'dashboard'}
  <main class="student-dashboard-page">
    <section class="student-dashboard-card" aria-labelledby="student-dashboard-title">
      <div class="student-dashboard-copy">
        <p class="welcome-kicker">Welcome to your class store</p>
        <h1 id="student-dashboard-title">{shop.store?.name ?? 'Fresh Market'}<br />Grocery Store</h1>
        <p>Explore the aisles, choose items for your cart, and practice real-life shopping skills at checkout.</p>
        {#if shop.studentJoinCode}
          <p class="student-class-badge">Store code: {shop.studentJoinCode}</p>
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
