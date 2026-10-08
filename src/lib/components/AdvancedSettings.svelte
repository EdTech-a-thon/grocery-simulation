<script lang="ts">
  import Icon from './Icon.svelte'
  import { aisles } from '$lib/catalog'
  import { plural, productName, t } from '$lib/i18n/index.svelte'
  import { isStoreBrand, productById } from '$lib/products'
  import { aisleNameFor, shop } from '$lib/shop.svelte'
  import { maxProductNameLength } from '$lib/store'

  /**
   * The settings most teachers never need, one page past the store settings.
   * For now that is giving products the names the class uses for them.
   */
  let { onBack }: { onBack: () => void } = $props()

  let search = $state('')

  // Only the name brands are listed: a CG twin takes its name brand's name, so
  // one box renames both. A product sits in the first aisle that carries it.
  const groups = $derived.by(() => {
    const listed = new Set<string>()
    return aisles.map((aisle) => {
      const ids = aisle.items.map((item) => item.id).filter((id) => !isStoreBrand(id) && !listed.has(id))
      for (const id of ids) listed.add(id)
      return { title: aisle.title, ids }
    })
  })

  /** The aisles with a product matching the search, by its catalog name or the teacher's. */
  const shownGroups = $derived.by(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return groups
    const matches = (id: string) =>
      [productName(id), shop.store?.productNames[id] ?? ''].some((name) => name.toLocaleLowerCase().includes(query))
    return groups.map((group) => ({ ...group, ids: group.ids.filter(matches) })).filter((group) => group.ids.length)
  })

  const renamedCount = $derived(Object.keys(shop.store?.productNames ?? {}).length)

  /**
   * Gives a product the teacher's name for it. A blank name, or the catalog's
   * own, puts the catalog name back, so only real renames are stored.
   */
  function renameProduct(id: string, value: string) {
    if (!shop.store) return
    const name = value.trim().slice(0, maxProductNameLength)
    if (name && name !== productName(id)) shop.store.productNames[id] = name
    else delete shop.store.productNames[id]
  }
</script>

{#if shop.store}
  <div class="advanced-settings">
    <button class="advanced-back" type="button" onclick={onBack}><Icon name="back" />{t('advanced.back')}</button>

    <section class="product-names" aria-labelledby="product-names-heading">
      <div class="section-heading">
        <div>
          <p class="eyebrow">{t('teacher.advancedTitle')}</p>
          <h2 id="product-names-heading">{t('advanced.productNamesTitle')}</h2>
        </div>
        {#if renamedCount}<span class="product-names-count">{plural('advanced.renamedCount', renamedCount)}</span>{/if}
      </div>
      <p class="helper-text">{t('advanced.productNamesHelp')}</p>

      <label class="product-name-search">
        <span class="visually-hidden">{t('advanced.search')}</span>
        <input type="search" placeholder={t('advanced.search')} bind:value={search} />
      </label>

      {#each shownGroups as group (group.title)}
        <h3 class="product-names-aisle">{aisleNameFor(group.title)}</h3>
        <ul class="product-name-list">
          {#each group.ids as id (id)}
            {@const original = productName(id)}
            {@const renamed = shop.store.productNames[id]}
            <li class:renamed>
              <img src={productById[id].image} alt="" />
              <span class="product-name-original">{original}</span>
              <input
                type="text"
                maxlength={maxProductNameLength}
                value={renamed ?? ''}
                placeholder={original}
                aria-label={t('advanced.newName', { name: original })}
                onkeydown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
                onchange={(event) => renameProduct(id, event.currentTarget.value)}
              />
              {#if renamed}
                <button type="button" aria-label={t('advanced.resetName', { name: original })} title={t('advanced.resetName', { name: original })} onclick={() => renameProduct(id, '')}>
                  {t('advanced.reset')}
                </button>
              {/if}
            </li>
          {/each}
        </ul>
      {:else}
        <p class="helper-text">{t('advanced.noMatches')}</p>
      {/each}
    </section>
  </div>
{/if}
