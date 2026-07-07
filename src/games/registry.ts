import type { GameId } from '../store/appStore'
import satelliteIcon from '../assets/icons/satellite.svg'
import locateIcon from '../assets/icons/locate.svg'
import travleIcon from '../assets/icons/travle.svg'

export interface GameMeta {
  id: GameId
  title: string
  tagline: string
  emoji: string
  /** URL of the game's themed SVG icon. */
  icon: string
  /** Accent colour used for the game's menu card. */
  accent: string
  /** Whether the menu shows the best score or the best streak for this game. */
  headline: 'score' | 'streak'
}

export const GAMES: GameMeta[] = [
  {
    id: 'satellite',
    title: 'City from Satellite',
    tagline: 'Name the city from a label-free satellite image.',
    emoji: '🛰️',
    icon: satelliteIcon,
    accent: '#3fa9ff',
    headline: 'score',
  },
  {
    id: 'locate',
    title: 'Pin the City',
    tagline: 'Drop a pin where the city is — closer means more points.',
    emoji: '📍',
    icon: locateIcon,
    accent: '#2bd98a',
    headline: 'score',
  },
  {
    id: 'travle',
    title: 'Country Trail',
    tagline: 'Connect two countries through a chain of their neighbours.',
    emoji: '🧭',
    icon: travleIcon,
    accent: '#c08cff',
    headline: 'score',
  },
]
