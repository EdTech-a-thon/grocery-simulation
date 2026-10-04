<script lang="ts">
  import type { Snippet } from 'svelte'
  import LanguagePicker from './LanguagePicker.svelte'
  import { shop } from '$lib/shop.svelte'

  /** `title` is left out on a page that names itself in its own heading. */
  let { title = '', onHome, nav }: {
    title?: string
    onHome: () => void
    nav: Snippet
  } = $props()
</script>

<header class="app-header">
  <div>
    <button class="brand-button" type="button" onclick={onHome}>
      <img src="/logo.svg" alt="" width="20" height="20" />Class Grocery
    </button>
    {#if shop.store}
      <span class="store-chip" data-color={shop.store.color}>{shop.store.name}</span>
    {/if}
  </div>
  {#if title}<h1>{title}</h1>{:else}<span></span>{/if}
  <nav>{@render nav()}<LanguagePicker /></nav>
</header>
