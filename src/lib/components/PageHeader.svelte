<script lang="ts">
  // About and privacy are read by people who are not mid-shop, so they get a
  // plain masthead rather than the app's dark bar of role chips and tools.
  import LanguagePicker from './LanguagePicker.svelte'
  import { t } from '$lib/i18n/index.svelte'

  let { back = '/', backLabel = '' }: { back?: string; backLabel?: string } = $props()

  const label = $derived(backLabel || t('page.back'))
</script>

<header class="page-header">
  <a class="page-header-brand" href="/">
    <img src="/logo.svg" alt="" width="26" height="26" />ClassGrocery
  </a>
  <a class="page-header-back" href={back}><span aria-hidden="true">&larr;</span> {label}</a>
  <LanguagePicker />
</header>
