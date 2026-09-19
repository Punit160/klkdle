/** QR / barcode scan helpers for ULA and SerialScannerInput (camera + canvas). */

export const parseEquipmentSerialFromScan = (rawValue) => {
  if (rawValue == null) return ''
  const text = String(rawValue).trim()
  if (!text) return ''

  const klkMatch = text.match(/\b(KLK[A-Z0-9]{8,})\b/i)
  if (klkMatch) return klkMatch[1].toUpperCase()

  const invMatch = text.match(/\b(INV[-A-Z0-9]{4,})\b/i)
  if (invMatch) return invMatch[1].toUpperCase()

  try {
    if (text.startsWith('{') || text.startsWith('[')) {
      const parsed = JSON.parse(text)
      const fromJson =
        parsed?.serial ??
        parsed?.serialNo ??
        parsed?.serial_number ??
        parsed?.sn ??
        parsed?.barcode
      if (fromJson) return parseEquipmentSerialFromScan(String(fromJson))
    }
  } catch {
    /* not JSON */
  }

  try {
    const asUrl = text.includes('://') ? new URL(text) : null
    if (asUrl) {
      for (const key of ['serial', 'sn', 'barcode', 'id', 'code']) {
        const param = asUrl.searchParams.get(key)
        if (param) {
          const normalized = parseEquipmentSerialFromScan(param)
          if (normalized) return normalized
        }
      }
    }
  } catch {
    /* not a URL */
  }

  if (/^[A-Z0-9][A-Z0-9\-_/]{5,}$/i.test(text)) {
    return text.replace(/\s+/g, '').toUpperCase()
  }

  return text.replace(/\s+/g, '')
}

export const loadJsQr = () => {
  if (typeof window !== 'undefined' && window.jsQR) {
    return Promise.resolve(window.jsQR)
  }

  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null)
      return
    }

    const finish = (value) => resolve(value || null)

    const existing = document.getElementById('jsqr-script')
    if (existing) {
      if (window.jsQR) {
        finish(window.jsQR)
        return
      }
      existing.addEventListener('load', () => finish(window.jsQR), { once: true })
      existing.addEventListener('error', () => finish(null), { once: true })
      const deadline = Date.now() + 8000
      const poll = setInterval(() => {
        if (window.jsQR) {
          clearInterval(poll)
          finish(window.jsQR)
        } else if (Date.now() > deadline) {
          clearInterval(poll)
          finish(null)
        }
      }, 40)
      return
    }

    const script = document.createElement('script')
    script.id = 'jsqr-script'
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'
    script.async = true
    script.onload = () => finish(window.jsQR)
    script.onerror = () => finish(null)
    document.head.appendChild(script)
  })
}

const detectOnCanvas = async (canvas) => {
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats()
      const detector = new window.BarcodeDetector({
        formats: formats?.length
          ? formats
          : ['qr_code', 'code_128', 'code_39', 'data_matrix', 'ean_13'],
      })
      const barcodes = await detector.detect(canvas)
      for (const item of barcodes || []) {
        if (!item?.rawValue) continue
        const parsed = parseEquipmentSerialFromScan(item.rawValue)
        if (parsed) return parsed
      }
    } catch (err) {
      console.warn('Native BarcodeDetector detection error:', err)
    }
  }

  const jsQR = await loadJsQr()
  if (jsQR && canvas) {
    const ctx = canvas.getContext('2d')
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const qrCode = jsQR(imgData.data, imgData.width, imgData.height, {
      inversionAttempts: 'attemptBoth',
    })
    if (qrCode?.data) {
      return parseEquipmentSerialFromScan(qrCode.data)
    }
  }

  return null
}

const canvasFromSource = async (imageOrCanvas) => {
  if (imageOrCanvas instanceof HTMLCanvasElement) {
    return imageOrCanvas
  }

  const img =
    imageOrCanvas instanceof HTMLImageElement
      ? imageOrCanvas
      : await new Promise((res, rej) => {
          const i = new Image()
          i.crossOrigin = 'anonymous'
          i.onload = () => res(i)
          i.onerror = rej
          i.src =
            typeof imageOrCanvas === 'string'
              ? imageOrCanvas
              : URL.createObjectURL(imageOrCanvas)
        })

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth || img.width || 800
  canvas.height = img.naturalHeight || img.height || 600
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** Scan QR / barcode from canvas, data URL, blob, or image element. */
export const scanQrOrBarcode = async (imageOrCanvas) => {
  try {
    const canvas = await canvasFromSource(imageOrCanvas)
    let found = await detectOnCanvas(canvas)
    if (found) return found

    const w = canvas.width
    const h = canvas.height
    const regions = [
      { x: 0, y: 0, w, h },
      {
        x: Math.floor(w * 0.15),
        y: Math.floor(h * 0.15),
        w: Math.floor(w * 0.7),
        h: Math.floor(h * 0.7),
      },
      {
        x: Math.floor(w * 0.25),
        y: Math.floor(h * 0.2),
        w: Math.floor(w * 0.5),
        h: Math.floor(h * 0.6),
      },
    ]

    for (const region of regions) {
      if (region.w < 80 || region.h < 80) continue
      const slice = document.createElement('canvas')
      slice.width = region.w
      slice.height = region.h
      slice
        .getContext('2d')
        .drawImage(canvas, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h)
      found = await detectOnCanvas(slice)
      if (found) return found
    }

    const upscaled = document.createElement('canvas')
    upscaled.width = Math.min(w * 2, 2560)
    upscaled.height = Math.min(h * 2, 2560)
    upscaled.getContext('2d').drawImage(canvas, 0, 0, upscaled.width, upscaled.height)
    found = await detectOnCanvas(upscaled)
    if (found) return found
  } catch (err) {
    console.warn('Failed to scan QR/Barcode:', err)
  }

  return null
}
