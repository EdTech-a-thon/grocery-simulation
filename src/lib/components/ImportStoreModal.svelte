<script lang="ts">
  import { t } from '$lib/i18n/index.svelte'
  import { decodeStore, encodedFromLink, storeFromFile } from '$lib/sharing'
  import type { Store } from '$lib/store'

  /**
   * Brings in a store from somewhere else: a link the class already has, or a
   * file downloaded from the store list. `fromLink` tells the caller the store
   * came from a link, whose students already have this version of it.
   */
  let { onClose, onImported }: {
    onClose: () => void
    onImported: (store: Store, fromLink: boolean) => void
  } = $props()

  let pastedLink = $state('')
  let problem = $state('')

  async function importLink(event: SubmitEvent) {
    event.preventDefault()
    const store = await decodeStore(encodedFromLink(pastedLink))
    if (store) onImported(store, true)
    else problem = t('stores.badLink')
  }

  async function importFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = '' // so choosing the same file again still counts as a choice
    if (!file) return
    const store = storeFromFile(await file.text())
    if (store) onImported(store, false)
    else problem = t('import.badFile')
  }
</script>

<svelte:window onkeydown={(event) => { if (event.key === 'Escape') onClose() }} />

<div class="store-modal-overlay" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) onClose() }}>
  <div class="store-modal import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
    <button class="store-modal-close" type="button" aria-label={t('action.close')} onclick={onClose}>&times;</button>
    <h2 id="import-title">{t('import.title')}</h2>

    <form class="import-link-form" onsubmit={importLink}>
      <label>
        {t('import.linkLabel')}
        <input required bind:value={pastedLink} type="text" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://…/shop#…" />
      </label>
      <button class="primary-button" type="submit">{t('import.linkButton')}</button>
    </form>

    <p class="import-divider"><span>{t('import.or')}</span></p>

    <label class="import-file-button">
      {t('import.fileButton')}
      <input class="visually-hidden" type="file" accept=".json,application/json" onchange={importFile} />
    </label>

    {#if problem}<p class="import-problem" role="alert">{problem}</p>{/if}
  </div>
</div>
