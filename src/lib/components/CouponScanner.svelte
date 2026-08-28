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
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (!video) return
      video.srcObject = stream
      await video.play()

      const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector
      if (!Detector) {
        stop()
        onError('Your camera is available, but this browser cannot automatically read coupon barcodes. Enter the printed code instead.')
        return
      }
      const detector = new Detector({ formats: ['code_39'] })
      // Look a few times a second until a barcode appears or the shopper cancels.
      const check = async () => {
        if (!looking || !video) return
        try {
          const results = await detector.detect(video)
          const code = results[0]?.rawValue
          if (code) {
            stop()
            onDetected(code)
            return
          }
          window.setTimeout(check, 250)
        } catch {
          stop()
          onError('The barcode could not be read. Enter the code printed below it instead.')
        }
      }
      void check()
    } catch (error) {
      stop()
      const name = error instanceof DOMException ? error.name : ''
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        onError('Camera permission was not granted. Allow camera access and try again, or enter the printed code.')
      } else if (name === 'NotFoundError') {
        onError('No camera was found on this device. Enter the printed code instead.')
      } else if (name === 'NotReadableError') {
        onError('The camera is already in use by another app. Close it there and try again, or enter the printed code.')
      } else {
        onError('The camera could not be started. Enter the printed code instead.')
      }
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
