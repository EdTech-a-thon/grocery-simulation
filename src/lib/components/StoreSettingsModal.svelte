<script lang="ts">
  import StoreSettingsForm from '$lib/components/StoreSettingsForm.svelte'
  import type { Store } from '$lib/pocketbase'

  /**
   * The settings form in a dialog. An open store edits its settings on its own
   * page instead; this is for a store that does not exist yet, and so has no
   * page to put the form on.
   */
  let { store, onClose, onCreated }: {
    store: Store | null
    onClose: () => void
    onCreated?: (created: Store) => Promise<void>
  } = $props()
</script>

<svelte:window onkeydown={(event) => { if (event.key === 'Escape') onClose() }} />

<div class="store-modal-overlay" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) onClose() }}>
  <div class="store-modal" role="dialog" aria-modal="true" aria-labelledby="store-modal-title">
    <StoreSettingsForm {store} {onClose} {onCreated} />
  </div>
</div>
