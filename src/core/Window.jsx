import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import '../styles/window.css'

const FALLBACK_POSITION = { top: 80, left: 120 }
const DESKTOP_DRAG_BREAKPOINT = 1024
const DEFAULT_TASKBAR_HEIGHT = 36
const WINDOW_EXIT_ANIMATION_MS = 160

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function getTaskbarHeight() {
  const taskbar = document.querySelector('.taskbar')
  return taskbar?.getBoundingClientRect().height ?? DEFAULT_TASKBAR_HEIGHT
}

function getDragBounds(element) {
  return {
    maxLeft: Math.max(window.innerWidth - element.offsetWidth, 0),
    maxTop: Math.max(window.innerHeight - getTaskbarHeight() - element.offsetHeight, 0)
  }
}

function clampPosition(position, element) {
  const bounds = getDragBounds(element)

  return {
    left: clamp(position.left, 0, bounds.maxLeft),
    top: clamp(position.top, 0, bounds.maxTop)
  }
}

function applyPosition(element, position) {
  element.style.left = `${position.left}px`
  element.style.top = `${position.top}px`
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function stopControlPointer(event) {
  event.stopPropagation()
}

function Window({
  title,
  children,
  active,
  minimized,
  defaultPosition,
  windowClassName,
  contentClassName,
  onClose,
  onMinimize,
  onFocus
}) {
  const initialPosition = defaultPosition ?? FALLBACK_POSITION
  const [renderPosition, setRenderPosition] = useState(initialPosition)
  const [phase, setPhase] = useState('idle')
  const ref = useRef(null)
  const positionRef = useRef(initialPosition)
  const dragRef = useRef(null)
  const onFocusRef = useRef(onFocus)
  const onCloseRef = useRef(onClose)
  const onMinimizeRef = useRef(onMinimize)
  const exitTimerRef = useRef(null)

  useEffect(() => {
    onFocusRef.current = onFocus
  }, [onFocus])

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    onMinimizeRef.current = onMinimize
  }, [onMinimize])

  useEffect(() => {
    return () => window.clearTimeout(exitTimerRef.current)
  }, [])

  useLayoutEffect(() => {
    if (!ref.current || minimized) return

    const nextPosition = clampPosition(
      positionRef.current ?? defaultPosition ?? FALLBACK_POSITION,
      ref.current
    )

    positionRef.current = nextPosition
    applyPosition(ref.current, nextPosition)
  }, [defaultPosition, minimized])

  useEffect(() => {
    if (!ref.current || minimized) return

    const windowElement = ref.current
    const titleBar = windowElement.querySelector('.win98-titlebar')

    if (!titleBar) return

    const removeDragListeners = () => {
      window.removeEventListener('pointermove', moveDrag)
      window.removeEventListener('pointerup', stopDrag)
      window.removeEventListener('pointercancel', stopDrag)
    }

    const finishDrag = (commitState = true) => {
      const drag = dragRef.current
      if (!drag) return

      if (drag.frameId !== null) {
        window.cancelAnimationFrame(drag.frameId)
      }

      const nextPosition = {
        left: drag.lastLeft,
        top: drag.lastTop
      }

      windowElement.style.translate = ''
      windowElement.classList.remove('is-dragging')
      document.body.classList.remove('window-drag-active')
      positionRef.current = nextPosition
      applyPosition(windowElement, nextPosition)
      if (commitState) {
        setRenderPosition(nextPosition)
      }
      dragRef.current = null
      removeDragListeners()
    }

    function moveDrag(event) {
      const drag = dragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return

      const nextLeft = clamp(
        drag.startLeft + event.clientX - drag.startX,
        0,
        drag.maxLeft
      )
      const nextTop = clamp(
        drag.startTop + event.clientY - drag.startY,
        0,
        drag.maxTop
      )

      drag.lastLeft = nextLeft
      drag.lastTop = nextTop
      event.preventDefault()

      if (drag.frameId !== null) return

      drag.frameId = window.requestAnimationFrame(() => {
        const activeDrag = dragRef.current
        if (!activeDrag) return

        activeDrag.frameId = null
        windowElement.style.translate = `${activeDrag.lastLeft - activeDrag.startLeft}px ${activeDrag.lastTop - activeDrag.startTop}px`
      })
    }

    function stopDrag(event) {
      const drag = dragRef.current
      if (event && drag && event.pointerId !== drag.pointerId) return

      finishDrag()
    }

    function startDrag(event) {
      if (event.button !== 0) return
      if (window.matchMedia(`(max-width: ${DESKTOP_DRAG_BREAKPOINT}px)`).matches) return
      if (event.target instanceof Element && event.target.closest('.win98-controls')) return

      const currentPosition = clampPosition(
        positionRef.current ?? {
          left: windowElement.offsetLeft,
          top: windowElement.offsetTop
        },
        windowElement
      )
      const bounds = getDragBounds(windowElement)

      positionRef.current = currentPosition
      applyPosition(windowElement, currentPosition)

      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startLeft: currentPosition.left,
        startTop: currentPosition.top,
        lastLeft: currentPosition.left,
        lastTop: currentPosition.top,
        maxLeft: bounds.maxLeft,
        maxTop: bounds.maxTop,
        frameId: null
      }

      windowElement.classList.add('is-dragging')
      document.body.classList.add('window-drag-active')
      onFocusRef.current?.()
      event.preventDefault()

      window.addEventListener('pointermove', moveDrag, { passive: false })
      window.addEventListener('pointerup', stopDrag)
      window.addEventListener('pointercancel', stopDrag)
    }

    titleBar.addEventListener('pointerdown', startDrag)

    return () => {
      titleBar.removeEventListener('pointerdown', startDrag)
      finishDrag(false)
    }
  }, [minimized])

  useEffect(() => {
    if (minimized) return

    const handleResize = () => {
      if (!ref.current) return

      const nextPosition = clampPosition(positionRef.current, ref.current)
      positionRef.current = nextPosition
      applyPosition(ref.current, nextPosition)
      setRenderPosition(nextPosition)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [minimized])

  const runWindowAction = (nextPhase, action) => {
    if (phase !== 'idle') return

    window.clearTimeout(exitTimerRef.current)

    if (prefersReducedMotion()) {
      action?.()
      return
    }

    setPhase(nextPhase)
    exitTimerRef.current = window.setTimeout(() => {
      setPhase('idle')
      action?.()
    }, WINDOW_EXIT_ANIMATION_MS)
  }

  const handleMinimize = () => {
    runWindowAction('minimizing', () => onMinimizeRef.current?.())
  }

  const handleClose = () => {
    runWindowAction('closing', () => onCloseRef.current?.())
  }

  if (minimized) return null

  const phaseClassName = phase !== 'idle' ? `is-${phase}` : ''

  return (
    <div
      ref={ref}
      className={`win98-window ${windowClassName ?? ''} ${active ? 'active' : ''} ${phaseClassName}`.trim()}
      style={{
        left: `${renderPosition.left}px`,
        top: `${renderPosition.top}px`
      }}
      onMouseDown={onFocus}
    >
      {/* TITLE BAR */}
      <div className="win98-titlebar">
        <div className="win98-title">{title}</div>

        <div className="win98-controls">
          <button
            type="button"
            className="win98-btn minimize"
            onPointerDown={stopControlPointer}
            onMouseDown={stopControlPointer}
            onTouchStart={stopControlPointer}
            onClick={handleMinimize}
            title="Minimize"
            disabled={phase !== 'idle'}
          />

          <button
            type="button"
            className="win98-btn close"
            onPointerDown={stopControlPointer}
            onMouseDown={stopControlPointer}
            onTouchStart={stopControlPointer}
            onClick={handleClose}
            title="Close"
            disabled={phase !== 'idle'}
          >
            X
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className={`win98-content ${contentClassName ?? ''}`.trim()}>
        {children}
      </div>
    </div>
  )
}

export default Window
