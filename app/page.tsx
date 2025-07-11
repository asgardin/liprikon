"use client"

import type React from "react"

import { useEffect, useRef, useState, useCallback } from "react"

interface GameObject {
  x: number
  y: number
  width: number
  height: number
}

interface Coin extends GameObject {
  collected: boolean
}

interface BadCoin extends GameObject {
  collected: boolean
}

interface Obstacle extends GameObject {
  type: "rock" | "mountain" | "goblin"
}

export default function LeprechaunRunner() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<number>()
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [highScore, setHighScore] = useState(0)
  const [showIntro, setShowIntro] = useState(true)
  const [showPrizeMessage, setShowPrizeMessage] = useState(false)

  // Game state
  const gameState = useRef({
    leprechaun: {
      x: 80,
      y: 400,
      width: 35,
      height: 50,
      velocityY: 0,
      isJumping: false,
      groundY: 400,
      introX: -60,
      animationFrame: 0,
    },
    coins: [] as Coin[],
    badCoins: [] as BadCoin[],
    obstacles: [] as Obstacle[],
    obstacleSpawnTimer: 0,
    obstacleSpawnInterval: 180,
    gameSpeed: 4,
    coinSpawnTimer: 0,
    coinSpawnInterval: 120,
    badCoinSpawnTimer: 0,
    badCoinSpawnInterval: 300,
    gravity: 1.0,
    jumpPower: -18,
    backgroundOffset: 0,
    introAnimationTime: 0,
    gameTime: 0, // Время игры в кадрах
    grassParticles: [] as Array<{ x: number; y: number; velocityX: number; velocityY: number; life: number }>,
  })

  const resetGame = useCallback(() => {
    const state = gameState.current
    state.leprechaun.y = state.leprechaun.groundY
    state.leprechaun.velocityY = 0
    state.leprechaun.isJumping = false
    state.leprechaun.animationFrame = 0
    state.coins = []
    state.badCoins = []
    state.obstacles = []
    state.obstacleSpawnTimer = 0
    state.gameSpeed = 4
    state.coinSpawnTimer = 0
    state.badCoinSpawnTimer = 0
    state.backgroundOffset = 0
    state.gameTime = 0
    setScore(0)
    setGameOver(false)
    setShowPrizeMessage(false)
  }, [])

  const startGame = useCallback(() => {
    resetGame()
    setGameStarted(true)
    setShowIntro(false)
  }, [resetGame])

  const jump = useCallback(() => {
    if (showIntro) {
      startGame()
      return
    }

    if (!gameStarted || gameOver) {
      if (!gameStarted) {
        startGame()
      } else {
        startGame()
      }
      return
    }

    const leprechaun = gameState.current.leprechaun
    if (!leprechaun.isJumping) {
      leprechaun.velocityY = gameState.current.jumpPower
      leprechaun.isJumping = true
    }
  }, [gameStarted, gameOver, startGame, showIntro])

  const checkCollision = (rect1: GameObject, rect2: GameObject): boolean => {
    const margin = 3
    return (
      rect1.x + margin < rect2.x + rect2.width - margin &&
      rect1.x + rect1.width - margin > rect2.x + margin &&
      rect1.y + margin < rect2.y + rect2.height - margin &&
      rect1.y + rect1.height - margin > rect2.y + margin
    )
  }

  // Проверка пересечения монеты с препятствиями
  const checkCoinObstacleCollision = (coin: GameObject, obstacles: Obstacle[]): boolean => {
    for (const obstacle of obstacles) {
      if (checkCollision(coin, obstacle)) {
        return true
      }
    }
    return false
  }

  const updateGame = useCallback(() => {
    const state = gameState.current

    // Update intro animation
    if (showIntro) {
      state.introAnimationTime += 1
      if (state.introAnimationTime < 120) {
        state.leprechaun.introX += 2
      }
      return
    }

    if (!gameStarted || gameOver) return

    const { leprechaun, coins, badCoins } = state

    // Update game time
    state.gameTime += 1

    // Update background
    state.backgroundOffset += state.gameSpeed * 0.5

    // Update leprechaun animation
    state.leprechaun.animationFrame += 0.3

    // Update leprechaun physics
    if (leprechaun.isJumping) {
      leprechaun.velocityY += state.gravity
      leprechaun.y += leprechaun.velocityY

      if (leprechaun.y >= leprechaun.groundY) {
        leprechaun.y = leprechaun.groundY
        leprechaun.velocityY = 0
        leprechaun.isJumping = false
      }
    }

    // Spawn coins (с проверкой на пересечение с препятствиями)
    state.coinSpawnTimer++
    if (state.coinSpawnTimer >= state.coinSpawnInterval) {
      const coinY = Math.random() > 0.5 ? leprechaun.groundY : leprechaun.groundY - 100
      const newCoin = {
        x: window.innerWidth,
        y: coinY,
        width: 35,
        height: 35,
        collected: false,
      }

      // Проверяем, не пересекается ли монета с препятствиями
      if (!checkCoinObstacleCollision(newCoin, state.obstacles)) {
        coins.push(newCoin)
      }

      state.coinSpawnTimer = 0
      state.coinSpawnInterval = 80 + Math.random() * 60
    }

    // Spawn bad coins (с проверкой на пересечение)
    state.badCoinSpawnTimer++
    if (state.badCoinSpawnTimer >= state.badCoinSpawnInterval) {
      const coinY = Math.random() > 0.5 ? leprechaun.groundY : leprechaun.groundY - 100
      const newBadCoin = {
        x: window.innerWidth,
        y: coinY,
        width: 35,
        height: 35,
        collected: false,
      }

      // Проверяем, не пересекается ли красная монета с препятствиями
      if (!checkCoinObstacleCollision(newBadCoin, state.obstacles)) {
        badCoins.push(newBadCoin)
      }

      state.badCoinSpawnTimer = 0
      state.badCoinSpawnInterval = 200 + Math.random() * 200
    }

    // Spawn obstacles
    state.obstacleSpawnTimer++
    if (state.obstacleSpawnTimer >= state.obstacleSpawnInterval) {
      let obstacleType: "rock" | "mountain" | "goblin"
      let obstacleHeight: number
      let obstacleWidth: number

      // После 30 секунд (1800 кадров при 60 FPS) добавляем гоблинов
      if (state.gameTime > 1800) {
        const rand = Math.random()
        if (rand > 0.7) {
          obstacleType = "goblin"
          obstacleHeight = 120
          obstacleWidth = 80
        } else if (rand > 0.4) {
          obstacleType = "mountain"
          obstacleHeight = 80
          obstacleWidth = 60
        } else {
          obstacleType = "rock"
          obstacleHeight = 45
          obstacleWidth = 40
        }
      } else {
        // До 30 секунд только камни и горы
        if (Math.random() > 0.6) {
          obstacleType = "mountain"
          obstacleHeight = 80
          obstacleWidth = 60
        } else {
          obstacleType = "rock"
          obstacleHeight = 45
          obstacleWidth = 40
        }
      }

      state.obstacles.push({
        x: window.innerWidth,
        y: leprechaun.groundY + leprechaun.height - obstacleHeight,
        width: obstacleWidth,
        height: obstacleHeight,
        type: obstacleType,
      })
      state.obstacleSpawnTimer = 0
      state.obstacleSpawnInterval = 120 + Math.random() * 80
    }

    // Update coins
    for (let i = coins.length - 1; i >= 0; i--) {
      const coin = coins[i]
      coin.x -= state.gameSpeed

      if (!coin.collected && checkCollision(leprechaun, coin)) {
        coin.collected = true
        setScore((prev) => {
          const newScore = prev + 1
          if (newScore === 50) {
            setShowPrizeMessage(true)
          }
          return newScore
        })
      }

      if (coin.x + coin.width < 0) {
        coins.splice(i, 1)
      }
    }

    // Update bad coins
    for (let i = badCoins.length - 1; i >= 0; i--) {
      const badCoin = badCoins[i]
      badCoin.x -= state.gameSpeed

      if (!badCoin.collected && checkCollision(leprechaun, badCoin)) {
        badCoin.collected = true
        setScore(0)
        setShowPrizeMessage(false)
      }

      if (badCoin.x + badCoin.width < 0) {
        badCoins.splice(i, 1)
      }
    }

    // Update obstacles
    for (let i = state.obstacles.length - 1; i >= 0; i--) {
      const obstacle = state.obstacles[i]
      obstacle.x -= state.gameSpeed

      let collision = false

      if (obstacle.type === "mountain") {
        const mountainBase = obstacle.y + obstacle.height * 0.4
        const adjustedObstacle = {
          x: obstacle.x + 4,
          y: mountainBase,
          width: obstacle.width - 8,
          height: obstacle.height - (mountainBase - obstacle.y),
        }
        collision = checkCollision(leprechaun, adjustedObstacle)
      } else if (obstacle.type === "goblin") {
        // Гоблин имеет более точную коллизию
        const adjustedObstacle = {
          x: obstacle.x + 5,
          y: obstacle.y + 5,
          width: obstacle.width - 10,
          height: obstacle.height - 10,
        }
        collision = checkCollision(leprechaun, adjustedObstacle)
      } else {
        // Rock
        const adjustedObstacle = {
          x: obstacle.x + 2,
          y: obstacle.y + 2,
          width: obstacle.width - 4,
          height: obstacle.height - 4,
        }
        collision = checkCollision(leprechaun, adjustedObstacle)
      }

      if (collision) {
        setGameOver(true)
        return
      }

      if (obstacle.x + obstacle.width < 0) {
        state.obstacles.splice(i, 1)
      }
    }

    // Increase game speed gradually
    state.gameSpeed += 0.002

    // Update grass particles
    for (let i = state.grassParticles.length - 1; i >= 0; i--) {
      const particle = state.grassParticles[i]
      particle.x += particle.velocityX
      particle.y += particle.velocityY
      particle.velocityY += 0.3
      particle.life -= 1

      if (particle.life <= 0) {
        state.grassParticles.splice(i, 1)
      }
    }

    // Create grass particles when running
    if (gameStarted && !leprechaun.isJumping) {
      if (Math.random() < 0.3) {
        state.grassParticles.push({
          x: leprechaun.x + leprechaun.width / 2 + Math.random() * 20 - 10,
          y: leprechaun.groundY + leprechaun.height,
          velocityX: -2 - Math.random() * 3,
          velocityY: -2 - Math.random() * 2,
          life: 20 + Math.random() * 10,
        })
      }
    }
  }, [gameStarted, gameOver, showIntro])

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { leprechaun, coins, badCoins, obstacles } = gameState.current

    // Clear canvas with night sky
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, "#1a1a2e")
    gradient.addColorStop(0.7, "#16213e")
    gradient.addColorStop(1, "#0f3460")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw stars
    ctx.fillStyle = "white"
    for (let i = 0; i < 120; i++) {
      const x = (i * 73.5 + Math.sin(i * 0.7) * 50 + Date.now() * 0.0008) % canvas.width
      const y = (i * 41.3 + Math.cos(i * 1.2) * 30) % (canvas.height * 0.6)

      const baseSize = 0.8 + Math.random() * 1.5
      const twinkle = Math.sin(Date.now() * 0.004 + i * 0.8) * 0.4 + 0.6
      const size = baseSize * twinkle

      const opacity = 0.4 + Math.sin(Date.now() * 0.003 + i * 1.5) * 0.4 + Math.random() * 0.2
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`

      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()

      if (i % 15 === 0) {
        const colorStars = ["rgba(255, 200, 200, 0.8)", "rgba(200, 200, 255, 0.8)", "rgba(255, 255, 200, 0.8)"]
        ctx.fillStyle = colorStars[i % 3]
        ctx.beginPath()
        ctx.arc(x + Math.sin(i) * 10, y + Math.cos(i) * 8, size * 1.2, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Draw moon
    ctx.fillStyle = "#f5f5dc"
    ctx.beginPath()
    ctx.arc(canvas.width - 80, 80, 40, 0, Math.PI * 2)
    ctx.fill()

    // Moon craters
    ctx.fillStyle = "#e6e6d4"
    ctx.beginPath()
    ctx.arc(canvas.width - 90, 75, 6, 0, Math.PI * 2)
    ctx.arc(canvas.width - 70, 85, 4, 0, Math.PI * 2)
    ctx.arc(canvas.width - 85, 95, 3, 0, Math.PI * 2)
    ctx.fill()

    // Draw ground with night grass
    ctx.fillStyle = "#2d5016"
    ctx.fillRect(0, leprechaun.groundY + leprechaun.height, canvas.width, canvas.height)

    // Draw cave entrance (for intro)
    if (showIntro) {
      ctx.fillStyle = "#1a1a1a"
      ctx.beginPath()
      ctx.arc(50, leprechaun.groundY + leprechaun.height - 40, 60, 0, Math.PI, false)
      ctx.fill()

      ctx.fillStyle = "#0d0d0d"
      ctx.beginPath()
      ctx.arc(50, leprechaun.groundY + leprechaun.height - 40, 45, 0, Math.PI, false)
      ctx.fill()
    }

    // Draw background trees
    const treeSpacing = 100
    const totalTrees = Math.ceil(canvas.width / treeSpacing) + 3
    for (let i = 0; i < totalTrees; i++) {
      const baseX = i * treeSpacing - (gameState.current.backgroundOffset % treeSpacing)
      const treeX = baseX - treeSpacing
      const treeHeight = 100 + Math.sin(i) * 30

      if (treeX > -150 && treeX < canvas.width + 50) {
        ctx.fillStyle = "#3d2914"
        ctx.fillRect(treeX, leprechaun.groundY + leprechaun.height - treeHeight, 12, treeHeight)

        ctx.fillStyle = "#1a4d1a"
        ctx.beginPath()
        ctx.arc(treeX + 6, leprechaun.groundY + leprechaun.height - treeHeight + 15, 35, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = "#0d330d"
        ctx.beginPath()
        ctx.arc(treeX - 8, leprechaun.groundY + leprechaun.height - treeHeight + 10, 20, 0, Math.PI * 2)
        ctx.arc(treeX + 20, leprechaun.groundY + leprechaun.height - treeHeight + 12, 25, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Draw street lamps
    const lampSpacing = 180
    const totalLamps = Math.ceil(canvas.width / lampSpacing) + 2
    for (let i = 0; i < totalLamps; i++) {
      const baseX = i * lampSpacing - ((gameState.current.backgroundOffset * 0.8) % lampSpacing)
      const lampX = baseX - lampSpacing
      const lampY = leprechaun.groundY + leprechaun.height - 120

      if (lampX > -200 && lampX < canvas.width + 50) {
        ctx.fillStyle = "#4a4a4a"
        ctx.fillRect(lampX, lampY, 8, 120)

        ctx.fillStyle = "#2a2a2a"
        ctx.fillRect(lampX - 12, lampY - 20, 32, 25)

        const glowGradient = ctx.createRadialGradient(lampX + 4, lampY, 0, lampX + 4, lampY, 80)
        glowGradient.addColorStop(0, "rgba(255, 255, 150, 0.4)")
        glowGradient.addColorStop(0.5, "rgba(255, 255, 150, 0.15)")
        glowGradient.addColorStop(1, "rgba(255, 255, 150, 0)")
        ctx.fillStyle = glowGradient
        ctx.fillRect(lampX - 60, lampY - 60, 120, 120)

        ctx.fillStyle = "#ffff96"
        ctx.beginPath()
        ctx.arc(lampX + 4, lampY - 8, 6, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Draw leprechaun
    const leprechaunX = showIntro ? leprechaun.introX : leprechaun.x
    const leprechaunY = showIntro ? leprechaun.groundY : leprechaun.y

    const runCycle = leprechaun.animationFrame * 0.5
    const leftLegForward = Math.sin(runCycle) * 15
    const rightLegForward = Math.sin(runCycle + Math.PI) * 15

    // Left leg with boot
    ctx.save()
    ctx.translate(leprechaunX + 10, leprechaunY + leprechaun.height - 25)
    ctx.rotate(leftLegForward * 0.02)
    ctx.fillStyle = "#228B22"
    ctx.fillRect(-3, 0, 6, 25)
    ctx.fillStyle = "#8B4513"
    ctx.fillRect(-5, 23, 10, 8)
    ctx.restore()

    // Right leg with boot
    ctx.save()
    ctx.translate(leprechaunX + 25, leprechaunY + leprechaun.height - 25)
    ctx.rotate(rightLegForward * 0.02)
    ctx.fillStyle = "#228B22"
    ctx.fillRect(-3, 0, 6, 25)
    ctx.fillStyle = "#8B4513"
    ctx.fillRect(-5, 23, 10, 8)
    ctx.restore()

    // Leprechaun body
    ctx.fillStyle = "#228B22"
    ctx.fillRect(leprechaunX, leprechaunY, leprechaun.width, leprechaun.height)

    // Arms
    const armOffset = Math.sin(leprechaun.animationFrame * 0.8) * 3
    ctx.fillStyle = "#FDBCB4"
    ctx.fillRect(leprechaunX - 6, leprechaunY + 15 + armOffset, 10, 20)
    ctx.fillRect(leprechaunX + leprechaun.width - 4, leprechaunY + 15 - armOffset, 10, 20)

    // Hat
    ctx.fillStyle = "#006400"
    ctx.fillRect(leprechaunX + 6, leprechaunY - 15, leprechaun.width - 12, 20)

    // Hat buckle
    ctx.fillStyle = "#FFD700"
    ctx.fillRect(leprechaunX + leprechaun.width / 2 - 3, leprechaunY - 8, 6, 6)
    ctx.fillStyle = "#FFA500"
    ctx.fillRect(leprechaunX + leprechaun.width / 2 - 2, leprechaunY - 7, 4, 4)

    // Face
    ctx.fillStyle = "#FDBCB4"
    ctx.fillRect(leprechaunX + 8, leprechaunY + 10, leprechaun.width - 16, 25)

    // Eyes
    ctx.fillStyle = "black"
    ctx.fillRect(leprechaunX + 10, leprechaunY + 15, 3, 3)
    ctx.fillRect(leprechaunX + 22, leprechaunY + 15, 3, 3)

    // Beard
    ctx.fillStyle = "#FF6347"
    ctx.fillRect(leprechaunX + 9, leprechaunY + 25, leprechaun.width - 18, 12)

    // Money bag
    if (showIntro || gameStarted) {
      ctx.fillStyle = "#8B4513"
      ctx.beginPath()
      ctx.arc(leprechaunX - 15, leprechaunY + 25 + armOffset, 15, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = "#654321"
      ctx.fillRect(leprechaunX - 18, leprechaunY + 10 + armOffset, 6, 10)
      ctx.fillRect(leprechaunX - 20, leprechaunY + 20 + armOffset, 10, 1)
      ctx.fillRect(leprechaunX - 18, leprechaunY + 25 + armOffset, 6, 1)
      ctx.fillRect(leprechaunX - 19, leprechaunY + 30 + armOffset, 8, 1)
    }

    // Draw good coins
    coins.forEach((coin) => {
      if (!coin.collected) {
        const coinGlow = ctx.createRadialGradient(
          coin.x + coin.width / 2,
          coin.y + coin.height / 2,
          0,
          coin.x + coin.width / 2,
          coin.y + coin.height / 2,
          25,
        )
        coinGlow.addColorStop(0, "rgba(255, 215, 0, 0.5)")
        coinGlow.addColorStop(1, "rgba(255, 215, 0, 0)")
        ctx.fillStyle = coinGlow
        ctx.fillRect(coin.x - 15, coin.y - 15, coin.width + 30, coin.height + 30)

        ctx.fillStyle = "#FFD700"
        ctx.beginPath()
        ctx.arc(coin.x + coin.width / 2, coin.y + coin.height / 2, coin.width / 2, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = "#FFA500"
        ctx.beginPath()
        ctx.arc(coin.x + coin.width / 2, coin.y + coin.height / 2, coin.width / 2 - 4, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = "#FFFF00"
        ctx.beginPath()
        ctx.arc(coin.x + coin.width / 2 - 6, coin.y + coin.height / 2 - 6, 6, 0, Math.PI * 2)
        ctx.fill()
      }
    })

    // Draw bad coins
    badCoins.forEach((badCoin) => {
      if (!badCoin.collected) {
        const badCoinGlow = ctx.createRadialGradient(
          badCoin.x + badCoin.width / 2,
          badCoin.y + badCoin.height / 2,
          0,
          badCoin.x + badCoin.width / 2,
          badCoin.y + badCoin.height / 2,
          25,
        )
        badCoinGlow.addColorStop(0, "rgba(255, 0, 0, 0.5)")
        badCoinGlow.addColorStop(1, "rgba(255, 0, 0, 0)")
        ctx.fillStyle = badCoinGlow
        ctx.fillRect(badCoin.x - 15, badCoin.y - 15, badCoin.width + 30, badCoin.height + 30)

        ctx.fillStyle = "#DC143C"
        ctx.beginPath()
        ctx.arc(badCoin.x + badCoin.width / 2, badCoin.y + badCoin.height / 2, badCoin.width / 2, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = "#8B0000"
        ctx.beginPath()
        ctx.arc(badCoin.x + badCoin.width / 2, badCoin.y + badCoin.height / 2, badCoin.width / 2 - 4, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = "#FF69B4"
        ctx.beginPath()
        ctx.arc(badCoin.x + badCoin.width / 2 - 6, badCoin.y + badCoin.height / 2 - 6, 6, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = "#FFFFFF"
        ctx.fillRect(badCoin.x + badCoin.width / 2 - 8, badCoin.y + badCoin.height / 2 - 2, 16, 4)
      }
    })

    // Draw obstacles
    obstacles.forEach((obstacle) => {
      if (obstacle.type === "rock") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
        ctx.fillRect(obstacle.x + 4, obstacle.y + obstacle.height - 3, obstacle.width, 6)

        ctx.fillStyle = "#696969"
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height)

        ctx.fillStyle = "#808080"
        ctx.fillRect(obstacle.x + 3, obstacle.y + 3, obstacle.width - 6, 8)
        ctx.fillRect(obstacle.x + 5, obstacle.y + 15, obstacle.width - 10, 6)
        ctx.fillRect(obstacle.x + 2, obstacle.y + 25, obstacle.width - 8, 4)

        ctx.fillStyle = "#A9A9A9"
        ctx.fillRect(obstacle.x + 4, obstacle.y + 4, obstacle.width - 8, 3)
        ctx.fillRect(obstacle.x + 6, obstacle.y + 10, obstacle.width - 12, 3)

        ctx.fillStyle = "#2F2F2F"
        ctx.fillRect(obstacle.x + obstacle.width / 2, obstacle.y + 6, 2, obstacle.height - 12)
        ctx.fillRect(obstacle.x + 10, obstacle.y + obstacle.height / 2, obstacle.width - 20, 2)
      } else if (obstacle.type === "mountain") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
        ctx.beginPath()
        ctx.moveTo(obstacle.x + 4, obstacle.y + obstacle.height + 3)
        ctx.lineTo(obstacle.x + obstacle.width / 2 + 4, obstacle.y + 4)
        ctx.lineTo(obstacle.x + obstacle.width + 4, obstacle.y + obstacle.height + 3)
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = "#4a4a4a"
        ctx.beginPath()
        ctx.moveTo(obstacle.x, obstacle.y + obstacle.height)
        ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y)
        ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height)
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = "#5a5a5a"
        ctx.beginPath()
        ctx.moveTo(obstacle.x + 6, obstacle.y + obstacle.height)
        ctx.lineTo(obstacle.x + obstacle.width / 2 - 4, obstacle.y + 20)
        ctx.lineTo(obstacle.x + obstacle.width - 10, obstacle.y + obstacle.height - 8)
        ctx.lineTo(obstacle.x + 6, obstacle.y + obstacle.height)
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = "#f0f8ff"
        ctx.beginPath()
        ctx.moveTo(obstacle.x + obstacle.width / 2 - 15, obstacle.y + 25)
        ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y)
        ctx.lineTo(obstacle.x + obstacle.width / 2 + 15, obstacle.y + 25)
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = "#e6f3ff"
        ctx.beginPath()
        ctx.moveTo(obstacle.x + obstacle.width / 2 - 10, obstacle.y + 15)
        ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y + 3)
        ctx.lineTo(obstacle.x + obstacle.width / 2 + 10, obstacle.y + 15)
        ctx.closePath()
        ctx.fill()
      } else if (obstacle.type === "goblin") {
        // Рисуем гоблина
        const goblinX = obstacle.x
        const goblinY = obstacle.y

        // Тень гоблина
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
        ctx.fillRect(goblinX + 4, goblinY + obstacle.height - 3, obstacle.width, 8)

        // Тело гоблина
        ctx.fillStyle = "#4a5d23"
        ctx.fillRect(goblinX + 10, goblinY + 30, 50, 80)

        // Ноги гоблина
        ctx.fillStyle = "#3a4d13"
        ctx.fillRect(goblinX + 12, goblinY + 90, 15, 30)
        ctx.fillRect(goblinX + 43, goblinY + 90, 15, 30)

        // Руки гоблина
        ctx.fillStyle = "#4a5d23"
        ctx.fillRect(goblinX + 5, goblinY + 35, 15, 35)
        ctx.fillRect(goblinX + 60, goblinY + 35, 15, 35)

        // Голова гоблина
        ctx.fillStyle = "#5a6d33"
        ctx.fillRect(goblinX + 22, goblinY + 10, 35, 30)

        // Уши гоблина
        ctx.fillStyle = "#4a5d23"
        ctx.fillRect(goblinX + 15, goblinY + 15, 10, 10)
        ctx.fillRect(goblinX + 55, goblinY + 15, 10, 10)

        // Глаза гоблина
        ctx.fillStyle = "#ff0000"
        ctx.fillRect(goblinX + 28, goblinY + 20, 6, 6)
        ctx.fillRect(goblinX + 46, goblinY + 20, 6, 6)

        // Рот гоблина
        ctx.fillStyle = "#000000"
        ctx.fillRect(goblinX + 30, goblinY + 32, 15, 4)

        // Зубы гоблина
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(goblinX + 32, goblinY + 30, 3, 5)
        ctx.fillRect(goblinX + 42, goblinY + 30, 3, 5)

        // Оружие (дубинка)
        ctx.fillStyle = "#8B4513"
        ctx.fillRect(goblinX + 80, goblinY + 20, 6, 40)
        ctx.fillRect(goblinX + 77, goblinY + 15, 12, 12)
      }
    })

    // UI
    const baseFontSize = Math.max(16, Math.min(32, canvas.width / 25))
    const largeFontSize = Math.max(24, Math.min(48, canvas.width / 15))

    ctx.fillStyle = "#ffffff"
    ctx.font = `bold ${baseFontSize}px Arial`
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 2
    ctx.strokeText(`${score}`, 20, baseFontSize + 10)
    ctx.fillText(`${score}`, 20, baseFontSize + 10)

    if (highScore > 0) {
      ctx.font = `bold ${Math.max(14, baseFontSize - 8)}px Arial`
      ctx.strokeText(`Best: ${highScore}`, 20, baseFontSize + 40)
      ctx.fillText(`Best: ${highScore}`, 20, baseFontSize + 40)
    }

    // Показываем время до появления гоблинов
    // if (gameStarted && gameState.current.gameTime <= 1800) {
    //   const timeLeft = Math.ceil((1800 - gameState.current.gameTime) / 60)
    //   ctx.fillStyle = "#ffff00"
    //   ctx.font = `bold ${Math.max(12, baseFontSize - 10)}px Arial`
    //   ctx.strokeText(`Goblins in: ${timeLeft}s`, 20, baseFontSize + 70)
    //   ctx.fillText(`Goblins in: ${timeLeft}s`, 20, baseFontSize + 70)
    // }

    // Draw intro screen
    if (showIntro) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = "#ffffff"
      ctx.font = `bold ${largeFontSize}px Arial`
      ctx.textAlign = "center"
      ctx.strokeStyle = "#000000"
      ctx.lineWidth = 3
      ctx.strokeText("🍀 LEPRECHAUN RUNNER 🍀", canvas.width / 2, canvas.height / 2 - 80)
      ctx.fillText("🍀 LEPRECHAUN RUNNER 🍀", canvas.width / 2, canvas.height / 2 - 80)

      ctx.font = `bold ${Math.max(16, baseFontSize - 4)}px Arial`
      ctx.lineWidth = 2
      ctx.strokeText("Collect 50 coins and get", canvas.width / 2, canvas.height / 2 - 40)
      ctx.fillText("Collect 50 coins and get", canvas.width / 2, canvas.height / 2 - 40)

      ctx.fillStyle = "#FFD700"
      ctx.strokeText("🎁 PRIZE 50 FS 🎁", canvas.width / 2, canvas.height / 2 - 10)
      ctx.fillText("🎁 PRIZE 50 FS 🎁", canvas.width / 2, canvas.height / 2 - 10)

      ctx.fillStyle = "#ffffff"
      ctx.strokeText("TAP TO START", canvas.width / 2, canvas.height / 2 + 40)
      ctx.fillText("TAP TO START", canvas.width / 2, canvas.height / 2 + 40)
      ctx.textAlign = "left"
    }

    // Prize message
    if (showPrizeMessage && score >= 50) {
      ctx.fillStyle = "rgba(255, 215, 0, 0.9)"
      ctx.fillRect(canvas.width / 2 - 150, canvas.height / 2 - 60, 300, 120)

      ctx.fillStyle = "#000000"
      ctx.font = `bold ${Math.max(18, baseFontSize)}px Arial`
      ctx.textAlign = "center"
      ctx.fillText("🎉 CONGRATULATIONS! 🎉", canvas.width / 2, canvas.height / 2 - 30)
      ctx.fillText("You got 50 FS!", canvas.width / 2, canvas.height / 2)
      ctx.fillText("Keep playing!", canvas.width / 2, canvas.height / 2 + 30)
      ctx.textAlign = "left"
    }

    // Game over screen
    if (gameOver) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.9)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Title
      ctx.fillStyle = "#ffffff"
      ctx.font = `bold ${largeFontSize}px Arial`
      ctx.textAlign = "center"
      ctx.strokeStyle = "#000000"
      ctx.lineWidth = 3
      ctx.strokeText("GAME OVER", canvas.width / 2, canvas.height / 2 - 180)
      ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 180)

      // Score
      ctx.font = `bold ${Math.max(18, baseFontSize)}px Arial`
      ctx.lineWidth = 2
      ctx.strokeText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 - 140)
      ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 - 140)

      // Main message with better formatting
      ctx.fillStyle = "#ffffff"
      ctx.font = `bold ${Math.max(16, baseFontSize - 2)}px Arial`

      // First line - highlighted
      ctx.fillStyle = "#FFD700"
      ctx.strokeText("You were so close to victory…", canvas.width / 2, canvas.height / 2 - 80)
      ctx.fillText("You were so close to victory…", canvas.width / 2, canvas.height / 2 - 80)

      // Second line
      ctx.fillStyle = "#ffffff"
      ctx.strokeText("Ready for a real challenge?", canvas.width / 2, canvas.height / 2 - 50)
      ctx.fillText("Ready for a real challenge?", canvas.width / 2, canvas.height / 2 - 50)

      // Third line - smaller font
      ctx.font = `bold ${Math.max(14, baseFontSize - 4)}px Arial`
      ctx.strokeText("Click the button and start playing", canvas.width / 2, canvas.height / 2 - 10)
      ctx.fillText("Click the button and start playing", canvas.width / 2, canvas.height / 2 - 10)

      // Fourth line - highlighted
      ctx.fillStyle = "#90EE90"
      ctx.strokeText("real games that bring not only", canvas.width / 2, canvas.height / 2 + 20)
      ctx.fillText("real games that bring not only", canvas.width / 2, canvas.height / 2 + 20)

      // Fifth line - highlighted
      ctx.fillStyle = "#90EE90"
      ctx.font = `bold ${Math.max(16, baseFontSize - 2)}px Arial`
      ctx.strokeText("fun but also money!", canvas.width / 2, canvas.height / 2 + 50)
      ctx.fillText("fun but also money!", canvas.width / 2, canvas.height / 2 + 50)

      ctx.textAlign = "left"
    }

    // Draw grass particles
    gameState.current.grassParticles.forEach((particle) => {
      const alpha = particle.life / 30
      ctx.fillStyle = `rgba(45, 80, 22, ${alpha})`
      ctx.fillRect(particle.x, particle.y, 2, 3)
    })

    // Draw footprints
    if (gameStarted) {
      const trackSpacing = 40
      const totalTracks = Math.ceil(canvas.width / trackSpacing) + 2
      for (let i = 0; i < totalTracks; i++) {
        const baseX = i * trackSpacing - ((gameState.current.backgroundOffset * 2) % trackSpacing)
        const trackX = baseX - trackSpacing
        const trackY = leprechaun.groundY + leprechaun.height + 5

        if (trackX > -50 && trackX < canvas.width + 50) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.2)"
          ctx.fillRect(trackX - 5, trackY, 8, 4)
          ctx.fillRect(trackX + 10, trackY, 8, 4)
        }
      }
    }
  }, [score, gameOver, gameStarted, highScore, showIntro, showPrizeMessage])

  const gameLoop = useCallback(() => {
    updateGame()
    drawGame()
    gameLoopRef.current = requestAnimationFrame(gameLoop)
  }, [updateGame, drawGame])

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      jump()
    },
    [jump],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      gameState.current.leprechaun.groundY = window.innerHeight - 200
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    gameLoopRef.current = requestAnimationFrame(gameLoop)

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault()
      jump()
    }

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault()
        jump()
      }
    }

    canvas.addEventListener("touchstart", handleTouch, { passive: false })
    window.addEventListener("keydown", handleKeyPress)

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
      canvas.removeEventListener("touchstart", handleTouch)
      window.removeEventListener("keydown", handleKeyPress)
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [gameLoop, jump])

  useEffect(() => {
    if (gameOver && score > highScore) {
      setHighScore(score)
      localStorage.setItem("leprechaun-runner-high-score", score.toString())
    }
  }, [gameOver, score, highScore])

  useEffect(() => {
    const savedHighScore = localStorage.getItem("leprechaun-runner-high-score")
    if (savedHighScore) {
      setHighScore(Number.parseInt(savedHighScore))
    }
  }, [])

  useEffect(() => {
    if (showPrizeMessage) {
      const timer = setTimeout(() => {
        setShowPrizeMessage(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showPrizeMessage])

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full touch-none"
        style={{
          display: "block",
          imageRendering: "pixelated",
        }}
      />

      {gameOver && (
        <div className="absolute inset-0 flex items-end justify-center pb-20 pointer-events-none">
          <div className="pointer-events-auto">
            <button
              onClick={() => window.open("https://blastbet.com/?utm_source=telegram&utm_medium=cpc&utm_campaign=leprechaun_runner&utm_content=start_game_button", "_blank")}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-4 px-8 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-200 border-2 border-yellow-400 hover:border-yellow-300"
              style={{
                fontSize: `${Math.max(18, Math.min(28, window.innerWidth / 18))}px`,
                minWidth: "200px",
                textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                boxShadow: "0 8px 25px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
            >
              START
            </button>
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 text-white text-right">
        <div className="text-2xl font-bold">🍀</div>
      </div>

      {!gameStarted && !gameOver && !showIntro && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white text-center">
          <div className="bg-black/50 rounded-lg p-4">
            <div className="text-lg">👆 TAP TO JUMP</div>
          </div>
        </div>
      )}
    </div>
  )
}
