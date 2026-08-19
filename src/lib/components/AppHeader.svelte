<script lang="ts">
  import type { Snippet } from 'svelte'
  import { shop } from '$lib/shop.svelte'

  let { title, role, onHome, nav }: {
    title: string
    role: 'teacher' | 'student' | 'class'
    onHome: () => void
    nav: Snippet
  } = $props()
</script>

<header class="app-header">
  <div>
    <button class="brand-button" type="button" onclick={onHome}>ClassGrocery</button>
    <span class="role-chip">{role} view</span>
    {#if shop.store}
      <span class="store-chip" data-color={shop.store.color}>{shop.store.name}</span>
    {/if}
  </div>
  <h1>{title}</h1>
  <nav>{@render nav()}</nav>
</header>
