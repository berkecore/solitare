import './home.css'

interface HomeProps {
    setGameStarted: (value: boolean) => void;
}

function Home({ setGameStarted }: HomeProps) {

    const startGame = () => {
        
        setGameStarted(true)
    }

    return (
        <div className='home'>
            <button className='start-game' onClick={startGame}>Start Game</button>
        </div>
    )
}

export default Home;