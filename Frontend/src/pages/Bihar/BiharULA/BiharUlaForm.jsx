import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  FiCheckCircle,
  FiLoader,
  FiMapPin,
  FiCalendar,
  FiUser,
  FiPaperclip,
  FiList,
  FiHash,
  FiCpu,
  FiArrowLeft,
} from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import SelectDropdown from '@/components/shared/SelectDropdown'
import CameraCapture from '@/components/shared/CameraCapture'
import SerialScannerInput from '@/components/shared/SerialScannerInput'
import { pages } from '../../../api/routes'
import {
  ULA_IMAGE_SLOTS,
  fetchUlaInstallationDistricts,
  fetchUlaInstallationBlocks,
  fetchUlaInstallationPanchayats,
  getUlaSlotsForVisit,
  formatIndianDateTime,
  formatSurveyDateDisplay,
  mapSurveyToDisplayImages,
  scanQrOrBarcode,
  loadJsQr,
  ULA_QR_SERIAL_SLOT_KEYS,
  ULA_SERIAL_API_FIELD,
  fetchUlaSurveyById,
  submitUlaFirstVisit,
  submitUlaSecondVisit,
  parseUlaSurveyVisitNotes,
  sanitizeCaNumberInput,
  sanitizeMobileInput,
  isValidCaNumber,
  isValidIndianMobile,
} from './ulaHelpers'
import { resolveUploadUrl } from '../../../utils/uploadUrl'
import '../../../styles/camera-capture.css'
import '../../../styles/bihar-ula.css'
import UlaPhotoLightbox from './UlaPhotoLightbox'

const SectionHeading = ({ icon, title, subtitle }) => (
  <div className="d-flex align-items-center gap-3 mb-4">
    <div className="avatar-text avatar-md bg-soft-primary text-primary icon flex-shrink-0">
      {icon}
    </div>
    <div>
      <h6 className="fw-bold text-dark mb-0">{title}</h6>
      {subtitle && <p className="fs-12 text-muted mb-0">{subtitle}</p>}
    </div>
  </div>
)

const ReadOnlyField = ({ label, value }) => (
  <div className="col-lg-4 col-md-6">
    <label className="form-label fs-11 text-muted mb-1">{label}</label>
    <div className="form-control bg-light fs-13">{value || '—'}</div>
  </div>
)

const BiharUlaForm = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const recordId = searchParams.get('id')
  const isSecondVisitMode = searchParams.get('visit') === '2' && Boolean(recordId)

  // Form State
  const [selectedDistrict, setSelectedDistrict] = useState(null)
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [selectedPanchayat, setSelectedPanchayat] = useState(null)
  const [districtOptions, setDistrictOptions] = useState([])
  const [blockOptions, setBlockOptions] = useState([])
  const [panchayatOptions, setPanchayatOptions] = useState([])
  const [isDistrictLoading, setIsDistrictLoading] = useState(false)
  const [isBlockLoading, setIsBlockLoading] = useState(false)
  const [isPanchayatLoading, setIsPanchayatLoading] = useState(false)
  const [locationLoadError, setLocationLoadError] = useState('')
  const [village, setVillage] = useState('')

  const [caNumber, setCaNumber] = useState('')
  const [caName, setCaName] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [isLocating, setIsLocating] = useState(false)

  const [visitType, setVisitType] = useState(isSecondVisitMode ? '2nd Visit' : '1st Visit')
  const [solarMeterOnFirstVisit, setSolarMeterOnFirstVisit] = useState(false)
  const [beneficiaryContact, setBeneficiaryContact] = useState('')
  const [visit1Remarks, setVisit1Remarks] = useState('')
  const [visit2Remarks, setVisit2Remarks] = useState('')
  const [loadedSurvey, setLoadedSurvey] = useState(null)
  const [isLoadingRecord, setIsLoadingRecord] = useState(false)

  // Images state: { [slot_key]: dataUrl }
  const [images, setImages] = useState({})
  // Serial numbers state: { [slot_key]: "KLK3M0300526128613" }
  const [serialNumbers, setSerialNumbers] = useState({})
  /** true = filled from QR on capture; false = typed manually */
  const [serialFromQr, setSerialFromQr] = useState({})
  const [scanningSlot, setScanningSlot] = useState(null)

  // Submitting status
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [scanNotice, setScanNotice] = useState('')
  const [lightboxPhoto, setLightboxPhoto] = useState(null)

  const visibleSlots = useMemo(
    () => getUlaSlotsForVisit(visitType, solarMeterOnFirstVisit),
    [visitType, solarMeterOnFirstVisit]
  )

  useEffect(() => {
    loadJsQr()
  }, [])

  const ulaSiteStampMeta = useMemo(
    () => ({
      caNumber: caNumber.trim(),
      caName: caName.trim(),
      district: selectedDistrict?.value || '',
      block: selectedBlock?.value || '',
      panchayat: selectedPanchayat?.value || '',
      village: village.trim(),
    }),
    [caNumber, caName, selectedDistrict, selectedBlock, selectedPanchayat, village]
  )

  const isSystemPhotoSlot = (key) =>
    key === 'system_wiring' || key === 'system_complete'

  const refreshDateTime = () => {
    setDateTime(formatIndianDateTime(new Date()))
  }

  useEffect(() => {
    refreshDateTime()
    handleDetectGps()
  }, [])

  useEffect(() => {
    if (isSecondVisitMode) return
    let cancelled = false
    setIsDistrictLoading(true)
    setLocationLoadError('')
    fetchUlaInstallationDistricts()
      .then((options) => {
        if (!cancelled) setDistrictOptions(options)
      })
      .catch(() => {
        if (!cancelled) {
          setDistrictOptions([])
          setLocationLoadError(
            'Could not load districts from ERP. Check login and try refreshing the page.'
          )
        }
      })
      .finally(() => {
        if (!cancelled) setIsDistrictLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isSecondVisitMode])

  useEffect(() => {
    if (isSecondVisitMode || !selectedDistrict?.value) {
      setBlockOptions([])
      return
    }
    let cancelled = false
    setIsBlockLoading(true)
    fetchUlaInstallationBlocks(selectedDistrict.value)
      .then((options) => {
        if (!cancelled) setBlockOptions(options)
      })
      .catch(() => {
        if (!cancelled) {
          setBlockOptions([])
          setLocationLoadError('Could not load blocks for the selected district.')
        }
      })
      .finally(() => {
        if (!cancelled) setIsBlockLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isSecondVisitMode, selectedDistrict?.value])

  useEffect(() => {
    if (isSecondVisitMode || !selectedDistrict?.value || !selectedBlock?.value) {
      setPanchayatOptions([])
      return
    }
    let cancelled = false
    setIsPanchayatLoading(true)
    fetchUlaInstallationPanchayats(selectedDistrict.value, selectedBlock.value)
      .then((options) => {
        if (!cancelled) setPanchayatOptions(options)
      })
      .catch(() => {
        if (!cancelled) {
          setPanchayatOptions([])
          setLocationLoadError('Could not load panchayats for the selected block.')
        }
      })
      .finally(() => {
        if (!cancelled) setIsPanchayatLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isSecondVisitMode, selectedDistrict?.value, selectedBlock?.value])

  const handleDistrictSelect = (option) => {
    setSelectedDistrict(option)
    setSelectedBlock(null)
    setSelectedPanchayat(null)
    setLocationLoadError('')
  }

  const handleBlockSelect = (option) => {
    setSelectedBlock(option)
    setSelectedPanchayat(null)
    setLocationLoadError('')
  }

  useEffect(() => {
    if (!isSecondVisitMode || !recordId) return

    setIsLoadingRecord(true)
    fetchUlaSurveyById(recordId)
      .then((survey) => {
        if (!survey) return
        setLoadedSurvey(survey)
        setVisitType('2nd Visit')
        setCaNumber(survey.ca_no || '')
        setCaName(survey.ca_name || survey.beneficiary_name || '')
        setBeneficiaryContact(survey.beneficiary_contact || '')
        if (survey.district) {
          setSelectedDistrict({ value: survey.district, label: survey.district })
        }
        if (survey.block) {
          setSelectedBlock({ value: survey.block, label: survey.block })
        }
        if (survey.panchayat) {
          setSelectedPanchayat({ value: survey.panchayat, label: survey.panchayat })
        }
        setVillage(survey.village || '')
        if (!isSecondVisitMode) {
          setLatitude(survey.latitude || '')
          setLongitude(survey.longitude || '')
        } else {
          handleDetectGps()
        }
        setSerialNumbers({
          panel1_qr: survey.panel_one_no || '',
          panel2_qr: survey.panel_two_no || '',
          inverter_qr: survey.inverter_no || '',
        })
        const notes = parseUlaSurveyVisitNotes(survey)
        setVisit1Remarks(notes.visit1Note)
        setVisit2Remarks('')
      })
      .catch(() => {
        setSubmitError('Failed to load ULA record for 2nd visit.')
      })
      .finally(() => setIsLoadingRecord(false))
  }, [isSecondVisitMode, recordId])

  const handleDetectGps = () => {
    if (!navigator.geolocation) return
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6))
        setLongitude(pos.coords.longitude.toFixed(6))
        refreshDateTime()
        setIsLocating(false)
      },
      () => {
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  // Panel 1 / Panel 2 / Inverter: serial from QR on capture, or manual entry below
  const applyScannedSerial = (slot, detectedCode, sourceLabel, { overwrite = false } = {}) => {
    if (!slot?.key || !detectedCode) return false
    setSerialNumbers((prev) => {
      if (!overwrite && String(prev[slot.key] || '').trim()) return prev
      return { ...prev, [slot.key]: detectedCode }
    })
    setSerialFromQr((prev) => ({ ...prev, [slot.key]: true }))
    setScanNotice(`${sourceLabel} for ${slot.title}: ${detectedCode}`)
    setTimeout(() => setScanNotice(''), 5000)
    return true
  }

  const attemptQrAutoDetect = async (canvas, slot) => {
    if (!slot?.hasSerialInput) return
    setScanningSlot(slot.key)
    try {
      const detectedCode = await scanQrOrBarcode(canvas)
      if (detectedCode && applyScannedSerial(slot, detectedCode, 'Serial auto-read from QR')) {
        return
      }

      setScanNotice(
        `Could not read QR from ${slot.title} photo. Use Scan on the serial field or type manually.`
      )
      setTimeout(() => setScanNotice(''), 7000)
    } catch (err) {
      console.warn('QR auto detect error:', err)
    } finally {
      setScanningSlot(null)
    }
  }

  const attemptQrFromCapturedPhoto = async (dataUrl, slot) => {
    if (!slot?.hasSerialInput || !dataUrl) return
    const detectedCode = await scanQrOrBarcode(dataUrl)
    if (detectedCode) {
      applyScannedSerial(slot, detectedCode, 'Serial read from captured photo')
    }
  }

  const removePhoto = (slotKey) => {
    setImages((prev) => {
      const copy = { ...prev }
      delete copy[slotKey]
      return copy
    })
    if (ULA_SERIAL_API_FIELD[slotKey]) {
      setSerialNumbers((prev) => {
        const copy = { ...prev }
        delete copy[slotKey]
        return copy
      })
      setSerialFromQr((prev) => {
        const copy = { ...prev }
        delete copy[slotKey]
        return copy
      })
    }
  }

  const handleCancel = () => {
    navigate(pages.bihar.ulaList || '/bihar/ula/list')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')
    setSubmitSuccess(false)

    if (!caNumber.trim()) {
      setSubmitError('Please enter CA Number.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (!isValidCaNumber(caNumber)) {
      setSubmitError('CA number must be digits only (at least 4 digits).')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (beneficiaryContact.trim() && !isValidIndianMobile(beneficiaryContact)) {
      setSubmitError(
        'Beneficiary contact must be a 10-digit mobile number (digits only, starting with 6–9).'
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (!latitude || !longitude) {
      setSubmitError('Please tap Auto Detect GPS before capturing photos.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (!caName.trim()) {
      setSubmitError('Please enter CA Name (Consumer Name).')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (visitType !== '2nd Visit') {
      if (!selectedDistrict?.value) {
        setSubmitError('Please select district from the list.')
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      if (!selectedBlock?.value) {
        setSubmitError('Please select block from the list.')
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      if (!selectedPanchayat?.value) {
        setSubmitError('Please select panchayat from the list.')
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
    }

    const missingSlots = visibleSlots.filter(
      (slot) => slot.required && !images[slot.key]
    )
    if (missingSlots.length) {
      setSubmitError(
        `Please capture required photos: ${missingSlots.map((s) => s.title).join(', ')}`
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (visitType !== '2nd Visit') {
      const qrSlots = ULA_IMAGE_SLOTS.filter((s) => ULA_QR_SERIAL_SLOT_KEYS.includes(s.key))
      const missingSerials = qrSlots.filter(
        (slot) => images[slot.key] && !String(serialNumbers[slot.key] || '').trim()
      )
      if (missingSerials.length) {
        setSubmitError(
          `Enter serial number for: ${missingSerials.map((s) => s.title).join(', ')}. ` +
            'It is auto-filled from QR when readable; otherwise type it manually.'
        )
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
    }

    setIsSubmitting(true)

    try {
      if (visitType === '2nd Visit' && recordId) {
        await submitUlaSecondVisit({
          recordId,
          images,
          latitude,
          longitude,
          remarks: visit2Remarks,
        })
        setSuccessMessage(`2nd visit saved for CA #${caNumber}.`)
      } else {
        await submitUlaFirstVisit({
          form: {
            caNumber: caNumber.trim(),
            caName: caName.trim(),
            beneficiaryContact: beneficiaryContact.trim(),
            district: selectedDistrict?.value || '',
            block: selectedBlock?.value || '',
            panchayat: selectedPanchayat?.value || '',
            village: village.trim(),
            latitude,
            longitude,
          },
          images,
          serialNumbers,
          solarMeterOnFirstVisit,
          remarks: visit1Remarks,
        })
        setSuccessMessage(`1st visit saved for CA #${caNumber}.`)
      }

      setSubmitSuccess(true)
      setTimeout(() => {
        navigate(pages.bihar.ulaList || '/bihar/ula/list')
      }, 1200)
    } catch (err) {
      setSubmitError(
        err?.response?.data?.message || err?.message || 'Failed to submit ULA form.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const firstVisitPreview = loadedSurvey ? mapSurveyToDisplayImages(loadedSurvey) : {}
  const firstVisitSlots =
    loadedSurvey &&
    getUlaSlotsForVisit('1st Visit', Boolean(loadedSurvey.solar_meter_img))

  const secondVisitSteps = [
    { key: 'solar_meter_v2', title: 'Solar meter photo', done: Boolean(images.solar_meter_v2) },
    { key: 'system_complete', title: 'System with solar meter', done: Boolean(images.system_complete) },
  ]

  const formBody = (
    <div className="card mb-0 border-0 shadow-sm overflow-hidden">
      <div className="ula-form-page-title d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <h5>
            {isSecondVisitMode ? 'Bihar ULA — 2nd visit' : 'Bihar ULA — 1st visit survey'}
          </h5>
          <p>
            {isSecondVisitMode
              ? 'Review saved 1st visit data, then capture 2 required photos.'
              : 'Location, consumer details, camera photos, and QR serials.'}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-light d-inline-flex align-items-center gap-1"
          onClick={handleCancel}
        >
          <FiArrowLeft size={14} /> Back to list
        </button>
      </div>
      <div className="card-body">
        {isSecondVisitMode && (
          <div className="ula-second-visit-banner">
            <h6>Second site visit</h6>
            <p className="fs-12 text-muted mb-2">
              Consumer and location fields below are read-only. Refresh GPS, then capture{' '}
              <strong>solar meter</strong> and <strong>complete system</strong> photos.
            </p>
            <div className="ula-step-row mb-0">
              {secondVisitSteps.map((step) => (
                <div
                  key={step.key}
                  className={`ula-step-pill ${step.done ? 'is-done' : ''}`}
                >
                  <strong>{step.done ? '✓ ' : ''}{step.title}</strong>
                  {step.done ? 'Captured' : 'Pending — use camera below'}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================
            SUCCESS MESSAGE
        ========================================= */}
        {submitSuccess && (
          <div className="alert alert-success d-flex align-items-center gap-2" role="alert">
            <FiCheckCircle />
            {successMessage}
          </div>
        )}

        {/* =========================================
            SCAN NOTICE / TOAST
        ========================================= */}
        {scanNotice && (
          <div className="alert alert-info d-flex align-items-center gap-2" role="alert">
            <FiCpu className="flex-shrink-0" />
            <span>{scanNotice}</span>
          </div>
        )}

        {/* =========================================
            ERROR MESSAGE
        ========================================= */}
        {submitError && (
          <div className="alert alert-danger" role="alert">
            {submitError}
          </div>
        )}

        {locationLoadError && !isSecondVisitMode && (
          <div className="alert alert-warning py-2 fs-13" role="alert">
            {locationLoadError}
          </div>
        )}

        {!isSecondVisitMode && (
          <>
        {/* =========================================
            LOCATION DETAILS
        ========================================= */}
        <SectionHeading
          icon={<FiMapPin size={16} />}
          title="Location Details"
          subtitle="Select the district, block, and village / panchayat for Bihar ULA"
        />

        <div className="row g-3">
          {/* District */}
          <div className="col-lg-4 col-md-6">
            <label className="form-label">
              District <span className="text-danger">*</span>
            </label>
            <SelectDropdown
              options={districtOptions}
              defaultSelect={isDistrictLoading ? 'Loading districts…' : 'Select District'}
              selectedOption={selectedDistrict}
              onSelectOption={isSecondVisitMode ? () => {} : handleDistrictSelect}
            />
          </div>

          {/* Block */}
          <div className="col-lg-4 col-md-6">
            <label className="form-label">
              Block <span className="text-danger">*</span>
            </label>
            <SelectDropdown
              options={blockOptions}
              defaultSelect={
                !selectedDistrict
                  ? 'Select district first'
                  : isBlockLoading
                    ? 'Loading blocks…'
                    : 'Select Block'
              }
              selectedOption={selectedBlock}
              onSelectOption={isSecondVisitMode ? () => {} : handleBlockSelect}
            />
          </div>

          {/* Panchayat */}
          <div className="col-lg-4 col-md-6">
            <label className="form-label">
              Panchayat <span className="text-danger">*</span>
            </label>
            <SelectDropdown
              options={panchayatOptions}
              defaultSelect={
                !selectedBlock
                  ? 'Select block first'
                  : isPanchayatLoading
                    ? 'Loading panchayats…'
                    : 'Select Panchayat'
              }
              selectedOption={selectedPanchayat}
              onSelectOption={
                isSecondVisitMode ? () => {} : setSelectedPanchayat
              }
            />
          </div>

          {/* Village */}
          <div className="col-lg-4 col-md-6">
            <label className="form-label">Village</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter Village"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              readOnly={isSecondVisitMode}
            />
          </div>

          {/* Latitude & Longitude */}
          <div className="col-lg-8 col-md-6">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="form-label mb-0">GPS Coordinates (Lat & Long)</label>
              <button
                type="button"
                className="btn btn-link btn-sm p-0 fs-11 text-decoration-none"
                onClick={handleDetectGps}
                disabled={isLocating}
              >
                {isLocating ? 'Detecting GPS...' : 'Auto Detect GPS'}
              </button>
            </div>
            <div className="input-group">
              <span className="input-group-text bg-light text-muted">
                <FiMapPin size={14} />
              </span>
              <input
                type="text"
                className="form-control bg-light"
                placeholder="Latitude"
                value={latitude}
                readOnly
                aria-readonly="true"
                title="Use Auto Detect GPS — coordinates cannot be typed manually"
              />
              <input
                type="text"
                className="form-control bg-light"
                placeholder="Longitude"
                value={longitude}
                readOnly
                aria-readonly="true"
                title="Use Auto Detect GPS — coordinates cannot be typed manually"
              />
            </div>
            <div className="fs-11 text-muted mt-1">
              {isSecondVisitMode
                ? '2nd visit GPS — tap Auto Detect before capturing 2nd visit photos.'
                : 'GPS only — tap "Auto Detect GPS" to refresh (not editable).'}
            </div>
          </div>
        </div>

        <hr className="border-dashed" />

        {/* =========================================
            CONSUMER (CA) DETAILS
        ========================================= */}
        <SectionHeading
          icon={<FiUser size={16} />}
          title="Consumer (CA) Details"
          subtitle="Consumer Account Number, Beneficiary Name, and Visit Information"
        />

        <div className="row g-3">
          {/* CA Number */}
          <div className="col-lg-4 col-md-6">
            <label className="form-label">
              CA Number <span className="text-danger">*</span>
            </label>
            <div className="input-group">
              <span className="input-group-text bg-light text-muted">
                <FiHash size={14} />
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className="form-control"
                placeholder="e.g. 1029384756"
                value={caNumber}
                onChange={(e) => setCaNumber(sanitizeCaNumberInput(e.target.value))}
                required
                readOnly={isSecondVisitMode}
                pattern="\d*"
              />
            </div>
            <div className="fs-11 text-muted mt-1">Digits only — unique CA number</div>
          </div>

          {/* CA Name */}
          <div className="col-lg-4 col-md-6">
            <label className="form-label">
              CA Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="Consumer / Beneficiary Name"
              value={caName}
              onChange={(e) => setCaName(e.target.value)}
              required
              readOnly={isSecondVisitMode}
            />
            <div className="fs-11 text-muted mt-1">Full Consumer Name</div>
          </div>

          {/* Beneficiary contact */}
          <div className="col-lg-4 col-md-6">
            <label className="form-label">Beneficiary Contact</label>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              className="form-control"
              placeholder="10-digit mobile"
              value={beneficiaryContact}
              onChange={(e) => setBeneficiaryContact(sanitizeMobileInput(e.target.value))}
              readOnly={isSecondVisitMode}
              maxLength={10}
            />
            <div className="fs-11 text-muted mt-1">Digits only (optional)</div>
          </div>

          {/* Date & Time */}
          <div className="col-lg-4 col-md-6">
            <label className="form-label">Date & Time</label>
            <div className="input-group">
              <span className="input-group-text bg-light text-muted">
                <FiCalendar size={14} />
              </span>
              <input
                type="text"
                className="form-control bg-light"
                value={dateTime}
                readOnly
                aria-readonly="true"
                title="Set automatically when you open the camera or detect GPS"
              />
            </div>
            <div className="fs-11 text-muted mt-1">
              Auto-updated on camera / GPS — used on photo stamp (not editable).
            </div>
          </div>

          {/* Visit Stage */}
          <div className="col-lg-4 col-md-6">
            <label className="form-label">Visit Stage</label>
            {isSecondVisitMode ? (
              <div className="alert alert-secondary py-2 mb-0 fs-13">
                2nd visit — 1st visit data is read-only. Add solar meter + system photo only.
              </div>
            ) : (
              <div className="alert alert-light border py-2 mb-0 fs-13">
                1st visit — 7 photos (+ optional 8th if solar meter already on site)
              </div>
            )}
          </div>

          {!isSecondVisitMode && (
            <div className="col-lg-8 col-md-6">
              <div className="form-check form-switch mt-4 pt-1">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="solarMeterFirstVisit"
                  checked={solarMeterOnFirstVisit}
                  onChange={(e) => setSolarMeterOnFirstVisit(e.target.checked)}
                />
                <label className="form-check-label fs-13" htmlFor="solarMeterFirstVisit">
                  Solar meter already available on site (add 8th photo on 1st visit)
                </label>
              </div>
            </div>
          )}

          <div className="col-12">
            <label className="form-label" htmlFor="ula-visit1-remarks">
              1st visit remarks <span className="text-muted fw-normal">(optional)</span>
            </label>
            <textarea
              id="ula-visit1-remarks"
              className="form-control"
              rows={3}
              maxLength={500}
              placeholder="Site condition, issues, or notes for this survey…"
              value={visit1Remarks}
              onChange={(e) => setVisit1Remarks(e.target.value.slice(0, 500))}
            />
            <div className="fs-11 text-muted mt-1">{visit1Remarks.length}/500</div>
          </div>

        </div>

        <hr className="border-dashed" />
          </>
        )}

        {isSecondVisitMode && loadedSurvey && (
          <div className="ula-saved-panel">
            <div className="ula-saved-panel-title d-flex align-items-center gap-2">
              <FiCheckCircle className="text-success" size={16} />
              1st visit — saved record (read-only)
            </div>
            <div className="row g-3 mb-3">
              <ReadOnlyField
                label="1st visit survey date"
                value={formatSurveyDateDisplay(loadedSurvey.survey_date)}
              />
              <ReadOnlyField label="CA Number" value={loadedSurvey.ca_no} />
              <ReadOnlyField
                label="CA / Beneficiary name"
                value={loadedSurvey.ca_name || loadedSurvey.beneficiary_name}
              />
              <ReadOnlyField
                label="Beneficiary contact"
                value={loadedSurvey.beneficiary_contact}
              />
              <ReadOnlyField label="District" value={loadedSurvey.district} />
              <ReadOnlyField label="Block" value={loadedSurvey.block} />
              <ReadOnlyField label="Panchayat" value={loadedSurvey.panchayat} />
              <ReadOnlyField label="Village" value={loadedSurvey.village} />
              <ReadOnlyField
                label="1st visit GPS (Lat, Long)"
                value={
                  loadedSurvey.latitude && loadedSurvey.longitude
                    ? `${Number(loadedSurvey.latitude).toFixed(6)}, ${Number(loadedSurvey.longitude).toFixed(6)}`
                    : '—'
                }
              />
              {visit1Remarks ? (
                <div className="col-12">
                  <label className="form-label fs-11 text-muted mb-1">1st visit remarks</label>
                  <div className="form-control bg-light fs-13" style={{ minHeight: '4.5rem' }}>
                    {visit1Remarks}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="row g-2 mb-3">
              {[
                { label: 'Panel 1', val: loadedSurvey.panel_one_no },
                { label: 'Panel 2', val: loadedSurvey.panel_two_no },
                { label: 'Inverter', val: loadedSurvey.inverter_no },
              ].map(({ label, val }) => (
                <div key={label} className="col-md-4">
                  <div className="ula-serial-card py-2">
                    <span className="fs-11 text-muted">{label} serial</span>
                    <div className="ula-serial-value fs-13">{val || '—'}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="row g-2">
              {firstVisitSlots.map((slot) => {
                const url = firstVisitPreview[slot.key]
                const serial = serialNumbers[slot.key]
                return (
                  <div key={slot.key} className="col-6 col-md-4 col-lg-3">
                    <div className="ula-photo-card">
                      <div className="ula-photo-card-head py-1 px-2">
                        <span className="fs-10 fw-bold text-truncate">{slot.title}</span>
                      </div>
                      {url ? (
                        <img
                          src={resolveUploadUrl(url) || url}
                          alt={slot.title}
                          className="w-100 object-fit-contain bg-dark ula-clickable-photo"
                          style={{ height: 100 }}
                          role="button"
                          tabIndex={0}
                          title="Click to enlarge"
                          onClick={() =>
                            setLightboxPhoto({
                              src: resolveUploadUrl(url) || url,
                              title: slot.title,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setLightboxPhoto({
                                src: resolveUploadUrl(url) || url,
                                title: slot.title,
                              })
                            }
                          }}
                        />
                      ) : (
                        <div
                          className="d-flex align-items-center justify-content-center text-muted fs-10 bg-light"
                          style={{ height: 100 }}
                        >
                          No photo
                        </div>
                      )}
                      {serial && (
                        <div className="px-2 py-1 fs-10 font-monospace border-top text-truncate">
                          {serial}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {isSecondVisitMode && (
          <>
            <SectionHeading
              icon={<FiMapPin size={16} />}
              title="2nd visit GPS & time"
              subtitle="Detect GPS before capturing — used on 2nd visit photo stamps"
            />
            <div className="row g-3 mb-2">
              <div className="col-lg-8">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label mb-0">GPS (Lat & Long)</label>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 fs-11 text-decoration-none"
                    onClick={handleDetectGps}
                    disabled={isLocating}
                  >
                    {isLocating ? 'Detecting…' : 'Auto Detect GPS'}
                  </button>
                </div>
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted">
                    <FiMapPin size={14} />
                  </span>
                  <input type="text" className="form-control bg-light" value={latitude} readOnly />
                  <input type="text" className="form-control bg-light" value={longitude} readOnly />
                </div>
              </div>
              <div className="col-lg-4">
                <label className="form-label">Capture time</label>
                <input type="text" className="form-control bg-light" value={dateTime} readOnly />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="ula-visit2-remarks">
                  2nd visit remarks <span className="text-muted fw-normal">(optional)</span>
                </label>
                <textarea
                  id="ula-visit2-remarks"
                  className="form-control"
                  rows={3}
                  maxLength={500}
                  placeholder="Notes for 2nd visit (installation, meter, wiring, etc.)…"
                  value={visit2Remarks}
                  onChange={(e) => setVisit2Remarks(e.target.value.slice(0, 500))}
                />
                <div className="fs-11 text-muted mt-1">{visit2Remarks.length}/500</div>
              </div>
            </div>
            <hr className="border-dashed my-4" />
          </>
        )}

        <SectionHeading
          icon={<FiPaperclip size={16} />}
          title={
            visitType === '2nd Visit'
              ? 'Capture 2nd visit photos'
              : '1st visit photos (7 required; +1 if solar meter already on site)'
          }
          subtitle={
            visitType === '2nd Visit'
              ? 'Solar meter and full system — system photo includes full site stamp on image.'
              : 'Panel 1, Panel 2 & Inverter: serial from photo QR, Scan button, or manual entry.'
          }
        />

        {isLoadingRecord && (
          <div className="alert alert-info d-flex align-items-center gap-2">
            <FiLoader className="spin" /> Loading saved 1st visit data…
          </div>
        )}

        <div
          className="row g-3"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
        >
          {visibleSlots.map((slot, index) => {
            const currentImage = images[slot.key]
            const readOnlyVisit1OnSecond =
              isSecondVisitMode && slot.visit === 1
            if (readOnlyVisit1OnSecond) return null
            const currentSerial = serialNumbers[slot.key] || ''
            const isScanningThis = scanningSlot === slot.key

            return (
              <div key={slot.id} className="col-lg-4 col-md-6">
                <div className="card border h-100 mb-0 shadow-none">
                  <div className="card-header bg-light py-2 px-3 d-flex justify-content-between align-items-center">
                    <span className="fs-12 fw-bold text-dark text-truncate" title={slot.title}>
                      {index + 1}. {slot.title}
                    </span>
                    <span className={`badge ${slot.badgeClass} fs-11`}>{slot.badge}</span>
                  </div>

                  <div className="card-body p-3 d-flex flex-column align-items-center justify-content-between text-center">
                    <div className="w-100 mb-2">
                      <CameraCapture
                        label={
                          slot.isQr ? 'Open camera to scan / capture' : 'Open camera to capture'
                        }
                        hint={`Camera only • ${slot.desc}`}
                        previewDataUrl={currentImage || ''}
                        stampCaNumber={caNumber.trim() || undefined}
                        stampMetadata={
                          isSystemPhotoSlot(slot.key)
                            ? { ...ulaSiteStampMeta, fullSiteStamp: true }
                            : { caNumber: ulaSiteStampMeta.caNumber, fullSiteStamp: false }
                        }
                        modalNote={
                          isSystemPhotoSlot(slot.key)
                            ? 'System photo: image will show CA no & name, district, block, panchayat, village, date/time, and GPS.'
                            : 'Camera only. Photo will include CA number (if entered), latitude, longitude, and time on the image.'
                        }
                        beforeOpen={async () => {
                          if (!caNumber.trim()) {
                            setSubmitError(
                              'Enter CA Number before capturing photos (used on image stamp).'
                            )
                            return false
                          }
                          if (isSystemPhotoSlot(slot.key)) {
                            if (!caName.trim()) {
                              setSubmitError(
                                'Enter CA Name before system photo — it is printed on the image.'
                              )
                              return false
                            }
                            if (
                              !selectedDistrict?.value ||
                              !selectedBlock?.value ||
                              !selectedPanchayat?.value
                            ) {
                              setSubmitError(
                                'Fill district, block, and panchayat before system photo — they are printed on the image.'
                              )
                              return false
                            }
                          }
                          refreshDateTime()
                          return true
                        }}
                        onRawFrame={(canvas) => attemptQrAutoDetect(canvas, slot)}
                        onCaptureDataUrl={async (dataUrl, coords) => {
                          setImages((prev) => ({ ...prev, [slot.key]: dataUrl }))
                          setLatitude(Number(coords.latitude).toFixed(6))
                          setLongitude(Number(coords.longitude).toFixed(6))
                          refreshDateTime()
                          setSubmitError('')
                          await attemptQrFromCapturedPhoto(dataUrl, slot)
                        }}
                        onClear={() => removePhoto(slot.key)}
                        onPreviewClick={(photo) => setLightboxPhoto(photo)}
                      />
                    </div>

                    {/* Auto-Scanned Serial / QR Code Input Field */}
                    {slot.hasSerialInput && (
                      <div className="w-100 text-start mt-2 pt-2 border-top">
                        <label className="form-label fs-11 fw-semibold text-dark mb-1 d-flex justify-content-between align-items-center">
                          <span>{slot.title} Serial No:</span>
                          {isScanningThis ? (
                            <span className="text-primary fs-10">
                              <FiLoader className="spin" size={10} /> Auto-detecting...
                            </span>
                          ) : currentSerial ? (
                            <span
                              className={`badge fs-10 py-0 ${
                                serialFromQr[slot.key]
                                  ? 'bg-soft-success text-success'
                                  : 'bg-soft-primary text-primary'
                              }`}
                            >
                              <FiCheckCircle size={10} />{' '}
                              {serialFromQr[slot.key] ? 'From QR' : 'Manual'}
                            </span>
                          ) : (
                            <span className="text-muted fs-10">Photo QR, Scan, or type</span>
                          )}
                        </label>
                        <SerialScannerInput
                          value={currentSerial}
                          scanTitle={slot.title}
                          placeholder={
                            slot.serialPlaceholder ||
                            'Type serial, or tap Scan to read QR'
                          }
                          required={Boolean(currentImage)}
                          inputClassName={currentSerial ? 'border-success' : ''}
                          onChange={(value) => {
                            setSerialNumbers((prev) => ({
                              ...prev,
                              [slot.key]: value,
                            }))
                            setSerialFromQr((prev) => ({
                              ...prev,
                              [slot.key]: false,
                            }))
                          }}
                          onScan={(serial) => {
                            applyScannedSerial(slot, serial, 'Serial scanned', {
                              overwrite: true,
                            })
                          }}
                        />
                        {!currentSerial && currentImage && (
                          <div className="fs-10 text-warning mt-1">
                            Required: use Scan on this field or type the serial manually.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* =========================================
            SUBMIT / CANCEL
        ========================================= */}
        <div className="d-flex justify-content-end gap-2 mb-0 pt-4 border-top">
          <button
            type="button"
            className="btn btn-light mt-4"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary mt-4 d-inline-flex align-items-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting && <FiLoader className="spin" size={14} />}
            {isSubmitting
              ? 'Submitting...'
              : visitType === '2nd Visit'
                ? 'Save 2nd visit'
                : 'Save 1st visit'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <PageHeader />
      <div className="main-content">
        <form onSubmit={handleSubmit}>{formBody}</form>
      </div>
      <UlaPhotoLightbox
        photo={lightboxPhoto}
        onClose={() => setLightboxPhoto(null)}
        downloadPrefix={caNumber || 'ula'}
      />
    </>
  )
}

export default BiharUlaForm
