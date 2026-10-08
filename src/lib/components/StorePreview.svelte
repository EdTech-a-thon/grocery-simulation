<script lang="ts">
  import { t, unitPriceText } from '$lib/i18n/index.svelte'
  import { productById } from '$lib/products'
  import { money, priceFor, productNameFor, sizeFor } from '$lib/shop.svelte'
  import { formatSize } from '$lib/sizes'
  import type { Store } from '$lib/store'

  /**
   * A small picture of the store as students meet it: its sign in its colour,
   * and a few products with the shelf tags it prints. It only shows; nothing
   * here can be bought.
   */
  let { store }: { store: Store } = $props()

  const examples = ['milk', 'cereal', 'apple']

  const items = $derived(
    examples.map((id) => {
      const price = priceFor({ id })
      const size = store.unitPricing === 'off' ? null : sizeFor(id)
      return {
        id,
        image: productById[id].image,
        name: productNameFor(id),
        price: money(price),
        size: size ? formatSize(size) : '',
        unitPrice: size && store.unitPricing === 'unit' ? unitPriceText(price, size) : '',
      }
    }),
  )
</script>

<figure class="store-preview" data-color={store.color} aria-label={t('settings.previewLabel')}>
  <figcaption>{t('settings.previewTitle')}</figcaption>
  <div class="store-preview-front">
    <p class="store-preview-sign">{store.name}</p>
    <div class="store-preview-awning" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
  </div>
  <ul class="store-preview-shelf">
    {#each items as item (item.id)}
      <li>
        <span class="shelf-product-image" style="background-image:url('{item.image}')"></span>
        <span class="store-preview-name">{item.name}</span>
        <span class="price-tag">
          {item.price}
          {#if item.size}<span class="price-tag-size">{item.size}</span>{/if}
          {#if item.unitPrice}<span class="price-tag-unit">{item.unitPrice}</span>{/if}
        </span>
      </li>
    {/each}
  </ul>
</figure>
