<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { readCode39Row } from '$lib/coupons'

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
  let canvas: HTMLCanvasElement | null = null

  function stop() {
    looking = false
    stream?.getTracks().forEach((track) => track.stop())
    stream = null
  }

  onMount(async () => {
    try {
      canvas = document.createElement('canvas')
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (!video) return
      video.srcObject = stream
      await video.play()

      const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector
      let detector: BarcodeDetectorLike | null = null
      try {
        detector = Detector ? new Detector({ formats: ['code_39'] }) : null
      } catch {
        // Some browsers expose BarcodeDetector without supporting Code 39.
      }
      // Look a few times a second until a barcode appears or the shopper cancels.
      const check = async () => {
        if (!looking || !video) return
        try {
          let code = ''
          if (detector) {
            try {
              code = (await detector.detect(video))[0]?.rawValue ?? ''
            } catch {
              detector = null
            }
          }
          if (!code && canvas && video.videoWidth && video.videoHeight) {
            canvas.width = Math.min(960, video.videoWidth)
            canvas.height = Math.round(canvas.width * video.videoHeight / video.videoWidth)
            const context = canvas.getContext('2d', { willReadFrequently: true })
            context?.drawImage(video, 0, 0, canvas.width, canvas.height)
            const image = context?.getImageData(0, 0, canvas.width, canvas.height)
            if (image) {
              for (const fraction of [0.5, 0.45, 0.55, 0.4, 0.6]) {
                code = readCode39Row(image.data, image.width, Math.round(image.height * fraction))
                if (code) break
              }
            }
          }
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
