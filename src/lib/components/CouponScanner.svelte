<script lang="ts">
  import { onDestroy, onMount } from 'svelte'

  let { onDetected, onClose, onError }: {
    onDetected: (code: string) => void
    onClose: () => void
    onError: (message: string) => void
  } = $props()

  type BarcodeDetectorLike = { detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>> }
  type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike

  let video = $state<HTMLVideoElement | null>(null)
  let stream: MediaStream | null = null
  let looking = true

  function stop() {
    looking = false
    stream?.getTracks().forEach((track) => track.stop())
    stream = null
  }

  onMount(async () => {
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector
    if (!Detector) return
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (!video) return
      video.srcObject = stream
      await video.play()
      const detector = new Detector({ formats: ['code_39'] })
      // Look a few times a second until a barcode appears or the shopper cancels.
      const check = async () => {
        if (!looking || !video) return
        const results = await detector.detect(video)
        const code = results[0]?.rawValue
        if (code) {
          stop()
          onDetected(code)
          return
        }
        window.setTimeout(check, 250)
      }
      void check()
    } catch {
      stop()
      onError('Camera access was not allowed. Type the coupon code instead.')
    }
  })

  onDestroy(stop)
</script>

<div class="scanner-overlay">
  <div class="scanner-dialog">
    <h2>Point the camera at the coupon barcode</h2>
    <!-- svelte-ignore a11y_media_has_caption -->
    <video autoplay playsinline bind:this={video}></video>
    <button type="button" onclick={onClose}>Cancel</button>
  </div>
</div>
