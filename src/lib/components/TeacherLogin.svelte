<script lang="ts">
  import { t } from '$lib/i18n/index.svelte'
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
          ? errorMessage(error, t('login.signupFailed'))
          : errorMessage(error, t('login.signinFailed'))
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
    <p class="welcome-kicker">{t('login.kicker')}</p>
    {#if showSignup}
      <h1>{t('login.signupTitle')}</h1>
      <p>{t('login.signupBody')}</p>
      <label>{t('login.name')}<input bind:value={displayName} type="text" maxlength="80" placeholder={t('login.namePlaceholder')} required /></label>
    {:else}
      <h1>{t('login.signinTitle')}</h1>
      <p>{t('login.signinBody')}</p>
    {/if}
    <label>{t('login.email')}<input bind:value={email} type="email" autocomplete="email" placeholder={t('login.emailPlaceholder')} required /></label>
    <label>
      {t('login.password')}
      <input
        bind:value={password}
        type="password"
        autocomplete={showSignup ? 'new-password' : 'current-password'}
        minlength={showSignup ? 8 : undefined}
        placeholder={showSignup ? t('login.passwordNew') : t('login.passwordCurrent')}
        required
      />
    </label>
    {#if teacher.message}<p class="login-error" role="alert">{teacher.message}</p>{/if}
    <button class="primary-button teacher-login-submit" type="submit" disabled={teacher.busy}>
      {showSignup ? t('login.createAccount') : t('login.signIn')}
    </button>
    {#if showSignup}
      <button class="teacher-link-button" type="button" onclick={() => show(false)}>{t('login.haveAccount')}</button>
    {:else}
      <button class="teacher-link-button" type="button" onclick={() => show(true)}>{t('login.needAccount')}</button>
      <button class="teacher-link-button" type="button" onclick={onBackHome}>{t('login.backHome')}</button>
    {/if}
  </form>
</main>
