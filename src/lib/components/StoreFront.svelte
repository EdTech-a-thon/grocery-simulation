<script lang="ts">
  import type { Snippet } from 'svelte'
  import Cart from './Cart.svelte'
  import Shelf from './Shelf.svelte'
  import StoreThumbnail from './StoreThumbnail.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { shop, shoppableAisles } from '$lib/shop.svelte'

  let { asTeacher = false, header }: { asTeacher?: boolean; header?: Snippet } = $props()

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
</script>

<main class="storefront-shell">
  {#if header}
    {@render header()}
  {:else if shop.store}
    <!-- Students get no header, but a screen reader still needs to hear where they are. -->
    <h1 class="visually-hidden">{shop.store.name}</h1>
  {/if}
  <section class="storefront">
    <div class="shelf-column">
      {#if !shoppable.length}
        <div class="empty-cart">
          {t('store.empty')}
          {asTeacher ? t('store.emptyTeacher') : t('store.emptyStudent')}
        </div>
      {:else}
        <Shelf
          aisle={shoppable[currentIndex]}
          aisleNumber={currentIndex + 1}
          aisleNames={shoppable.map((aisle) => aisle.title)}
          onNavigate={navigate}
          onSelect={selectAisle}
        />
      {/if}
    </div>
    <div class="cart-column">
      {#if shop.store}<StoreThumbnail store={shop.store} />{/if}
      <Cart />
    </div>
  </section>
</main>
