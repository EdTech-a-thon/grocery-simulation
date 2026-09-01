<script lang="ts">
  import ShelfProduct from './ShelfProduct.svelte'
  import { chunkItems, shelfCapacity, type AisleConfig, type ShelfItem } from '$lib/catalog'
  import { productById } from '$lib/products'
  import { priceFor } from '$lib/shop.svelte'

  let { aisle, aisleNumber, aisleNames, onNavigate, onSelect }: {
    aisle: AisleConfig
    aisleNumber: number
    aisleNames: string[]
    onNavigate: (step: number) => void
    onSelect: (index: number) => void
  } = $props()

  /** Each shelf unit holds twelve slots, padded with gaps when the aisle runs out. */
  const shelves = $derived(chunkItems(aisle.items, shelfCapacity).map((group) => {
    const slots: Array<ShelfItem | null> = group.map((item) => {
      const product = productById[item.id]
      return product ? { ...product, price: priceFor(item), aisleTitle: aisle.title, sale: item.sale } : null
    })
    while (slots.length < shelfCapacity) slots.push(null)
    return slots
  }))
</script>

<section class="shelf-stage">
  <div class="shelf-topline">
    <div class="aisle-heading">
      <h2>Aisle {aisleNumber}: {aisle.title}</h2>
    </div>
    {#if aisleNames.length > 1}
      <div class="aisle-controls">
        <button class="nav-arrow" type="button" aria-label="Previous aisle" onclick={() => onNavigate(-1)}><span>&lsaquo;</span></button>
        <label class="aisle-picker">
          <span>Go to aisle</span>
          <select value={aisleNumber - 1} onchange={(event) => onSelect(Number(event.currentTarget.value))}>
            {#each aisleNames as name, index}
              <option value={index}>Aisle {index + 1}: {name}</option>
            {/each}
          </select>
        </label>
        <button class="nav-arrow" type="button" aria-label="Next aisle" onclick={() => onNavigate(1)}><span>&rsaquo;</span></button>
      </div>
    {/if}
  </div>
  <div class="shelf-row">
    {#each shelves as slots, index (index)}
      <section class="shelf-unit" aria-label="Shelf {index + 1}">
        <div class="shelf-skin" style="background-image:url('/groceryshelf.svg')"></div>
        <div class="shelf-grid">
          {#each slots as item, slot (slot)}
            {#if item}
              <ShelfProduct {item} />
            {:else}
              <div class="shelf-slot shelf-slot-empty" aria-hidden="true"></div>
            {/if}
          {/each}
        </div>
      </section>
    {/each}
  </div>
</section>
