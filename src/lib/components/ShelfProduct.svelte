<script lang="ts">
  import { addToCart, keyInCart, quantityInCart, removeFromCart } from '$lib/cart.svelte'
  import { money, type ShelfItem } from '$lib/catalog'
  import { productName, t } from '$lib/i18n/index.svelte'

  let { item }: { item: ShelfItem } = $props()
  const quantity = $derived(quantityInCart(item))
  // The shelf label is looked up rather than read off the item, so the aisle
  // changes language without anything already in the cart having to move.
  const name = $derived(productName(item.id))
</script>

<div class="shelf-product-card">
  <button
    class="shelf-product"
    type="button"
    aria-label={t('product.add', { name, price: money(item.price) })}
    onclick={() => addToCart(item)}
  >
    <span class="shelf-product-image" style="background-image:url('{item.image}')"></span>
    <span class="shelf-product-name">{name}</span>
    <span class="price-tag" class:price-tag-sale={item.sale}>{money(item.price)}</span>
    {#if quantity}
      <span class="shelf-quantity-badge" aria-label={t('product.inCart', { count: quantity })}>{quantity}</span>
    {/if}
  </button>
  <div class="shelf-quantity-controls">
    {#if quantity}
      <button
        class="shelf-product-minus"
        type="button"
        aria-label={t('product.removeOne', { name })}
        onclick={() => removeFromCart(keyInCart(item))}
      >-</button>
    {/if}
    <button
      class="shelf-product-plus"
      type="button"
      aria-label={t('product.addOne', { name })}
      onclick={() => addToCart(item)}
    >+</button>
  </div>
</div>
