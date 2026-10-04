<script lang="ts">
  import { onMount } from 'svelte'
  import StorePreview from '$lib/components/StorePreview.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { shop } from '$lib/shop.svelte'
  import { storeColors, type UnitPricing } from '$lib/store'

  /**
   * How the store looks: its name, colour and shelf tags, with the store
   * itself beside the form. Every change applies as it is made, so the
   * preview is always the store the class will see.
   */
  let { isNew = false }: { isNew?: boolean } = $props()

  let nameInput = $state<HTMLInputElement>()

  const tagOptions: Array<{ value: UnitPricing; label: string }> = $derived([
    { value: 'unit', label: t('settings.unitPricingUnit') },
    { value: 'size', label: t('settings.unitPricingSize') },
    { value: 'off', label: t('settings.unitPricingOff') },
  ])

  // A store that was just created is called "New store" until the teacher
  // names it, so the name is ready to be typed over.
  onMount(() => {
    if (isNew) nameInput?.select()
  })

  /** A store always keeps a name: a cleared box leaves the last one in place. */
  function rename(value: string) {
    const name = value.trim().slice(0, 60)
    if (shop.store && name) shop.store.name = name
  }
</script>

{#if shop.store}
  <div class="store-settings-page">
    <form class="store-settings-form" onsubmit={(event) => event.preventDefault()}>
      <label>
        {t('settings.name')}
        <input bind:this={nameInput} value={shop.store.name} type="text" maxlength="60" placeholder={t('settings.namePlaceholder')} oninput={(event) => rename(event.currentTarget.value)} />
      </label>

      <fieldset class="color-choices">
        <legend>{t('settings.color')}</legend>
        {#each storeColors as color (color)}
          <label class="color-choice" data-color={color} title={t(`color.${color}`)}>
            <input class="visually-hidden" type="radio" name="color" value={color} bind:group={shop.store.color} />
            <span aria-hidden="true"></span>
            <span class="visually-hidden">{t(`color.${color}`)}</span>
          </label>
        {/each}
      </fieldset>

      <fieldset>
        <legend>{t('settings.unitPricing')}</legend>
        {#each tagOptions as option (option.value)}
          <label><input type="radio" name="unit-pricing" value={option.value} bind:group={shop.store.unitPricing} /> {option.label}</label>
        {/each}
      </fieldset>
    </form>

    <StorePreview store={shop.store} />
  </div>
{/if}
