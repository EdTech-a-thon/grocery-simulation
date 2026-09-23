<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import AppHeader from '$lib/components/AppHeader.svelte'
  import LanguagePicker from '$lib/components/LanguagePicker.svelte'
  import StoreFront from '$lib/components/StoreFront.svelte'
  import StoreScene from '$lib/components/StoreScene.svelte'
  import SiteFooter from '$lib/components/SiteFooter.svelte'
  import RichText from '$lib/components/RichText.svelte'
  import { cartTotals } from '$lib/cart.svelte'
  import { aisles } from '$lib/catalog'
  import { plural, t } from '$lib/i18n/index.svelte'
  import { products } from '$lib/products'
  import { joinStore, rememberStudentJoinCode, shop } from '$lib/shop.svelte'

  type Screen = 'welcome' | 'dashboard' | 'store'

  let screen = $state<Screen>('welcome')
  let joinCodeInput = $state('')
  let message = $state('')
  let busy = $state(false)
  let joinInput = $state<HTMLInputElement | null>(null)

  const itemCount = $derived(cartTotals().totalItems)

  // A student who joined earlier comes straight back to their class store.
  onMount(async () => {
    if (!shop.studentJoinCode) return
    if (await joinStore(shop.studentJoinCode)) screen = 'dashboard'
  })

  /** The landing page is long, so its lower buttons send the class back up to the code box. */
  function focusJoin() {
    joinInput?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    joinInput?.focus({ preventScroll: true })
  }

  async function joinWithCode() {
    if (busy) return
    busy = true
    try {
      if (!(await joinStore(joinCodeInput))) {
        message = t('landing.codeNotFound')
        return
      }
      rememberStudentJoinCode(joinCodeInput)
      message = ''
      screen = 'dashboard'
    } finally {
      busy = false
    }
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
          <label class="join-panel-label" for="store-code">{t('landing.storeCode')}</label>
          <div class="join-panel-row">
            <input
              id="store-code"
              bind:this={joinInput}
              type="text"
              placeholder="OTTER-P3"
              autocapitalize="characters"
              bind:value={joinCodeInput}
              onkeydown={(event) => { if (event.key === 'Enter') void joinWithCode() }}
            />
            <button type="button" disabled={busy} onclick={joinWithCode}>{t('landing.join')}</button>
          </div>
          <small>{t('landing.codeHint')}</small>
          {#if message}<p class="join-panel-error" role="alert">{message}</p>{/if}
        </div>
        <button class="landing-teacher-link" type="button" onclick={() => goto('/teacher')}>
          {t('landing.teacherSignIn')} <span aria-hidden="true">&rarr;</span>
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
            <p><RichText key="landing.step2.body" values={{ code: 'OTTER-P3' }} /></p>
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
          <button class="landing-cta landing-cta-student" type="button" onclick={focusJoin}>
            {t('landing.students.cta')} <span aria-hidden="true">&uarr;</span>
          </button>
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
        {#if shop.store?.joinCode}
          <p class="student-class-badge">{t('student.storeCode', { code: shop.store.joinCode })}</p>
        {/if}
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
