import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static values = { uuid: String, player: Number }
  
  connect() {
    console.log("Game controller connected.");
    console.log("Game UUID:", this.uuidValue, "Player:", this.playerValue);
    // Poll the game state every 3 seconds to update both boards.
    this.pollInterval = setInterval(() => this.pollGameState(), 3000);
  }
  
  disconnect() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
  
  fire(event) {
    // Get the board coordinates from the clicked cell.
    const x = event.currentTarget.dataset.x;
    const y = event.currentTarget.dataset.y;
    console.log(`Firing at cell (${x}, ${y})`);

    fetch(`/games/${this.uuidValue}/move`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ x: x, y: y })
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        this.displayMessage(data.error, "red");
      } else {
        this.displayMessage(data.message, "green");
        this.updateBoard(data.game);
      }
    })
    .catch(error => {
      console.error("Error:", error);
      this.displayMessage("An error occurred.", "red");
    });
  }
  
  pollGameState() {
    fetch(`/games/${this.uuidValue}/state`, {
      headers: { "Accept": "application/json" }
    })
    .then(response => response.json())
    .then(game => {
      this.updateBoard(game);
    })
    .catch(error => console.error("Polling error:", error));
  }
  
  displayMessage(message, color) {
    const messageDiv = document.getElementById("message");
    if (messageDiv) {
      messageDiv.textContent = message;
      messageDiv.style.color = color;
    }
  }
  
  updateBoard(game) {
    // Determine which board belongs to the current player.
    // For Player 1: ownBoard is game.player1_board, opponentBoard is game.player2_board.
    // For Player 2: ownBoard is game.player2_board, opponentBoard is game.player1_board.
    const ownBoard = (this.playerValue === 1) ? game.player1_board : game.player2_board;
    const opponentBoard = (this.playerValue === 1) ? game.player2_board : game.player1_board;

    // Update your own board (revealing ships, hits, and misses).
    for (let row = 0; row < ownBoard.length; row++) {
      for (let col = 0; col < ownBoard[row].length; col++) {
        const cellValue = ownBoard[row][col];
        const cellDiv = document.getElementById(`player-cell-${row}-${col}`);
        let newClass = "w-10 h-10 border flex items-center justify-center ";
        if (cellValue === "ship") {
          newClass += "bg-yellow-300";
          cellDiv.textContent = "S";
        } else if (cellValue === "hit") {
          newClass += "bg-red-500";
          cellDiv.textContent = "X";
        } else if (cellValue === "miss") {
          newClass += "bg-gray-500";
          cellDiv.textContent = "O";
        } else {
          newClass += "bg-blue-500";
          cellDiv.textContent = "";
        }
        cellDiv.className = newClass;
      }
    }

    // Update the opponent's board (only show hit or miss; do not reveal ships).
    for (let row = 0; row < opponentBoard.length; row++) {
      for (let col = 0; col < opponentBoard[row].length; col++) {
        const cellValue = opponentBoard[row][col];
        const cellDiv = document.getElementById(`opponent-cell-${row}-${col}`);
        let newClass = "w-10 h-10 border flex items-center justify-center cursor-pointer ";
        if (cellValue === "hit") {
          newClass += "bg-red-500";
          cellDiv.textContent = "X";
        } else if (cellValue === "miss") {
          newClass += "bg-gray-500";
          cellDiv.textContent = "O";
        } else {
          newClass += "bg-blue-500 hover:bg-blue-400";
          cellDiv.textContent = "";
        }
        cellDiv.className = newClass;
      }
    }

    // Update turn information.
    const turnInfo = document.getElementById("turn-info");
    if (turnInfo) {
      turnInfo.textContent = `Current turn: Player ${game.current_turn}`;
    }
  }
}
