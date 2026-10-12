import { useEffect } from 'react'
import './ArcadeLoader.css'

function ArcadeLoader() {
  useEffect(() => {
    document.body.classList.add('mode-arcade-active')
    return () => {
      document.body.classList.remove('mode-arcade-active')
    }
  }, [])

  return (
    <div className="arcade-shell arcade-loader-shell">
      <div className="arcade-cabinet">
        <header className="arcade-marquee">
          <div className="arcade-kicker">UNITY ARCADE "SuCH CHAoS"</div>
          <div className="arcade-title">ARCADE MODE</div>
          <button type="button" className="arcade-exit-btn" disabled>
            LOADING
          </button>
        </header>

        <div className="arcade-screen-frame">
          <div className="arcade-screen-corners">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="arcade-screen arcade-loader-screen">
            <div className="arcade-loader-blackout" />
            <div className="arcade-loader-boot">BOOTING ARCADE CABINET...</div>
            <div className="arcade-loader-status">INITIALIZING MENU LAYER...</div>
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
            <button type="button" tabIndex={-1} className="deck-btn b1" aria-label="button-1" disabled />
            <button type="button" tabIndex={-1} className="deck-btn b2" aria-label="button-2" disabled />
            <button type="button" tabIndex={-1} className="deck-btn b3" aria-label="button-3" disabled />
            <button type="button" tabIndex={-1} className="deck-btn b4" aria-label="button-4" disabled />
            <button type="button" tabIndex={-1} className="deck-btn b5" aria-label="button-5" disabled />
            <button type="button" tabIndex={-1} className="deck-btn b6" aria-label="button-6" disabled />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ArcadeLoader
