import { useState } from 'react'
import '../styles/about-window.css'
import profilePhoto from '../assets/images/profile.jpg'
import websiteContent from '../data/websiteContent'

function AboutProfileImage({
  src,
  fallbackSrc,
  alt
}) {
  const [failedPaths, setFailedPaths] = useState([])
  const resolvedSrc = src && !failedPaths.includes(src)
    ? src
    : (fallbackSrc && !failedPaths.includes(fallbackSrc) ? fallbackSrc : '')

  if (!resolvedSrc) {
    return null
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      onError={() => setFailedPaths((prev) => (
        prev.includes(resolvedSrc) ? prev : [...prev, resolvedSrc]
      ))}
    />
  )
}

function AboutWindow() {
  const about = websiteContent.about
  const whoIAmParagraphs = about.whoIAm.split('\n\n')
  const resolvedProfilePhoto = about.profileImage || profilePhoto

  return (
    <div className="about-window">
      {/* TOP AREA */}
      <div className="about-top">
        {/* LEFT PROFILE PANEL */}
        <div className="about-profile">
          <div className="about-photo">
            <AboutProfileImage
              src={resolvedProfilePhoto}
              fallbackSrc={profilePhoto}
              alt={about.name}
            />
          </div>

          <div className="about-info">
            <div className="about-name">{about.name}</div>
            <div className="about-role">{about.role}</div>
            <div className="about-location">
              Location: {about.location}
            </div>
            <div className="about-status">
              Status: {about.status}
            </div>
          </div>

          <a
            href={about.cvPath}
            download
            className="about-cv-btn"
            onClick={() => window.dispatchEvent(new Event('cv-download'))}
          >
            Download CV
          </a>
        </div>

        {/* RIGHT DESCRIPTION */}
        <div className="about-description">
          <div className="about-section">
            <div className="about-section-title">WHO I AM</div>
            <div className="about-section-content">
              {whoIAmParagraphs.map((paragraph, index) => (
                <span key={paragraph}>
                  {paragraph}
                  {index < whoIAmParagraphs.length - 1 ? (
                    <>
                      <br /><br />
                    </>
                  ) : null}
                </span>
              ))}
            </div>
          </div>

          <div className="about-section">
            <div className="about-section-title">WHAT I DO</div>
            <ul className="about-list">
              {about.whatIDo.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* DIVIDER */}
      <div className="about-divider" />

      {/* BOTTOM AREA */}
      <div className="about-bottom">
        <div className="about-section">
          <div className="about-section-title">FOCUS AREAS</div>
          <ul className="about-list">
            {about.focusAreas.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="about-section">
          <div className="about-section-title">CURRENT SYSTEM STATE</div>
          <div className="about-section-content">
            {about.currentState.map((item) => (
              <div key={item.label}>{item.label}: {item.value}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AboutWindow
