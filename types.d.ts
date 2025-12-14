type GameKeyboard = boolean[]
type GamePos = {
  x: number
  y: number
}
type GameVelocity = GamePos
type GameInput = {
  velocity?: GameVelocity
  action: boolean
}
type GamePath = {
  path: Path2D
  fill?: string
  stroke?: string
  lineWidth?: number
}

interface Window {
  MODEL: GameModel
}
