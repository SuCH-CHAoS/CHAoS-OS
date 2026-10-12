import '../styles/hotline.css'
import phoneImg from '../assets/hotline/phone.png'

function HotlineDevice({ message, onClick }) {
  return (
    <div className="hotline-container">
      {message && (
        <div className="hotline-bubble">
          {message}
        </div>
      )}

      <button
        type="button"
        className="hotline-phone-button"
        onClick={onClick}
        aria-label="Interact with Hotline Device"
      >
        <img
          key={message ?? 'idle'}
          src={phoneImg}
          alt=""
          className={`hotline-phone ${message ? 'ringing' : ''}`}
          draggable={false}
        />
      </button>
    </div>
  )
}

export default HotlineDevice
