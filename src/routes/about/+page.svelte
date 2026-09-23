<script lang="ts">
  import PageHeader from '$lib/components/PageHeader.svelte'
  import RichText from '$lib/components/RichText.svelte'
  import SiteFooter from '$lib/components/SiteFooter.svelte'
  import { t } from '$lib/i18n/index.svelte'

  // Where the names written into the translated sentences point. A translator
  // moves `[words](edtechathon)` to wherever their sentence wants it.
  const links = { edtechathon: 'https://edtechathon.com' }
</script>

<svelte:head>
  <title>{t('about.title')} &middot; ClassGrocery</title>
</svelte:head>

<div class="info-page">
  <PageHeader />
  <main class="info-main">
    <h1>{t('about.title')}</h1>
    <p class="info-lede">{t('about.lede')}</p>

    <section class="info-card">
      <div class="info-card-heading">
        <img src="/edtechathon-logo.svg" alt="" width="40" height="40" />
        <h2>{t('about.community.title')}</h2>
      </div>
      <p><RichText key="about.community.body" {links} /></p>

      <figure class="info-photo">
        <img src="/edtechathon-2026.jpg" alt={t('about.community.photo')} />
        <figcaption>{t('about.community.caption')}</figcaption>
      </figure>
    </section>

    <section class="info-card">
      <h2>{t('about.promise.title')}</h2>
      <ul class="info-promise">
        <li><strong>{t('about.promise.paywalls')}</strong></li>
        <li><strong>{t('about.promise.ads')}</strong></li>
        <li><strong>{t('about.promise.tracking')}</strong></li>
      </ul>
    </section>

    <section class="info-card">
      <h2>{t('about.feedback.title')}</h2>
      <p>{t('about.feedback.body')}</p>
      <a class="info-mail-button" href="mailto:support@classgrocery.com?subject=classgrocery%20feedback">
        {t('about.feedback.button')}
      </a>
    </section>
  </main>
  <SiteFooter />
</div>
