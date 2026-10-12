import { useState } from 'react'

function ApplicationsPreviewCard({ preview }) {
  const imagePath = preview.imagePath || preview.image
  const [failedImagePath, setFailedImagePath] = useState('')
  const shouldRenderImage = imagePath && failedImagePath !== imagePath

  return (
    <article
      className={`applications-preview-card is-${preview.layout} tone-${preview.tone}`.trim()}
    >
      <div className="applications-preview-topbar">
        <span className="applications-preview-titlebar-text">{preview.title}</span>
      </div>

      <div className="applications-preview-surface">
        {shouldRenderImage ? (
          <img
            src={imagePath}
            alt={preview.title}
            className="applications-preview-image"
            onError={() => setFailedImagePath(imagePath)}
          />
        ) : (
          <>
            <div className="applications-preview-strip" />
            <div className="applications-preview-strip short" />
            <div className="applications-preview-grid">
              <span />
              <span />
              <span />
              <span />
            </div>
          </>
        )}
      </div>

      <div className="applications-preview-copy">
        <div className="applications-preview-title">{preview.title}</div>
        <div className="applications-preview-caption">{preview.caption}</div>
      </div>
    </article>
  )
}

export default ApplicationsPreviewCard
