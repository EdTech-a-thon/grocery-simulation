<script lang="ts">
  import '../app.css'
  import PrintOverlay from '$lib/components/PrintOverlay.svelte'
  import { printing } from '$lib/printing.svelte'
  import { shop } from '$lib/shop.svelte'
  import { current } from '$lib/i18n/index.svelte'

  let { children } = $props()

  // Each store picks a color, and it themes the whole page.
  $effect(() => {
    if (shop.store) document.body.dataset.storeColor = shop.store.color
    else delete document.body.dataset.storeColor
  })

  // The chosen language belongs to the document, not to one screen, so the
  // shop floor, the teacher pages and the printed receipt all read in it, and
  // a screen reader announces the page in the right voice.
  $effect(() => {
    document.documentElement.lang = current().locale
    document.documentElement.dir = current().dir
  })
</script>

{#if printing.job}
  <PrintOverlay />
{/if}

<!--
  A print sheet has the page to itself, because the print stylesheet expects
  nothing else on it. The app is hidden rather than thrown away, so a shopper
  comes back to the same aisle and the same half-filled form.
-->
<div style:display={printing.job ? 'none' : 'contents'}>
  {@render children()}
</div>
