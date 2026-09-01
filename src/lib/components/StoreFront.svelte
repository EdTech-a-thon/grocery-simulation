<script lang="ts">
  import type { Snippet } from 'svelte'
  import Cart from './Cart.svelte'
  import Shelf from './Shelf.svelte'
  import { refreshJoinedStore, shop, shoppableAisles } from '$lib/shop.svelte'

  let { asTeacher = false, header }: { asTeacher?: boolean; header: Snippet } = $props()

  const shoppable = $derived(shoppableAisles())
  // A teacher can empty the aisle a shopper is standing in, so never index past the end.
  const currentIndex = $derived(Math.min(shop.aisleIndex, Math.max(0, shoppable.length - 1)))

  function navigate(step: number) {
    if (!shoppable.length) return
    shop.aisleIndex = (currentIndex + step + shoppable.length) % shoppable.length
  }

  function selectAisle(index: number) {
    if (index >= 0 && index < shoppable.length) shop.aisleIndex = index
  }

  // Students see price changes their teacher makes while the class is shopping.
  $effect(() => {
    if (asTeacher || !shop.studentJoinCode) return
    const timer = window.setInterval(() => void refreshJoinedStore(), 10_000)
    return () => window.clearInterval(timer)
  })
</script>

<main class="storefront-shell">
  {@render header()}
  <section class="storefront">
    <div class="shelf-column">
      {#if !shoppable.length}
        <div class="empty-cart">
          This store has no items on its shelves yet.
          {asTeacher ? 'Stock some items in Prices & stock.' : 'Check back with your teacher.'}
        </div>
      {:else}
        {#if !asTeacher && shop.studentJoinCode}
          <p class="class-status">
            Shopping at: <strong>{shop.store?.name ?? shop.studentJoinCode}</strong>
            <button type="button" disabled={shop.refreshing} onclick={() => void refreshJoinedStore()}>Refresh store prices</button>
          </p>
        {/if}
        <Shelf
          aisle={shoppable[currentIndex]}
          aisleNumber={currentIndex + 1}
          aisleNames={shoppable.map((aisle) => aisle.title)}
          onNavigate={navigate}
          onSelect={selectAisle}
        />
      {/if}
    </div>
    <Cart />
  </section>
</main>
