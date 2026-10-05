<script lang="ts">
  import Icon from './Icon.svelte'
  import ShelfProduct from './ShelfProduct.svelte'
  import { chunkItems, shelfCapacity, type AisleConfig, type ShelfItem } from '$lib/catalog'
  import { aisleTitle, t } from '$lib/i18n/index.svelte'
  import { productById } from '$lib/products'
  import { priceFor } from '$lib/shop.svelte'

  let { aisle, aisleNumber, aisleNames, onNavigate, onSelect }: {
    aisle: AisleConfig
    aisleNumber: number
    aisleNames: string[]
    onNavigate: (step: number) => void
    onSelect: (index: number) => void
  } = $props()

  /** Where the three shelves are in groceryshelf.svg, as percentages of its
   *  height: the top of the space above each shelf and the shelf's front edge,
   *  which is where the products stand and the price tags hang. */
  const shelfBoards = [
    { top: 17.3, front: 35.4 },
    { top: 37.6, front: 59.4 },
    { top: 61.6, front: 81.2 },
  ]
  const perShelf = shelfCapacity / shelfBoards.length

  /** Each shelf unit holds twelve slots, four to a shelf, padded with gaps when the aisle runs out. */
  const shelves = $derived(chunkItems(aisle.items, shelfCapacity).map((group) => {
    const slots: Array<ShelfItem | null> = group.map((item) => {
      const product = productById[item.id]
      return product ? { ...product, price: priceFor(item), aisleTitle: aisle.title, sale: item.sale } : null
    })
    while (slots.length < shelfCapacity) slots.push(null)
    return chunkItems(slots, perShelf)
  }))
</script>

<section class="shelf-stage">
  <!-- The aisle's name is the dropdown: an invisible list sits on top of it,
       so a click anywhere on the name opens the usual-size menu of aisles. -->
  <div class="shelf-topline">
    {#if aisleNames.length > 1}
      <button class="nav-arrow" type="button" aria-label={t('shelf.previousAisle')} onclick={() => onNavigate(-1)}><span>&lsaquo;</span></button>
    {/if}
    <div class="aisle-title">
      <h2>{t('shelf.aisleHeading', { number: aisleNumber, title: aisleTitle(aisle.title) })}</h2>
      {#if aisleNames.length > 1}
        <Icon name="chevron-down" />
        <select aria-label={t('shelf.goToAisle')} value={aisleNumber - 1} onchange={(event) => onSelect(Number(event.currentTarget.value))}>
          {#each aisleNames as name, index}
            <option value={index}>{t('shelf.aisleOption', { number: index + 1, title: aisleTitle(name) })}</option>
          {/each}
        </select>
      {/if}
    </div>
    {#if aisleNames.length > 1}
      <button class="nav-arrow" type="button" aria-label={t('shelf.nextAisle')} onclick={() => onNavigate(1)}><span>&rsaquo;</span></button>
    {/if}
  </div>
  <div class="shelf-row" style="--shelf-units:{shelves.length}">
    {#each shelves as rows, index (index)}
      <section class="shelf-unit" aria-label={t('shelf.unit', { number: index + 1 })}>
        <div class="shelf-skin" style="background-image:url('/groceryshelf.svg')"></div>
        {#each rows as slots, row (row)}
          <div class="shelf-board" style="top:{shelfBoards[row].top}%;height:{shelfBoards[row].front - shelfBoards[row].top}%">
            {#each slots as item, slot (slot)}
              {#if item}
                <ShelfProduct {item} />
              {:else}
                <div class="shelf-slot shelf-slot-empty" aria-hidden="true"></div>
              {/if}
            {/each}
          </div>
        {/each}
      </section>
    {/each}
  </div>
</section>
