/**
 * Helper utilities, slot definitions, and storage for Bihar ULA module
 */

import localApi from '../../../api/localApi'
import externalApi from '../../../api/externalApi'
import { api, external } from '../../../api/routes'
import { getCompanyId, getUser } from '../../../utils/auth'
import { mapDistinctFieldOptions } from '../../../utils/externalApiUser'
import { stampImageDataUrl } from '../../../utils/cameraCapture'

/** Display name for survey creator from API + users table (fallback: logged-in profile). */
export const resolveUlaSurveyorDisplayName = (surveyRow, { userIdField = 'user_id', nameField = 'user_name' } = {}) => {
  const fromApi = String(surveyRow?.[nameField] ?? '').trim()
  if (fromApi) return fromApi

  let fromRemarks = ''
  try {
    const meta = JSON.parse(surveyRow?.remarks || '{}')
    const key = userIdField === 'user_id2' ? 'surveyor_name2' : 'surveyor_name'
    fromRemarks = String(meta?.[key] ?? '').trim()
  } catch {
    /* plain-text remarks */
  }
  if (fromRemarks) return fromRemarks

  const storedUserId = surveyRow?.[userIdField]
  if (storedUserId == null || storedUserId === '') return '—'

  const user = getUser()
  const myId = String(user?.id ?? user?.user_id ?? '').trim()
  if (myId && String(storedUserId).trim() === myId) {
    const selfName = String(
      user?.name ?? user?.user_name ?? user?.full_name ?? user?.email ?? ''
    ).trim()
    if (selfName) return selfName
  }

  const idLabel = String(storedUserId).trim()
  if (/^\d+$/.test(idLabel)) return `User #${idLabel}`

  return '—'
}

/** Digits-only CA number (max 20). */
export const sanitizeCaNumberInput = (value) =>
  String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, 20)

/** Digits-only Indian mobile (max 10). */
export const sanitizeMobileInput = (value) =>
  String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, 10)

export const isValidCaNumber = (value) => {
  const ca = sanitizeCaNumberInput(value)
  return ca.length >= 4 && /^\d+$/.test(ca)
}

export const isValidIndianMobile = (value) => {
  const mobile = sanitizeMobileInput(value)
  if (!mobile) return true
  return /^[6-9]\d{9}$/.test(mobile)
}

export const BIHAR_DISTRICTS = [
  'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur',
  'Buxar', 'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad',
  'Kaimur (Bhabua)', 'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura',
  'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada', 'Patna', 'Purnia',
  'Rohtas', 'Saharsa', 'Samastipur', 'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi',
  'Siwan', 'Supaul', 'Vaishali', 'West Champaran',
]

/** UI slot key → multipart field name for API (Prisma columns). */
export const ULA_SLOT_API_FIELD = {
  panel1_qr: 'panel_one_img',
  panel2_qr: 'panel_two_img',
  inverter_qr: 'inverter_img',
  smart_meter: 'smart_meter_img',
  acdb: 'acdb_img',
  system_wiring: 'system_img',
  solar_meter_v1: 'solar_meter_img',
  solar_meter_v2: 'solar_meter_img2',
  system_complete: 'system_img2',
}

export const ULA_SERIAL_API_FIELD = {
  panel1_qr: 'panel_one_no',
  panel2_qr: 'panel_two_no',
  inverter_qr: 'inverter_no',
}

/** Slots where serial is read from QR on capture, or entered manually if scan fails. */
export const ULA_QR_SERIAL_SLOT_KEYS = Object.keys(ULA_SERIAL_API_FIELD)

/** Pull equipment serial from raw QR / barcode text (plain, URL, or JSON). */
export const parseEquipmentSerialFromScan = (rawValue) => {
  if (rawValue == null) return ''
  let text = String(rawValue).trim()
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
      if (barcodes?.[0]?.rawValue) {
        return parseEquipmentSerialFromScan(barcodes[0].rawValue)
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

export const ULA_IMAGE_SLOTS = [
  {
    id: 'panel1_qr',
    key: 'panel1_qr',
    title: 'Panel 1 (QR Code)',
    badge: '1st Visit',
    badgeClass: 'bg-soft-warning text-warning',
    isQr: true,
    hasSerialInput: true,
    serialPlaceholder: 'e.g. KLK3M0300526128613',
    visit: 1,
    required: true,
    desc: 'Clear photo of Solar Panel 1 QR / Barcode',
  },
  {
    id: 'panel2_qr',
    key: 'panel2_qr',
    title: 'Panel 2 (QR Code)',
    badge: '1st Visit',
    badgeClass: 'bg-soft-warning text-warning',
    isQr: true,
    hasSerialInput: true,
    serialPlaceholder: 'e.g. KLK3M0300526128614',
    visit: 1,
    required: true,
    desc: 'Clear photo of Solar Panel 2 QR / Barcode',
  },
  {
    id: 'inverter_qr',
    key: 'inverter_qr',
    title: 'Inverter (QR Code)',
    badge: '1st Visit',
    badgeClass: 'bg-soft-warning text-warning',
    isQr: true,
    hasSerialInput: true,
    serialPlaceholder: 'e.g. INV-KLK-908231',
    visit: 1,
    required: true,
    desc: 'Clear photo of Inverter serial & QR code',
  },
  {
    id: 'smart_meter',
    key: 'smart_meter',
    title: 'Smart Meter',
    badge: '1st Visit',
    badgeClass: 'bg-soft-info text-info',
    isQr: false,
    hasSerialInput: false,
    visit: 1,
    required: true,
    desc: 'Photo showing Smart Meter display & number',
  },
  {
    id: 'acdb',
    key: 'acdb',
    title: 'ACDB Box',
    badge: '1st Visit',
    badgeClass: 'bg-soft-primary text-primary',
    isQr: false,
    hasSerialInput: false,
    visit: 1,
    required: true,
    desc: 'Photo of AC Distribution Box interior & connections',
  },
  {
    id: 'system_wiring',
    key: 'system_wiring',
    title: 'System (ACDB + Inverter + Wiring)',
    badge: '1st Visit',
    badgeClass: 'bg-soft-dark text-dark',
    isQr: false,
    hasSerialInput: false,
    visit: 1,
    required: true,
    desc: 'Full view of ACDB + Inverter connected with proper wiring',
  },
  {
    id: 'structure_earthing',
    key: 'structure_earthing',
    title: 'Structure & Earthing',
    badge: '1st Visit',
    badgeClass: 'bg-soft-secondary text-secondary',
    isQr: false,
    hasSerialInput: false,
    visit: 1,
    required: true,
    desc: 'Mounting structure, lightning arrester & earthing pit',
  },
  {
    id: 'solar_meter_v1',
    key: 'solar_meter_v1',
    title: 'Solar Meter (if already on site)',
    badge: '1st Visit / Optional',
    badgeClass: 'bg-soft-dark text-dark',
    isQr: false,
    hasSerialInput: false,
    visit: 1,
    required: false,
    optionalWhenSolarAvailable: true,
    desc: 'Optional 8th photo — only if solar meter is already installed on 1st visit',
  },
  {
    id: 'solar_meter_v2',
    key: 'solar_meter_v2',
    title: 'Solar Meter',
    badge: '2nd Visit',
    badgeClass: 'bg-soft-dark text-dark',
    isQr: false,
    hasSerialInput: false,
    visit: 2,
    required: true,
    desc: 'Dedicated bidirectional Solar Meter photo',
  },
  {
    id: 'system_complete',
    key: 'system_complete',
    title: 'System (with Solar Meter)',
    badge: '2nd Visit',
    badgeClass: 'bg-soft-success text-success',
    isQr: false,
    hasSerialInput: false,
    visit: 2,
    required: true,
    desc: 'Complete system photo (ACDB + Inverter + wiring + solar meter)',
  },
]

export const getUlaSlotsForVisit = (visitType, solarMeterOnFirstVisit = false) => {
  const visit = visitType === '2nd Visit' ? 2 : 1
  return ULA_IMAGE_SLOTS.filter((slot) => {
    if (slot.visit !== visit) return false
    if (slot.optionalWhenSolarAvailable && visit === 1) {
      return solarMeterOnFirstVisit
    }
    return true
  }).map((slot) => {
    if (slot.optionalWhenSolarAvailable && visit === 1 && solarMeterOnFirstVisit) {
      return {
        ...slot,
        required: true,
        badge: '1st Visit',
        badgeClass: 'bg-soft-dark text-dark',
      }
    }
    return slot
  })
}

/** Google Maps link for survey GPS (opens pin at lat/lng). */
export const buildMapsUrl = (latitude, longitude) => {
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return `https://www.google.com/maps?q=${lat},${lng}`
}

export const formatGpsPair = (latitude, longitude, fractionDigits = 4) => {
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return `${lat.toFixed(fractionDigits)}, ${lng.toFixed(fractionDigits)}`
}

const ULA_IMAGE_FIELD_KEYS = [
  'panel_one_img',
  'panel_two_img',
  'inverter_img',
  'smart_meter_img',
  'acdb_img',
  'system_img',
  'solar_meter_img',
  'solar_meter_img2',
  'system_img2',
]

/** Photo count including structure image stored in remarks JSON. */
export const countUlaSurveyPhotos = (row) => {
  if (!row) return 0
  let count = ULA_IMAGE_FIELD_KEYS.filter((key) => row[key]).length
  if (row.structure_img_url) {
    count += 1
  } else {
    try {
      const parsed = JSON.parse(row.remarks || '{}')
      if (parsed?.structure_img) count += 1
    } catch {
      /* plain remarks */
    }
  }
  return count
}

/** Minimum photos for a complete 1st visit (7 required; +1 if solar meter on 1st visit). */
export const expectedFirstVisitPhotoCount = (row) =>
  row?.solar_meter_img ? 8 : 7

export const dataUrlToBlob = async (dataUrl) => {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  const mimeMatch = /^data:([^;,]+)/i.exec(String(dataUrl || ''))
  const mime = blob.type || mimeMatch?.[1] || 'image/jpeg'
  if (blob.type === mime) return blob
  return new Blob([await blob.arrayBuffer()], { type: mime })
}

/** FormData part with explicit JPEG type (avoids multer rejecting application/octet-stream). */
export const dataUrlToUploadFile = async (dataUrl, filename) => {
  const blob = await dataUrlToBlob(dataUrl)
  const type = blob.type?.startsWith('image/') ? blob.type : 'image/jpeg'
  return new File([blob], filename, { type })
}

export const formatIndianDateTime = (date = new Date()) => {
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(d)
}

/** 2nd visit timestamp from API, remarks backup, or updated_at when 2nd visit is complete. */
export const resolveUlaSecondVisitAt = (survey) => {
  if (!survey) return null
  if (survey.second_visit_at) return survey.second_visit_at

  if (survey.second_visit_complete) {
    try {
      const meta = JSON.parse(survey.remarks || '{}')
      const raw = meta?.second_visit_at || meta?.second_visit_at_iso
      if (raw) {
        const d = new Date(raw)
        if (!Number.isNaN(d.getTime())) return d
      }
    } catch {
      /* plain-text remarks */
    }
    return survey.updated_at || null
  }

  return null
}

export const formatSurveyDateTimeDisplay = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

export const formatSurveyDateDisplay = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return formatIndianDateTime(d)
}

/**
 * Load jsQR script dynamically if needed
 */
export const loadJsQr = () => {
  if (typeof window !== 'undefined' && window.jsQR) return Promise.resolve(window.jsQR)
  return new Promise((resolve) => {
    if (typeof document === 'undefined') return resolve(null)
    const existing = document.getElementById('jsqr-script')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.jsQR))
      return
    }
    const script = document.createElement('script')
    script.id = 'jsqr-script'
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'
    script.async = true
    script.onload = () => resolve(window.jsQR)
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })
}

/**
 * Scan QR Code or Barcode from canvas or image source
 * Automatically detects solar panel / equipment serial numbers (e.g. KLK3M0300526128613)
 */
export const scanQrOrBarcode = async (imageOrCanvas) => {
  try {
    let canvas = imageOrCanvas
    if (!(imageOrCanvas instanceof HTMLCanvasElement)) {
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

      canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || img.width || 800
      canvas.height = img.naturalHeight || img.height || 600
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }

    let found = await detectOnCanvas(canvas)
    if (found) return found

    const w = canvas.width
    const h = canvas.height
    const regions = [
      { x: 0, y: 0, w, h },
      { x: Math.floor(w * 0.15), y: Math.floor(h * 0.15), w: Math.floor(w * 0.7), h: Math.floor(h * 0.7) },
      { x: Math.floor(w * 0.25), y: Math.floor(h * 0.2), w: Math.floor(w * 0.5), h: Math.floor(h * 0.6) },
    ]

    for (const region of regions) {
      if (region.w < 80 || region.h < 80) continue
      found = await detectOnCanvas(
        (() => {
          const slice = document.createElement('canvas')
          slice.width = region.w
          slice.height = region.h
          slice.getContext('2d').drawImage(canvas, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h)
          return slice
        })()
      )
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

/** ULA image stamp (full site fields on system photos). */
export const stampImageWithMetadata = (imageSrc, metadata = {}) =>
  stampImageDataUrl(imageSrc, {
    caNumber: metadata.caNumber,
    caName: metadata.caName,
    district: metadata.district,
    block: metadata.block,
    panchayat: metadata.panchayat,
    village: metadata.village,
    fullSiteStamp: metadata.fullSiteStamp,
    latitude: metadata.latitude,
    longitude: metadata.longitude,
    capturedAt: metadata.capturedAt || new Date(),
  })

const STORAGE_KEY = 'klk_bihar_ula_records_v1'

const DEFAULT_SAMPLE_RECORDS = [
  {
    id: 'ULA-BR-1001',
    caNumber: '1029384756',
    caName: 'Rameshwar Prasad Singh',
    district: 'Patna',
    block: 'Phulwari Sharif',
    panchayat: 'Nohsa',
    village: 'Nohsa Tola',
    dateTime: '18-Sep-2026 11:30:15 AM',
    latitude: '25.594095',
    longitude: '85.137566',
    visitType: '1st Visit',
    modificationRequired: true,
    modificationNotes: 'Solar meter replacement and earthing re-routing required during 2nd visit',
    serialNumbers: {
      panel1_qr: 'KLK3M0300526128613',
      panel2_qr: 'KLK3M0300526128614',
      inverter_qr: 'INV-KLK-908231',
      smart_meter: 'SM-884920',
    },
    imagesCount: 8,
    images: {
      panel1_qr: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=60',
      panel2_qr: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=60',
      inverter_qr: 'https://images.unsplash.com/photo-1548611716-ad888c3a1e94?w=600&auto=format&fit=crop&q=60',
      smart_meter: 'https://images.unsplash.com/photo-1558441719-8b489c634a1b?w=600&auto=format&fit=crop&q=60',
      acdb: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=60',
      system_wiring: 'https://images.unsplash.com/photo-1613665813446-82a78c468a1d?w=600&auto=format&fit=crop&q=60',
      structure_earthing: 'https://images.unsplash.com/photo-1508873696983-2df57046475a?w=600&auto=format&fit=crop&q=60',
      site_consumer: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=600&auto=format&fit=crop&q=60',
    },
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'ULA-BR-1002',
    caNumber: '1084729104',
    caName: 'Sunita Devi',
    district: 'Gaya',
    block: 'Bodh Gaya',
    panchayat: 'Bakror',
    village: 'Bakror Purab',
    dateTime: '17-Sep-2026 03:45:22 PM',
    latitude: '24.696135',
    longitude: '84.986952',
    visitType: '2nd Visit',
    modificationRequired: false,
    modificationNotes: 'All 10 images verified, Solar meter successfully synchronized with grid.',
    serialNumbers: {
      panel1_qr: 'KLK3M0300526190123',
      panel2_qr: 'KLK3M0300526190124',
      inverter_qr: 'INV-KLK-771890',
      smart_meter: 'SM-551029',
      solar_meter: 'SLM-102941',
    },
    imagesCount: 10,
    images: {
      panel1_qr: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=60',
      panel2_qr: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=60',
      inverter_qr: 'https://images.unsplash.com/photo-1548611716-ad888c3a1e94?w=600&auto=format&fit=crop&q=60',
      smart_meter: 'https://images.unsplash.com/photo-1558441719-8b489c634a1b?w=600&auto=format&fit=crop&q=60',
      acdb: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=60',
      system_wiring: 'https://images.unsplash.com/photo-1613665813446-82a78c468a1d?w=600&auto=format&fit=crop&q=60',
      solar_meter: 'https://images.unsplash.com/photo-1558441719-8b489c634a1b?w=600&auto=format&fit=crop&q=60',
      system_complete: 'https://images.unsplash.com/photo-1613665813446-82a78c468a1d?w=600&auto=format&fit=crop&q=60',
      structure_earthing: 'https://images.unsplash.com/photo-1508873696983-2df57046475a?w=600&auto=format&fit=crop&q=60',
      site_consumer: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=600&auto=format&fit=crop&q=60',
    },
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
]

export const getUlaRecords = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SAMPLE_RECORDS))
      return DEFAULT_SAMPLE_RECORDS
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : DEFAULT_SAMPLE_RECORDS
  } catch {
    return DEFAULT_SAMPLE_RECORDS
  }
}

export const saveUlaRecord = (newRecord) => {
  const existing = getUlaRecords()
  const updated = [newRecord, ...existing]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.error('LocalStorage write failed (quota possibly exceeded):', err)
  }
  return updated
}

export const deleteUlaRecord = (id) => {
  const existing = getUlaRecords()
  const updated = existing.filter((r) => r.id !== id)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.error('LocalStorage write failed:', err)
  }
  return updated
}

const ULA_ERP_STATE = 'bihar'

/** ERP ula-installation rows use district / block_name / panchayat_name. */
const pickUlaInstallationField = (item, keys) => {
  if (!item || typeof item !== 'object') return null
  for (const key of keys) {
    const raw = item[key]
    if (raw == null || raw === '') continue
    const text = String(raw).trim()
    if (text) return text
  }
  return null
}

const readUlaInstallationList = (response) => {
  const body = response?.data
  if (Array.isArray(body?.data)) return body.data
  if (Array.isArray(body)) return body
  return []
}

export const fetchUlaInstallationDistricts = async () => {
  const res = await externalApi.get(external.ulaInstallation.district(ULA_ERP_STATE))
  const list = readUlaInstallationList(res)
  return mapDistinctFieldOptions(list, (item) =>
    pickUlaInstallationField(item, ['district', 'district_name'])
  )
}

export const fetchUlaInstallationBlocks = async (district) => {
  const districtName = String(district || '').trim()
  if (!districtName) return []
  const res = await externalApi.get(external.ulaInstallation.blocks(ULA_ERP_STATE), {
    params: { district: districtName },
  })
  const list = readUlaInstallationList(res)
  return mapDistinctFieldOptions(list, (item) =>
    pickUlaInstallationField(item, ['block_name', 'block'])
  )
}

export const fetchUlaInstallationPanchayats = async (district, block) => {
  const districtName = String(district || '').trim()
  const blockName = String(block || '').trim()
  if (!districtName || !blockName) return []
  const res = await externalApi.get(external.ulaInstallation.panchayat(ULA_ERP_STATE), {
    params: { district: districtName, block: blockName },
  })
  const list = readUlaInstallationList(res)
  return mapDistinctFieldOptions(list, (item) =>
    pickUlaInstallationField(item, [
      'panchayat_name',
      'panchyat',
      'panchayat',
    ])
  )
}

export const fetchUlaSurveys = async () => {
  const res = await localApi.get(api.biharUla.list)
  return res?.data?.data || []
}

export const fetchUlaSurveyById = async (id) => {
  const res = await localApi.get(api.biharUla.view(id))
  return res?.data?.data || null
}

/** Download ZIP named {ca_no}.zip with all survey images. */
export const downloadUlaImagesZip = async (id, caNumber) => {
  const res = await localApi.get(api.biharUla.downloadImagesZip(id), {
    responseType: 'blob',
  })
  const blob = res.data
  const safeName = String(caNumber || id)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 80)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${safeName || 'ula'}.zip`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const submitUlaFirstVisit = async ({
  form,
  images,
  serialNumbers,
  solarMeterOnFirstVisit,
}) => {
  const user = getUser()
  const companyId = getCompanyId() || user?.company_id || user?.companyId
  const fd = new FormData()

  fd.append('company_id', companyId || '')
  fd.append('ca_no', sanitizeCaNumberInput(form.caNumber))
  fd.append('ca_name', form.caName)
  fd.append('beneficiary_name', form.caName)
  fd.append('beneficiary_contact', sanitizeMobileInput(form.beneficiaryContact))
  fd.append('district', form.district || '')
  fd.append('block', form.block || '')
  fd.append('panchayat', form.panchayat || '')
  fd.append('village', form.village || '')
  fd.append('survey_date', new Date().toISOString().slice(0, 10))
  fd.append('latitude', form.latitude || '')
  fd.append('longitude', form.longitude || '')
  fd.append('solar_meter_on_first_visit', solarMeterOnFirstVisit ? '1' : '0')

  Object.entries(ULA_SERIAL_API_FIELD).forEach(([slotKey, fieldName]) => {
    if (serialNumbers[slotKey]) {
      fd.append(fieldName, serialNumbers[slotKey])
    }
  })

  const slots = getUlaSlotsForVisit('1st Visit', solarMeterOnFirstVisit)
  for (const slot of slots) {
    if (!images[slot.key]) continue
    let apiField = ULA_SLOT_API_FIELD[slot.key]
    if (slot.key === 'structure_earthing') {
      apiField = 'structure_img'
    }
    if (!apiField) continue
    const file = await dataUrlToUploadFile(images[slot.key], `${slot.key}.jpg`)
    fd.append(apiField, file)
  }

  const res = await localApi.post(api.biharUla.store, fd, {
    headers: { 'Content-Type': undefined },
  })
  return res?.data
}

export const submitUlaSecondVisit = async ({ recordId, images, latitude, longitude, remarks }) => {
  const fd = new FormData()
  fd.append('latitude2', latitude || '')
  fd.append('longitude2', longitude || '')
  if (remarks) fd.append('remarks', remarks)

  for (const key of ['solar_meter_v2', 'system_complete']) {
    const apiField = ULA_SLOT_API_FIELD[key]
    if (!images[key] || !apiField) continue
    const file = await dataUrlToUploadFile(images[key], `${key}.jpg`)
    fd.append(apiField, file)
  }

  const res = await localApi.patch(api.biharUla.secondVisit(recordId), fd, {
    headers: { 'Content-Type': undefined },
  })
  return res?.data
}

/** Map API survey row to display-friendly image URLs (1st + 2nd visit). */
export const mapSurveyToDisplayImages = (survey) => {
  if (!survey) return {}

  let structureImg = survey.structure_img_url || null
  if (!structureImg) {
    try {
      const parsed = JSON.parse(survey.remarks || '{}')
      if (parsed?.structure_img) {
        structureImg = parsed.structure_img
      }
    } catch {
      /* plain remarks */
    }
  }

  const images = {
    panel1_qr: survey.panel_one_img_url,
    panel2_qr: survey.panel_two_img_url,
    inverter_qr: survey.inverter_img_url,
    smart_meter: survey.smart_meter_img_url,
    acdb: survey.acdb_img_url,
    system_wiring: survey.system_img_url,
    solar_meter_v1: survey.solar_meter_img_url,
    solar_meter_v2: survey.solar_meter_img2_url,
    system_complete: survey.system_img2_url,
  }

  if (structureImg) {
    images.structure_earthing = structureImg
  }

  return images
}

export const mapSurveyToDetailsRecord = (survey) => {
  if (!survey) return null

  const images = mapSurveyToDisplayImages(survey)

  return {
    id: survey.id,
    caNumber: survey.ca_no,
    caName: survey.ca_name,
    beneficiaryContact: survey.beneficiary_contact,
    district: survey.district,
    block: survey.block,
    panchayat: survey.panchayat,
    village: survey.village,
    surveyDate: formatSurveyDateDisplay(survey.survey_date),
    dateTime: formatSurveyDateDisplay(survey.survey_date),
    firstVisitAt: survey.created_at,
    firstVisitAtDisplay: formatSurveyDateTimeDisplay(survey.created_at),
    latitude: survey.latitude,
    longitude: survey.longitude,
    latitude2: survey.latitude2,
    longitude2: survey.longitude2,
    visitType: survey.second_visit_complete
      ? '2nd Visit complete'
      : survey.first_visit_complete
        ? '1st Visit complete'
        : '1st Visit',
    firstVisitComplete: Boolean(survey.first_visit_complete),
    secondVisitComplete: Boolean(survey.second_visit_complete),
    serialNumbers: {
      panel1_qr: survey.panel_one_no,
      panel2_qr: survey.panel_two_no,
      inverter_qr: survey.inverter_no,
    },
    images,
    remarks: survey.remarks,
    createdAt: survey.created_at,
    updatedAt: survey.updated_at,
    createdByName: resolveUlaSurveyorDisplayName(survey),
    secondVisitByName: (() => {
      const n = resolveUlaSurveyorDisplayName(survey, {
        userIdField: 'user_id2',
        nameField: 'user_name2',
      })
      return n === '—' ? null : n
    })(),
    createdById: survey.user_id,
    secondVisitById: survey.user_id2,
    secondVisitAt: resolveUlaSecondVisitAt(survey),
    secondVisitAtDisplay: formatSurveyDateTimeDisplay(
      resolveUlaSecondVisitAt(survey)
    ),
  }
}
