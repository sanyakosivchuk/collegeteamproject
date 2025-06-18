import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static values = {
    uuid: String,
    player: Number,
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
    console.log("Game controller connected.");
    console.log("Game UUID:", this.uuidValue, "Player:", this.playerValue);
    this.pollInterval = setInterval(() => this.pollGameState(), 3000);
    this.timerInterval = setInterval(() => this.updateTimer(), 1000);
  }
  
  disconnect() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.timerInterval) clearInterval(this.timerInterval);
  }
  
  fire(event) {
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
          clearInterval(this.timerInterval);
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
      this.game = game;
      this.updateBoard(game);
      if (game.status.startsWith("finished")) {
        this.showGameOverButtons(game.status);
        clearInterval(this.pollInterval);
        clearInterval(this.timerInterval);
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
  
        if (typeof cellValue === "string" &&
          (cellValue.startsWith("ship_") || cellValue.startsWith("hit_ship_"))) {
        
        const baseValue = cellValue.startsWith("hit_ship_")
          ? cellValue.replace("hit_", "")
          : cellValue;

        const length = parseInt(baseValue.split("_")[1], 10);
        const isHorizontal = (col < 9 && ownBoard[row][col + 1]?.includes(baseValue)) ||
                              (col > 0 && ownBoard[row][col - 1]?.includes(baseValue));

        const shipImageUrl = isHorizontal
          ? this[`ship${length}UrlValue`]
          : this[`ship${length}VerticalUrlValue`];

        let indexInShip = 0;
        if (isHorizontal) {
          let i = col;
          while (i > 0 && ownBoard[row][i - 1]?.includes(baseValue)) {
            indexInShip++;
            i--;
          }
        } else {
          let i = row;
          while (i > 0 && ownBoard[i - 1][col]?.includes(baseValue)) {
            indexInShip++;
            i--;
          }
        }

        const isSameShip = (val) =>
          typeof val === "string" && val.includes(baseValue);

        let borderClasses = "border border-white ";
        if (length > 1) {
          if (col > 0 && isSameShip(ownBoard[row][col - 1])) borderClasses += "border-l-0 ";
          if (col < 9 && isSameShip(ownBoard[row][col + 1])) borderClasses += "border-r-0 ";
          if (row > 0 && isSameShip(ownBoard[row - 1][col])) borderClasses += "border-t-0 ";
          if (row < 9 && isSameShip(ownBoard[row + 1][col])) borderClasses += "border-b-0 ";
        }

        cellDiv.className = "w-10 h-10 flex items-center justify-center " + borderClasses + " relative z-10";
        cellDiv.style.opacity = "1";
        cellDiv.style.backgroundImage = `url('${shipImageUrl}')`;
        cellDiv.style.backgroundRepeat = "no-repeat";
        cellDiv.style.backgroundColor = "transparent";

        if (length === 1) {
          cellDiv.style.backgroundSize = "cover";
          cellDiv.style.backgroundPosition = "center";
        } else {
          if (isHorizontal) {
            cellDiv.style.backgroundSize = `${length * 40}px 40px`;
            cellDiv.style.backgroundPosition = `-${indexInShip * 40}px 0`;
          } else {
            cellDiv.style.backgroundSize = `40px ${length * 40}px`;
            cellDiv.style.backgroundPosition = `0 -${indexInShip * 40}px`;
          }
        }

        if (cellValue.startsWith("hit")) {
          cellDiv.classList.add("relative", "cell-hit");
        }
      }

        else if (cellValue.startsWith("hit")) {
          cellDiv.classList.add("relative", "cell-hit");
        } 
        else if (cellValue === "miss") {
          bgClass = "bg-gray-500 ";
          textContent = "O";
          cellDiv.className = newClass + borderClasses + bgClass;
          cellDiv.textContent = textContent;
        } 
        else {
          cellDiv.className = newClass + borderClasses + bgClass;
          cellDiv.textContent = textContent;
        }
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
  
        if (cellValue.startsWith("hit")) {
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

  updateTimer() {
    const timerDiv = document.getElementById("timer");
    if (!this.game || !this.game.turn_started_at || this.game.status.startsWith("finished")) {
      if (timerDiv) {
        timerDiv.textContent = "";
      }
      return;
    }

    const turnStartedAt = new Date(this.game.turn_started_at).getTime();
    const now = new Date().getTime();
    const timeElapsed = Math.floor((now - turnStartedAt) / 1000);
    const timeRemaining = this.game.turn_duration - timeElapsed;

    if (timerDiv) {
      if (timeRemaining > 0) {
        timerDiv.textContent = `Time remaining: ${timeRemaining}s`;
      } else {
        timerDiv.textContent = "Time's up!";
      }
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
