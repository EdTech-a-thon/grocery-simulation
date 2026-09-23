<script lang="ts">
  import type { Snippet } from 'svelte'
  import LanguagePicker from './LanguagePicker.svelte'
  import { t } from '$lib/i18n/index.svelte'
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
    <button class="brand-button" type="button" onclick={onHome}>
      <img src="/logo.svg" alt="" width="20" height="20" />ClassGrocery
    </button>
    <span class="role-chip">{t(`role.${role}`)}</span>
    {#if shop.store}
      <span class="store-chip" data-color={shop.store.color}>{shop.store.name}</span>
    {/if}
  </div>
  <h1>{title}</h1>
  <nav>{@render nav()}<LanguagePicker /></nav>
</header>
