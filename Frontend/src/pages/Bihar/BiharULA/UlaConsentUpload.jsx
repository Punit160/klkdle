import { useEffect, useState } from 'react'
import { FiCheckCircle, FiPlus } from 'react-icons/fi'
import CameraCapture from '@/components/shared/CameraCapture'
import SerialScannerInput from '@/components/shared/SerialScannerInput'
import { dataUrlToUploadFile, uploadUlaConsentForm } from './ulaHelpers'
import { getApiErrorMessage } from '../../../utils/apiError'
import { resolveUploadUrl } from '../../../utils/uploadUrl'
import '../../../styles/camera-capture.css'

const photoCards = [
  {
    key: 'consent',
    title: 'Consent form',
    titleHi: 'सहमति पत्र',
    badge: 'Document',
    badgeClass: 'bg-soft-primary text-primary',
    desc: 'Photo of the signed consent form',
    descHi: 'हस्ताक्षरित सहमति पत्र का फोटो',
  },
  {
    key: 'sim',
    title: 'SIM photo',
    titleHi: 'सिम फोटो',
    badge: 'SIM',
    badgeClass: 'bg-soft-info text-info',
    desc: 'Clear photo of the SIM',
    descHi: 'सिम का स्पष्ट फोटो',
  },
]

const UlaConsentUpload = ({
  id,
  caNumber = '',
  imei = '',
  consentUrl = '',
  simUrl = '',
  disabled = false,
  onUploaded,
  onError,
}) => {
  const [open, setOpen] = useState(false)
  const [imeiNo, setImeiNo] = useState(imei)
  const [imeiFromScan, setImeiFromScan] = useState(false)
  const [photos, setPhotos] = useState({ consent: '', sim: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const savedUrl = {
    consent: consentUrl ? resolveUploadUrl(consentUrl) || consentUrl : '',
    sim: simUrl ? resolveUploadUrl(simUrl) || simUrl : '',
  }

  useEffect(() => {
    if (!open) return undefined
    setImeiNo(imei || '')
    setImeiFromScan(false)
    setPhotos({ consent: '', sim: '' })
    setError('')
    return undefined
  }, [open, imei])

  const close = () => {
    if (busy) return
    setOpen(false)
  }

  const save = async () => {
    const hasNewPhoto = Boolean(photos.consent || photos.sim)
    const hasSaved = Boolean(savedUrl.consent || savedUrl.sim)
    if (!String(imeiNo || '').trim() && !hasNewPhoto && !hasSaved) {
      setError('Capture a consent form or SIM photo, or enter the IMEI.')
      return
    }
    setBusy(true)
    setError('')
    onError?.('')
    try {
      const consentFile = photos.consent
        ? await dataUrlToUploadFile(photos.consent, 'consent_form.jpg')
        : null
      const simFile = photos.sim ? await dataUrlToUploadFile(photos.sim, 'sim_img.jpg') : null
      const payload = await uploadUlaConsentForm(id, {
        consentFile,
        simFile,
        imei: imeiNo,
      })
      onUploaded?.(payload?.data || null)
      setOpen(false)
    } catch (err) {
      const message = getApiErrorMessage(err, 'Could not save the consent form.')
      setError(message)
      onError?.(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
        disabled={disabled || !id}
        onClick={() => setOpen(true)}
      >
        <FiPlus size={14} aria-hidden />
        Add
      </button>
      {open ? (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 100000 }} />
          <div className="modal fade show d-block" style={{ zIndex: 100001 }} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add consent, IMEI, and SIM</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={close} />
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    {photoCards.map((slot, index) => {
                      const captured = photos[slot.key]
                      return (
                        <div key={slot.key} className="col-md-6">
                          <div className="card border h-100 mb-0 shadow-none">
                            <div className="card-header bg-light py-2 px-3 d-flex justify-content-between align-items-center">
                              <span className="fs-12 fw-bold text-dark">
                                {index + 1}. {slot.title}
                                <span className="d-block fs-10 text-muted fw-normal">{slot.titleHi}</span>
                              </span>
                              <span className={`badge ${slot.badgeClass} fs-11`}>{slot.badge}</span>
                            </div>
                            <div className="card-body p-3 d-flex flex-column align-items-center text-center">
                              <div className="w-100 mb-2">
                                <CameraCapture
                                  label="Open camera to capture"
                                  hint={`Camera only • ${slot.desc} • ${slot.descHi}`}
                                  previewDataUrl={captured || ''}
                                  freshGps
                                  stampCaNumber={String(caNumber || '').trim() || undefined}
                                  stampMetadata={{ caNumber: String(caNumber || '').trim(), fullSiteStamp: false }}
                                  modalNote="Camera only. Photo will include CA number (if available), latitude, longitude, and time on the image."
                                  onCaptureDataUrl={(dataUrl) => {
                                    setPhotos((prev) => ({ ...prev, [slot.key]: dataUrl }))
                                    setError('')
                                  }}
                                  onClear={() => setPhotos((prev) => ({ ...prev, [slot.key]: '' }))}
                                />
                                {!captured && savedUrl[slot.key] ? (
                                  <div className="fs-11 text-muted mt-2">A photo is already saved. Capture again to replace it.</div>
                                ) : null}
                              </div>
                              {slot.key === 'sim' ? (
                                <div className="w-100 text-start mt-2 pt-2 border-top">
                                  <label className="form-label fs-11 fw-semibold text-dark mb-1 d-flex justify-content-between align-items-center">
                                    <span>
                                      IMEI number
                                      <span className="d-block fw-normal text-muted">आईएमईआई नंबर — scan or type</span>
                                    </span>
                                    {imeiNo ? (
                                      <span className={`badge fs-10 py-0 ${imeiFromScan ? 'bg-soft-success text-success' : 'bg-soft-primary text-primary'}`}>
                                        <FiCheckCircle size={10} /> {imeiFromScan ? 'From QR' : 'Manual'}
                                      </span>
                                    ) : (
                                      <span className="text-muted fs-10">Scan or type</span>
                                    )}
                                  </label>
                                  <SerialScannerInput
                                    value={imeiNo}
                                    scanTitle="IMEI number"
                                    placeholder="Type the IMEI, or tap Scan"
                                    inputClassName={imeiNo ? 'border-success' : ''}
                                    onChange={(value) => {
                                      setImeiNo(value)
                                      setImeiFromScan(false)
                                    }}
                                    onScan={(value) => {
                                      setImeiNo(value)
                                      setImeiFromScan(true)
                                    }}
                                  />
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {error ? <div className="text-danger fs-12 mt-3">{error}</div> : null}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={close} disabled={busy}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
                    {busy ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  )
}

export default UlaConsentUpload
