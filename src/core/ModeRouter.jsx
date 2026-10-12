import { Suspense, useEffect, useState } from 'react'
import { modes } from './ModeRegistry'

function ModeRouter({ activeModeId, onExit, setHotlineMsg }) {
  const activeMode = modes.find(m => m.id === activeModeId)
  const modeId = activeMode?.id ?? ''
  const LoaderComponent = activeMode?.loader ?? null
  const ModeComponent = activeMode?.component ?? null
  const isGameMode = modeId === 'arcade'
  const loadDuration = activeMode?.loadDuration ?? 1800
  const [showLoader, setShowLoader] = useState(() => (
    isGameMode && Boolean(LoaderComponent)
  ))

  useEffect(() => {
    if (!showLoader || !isGameMode || !LoaderComponent) {
      return
    }

    activeMode?.preload?.()

    const timer = window.setTimeout(() => {
      setShowLoader(false)
    }, loadDuration)

    return () => window.clearTimeout(timer)
  }, [activeMode, showLoader, isGameMode, loadDuration, LoaderComponent])

  if (!activeMode || !ModeComponent) return null

  const loaderFallback = LoaderComponent ? <LoaderComponent /> : null

  return (
    <div
      key={modeId}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        isolation: 'isolate',
        background: '#0b0f0c'
      }}
    >
      {showLoader && LoaderComponent ? (
        <LoaderComponent />
      ) : (
        <Suspense fallback={loaderFallback}>
          <ModeComponent
            onExit={onExit}
            setHotlineMsg={setHotlineMsg}
          />
        </Suspense>
      )}
    </div>
  )
}

export default ModeRouter
