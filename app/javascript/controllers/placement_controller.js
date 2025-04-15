import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static values = 
  { uuid: String,
    player: Number,
    timeLimit: Number,
    ship1Url: String,
    ship1VerticalUrl: String,
    ship2Url: String,
    ship2VerticalUrl: String,
    ship3Url: String,
    ship3VerticalUrl: String,
    ship4Url: String,
    ship4VerticalUrl: String }

  connect() {
    this.remainingTime = this.timeLimitValue;
    this.timerInterval = setInterval(() => this.tick(), 1000);

    this.ships = { 4: 1, 3: 2, 2: 3, 1: 4 };
    this.shipOrientations = { 4: "horizontal", 3: "horizontal", 2: "horizontal", 1: "horizontal" };

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
          window.location.reload();
        } else {
          alert("Waiting for the opponent to finish ship placement...");
        }
      })
      .catch(error => console.error("Error finalizing placement:", error));
  }

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

  dragStart(event) {
    const shipSize = event.currentTarget.dataset.shipSize;
    const orientation = this.shipOrientations[shipSize];
    this.currentDraggedShip = { shipSize: parseInt(shipSize, 10), orientation };
    event.dataTransfer.setData("text/plain", JSON.stringify(this.currentDraggedShip));
  }

  allowDrop(event) {
    event.preventDefault();
    this.clearPreview();

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
    const valid = previewCells.every(pos => pos.x < 10 && pos.y < 10);

    previewCells.forEach(pos => {
      const previewCell = document.getElementById(`player-cell-${pos.y}-${pos.x}`);
      if (previewCell) {
        previewCell.classList.add(valid ? "bg-green-200" : "bg-red-200");
        previewCell.classList.add("preview-highlight");
      }
    });
  }

  clearPreview() {
    const previews = document.querySelectorAll(".preview-highlight");
    previews.forEach(cell => {
      cell.classList.remove("bg-green-200", "bg-red-200", "preview-highlight");
    });
  }

  dragLeave(event) {
    this.clearPreview();
  }

  dropShip(event) {
    event.preventDefault();
    this.clearPreview();

    const { shipSize, orientation } = this.currentDraggedShip || {};
    if (!shipSize) return;

    const target = event.currentTarget;
    const startX = parseInt(target.dataset.x, 10);
    const startY = parseInt(target.dataset.y, 10);

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
          this.drawShipOnBoard(startX, startY, shipSize, orientation);
          this.decrementShipCount(shipSize);
        }
      })
      .catch(error => console.error("Error placing ship:", error));
  }

  drawShipOnBoard(startX, startY, size, orientation) {
    const shipUrlValueName = orientation === "horizontal"
      ? `ship${size}UrlValue`
      : `ship${size}VerticalUrlValue`;
  
    const shipImageUrl = this[shipUrlValueName];
  
    for (let i = 0; i < size; i++) {
      const x = orientation === "horizontal" ? startX + i : startX;
      const y = orientation === "horizontal" ? startY : startY + i;
      const cell = document.getElementById(`player-cell-${y}-${x}`);
      if (cell) {
        cell.innerHTML = "";
        cell.style.backgroundImage = `url('${shipImageUrl}')`;
        cell.style.backgroundRepeat = "no-repeat";
        cell.style.backgroundColor = "transparent";

        if (size > 1) {
          if (orientation === "horizontal") {
            if (i > 0) cell.classList.add("border-l-0");
            if (i < size - 1) cell.classList.add("border-r-0");
          } else {
            if (i > 0) cell.classList.add("border-t-0");
            if (i < size - 1) cell.classList.add("border-b-0");
          }
        }
  
        if (orientation === "horizontal") {
          cell.style.backgroundSize = `${size * 40}px 40px`;
          cell.style.backgroundPosition = `-${i * 40}px 0`;
        } else {
          cell.style.backgroundSize = `40px ${size * 40}px`;
          cell.style.backgroundPosition = `0 -${i * 40}px`;
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
