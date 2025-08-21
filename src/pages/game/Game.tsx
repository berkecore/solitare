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
  onMouseDown?: (e: React.MouseEvent) => void
  onPointerDown?: (e: React.PointerEvent) => void
  style?: React.CSSProperties
  className?: string
  isEmpty?: boolean
  cardBackground?: string
}

const Card: React.FC<CardProps> = ({ 
  card, 
  onClick, 
  onDoubleClick,
  onDragStart, 
  onDragOver, 
  onDrop,
  onMouseDown,
  onPointerDown,
  style,
  className,
  isEmpty = false,
  cardBackground = 'classic_blue'
}) => {
  if (!card && !isEmpty) return null

  const getCardImage = (card: Card) => {
    if (!card.faceUp) {
      return `/src/assets/card-icons/card-backgrounds/${cardBackground}.png`
    }
    return `/src/assets/card-icons/${card.suit}/${card.rank}.png`
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    onDragOver?.(e)
  }

  const handleDragStart = (e: React.DragEvent) => {
    if (card && card.faceUp) {
      // Create transparent drag image to hide browser default
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.globalAlpha = 0
        ctx.fillRect(0, 0, 1, 1)
      }
      e.dataTransfer.setDragImage(canvas, 0, 0)
      e.dataTransfer.setData('text/plain', card.id)
      onDragStart?.(e)
    }
  }

  if (isEmpty) {
    return (
      <div 
        className={`card empty-slot ${className || ''}`}
        onDragOver={handleDragOver}
        onDrop={onDrop}
        style={style}
      />
    )
  }

  return (
    <div 
      className={`card ${className || ''}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      draggable={card!.faceUp}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={onDrop}
      onMouseDown={onMouseDown}
      onPointerDown={onPointerDown}
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
  const [gameHistory, setGameHistory] = useState<GameState[]>([])
  const [cardBackground, setCardBackground] = useState<string>('classic_blue')
  const [showSettings, setShowSettings] = useState<boolean>(false)
  const [showRestartConfirm, setShowRestartConfirm] = useState<boolean>(false)
  
  // Custom drag state
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [dragPosition, setDragPosition] = useState<{x: number, y: number}>({x: 0, y: 0})
  const [dragOffset, setDragOffset] = useState<{x: number, y: number}>({x: 0, y: 0})
  const [dragStartPosition, setDragStartPosition] = useState<{x: number, y: number}>({x: 0, y: 0})
  const [isReturning, setIsReturning] = useState<boolean>(false)
  const [customDragCard, setCustomDragCard] = useState<{card: Card, source: string, index?: number} | null>(null)

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

  // Save game state to history
  const saveGameState = (state: GameState) => {
    setGameHistory(prev => [...prev, JSON.parse(JSON.stringify(state))].slice(-10)) // Keep last 10 moves
  }

  // Initialize game on component mount
  useEffect(() => {
    dealCards()
  }, [])

  // Global event listeners for custom drag  
  useEffect(() => {
    if (!isDragging || !customDragCard) return

    const handleGlobalPointerMove = (e: PointerEvent) => {
      setDragPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      })
    }

    const handleGlobalPointerUp = (e: PointerEvent) => {
      setIsDragging(false)
      
      // Check for valid drop target
      const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY)
      let dropTarget: string | null = null
      
      // Find the drop target from elements at pointer position
      for (const element of elementsAtPoint) {
        if (element.classList.contains('foundation') || element.closest('.foundation')) {
          const foundationElement = element.classList.contains('foundation') ? element : element.closest('.foundation')
          const foundationIndex = Array.from(foundationElement!.parentElement!.children).indexOf(foundationElement!)
          dropTarget = `foundation-${foundationIndex}`
          break
        } else if (element.classList.contains('tableau-column') || element.closest('.tableau-column')) {
          const columnElement = element.classList.contains('tableau-column') ? element : element.closest('.tableau-column')
          const columnIndex = Array.from(columnElement!.parentElement!.children).indexOf(columnElement!)
          dropTarget = `tableau-${columnIndex}`
          break
        }
      }
      
      // Set timeout to check for valid move after functions are defined
      setTimeout(() => {
        // Check if it's a valid move
        let isValidMove = false
        if (dropTarget) {
          if (dropTarget.startsWith('foundation-')) {
            const foundationIndex = parseInt(dropTarget.split('-')[1])
            const foundation = gameState.foundations[foundationIndex]
            if (foundation.length === 0) {
              isValidMove = customDragCard.card.rank === 1 // Only Aces can start foundations
            } else {
              const topCard = foundation[foundation.length - 1]
              isValidMove = customDragCard.card.suit === topCard.suit && customDragCard.card.rank === topCard.rank + 1
            }
          } else if (dropTarget.startsWith('tableau-')) {
            const columnIndex = parseInt(dropTarget.split('-')[1])
            const column = gameState.tableau[columnIndex]
            if (column.length === 0) {
              isValidMove = customDragCard.card.rank === 13 // Only Kings can be placed on empty columns
            } else {
              const topCard = column[column.length - 1]
              const isRed = customDragCard.card.suit === 'hearts' || customDragCard.card.suit === 'diamonds'
              const topIsRed = topCard.suit === 'hearts' || topCard.suit === 'diamonds'
              isValidMove = isRed !== topIsRed && customDragCard.card.rank === topCard.rank - 1
            }
          }
        }
        
        if (isValidMove && dropTarget) {
          // Execute the move by triggering a click event or updating state directly
          if (dropTarget.startsWith('foundation-')) {
            const foundationIndex = parseInt(dropTarget.split('-')[1])
            // Trigger move by simulating the existing move logic
            saveGameState(gameState)
            setGameState(prev => {
              const newState = { ...prev }
              
              // Remove card from source
              if (customDragCard.source === 'waste') {
                newState.waste = newState.waste.slice(0, -1)
              } else if (customDragCard.source.startsWith('tableau-')) {
                const colIndex = parseInt(customDragCard.source.split('-')[1])
                newState.tableau = [...newState.tableau]
                newState.tableau[colIndex] = newState.tableau[colIndex].slice(0, -1)
                
                // Flip the top card if it exists and is face down
                const column = newState.tableau[colIndex]
                if (column.length > 0 && !column[column.length - 1].faceUp) {
                  column[column.length - 1].faceUp = true
                }
              } else if (customDragCard.source.startsWith('foundation-')) {
                const foundIndex = parseInt(customDragCard.source.split('-')[1])
                newState.foundations = [...newState.foundations]
                newState.foundations[foundIndex] = newState.foundations[foundIndex].slice(0, -1)
              }

              // Add card to foundation
              newState.foundations = [...newState.foundations]
              newState.foundations[foundationIndex] = [...newState.foundations[foundationIndex], customDragCard.card]
              
              return newState
            })
          } else if (dropTarget.startsWith('tableau-')) {
            const columnIndex = parseInt(dropTarget.split('-')[1])
            // Get sequence if moving from tableau
            let cardsToMove = [customDragCard.card]
            if (customDragCard.source.startsWith('tableau-') && customDragCard.index !== undefined) {
              const sourceCol = parseInt(customDragCard.source.split('-')[1])
              const column = gameState.tableau[sourceCol]
              const sequence: Card[] = []
              
              for (let i = customDragCard.index; i < column.length; i++) {
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
              cardsToMove = sequence
            }
            
            saveGameState(gameState)
            setGameState(prev => {
              const newState = { ...prev }
              
              // Remove cards from source
              if (customDragCard.source === 'waste') {
                newState.waste = newState.waste.slice(0, -1)
              } else if (customDragCard.source.startsWith('tableau-')) {
                const colIndex = parseInt(customDragCard.source.split('-')[1])
                newState.tableau = [...newState.tableau]
                newState.tableau[colIndex] = newState.tableau[colIndex].slice(0, -(cardsToMove.length))
                
                // Flip the top card if it exists and is face down
                const column = newState.tableau[colIndex]
                if (column.length > 0 && !column[column.length - 1].faceUp) {
                  column[column.length - 1].faceUp = true
                }
              } else if (customDragCard.source.startsWith('foundation-')) {
                const foundIndex = parseInt(customDragCard.source.split('-')[1])
                newState.foundations = [...newState.foundations]
                newState.foundations[foundIndex] = newState.foundations[foundIndex].slice(0, -1)
              }

              // Add cards to tableau
              newState.tableau = [...newState.tableau]
              newState.tableau[columnIndex] = [...newState.tableau[columnIndex], ...cardsToMove]
              
              return newState
            })
          }
          setCustomDragCard(null)
        } else {
          // Invalid move - animate return to original position
          setIsReturning(true)
          // Return animation will be handled by CSS transition
          setTimeout(() => {
            setIsReturning(false)
            setCustomDragCard(null)
          }, 300) // Match CSS transition duration
        }
      }, 0)
    }

    document.addEventListener('pointermove', handleGlobalPointerMove)
    document.addEventListener('pointerup', handleGlobalPointerUp)

    return () => {
      document.removeEventListener('pointermove', handleGlobalPointerMove)
      document.removeEventListener('pointerup', handleGlobalPointerUp)
    }
  }, [isDragging, customDragCard, dragOffset, gameState])

  // Handle stock click (draw cards)
  const handleStockClick = () => {
    saveGameState(gameState)
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

  // Undo last move
  const handleUndo = () => {
    if (gameHistory.length > 0) {
      const previousState = gameHistory[gameHistory.length - 1]
      setGameState(previousState)
      setGameHistory(prev => prev.slice(0, -1))
      setSelectedCard(null)
    }
  }

  // Get hint for next move
  const getHint = (): string => {
    // Check for cards that can move to foundations
    const wasteCard = gameState.waste[gameState.waste.length - 1]
    if (wasteCard && wasteCard.faceUp) {
      for (let i = 0; i < 4; i++) {
        if (canPlaceOnFoundation(wasteCard, i)) {
          return "Move the waste pile card to a foundation!"
        }
      }
    }

    // Check tableau cards that can move to foundations
    for (let col = 0; col < 7; col++) {
      const column = gameState.tableau[col]
      if (column.length > 0) {
        const topCard = column[column.length - 1]
        if (topCard.faceUp) {
          for (let i = 0; i < 4; i++) {
            if (canPlaceOnFoundation(topCard, i)) {
              return `Move a card from column ${col + 1} to a foundation!`
            }
          }
        }
      }
    }

    // Check for face-down cards that can be flipped
    for (let col = 0; col < 7; col++) {
      const column = gameState.tableau[col]
      if (column.length > 0) {
        const topCard = column[column.length - 1]
        if (!topCard.faceUp) {
          return `Click the face-down card in column ${col + 1} to flip it!`
        }
      }
    }

    // Check for moves between tableau columns
    for (let sourceCol = 0; sourceCol < 7; sourceCol++) {
      const sourceColumn = gameState.tableau[sourceCol]
      if (sourceColumn.length > 0) {
        const sourceCard = sourceColumn[sourceColumn.length - 1]
        if (sourceCard.faceUp) {
          for (let targetCol = 0; targetCol < 7; targetCol++) {
            if (sourceCol !== targetCol && canPlaceOnTableau(sourceCard, targetCol)) {
              return `Move a card from column ${sourceCol + 1} to column ${targetCol + 1}!`
            }
          }
        }
      }
    }

    if (gameState.stock.length > 0) {
      return "Draw cards from the stock pile!"
    }

    return "No obvious moves available. Try looking for sequences to move!"
  }

  // Handle hint button
  const handleHint = () => {
    const hint = getHint()
    alert(hint)
  }

  // Handle restart
  const handleRestart = () => {
    setShowRestartConfirm(true)
  }

  // Confirm restart
  const confirmRestart = () => {
    dealCards()
    setGameHistory([])
    setSelectedCard(null)
    setShowRestartConfirm(false)
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

  // Custom drag handlers
  const handleCustomDragStart = (e: React.PointerEvent, card: Card, source: string, index?: number) => {
    if (!card.faceUp) return
    
    e.preventDefault()
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top
    
    setCustomDragCard({ card, source, index })
    setDragOffset({ x: offsetX, y: offsetY })
    setDragStartPosition({ x: e.clientX, y: e.clientY })
    setDragPosition({ x: e.clientX - offsetX, y: e.clientY - offsetY })
    setIsDragging(true)
    
    // Capture pointer for smooth dragging
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
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
    saveGameState(gameState)
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
          <div className='top-row-content'>
            <div className='stock-waste'>
              <div className='stock' onClick={handleStockClick}>
                {gameState.stock.length > 0 ? (
                  <Card card={gameState.stock[gameState.stock.length - 1]} cardBackground={cardBackground} />
                ) : (
                  <Card card={null} isEmpty cardBackground={cardBackground} />
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
                    onPointerDown={(e) => handleCustomDragStart(
                      e,
                      gameState.waste[gameState.waste.length - 1], 
                      'waste'
                    )}
                    cardBackground={cardBackground}
                    style={{
                      ...(selectedCard?.card.id === gameState.waste[gameState.waste.length - 1]?.id && { 
                        boxShadow: '0 0 10px 3px #FFD700',
                        transform: 'translateY(-5px)'
                      })
                    }}
                    className={`card ${customDragCard?.card.id === gameState.waste[gameState.waste.length - 1]?.id ? 'dragging' : ''}`}
                  />
                ) : (
                  <Card card={null} isEmpty cardBackground={cardBackground} />
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
                      onPointerDown={(e) => handleCustomDragStart(
                        e,
                        foundation[foundation.length - 1], 
                        `foundation-${index}`
                      )}
                      onDrop={(e) => handleDrop(e, `foundation-${index}`)}
                      cardBackground={cardBackground}
                      className={customDragCard?.card.id === foundation[foundation.length - 1]?.id ? 'dragging' : ''}
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
                      cardBackground={cardBackground}
                      onDrop={(e) => handleDrop(e, `foundation-${index}`)}
                    />
                  )}
                </div>
              ))}
            </div>
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
                  cardBackground={cardBackground}
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
                      onPointerDown={(e) => handleCustomDragStart(e, card, `tableau-${colIndex}`, cardIndex)}
                      onDrop={(e) => handleDrop(e, `tableau-${colIndex}`)}
                      cardBackground={cardBackground}
                      className={customDragCard?.card.id === card.id ? 'dragging' : ''}
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

      

      {/* Settings Modal */}
      {showSettings && (
        <div className='modal-overlay' onClick={() => setShowSettings(false)}>
          <div className='modal-content' onClick={(e) => e.stopPropagation()}>
            <h3>Settings</h3>
            <div className='setting-section'>
              <h4>Card Background</h4>
              <div className='background-options'>
                {['classic_blue', 'classic_brown', 'classic_green', 'classic_red'].map(bg => (
                  <div 
                    key={bg}
                    className={`background-option ${cardBackground === bg ? 'selected' : ''}`}
                    onClick={() => setCardBackground(bg)}
                  >
                    <img 
                      src={`/src/assets/card-icons/card-backgrounds/${bg}.png`} 
                      alt={bg}
                    />
                    <span>{bg.replace('classic_', '').charAt(0).toUpperCase() + bg.replace('classic_', '').slice(1)}</span>
                  </div>
                ))}
              </div>
            </div>
            <button className='modal-close' onClick={() => setShowSettings(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Restart Confirmation */}
      {showRestartConfirm && (
        <div className='modal-overlay' onClick={() => setShowRestartConfirm(false)}>
          <div className='modal-content' onClick={(e) => e.stopPropagation()}>
            <h3>Restart Game</h3>
            <p>Are you sure you want to restart? This will start a new game and you'll lose your current progress.</p>
            <div className='modal-buttons'>
              <button className='modal-btn cancel' onClick={() => setShowRestartConfirm(false)}>
                Cancel
              </button>
              <button className='modal-btn confirm' onClick={confirmRestart}>
                Restart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Controls */}
      <div className='game-controls'>
        <button 
          className='control-btn' 
          onClick={handleUndo}
          disabled={gameHistory.length === 0}
        >
          Undo
        </button>
        <button className='control-btn' onClick={handleHint}>
          Hint
        </button>
        <button className='control-btn' onClick={handleRestart}>
          Restart
        </button>
        <button className='control-btn' onClick={() => setShowSettings(true)}>
          Settings
        </button>
      </div>

      {/* Custom Drag Preview */}
      {(isDragging || isReturning) && customDragCard && (
        <div 
          className={`drag-preview ${isReturning ? 'returning' : ''}`}
          style={{
            position: 'fixed',
            left: isReturning ? `${dragStartPosition.x - dragOffset.x}px` : `${dragPosition.x}px`,
            top: isReturning ? `${dragStartPosition.y - dragOffset.y}px` : `${dragPosition.y}px`,
            width: '80px',
            height: '112px',
            pointerEvents: 'none',
            zIndex: 9999,
            transition: isReturning ? 'all 0.3s ease-out' : 'none',
            transform: isReturning ? 'scale(1)' : 'scale(1.05) rotate(5deg)',
            opacity: isReturning ? 0.8 : 0.9,
          }}
        >
          <Card 
            card={customDragCard.card} 
            cardBackground={cardBackground}
            style={{
              border: '2px solid #FFD700',
              boxShadow: '0 8px 25px rgba(0,0,0,0.4)',
            }}
          />
        </div>
      )}
    </div>
  )
}

export default Game