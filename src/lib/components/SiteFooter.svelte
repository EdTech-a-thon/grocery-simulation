<script lang="ts">
  // The footer every teacher.dev project carries: who built it on the left of
  // the row, and the pages a visitor goes looking for after that. The language
  // control lives at the top of every screen instead, where a reader who cannot
  // read the page yet will find it without scrolling.
  import BuiltBy from './BuiltBy.svelte'
  import { t } from '$lib/i18n/index.svelte'
</script>

<footer class="site-footer">
  <BuiltBy />
  <a href="/about">{t('footer.about')}</a>
  <a href="/privacy">{t('footer.privacy')}</a>
</footer>
