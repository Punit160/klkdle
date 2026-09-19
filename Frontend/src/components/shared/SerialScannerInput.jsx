import { useCallback, useEffect, useRef, useState } from 'react'
import { FiAlertCircle, FiCamera, FiLoader } from 'react-icons/fi'
import { loadJsQr, scanQrOrBarcode } from '../../utils/equipmentQrScan'

/**
 * Text field + live QR/barcode scanner (camera). User can type manually or tap Scan.
 */
const SerialScannerInput = ({
  value,
  onChange,
  onScan,
  placeholder,
  required,
  disabled,
  scanTitle = 'Serial number',
  inputClassName = '',
}) => {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const scanBusyRef = useRef(false)

  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState('')
  const [isStarting, setIsStarting] = useState(false)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const closeScanner = useCallback(() => {
    stopStream()
    setIsOpen(false)
    setError('')
  }, [stopStream])

  const openScanner = async () => {
    if (disabled) return
    setError('')
    setIsStarting(true)

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera is not supported on this device.')
      setIsStarting(false)
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
    } finally {
      setIsStarting(false)
    }
  }

  const tryScanFrame = useCallback(async () => {
    if (!isOpen || scanBusyRef.current || !videoRef.current) return
    const video = videoRef.current
    if (video.readyState < 2 || !video.videoWidth) return

    scanBusyRef.current = true
    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d').drawImage(video, 0, 0)
      const code = await scanQrOrBarcode(canvas)
      if (code) {
        if (onScan) onScan(code)
        else onChange?.(code)
        closeScanner()
      }
    } catch {
      /* keep scanning */
    } finally {
      scanBusyRef.current = false
    }
  }, [closeScanner, isOpen, onChange, onScan])

  useEffect(() => {
    if (!isOpen) return undefined
    const timer = setInterval(() => {
      tryScanFrame()
    }, 280)
    return () => clearInterval(timer)
  }, [isOpen, tryScanFrame])

  useEffect(() => {
    loadJsQr()
  }, [])

  useEffect(() => () => stopStream(), [stopStream])

  return (
    <>
      <div className="input-group input-group-sm serial-scanner-input">
        <input
          type="text"
          className={`form-control form-control-sm ${inputClassName}`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          required={required}
          disabled={disabled}
          aria-required={required}
        />
        <button
          type="button"
          className="btn btn-outline-primary d-inline-flex align-items-center gap-1"
          onClick={openScanner}
          disabled={disabled || isStarting}
          title={`Scan QR / barcode for ${scanTitle}`}
        >
          {isStarting ? <FiLoader className="spin" size={14} /> : <FiCamera size={14} />}
          <span className="d-none d-sm-inline">Scan</span>
        </button>
      </div>

      {error && !isOpen && (
        <div className="camera-capture-error mt-1 mb-0">
          <FiAlertCircle size={12} /> {error}
        </div>
      )}

      {isOpen && (
        <div className="camera-capture-modal">
          <div className="camera-capture-modal-card">
            <div className="camera-capture-modal-head">
              <strong>Scan: {scanTitle}</strong>
              <button type="button" className="btn btn-sm btn-light" onClick={closeScanner}>
                Close
              </button>
            </div>
            <div className="camera-capture-video-wrap">
              <video ref={videoRef} autoPlay playsInline muted />
            </div>
            <p className="camera-capture-modal-note mb-0">
              Point the QR or barcode at the camera. The serial will fill automatically when detected.
              You can also type it in the field without scanning.
            </p>
          </div>
        </div>
      )}
    </>
  )
}

export default SerialScannerInput
