import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './arcade.css'
import websiteContent from '../../data/websiteContent'

const thumbMaps = {
  runner: [
    '........',
    '..11..2.',
    '.111122.',
    '..11.22.',
    '..11..2.',
    '.2..2...',
    '2....2..',
    '........'
  ],
  island: [
    '........',
    '...33...',
    '..3333..',
    '.331133.',
    '.333333.',
    '...22...',
    '..2222..',
    '........'
  ],
  car: [
    '........',
    '..2222..',
    '.211112.',
    '21111112',
    '.2.11.2.',
    '...22...',
    '........',
    '........'
  ],
  garden: [
    '........',
    '..3..3..',
    '.333333.',
    '...11...',
    '..3113..',
    '..3113..',
    '..3..3..',
    '........'
  ],
  motor: [
    '........',
    '..2222..',
    '.211112.',
    '.211112.',
    '.211112.',
    '..2332..',
    '...22...',
    '........'
  ]
}

function PixelThumb({ name, animateClass, imagePath, title }) {
  const map = thumbMaps[name] || thumbMaps.runner
  const [failedImagePath, setFailedImagePath] = useState('')

  if (imagePath && failedImagePath !== imagePath) {
    return (
      <div className={`pixel-thumb ${animateClass} is-image`.trim()}>
        <img
          src={imagePath}
          alt={title}
          className="pixel-thumb-image"
          onError={() => setFailedImagePath(imagePath)}
        />
      </div>
    )
  }

  return (
      <div className={`pixel-thumb ${animateClass}`}>
      {map.map((row, r) =>
        row.split('').map((cell, c) => {
          let cls = 'thumb-px'
          if (cell === '1') cls += ' a'
          if (cell === '2') cls += ' b'
          if (cell === '3') cls += ' c'
          return <span key={`${r}-${c}`} className={cls} />
        })
      )}
    </div>
  )
}

function ArcadeApp({ onExit, setHotlineMsg }) {
  const arcadeContent = websiteContent.arcade
  const arcadeProjects = arcadeContent.projects
  const defaultZoneId = Object.keys(arcadeContent.zoneLabels)[0] ?? 'arcade'

  const [activeZone, setActiveZone] = useState(() => (
    defaultZoneId
  ))
  const [selectedId, setSelectedId] = useState(() => (
    arcadeProjects.find((project) => project.zone === defaultZoneId)?.id
      ?? arcadeProjects[0]?.id
      ?? ''
  ))
  const [zoneTransitioning, setZoneTransitioning] = useState(false)
  const [detailTransitioning, setDetailTransitioning] = useState(false)

  const zoneProjects = useMemo(
    () => arcadeProjects.filter((project) => project.zone === activeZone),
    [activeZone, arcadeProjects]
  )

  const selectedProject = zoneProjects.find((project) => project.id === selectedId) || zoneProjects[0]
  const selectedProjectIndex = zoneProjects.findIndex((project) => project.id === selectedProject?.id)
  const [msgCursor, setMsgCursor] = useState(0)
  const lastHotlineAtRef = useRef(0)
  const idlePauseUntilRef = useRef(0)
  const detailTimerRef = useRef(null)

  const pushHotline = useCallback((msg, minGapMs = 200) => {
    if (!msg || !setHotlineMsg) return
    const now = Date.now()
    if (now - lastHotlineAtRef.current < minGapMs) return
    lastHotlineAtRef.current = now
    setHotlineMsg(msg)
  }, [setHotlineMsg])

  const pauseIdleChatter = useCallback((ms = 2200) => {
    idlePauseUntilRef.current = Date.now() + ms
  }, [])

  const triggerDetailTransition = useCallback(() => {
    window.clearTimeout(detailTimerRef.current)
    setDetailTransitioning(true)
    detailTimerRef.current = window.setTimeout(() => {
      setDetailTransitioning(false)
    }, 260)
  }, [])

  useEffect(() => {
    pushHotline(arcadeContent.startupMessage, 0)
  }, [arcadeContent.startupMessage, pushHotline])

  useEffect(() => {
    document.body.classList.add('mode-arcade-active')
    return () => {
      document.body.classList.remove('mode-arcade-active')
    }
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    const lines = selectedProject.hotline?.length
      ? selectedProject.hotline
      : [`Opened ${selectedProject.title}.`]
    const msg = lines[msgCursor % lines.length] || lines[0]
    pushHotline(msg)
  }, [msgCursor, pushHotline, selectedProject])

  useEffect(() => {
    const pool = arcadeContent.zoneChatter[activeZone] || []
    if (!pool.length) return
    let index = 0
    const id = window.setInterval(() => {
      if (Date.now() < idlePauseUntilRef.current) return
      pushHotline(pool[index % pool.length], 0)
      index += 1
    }, 12000)
    return () => window.clearInterval(id)
  }, [activeZone, arcadeContent.zoneChatter, pushHotline])

  useEffect(() => {
    if (!zoneTransitioning) return
    const id = window.setTimeout(() => setZoneTransitioning(false), 320)
    return () => window.clearTimeout(id)
  }, [zoneTransitioning])

  useEffect(() => () => {
    window.clearTimeout(detailTimerRef.current)
  }, [])

  const switchZone = (zoneId) => {
    if (activeZone === zoneId) return
    const nextZoneProjects = arcadeProjects.filter((project) => project.zone === zoneId)
    const nextSelectedId = nextZoneProjects[0]?.id ?? ''

    pauseIdleChatter(3200)
    setZoneTransitioning(true)
    if (nextSelectedId && nextSelectedId !== selectedId) {
      triggerDetailTransition()
    }
    setActiveZone(zoneId)
    setSelectedId(nextSelectedId)
    setMsgCursor(0)
    pushHotline(
      arcadeContent.zoneSwitchMessages[zoneId] ?? arcadeContent.zoneSwitchMessages.arcade,
      0
    )
  }

  const selectProjectByIndex = (index, msg) => {
    if (!zoneProjects.length) return
    const safeIndex = (index + zoneProjects.length) % zoneProjects.length
    const project = zoneProjects[safeIndex]
    pauseIdleChatter()
    if (project.id !== selectedId) {
      triggerDetailTransition()
    }
    setSelectedId(project.id)
    setMsgCursor((prev) => prev + 1)
    if (msg) pushHotline(msg, 0)
  }

  const replaySelectedProjectInfo = () => {
    if (!selectedProject) return
    pauseIdleChatter()
    setMsgCursor((prev) => prev + 1)
  }

  const controlButtonInput = (action) => {
    if (action === 'previous-project') {
      selectProjectByIndex(selectedProjectIndex - 1, arcadeContent.controlMessages.previous)
      return
    }

    if (action === 'next-project') {
      selectProjectByIndex(selectedProjectIndex + 1, arcadeContent.controlMessages.next)
      return
    }

    if (action === 'switch-zone') {
      switchZone(activeZone === 'arcade' ? 'xr' : 'arcade')
      return
    }

    if (action === 'replay-project-info') {
      replaySelectedProjectInfo()
      return
    }

    if (action === 'random-project') {
      selectProjectByIndex(
        Math.floor(Math.random() * zoneProjects.length),
        arcadeContent.controlMessages.random
      )
      return
    }

    if (action === 'exit-arcade-mode') {
      pauseIdleChatter(3200)
      setHotlineMsg?.(arcadeContent.controlMessages.exit)
      onExit?.()
    }
  }

  return (
    <div className="arcade-shell">
      <div className="arcade-cabinet">
        <header className="arcade-marquee">
          <div className="arcade-kicker">{arcadeContent.marqueeKicker}</div>
          <div className="arcade-title">{arcadeContent.title}</div>
          <button
            type="button"
            className="arcade-exit-btn"
            onClick={() => {
              pauseIdleChatter(3200)
              setHotlineMsg?.(arcadeContent.controlMessages.exit)
              onExit?.()
            }}
          >
            EXIT
          </button>
          <section className="marquee-zone-switch-row">
            <button
              type="button"
              className={`zone-btn marquee-zone-btn ${activeZone === 'arcade' ? 'active' : ''}`}
              onClick={() => {
                switchZone('arcade')
              }}
            >
              {arcadeContent.zoneLabels.arcade}
            </button>
            <button
              type="button"
              className={`zone-btn marquee-zone-btn ${activeZone === 'xr' ? 'active' : ''}`}
              onClick={() => {
                switchZone('xr')
              }}
            >
              {arcadeContent.zoneLabels.xr}
            </button>
          </section>
        </header>

        <div className="arcade-screen-frame">
          <div className="arcade-screen-corners">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className={`arcade-screen ${zoneTransitioning ? 'is-zone-switching' : ''}`}>
          <section className="zone-switch-row">
            <button
              type="button"
              className={`zone-btn ${activeZone === 'arcade' ? 'active' : ''}`}
              onClick={() => {
                switchZone('arcade')
              }}
            >
              {arcadeContent.zoneLabels.arcade}
            </button>
            <button
              type="button"
              className={`zone-btn ${activeZone === 'xr' ? 'active' : ''}`}
              onClick={() => {
                switchZone('xr')
              }}
            >
              {arcadeContent.zoneLabels.xr}
            </button>
          </section>

          <div className="retro-fx-strip" aria-hidden="true">
            <span className="fx-coin" />
            <span className="fx-block" />
            <span className="fx-runner" />
            <span className="fx-flag" />
          </div>

          <div key={activeZone} className={`arcade-grid arcade-grid-animate ${zoneTransitioning ? 'zone-transition' : ''}`}>
            <section className="project-list-panel">
              <div className="panel-label">SELECT A TITLE</div>
              {zoneProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className={`project-card ${selectedProject?.id === project.id ? 'active' : ''}`}
                  onClick={() => {
                    pauseIdleChatter()
                    if (project.id !== selectedId) {
                      triggerDetailTransition()
                    }
                    setSelectedId(project.id)
                    setMsgCursor((prev) => prev + 1)
                  }}
                >
                  <PixelThumb
                    name={project.thumb}
                    animateClass={project.anim}
                    imagePath={project.imagePath}
                    title={project.title}
                  />
                  <div className="project-title">{project.title}</div>
                  <div className="project-meta">{project.type}</div>
                  <div className="project-engine">{project.engine}</div>
                </button>
              ))}
            </section>

            {selectedProject && (
              <section
                key={`${activeZone}-${selectedProject.id}`}
                className={`project-detail-panel project-detail-animate ${detailTransitioning ? 'detail-transition' : ''}`}
              >
                <div className="details-head">
                  <h3>{selectedProject.title}</h3>
                  <span>{selectedProject.type}</span>
                </div>

                <div className="project-platforms">
                  {selectedProject.platforms.map((platform) => (
                    <span key={platform}>{platform}</span>
                  ))}
                </div>

                <p className="details-objective">{selectedProject.objective}</p>
                <p className="details-narrative">{selectedProject.narrative}</p>
                <div className="details-label">TECHNICAL FOCUS</div>
                <ul className="details-list">
                  {selectedProject.technical.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
          </div>
        </div>

        <div className="arcade-control-deck">
          <div className="deck-joystick-assembly">
            <span className="joystick-shadow" />
            <span className="joystick-base" />
            <span className="joystick-shaft" />
            <span className="joystick-knob" />
          </div>

          <div className="deck-button-cluster">
            <button
              type="button"
              className="deck-btn b1"
              aria-label="previous-project"
              onClick={() => controlButtonInput('previous-project')}
            >
              <span className="deck-btn-label">A</span>
            </button>
            <button
              type="button"
              className="deck-btn b2"
              aria-label="next-project"
              onClick={() => controlButtonInput('next-project')}
            >
              <span className="deck-btn-label">B</span>
            </button>
            <button
              type="button"
              className="deck-btn b3"
              aria-label="switch-zone"
              onClick={() => controlButtonInput('switch-zone')}
            >
              <span className="deck-btn-label">X</span>
            </button>
            <button
              type="button"
              className="deck-btn b4"
              aria-label="replay-project-info"
              onClick={() => controlButtonInput('replay-project-info')}
            >
              <span className="deck-btn-label">Y</span>
            </button>
            <button
              type="button"
              className="deck-btn b5"
              aria-label="random-project"
              onClick={() => controlButtonInput('random-project')}
            >
              <span className="deck-btn-label">L1</span>
            </button>
            <button
              type="button"
              className="deck-btn b6"
              aria-label="exit-arcade-mode"
              onClick={() => controlButtonInput('exit-arcade-mode')}
            >
              <span className="deck-btn-label">R1</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ArcadeApp
