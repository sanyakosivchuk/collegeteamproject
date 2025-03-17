import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static values = { uuid: String, player: Number, timeLimit: Number }

  connect() {
    this.remainingTime = this.timeLimitValue;
    this.timerInterval = setInterval(() => this.tick(), 1000);

    // Define available ships (using your backend configuration)
    // e.g. 1 ship of size 4, 2 of size 3, 3 of size 2, 4 of size 1.
    this.ships = { 4: 1, 3: 2, 2: 3, 1: 4 };
    // Track current orientation for each ship size (default horizontal)
    this.shipOrientations = { 4: "horizontal", 3: "horizontal", 2: "horizontal", 1: "horizontal" };

    // Store the currently dragged ship info (if any)
    this.currentDraggedShip = null;

    this.updatePalette();
  }

  disconnect() {
    clearInterval(this.timerInterval);
  }

  tick() {
    this.remainingTime--;
    const timerDisplay = document.getElementById("placement-timer");
    if (timerDisplay) {
      timerDisplay.textContent = `Time remaining: ${this.remainingTime} seconds`;
    }
    if (this.remainingTime <= 0) {
      clearInterval(this.timerInterval);
      this.finalizePlacement();
    }
  }

  finalizePlacement() {
    fetch(`/games/${this.uuidValue}/finalize_placement`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    })
      .then(response => response.json())
      .then(data => {
        console.log("Finalized ship placement:", data);
        if(data.status === "ongoing") {
          // Redirect or reload page so the gameplay view shows up.
          window.location.reload();
        } else {
          // Optionally show a message that you're waiting for the opponent.
          alert("Waiting for the opponent to finish ship placement...");
        }
      })
      .catch(error => console.error("Error finalizing placement:", error));
  }

  // --- Palette Handlers ---

  updatePalette() {
    const paletteContainer = document.getElementById("ship-palette");
    if (!paletteContainer) return;
    paletteContainer.innerHTML = "";
    for (const size in this.ships) {
      const count = this.ships[size];
      if (count > 0) {
        const orientation = this.shipOrientations[size];
        const shipDiv = document.createElement("div");
        shipDiv.className = "inline-block m-2 p-2 border border-gray-400 cursor-move";
        shipDiv.draggable = true;
        shipDiv.dataset.shipSize = size;
        shipDiv.addEventListener("dragstart", this.dragStart.bind(this));
        shipDiv.innerHTML = `<strong>Ship ${size}</strong> (${count} remaining)
                             <br>Orientation: ${orientation}`;
        // Flip button
        const flipButton = document.createElement("button");
        flipButton.textContent = "Flip";
        flipButton.dataset.shipSize = size;
        flipButton.addEventListener("click", this.flipShip.bind(this));
        shipDiv.appendChild(flipButton);
        paletteContainer.appendChild(shipDiv);
      }
    }
  }

  flipShip(event) {
    event.preventDefault();
    const shipSize = event.currentTarget.dataset.shipSize;
    this.shipOrientations[shipSize] =
      this.shipOrientations[shipSize] === "horizontal" ? "vertical" : "horizontal";
    this.updatePalette();
  }

  // --- Drag and Drop Handlers ---

  dragStart(event) {
    const shipSize = event.currentTarget.dataset.shipSize;
    const orientation = this.shipOrientations[shipSize];
    this.currentDraggedShip = { shipSize: parseInt(shipSize, 10), orientation };
    // Also set dataTransfer so drop event can access the info if needed.
    event.dataTransfer.setData("text/plain", JSON.stringify(this.currentDraggedShip));
  }

  // Allow board cell to accept drop and show preview
  allowDrop(event) {
    event.preventDefault();
    // Clear any previous preview highlights
    this.clearPreview();

    // Use the current cell as starting position
    const cell = event.currentTarget;
    const startX = parseInt(cell.dataset.x, 10);
    const startY = parseInt(cell.dataset.y, 10);

    if (!this.currentDraggedShip) return;

    const { shipSize, orientation } = this.currentDraggedShip;
    const previewCells = [];
    if (orientation === "horizontal") {
      for (let i = 0; i < shipSize; i++) {
        previewCells.push({ x: startX + i, y: startY });
      }
    } else {
      for (let i = 0; i < shipSize; i++) {
        previewCells.push({ x: startX, y: startY + i });
      }
    }
    // Check bounds
    const valid = previewCells.every(pos => pos.x < 10 && pos.y < 10);

    // Highlight cells with green if valid, red if not
    previewCells.forEach(pos => {
      const previewCell = document.getElementById(`player-cell-${pos.y}-${pos.x}`);
      if (previewCell) {
        previewCell.classList.add(valid ? "bg-green-200" : "bg-red-200");
        previewCell.classList.add("preview-highlight");
      }
    });
  }

  // Clear preview highlights from all board cells.
  clearPreview() {
    const previews = document.querySelectorAll(".preview-highlight");
    previews.forEach(cell => {
      cell.classList.remove("bg-green-200", "bg-red-200", "preview-highlight");
    });
  }

  // When leaving a cell, clear preview.
  dragLeave(event) {
    this.clearPreview();
  }

  // When a ship is dropped onto a board cell.
  dropShip(event) {
    event.preventDefault();
    this.clearPreview();

    // Read the dragged ship data from our stored property.
    const { shipSize, orientation } = this.currentDraggedShip || {};
    if (!shipSize) return;

    const target = event.currentTarget;
    const startX = parseInt(target.dataset.x, 10);
    const startY = parseInt(target.dataset.y, 10);

    // Call backend to place the ship.
    fetch(`/games/${this.uuidValue}/place_ship`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ x: startX, y: startY, size: shipSize, orientation })
    })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          alert(data.error);
        } else {
          // Draw the ship on the board.
          this.drawShipOnBoard(startX, startY, shipSize, orientation);
          // Decrement the count in the palette.
          this.decrementShipCount(shipSize);
        }
      })
      .catch(error => console.error("Error placing ship:", error));
  }

  // Draw the ship on the board by updating the cells.
  drawShipOnBoard(startX, startY, size, orientation) {
    if (orientation === "horizontal") {
      for (let i = 0; i < size; i++) {
        const cell = document.getElementById(`player-cell-${startY}-${startX + i}`);
        if (cell) {
          cell.textContent = "S";
          cell.style.backgroundColor = "#38b2ac";
        }
      }
    } else {
      for (let i = 0; i < size; i++) {
        const cell = document.getElementById(`player-cell-${startY + i}-${startX}`);
        if (cell) {
          cell.textContent = "S";
          cell.style.backgroundColor = "#38b2ac";
        }
      }
    }
  }

  decrementShipCount(shipSize) {
    this.ships[shipSize] = this.ships[shipSize] - 1;
    if (this.ships[shipSize] <= 0) {
      delete this.ships[shipSize];
    }
    this.updatePalette();
  }
}
