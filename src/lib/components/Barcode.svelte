<script lang="ts">
  import { barcodeBars } from '$lib/coupons'

  let { code }: { code: string } = $props()
  const barcode = $derived(barcodeBars(code))
</script>

<svg class="coupon-barcode" viewBox="0 0 {barcode.width} 60" role="img" aria-label="Barcode {code}">
  {#each barcode.bars as bar (bar.x)}
    <rect x={bar.x} y="5" width={bar.width} height="48" />
  {/each}
</svg>
