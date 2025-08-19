import { useState } from 'react'
import Home from './pages/home/Home.tsx'
import Game from './pages/game/Game.tsx'

function App() {
  const [gameStarted, setGameStarted] = useState(false)
  
  return gameStarted ? <Game /> : <Home setGameStarted={setGameStarted} />
}

export default App
