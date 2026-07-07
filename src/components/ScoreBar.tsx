export default function ScoreBar({
  round,
  total,
  score,
  streak,
  onQuit,
  muted,
  onToggleMute,
}: {
  round: number
  total: number
  score: number
  streak: number
  onQuit: () => void
  muted?: boolean
  onToggleMute?: () => void
}) {
  return (
    <div className="hud">
      <button className="iconBtn" onClick={onQuit} aria-label="Quit game" title="Quit game">
        ✕
      </button>
      <div className="hudRight">
        {onToggleMute && (
          <button
            className="iconBtn"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        )}
        <div className="statPill">
          <span className="statPillRound">
            Round {round}/{total}
          </span>
          {streak >= 2 && <span className="statPillStreak">🔥 {streak}</span>}
          <span className="statPillScore">{score.toLocaleString()} pts</span>
        </div>
      </div>
    </div>
  )
}
