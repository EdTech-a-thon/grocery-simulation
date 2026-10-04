<script lang="ts">
  // Who made the site: the teacher.dev mark and its name, linking home. It
  // sits in the footer and at the start of every top bar's right-hand tools.
  import { t } from '$lib/i18n/index.svelte'

  let { size = 24 }: { size?: number } = $props()
</script>

<a class="built-by" href="https://teacher.dev" target="_blank" rel="noopener noreferrer">
  <img src="/edtechathon-logo.svg" alt="" width={size} height={size} />
  {t('footer.builtBy')}
</a>
