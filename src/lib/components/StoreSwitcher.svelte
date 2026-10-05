<script lang="ts">
  // A student with more than one class store gets a small button in the
  // bottom-right corner that lists them all, to hop between them or take one
  // off the list. The list is a native popover, so clicking away or pressing
  // Escape closes it without any code here.
  import Icon from './Icon.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { removeStudentStore, shop, type StudentStore } from '$lib/shop.svelte'

  let { onSwitch }: { onSwitch: (encoded: string) => void } = $props()

  let list: HTMLDivElement

  function choose(entry: StudentStore) {
    list.hidePopover()
    if (entry.encoded !== shop.studentStore) onSwitch(entry.encoded)
  }

  function remove(entry: StudentStore) {
    if (!confirm(t('switcher.confirmRemove', { name: entry.name }))) return
    const wasOpen = entry.encoded === shop.studentStore
    removeStudentStore(entry.encoded)
    // The store on screen is gone, so walk into the next one on the list.
    if (wasOpen && shop.studentStores[0]) onSwitch(shop.studentStores[0].encoded)
    if (shop.studentStores.length < 2) list.hidePopover()
  }
</script>

<button class="store-switcher-button" type="button" popovertarget="store-switcher" aria-label={t('switcher.label')}>
  <Icon name="store" />
</button>

<div class="store-switcher" id="store-switcher" popover bind:this={list} aria-labelledby="store-switcher-title">
  <h2 id="store-switcher-title">{t('switcher.title')}</h2>
  <ul>
    {#each shop.studentStores as entry (entry.encoded)}
      {@const isOpen = entry.encoded === shop.studentStore}
      <li class:store-switcher-open={isOpen}>
        <button class="store-switcher-choose" type="button" aria-current={isOpen} onclick={() => choose(entry)}>
          <span class="store-switcher-swatch" data-color={entry.color} aria-hidden="true"></span>
          <span class="store-switcher-name" title={entry.name}>{entry.name}</span>
          {#if isOpen}<Icon name="check" />{/if}
        </button>
        <button
          class="store-switcher-remove"
          type="button"
          aria-label={t('switcher.remove', { name: entry.name })}
          title={t('switcher.remove', { name: entry.name })}
          onclick={() => remove(entry)}
        >
          <Icon name="trash" />
        </button>
      </li>
    {/each}
  </ul>
</div>
