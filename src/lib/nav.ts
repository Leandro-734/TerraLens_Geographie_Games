import { useNavigate } from 'react-router-dom'
import type { GameId } from '../store/appStore'

/**
 * Navigation helpers backed by the URL router. Each game lives at its own path
 * (`/satellite`, `/locate`, `/travle`) so games are deep-linkable and the
 * browser's back/forward buttons work; the menu is the root path.
 */
export function useGameNav() {
  const navigate = useNavigate()
  return {
    openGame: (id: GameId) => navigate(`/${id}`),
    exitToMenu: () => navigate('/'),
  }
}
