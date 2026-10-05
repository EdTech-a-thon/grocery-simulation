<script lang="ts">
  import { t } from '$lib/i18n/index.svelte'

  let { onExit }: { onExit: () => void } = $props()
</script>

<!--
  Teachers browse their own store through the student's eyes, often while
  screen-sharing, so the usual header is replaced by something no one can
  mistake for the real thing.
-->
<header class="student-view-header">
  <h1>{t('teacher.studentView')}</h1>
  <button type="button" onclick={onExit}>{t('teacher.exitStudentView')}</button>
</header>
