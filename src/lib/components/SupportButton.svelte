<script lang="ts">
  // A help affordance that follows the shopper everywhere, parked out of the
  // way in the corner. There is nothing to troubleshoot in-app, so it hands
  // over an address and gets out of the way.
  import RichText from './RichText.svelte'
  import { t } from '$lib/i18n/index.svelte'

  let open = $state(false)

  const links = { support: 'mailto:support@teacher.dev' }
</script>

<svelte:window onkeydown={(event) => { if (event.key === 'Escape') open = false }} />

<button
  class="support-button"
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
