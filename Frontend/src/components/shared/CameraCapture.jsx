import { useEffect, useRef, useState } from 'react'
import { FiAlertCircle, FiCamera, FiCheckCircle, FiX } from 'react-icons/fi'
import {
  captureStampedCameraPhoto,
  captureStampedDataUrlFromVideo,
} from '../../utils/cameraCapture'

const CameraCapture = ({
  label,
  hint,
  file,
  onCapture,
  onClear,
  /** Controlled preview (data URL) — same preview UI as Light AMC file photos */
  previewDataUrl,
  onCaptureDataUrl,
  stampCaNumber,
  stampMetadata,
  onRawFrame,
  beforeOpen,
  modalNote,
  /** Tap captured preview to open full-size popup (e.g. ULA 2nd visit) */
  onPreviewClick,
}) => {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const closeCamera = () => {
    stopStream()
    setIsOpen(false)
  }

  const openCamera = async () => {
    setError('')

    if (beforeOpen) {
      const allowed = await beforeOpen()
      if (allowed === false) return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera is not supported on this device.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })

      streamRef.current = stream
      setIsOpen(true)

      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      })
    } catch {
      setError('Could not open camera. Allow camera permission and try again.')
    }
  }

  const handleCapture = async () => {
    if (!videoRef.current) return

    setIsCapturing(true)
    setError('')

    try {
      if (onCaptureDataUrl) {
        const { dataUrl, coords } = await captureStampedDataUrlFromVideo(
          videoRef.current,
          {
            caNumber: stampCaNumber,
            stampMetadata: stampMetadata || (stampCaNumber ? { caNumber: stampCaNumber } : undefined),
            onRawFrame: onRawFrame,
          }
        )
        onCaptureDataUrl(dataUrl, coords)
        if (!previewDataUrl) setPreviewUrl(dataUrl)
      } else {
        const { file: stampedFile, coords } = await captureStampedCameraPhoto(
          videoRef.current
        )
        onCapture?.(stampedFile, coords)
        setPreviewUrl(URL.createObjectURL(stampedFile))
      }
      closeCamera()
    } catch (err) {
      setError(err.message || 'Failed to capture photo.')
    } finally {
      setIsCapturing(false)
    }
  }

  useEffect(() => {
    if (previewDataUrl) return undefined
    if (!file) {
      setPreviewUrl('')
      return undefined
    }

    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file, previewDataUrl])

  useEffect(() => () => stopStream(), [])

  const displayPreview = previewDataUrl || previewUrl

  return (
    <div>
      {!displayPreview ? (
        <button
          type="button"
          className="camera-capture-box w-100"
          onClick={openCamera}
        >
          <span className="camera-capture-icon">
            <FiCamera size={18} />
          </span>
          <span className="camera-capture-label">{label}</span>
          <span className="camera-capture-hint">{hint || 'Camera only • GPS will be printed on photo'}</span>
        </button>
      ) : (
        <div className="camera-capture-preview">
          <img
            src={displayPreview}
            alt={label}
            className={onPreviewClick ? 'ula-clickable-photo' : undefined}
            onClick={() => onPreviewClick?.({ src: displayPreview, title: label })}
            onKeyDown={(e) => {
              if (onPreviewClick && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                onPreviewClick({ src: displayPreview, title: label })
              }
            }}
            role={onPreviewClick ? 'button' : undefined}
            tabIndex={onPreviewClick ? 0 : undefined}
          />
          <button
            type="button"
            className="camera-capture-remove"
            onClick={(e) => {
              e.stopPropagation()
              onClear?.()
              if (!previewDataUrl) setPreviewUrl('')
            }}
            aria-label="Remove photo"
          >
            <FiX size={14} />
          </button>
          <span className="camera-capture-saved">
            <FiCheckCircle size={12} /> GPS stamped
          </span>
        </div>
      )}

      {error && (
        <div className="camera-capture-error">
          <FiAlertCircle size={14} /> {error}
        </div>
      )}

      {isOpen && (
        <div className="camera-capture-modal">
          <div className="camera-capture-modal-card">
            <div className="camera-capture-modal-head">
              <strong>{label}</strong>
              <button type="button" className="btn btn-sm btn-light" onClick={closeCamera}>
                Close
              </button>
            </div>
            <div className="camera-capture-video-wrap">
              <video ref={videoRef} autoPlay playsInline muted />
            </div>
            <p className="camera-capture-modal-note">
              {modalNote ||
                'Photo will include current latitude, longitude, and time on the image.'}
            </p>
            <button
              type="button"
              className="btn btn-primary w-100 d-inline-flex align-items-center justify-content-center gap-2"
              onClick={handleCapture}
              disabled={isCapturing}
            >
              <FiCamera size={16} />
              {isCapturing ? 'Capturing...' : 'Capture Photo'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CameraCapture
