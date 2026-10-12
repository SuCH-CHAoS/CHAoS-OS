import { useCallback, useEffect, useState, useRef } from 'react'
import '../styles/desktop.css'
import Window from './Window'


// WINDOWS
import AboutWindow from '../windows/AboutWindow'
import SocialsWindow from '../windows/SocialsWindow'
import ShellTerminalWindow from '../windows/ShellTerminalWindow'
import ShellProjectWindow from '../windows/ShellProjectWindow'
import ApplicationsExplorerWindow from '../windows/ApplicationsExplorerWindow'
import ApplicationsProjectWindow from '../windows/ApplicationsProjectWindow'
import { getProjectWindowId } from '../windows/shellData'
import { getApplicationsProjectWindowId } from '../windows/applicationsData'

// ICONS
import applicationsIcon from '../assets/icons/retro/applications.png'
import arcadeIcon from '../assets/icons/retro/arcade.png'
import shellIcon from '../assets/icons/retro/shell.png'
import aboutIcon from '../assets/icons/retro/about.png'
import socialsIcon from '../assets/icons/retro/socials.png'
import billCipherImg from '../assets/images/bill-cipher.png'

// TRAY ICONS
import netIcon from '../assets/tray/network.png'
import volumeIcon from '../assets/tray/volume.png'
import securityIcon from '../assets/tray/security.png'
import diskIcon from '../assets/tray/disk.png'
import websiteContent, { WEBSITE_CONTENT_UPDATED_EVENT } from '../data/websiteContent'

const desktopIconAssetMap = {
  applications: applicationsIcon,
  arcade: arcadeIcon,
  shell: shellIcon,
  about: aboutIcon,
  socials: socialsIcon
}

const DEFAULT_HOTLINE_LOCK = 4000
const ACTION_HOTLINE_LOCK = 6500
const DEFAULT_TASKBAR_HEIGHT = 36
const MODE_DISPLAY_NAMES = {
  arcade: 'ARCADE'
}
const WINDOW_ESTIMATES = {
  about: { width: 620, height: 440 },
  socials: { width: 620, height: 360 },
  'shell-terminal': { width: 760, height: 540 },
  'shell-project': { width: 720, height: 520 },
  'applications-explorer': { width: 980, height: 660 },
  'applications-project': { width: 780, height: 620 },
  default: { width: 620, height: 440 }
}

function getDefaultWindowPosition(index, type = 'default') {
  const estimate = WINDOW_ESTIMATES[type] ?? WINDOW_ESTIMATES.default
  const taskbarHeight = window.matchMedia('(max-width: 768px)').matches
    ? 46
    : DEFAULT_TASKBAR_HEIGHT
  const availableWidth = window.innerWidth
  const availableHeight = window.innerHeight - taskbarHeight
  const estimatedWidth = Math.min(estimate.width, Math.max(320, availableWidth - 32))
  const estimatedHeight = Math.min(estimate.height, Math.max(260, availableHeight - 24))
  const cascade = 28 * (index % 4)
  const centeredLeft = Math.round((availableWidth - estimatedWidth) / 2)
  const centeredTop = Math.round((availableHeight - estimatedHeight) / 2)
  const maxLeft = Math.max(availableWidth - estimatedWidth - 12, 0)
  const maxTop = Math.max(availableHeight - estimatedHeight - 12, 0)

  return {
    top: Math.min(Math.max(centeredTop + cascade, 12), maxTop),
    left: Math.min(Math.max(centeredLeft + cascade, 12), maxLeft)
  }
}

function DesktopIconImage({
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

function isSystemPanelViewport() {
  return !window.matchMedia('(max-width: 768px)').matches
}

function TaskbarClock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const clock = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(clock)
  }, [])

  return (
    <div className="taskbar-clock">
      {time.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      })}
    </div>
  )
}

function SystemPanel({ desktopContent }) {
  const [visible, setVisible] = useState(() => isSystemPanelViewport())
  const [stats, setStats] = useState({ cpu: 14, mem: 28 })

  useEffect(() => {
    const query = window.matchMedia('(max-width: 768px)')
    const updateVisibility = () => setVisible(!query.matches)

    updateVisibility()
    query.addEventListener('change', updateVisibility)

    return () => query.removeEventListener('change', updateVisibility)
  }, [])

  useEffect(() => {
    if (!visible) return

    const statsTick = setInterval(() => {
      setStats(prev => ({
        cpu: Math.max(5, Math.min(95, prev.cpu + (Math.random() * 6 - 3))),
        mem: Math.max(20, Math.min(64, prev.mem + (Math.random() * 4 - 2)))
      }))
    }, 2500)

    return () => clearInterval(statsTick)
  }, [visible])

  if (!visible) return null

  return (
    <div className="system-panel">
      <div className="system-panel-title">{desktopContent.systemStatusTitle}</div>
      {desktopContent.systemStatusRows.map((row) => {
        let value = row.value ?? ''

        if (row.kind === 'cpu') {
          value = `${stats.cpu.toFixed(0)}${row.suffix ?? ''}`
        }

        if (row.kind === 'mem') {
          value = `${stats.mem.toFixed(0)}${row.suffix ?? ''}`
        }

        return (
          <div key={row.label} className="system-line">
            <span>{row.label}</span>
            <span>{value}</span>
          </div>
        )
      })}
    </div>
  )
}

function Desktop({ onLaunchMode, setHotlineMsg, setIdleHotlineMsg }) {
  /* =========================
     STATE
  ========================= */

  const [selected, setSelected] = useState(null)
  const [mode, setMode] = useState('DESKTOP')

  const [windows, setWindows] = useState([])
  const [activeWindow, setActiveWindow] = useState(null)
  const [billState, setBillState] = useState('hidden')
  const [billAnchor, setBillAnchor] = useState({ left: 0, bottom: DEFAULT_TASKBAR_HEIGHT })
  const [adminWindowComponent, setAdminWindowComponent] = useState(null)
  const [adminDashboardOpen, setAdminDashboardOpen] = useState(false)
  const [adminSessionToken, setAdminSessionToken] = useState('')

  const [, setContentVersion] = useState(0)

  const desktopContent = websiteContent.desktop
  const desktopIcons = desktopContent.icons.map((icon) => ({
    ...icon,
    icon: icon.iconPath || desktopIconAssetMap[icon.iconKey],
    fallbackIcon: desktopIconAssetMap[icon.iconKey]
  }))

  /* =========================
     REFS (LOGIC + EASTER EGGS)
  ========================= */

  const chaosClickRef = useRef({ count: 0, last: 0 })
  const taskbarLabelRef = useRef(null)
  const billClickRef = useRef({ count: 0, last: 0 })
  const billClickResetRef = useRef(null)
  const billTimerRef = useRef(null)
  const billHideTimerRef = useRef(null)
  const securityClickRef = useRef(0)
  const konamiRef = useRef([])
  const lateNightTriggered = useRef(false)

  const chaosLock = useRef(false)
  const chaosLockTimer = useRef(null)

  /* =========================
     SPEAK SYSTEM (CORE)
  ========================= */

  const speak = useCallback((msg, lock = DEFAULT_HOTLINE_LOCK) => {
    if (!msg) return

    setHotlineMsg(msg, { lockMs: lock })
    chaosLock.current = true
    clearTimeout(chaosLockTimer.current)

    chaosLockTimer.current = setTimeout(() => {
      chaosLock.current = false
    }, lock)
  }, [setHotlineMsg])

  const speakAction = useCallback((msg) => {
    speak(msg, ACTION_HOTLINE_LOCK)
  }, [speak])

  /* =========================
     IDLE CHATTER
  ========================= */

  useEffect(() => {
    const idleTimer = setInterval(() => {
      if (chaosLock.current) return
      const idleLine = desktopContent.idleLines[
        Math.floor(Math.random() * desktopContent.idleLines.length)
      ]
      const publishIdle = setIdleHotlineMsg ?? ((message) => setHotlineMsg(message, { idle: true }))
      publishIdle(idleLine)
    }, 12000)

    return () => clearInterval(idleTimer)
  }, [desktopContent, setHotlineMsg, setIdleHotlineMsg])

  /* =========================
     KONAMI CODE
  ========================= */

  useEffect(() => {
    const sequence = [
      'ARROWUP', 'ARROWUP', 'ARROWDOWN', 'ARROWDOWN',
      'ARROWLEFT', 'ARROWRIGHT', 'ARROWLEFT', 'ARROWRIGHT',
      'B', 'A'
    ]

    const onKey = (e) => {
      konamiRef.current.push(e.key.toUpperCase())
      konamiRef.current.splice(0, konamiRef.current.length - sequence.length)

      if (sequence.every((k, i) => konamiRef.current[i] === k)) {
        speak('Classic.')
        konamiRef.current = []
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [speak])

  /* =========================
     LATE NIGHT
  ========================= */

  useEffect(() => {
    const h = new Date().getHours()
    if (h >= 2 && h <= 4 && !lateNightTriggered.current) {
      speak(desktopContent.lateNightMessage)
      lateNightTriggered.current = true
    }
  }, [desktopContent, speak])

  /* =========================
     CV DOWNLOAD EVENT
  ========================= */

  useEffect(() => {
    const onCV = () => speak(desktopContent.cvDownloadMessage)
    window.addEventListener('cv-download', onCV)
    return () => window.removeEventListener('cv-download', onCV)
  }, [desktopContent, speak])

  useEffect(() => {
    return () => {
      clearTimeout(billClickResetRef.current)
      clearTimeout(billTimerRef.current)
      clearTimeout(billHideTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const handleContentUpdate = () => {
      setContentVersion((prev) => prev + 1)
    }

    window.addEventListener(WEBSITE_CONTENT_UPDATED_EVENT, handleContentUpdate)
    return () => window.removeEventListener(WEBSITE_CONTENT_UPDATED_EVENT, handleContentUpdate)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('admin-dashboard-active', adminDashboardOpen)

    return () => {
      document.body.classList.remove('admin-dashboard-active')
    }
  }, [adminDashboardOpen])

  const syncBillAnchor = useCallback(() => {
    const label = taskbarLabelRef.current
    if (!label) return

    const rect = label.getBoundingClientRect()
    setBillAnchor({
      left: Math.round(rect.left + rect.width / 2),
      bottom: Math.max(Math.round(window.innerHeight - rect.top - 2), DEFAULT_TASKBAR_HEIGHT)
    })
  }, [])

  const hideBillCipher = () => {
    setBillState('hiding')
    billClickRef.current = { count: 0, last: 0 }
    clearTimeout(billClickResetRef.current)
    clearTimeout(billHideTimerRef.current)
    billHideTimerRef.current = setTimeout(() => {
      setBillState('hidden')
    }, 420)
  }

  const showBillCipher = () => {
    clearTimeout(billTimerRef.current)
    clearTimeout(billHideTimerRef.current)
    billClickRef.current = { count: 0, last: 0 }
    clearTimeout(billClickResetRef.current)
    syncBillAnchor()
    setBillState('peeking')
    billTimerRef.current = setTimeout(() => {
      hideBillCipher()
    }, 5000)
  }

  const handleBillProbeClick = (e) => {
    e?.stopPropagation?.()
    if (billState !== 'hidden') return false

    const now = Date.now()
    if (now - billClickRef.current.last < 2000) {
      billClickRef.current.count++
    } else {
      billClickRef.current.count = 1
    }
    billClickRef.current.last = now
    clearTimeout(billClickResetRef.current)
    billClickResetRef.current = setTimeout(() => {
      billClickRef.current = { count: 0, last: 0 }
    }, 2000)

    if (billClickRef.current.count === 1) {
      speak(desktopContent.billProbeMessages[0])
      return false
    }

    if (billClickRef.current.count === 2) {
      speak(desktopContent.billProbeMessages[1])
      return false
    }

    if (billClickRef.current.count === 3) {
      speak(desktopContent.billProbeMessages[2])
      showBillCipher()
      billClickRef.current = { count: 0, last: 0 }
      clearTimeout(billClickResetRef.current)
      return true
    }

    return false
  }

  useEffect(() => {
    if (billState === 'hidden') return undefined

    const handleViewportChange = () => syncBillAnchor()

    handleViewportChange()
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('orientationchange', handleViewportChange)

    return () => {
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('orientationchange', handleViewportChange)
    }
  }, [billState, syncBillAnchor])

  const handleChaosLabelClick = () => {
    const now = Date.now()
    if (now - chaosClickRef.current.last < 2000) {
      chaosClickRef.current.count++
    } else {
      chaosClickRef.current.count = 1
    }
    chaosClickRef.current.last = now

    if (chaosClickRef.current.count === 3) {
      speak(desktopContent.chaosRevealLines[0])
      setTimeout(() => speak(desktopContent.chaosRevealLines[1]), 800)
      setTimeout(() => speak(desktopContent.chaosRevealLines[2]), 1600)
      chaosClickRef.current.count = 0
    }
  }

  const handleTaskbarLabelClick = (e) => {
    e.stopPropagation()
    handleChaosLabelClick()
  }

  /* =========================
     WINDOW HELPERS
  ========================= */

  const openWindow = (windowConfig, openMessage) => {
    const existingWindow = windows.find((window) => window.id === windowConfig.id)

    if (existingWindow) {
      setWindows((prev) => prev.map((window) => (
        window.id === windowConfig.id
          ? { ...window, minimized: false }
          : window
      )))
      setActiveWindow(windowConfig.id)

      if (existingWindow.minimized) {
        speak('Restoring window.')
      }
      return
    }

    speak(openMessage ?? `Opening ${windowConfig.title}.`)
    setWindows((prev) => [
      ...prev,
      {
        ...windowConfig,
        minimized: false,
        defaultPosition: windowConfig.defaultPosition ?? getDefaultWindowPosition(prev.length, windowConfig.type)
      }
    ])
    setActiveWindow(windowConfig.id)
  }

  const closeWindow = (id, title) => {
    speak(`Closing ${title}.`)
    setWindows((prev) => {
      const nextWindows = prev.filter((window) => window.id !== id)
      const nextActive = [...nextWindows].reverse().find((window) => !window.minimized)
      setActiveWindow(nextActive?.id ?? null)
      return nextWindows
    })
  }

  const minimizeWindow = (id) => {
    speak('Window minimized.')
    setWindows(prev =>
      prev.map(w => w.id === id ? { ...w, minimized: true } : w)
    )
    setActiveWindow(null)
  }

  const restoreWindow = (id) => {
    speak('Restoring window.')
    setWindows(prev =>
      prev.map(w => w.id === id ? { ...w, minimized: false } : w)
    )
    setActiveWindow(id)
  }

  const launchMode = (m) => {
    const displayName = MODE_DISPLAY_NAMES[m] ?? m.toUpperCase()

    speak(`Entering ${displayName} mode.`)
    setMode(displayName)
    setTimeout(() => onLaunchMode(m), 500)
  }

  const openSystemWindow = (windowId) => {
    if (windowId === 'about') {
      openWindow({
        id: 'about',
        title: 'About Me',
        type: 'about'
      })
      return
    }

    if (windowId === 'socials') {
      openWindow({
        id: 'socials',
        title: 'My Socials',
        type: 'socials'
      })
      return
    }

    if (windowId === 'applications-explorer') {
      openWindow({
        id: 'applications-explorer',
        title: 'Applications Explorer',
        type: 'applications-explorer',
        windowClassName: 'applications-explorer-window',
        contentClassName: 'applications-window-content'
      }, 'Opening Applications Explorer.')
      return
    }

    if (windowId === 'shell-terminal') {
      openWindow({
        id: 'shell-terminal',
        title: 'Shell Terminal',
        type: 'shell-terminal',
        windowClassName: 'shell-terminal-window',
        contentClassName: 'shell-window-content'
      }, 'Opening Shell Terminal.')
    }
  }

  const openShellProjectWindow = (collectionKey, project) => {
    const projectWindowId = getProjectWindowId(collectionKey, project.id)

    openWindow({
      id: projectWindowId,
      title: project.windowTitle,
      type: 'shell-project',
      windowClassName: 'shell-project-window',
      contentClassName: 'shell-window-content',
      payload: {
        collectionKey,
        project
      }
    }, `Opening ${project.title}.`)
  }

  const openApplicationsProjectWindow = (category, project) => {
    const projectWindowId = getApplicationsProjectWindowId(project.id)

    openWindow({
      id: projectWindowId,
      title: project.windowTitle,
      type: 'applications-project',
      windowClassName: 'applications-project-window',
      contentClassName: 'applications-window-content',
      payload: {
        category,
        project
      }
    }, project.hotlineOpen ?? `Opening ${project.name}.`)
  }

  const openAdminDashboard = async (passphrase) => {
    const { requestLocalAdminSession } = await import('../windows/admin/adminSession')
    const sessionResult = await requestLocalAdminSession(passphrase)

    if (!sessionResult.ok) {
      if (sessionResult.ignored) {
        return sessionResult
      }

      return {
        ok: false,
        terminalHandled: true,
        lines: [
          'CONTROL DESK AUTH FAILURE.',
          sessionResult.error ?? 'Admin session rejected.'
        ],
        phoneMsg: 'Admin access rejected.'
      }
    }

    let AdminDashboardWindow = adminWindowComponent

    if (!AdminDashboardWindow) {
      try {
        const module = await import('../windows/AdminDashboardWindow')
        AdminDashboardWindow = module.default
        setAdminWindowComponent(() => AdminDashboardWindow)
      } catch {
        return {
          ok: false,
          lines: [
            'CONTROL DESK LOAD FAILURE.',
            'Check the local admin window module.'
          ],
          phoneMsg: 'Admin dashboard failed to load.'
        }
      }
    }

    setAdminSessionToken(sessionResult.token)
    setAdminDashboardOpen(true)
    setActiveWindow(null)

    return {
      ok: true,
      lines: [
        'CHAOS CONTROL DESK ONLINE.',
        'Supabase-backed content editor opened.'
      ],
      phoneMsg: 'CHAoS Control Desk unlocked.'
    }
  }

  const handleIconOpen = (icon) => {
    if (icon.kind === 'mode') {
      launchMode(icon.value)
      return
    }

    openSystemWindow(icon.value)
  }

  const renderWindowContent = (window) => {
    if (window.type === 'about') {
      return <AboutWindow />
    }

    if (window.type === 'socials') {
      return <SocialsWindow />
    }

    if (window.type === 'shell-terminal') {
      return (
        <ShellTerminalWindow
          active={activeWindow === window.id}
          onClose={() => closeWindow(window.id, window.title)}
          onOpenProjectWindow={openShellProjectWindow}
          onPrivateCommand={openAdminDashboard}
          setHotlineMsg={speakAction}
        />
      )
    }

    if (window.type === 'applications-explorer') {
      return (
        <ApplicationsExplorerWindow
          onOpenProjectWindow={openApplicationsProjectWindow}
          setHotlineMsg={speakAction}
        />
      )
    }

    if (window.type === 'applications-project' && window.payload) {
      return (
        <ApplicationsProjectWindow
          category={window.payload.category}
          project={window.payload.project}
        />
      )
    }

    if (window.type === 'shell-project' && window.payload) {
      return (
        <ShellProjectWindow
          collectionKey={window.payload.collectionKey}
          project={window.payload.project}
        />
      )
    }

    return null
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <div
      className="desktop"
      onClick={(e) => {
        if (e.target !== e.currentTarget) return
        setSelected(null)
      }}
    >
      {/* ICONS */}
      <div className="desktop-icons">
        {desktopIcons.map(icon => (
          <button
            type="button"
            key={icon.id}
            className={`desktop-icon ${selected === icon.id ? 'selected' : ''}`}
            onClick={(e) => {
              e.stopPropagation()

              const isTouchDevice =
                'ontouchstart' in window || navigator.maxTouchPoints > 0

              if (isTouchDevice || e.detail === 0) {
                handleIconOpen(icon)
              } else {
                setSelected(icon.id)
              }
            }}
            onDoubleClick={(e) => {
              e.stopPropagation()

              const isTouchDevice =
                'ontouchstart' in window || navigator.maxTouchPoints > 0

              if (!isTouchDevice) {
                handleIconOpen(icon)
              }
            }}
          >
            <DesktopIconImage
              src={icon.icon}
              fallbackSrc={icon.fallbackIcon}
              alt=""
            />
            <div className="desktop-icon-label">{icon.label}</div>
          </button>
        ))}
      </div>

      {/* WINDOWS */}
      {windows.map(win => (
        <Window
          key={win.id}
          title={win.title}
          active={activeWindow === win.id}
          minimized={win.minimized}
          windowClassName={win.windowClassName}
          contentClassName={win.contentClassName}
          defaultPosition={win.defaultPosition}
          onFocus={() => setActiveWindow(win.id)}
          onMinimize={() => minimizeWindow(win.id)}
          onClose={() => closeWindow(win.id, win.title)}
        >
          {renderWindowContent(win)}
        </Window>
      ))}

      {adminDashboardOpen && adminWindowComponent ? (
        <div className="admin-fullscreen-overlay">
          {(() => {
            const AdminDashboardWindow = adminWindowComponent

            return (
              <AdminDashboardWindow
                adminToken={adminSessionToken}
                setHotlineMsg={speakAction}
                onClose={() => {
                  setAdminDashboardOpen(false)
                  setAdminSessionToken('')
                  speakAction('Control desk closed.')
                }}
              />
            )
          })()}
        </div>
      ) : null}

      {/* SYSTEM STATUS */}
      <SystemPanel desktopContent={desktopContent} />

      {billState !== 'hidden' && (
        <button
          type="button"
          className={`bill-cipher-easter ${billState === 'hiding' ? 'is-hiding' : 'is-peeking'}`}
          style={{
            '--bill-left': `${billAnchor.left}px`,
            '--bill-bottom': `${billAnchor.bottom}px`
          }}
          onClick={(e) => {
            e.stopPropagation()
            speak("Remember! Reality's an illusion, the universe is a hologram, buy gold! Byeeee!")
            clearTimeout(billTimerRef.current)
            hideBillCipher()
          }}
          aria-label="Hidden Bill Cipher easter egg"
        >
          <img
            src={billCipherImg}
            alt=""
            className="bill-cipher-sprite"
            draggable="false"
          />
          <span className="bill-hat" />
          <span className="bill-eye" />
          <span className="bill-bow" />
        </button>
      )}




      {/* TASKBAR */}
      <div className="taskbar">
        <div className="taskbar-left">
          <div
            className="taskbar-label-wrap"
          >
            <button
              type="button"
              className="bill-probe-zone"
              onClick={handleBillProbeClick}
              aria-label="Hidden taskbar easter egg"
              tabIndex={-1}
            />
            <button
              type="button"
              ref={taskbarLabelRef}
              className="taskbar-label"
              onClick={handleTaskbarLabelClick}
            >
              CHAoS OS
            </button>
          </div>

          <div className="taskbar-divider" />
          <div className="taskbar-mode">{desktopContent.modeLabel}: {mode}</div>
          <div className="taskbar-divider" />

          <div className="taskbar-tabs">
            {windows.map(win => (
              <button
                type="button"
                key={win.id}
                className={`taskbar-tab ${activeWindow === win.id ? 'active' : ''}`}
                onClick={() => restoreWindow(win.id)}
              >
                {win.title}
              </button>
            ))}
          </div>
        </div>

        <div className="taskbar-right">
          <div className="taskbar-divider" />

          <div className="system-tray">
            <button type="button" className="tray-button" onClick={() => speak('Network stable.')} aria-label="Network status">
              <img src={netIcon} className="tray-icon" alt="" />
            </button>
            <button type="button" className="tray-button" onClick={() => speak('Audio nominal.')} aria-label="Audio status">
              <img src={volumeIcon} className="tray-icon" alt="" />
            </button>
            <button
              type="button"
              className="tray-button"
              onClick={() => {
                const lines = [
                  ...desktopContent.securityTrayLines
                ]
                speak(lines[securityClickRef.current % lines.length])
                securityClickRef.current++
              }}
              aria-label="Security status"
            >
              <img src={securityIcon} className="tray-icon" alt="" />
            </button>
            <button type="button" className="tray-button" onClick={() => speak('Disk activity minimal.')} aria-label="Disk status">
              <img src={diskIcon} className="tray-icon" alt="" />
            </button>
          </div>

          <div className="taskbar-divider" />

          <TaskbarClock />
        </div>
      </div>
    </div>
  )
}

export default Desktop
