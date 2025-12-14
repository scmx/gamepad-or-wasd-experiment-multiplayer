const TAU = Math.PI * 2
const ACTIONS = ["up", "left", "down", "right", "action"]
const KEYS = [
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
  "Space",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyE",
]

export class GameEntity {
  /** @type {GamePos} */
  pos = { x: 0, y: 0 }
  /** @type {GamePos | null} */
  oldPos = null
  radius = 0
  speed = 0
  velocity = { x: 0, y: 0 }
  free = true
}

export class GamePlayer extends GameEntity {
  index = 0
  radius = 5
  speed = 3
  energy = 0
  color = "white"
  rumbl = { duration: 0, ready: false }
}

export class GameEnemy extends GameEntity {
  radius = 4
  speed = 3
  energy = 0
  color = "red"
}

export class GameItem extends GameEntity {
  radius = 3
  color = "yellow"
}

export class GamePoison extends GameItem {
  color = "purple"
}

export class GameModel {
  /** @type {'playing' | 'gameover'} */
  state = "playing"
  winningEnergy = 20
  simulationTime = 0
  frameTime = 0
  interval = 50
  speed = 0
  size = 100
  /** @type {GamePlayer[]} */
  players = []
  playersEnergy = 0
  /** @type {GameEnemy[]} */
  enemies = []
  enemiesEnergy = 0
  /** @type {GameItem[]} */
  items = []
  /** @type {GamePoison[]} */
  poisons = []

  constructor() {
    this.speed = this.interval / 100
  }
}

export class GameView {
  offset = { x: 0, y: 0 }
  scale = 0
  size = 0
}

/**
 * @param {CanvasRenderingContext2D} ctx
 */
export default function (ctx) {
  const keyboard = initKeyboard()
  const model = new GameModel()
  window.MODEL = model
  for (let i = 0; i < 2; i++) {
    const player = new GamePlayer()
    player.index = i
    player.free = false
    player.color = i % 2 ? "black" : "white"
    Object.assign(player.pos, randomPos(model))
    model.players.push(player)
  }
  for (let i = 0; i < 2; i++) {
    const enemy = new GameEnemy()
    enemy.free = false
    Object.assign(enemy.pos, randomPos(model))
    model.enemies.push(enemy)
  }
  for (let i = 0; i < 8; i++) {
    const item = new GameItem()
    item.free = false
    Object.assign(item.pos, randomPos(model))
    model.items.push(item)
  }
  for (let i = 0; i < 8; i++) {
    const poison = new GamePoison()
    model.poisons.push(poison)
  }
  const view = new GameView()
  resize(model, view, ctx)
  listen(model, view, ctx, keyboard)
  animate(model, view, ctx, keyboard)
}

/**
 * @param {GameModel} model
 * @param {GameView} view
 * @param {CanvasRenderingContext2D} ctx
 * @param {GameKeyboard} keyboard
 */
export function listen(model, view, ctx, keyboard) {
  addEventListener("resize", () => resize(model, view, ctx))
  addEventListener("keydown", (e) => keydown(e, keyboard))
  addEventListener("keyup", (e) => keyup(e, keyboard))
}

/**
 * @param {GameModel} model
 * @param {GameView} view
 * @param {CanvasRenderingContext2D} ctx
 * @param {GameKeyboard} keyboard
 */
export function animate(
  model,
  view,
  ctx,
  keyboard,
  loop = requestAnimationFrame,
) {
  let accumulator = 0
  let lastTime = performance.now()

  loop(function callback(timeStamp) {
    const frameTime = timeStamp - lastTime
    lastTime = timeStamp
    accumulator += frameTime

    model.frameTime = (accumulator % model.interval) / model.interval
    while (accumulator >= model.interval) {
      model.simulationTime += model.interval
      if (model.state === "playing") {
        update(model, getInputs(keyboard))
        if (model.enemiesEnergy >= model.playersEnergy) {
          if (model.enemiesEnergy >= model.winningEnergy) {
            model.state = "gameover"
            console.log("You lose!")
          }
        } else if (model.playersEnergy >= model.winningEnergy) {
          model.state = "gameover"
          console.log("You win!")
        }
      } else if (model.state === "gameover") {
        for (const input of getInputs(keyboard)) {
          if (input.action) {
            model.state = "playing"
            for (const player of model.players) {
              player.energy = 0
            }
            for (const enemy of model.enemies) {
              enemy.energy = 0
            }
            break
          }
        }
      }
      accumulator -= model.interval
      for (let i = 0; i < model.players.length; i++) {
        const player = model.players[i]
        if (player.rumbl.duration > 0)
          player.rumbl.duration = Math.max(
            0,
            player.rumbl.duration - model.interval,
          )
        if (player.rumbl.ready) {
          player.rumbl.ready = false
          const gamepad = navigator.getGamepads()[i]
          if (gamepad?.connected) {
            console.log("rumbling", gamepad)
            gamepad?.vibrationActuator?.playEffect("dual-rumble", {
              startDelay: 0,
              duration: 80,
              weakMagnitude: 1,
              strongMagnitude: 1,
            })
          }
        }
      }
    }
    draw(model, view, ctx)
    loop(callback)
  })
}

/**
 * @param {KeyboardEvent} event
 * @param {GameKeyboard} keyboard
 */
export function keydown(event, keyboard) {
  const index = KEYS.indexOf(event.code)
  if (index === -1) return
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  event.preventDefault()
  keyboard[index] = true
}

/**
 * @param {KeyboardEvent} event
 * @param {GameKeyboard} keyboard
 */
export function keyup(event, keyboard) {
  const index = KEYS.indexOf(event.code)
  if (index === -1) return
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  event.preventDefault()
  keyboard[index] = false
}

/**
 * @param {GameModel} model
 * @param {GameView} view
 * @param {CanvasRenderingContext2D} ctx
 */
export function resize(
  model,
  view,
  ctx,
  dpr = devicePixelRatio,
  w = innerWidth,
  h = innerHeight,
) {
  const [w2, h2] = [w * dpr, h * dpr]
  ctx.canvas.style.width = w + "px"
  ctx.canvas.style.height = h + "px"
  ctx.canvas.width = w2
  ctx.canvas.height = h2
  view.size = Math.min(w2, h2)
  view.scale = view.size / model.size
  view.offset.x = (w2 - view.size) / 2
  view.offset.y = (h2 - view.size) / 2
}

/**
 * @param {GameModel} model
 * @param {GameView} view
 * @param {CanvasRenderingContext2D} ctx
 */
export function draw(model, view, ctx) {
  ctx.fillStyle = "gray"
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.fillStyle = "blue"
  ctx.fillRect(view.offset.x, view.offset.y, view.size, view.size)

  for (const poison of model.poisons) {
    if (poison.free) continue
    drawPoison(poison, model, view, ctx)
  }
  for (const item of model.items) {
    if (item.free) continue
    drawItem(item, model, view, ctx)
  }
  for (const enemy of model.enemies) {
    if (enemy.free) continue
    drawEnemy(enemy, model, view, ctx)
  }
  for (const player of model.players) {
    if (player.free) continue
    drawPlayer(player, model, view, ctx)
  }

  const playersEnergy = model.players.reduce((sum, p) => sum + p.energy, 0)
  const enemiesEnergy = model.enemies.reduce((sum, e) => sum + e.energy, 0)
  ctx.font = `${5 * view.scale}px sans-serif`
  ctx.textAlign = "left"
  ctx.fillText(`${playersEnergy}`, 100, 120)
  ctx.fillText(`${enemiesEnergy}`, 100, 240)
}

/**
 * @param {GamePlayer} player
 * @param {GameModel} model
 * @param {GameView} view
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawPlayer(player, model, view, ctx) {
  const { x, y, radius } = resolveEntity(player, model, view)
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, TAU)
  ctx.closePath()
  ctx.fillStyle = player.color
  ctx.fill()
  ctx.strokeStyle = "#0009"
  ctx.lineWidth = 0.3 * view.scale
  ctx.stroke()

  ctx.font = `${3 * view.scale}px sans-serif`
  ctx.fillStyle = player.color === "white" ? "black" : "white"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(`${player.energy}`, x, y)

  if (player.energy) {
    // they should spin around
    const offsetAngle = (model.simulationTime / 5000) * TAU
    const energyAngleStep = TAU / Math.min(20, player.energy)
    for (let a = 0; a < TAU; a += energyAngleStep) {
      const ex = x + Math.cos(a + offsetAngle) * radius * 0.7
      const ey = y + Math.sin(a + offsetAngle) * radius * 0.7
      ctx.beginPath()
      ctx.arc(ex, ey, radius * 0.2, 0, TAU)
      ctx.closePath()
      ctx.strokeStyle = "#000"
      ctx.lineWidth = 0.2 * view.scale
      ctx.stroke()
      ctx.fillStyle = "#ff0"
      ctx.fill()
    }
  }
}

/**
 * @param {GameEnemy} enemy
 * @param {GameModel} model
 * @param {GameView} view
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawEnemy(enemy, model, view, ctx) {
  const { x, y, radius } = resolveEntity(enemy, model, view)
  // for (const gp of getEnemyPaths()) {
  // }
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, TAU)
  ctx.closePath()
  ctx.fillStyle = enemy.color
  ctx.fill()
  ctx.strokeStyle = "#0009"
  ctx.lineWidth = 0.3 * view.scale
  ctx.stroke()
}

/**
 * @param {GameItem} item
 * @param {GameModel} model
 * @param {GameView} view
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawItem(item, model, view, ctx) {
  const { x, y, radius } = resolveEntity(item, model, view)
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, TAU)
  ctx.closePath()
  ctx.fillStyle = item.color
  ctx.fill()
  ctx.strokeStyle = "#0009"
  ctx.lineWidth = 0.3 * view.scale
  ctx.stroke()
}

/**
 * @param {GamePoison} poison
 * @param {GameModel} model
 * @param {GameView} view
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawPoison(poison, model, view, ctx) {
  const { x, y, radius } = resolveEntity(poison, model, view)
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, TAU)
  ctx.closePath()
  ctx.fillStyle = poison.color
  ctx.fill()
  ctx.strokeStyle = "#0009"
  ctx.lineWidth = 0.3 * view.scale
  ctx.stroke()
}

/**
 * @param {GameModel} model
 * @param {GameInput[]} inputs
 */
export function update(model, inputs) {
  for (let i = 0, n = model.players.length; i < n; i++) {
    const player = model.players[i]
    player.oldPos = null
    const input = inputs[i]
    if (input?.velocity) applyVelocity(input.velocity, player, model)
    if (input?.action) {
      if (player.energy >= 3) {
        player.energy = Math.max(0, player.energy - 3)
        const poison = getFree(model.poisons)
        if (poison) poison.pos = { ...player.pos }
        console.log("action", poison)
      }
    }
    model.playersEnergy = model.players.reduce((sum, p) => sum + p.energy, 0)
    model.enemiesEnergy = model.enemies.reduce((sum, e) => sum + e.energy, 0)
  }
  for (const enemy of model.enemies) {
    enemy.oldPos = null
    applyVelocity(randomVelocity(enemy.velocity), enemy, model)
  }
  for (const enemy of model.enemies) {
    if (enemy.free) continue
    for (const player of model.players) {
      if (collides(enemy, player)) {
        enemy.energy++
        player.energy = Math.max(0, player.energy - 1)
        if (!player.rumbl.duration) {
          player.rumbl.duration = 80
          player.rumbl.ready = true
        }
      }
    }
  }
  nextItem: for (const item of model.items) {
    if (item.free) {
      item.free = false
      Object.assign(item.pos, randomPos(model))
      continue
    }
    for (const enemy of model.enemies) {
      if (enemy.free) continue
      if (collides(item, enemy)) {
        enemy.energy++
        item.free = true
        continue nextItem
      }
    }
    for (const player of model.players) {
      if (player.free) continue
      if (collides(item, player)) {
        player.energy++
        item.free = true
        continue nextItem
      }
    }
  }
  nextPoison: for (const poison of model.poisons) {
    if (poison.free) continue
    for (const enemy of model.enemies) {
      if (enemy.free) continue
      if (collides(poison, enemy)) {
        enemy.energy = Math.ceil(enemy.energy / 2)
        poison.free = true
        continue nextPoison
      }
    }
    // for (const player of model.players) {
    //   if (player.free) continue
    //   if (collides(poison, player)) {
    //     player.energy /= 2
    //     poison.free = true
    //     continue nextPoison
    //   }
    // }
  }
}

/**
 * @param {GameVelocity} velocity
 * @param {GameEntity} entity
 * @param {GameModel} model
 */
export function applyVelocity(velocity, entity, model) {
  let x = entity.pos.x + velocity.x * entity.speed * model.speed
  let y = entity.pos.y + velocity.y * entity.speed * model.speed
  if (x < entity.radius) {
    x = entity.radius
    velocity.x = 0
  }
  if (x > model.size - entity.radius) {
    x = model.size - entity.radius
    velocity.x = 0
  }
  if (y < entity.radius) {
    y = entity.radius
    velocity.y = 0
  }
  if (y > model.size - entity.radius) {
    y = model.size - entity.radius
    velocity.y = 0
  }
  entity.oldPos = { ...entity.pos }
  Object.assign(entity.velocity, velocity)
  Object.assign(entity.pos, { x, y })
}

/**
 * @param {GamePos} pos
 * @param {GameView} view
 */
export function resolvePos(pos, view) {
  return {
    x: view.offset.x + pos.x * view.scale,
    y: view.offset.y + pos.y * view.scale,
  }
}

/**
 * @param {GameEntity} entity
 * @param {GameModel} model
 * @param {GameView} view
 */
export function resolveEntity(entity, model, view) {
  let x = view.offset.x + entity.pos.x * view.scale
  let y = view.offset.y + entity.pos.y * view.scale
  if (entity.oldPos && model.state === "playing") {
    const t = model.frameTime
    x = view.offset.x + lerp(entity.oldPos.x, entity.pos.x, t) * view.scale
    y = view.offset.y + lerp(entity.oldPos.y, entity.pos.y, t) * view.scale
  }
  let radius = entity.radius * view.scale
  // if (entity instanceof GamePlayer || entity instanceof GameEnemy) {
  //   radius *= 1 + 0.1 * Math.pow(entity.energy, 1 / 2)
  // }
  return { x, y, radius }
}

/**
 * @param {number} [oldAngle]
 * @returns {number}
 */
export function randomAngle(oldAngle) {
  if (!oldAngle) return Math.random() * TAU
  const offset = Math.random() * Math.PI * 0.25 - Math.PI * 0.125
  return (oldAngle + offset + TAU) % TAU
}

/**
 * @param {GameVelocity} [oldVelocity]
 * @returns {GameVelocity}
 */
export function randomVelocity(oldVelocity) {
  let oldAngle = oldVelocity
    ? Math.atan2(oldVelocity.y, oldVelocity.x)
    : undefined
  const oldDistance = oldVelocity ? Math.hypot(oldVelocity.x, oldVelocity.y) : 0
  const angle = randomAngle(oldAngle)
  const distance = clamp((oldDistance || 1) + Math.random() * 0.125, 0, 1)
  return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance }
}

/**
 * @param {GameModel} model
 * @returns {GamePos}
 */
export function randomPos(model) {
  return { x: Math.random() * model.size, y: Math.random() * model.size }
}

/**
 * @param {GameEntity} a
 * @param {GameEntity} b
 * @returns {boolean}
 */
export function collides(a, b) {
  const dx = a.pos.x - b.pos.x
  const dy = a.pos.y - b.pos.y
  const dist = Math.hypot(dx, dy)
  return dist < a.radius + b.radius
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/**
 * @param {GamePos} a
 * @param {GamePos} b
 * @param {number} t
 * @returns {GamePos}
 */
export function lerpPos(a, b, t) {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
  }
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} t
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t
}

/**
 * @param {GameKeyboard} keyboard
 * @param {(Gamepad | null)[]} gamepads
 * @returns {GameInput[]}
 */
export function getInputs(keyboard, gamepads = navigator.getGamepads()) {
  const inputs = []
  for (const gamepad of gamepads) {
    if (!gamepad?.connected) continue

    const [x, y] = gamepad.axes
    let velocity = { x: 0, y: 0 }
    if (Math.abs(x) + Math.abs(y) >= 0.5) {
      velocity = { x, y }
    }
    const action = gamepad.buttons[0].pressed
    // console.log(
    //   gamepad.buttons
    //     .map((b, i) => ({ b, i }))
    //     .filter(({ b }) => b.pressed)
    //     .map(({ i }) => i),
    // )
    inputs[gamepad.index] = { velocity, action }
    // console.log(
    //   gamepad.buttons
    //     .map((b, i) => b.pressed && i)
    //     .filter((i) => typeof i === "number"),
    // )
  }
  for (let i = 0, n = ACTIONS.length; i < n; i++) {
    if (inputs[i]) continue
    const [up, left, down, right, action] = keyboard.slice(i * n, i * n + n)
    let x = (left ? -1 : 0) + (right ? 1 : 0)
    let y = (up ? -1 : 0) + (down ? 1 : 0)
    const dist = Math.hypot(x, y)
    if (dist > 0) x /= dist
    if (dist > 0) y /= dist
    let velocity
    if (x !== 0 || y !== 0) velocity = { x, y }
    inputs[i] = { velocity, action }
  }
  return inputs
}

/**
 * @template {GameEntity} T
 * @param {T[]} collection
 * @returns {T | void}
 */
export function getFree(collection) {
  for (const item of collection) {
    if (!item.free) continue
    item.free = false
    return item
  }
}

/**
 * @returns {GameKeyboard}
 */
export function initKeyboard() {
  return Array(KEYS.length).fill(false)
}

/**
 * @returns {GamePath[]}
 */
// export function getEnemyPaths() {
//   const path = new Path2D()
//   path.arc(0, 0, 10, 0, TAU)
//   path.arc(-3, -2, 2, 0, TAU)
//   path.arc(3, -2, 2, 0, TAU)
//   return path
// }
