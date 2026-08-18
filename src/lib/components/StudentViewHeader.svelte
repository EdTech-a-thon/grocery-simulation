<script lang="ts">
  let { onExit }: { onExit: () => void } = $props()
</script>

<!--
  Teachers browse their own store through the student's eyes, often while
  screen-sharing, so the usual header is replaced by something no one can
  mistake for the real thing.
-->
<header class="student-view-header">
  <h1>Student View</h1>
  <button type="button" onclick={onExit}>Exit student view</button>
</header>
