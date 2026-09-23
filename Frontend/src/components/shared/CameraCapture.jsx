import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FiAlertCircle, FiCamera, FiCheckCircle, FiX } from 'react-icons/fi'
import {
  captureStampedCameraPhoto,
  captureStampedDataUrlFromVideo,
} from '../../utils/cameraCapture'
import { prefetchLocationForCapture } from '../../utils/geolocation'
import { openRearCameraStream, waitForVideoReady } from '../../utils/cameraStream'

const cameraOpenErrorMessage = (err) => {
  const name = err?.name || ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera permission denied. Allow camera in browser settings and try again.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera found on this device.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Camera is in use by another app. Close it and try again.'
  }
  if (name === 'SecurityError') {
    return 'Camera requires HTTPS (secure connection).'
  }
  return err?.message || 'Could not open camera. Allow camera permission and try again.'
}

const CameraCapture = ({
  label,
  hint,
  file,
  onCapture,
  onClear,
  previewDataUrl,
  onCaptureDataUrl,
  stampCaNumber,
  stampMetadata,
  onRawFrame,
  beforeOpen,
  modalNote,
  onPreviewClick,
}) => {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const gpsPrefetchRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [streamVersion, setStreamVersion] = useState(0)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const attachStreamToVideo = useCallback(async (stream) => {
    const video = videoRef.current
    if (!video || !stream) return false

    video.setAttribute('playsinline', 'true')
    video.setAttribute('webkit-playsinline', 'true')
    video.muted = true
    video.srcObject = stream

    try {
      await video.play()
    } catch {
      /* Capture click may still work */
    }

    try {
      await waitForVideoReady(video, 8000, stream)
    } catch {
      /* preview may still work */
    }
    return true
  }, [])

  useLayoutEffect(() => {
    if (!isOpen || !streamRef.current) return
    void attachStreamToVideo(streamRef.current)
  }, [isOpen, streamVersion, attachStreamToVideo])

  const closeCamera = () => {
    stopStream()
    gpsPrefetchRef.current = null
    setIsOpen(false)
  }

  const openCamera = () => {
    setError('')

    void (async () => {
      try {
        stopStream()

        // Request camera immediately while the click gesture is active (required on iOS).
        const stream = await openRearCameraStream()

        if (beforeOpen) {
          const result = beforeOpen()
          const allowed = result instanceof Promise ? await result : result
          if (allowed === false) {
            stream.getTracks().forEach((t) => t.stop())
            return
          }
        }

        streamRef.current = stream
        gpsPrefetchRef.current = prefetchLocationForCapture()
        setStreamVersion((n) => n + 1)
        setIsOpen(true)
      } catch (err) {
        stopStream()
        setIsOpen(false)
        setError(cameraOpenErrorMessage(err))
      }
    })()
  }

  const handleCapture = async () => {
    if (!videoRef.current) return

    setIsCapturing(true)
    setError('')

    try {
      const video = videoRef.current
      const stream = streamRef.current
      const ready =
        video.videoWidth > 0 &&
        video.videoHeight > 0 &&
        stream?.getVideoTracks?.()?.[0]?.readyState === 'live'
      if (!ready) {
        await attachStreamToVideo(stream)
        await waitForVideoReady(video, 4000, stream)
      }

      const coordsPromise = gpsPrefetchRef.current ?? prefetchLocationForCapture()
      gpsPrefetchRef.current = null

      const captureOpts = { coordsPromise }

      if (onCaptureDataUrl) {
        const { dataUrl, coords } = await captureStampedDataUrlFromVideo(video, {
          caNumber: stampCaNumber,
          stampMetadata:
            stampMetadata || (stampCaNumber ? { caNumber: stampCaNumber } : undefined),
          onRawFrame: onRawFrame,
          ...captureOpts,
        })
        onCaptureDataUrl(dataUrl, coords)
        if (!previewDataUrl) setPreviewUrl(dataUrl)
      } else {
        const { file: stampedFile, coords } = await captureStampedCameraPhoto(video, captureOpts)
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

  useEffect(() => () => stopStream(), [stopStream])

  const displayPreview = previewDataUrl || previewUrl

  const setVideoRef = useCallback(
    (node) => {
      videoRef.current = node
      if (node && streamRef.current && isOpen) {
        void attachStreamToVideo(streamRef.current)
      }
    },
    [isOpen, attachStreamToVideo, streamVersion]
  )

  return (
    <div>
      {!displayPreview ? (
        <button type="button" className="camera-capture-box w-100" onClick={openCamera}>
          <span className="camera-capture-icon">
            <FiCamera size={18} />
          </span>
          <span className="camera-capture-label">{label}</span>
          <span className="camera-capture-hint">
            {hint || 'Camera only • GPS will be printed on photo'}
          </span>
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
              <video ref={setVideoRef} autoPlay playsInline muted />
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
