export default function Timer({ secondsLeft, total }: { secondsLeft: number; total: number }) {
  const pct = Math.max(0, Math.min(100, (secondsLeft / total) * 100))
  const low = secondsLeft <= 5
  return (
    <div className="timer">
      <div className="timerTrack">
        <div className={`timerFill${low ? ' timerLow' : ''}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="timerSecs">{secondsLeft}s</span>
    </div>
  )
}
