<script lang="ts">
  import type { Snippet } from 'svelte'
  import StoreHeader from '$lib/components/StoreHeader.svelte'
  import StoreSettingsForm from '$lib/components/StoreSettingsForm.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { shop } from '$lib/shop.svelte'
  import { teacher, type StorePage } from '$lib/teacher.svelte'

  let { header, onGo, onViewAsStudent }: {
    header: Snippet
    onGo: (next: StorePage) => void
    onViewAsStudent: () => void
  } = $props()
</script>

<main class="teacher-shell">
  {@render header()}
  <StoreHeader
    page="settings"
    title={t('settings.pageTitle')}
    lede={t('settings.pageLede')}
    {onGo}
    {onViewAsStudent}
  />
  {#if teacher.message}<p class="status-message">{teacher.message}</p>{/if}
  <section class="store-settings-workspace">
    {#key shop.store?.id}
      <StoreSettingsForm store={shop.store ?? null} />
    {/key}
  </section>
</main>
