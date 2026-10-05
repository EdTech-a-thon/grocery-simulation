<script lang="ts">
  // The footer, folded into a top bar: just the teacher.dev mark, which opens
  // to the credit and the about and privacy links. A teacher at /teacher has no
  // footer to scroll to, so this is how they find those pages.
  import { t } from '$lib/i18n/index.svelte'

  /** Pointing at it is enough on a desktop; nothing has to be clicked. */
  let hovering = $state(false)
  /**
   * Something inside was reached with the keyboard, so tabbing through opens
   * it too. A tap also focuses the button, but that is left to `pinned`, or a
   * second tap could not close it again.
   */
  let focused = $state(false)
  /** Left open by a click, which is what a touch screen has instead of a hover. */
  let pinned = $state(false)

  const open = $derived(hovering || focused || pinned)
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key !== 'Escape') return
    pinned = false
    focused = false
  }}
/>

<div
  role="presentation"
  class="brand-menu"
  onpointerenter={(event) => { if (event.pointerType === 'mouse') hovering = true }}
  onpointerleave={() => (hovering = false)}
  onfocusin={(event) => (focused = (event.target as Element).matches(':focus-visible'))}
  onfocusout={(event) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    focused = false
    pinned = false
  }}
>
  <button
    class="brand-menu-toggle"
    type="button"
    aria-expanded={open}
    aria-controls="brand-menu-panel"
    aria-label={t('footer.menu')}
    onclick={() => (pinned = !pinned)}
  >
    <img src="/teacher-dev-logo.svg" alt="" width="24" height="24" />
  </button>

  <!-- Always in the page, so the links stay reachable by keyboard; only shown
       once asked for. The gap above the card is padding on this wrapper, not a
       margin, so the pointer crosses it without leaving the menu and closing it. -->
  <div id="brand-menu-panel" class={open ? 'brand-menu-panel' : 'visually-hidden'}>
    <div class="brand-menu-card">
      <a class="brand-menu-credit" href="https://teacher.dev" target="_blank" rel="noopener noreferrer">
        {t('footer.builtBy')}
      </a>
      <p>
        <a href="/about">{t('footer.about')}</a>
        <span aria-hidden="true">·</span>
        <a href="/privacy">{t('footer.privacy')}</a>
      </p>
    </div>
  </div>
</div>

<style>
  .brand-menu { position: relative; flex: 0 0 auto; }

  .brand-menu-toggle {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 50%;
    padding: 0;
    background: transparent;
    cursor: pointer;
  }
  .brand-menu-toggle:hover,
  .brand-menu-toggle[aria-expanded='true'] { background: #f0f8f2; }
  .brand-menu-toggle img { display: block; }

  /* It sits at the right of the bar, so the card opens leftward from there. */
  .brand-menu-panel { position: absolute; top: 100%; right: 0; z-index: 40; padding-top: 8px; }
  /* On a phone the bar's tools wrap to the middle, so it opens under the mark. */
  @media (max-width: 860px) {
    .brand-menu-panel { right: auto; left: 50%; transform: translateX(-50%); }
  }
  .brand-menu-card {
    display: grid;
    gap: 4px;
    width: max-content;
    border: 1px solid #dcf0e2;
    border-radius: var(--radius-md);
    padding: 10px 14px;
    background: #fff;
    box-shadow: var(--shadow-lg);
    text-align: left;
  }
  .brand-menu-card p { display: flex; align-items: center; gap: 8px; margin: 0; color: #9db3a4; }
  .brand-menu-card a {
    border: 0;
    padding: 0;
    background: transparent;
    color: #5e7163;
    font-size: .8rem;
    font-weight: 700;
    text-decoration: none;
  }
  .brand-menu-card a.brand-menu-credit { color: #14532d; font-size: .9rem; font-weight: 800; }
  .brand-menu-card a:hover { background: transparent; color: #15803d; text-decoration: underline; }
</style>
