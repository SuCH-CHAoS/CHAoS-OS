import { lazy } from 'react'
import ArcadeLoader from '../modes/arcade/ArcadeLoader'

const loadArcadeApp = () => import('../modes/arcade/ArcadeApp')

export const modes = [
  {
    id: 'arcade',
    name: 'Arcade',
    component: lazy(loadArcadeApp),
    preload: loadArcadeApp,
    loader: ArcadeLoader,
    loadDuration: 3200
  }
]
