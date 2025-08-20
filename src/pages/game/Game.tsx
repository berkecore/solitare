import React, { useState, useEffect } from 'react'
import './game.css'

// Card types and interfaces
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

export interface Card {
  suit: Suit
  rank: Rank
  faceUp: boolean
  id: string
}

export interface GameState {
  stock: Card[]
  waste: Card[]
  foundations: Card[][]
  tableau: Card[][]
}

// Card component
interface CardProps {
  card: Card | null
  onClick?: () => void
  onDoubleClick?: () => void
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  style?: React.CSSProperties
  isEmpty?: boolean
}

const Card: React.FC<CardProps> = ({ 
  card, 
  onClick, 
  onDoubleClick,
  onDragStart, 
  onDragOver, 
  onDrop, 
  style,
  isEmpty = false 
}) => {
  if (!card && !isEmpty) return null

  const getCardImage = (card: Card) => {
    if (!card.faceUp) {
      return `/src/assets/card-icons/card-backgrounds/classic_blue.png`
    }
    return `/src/assets/card-icons/${card.suit}/${card.rank}.png`
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    onDragOver?.(e)
  }

  const handleDragStart = (e: React.DragEvent) => {
    if (card && card.faceUp) {
      e.dataTransfer.setData('text/plain', card.id)
      onDragStart?.(e)
    }
  }

  if (isEmpty) {
    return (
      <div 
        className="card empty-slot"
        onDragOver={handleDragOver}
        onDrop={onDrop}
        style={style}
      />
    )
  }

  return (
    <div 
      className="card"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      draggable={card!.faceUp}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={onDrop}
      style={style}
    >
      <img src={getCardImage(card!)} alt={`${card!.rank} of ${card!.suit}`} />
    </div>
  )
}

function Game() {
  const [gameState, setGameState] = useState<GameState>({
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], []]
  })
  const [selectedCard, setSelectedCard] = useState<{card: Card, source: string, index?: number} | null>(null)
  const [draggedCard, setDraggedCard] = useState<{card: Card, source: string, index?: number} | null>(null)

  // Initialize deck and shuffle
  const createDeck = (): Card[] => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
    const ranks: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
    const deck: Card[] = []

    suits.forEach(suit => {
      ranks.forEach(rank => {
        deck.push({
          suit,
          rank,
          faceUp: false,
          id: `${suit}-${rank}`
        })
      })
    })

    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[deck[i], deck[j]] = [deck[j], deck[i]]
    }

    return deck
  }

  // Deal initial cards
  const dealCards = () => {
    const deck = createDeck()
    const newTableau: Card[][] = [[], [], [], [], [], [], []]
    
    // Deal cards to tableau
    let deckIndex = 0
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck[deckIndex++]
        card.faceUp = row === col // Only the last card in each column is face up
        newTableau[col].push(card)
      }
    }

    // Remaining cards go to stock
    const stock = deck.slice(deckIndex)

    setGameState({
      stock,
      waste: [],
      foundations: [[], [], [], []],
      tableau: newTableau
    })
  }

  // Initialize game on component mount
  useEffect(() => {
    dealCards()
  }, [])

  // Handle stock click (draw cards)
  const handleStockClick = () => {
    setGameState(prev => {
      if (prev.stock.length === 0) {
        // Reset stock from waste
        const newStock = [...prev.waste].reverse().map(card => ({ ...card, faceUp: false }))
        return { ...prev, stock: newStock, waste: [] }
      } else {
        // Draw card from stock to waste
        const newStock = [...prev.stock]
        const drawnCard = newStock.pop()!
        drawnCard.faceUp = true
        return { 
          ...prev, 
          stock: newStock, 
          waste: [...prev.waste, drawnCard] 
        }
      }
    })
  }

  // Check if a card can be placed on foundation
  const canPlaceOnFoundation = (card: Card, foundationIndex: number): boolean => {
    const foundation = gameState.foundations[foundationIndex]
    if (foundation.length === 0) {
      return card.rank === 1 // Only Aces can start foundations
    }
    const topCard = foundation[foundation.length - 1]
    return card.suit === topCard.suit && card.rank === topCard.rank + 1
  }

  // Check if a card can be placed on tableau
  const canPlaceOnTableau = (card: Card, columnIndex: number): boolean => {
    const column = gameState.tableau[columnIndex]
    if (column.length === 0) {
      return card.rank === 13 // Only Kings can be placed on empty columns
    }
    const topCard = column[column.length - 1]
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds'
    const topIsRed = topCard.suit === 'hearts' || topCard.suit === 'diamonds'
    return isRed !== topIsRed && card.rank === topCard.rank - 1
  }

  // Get all moveable cards from a tableau column starting from a specific index
  const getMoveableSequence = (columnIndex: number, cardIndex: number): Card[] => {
    const column = gameState.tableau[columnIndex]
    const sequence: Card[] = []
    
    for (let i = cardIndex; i < column.length; i++) {
      const card = column[i]
      if (!card.faceUp) break
      
      if (sequence.length > 0) {
        const prevCard = sequence[sequence.length - 1]
        const isRed = card.suit === 'hearts' || card.suit === 'diamonds'
        const prevIsRed = prevCard.suit === 'hearts' || prevCard.suit === 'diamonds'
        
        // Check if cards are in alternating colors and descending rank
        if (isRed === prevIsRed || card.rank !== prevCard.rank - 1) {
          break
        }
      }
      
      sequence.push(card)
    }
    
    return sequence
  }

  // Handle card selection and movement
  const handleCardClick = (card: Card, source: string, index?: number) => {
    if (!card.faceUp) {
      // Flip card if it's the top card in tableau
      if (source.startsWith('tableau-')) {
        const colIndex = parseInt(source.split('-')[1])
        const column = gameState.tableau[colIndex]
        if (column[column.length - 1] === card) {
          setGameState(prev => {
            const newTableau = [...prev.tableau]
            newTableau[colIndex] = [...column]
            newTableau[colIndex][newTableau[colIndex].length - 1].faceUp = true
            return { ...prev, tableau: newTableau }
          })
        }
      }
      return
    }

    if (selectedCard) {
      // Try to place selected card or sequence
      if (source.startsWith('foundation-')) {
        const foundationIndex = parseInt(source.split('-')[1])
        if (canPlaceOnFoundation(selectedCard.card, foundationIndex)) {
          moveCard(selectedCard, `foundation-${foundationIndex}`)
        }
      } else if (source.startsWith('tableau-')) {
        const columnIndex = parseInt(source.split('-')[1])
        if (canPlaceOnTableau(selectedCard.card, columnIndex)) {
          // Get sequence if moving from tableau
          let sequence: Card[] | undefined
          if (selectedCard.source.startsWith('tableau-') && selectedCard.index !== undefined) {
            const sourceCol = parseInt(selectedCard.source.split('-')[1])
            sequence = getMoveableSequence(sourceCol, selectedCard.index)
          }
          moveCard(selectedCard, `tableau-${columnIndex}`, sequence)
        }
      }
      setSelectedCard(null)
    } else {
      // Select card
      setSelectedCard({ card, source, index })
    }
  }

  // Handle drag start
  const handleDragStart = (card: Card, source: string, index?: number) => {
    setDraggedCard({ card, source, index })
  }

  // Handle drop
  const handleDrop = (e: React.DragEvent, target: string) => {
    e.preventDefault()
    if (!draggedCard) return

    if (target.startsWith('foundation-')) {
      const foundationIndex = parseInt(target.split('-')[1])
      if (canPlaceOnFoundation(draggedCard.card, foundationIndex)) {
        moveCard(draggedCard, target)
      }
    } else if (target.startsWith('tableau-')) {
      const columnIndex = parseInt(target.split('-')[1])
      if (canPlaceOnTableau(draggedCard.card, columnIndex)) {
        // Get sequence if moving from tableau
        let sequence: Card[] | undefined
        if (draggedCard.source.startsWith('tableau-') && draggedCard.index !== undefined) {
          const sourceCol = parseInt(draggedCard.source.split('-')[1])
          sequence = getMoveableSequence(sourceCol, draggedCard.index)
        }
        moveCard(draggedCard, target, sequence)
      }
    }

    setDraggedCard(null)
  }

  // Move card or sequence from source to destination
  const moveCard = (from: {card: Card, source: string, index?: number}, to: string, sequence?: Card[]) => {
    setGameState(prev => {
      const newState = { ...prev }
      const cardsToMove = sequence || [from.card]
      
      // Remove cards from source
      if (from.source === 'waste') {
        newState.waste = newState.waste.slice(0, -1)
      } else if (from.source.startsWith('tableau-')) {
        const colIndex = parseInt(from.source.split('-')[1])
        newState.tableau = [...newState.tableau]
        newState.tableau[colIndex] = newState.tableau[colIndex].slice(0, -(cardsToMove.length))
        
        // Flip the top card if it exists and is face down
        const column = newState.tableau[colIndex]
        if (column.length > 0 && !column[column.length - 1].faceUp) {
          column[column.length - 1].faceUp = true
        }
      } else if (from.source.startsWith('foundation-')) {
        const foundIndex = parseInt(from.source.split('-')[1])
        newState.foundations = [...newState.foundations]
        newState.foundations[foundIndex] = newState.foundations[foundIndex].slice(0, -1)
      }

      // Add cards to destination
      if (to.startsWith('foundation-')) {
        const foundIndex = parseInt(to.split('-')[1])
        newState.foundations = [...newState.foundations]
        newState.foundations[foundIndex] = [...newState.foundations[foundIndex], ...cardsToMove]
      } else if (to.startsWith('tableau-')) {
        const colIndex = parseInt(to.split('-')[1])
        newState.tableau = [...newState.tableau]
        newState.tableau[colIndex] = [...newState.tableau[colIndex], ...cardsToMove]
      }

      return newState
    })
  }

  // Auto-move to foundation if possible
  const autoMoveToFoundation = (card: Card, source: string, index?: number) => {
    for (let i = 0; i < 4; i++) {
      if (canPlaceOnFoundation(card, i)) {
        moveCard({ card, source, index }, `foundation-${i}`)
        return true
      }
    }
    return false
  }

  // Handle double-click for auto-move
  const handleDoubleClick = (card: Card, source: string, index?: number) => {
    if (card.faceUp) {
      autoMoveToFoundation(card, source, index)
    }
  }

  // Check win condition
  const isGameWon = () => {
    return gameState.foundations.every(foundation => foundation.length === 13)
  }

  return (
    <div className='game'>
      <div className='game-board'>
        {/* Top row: Stock, Waste, and Foundations */}
        <div className='top-row'>
          <div className='stock-waste'>
            <div className='stock' onClick={handleStockClick}>
              {gameState.stock.length > 0 ? (
                <Card card={gameState.stock[gameState.stock.length - 1]} />
              ) : (
                <Card card={null} isEmpty />
              )}
            </div>
            <div className='waste'>
              {gameState.waste.length > 0 ? (
                <Card 
                  card={gameState.waste[gameState.waste.length - 1]} 
                  onClick={() => handleCardClick(
                    gameState.waste[gameState.waste.length - 1], 
                    'waste'
                  )}
                  onDoubleClick={() => handleDoubleClick(
                    gameState.waste[gameState.waste.length - 1], 
                    'waste'
                  )}
                  onDragStart={() => handleDragStart(
                    gameState.waste[gameState.waste.length - 1], 
                    'waste'
                  )}
                  style={{
                    ...(selectedCard?.card.id === gameState.waste[gameState.waste.length - 1]?.id && { 
                      boxShadow: '0 0 10px 3px #FFD700',
                      transform: 'translateY(-5px)'
                    })
                  }}
                />
              ) : (
                <Card card={null} isEmpty />
              )}
            </div>
          </div>
          
          <div className='foundations'>
            {gameState.foundations.map((foundation, index) => (
              <div key={index} className='foundation' onClick={() => {
                if (selectedCard) {
                  if (canPlaceOnFoundation(selectedCard.card, index)) {
                    moveCard(selectedCard, `foundation-${index}`)
                    setSelectedCard(null)
                  }
                }
              }}>
                {foundation.length > 0 ? (
                  <Card 
                    card={foundation[foundation.length - 1]} 
                    onClick={() => handleCardClick(
                      foundation[foundation.length - 1], 
                      `foundation-${index}`
                    )}
                    onDragStart={() => handleDragStart(
                      foundation[foundation.length - 1], 
                      `foundation-${index}`
                    )}
                    onDrop={(e) => handleDrop(e, `foundation-${index}`)}
                    style={{
                      ...(selectedCard?.card.id === foundation[foundation.length - 1]?.id && { 
                        boxShadow: '0 0 10px 3px #FFD700',
                        transform: 'translateY(-5px)'
                      })
                    }}
                  />
                ) : (
                  <Card 
                    card={null} 
                    isEmpty 
                    onDrop={(e) => handleDrop(e, `foundation-${index}`)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tableau */}
        <div className='tableau'>
          {gameState.tableau.map((column, colIndex) => (
            <div key={colIndex} className='tableau-column' onClick={() => {
              if (selectedCard && column.length === 0) {
                if (canPlaceOnTableau(selectedCard.card, colIndex)) {
                  // Get sequence if moving from tableau
                  let sequence: Card[] | undefined
                  if (selectedCard.source.startsWith('tableau-') && selectedCard.index !== undefined) {
                    const sourceCol = parseInt(selectedCard.source.split('-')[1])
                    sequence = getMoveableSequence(sourceCol, selectedCard.index)
                  }
                  moveCard(selectedCard, `tableau-${colIndex}`, sequence)
                  setSelectedCard(null)
                }
              }
            }}>
              {column.length === 0 ? (
                <Card 
                  card={null} 
                  isEmpty 
                  onDrop={(e) => handleDrop(e, `tableau-${colIndex}`)}
                />
              ) : (
                column.map((card, cardIndex) => {
                  const isSelected = selectedCard?.card.id === card.id
                  return (
                    <Card
                      key={card.id}
                      card={card}
                      onClick={() => handleCardClick(card, `tableau-${colIndex}`, cardIndex)}
                      onDoubleClick={() => handleDoubleClick(card, `tableau-${colIndex}`, cardIndex)}
                      onDragStart={() => handleDragStart(card, `tableau-${colIndex}`, cardIndex)}
                      onDrop={(e) => handleDrop(e, `tableau-${colIndex}`)}
                      style={{
                        position: 'absolute',
                        top: `${cardIndex * 20}px`,
                        zIndex: cardIndex,
                        ...(isSelected && { 
                          boxShadow: '0 0 10px 3px #FFD700',
                          transform: 'translateY(-5px)'
                        })
                      }}
                    />
                  )
                })
              )}
            </div>
          ))}
        </div>

        {isGameWon() && (
          <div className='win-message'>
            <h2>Congratulations! You won!</h2>
            <button onClick={dealCards}>New Game</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Game