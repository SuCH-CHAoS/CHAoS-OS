import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '../styles/shell-window.css'
import {
  getProjectById,
  getProjectCollection,
  getEasterEggAliases,
  getInitialTerminalLines,
  getSpecialChannelCommand,
  getSpecialChannelLines,
  getSpecialChannelPhoneMsg,
  getTerminalEasterEggs,
  getTerminalHelpLines,
  getTerminalStatusLines
} from './shellData'

const PROMPT = 'C:\\CHAOS\\SHELL>'

function getInitialTypingState(lines) {
  return {
    visibleLines: lines.map(() => ''),
    activeLineIndex: lines.length ? 0 : -1
  }
}

function TypedLineList({
  lines,
  className,
  lineClassName,
  onProgress
}) {
  const [typingState, setTypingState] = useState(() => getInitialTypingState(lines))

  useEffect(() => {
    let timeoutId

    if (!lines.length) {
      return
    }

    let cancelled = false
    let lineIndex = 0
    let charIndex = 0
    const nextVisibleLines = lines.map(() => '')

    const schedule = (delay) => {
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(step, delay)
    }

    const step = () => {
      if (cancelled) return

      const line = lines[lineIndex] ?? ''

      if (line.length === 0) {
        if (lineIndex >= lines.length - 1) {
          setTypingState({
            visibleLines: [...nextVisibleLines],
            activeLineIndex: -1
          })
          onProgress?.()
          return
        }

        lineIndex += 1
        charIndex = 0
        setTypingState({
          visibleLines: [...nextVisibleLines],
          activeLineIndex: lineIndex
        })
        onProgress?.()
        schedule(40)
        return
      }

      const nextCharIndex = Math.min(charIndex + 1, line.length)
      nextVisibleLines[lineIndex] = line.slice(0, nextCharIndex)

      setTypingState({
        visibleLines: [...nextVisibleLines],
        activeLineIndex: lineIndex
      })

      onProgress?.()

      if (nextCharIndex < line.length) {
        charIndex = nextCharIndex
        schedule(line[nextCharIndex - 1] === ' ' ? 18 : 24)
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
      setTypingState({
        visibleLines: [...nextVisibleLines],
        activeLineIndex: lineIndex
      })
      schedule(120)
    }

    schedule(80)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [lines, onProgress])

  return (
    <div className={className}>
      {lines.map((line, index) => (
        <div
          key={`${index}-${line}`}
          className={`${lineClassName} ${typingState.activeLineIndex === index ? 'is-typing' : ''}`.trim()}
        >
          {typingState.visibleLines[index]}
          {typingState.activeLineIndex === index && (
            <span className="shell-window-block-cursor" aria-hidden="true" />
          )}
        </div>
      ))}
    </div>
  )
}

function ShellTerminalWindow({
  active,
  onClose,
  onOpenProjectWindow,
  onPrivateCommand,
  setHotlineMsg
}) {
  const [history, setHistory] = useState(() => getInitialTerminalLines())
  const [command, setCommand] = useState('')
  const [view, setView] = useState('terminal')
  const [glitching, setGlitching] = useState(false)
  const [surfaceVersion, setSurfaceVersion] = useState(0)

  const outputRef = useRef(null)
  const inputRef = useRef(null)
  const glitchTimerRef = useRef(null)

  const replaceOutput = useCallback((lines) => {
    setHistory(lines ?? [])
    setSurfaceVersion((prev) => prev + 1)
  }, [])

  const showCollection = useCallback((collectionKey) => {
    setView(collectionKey)
    setSurfaceVersion((prev) => prev + 1)
  }, [])

  useEffect(() => {
    setHotlineMsg?.('Shell ready. PROJECTS, NETWORKING, or HELP.')
  }, [setHotlineMsg])

  useEffect(() => {
    if (active) {
      inputRef.current?.focus()
      return
    }

    inputRef.current?.blur()
  }, [active])

  useEffect(() => {
    outputRef.current?.scrollTo({
      top: outputRef.current.scrollHeight,
      behavior: 'auto'
    })
  }, [history, view])

  const scrollOutputToBottom = useCallback(() => {
    outputRef.current?.scrollTo({
      top: outputRef.current.scrollHeight,
      behavior: 'auto'
    })
  }, [])

  useEffect(() => () => {
    clearTimeout(glitchTimerRef.current)
  }, [])

  const focusInput = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  const triggerGlitch = useCallback(() => {
    clearTimeout(glitchTimerRef.current)
    setGlitching(true)
    glitchTimerRef.current = window.setTimeout(() => {
      setGlitching(false)
    }, 220)
  }, [])

  const openProject = useCallback((project) => {
    onOpenProjectWindow?.(project.kind, project)
    setView('terminal')
    replaceOutput([
      `Opened [${project.id}] ${project.title}`,
      `Spawned window: ${project.windowTitle}`
    ])
    setHotlineMsg?.(project.hotlineOpen)
  }, [onOpenProjectWindow, replaceOutput, setHotlineMsg])
  const specialChannelCommand = getSpecialChannelCommand()

  const runCommand = useCallback(async (rawCommand) => {
    const trimmed = rawCommand.trim()
    const lowerCommand = trimmed.toLowerCase()
    const normalizedCommand = lowerCommand.replace(/[^a-z0-9]/g, '')

    if (!trimmed) {
      setHotlineMsg?.('No command entered.')
      return
    }

    const adminResult = await onPrivateCommand?.(trimmed)

    if (adminResult?.ok) {
      setView('terminal')
      replaceOutput(adminResult.lines ?? [
        'CHAOS CONTROL DESK ONLINE.',
        'Admin dashboard window spawned.'
      ])
      setHotlineMsg?.(adminResult.phoneMsg ?? 'CHAoS Control Desk unlocked.')
      return
    }

    if (adminResult?.terminalHandled) {
      setView('terminal')
      replaceOutput(adminResult.lines ?? [
        'ACCESS DENIED.',
        'Admin dashboard is unavailable.'
      ])
      setHotlineMsg?.(adminResult.phoneMsg ?? 'Admin access rejected.')
      return
    }

    if (view === 'projects' || view === 'networking') {
      if (lowerCommand === 'back') {
        setView('terminal')
        replaceOutput(['Returned to terminal.'])
        setHotlineMsg?.('Closed selection list.')
        return
      }

      if (/^\d+$/.test(lowerCommand)) {
        const project = getProjectById(view, Number(lowerCommand))
        if (project) {
          openProject(project)
          return
        }
      }

      replaceOutput([
        view === 'projects'
          ? 'Use a project number or BACK.'
          : 'Use a networking project number or BACK.'
      ])
      setHotlineMsg?.('Selection rejected. Use a number or BACK.')
      return
    }

    if (lowerCommand === 'help') {
      setView('terminal')
      replaceOutput(getTerminalHelpLines())
      setHotlineMsg?.('HELP loaded: 8 commands available.')
      return
    }

    if (lowerCommand === 'status') {
      setView('terminal')
      replaceOutput(getTerminalStatusLines())
      setHotlineMsg?.('Shell terminal stable.')
      return
    }

    if (lowerCommand === 'projects' || lowerCommand === 'networking') {
      showCollection(lowerCommand)
      setHotlineMsg?.(
        lowerCommand === 'projects'
          ? 'Shell projects loaded. Select by number.'
          : 'Networking projects loaded. Select by number.'
      )
      return
    }

    if (lowerCommand === 'clear') {
      setView('terminal')
      replaceOutput([])
      setHotlineMsg?.('Terminal output cleared.')
      return
    }

    if (lowerCommand === 'exit') {
      setHotlineMsg?.('Closing Shell terminal.')
      onClose?.()
      return
    }

    if (lowerCommand === specialChannelCommand) {
      setView('terminal')
      replaceOutput(getSpecialChannelLines())
      setHotlineMsg?.(getSpecialChannelPhoneMsg())
      return
    }

    const easterEggAliases = getEasterEggAliases()
    const terminalEasterEggs = getTerminalEasterEggs()
    const easterEggKey = easterEggAliases[normalizedCommand]
    if (easterEggKey && terminalEasterEggs[easterEggKey]) {
      const egg = terminalEasterEggs[easterEggKey]
      setView('terminal')
      replaceOutput(egg.lines)
      if (easterEggKey === 'glitch') {
        triggerGlitch()
      }
      setHotlineMsg?.(egg.phoneMsg)
      return
    }

    setView('terminal')
    replaceOutput(['Unknown command.'])
    setHotlineMsg?.(`Unknown command: ${trimmed.toUpperCase()}`)
  }, [
    onClose,
    onPrivateCommand,
    openProject,
    replaceOutput,
    setHotlineMsg,
    showCollection,
    specialChannelCommand,
    triggerGlitch,
    view
  ])

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault()
    const nextCommand = command
    setCommand('')
    await runCommand(nextCommand)
  }, [command, runCommand])

  const activeCollection = useMemo(() => getProjectCollection(view), [view])
  const surfaceKey = `${view}-${surfaceVersion}`
  const collectionLines = useMemo(() => {
    if (!activeCollection) return []

    return [
      activeCollection.title,
      '',
      ...activeCollection.items.map((project) => `[${project.id}] ${project.title}`),
      '',
      activeCollection.prompt
    ]
  }, [activeCollection])

  return (
    <div
      className={`shell-terminal-shell ${glitching ? 'is-glitching' : ''}`}
      onMouseDown={focusInput}
    >
      <div
        ref={outputRef}
        className="shell-window-display"
      >
        {view === 'terminal' && (
          <div key={surfaceKey} className="shell-window-screen">
            {history.length === 0 && (
              <div className="shell-window-empty">
                Awaiting command.
              </div>
            )}
            {history.length > 0 && (
              <TypedLineList
                key={surfaceKey}
                lines={history}
                className="shell-window-lines"
                lineClassName="shell-window-line"
                onProgress={scrollOutputToBottom}
              />
            )}
          </div>
        )}

        {activeCollection && (
          <div key={surfaceKey} className="shell-window-panel">
            <TypedLineList
              key={surfaceKey}
              lines={collectionLines}
              className="shell-window-lines"
              lineClassName="shell-window-line"
              onProgress={scrollOutputToBottom}
            />
          </div>
        )}
      </div>

      <form className="shell-window-inputbar" onSubmit={handleSubmit}>
        <label className="shell-window-prompt" htmlFor="shell-terminal-input">
          {PROMPT}
        </label>
        <input
          id="shell-terminal-input"
          ref={inputRef}
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          className="shell-window-input"
          autoComplete="off"
          spellCheck="false"
        />
      </form>
    </div>
  )
}

export default ShellTerminalWindow
