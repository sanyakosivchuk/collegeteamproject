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
        if (data.game.status.startsWith("finished")) {
          this.showGameOverButtons(data.game.status);
          clearInterval(this.pollInterval);
        }
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
      if (game.status.startsWith("finished")) {
        this.showGameOverButtons(game.status);
        clearInterval(this.pollInterval);
      }
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
    const ownBoard = (this.playerValue === 1) ? game.player1_board : game.player2_board;
    const opponentBoard = (this.playerValue === 1) ? game.player2_board : game.player1_board;
  
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const cellValue = ownBoard[row][col];
      const cellDiv = document.getElementById(`player-cell-${row}-${col}`);

      let newClass = "w-10 h-10 flex items-center justify-center ";
      let borderClasses = "border border-white ";
      let bgClass = "bg-blue-500 ";
      let textContent = "";

      if (typeof cellValue === "string" && cellValue.startsWith("ship_")) {
        const length = parseInt(cellValue.split("_")[1], 10);

        switch (length) {
          case 1:
            bgClass = "bg-green-300 ";
            break;
          case 2:
            bgClass = "bg-yellow-300 ";
            break;
          case 3:
            bgClass = "bg-orange-300 ";
            break;
          case 4:
            bgClass = "bg-purple-300 ";
            break;
          default:
            bgClass = "bg-blue-300 ";
        }

        textContent = "S";

        if (col > 0 && ownBoard[row][col - 1].startsWith("ship_")) {
          borderClasses += "border-l-0 ";
        }
        if (col < 9 && ownBoard[row][col + 1].startsWith("ship_")) {
          borderClasses += "border-r-0 ";
        }
        if (row > 0 && ownBoard[row - 1][col].startsWith("ship_")) {
          borderClasses += "border-t-0 ";
        }
        if (row < 9 && ownBoard[row + 1][col].startsWith("ship_")) {
          borderClasses += "border-b-0 ";
        }
      }
      else if (cellValue === "hit") {
        bgClass = "bg-red-500 ";
        textContent = "X";
      }
      else if (cellValue === "miss") {
        bgClass = "bg-gray-500 ";
        textContent = "O";
      }

      cellDiv.className = newClass + borderClasses + bgClass;
      cellDiv.textContent = textContent;
    }
    }

    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        const cellValue = opponentBoard[row][col];
        const cellDiv = document.getElementById(`opponent-cell-${row}-${col}`);
  
        let newClass = "w-10 h-10 flex items-center justify-center cursor-pointer ";
        let borderClasses = "border border-white ";
        let bgClass = "bg-blue-500 ";
        let textContent = "";
  
        if (cellValue === "hit") {
          bgClass = "bg-red-500 ";
          textContent = "X";
        }
        else if (cellValue === "miss") {
          bgClass = "bg-gray-500 ";
          textContent = "O";
        }
        else {
          bgClass += "hover:bg-blue-400 ";
        }
  
        cellDiv.className = newClass + borderClasses + bgClass;
        cellDiv.textContent = textContent;
      }
    }
  
    const turnInfo = document.getElementById("turn-info");
    if (turnInfo) {
      turnInfo.textContent = `Current turn: Player ${game.current_turn}`;
    }
  }
  
  showGameOverButtons(status) {
    const container = document.createElement("div");
    container.className = "flex flex-col items-center gap-4 mt-4";

    const winnerText = document.createElement("h2");
    winnerText.className = "text-xl font-bold text-center";
    if (status.includes("player1_won")) {
      winnerText.textContent = "Game ended! Player 1 won!";
    } else if (status.includes("player2_won")) {
      winnerText.textContent = "Game ended! Player 2 won!";
    }

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "flex gap-4";

    const homeButton = document.createElement("a");
    homeButton.href = "/";
    homeButton.innerText = "Main menu";
    homeButton.className = "bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600";

    buttonContainer.appendChild(homeButton);
    container.appendChild(winnerText);
    container.appendChild(buttonContainer);

    document.getElementById("message").appendChild(container);
  }
}
