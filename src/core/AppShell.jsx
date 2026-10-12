import { useCallback, useEffect, useRef, useState } from 'react'
import Desktop from './Desktop'
import ModeRouter from './ModeRouter'
import HotlineDevice from './HotlineDevice'
import BootScreen from './BootScreen'
import { updateWebsiteContent } from '../data/websiteContent'
import { loadRemoteWebsiteContent } from '../services/websiteContentRemote'

const HOTLINE_ACTION_LOCK_MS = 4500

function AppShell() {
  const [activeMode, setActiveMode] = useState(null)
  const [booted, setBooted] = useState(false)
  const [hotlineMsg, setHotlineMsg] = useState('SYSTEM READY.')
  const hotlineLockRef = useRef({ lockedUntil: 0, releaseTimer: null })

  const publishHotlineMessage = useCallback((message, {
    idle = false,
    lockMs = HOTLINE_ACTION_LOCK_MS
  } = {}) => {
    if (!message) return false

    const now = Date.now()
    if (idle && now < hotlineLockRef.current.lockedUntil) {
      return false
    }

    setHotlineMsg(message)

    if (!idle) {
      hotlineLockRef.current.lockedUntil = now + lockMs
      window.clearTimeout(hotlineLockRef.current.releaseTimer)
      hotlineLockRef.current.releaseTimer = window.setTimeout(() => {
        if (Date.now() >= hotlineLockRef.current.lockedUntil) {
          hotlineLockRef.current.lockedUntil = 0
        }
      }, lockMs)
    }

    return true
  }, [])

  const publishIdleHotlineMessage = useCallback((message) => (
    publishHotlineMessage(message, { idle: true, lockMs: 0 })
  ), [publishHotlineMessage])

  useEffect(() => () => {
    window.clearTimeout(hotlineLockRef.current.releaseTimer)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadContent() {
      const result = await loadRemoteWebsiteContent()

      if (!cancelled && result.ok) {
        updateWebsiteContent(result.content)
      }
    }

    loadContent()

    return () => {
      cancelled = true
    }
  }, [])

  /* =========================
     HOTLINE CLICK COUNTER
  ========================= */

  const phoneClickRef = useRef({
    count: 0,
    lastClick: 0
  })

  const handlePhoneClick = () => {
    const now = Date.now()

    // Reset if clicks too slow
    if (now - phoneClickRef.current.lastClick > 2000) {
      phoneClickRef.current.count = 0
    }

    phoneClickRef.current.count++
    phoneClickRef.current.lastClick = now

    if (phoneClickRef.current.count === 3) {
      publishHotlineMessage('You like pressing buttons.')
    }

    if (phoneClickRef.current.count === 5) {
      publishHotlineMessage('Do you like hurting other processes?')
      phoneClickRef.current.count = 0
    }
  }

  /* =========================
     BOOT SCREEN
  ========================= */

  if (!booted) {
    return <BootScreen onFinish={() => setBooted(true)} />
  }

  return (
    <>
      {!activeMode && (
        <Desktop
          onLaunchMode={(mode) => setActiveMode(mode)}
          setHotlineMsg={publishHotlineMessage}
          setIdleHotlineMsg={publishIdleHotlineMessage}
        />
      )}

      {activeMode && (
        <ModeRouter
          activeModeId={activeMode}
          onExit={() => setActiveMode(null)}
          setHotlineMsg={publishHotlineMessage}
        />
      )}

      {/* GLOBAL PHONE - SINGLE INSTANCE */}
      <HotlineDevice
        message={hotlineMsg}
        onClick={handlePhoneClick}
      />
    </>
  )
}

export default AppShell
