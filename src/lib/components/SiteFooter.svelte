<script lang="ts">
  // The footer every EdTech-a-thon project carries: who built it on the left of
  // the row, and the pages a visitor goes looking for after that. The language
  // control lives at the top of every screen instead, where a reader who cannot
  // read the page yet will find it without scrolling.
  import { t } from '$lib/i18n/index.svelte'
</script>

<footer class="site-footer">
  <a
    class="site-footer-brand"
    href="https://edtechathon.com"
    target="_blank"
    rel="noopener noreferrer"
  >
    <img src="/edtechathon-logo.svg" alt="" width="24" height="24" />
    {t('footer.builtBy')}
  </a>
  <a href="/about">{t('footer.about')}</a>
  <a href="/privacy">{t('footer.privacy')}</a>
</footer>
