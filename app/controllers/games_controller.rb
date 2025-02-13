class GamesController < ApplicationController
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
      # Only declare victory if there are no remaining ship cells.
      if board.flatten.none? { |c| c == "ship" }
        @game.status = "finished_player#{player}_won"
        message = "Hit! You sunk all opponent's ships. Player #{player} wins!"
      else
        message = "Hit!"
        # In many Battleship rules a hit lets you fire again.
        # So we are NOT switching turns on a hit.
      end
    else
      board[y][x] = "miss"
      message = "Miss!"
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

  # Define the ships to place on the board.
  # This configuration places:
  #   1 ship of length 4,
  #   2 ships of length 3,
  #   3 ships of length 2, and
  #   4 ships of length 1.
  def ships_to_place
    {
      4 => 1,
      3 => 2,
      2 => 3,
      1 => 4
    }
  end

  # Attempts to place a ship of the given size on the board.
  # Returns true if placed; false if not.
  def place_ship(board, size)
    placed = false
    attempts = 0
    while !placed && attempts < 100
      attempts += 1
      horizontal = [ true, false ].sample
      if horizontal
        start_x = rand(0..(10 - size))
        start_y = rand(0..9)
        positions = (start_x...(start_x + size)).map { |x| [ start_y, x ] }
      else
        start_y = rand(0..(10 - size))
        start_x = rand(0..9)
        positions = (start_y...(start_y + size)).map { |y| [ y, start_x ] }
      end

      # Check that every chosen cell is empty.
      if positions.all? { |row, col| board[row][col] == "empty" }
        positions.each { |row, col| board[row][col] = "ship" }
        placed = true
      end
    end
    placed
  end

  # Creates a 10x10 board filled with "empty" and places the full set of ships.
  def initial_board
    board = Array.new(10) { Array.new(10, "empty") }
    ships_to_place.each do |size, count|
      count.times do
        success = place_ship(board, size)
        # If we fail to place a ship after many attempts, restart the board.
        unless success
          return initial_board
        end
      end
    end
    board
  end
end
