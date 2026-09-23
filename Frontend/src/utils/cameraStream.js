/** Open rear camera with the highest resolution the browser allows. */
export async function openRearCameraStream() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera is not supported on this device.')
  }

  const tiers = [
    { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    { facingMode: { ideal: 'environment' } },
    { facingMode: 'environment' },
    { facingMode: 'user' },
    true,
  ]

  let lastError
  for (const video of tiers) {
    try {
      const constraints =
        video === true ? { video: true, audio: false } : { video, audio: false }
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (err) {
      lastError = err
    }
  }

  throw lastError || new Error('Could not open camera.')
}

/** Wait until video element has non-zero frame dimensions (or live track for ImageCapture). */
export const waitForVideoReady = (video, timeoutMs = 12000, stream) =>
  new Promise((resolve, reject) => {
    if (!video) {
      reject(new Error('Camera is not ready.'))
      return
    }

    const activeStream =
      stream instanceof MediaStream ? stream : video.srcObject instanceof MediaStream ? video.srcObject : null
    const track = activeStream?.getVideoTracks?.()?.[0]

    const hasFrame = () => video.videoWidth > 0 && video.videoHeight > 0
    const trackLive = () => track?.readyState === 'live'

    let timer = null
    let settled = false

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', done)
      video.removeEventListener('loadeddata', done)
      video.removeEventListener('playing', done)
      if (timer != null) {
        window.clearTimeout(timer)
        timer = null
      }
    }

    const finish = (fn) => {
      if (settled) return
      settled = true
      cleanup()
      fn()
    }

    const done = () => {
      if (hasFrame() || (trackLive() && typeof ImageCapture !== 'undefined')) {
        finish(resolve)
      }
    }

    done()
    if (settled) return

    video.addEventListener('loadedmetadata', done)
    video.addEventListener('loadeddata', done)
    video.addEventListener('playing', done)

    timer = window.setTimeout(() => {
      if (hasFrame() || trackLive()) finish(resolve)
      else finish(() => reject(new Error('Camera is not ready. Please wait a moment and try again.')))
    }, timeoutMs)
  })
