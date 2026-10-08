<script lang="ts">
  import { addToCart, quantityInCart } from '$lib/cart.svelte'
  import type { ShelfItem } from '$lib/catalog'
  import { t, unitPriceText } from '$lib/i18n/index.svelte'
  import { money, productNameFor, shop, sizeFor } from '$lib/shop.svelte'
  import { formatSize } from '$lib/sizes'

  let { item }: { item: ShelfItem } = $props()
  const quantity = $derived(quantityInCart(item))
  // The shelf label is looked up rather than read off the item, so the aisle
  // changes language without anything already in the cart having to move.
  const name = $derived(productNameFor(item.id))

  // The teacher decides how much of the arithmetic the tag does for the class.
  const unitPricing = $derived(shop.store?.unitPricing ?? 'unit')
  const size = $derived(unitPricing === 'off' ? null : sizeFor(item.id))
  const sizeText = $derived(size ? formatSize(size) : '')
  const unitText = $derived(size && unitPricing === 'unit' ? unitPriceText(item.price, size) : '')
  const label = $derived.by(() => {
    const price = money(item.price)
    if (size && unitText) {
      return t('product.addUnitPriced', { name, size: sizeText, price, unitPrice: unitPriceText(item.price, size, true) })
    }
    if (sizeText) return t('product.addSized', { name, size: sizeText, price })
    return t('product.add', { name, price })
  })
</script>

<!-- Clicking the product puts one in the cart; taking things out happens in
     the cart, as it would at a real store. -->
<div class="shelf-product-card">
  <button
    class="shelf-product"
    type="button"
    aria-label={label}
    onclick={() => addToCart(item)}
  >
    <span class="shelf-product-image" style="background-image:url('{item.image}')"></span>
    <span class="shelf-product-name">{name}</span>
    {#if quantity}
      {#key quantity}
        <span class="shelf-quantity-badge" aria-label={t('product.inCart', { count: quantity })}>{quantity}</span>
      {/key}
    {/if}
  </button>
  <span class="price-tag" class:price-tag-sale={item.sale} aria-hidden="true">
    {money(item.price)}
    {#if sizeText}<span class="price-tag-size">{sizeText}</span>{/if}
    {#if unitText}<span class="price-tag-unit">{unitText}</span>{/if}
  </span>
</div>
