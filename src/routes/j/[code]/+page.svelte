<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
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
        <h1>That store link did not work</h1>
        <p class="welcome-intro">
          The link may be out of date, or the store may have been deleted. Ask your teacher
          for the store code and type it on the front page.
        </p>
        <button class="primary-button" type="button" onclick={() => void goto('/')}>Go to the front page</button>
      {:else}
        <h1>Opening your class store…</h1>
      {/if}
    </div>
  </section>
</main>
