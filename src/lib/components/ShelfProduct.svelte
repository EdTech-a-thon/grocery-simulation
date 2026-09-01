<script lang="ts">
  import { addToCart, keyInCart, quantityInCart, removeFromCart } from '$lib/cart.svelte'
  import { money, type ShelfItem } from '$lib/catalog'

  let { item }: { item: ShelfItem } = $props()
  const quantity = $derived(quantityInCart(item))
</script>

<div class="shelf-product-card">
  <button class="shelf-product" type="button" aria-label="Add {item.name} for {money(item.price)}" onclick={() => addToCart(item)}>
    <span class="shelf-product-image" style="background-image:url('{item.image}')"></span>
    <span class="shelf-product-name">{item.name}</span>
    <span class="price-tag" class:price-tag-sale={item.sale}>{money(item.price)}</span>
    {#if quantity}
      <span class="shelf-quantity-badge" aria-label="{quantity} in cart">{quantity}</span>
    {/if}
  </button>
  <div class="shelf-quantity-controls">
    {#if quantity}
      <button class="shelf-product-minus" type="button" aria-label="Remove one {item.name}" onclick={() => removeFromCart(keyInCart(item))}>-</button>
    {/if}
    <button class="shelf-product-plus" type="button" aria-label="Add one more {item.name}" onclick={() => addToCart(item)}>+</button>
  </div>
</div>
