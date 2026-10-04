<script lang="ts">
  import { t } from '$lib/i18n/index.svelte'
  import type { Store } from '$lib/store'

  /**
   * The first thing a student sees from a teacher's link: their class store,
   * in its colour and with its name on the sign, on a sunny day. Pressing
   * Enter swings the doors open and walks the camera in through them.
   */
  let { store, onEnter }: { store: Store; onEnter: () => void } = $props()

  const doorsOpenMs = 700
  const walkInMs = 1000

  let scene: HTMLDivElement
  let doorway: HTMLDivElement
  let entering = $state(false)

  function enter() {
    if (entering) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return onEnter()
    entering = true

    // Zoom towards the middle of the doorway, far enough that it fills the screen.
    const sceneBox = scene.getBoundingClientRect()
    const door = doorway.getBoundingClientRect()
    scene.style.transformOrigin = `${door.left + door.width / 2 - sceneBox.left}px ${door.top + door.height / 2 - sceneBox.top}px`
    scene.style.setProperty('--walk-in-scale', String(Math.max(innerWidth / door.width, innerHeight / door.height) * 1.6))

    setTimeout(onEnter, doorsOpenMs + walkInMs)
  }
</script>

<main class="entrance" class:entering data-color={store.color} style="--doors-open:{doorsOpenMs}ms; --walk-in:{walkInMs}ms">
  <div class="entrance-scene" bind:this={scene}>
    <div class="entrance-sun"></div>
    <div class="entrance-cloud entrance-cloud-one"></div>
    <div class="entrance-cloud entrance-cloud-two"></div>
    <div class="entrance-cloud entrance-cloud-three"></div>
    <div class="entrance-ground"></div>

    <div class="entrance-building">
      <h1 class="entrance-sign">{store.name}</h1>
      <div class="entrance-awning"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="entrance-window"><i></i><i></i><i></i></div>
      <div class="entrance-doorway" bind:this={doorway}>
        <div class="entrance-inside"><i></i><i></i><i></i></div>
        <div class="entrance-door entrance-door-left"></div>
        <div class="entrance-door entrance-door-right"></div>
      </div>
      <div class="entrance-window"><i></i><i></i><i></i></div>
    </div>
  </div>

  <button class="entrance-button" type="button" onclick={enter} disabled={entering}>{t('student.enter')}</button>
</main>
