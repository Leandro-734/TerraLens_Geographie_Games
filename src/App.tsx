import { Routes, Route, Navigate } from 'react-router-dom'
import MenuScreen from './screens/MenuScreen'
import SatelliteGame from './games/SatelliteGame'
import LocateGame from './games/locate/LocateGame'
import TravleGame from './games/travle/TravleGame'

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<MenuScreen />} />
        <Route path="/satellite" element={<SatelliteGame />} />
        <Route path="/locate" element={<LocateGame />} />
        <Route path="/travle" element={<TravleGame />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
