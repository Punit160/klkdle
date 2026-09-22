import { captureCurrentLocation } from './geolocation'

/** Higher quality — single encode (avoid double JPEG on ULA path). */
export const JPEG_CAPTURE_QUALITY = 0.96

const prepareCanvasContext = (ctx) => {
  ctx.imageSmoothingEnabled = true
  if ('imageSmoothingQuality' in ctx) {
    ctx.imageSmoothingQuality = 'high'
  }
}

/**
 * Prefer ImageCapture.takePhoto() (full sensor) over low-res video frame grab.
 */
const drawVideoFrameToCanvas = async (video, canvas, ctx) => {
  const stream = video?.srcObject
  if (stream instanceof MediaStream && typeof ImageCapture !== 'undefined') {
    const track = stream.getVideoTracks()[0]
    if (track?.readyState === 'live') {
      try {
        const capture = new ImageCapture(track)
        const opts = {}
        const caps = track.getCapabilities?.()
        if (caps?.width?.max) opts.imageWidth = caps.width.max
        if (caps?.height?.max) opts.imageHeight = caps.height.max
        const blob = await capture.takePhoto(
          Object.keys(opts).length ? opts : undefined
        )
        const bitmap = await createImageBitmap(blob)
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        prepareCanvasContext(ctx)
        ctx.drawImage(bitmap, 0, 0)
        bitmap.close?.()
        return
      } catch {
        /* fall through to video frame */
      }
    }
  }

  if (!video?.videoWidth || !video?.videoHeight) {
    throw new Error('Camera is not ready. Please wait a moment and try again.')
  }

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  prepareCanvasContext(ctx)
  ctx.drawImage(video, 0, 0)
}

export const formatStampTime = (date = new Date()) =>
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

const ellipsizeStampLine = (ctx, text, maxWidth) => {
  const raw = String(text || '')
  if (!raw) return ''
  if (ctx.measureText(raw).width <= maxWidth) return raw
  let trimmed = raw
  while (trimmed.length > 4 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1)
  }
  return `${trimmed}…`
}

const formatStampCoord = (value) => {
  if (value == null || value === '' || Number.isNaN(Number(value))) return '—'
  return Number(value).toFixed(6)
}

const fillRoundedRect = (ctx, x, y, w, h, radius) => {
  const r = Math.min(radius, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  ctx.fill()
}

/**
 * Light AMC: lat/lng + time. Bihar ULA (fullSiteStamp): CA, name, location, time, GPS.
 */
export const drawSurveyPhotoStamp = (
  ctx,
  width,
  height,
  {
    latitude,
    longitude,
    capturedAt = new Date(),
    caNumber,
    caName,
    district,
    block,
    panchayat,
    village,
    fullSiteStamp = false,
  } = {}
) => {
  const lat = formatStampCoord(latitude)
  const lng = formatStampCoord(longitude)

  const padding = Math.max(10, Math.floor(width * 0.018))
  const fontSize = Math.max(15, Math.floor(width * 0.028))
  const smallFont = Math.max(12, Math.floor(fontSize * 0.82))
  const maxTextWidth = width - padding * 2

  const lines = []

  if (fullSiteStamp) {
    const add = (label, value, size = smallFont, weight = '600') => {
      const v = String(value ?? '').trim()
      lines.push({
        text: `${label}: ${v || '—'}`,
        size,
        weight,
      })
    }
    add('CA NO', caNumber, fontSize, '700')
    add('CA NAME', caName, fontSize, '700')
    add('DISTRICT', district)
    add('BLOCK', block)
    add('PANCHAYAT', panchayat)
    add('VILLAGE', village)
    lines.push({
      text: `DATE TIME: ${formatStampTime(capturedAt)}`,
      size: smallFont,
      weight: '500',
    })
    lines.push({
      text: `Lat: ${lat}   Lng: ${lng}`,
      size: fontSize,
      weight: '700',
    })
  } else {
    const ca = String(caNumber || '').trim()
    if (ca) {
      lines.push({ text: `CA NO: ${ca}`, size: fontSize, weight: '700' })
    }
    lines.push({
      text: `Lat: ${lat}   Lng: ${lng}`,
      size: fontSize,
      weight: '700',
    })
    lines.push({
      text: formatStampTime(capturedAt),
      size: smallFont,
      weight: '500',
    })
  }

  const lineStep = Math.floor(smallFont * 1.22)
  const innerPadX = Math.max(8, Math.floor(padding * 0.85))
  const innerPadY = Math.max(8, Math.floor(padding * 0.75))
  const maxContentWidth = Math.min(maxTextWidth, Math.floor(width * 0.88))

  const measured = lines.map((line) => {
    ctx.font = `${line.weight} ${line.size}px Arial, sans-serif`
    const drawn = ellipsizeStampLine(ctx, line.text, maxContentWidth)
    const textWidth = ctx.measureText(drawn).width
    return { ...line, drawn, textWidth }
  })

  const contentWidth = Math.max(...measured.map((l) => l.textWidth), 1)
  const boxWidth = Math.ceil(contentWidth + innerPadX * 2)
  const boxHeight = Math.ceil(innerPadY * 2 + measured.length * lineStep)
  const boxX = padding
  const boxY = height - boxHeight

  ctx.fillStyle = 'rgba(0, 0, 0, 0.62)'
  fillRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, Math.min(10, innerPadX))

  ctx.fillStyle = '#ffffff'
  let y = boxY + innerPadY + smallFont * 0.92
  const textX = boxX + innerPadX
  for (const line of measured) {
    ctx.font = `${line.weight} ${line.size}px Arial, sans-serif`
    ctx.fillText(line.drawn, textX, y)
    y += lineStep
  }
}

/** @deprecated use drawSurveyPhotoStamp — kept for Light AMC */
export const drawLocationStamp = (ctx, width, height, latitude, longitude, capturedAt = new Date()) => {
  drawSurveyPhotoStamp(ctx, width, height, { latitude, longitude, capturedAt })
}

const blobToFile = (blob, filename) =>
  new File([blob], filename, { type: blob.type || 'image/jpeg' })

export const createStampedPhotoFromVideo = async (video, coords, capturedAt = new Date()) => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  await drawVideoFrameToCanvas(video, canvas, ctx)

  drawLocationStamp(
    ctx,
    canvas.width,
    canvas.height,
    coords.latitude,
    coords.longitude,
    capturedAt
  )

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to create photo.'))),
      'image/jpeg',
      JPEG_CAPTURE_QUALITY
    )
  })

  return blobToFile(blob, `amc_${Date.now()}.jpg`)
}

export const captureStampedCameraPhoto = async (video) => {
  const coords = await captureCurrentLocation()
  const file = await createStampedPhotoFromVideo(video, coords)
  return { file, coords }
}

/** Same capture + stamp pipeline as Light AMC, returns data URL (Bihar ULA + optional CA line). */
export const captureStampedDataUrlFromVideo = async (
  video,
  { caNumber, stampMetadata, onRawFrame } = {}
) => {
  const coords = await captureCurrentLocation()

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  await drawVideoFrameToCanvas(video, canvas, ctx)

  const frameHook = onRawFrame?.(canvas)
  if (frameHook && typeof frameHook.then === 'function') {
    await frameHook
  }

  const capturedAt = new Date()
  drawSurveyPhotoStamp(ctx, canvas.width, canvas.height, {
    caNumber: stampMetadata?.caNumber ?? caNumber,
    caName: stampMetadata?.caName,
    district: stampMetadata?.district,
    block: stampMetadata?.block,
    panchayat: stampMetadata?.panchayat,
    village: stampMetadata?.village,
    fullSiteStamp: stampMetadata?.fullSiteStamp,
    latitude: coords.latitude,
    longitude: coords.longitude,
    capturedAt,
  })

  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_CAPTURE_QUALITY)

  return { dataUrl, coords, capturedAt }
}

/** Stamp an existing image (data URL / canvas) — used by Bihar ULA */
export const stampImageDataUrl = (imageSrc, metadata = {}) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width || 1280
        canvas.height = img.naturalHeight || img.height || 720
        const ctx = canvas.getContext('2d')
        prepareCanvasContext(ctx)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        const capturedAt =
          metadata.capturedAt instanceof Date ? metadata.capturedAt : new Date()

        drawSurveyPhotoStamp(ctx, canvas.width, canvas.height, {
          latitude: metadata.latitude,
          longitude: metadata.longitude,
          capturedAt,
          caNumber: metadata.caNumber,
          caName: metadata.caName,
          district: metadata.district,
          block: metadata.block,
          panchayat: metadata.panchayat,
          village: metadata.village,
          fullSiteStamp: metadata.fullSiteStamp,
        })

        resolve(canvas.toDataURL('image/jpeg', JPEG_CAPTURE_QUALITY))
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error('Failed to load image for stamping'))
    img.src = imageSrc
  })
