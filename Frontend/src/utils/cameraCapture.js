import { captureCurrentLocation } from './geolocation'

const formatStampTime = (date = new Date()) =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date)

export const drawLocationStamp = (ctx, width, height, latitude, longitude, capturedAt = new Date()) => {
  const lat = Number(latitude).toFixed(6)
  const lng = Number(longitude).toFixed(6)
  const line1 = `Lat: ${lat}   Lng: ${lng}`
  const line2 = formatStampTime(capturedAt)

  const padding = Math.max(12, Math.floor(width * 0.02))
  const fontSize = Math.max(16, Math.floor(width * 0.032))
  const barHeight = Math.floor(fontSize * 2.9)

  ctx.fillStyle = 'rgba(0, 0, 0, 0.58)'
  ctx.fillRect(0, height - barHeight, width, barHeight)

  ctx.fillStyle = '#ffffff'
  ctx.font = `700 ${fontSize}px Arial, sans-serif`
  ctx.fillText(line1, padding, height - barHeight + fontSize + padding * 0.4)

  ctx.font = `500 ${Math.max(13, Math.floor(fontSize * 0.82))}px Arial, sans-serif`
  ctx.fillText(line2, padding, height - padding)
}

const blobToFile = (blob, filename) =>
  new File([blob], filename, { type: blob.type || 'image/jpeg' })

export const createStampedPhotoFromVideo = (video, coords, capturedAt = new Date()) =>
  new Promise((resolve, reject) => {
    if (!video?.videoWidth || !video?.videoHeight) {
      reject(new Error('Camera is not ready. Please wait a moment and try again.'))
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)

    drawLocationStamp(ctx, canvas.width, canvas.height, coords.latitude, coords.longitude, capturedAt)

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create photo.'))
          return
        }
        resolve(blobToFile(blob, `amc_${Date.now()}.jpg`))
      },
      'image/jpeg',
      0.92
    )
  })

export const captureStampedCameraPhoto = async (video) => {
  const coords = await captureCurrentLocation()
  const file = await createStampedPhotoFromVideo(video, coords)
  return { file, coords }
}
