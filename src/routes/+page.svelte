<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import AppHeader from '$lib/components/AppHeader.svelte'
  import LanguagePicker from '$lib/components/LanguagePicker.svelte'
  import StoreFront from '$lib/components/StoreFront.svelte'
  import StoreScene from '$lib/components/StoreScene.svelte'
  import SiteFooter from '$lib/components/SiteFooter.svelte'
  import { cartTotals } from '$lib/cart.svelte'
  import { aisles } from '$lib/catalog'
  import { plural, t } from '$lib/i18n/index.svelte'
  import { products } from '$lib/products'
  import { decodeStore } from '$lib/sharing'
  import { openStore, shop } from '$lib/shop.svelte'
  import type { Store } from '$lib/store'

  type Screen = 'welcome' | 'dashboard' | 'store'

  let screen = $state<Screen>('welcome')
  /** The store this browser last opened from a teacher's link, if any. */
  let lastStore = $state<Store | null>(null)

  const itemCount = $derived(cartTotals().totalItems)

  // A student who arrived through a store link comes straight into that store,
  // and comes back to it on a later visit.
  onMount(async () => {
    if (!shop.studentStore) return
    lastStore = await decodeStore(shop.studentStore)
    if (lastStore) enter(lastStore)
  })

  function enter(store: Store) {
    openStore(store)
    screen = 'dashboard'
  }
</script>

{#if screen === 'welcome'}
  <main class="landing-page">
    <section class="landing-hero" aria-labelledby="welcome-title">
      <StoreScene />
      <!-- Someone who cannot read this page yet must not have to scroll to the
           footer to change it, so the picker sits above everything else. -->
      <div class="landing-language"><LanguagePicker /></div>
      <div class="landing-hero-content">
        <p class="landing-hero-kicker">{t('landing.kicker')}</p>
        <h1 id="welcome-title">ClassGrocery</h1>
        <p class="landing-hero-intro">{t('landing.intro')}</p>
        <div class="join-panel">
          <p class="join-panel-label">{t('landing.studentsTitle')}</p>
          <p>{t('landing.linkHint')}</p>
          {#if lastStore}
            <button class="join-panel-button" type="button" onclick={() => lastStore && enter(lastStore)}>
              {t('landing.backTo', { name: lastStore.name })} <span aria-hidden="true">&rarr;</span>
            </button>
          {/if}
        </div>
        <button class="landing-teacher-link" type="button" onclick={() => goto('/teacher')}>
          {t('landing.teacherLink')} <span aria-hidden="true">&rarr;</span>
        </button>
      </div>
    </section>

    <section class="landing-band landing-steps-band" aria-labelledby="how-title">
      <div class="landing-inner">
        <h2 id="how-title" class="visually-hidden">{t('landing.howTitle')}</h2>
        <ol class="landing-steps">
          <li>
            <span class="landing-step-number" aria-hidden="true">1</span>
            <h3>{t('landing.step1.title')}</h3>
            <p>{t('landing.step1.body')}</p>
          </li>
          <li>
            <span class="landing-step-number" aria-hidden="true">2</span>
            <h3>{t('landing.step2.title')}</h3>
            <p>{t('landing.step2.body')}</p>
          </li>
          <li>
            <span class="landing-step-number" aria-hidden="true">3</span>
            <h3>{t('landing.step3.title')}</h3>
            <p>{t('landing.step3.body')}</p>
          </li>
        </ol>
      </div>
    </section>

    <section class="landing-band landing-roles-band" aria-labelledby="roles-title">
      <div class="landing-inner landing-roles">
        <h2 id="roles-title" class="visually-hidden">{t('landing.rolesTitle')}</h2>
        <article class="landing-role landing-role-teacher">
          <p class="landing-eyebrow">{t('landing.teachers.eyebrow')}</p>
          <h3>{t('landing.teachers.title')}</h3>
          <ul class="landing-list">
            <li>{t('landing.teachers.point1')}</li>
            <li>{t('landing.teachers.point2')}</li>
            <li>{t('landing.teachers.point3')}</li>
            <li>{t('landing.teachers.point4')}</li>
            <li>{t('landing.teachers.point5')}</li>
          </ul>
          <button class="landing-cta" type="button" onclick={() => goto('/teacher')}>
            {t('landing.teachers.cta')} <span aria-hidden="true">&rarr;</span>
          </button>
        </article>
        <article class="landing-role landing-role-student">
          <p class="landing-eyebrow">{t('landing.students.eyebrow')}</p>
          <h3>{t('landing.students.title')}</h3>
          <ul class="landing-list">
            <li>{t('landing.students.point1')}</li>
            <li>{t('landing.students.point2', { aisles: aisles.length, products: products.length })}</li>
            <li>{t('landing.students.point3')}</li>
            <li>{t('landing.students.point4')}</li>
            <li>{t('landing.students.point5')}</li>
          </ul>
        </article>
      </div>
    </section>

    <SiteFooter />
  </main>
{:else if screen === 'dashboard'}
  <main class="student-dashboard-page">
    <section class="student-dashboard-card" aria-labelledby="student-dashboard-title">
      <div class="student-dashboard-copy">
        <p class="welcome-kicker">{t('student.kicker')}</p>
        <h1 id="student-dashboard-title">{shop.store?.name ?? t('student.defaultStoreName')}<br />{t('student.storeTitle')}</h1>
        <p>{t('student.intro')}</p>
        <button class="student-shop-button" type="button" onclick={() => (screen = 'store')}>
          {t('student.enter')} <span aria-hidden="true">&rarr;</span>
        </button>
        {#if itemCount}
          <p class="saved-cart-note">{plural('student.cartWaiting', itemCount)}</p>
        {/if}
      </div>
      <StoreScene />
    </section>
  </main>
{:else}
  <StoreFront header={studentHeader} />
{/if}

{#snippet studentHeader()}
  <AppHeader title={t('student.headerTitle')} role="student" onHome={() => (screen = 'dashboard')}>
    {#snippet nav()}
      <button type="button" onclick={() => (screen = 'welcome')}>{t('student.switchRole')}</button>
    {/snippet}
  </AppHeader>
{/snippet}
