<script lang="ts">
  import PageHeader from '$lib/components/PageHeader.svelte'
  import RichText from '$lib/components/RichText.svelte'
  import SiteFooter from '$lib/components/SiteFooter.svelte'
  import { t } from '$lib/i18n/index.svelte'

  const links = {
    cloudflare: 'https://www.cloudflare.com/privacypolicy/',
    support: 'mailto:support@classgrocery.com?subject=classgrocery%20privacy',
  }
</script>

<svelte:head>
  <title>{t('privacy.title')} &middot; ClassGrocery</title>
</svelte:head>

<div class="info-page">
  <PageHeader />
  <main class="info-main">
    <h1>{t('privacy.title')}</h1>
    <p class="info-lede">{t('privacy.lede')}</p>

    <section class="info-card">
      <p>{t('privacy.students')}</p>
      <p><RichText key="privacy.analytics" {links} /></p>
      <p>{t('privacy.storage')}</p>
      <p><RichText key="privacy.contact" {links} /></p>
    </section>
  </main>
  <SiteFooter />
</div>
