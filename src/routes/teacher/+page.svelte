<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import AppHeader from '$lib/components/AppHeader.svelte'
  import ClassIdentityModal from '$lib/components/ClassIdentityModal.svelte'
  import CouponStudio from '$lib/components/CouponStudio.svelte'
  import PriceStudio from '$lib/components/PriceStudio.svelte'
  import StoreFront from '$lib/components/StoreFront.svelte'
  import StoreList from '$lib/components/StoreList.svelte'
  import StoreSettings from '$lib/components/StoreSettings.svelte'
  import StudentViewHeader from '$lib/components/StudentViewHeader.svelte'
  import TeacherLogin from '$lib/components/TeacherLogin.svelte'
  import { currentTeacher, pb, signOut, teacherJoinPrefix, type Store } from '$lib/pocketbase'
  import { forgetStore, openStore, shop } from '$lib/shop.svelte'
  import { refreshStores, teacher, type StorePage } from '$lib/teacher.svelte'

  /** The store list and the student's-eye view, plus a store's own three pages. */
  type Screen = 'stores' | 'student-view' | StorePage

  let signedIn = $state(false)
  let checkingSession = $state(true)
  let screen = $state<Screen>('stores')
  // Store codes are built from the teacher's identifier, so nothing else on the
  // teacher side can happen until they have one.
  let needsIdentifier = $state(false)

  // A teacher who signed in earlier picks their stores back up on this machine.
  onMount(async () => {
    if (currentTeacher()) {
      try {
        await pb.collection('teachers').authRefresh()
        await enterTeacherArea()
      } catch {
        signOut()
      }
    }
    checkingSession = false
  })

  async function enterTeacherArea() {
    needsIdentifier = !teacherJoinPrefix()
    if (!needsIdentifier) await refreshStores()
    teacher.message = ''
    screen = 'stores'
    signedIn = true
  }

  async function open(store: Store, page: StorePage = 'prices') {
    await openStore(store)
    teacher.message = ''
    screen = page
  }

  function show(next: Screen) {
    teacher.message = ''
    screen = next
  }

  function onViewAsStudent() {
    shop.aisleIndex = 0
    show('student-view')
  }

  function leave() {
    signOut()
    forgetStore()
    teacher.stores = []
    teacher.message = ''
    signedIn = false
    void goto('/')
  }
</script>

{#if checkingSession}
  <main class="teacher-login-page"></main>
{:else if !signedIn}
  <TeacherLogin onSignedIn={enterTeacherArea} onBackHome={() => void goto('/')} />
{:else if needsIdentifier}
  <ClassIdentityModal onClaimed={enterTeacherArea} />
{:else if screen === 'student-view'}
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

{#snippet storesHeader()}{@render teacherHeader('My stores')}{/snippet}
{#snippet pricesHeader()}{@render teacherHeader('Prices and stock')}{/snippet}
{#snippet couponsHeader()}{@render teacherHeader('Coupons')}{/snippet}
{#snippet settingsHeader()}{@render teacherHeader('Store settings')}{/snippet}

{#snippet studentViewHeader()}
  <StudentViewHeader onExit={() => show('prices')} />
{/snippet}

<!--
  The dark header is only ever about getting around the site: the pages on the
  left of the divider, leaving on the right. Anything that changes a store lives
  in that store's green header instead.
-->
{#snippet teacherHeader(title: string)}
  <AppHeader {title} role="teacher" onHome={() => show('stores')}>
    {#snippet nav()}
      <span class="header-pages">
        <button class:active={screen === 'stores'} type="button" onclick={() => show('stores')}>My stores</button>
      </span>
      <span class="header-exits">
        <button type="button" onclick={leave}>Sign out</button>
      </span>
    {/snippet}
  </AppHeader>
{/snippet}
