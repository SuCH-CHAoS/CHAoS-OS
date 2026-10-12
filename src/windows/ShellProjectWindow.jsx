import { useEffect, useMemo, useState } from 'react'
import '../styles/shell-window.css'
import { getPixelArtMaps } from './shellData'

const TYPE_START_DELAY = 520
const TYPE_LINE_PAUSE = 110
const PIXEL_BOOT_DELAY = 720
const PIXEL_STEP = 10

function getInitialProjectTypingState(lineCount) {
  return {
    visibleLines: Array.from({ length: lineCount }, () => ''),
    activeLineIndex: lineCount ? 0 : -1
  }
}

function useProjectTyping(lines) {
  const [typingState, setTypingState] = useState(() => (
    getInitialProjectTypingState(lines.length)
  ))

  useEffect(() => {
    if (!lines.length) return

    let cancelled = false
    let timeoutId
    let lineIndex = 0
    let charIndex = 0
    const nextVisibleLines = lines.map(() => '')

    const schedule = (delay) => {
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(step, delay)
    }

    const step = () => {
      if (cancelled) return

      const line = lines[lineIndex]?.text ?? ''
      const nextCharIndex = Math.min(charIndex + 1, line.length)

      nextVisibleLines[lineIndex] = line.slice(0, nextCharIndex)
      setTypingState({
        visibleLines: [...nextVisibleLines],
        activeLineIndex: lineIndex
      })

      if (nextCharIndex < line.length) {
        charIndex = nextCharIndex
        schedule(line[nextCharIndex - 1] === ' ' ? 12 : 18)
        return
      }

      if (lineIndex >= lines.length - 1) {
        setTypingState({
          visibleLines: [...nextVisibleLines],
          activeLineIndex: -1
        })
        return
      }

      lineIndex += 1
      charIndex = 0
      schedule(TYPE_LINE_PAUSE)
    }

    schedule(TYPE_START_DELAY)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [lines])

  return typingState
}

function usePixelBoot(totalCells) {
  const [visiblePixelCount, setVisiblePixelCount] = useState(0)

  useEffect(() => {
    let timeoutId
    let intervalId
    let nextVisiblePixelCount = 0

    timeoutId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        nextVisiblePixelCount = Math.min(
          nextVisiblePixelCount + PIXEL_STEP,
          totalCells
        )
        setVisiblePixelCount(nextVisiblePixelCount)

        if (nextVisiblePixelCount >= totalCells) {
          window.clearInterval(intervalId)
        }
      }, 42)
    }, PIXEL_BOOT_DELAY)

    return () => {
      window.clearTimeout(timeoutId)
      window.clearInterval(intervalId)
    }
  }, [totalCells])

  return visiblePixelCount
}

function ProjectTypedLine({
  as = 'div',
  className = '',
  active,
  children
}) {
  const typedClassName = `shell-project-typed ${className} ${active ? 'is-active' : ''}`.trim()
  const content = (
    <>
      {children}
      {active && (
        <span className="shell-project-type-cursor" aria-hidden="true" />
      )}
    </>
  )

  if (as === 'h2') return <h2 className={typedClassName}>{content}</h2>
  if (as === 'p') return <p className={typedClassName}>{content}</p>
  if (as === 'li') return <li className={typedClassName}>{content}</li>

  return <div className={typedClassName}>{content}</div>
}

function PixelProjectArt({ variant, title, imagePath }) {
  const pixelArtMaps = getPixelArtMaps()
  const map = pixelArtMaps[variant] || pixelArtMaps.kali
  const columns = map[0]?.length ?? 0
  const visiblePixelCount = usePixelBoot(map.length * columns)
  const [failedImagePath, setFailedImagePath] = useState('')

  if (imagePath && failedImagePath !== imagePath) {
    return (
      <img
        src={imagePath}
        alt={`${title} visual preview`}
        className="shell-project-image"
        onError={() => setFailedImagePath(imagePath)}
      />
    )
  }

  return (
    <div
      className="shell-pixel-art"
      role="img"
      aria-label={`${title} pixel preview`}
    >
      {map.map((row, rowIndex) =>
        row.split('').map((cell, cellIndex) => {
          const pixelIndex = rowIndex * columns + cellIndex
          let className = 'shell-pixel'
          if (cell === '1') className += ' is-dim'
          if (cell === '2') className += ' is-bright'
          if (cell !== '.' && pixelIndex >= visiblePixelCount) {
            className += ' is-pending'
          }

          return (
            <span
              key={`${rowIndex}-${cellIndex}`}
              className={className}
            />
          )
        })
      )}
    </div>
  )
}

function ShellProjectWindow({ project, collectionKey }) {
  const collectionLabel = collectionKey === 'projects'
    ? 'CYBER PROJECT'
    : 'NETWORK PROJECT'
  const typedLines = useMemo(() => ([
    {
      key: 'kicker',
      as: 'div',
      className: 'shell-project-kicker',
      text: collectionLabel
    },
    {
      key: 'title',
      as: 'h2',
      className: 'shell-project-title',
      text: project.title
    },
    {
      key: 'stack',
      as: 'div',
      className: 'shell-project-stack',
      text: `STACK: ${project.stack}`
    },
    {
      key: 'intro',
      as: 'p',
      text: project.intro
    },
    {
      key: 'details',
      as: 'p',
      text: project.details
    },
    {
      key: 'subtitle',
      as: 'div',
      className: 'shell-project-subtitle',
      text: 'KEY OPERATIONS'
    },
    ...project.highlights.map((line, index) => ({
      key: `highlight-${index}`,
      as: 'li',
      text: `> ${line}`
    }))
  ]), [
    collectionLabel,
    project.details,
    project.highlights,
    project.stack,
    project.title,
    project.intro
  ])
  const typingState = useProjectTyping(typedLines)
  const getTypedLine = (lineKey) => {
    const index = typedLines.findIndex((line) => line.key === lineKey)

    return {
      index,
      text: typingState.visibleLines[index] ?? '',
      active: typingState.activeLineIndex === index
    }
  }

  const kickerLine = getTypedLine('kicker')
  const titleLine = getTypedLine('title')
  const stackLine = getTypedLine('stack')
  const introLine = getTypedLine('intro')
  const detailsLine = getTypedLine('details')
  const subtitleLine = getTypedLine('subtitle')

  return (
    <div className="shell-project-shell">
      <div className="shell-window-status">
        <span>{collectionLabel}</span>
        <span>ID {project.id}</span>
      </div>

      <div className="shell-project-header">
        <ProjectTypedLine
          className="shell-project-kicker"
          active={kickerLine.active}
        >
          {kickerLine.text}
        </ProjectTypedLine>
        <ProjectTypedLine
          as="h2"
          className="shell-project-title"
          active={titleLine.active}
        >
          {titleLine.text}
        </ProjectTypedLine>
        <ProjectTypedLine
          className="shell-project-stack"
          active={stackLine.active}
        >
          {stackLine.text}
        </ProjectTypedLine>
      </div>

      <div className="shell-project-grid">
        <div className="shell-project-copy">
          <ProjectTypedLine as="p" active={introLine.active}>
            {introLine.text}
          </ProjectTypedLine>
          <ProjectTypedLine as="p" active={detailsLine.active}>
            {detailsLine.text}
          </ProjectTypedLine>

          <ProjectTypedLine
            className="shell-project-subtitle"
            active={subtitleLine.active}
          >
            {subtitleLine.text}
          </ProjectTypedLine>
          <ul className="shell-project-list">
            {project.highlights.map((line, highlightIndex) => {
              const typedLine = getTypedLine(`highlight-${highlightIndex}`)

              return (
                <ProjectTypedLine
                  key={line}
                  as="li"
                  active={typedLine.active}
                >
                  {typedLine.text}
                </ProjectTypedLine>
              )
            })}
          </ul>
        </div>

        <div className="shell-project-visual">
          <PixelProjectArt
            variant={project.art}
            title={project.title}
            imagePath={project.imagePath}
          />
        </div>
      </div>
    </div>
  )
}

export default ShellProjectWindow
