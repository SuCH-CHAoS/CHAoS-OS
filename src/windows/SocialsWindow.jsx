import { useState } from 'react'
import '../styles/socials-window.css'
import githubIcon from '../assets/icons/github.png'
import linkedinIcon from '../assets/icons/linkedin.png'
import emailIcon from '../assets/icons/gmail.png'
import websiteContent from '../data/websiteContent'

const socialIconMap = {
  github: githubIcon,
  linkedin: linkedinIcon,
  email: emailIcon
}

function SocialIcon({
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

function SocialsWindow() {
  const socials = websiteContent.socials

  return (
    <div className="socials-window">
      <div className="socials-title">{socials.title}</div>

      <div className="socials-list">
        {socials.links.map((link) => (
          <a
            key={link.id}
            className="socials-item"
            href={link.href}
            target={link.href.startsWith('mailto:') ? undefined : '_blank'}
            rel={link.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
          >
            <SocialIcon
              src={link.iconPath || socialIconMap[link.iconKey]}
              fallbackSrc={socialIconMap[link.iconKey]}
              alt={link.label}
            />
            <span>{link.label}</span>
          </a>
        ))}
      </div>

      <div className="socials-footer">
        {socials.status}
      </div>
    </div>
  )
}

export default SocialsWindow
