<script lang="ts" module>
  /**
   * How many help buttons are sitting in a page header right now. A page with
   * one there needs no floating button in the corner as well.
   */
  export const helpInHeader = $state({ count: 0 })
</script>

<script lang="ts">
  // A help affordance on every page: in the top bar, right of the language
  // control, or floating in the corner of a page that has no top bar. There
  // is nothing to troubleshoot in-app, so it hands over an address.
  import { onMount } from 'svelte'
  import RichText from './RichText.svelte'
  import { t } from '$lib/i18n/index.svelte'

  let { inHeader = false }: { inHeader?: boolean } = $props()

  let open = $state(false)

  onMount(() => {
    if (!inHeader) return
    helpInHeader.count++
    return () => helpInHeader.count--
  })

  const links = { support: 'mailto:support@teacher.dev' }
</script>

<svelte:window onkeydown={(event) => { if (event.key === 'Escape') open = false }} />

<button
  class="support-button"
  class:support-button-in-header={inHeader}
  type="button"
  aria-haspopup="dialog"
  aria-expanded={open}
  aria-label={t('support.label')}
  onclick={() => (open = !open)}
>
  ?
</button>

{#if open}
  <div
    class="modal-backdrop"
    role="presentation"
    onclick={(event) => { if (event.target === event.currentTarget) open = false }}
  >
    <div class="support-modal" role="dialog" aria-modal="true" aria-labelledby="support-modal-title">
      <div class="print-modal-heading">
        <div>
          <p class="eyebrow">{t('support.eyebrow')}</p>
          <h2 id="support-modal-title">{t('support.title')}</h2>
        </div>
        <button class="modal-close-button" type="button" aria-label={t('action.close')} onclick={() => (open = false)}>×</button>
      </div>
      <p><RichText key="support.body" {links} /></p>
    </div>
  </div>
{/if}
