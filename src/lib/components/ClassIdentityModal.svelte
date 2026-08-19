<script lang="ts">
  import { joinPrefixPattern, normalizeJoinPrefix, suggestJoinPrefix } from '$lib/joincodes'
  import { claimJoinPrefix, errorMessage } from '$lib/pocketbase'
  import { teacher, withBusy } from '$lib/teacher.svelte'

  let { onClaimed }: { onClaimed: () => Promise<void> } = $props()

  let prefix = $state('')
  let message = $state('')

  const cleaned = $derived(normalizeJoinPrefix(prefix))
  const valid = $derived(joinPrefixPattern.test(cleaned))

  function submit(event: SubmitEvent) {
    event.preventDefault()
    if (!valid) {
      message = 'Use 3 to 12 letters or numbers.'
      return
    }
    void withBusy(async () => {
      try {
        await claimJoinPrefix(cleaned)
        message = ''
        await onClaimed()
      } catch (error) {
        message = errorMessage(error, 'That identifier is already taken. Try another one.')
      }
    })
  }
</script>

<!--
  Everything a teacher does next is built on this, so it is asked for once, on
  the way in, rather than buried in a settings screen.
-->
<div class="identity-backdrop">
  <form class="identity-card" onsubmit={submit} aria-labelledby="identity-title">
    <p class="welcome-kicker">One quick thing</p>
    <h1 id="identity-title">Choose your class identifier</h1>
    <p>
      This goes at the front of every store code you hand out, so all of your classes
      share it and you can spot your own codes at a glance. Pick something your students
      can read off the board — your room, your name, your school.
    </p>
    <label>
      Your identifier
      <input
        bind:value={prefix}
        type="text"
        maxlength="12"
        autocapitalize="characters"
        placeholder="OTTER"
        aria-describedby="identity-preview"
        required
      />
    </label>
    <button class="teacher-link-button" type="button" onclick={() => (prefix = suggestJoinPrefix())}>
      Suggest one for me
    </button>
    <p class="identity-preview" id="identity-preview">
      {#if valid}
        Your class codes will look like <strong>{cleaned}-P3</strong> and <strong>{cleaned}-P4</strong>.
      {:else}
        Between 3 and 12 letters or numbers.
      {/if}
    </p>
    <p class="identity-warning">This cannot be changed later: every store code and join link you share is built from it.</p>
    {#if message}<p class="login-error" role="alert">{message}</p>{/if}
    <button class="primary-button" type="submit" disabled={teacher.busy || !valid}>Save and continue</button>
  </form>
</div>
