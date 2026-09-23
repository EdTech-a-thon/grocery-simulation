<script lang="ts">
  import { joinPrefixPattern, normalizeJoinPrefix, suggestJoinPrefix } from '$lib/joincodes'
  import RichText from '$lib/components/RichText.svelte'
  import { t } from '$lib/i18n/index.svelte'
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
      message = t('identity.invalid')
      return
    }
    void withBusy(async () => {
      try {
        await claimJoinPrefix(cleaned)
        message = ''
        await onClaimed()
      } catch (error) {
        message = errorMessage(error, t('identity.taken'))
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
    <p class="welcome-kicker">{t('identity.kicker')}</p>
    <h1 id="identity-title">{t('identity.title')}</h1>
    <p>{t('identity.body')}</p>
    <label>
      {t('identity.label')}
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
      {t('identity.suggest')}
    </button>
    <p class="identity-preview" id="identity-preview">
      {#if valid}
        <RichText key="identity.preview" values={{ first: `${cleaned}-P3`, second: `${cleaned}-P4` }} />
      {:else}
        {t('identity.hint')}
      {/if}
    </p>
    <p class="identity-warning">{t('identity.warning')}</p>
    {#if message}<p class="login-error" role="alert">{message}</p>{/if}
    <button class="primary-button" type="submit" disabled={teacher.busy || !valid}>{t('identity.save')}</button>
  </form>
</div>
