<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import LanguagePicker from '$lib/components/LanguagePicker.svelte'
  import StoreEntrance from '$lib/components/StoreEntrance.svelte'
  import StoreFront from '$lib/components/StoreFront.svelte'
  import StoreScene from '$lib/components/StoreScene.svelte'
  import StoreSwitcher from '$lib/components/StoreSwitcher.svelte'
  import SiteFooter from '$lib/components/SiteFooter.svelte'
  import { aisles } from '$lib/catalog'
  import { t } from '$lib/i18n/index.svelte'
  import { products } from '$lib/products'
  import { decodeStore } from '$lib/sharing'
  import { openStore, rememberStudentStore, shop } from '$lib/shop.svelte'

  type Screen = 'welcome' | 'entrance' | 'store'

  let screen = $state<Screen>('welcome')
  /** The newest store this browser has opened from a teacher's link, if any. */
  const lastStore = $derived(shop.studentStores[0])

  // A student who arrived through a store link comes straight into that store,
  // and comes back to it on a later visit.
  onMount(() => {
    if (shop.studentStore) void enter(shop.studentStore)
  })

  /** Walks up to a student's store, from its link, and makes it the one the front page opens. */
  async function enter(encoded: string) {
    const store = await decodeStore(encoded)
    if (!store) return
    openStore(store)
    rememberStudentStore(encoded, store)
    screen = 'entrance'
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
        <h1 id="welcome-title"><img src="/logo.svg" alt="" />Class Grocery</h1>
        <p class="landing-hero-intro">{t('landing.intro')}</p>
        <div class="landing-hero-actions">
          <a class="landing-get-started" href="/teacher">
            {t('landing.getStarted')} <span aria-hidden="true">&rarr;</span>
          </a>
          <!-- Only a student who has opened a store link before sees this. -->
          {#if lastStore}
            <button class="landing-back-to-store" type="button" onclick={() => lastStore && enter(lastStore.encoded)}>
              {t('landing.backTo', { name: lastStore.name })} <span aria-hidden="true">&rarr;</span>
            </button>
          {/if}
        </div>
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
{:else if screen === 'entrance' && shop.store}
  <StoreEntrance store={shop.store} onEnter={() => (screen = 'store')} />
{:else}
  <div class="store-arrive"><StoreFront /></div>
{/if}

<!-- Students have no top bar, so the language control floats just above the help button. -->
{#if screen !== 'welcome'}
  <div class="floating-language"><LanguagePicker /></div>
  <!-- Only a student who has opened more than one store link needs to choose between them. -->
  {#if shop.studentStores.length > 1}<StoreSwitcher onSwitch={(encoded) => void enter(encoded)} />{/if}
{/if}
