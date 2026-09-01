<script lang="ts">
  // About and privacy are read by people who are not mid-shop, so they get a
  // plain masthead rather than the app's dark bar of role chips and tools.
  let { back = '/', backLabel = 'Back to ClassGrocery' }: {
    back?: string
    backLabel?: string
  } = $props()
</script>

<header class="page-header">
  <a class="page-header-brand" href="/">
    <img src="/logo.svg" alt="" width="26" height="26" />ClassGrocery
  </a>
  <a class="page-header-back" href={back}><span aria-hidden="true">&larr;</span> {backLabel}</a>
</header>
