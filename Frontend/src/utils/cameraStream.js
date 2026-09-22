/** Open rear camera with the highest resolution the browser allows. */
export async function openRearCameraStream() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera is not supported on this device.')
  }

  const tiers = [
    {
      facingMode: { ideal: 'environment' },
      width: { ideal: 3840, min: 1920 },
      height: { ideal: 2160, min: 1080 },
    },
    {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920, min: 1280 },
      height: { ideal: 1080, min: 720 },
    },
    { facingMode: { ideal: 'environment' } },
  ]

  let lastError
  for (const video of tiers) {
    try {
      return await navigator.mediaDevices.getUserMedia({ video, audio: false })
    } catch (err) {
      lastError = err
    }
  }

  throw lastError || new Error('Could not open camera.')
}

/** Wait until video element has non-zero frame dimensions. */
export const waitForVideoReady = (video, timeoutMs = 8000) =>
  new Promise((resolve, reject) => {
    if (!video) {
      reject(new Error('Camera is not ready.'))
      return
    }

    const done = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        cleanup()
        resolve()
      }
    }

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', done)
      window.clearTimeout(timer)
    }

    done()
    if (video.videoWidth > 0) return

    video.addEventListener('loadedmetadata', done)
    const timer = window.setTimeout(() => {
      cleanup()
      if (video.videoWidth > 0) resolve()
      else reject(new Error('Camera is not ready. Please wait a moment and try again.'))
    }, timeoutMs)
  })
