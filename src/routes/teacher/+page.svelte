<script lang="ts">
  import { onMount } from 'svelte'
  import { replaceState } from '$app/navigation'
  import AppHeader from '$lib/components/AppHeader.svelte'
  import CouponStudio from '$lib/components/CouponStudio.svelte'
  import Inventory from '$lib/components/Inventory.svelte'
  import StoreFront from '$lib/components/StoreFront.svelte'
  import StoreList from '$lib/components/StoreList.svelte'
  import StoreSettings from '$lib/components/StoreSettings.svelte'
  import StoreSidebar from '$lib/components/StoreSidebar.svelte'
  import StudentViewHeader from '$lib/components/StudentViewHeader.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { saveStore, savedIdFor } from '$lib/savedStores.svelte'
  import { decodeStore, encodeStore } from '$lib/sharing'
  import { forgetStore, openStore, shop } from '$lib/shop.svelte'
  import { newStore, type Store } from '$lib/store'
  import { teacher, type StorePage } from '$lib/teacher.svelte'

  /** The store list and the student's-eye view, plus a store's own three pages. */
  type Screen = 'stores' | 'student-view' | StorePage

  let screen = $state<Screen>('stores')
  let loading = $state(true)
  /** True on the settings page of a store that was created a moment ago. */
  let justCreated = $state(false)
  // Set when a store is opened from a student link the class already has, so
  // the first version written to the address counts as the one they were given.
  let openedFromStudentLink = false

  // A teacher's own store link — a bookmark, or one pasted into the address
  // bar — opens that store for editing, and puts it on their list.
  onMount(async () => {
    await openFromAddress()
    loading = false
  })

  async function openFromAddress() {
    if (!location.hash.slice(1) || location.hash.slice(1) === teacher.encoded) return
    const store = await decodeStore(location.hash)
    if (store) open(store, savedIdFor(store) ?? saveStore(store))
    else {
      show('stores')
      teacher.message = t('stores.badLink')
    }
  }

  function open(store: Store, savedId: string, page: StorePage = 'inventory', fromStudentLink = false) {
    openStore(store)
    teacher.savedId = savedId
    teacher.sharedEncoded = ''
    openedFromStudentLink = fromStudentLink
    teacher.message = ''
    justCreated = false
    screen = page
  }

  /** A new store starts out with a placeholder name, on the page where it is named. */
  function create() {
    const store = newStore({
      name: t('stores.newName'),
      color: 'green',
      brandMode: 'name',
      unitPricing: 'unit',
      couponsEnabled: true,
      taxEnabled: false,
      salesTax: 0,
    })
    open(store, saveStore(store), 'settings')
    justCreated = true
  }

  // Every change the teacher makes is written into the address bar, so the page
  // can be bookmarked at any moment and reopens exactly as it was left. The
  // copy on the teacher's list is saved again at the same time.
  $effect(() => {
    const store = shop.store
    if (!store || screen === 'stores') return
    const snapshot = $state.snapshot(store) as Store
    const savedId = teacher.savedId
    void encodeStore(snapshot).then((encoded) => {
      if (shop.store !== store) return // another store was opened in the meantime
      teacher.encoded = encoded
      if (openedFromStudentLink) {
        teacher.sharedEncoded = encoded
        openedFromStudentLink = false
      }
      replaceState(`/teacher#${encoded}`, {})
      if (savedId) saveStore(snapshot, savedId)
    })
  })

  function show(next: Screen) {
    teacher.message = ''
    if (next !== 'settings') justCreated = false
    screen = next
  }

  function onViewAsStudent() {
    shop.aisleIndex = 0
    show('student-view')
  }

  function showStores() {
    if (screen === 'stores') return
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
{:else if screen !== 'stores' && screen !== 'student-view' && shop.store}
  <main class="teacher-shell">
    {@render header()}
    <div class="store-layout">
      <StoreSidebar page={screen} onGo={show} onBack={showStores} {onViewAsStudent} />
      <div class="store-main">
        <!-- The side panel shows which page this is; the heading says it to a screen reader. -->
        <h1 class="visually-hidden">{t(`teacher.${screen}Title`)}</h1>
        {#if teacher.message}<p class="status-message">{teacher.message}</p>{/if}
        {#if screen === 'inventory'}
          <Inventory />
        {:else if screen === 'coupons'}
          <CouponStudio />
        {:else}
          <StoreSettings isNew={justCreated} />
        {/if}
      </div>
    </div>
  </main>
{:else}
  <StoreList {header} onOpenStore={open} onCreate={create} />
{/if}

{#snippet studentViewHeader()}
  <StudentViewHeader onExit={() => show('inventory')} />
{/snippet}

<!-- Only the way home and the language: everything about a store is in its side panel. -->
{#snippet header()}
  <AppHeader onHome={showStores} />
{/snippet}
