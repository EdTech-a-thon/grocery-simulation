<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { t } from '$lib/i18n/index.svelte'
  import { decodeStore } from '$lib/sharing'
  import { openStore, rememberStudentStore } from '$lib/shop.svelte'

  let failed = $state(false)

  // A teacher's store link lands here, with the whole store after the #.
  // Remembering it before sending the student on means the front page opens
  // straight into the store, and opens it again the next time they visit.
  onMount(async () => {
    const encoded = location.hash.slice(1)
    const store = encoded ? await decodeStore(encoded) : null
    if (!store) {
      failed = true
      return
    }
    openStore(store)
    rememberStudentStore(encoded)
    await goto('/', { replaceState: true })
  })
</script>

<main class="welcome-page">
  <section class="welcome-card">
    <div class="welcome-copy">
      {#if failed}
        <h1>{t('join.failedTitle')}</h1>
        <p class="welcome-intro">{t('join.failedBody')}</p>
        <button class="primary-button" type="button" onclick={() => void goto('/')}>{t('join.goHome')}</button>
      {:else}
        <h1>{t('join.opening')}</h1>
      {/if}
    </div>
  </section>
</main>
