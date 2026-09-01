<script lang="ts">
  import { errorMessage, signIn, signUp } from '$lib/pocketbase'
  import { teacher, withBusy } from '$lib/teacher.svelte'

  let { onSignedIn, onBackHome }: { onSignedIn: () => Promise<void>; onBackHome: () => void } = $props()

  let showSignup = $state(false)
  let displayName = $state('')
  let email = $state('')
  let password = $state('')

  function submit(event: SubmitEvent) {
    event.preventDefault()
    void withBusy(async () => {
      try {
        if (showSignup) await signUp(email, password, displayName)
        else await signIn(email, password)
        teacher.message = ''
        await onSignedIn()
      } catch (error) {
        teacher.message = showSignup
          ? errorMessage(error, 'That account could not be created. Try a different email.')
          : errorMessage(error, 'That email and password did not match.')
      }
    })
  }

  function show(signup: boolean) {
    showSignup = signup
    teacher.message = ''
  }
</script>

<main class="teacher-login-page">
  <form class="teacher-login-card" onsubmit={submit}>
    <p class="welcome-kicker">Teacher area</p>
    {#if showSignup}
      <h1>Create your account</h1>
      <p>You will use this to sign in and pick up your stores on any computer.</p>
      <label>Your name<input bind:value={displayName} type="text" maxlength="80" placeholder="Ms. Rivera" required /></label>
    {:else}
      <h1>Sign in to your stores</h1>
      <p>Your stores, prices and coupons are saved to your account. Only you can see them.</p>
    {/if}
    <label>School email<input bind:value={email} type="email" autocomplete="email" placeholder="you@school.org" required /></label>
    <label>
      Password
      <input
        bind:value={password}
        type="password"
        autocomplete={showSignup ? 'new-password' : 'current-password'}
        minlength={showSignup ? 8 : undefined}
        placeholder={showSignup ? 'At least 8 characters' : 'Your password'}
        required
      />
    </label>
    {#if teacher.message}<p class="login-error" role="alert">{teacher.message}</p>{/if}
    <button class="primary-button teacher-login-submit" type="submit" disabled={teacher.busy}>
      {showSignup ? 'Create account' : 'Sign in'}
    </button>
    {#if showSignup}
      <button class="teacher-link-button" type="button" onclick={() => show(false)}>I already have an account</button>
    {:else}
      <button class="teacher-link-button" type="button" onclick={() => show(true)}>Create a teacher account</button>
      <button class="teacher-link-button" type="button" onclick={onBackHome}>Back to student sign in</button>
    {/if}
  </form>
</main>
