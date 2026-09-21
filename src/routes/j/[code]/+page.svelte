<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { t } from '$lib/i18n/index.svelte'
  import { joinStore, rememberStudentJoinCode } from '$lib/shop.svelte'

  let failed = $state(false)

  // A teacher's join link lands here. Remembering the code before sending the
  // student on means the normal page opens straight into the store, exactly as
  // it would for a student who had typed the code in.
  onMount(async () => {
    const code = page.params.code ?? ''
    if (await joinStore(code)) {
      rememberStudentJoinCode(code)
      await goto('/', { replaceState: true })
      return
    }
    failed = true
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
