class GamesController < ApplicationController
    # For simplicity during testing we’re skipping CSRF protection.
    skip_before_action :verify_authenticity_token
    before_action :set_game, only: [ :show, :move, :state ]

    # GET / (homepage)
    def index
      # Render a view with a “Create New Game” button.
    end

    # POST /games
    def create
      @game = Game.create!(
        player1_board: initial_board,
        player2_board: initial_board,
        current_turn: 1,
        status: "ongoing"
      )
      # When the game is created, assign the creator’s session as Player 1.
      session["game_#{@game.uuid}_player_role"] = 1
      @game.update!(player1_session: session.id)
      redirect_to game_path(@game)
    end

    # GET /games/:uuid
    def show
      # Use a session key unique per game.
      session_key = "game_#{@game.uuid}_player_role"
      unless session[session_key]
        if @game.player1_session.nil?
          session[session_key] = 1
          @game.update!(player1_session: session.id)
        elsif @game.player2_session.nil?
          session[session_key] = 2
          @game.update!(player2_session: session.id)
        else
          # More than two visitors are spectators.
          session[session_key] = "spectator"
        end
      end
      # Render the HTML view (see sample below).
    end

    # POST /games/:uuid/move
    def move
      session_key = "game_#{@game.uuid}_player_role"
      role = session[session_key]

      # Only players (Player 1 or 2) can fire.
      unless role.is_a?(Integer)
        render json: { error: "Spectators cannot make moves." }, status: :forbidden and return
      end

      player = role.to_i

      if @game.status != "ongoing"
        render json: { error: "Game is already over." }, status: :unprocessable_entity and return
      end

      if player != @game.current_turn
        render json: { error: "Not your turn." }, status: :unprocessable_entity and return
      end

      # Get the coordinates from the JSON payload.
      x = params[:x].to_i
      y = params[:y].to_i

      # Determine which board is being attacked:
      # Player 1 fires on player2_board; Player 2 fires on player1_board.
      board = (player == 1) ? @game.player2_board : @game.player1_board
      cell = board[y][x]

      if cell == "hit" || cell == "miss"
        render json: { error: "You already fired at that cell." }, status: :unprocessable_entity and return
      end

      if cell == "ship"
        board[y][x] = "hit"
        @game.status = "finished_player#{player}_won"
        message = "Hit! You sunk your opponent's ship. Player #{player} wins!"
      else
        board[y][x] = "miss"
        message = "Miss!"
        # Switch turn to the other player.
        @game.current_turn = (player == 1 ? 2 : 1)
      end

      # Save the updated board.
      if player == 1
        @game.player2_board = board
      else
        @game.player1_board = board
      end

      @game.save!

      render json: { message: message, game: @game.slice("player1_board", "player2_board", "current_turn", "status") }
    end

    # GET /games/:uuid/state
    # A simple endpoint to allow polling for game updates.
    def state
      render json: @game.slice("player1_board", "player2_board", "current_turn", "status")
    end

    private

    def set_game
      @game = Game.find_by!(uuid: params[:uuid])
    end

    # Creates a 10x10 board filled with "empty", and places one "ship" at random.
    def initial_board
      board = Array.new(10) { Array.new(10, "empty") }
      ship_x = rand(10)
      ship_y = rand(10)
      board[ship_y][ship_x] = "ship"
      board
    end
end
