<script lang="ts">
  import { t } from '$lib/i18n/index.svelte'
  import type { Store } from '$lib/store'

  /** A little picture of the store a student is shopping in, in its colour and with its name. */
  let { store }: { store: Store } = $props()
</script>

<figure class="store-thumbnail" data-color={store.color}>
  <figcaption class="sidebar-storefront-sign">{store.name}</figcaption>
  <span class="sidebar-storefront-awning" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
  <span class="sidebar-storefront-front" aria-hidden="true">
    <span class="sidebar-storefront-window"></span>
    <span class="sidebar-storefront-door"><span>{t('store.welcomeIn')}</span></span>
    <span class="sidebar-storefront-window"></span>
  </span>
</figure>
