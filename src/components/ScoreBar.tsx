import type { ReactNode } from 'react'
import { CloseIcon, SpeakerIcon } from './icons'

export default function ScoreBar({
  round,
  total,
  score,
  streak,
  onQuit,
  muted,
  onToggleMute,
  timer,
}: {
  round: number
  total: number
  score: number
  streak: number
  onQuit: () => void
  muted?: boolean
  onToggleMute?: () => void
  // Rendered between the close button and the stat pill — on mobile this
  // grows to fill the row instead of the centered floating overlay.
  timer?: ReactNode
}) {
  return (
    <div className="hud">
      <button className="iconBtn" onClick={onQuit} aria-label="Quit game" title="Quit game">
        <CloseIcon />
      </button>
      {timer && <div className="hudTimerSlot">{timer}</div>}
      <div className="hudRight">
        {onToggleMute && (
          <button
            className="iconBtn muteBtn"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
            title={muted ? 'Unmute' : 'Mute'}
          >
            <SpeakerIcon muted={!!muted} />
          </button>
        )}
        <div className="statPill">
          <span className="statPillRound">
            <span className="statPillRoundLabel">Round </span>
            {round}/{total}
          </span>
          {streak >= 2 && <span className="statPillStreak">🔥 {streak}</span>}
          <span className="statPillScore">{score.toLocaleString()} pts</span>
        </div>
      </div>
    </div>
  )
}
