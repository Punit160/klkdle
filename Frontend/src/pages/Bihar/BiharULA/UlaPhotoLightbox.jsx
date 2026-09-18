import { useEffect } from 'react'
import { FiDownload, FiX } from 'react-icons/fi'

/**
 * Full-screen photo popup — used on ULA view + 2nd visit form.
 * @param {{ src: string, title?: string } | null} photo
 */
const UlaPhotoLightbox = ({ photo, onClose, downloadPrefix = 'ula' }) => {
  useEffect(() => {
    if (!photo?.src) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [photo?.src, onClose])

  if (!photo?.src) return null

  return (
    <div
      className="ula-lightbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={photo.title || 'Photo preview'}
      onClick={onClose}
    >
      <div className="ula-lightbox-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ula-lightbox-head">
          <span className="fw-bold fs-14 text-dark text-truncate pe-2">
            {photo.title || 'Photo'}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-light border d-inline-flex align-items-center justify-content-center"
            onClick={onClose}
            aria-label="Close"
          >
            <FiX size={16} />
          </button>
        </div>
        <div className="ula-lightbox-body">
          <img src={photo.src} alt={photo.title || 'ULA site photo'} />
        </div>
        <div className="ula-lightbox-foot">
          <a
            href={photo.src}
            download={`${downloadPrefix}_${(photo.title || 'photo').replace(/\s+/g, '_')}.jpg`}
            className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
            target="_blank"
            rel="noreferrer"
          >
            <FiDownload size={13} /> Download
          </a>
        </div>
      </div>
    </div>
  )
}

export default UlaPhotoLightbox
