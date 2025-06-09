import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    uuid: String,
    player: Number,
    timeLimit: Number,
    ship1Url: String,
    ship1VerticalUrl: String,
    ship2Url: String,
    ship2VerticalUrl: String,
    ship3Url: String,
    ship3VerticalUrl: String,
    ship4Url: String,
    ship4VerticalUrl: String
  }

  connect() {
    this.touchMode = window.matchMedia("(pointer: coarse)").matches
    this.remainingTime = this.timeLimitValue
    this.timerInterval = setInterval(() => this.tick(), 1000)
    this.pollInterval = null
    this.ships = { 4: 1, 3: 2, 2: 3, 1: 4 }
    this.shipOrientations = { 4: "horizontal", 3: "horizontal", 2: "horizontal", 1: "horizontal" }
    this.currentDraggedShip = null
    this.selectedShip = null
    this.updatePalette()
    if (this.touchMode) {
      this.element.addEventListener("click", e => this.handleTap(e))
    }
  }

  disconnect() {
    clearInterval(this.timerInterval)
    clearInterval(this.pollInterval)
  }

  tick() {
    this.remainingTime--
    const timerDisplay = document.getElementById("placement-timer")
    if (timerDisplay) timerDisplay.textContent = `Time remaining: ${this.remainingTime} seconds`
    if (this.remainingTime <= 0) {
      clearInterval(this.timerInterval)
      this.finalizePlacement()
    }
  }

  finalizePlacement() {
    fetch(`/games/${this.uuidValue}/finalize_placement`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" }
    })
      .then(r => r.json())
      .then(data => {
        if (data.status === "ongoing") {
          window.location.reload()
        } else {
          this.flash("Waiting for the opponent to finish ship placement…", "info")
          this.startPolling()
        }
      })
      .catch(() => this.flash("Error finalizing placement", "error"))
  }

  startPolling() {
    if (this.pollInterval) return
    this.pollInterval = setInterval(() => {
      fetch(`/games/${this.uuidValue}/state`, { headers: { Accept: "application/json" } })
        .then(r => r.json())
        .then(game => {
          if (game.status === "ongoing") {
            clearInterval(this.pollInterval)
            window.location.reload()
          }
        })
    }, 3000)
  }

  updatePalette() {
    const palette = document.getElementById("ship-palette")
    if (!palette) return
    palette.innerHTML = ""
    for (const size in this.ships) {
      const count = this.ships[size]
      if (count > 0) {
        const o = this.shipOrientations[size]
        const ship = document.createElement("div")
        ship.className =
          "min-w-[130px] bg-white/20 text-black rounded p-2 text-xs cursor-move select-none"
        ship.draggable = !this.touchMode
        ship.dataset.shipSize = size
        if (!this.touchMode) ship.addEventListener("dragstart", this.dragStart.bind(this))
        ship.addEventListener("click", () => this.selectShip(size))
        ship.innerHTML = `<strong>Ship ${size}</strong> (${count} remaining)<br>Orientation: ${o}`
        const flip = document.createElement("button")
        flip.textContent = "Flip"
        flip.className = "mt-1 underline text-blue-800"
        flip.dataset.shipSize = size
        flip.addEventListener("click", this.flipShip.bind(this))
        ship.appendChild(flip)
        palette.appendChild(ship)
      }
    }
  }

  selectShip(size) {
    this.selectedShip = parseInt(size, 10)
    this.currentDraggedShip = { shipSize: this.selectedShip, orientation: this.shipOrientations[size] }
    Array.from(document.querySelectorAll("#ship-palette > div")).forEach(d =>
      d.classList.toggle("ring-4", parseInt(d.dataset.shipSize, 10) === this.selectedShip)
    )
  }

  flipShip(e) {
    e.stopPropagation()
    const s = e.currentTarget.dataset.shipSize
    this.shipOrientations[s] = this.shipOrientations[s] === "horizontal" ? "vertical" : "horizontal"
    this.updatePalette()
  }

  dragStart(e) {
    const s = e.currentTarget.dataset.shipSize
    const o = this.shipOrientations[s]
    this.currentDraggedShip = { shipSize: parseInt(s, 10), orientation: o }
    e.dataTransfer.setData("text/plain", JSON.stringify(this.currentDraggedShip))
  }

  allowDrop(e) {
    e.preventDefault()
    this.clearPreview()
    const cell = e.currentTarget
    const sx = parseInt(cell.dataset.x, 10)
    const sy = parseInt(cell.dataset.y, 10)
    if (!this.currentDraggedShip) return
    const { shipSize, orientation } = this.currentDraggedShip
    const preview = []
    if (orientation === "horizontal") {
      for (let i = 0; i < shipSize; i++) preview.push({ x: sx + i, y: sy })
    } else {
      for (let i = 0; i < shipSize; i++) preview.push({ x: sx, y: sy + i })
    }
    const valid = preview.every(p => p.x < 10 && p.y < 10)
    preview.forEach(p => {
      const c = document.getElementById(`player-cell-${p.y}-${p.x}`)
      if (c) c.classList.add(valid ? "bg-green-200" : "bg-red-200", "preview-highlight")
    })
  }

  clearPreview() {
    document.querySelectorAll(".preview-highlight").forEach(c =>
      c.classList.remove("bg-green-200", "bg-red-200", "preview-highlight")
    )
  }

  dragLeave() {
    this.clearPreview()
  }

  dropShip(e) {
    e.preventDefault()
    this.clearPreview()
    const { shipSize, orientation } = this.currentDraggedShip || {}
    if (!shipSize) return
    const t = e.currentTarget
    const sx = parseInt(t.dataset.x, 10)
    const sy = parseInt(t.dataset.y, 10)
    this.placeShipRequest(sx, sy, shipSize, orientation)
  }

  handleTap(e) {
    const cell = e.target.closest("[id^='player-cell-']")
    if (!cell) return
    if (!this.selectedShip) {
      this.flash("Select a ship first", "error")
      return
    }
    const sx = parseInt(cell.dataset.x, 10)
    const sy = parseInt(cell.dataset.y, 10)
    const size = this.selectedShip
    const orientation = this.shipOrientations[size]
    this.placeShipRequest(sx, sy, size, orientation, true)
  }

  placeShipRequest(x, y, size, orientation, resetSelection = false) {
    fetch(`/games/${this.uuidValue}/place_ship`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ x, y, size, orientation })
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          this.flash(data.error, "error")
        } else {
          this.drawShipOnBoard(x, y, size, orientation)
          this.decrementShipCount(size)
          if (resetSelection) {
            this.selectedShip = null
            Array.from(document.querySelectorAll("#ship-palette > div")).forEach(d => d.classList.remove("ring-4"))
          }
          this.flash("Ship placed", "info")
        }
      })
      .catch(() => this.flash("Error placing ship", "error"))
  }

  drawShipOnBoard(sx, sy, size, orientation) {
    const url = this[orientation === "horizontal" ? `ship${size}UrlValue` : `ship${size}VerticalUrlValue`]
    for (let i = 0; i < size; i++) {
      const x = orientation === "horizontal" ? sx + i : sx
      const y = orientation === "horizontal" ? sy : sy + i
      const cell = document.getElementById(`player-cell-${y}-${x}`)
      if (!cell) continue
      cell.innerHTML = ""
      cell.style.backgroundImage = `url('${url}')`
      cell.style.backgroundRepeat = "no-repeat"
      cell.style.backgroundColor = "transparent"
      if (size > 1) {
        if (orientation === "horizontal") {
          if (i > 0) cell.classList.add("border-l-0")
          if (i < size - 1) cell.classList.add("border-r-0")
        } else {
          if (i > 0) cell.classList.add("border-t-0")
          if (i < size - 1) cell.classList.add("border-b-0")
        }
      }
      if (orientation === "horizontal") {
        cell.style.backgroundSize = `${size * 40}px 40px`
        cell.style.backgroundPosition = `-${i * 40}px 0`
      } else {
        cell.style.backgroundSize = `40px ${size * 40}px`
        cell.style.backgroundPosition = `0 -${i * 40}px`
      }
    }
  }

  decrementShipCount(s) {
    this.ships[s] -= 1
    if (this.ships[s] <= 0) delete this.ships[s]
    this.updatePalette()
  }

  flash(msg, type) {
    const el = document.getElementById("placement-message")
    if (!el) return
    el.textContent = msg
    el.className = `mx-auto mb-4 w-fit px-4 py-2 rounded text-white font-semibold ${
      type === "error" ? "bg-red-600" : "bg-blue-600"
    }`
    el.classList.remove("hidden")
    setTimeout(() => el.classList.add("hidden"), 3000)
  }
}
