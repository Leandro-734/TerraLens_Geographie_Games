import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import HomeScreen from '../screens/HomeScreen'
import RoundScreen from '../screens/RoundScreen'
import ResultScreen from '../screens/ResultScreen'
import SummaryScreen from '../screens/SummaryScreen'

/**
 * Root of the "City from Satellite" game. Renders one of its four phase screens
 * from the game store, and resets to the intro screen whenever the game is
 * (re-)opened from the menu.
 */
export default function SatelliteGame() {
  const phase = useGameStore((s) => s.phase)
  const quitToHome = useGameStore((s) => s.quitToHome)

  useEffect(() => {
    quitToHome()
  }, [quitToHome])

  return (
    <>
      {phase === 'home' && <HomeScreen />}
      {phase === 'round' && <RoundScreen />}
      {phase === 'result' && <ResultScreen />}
      {phase === 'summary' && <SummaryScreen />}
    </>
  )
}
