<script lang="ts">
  import '../app.css'
  import PrintOverlay from '$lib/components/PrintOverlay.svelte'
  import { printing } from '$lib/printing.svelte'
  import { shop } from '$lib/shop.svelte'

  let { children } = $props()

  // Each store picks a colour, and it themes the whole page.
  $effect(() => {
    if (shop.store) document.body.dataset.storeColor = shop.store.color
    else delete document.body.dataset.storeColor
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
