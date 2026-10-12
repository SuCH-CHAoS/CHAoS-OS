import { useState } from 'react'

function FolderIcon({
  size = 'large',
  src = '',
  alt = ''
}) {
  const [failedSrc, setFailedSrc] = useState('')

  if (src && failedSrc !== src) {
    return (
      <span
        className={`applications-icon-slot is-${size} is-image`.trim()}
        aria-hidden={alt ? undefined : 'true'}
      >
        <img
          src={src}
          alt={alt}
          className="applications-icon-image"
          onError={() => setFailedSrc(src)}
        />
      </span>
    )
  }

  return (
    <span
      className={`applications-icon-slot is-${size}`.trim()}
      aria-hidden="true"
    />
  )
}

export default FolderIcon
