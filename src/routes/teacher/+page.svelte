<script lang="ts">
  import { onMount } from 'svelte'
  import { replaceState } from '$app/navigation'
  import AppHeader from '$lib/components/AppHeader.svelte'
  import CouponStudio from '$lib/components/CouponStudio.svelte'
  import PriceStudio from '$lib/components/PriceStudio.svelte'
  import StoreFront from '$lib/components/StoreFront.svelte'
  import StoreList from '$lib/components/StoreList.svelte'
  import StoreSettings from '$lib/components/StoreSettings.svelte'
  import StudentViewHeader from '$lib/components/StudentViewHeader.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { isSaved, saveStore } from '$lib/savedStores.svelte'
  import { decodeStore, encodeStore } from '$lib/sharing'
  import { forgetStore, openStore, shop } from '$lib/shop.svelte'
  import type { Store } from '$lib/store'
  import { teacher, type StorePage } from '$lib/teacher.svelte'

  /** The store list and the student's-eye view, plus a store's own three pages. */
  type Screen = 'stores' | 'student-view' | StorePage

  let screen = $state<Screen>('stores')
  let loading = $state(true)

  // A teacher's own store link — a bookmark, or one pasted into the address
  // bar — opens that store for editing.
  onMount(async () => {
    await openFromAddress()
    loading = false
  })

  async function openFromAddress() {
    if (!location.hash.slice(1) || location.hash.slice(1) === teacher.encoded) return
    const store = await decodeStore(location.hash)
    if (store) open(store, null)
    else {
      show('stores')
      teacher.message = t('stores.badLink')
    }
  }

  function open(store: Store, savedId: string | null, page: StorePage = 'prices') {
    openStore(store)
    teacher.savedId = savedId
    teacher.sharedEncoded = ''
    teacher.message = ''
    screen = page
  }

  // Every change the teacher makes is written into the address bar, so the page
  // can be bookmarked at any moment and reopens exactly as it was left. A store
  // saved in this browser is saved again at the same time.
  $effect(() => {
    const store = shop.store
    if (!store || screen === 'stores') return
    const snapshot = $state.snapshot(store) as Store
    const savedId = teacher.savedId
    void encodeStore(snapshot).then((encoded) => {
      if (shop.store !== store) return // another store was opened in the meantime
      teacher.encoded = encoded
      replaceState(`/teacher#${encoded}`, {})
      if (isSaved(savedId)) saveStore(snapshot, savedId)
    })
  })

  function show(next: Screen) {
    teacher.message = ''
    screen = next
  }

  function onViewAsStudent() {
    shop.aisleIndex = 0
    show('student-view')
  }

  /**
   * Back to the list. A store that is not saved anywhere but the address bar
   * would be lost, so the teacher is asked first.
   */
  function showStores() {
    if (screen === 'stores') return
    if (shop.store && !isSaved(teacher.savedId) && !window.confirm(t('teacher.leaveUnsaved'))) return
    forgetStore()
    teacher.encoded = ''
    teacher.sharedEncoded = ''
    teacher.savedId = null
    replaceState('/teacher', {})
    show('stores')
  }
</script>

<svelte:window onhashchange={() => void openFromAddress()} />

{#if loading}
  <main class="teacher-shell"></main>
{:else if screen === 'student-view' && shop.store}
  <StoreFront asTeacher header={studentViewHeader} />
{:else if screen === 'prices' && shop.store}
  <PriceStudio header={pricesHeader} onGo={show} {onViewAsStudent} />
{:else if screen === 'coupons' && shop.store}
  <CouponStudio header={couponsHeader} onGo={show} {onViewAsStudent} />
{:else if screen === 'settings' && shop.store}
  <StoreSettings header={settingsHeader} onGo={show} {onViewAsStudent} />
{:else}
  <StoreList header={storesHeader} onOpenStore={open} />
{/if}

{#snippet storesHeader()}{@render teacherHeader(t('teacher.myStores'))}{/snippet}
{#snippet pricesHeader()}{@render teacherHeader(t('teacher.pricesTitle'))}{/snippet}
{#snippet couponsHeader()}{@render teacherHeader(t('teacher.couponsTitle'))}{/snippet}
{#snippet settingsHeader()}{@render teacherHeader(t('teacher.settingsTitle'))}{/snippet}

{#snippet studentViewHeader()}
  <StudentViewHeader onExit={() => show('prices')} />
{/snippet}

<!--
  The dark header is only ever about getting around the site. Anything that
  changes a store lives in that store's green header instead.
-->
{#snippet teacherHeader(title: string)}
  <AppHeader {title} role="teacher" onHome={showStores}>
    {#snippet nav()}
      <span class="header-pages">
        <button class:active={screen === 'stores'} type="button" onclick={showStores}>{t('teacher.myStores')}</button>
      </span>
    {/snippet}
  </AppHeader>
{/snippet}
