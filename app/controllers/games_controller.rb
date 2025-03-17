class GamesController < ApplicationController
  skip_before_action :verify_authenticity_token
  before_action :set_game, only: [:show, :move, :state, :place_ship, :finalize_placement]

  # GET / (homepage)
  def index
    # Render a view with a “Create New Game” button.
  end

  # POST /games
  def create
    placement_deadline = 60.seconds.from_now
    @game = Game.create!(
      player1_board: Array.new(10) { Array.new(10, "empty") },
      player2_board: Array.new(10) { Array.new(10, "empty") },
      current_turn: 1,
      status: "setup",
      placement_deadline: placement_deadline
    )
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
        session[session_key] = "spectator"
      end
    end
  end

  # POST /games/:uuid/place_ship
  def place_ship
    role = session["game_#{@game.uuid}_player_role"]
    if @game.status != "setup"
      render json: { error: "Ship placement is closed." }, status: :unprocessable_entity and return
    end

    player_board = role == 1 ? @game.player1_board : @game.player2_board
    start_x = params[:x].to_i
    start_y = params[:y].to_i
    size = params[:size].to_i
    orientation = params[:orientation] # "horizontal" or "vertical"

    positions = if orientation == "horizontal"
      (start_x...(start_x + size)).map { |x| [start_y, x] }
    else
      (start_y...(start_y + size)).map { |y| [y, start_x] }
    end

    # Validate boundaries.
    unless positions.all? { |row, col| row.between?(0, 9) && col.between?(0, 9) }
      render json: { error: "Ship out of bounds." }, status: :unprocessable_entity and return
    end

    # Check for collisions.
    if positions.any? { |row, col| player_board[row][col] != "empty" }
      render json: { error: "Ship overlaps another ship." }, status: :unprocessable_entity and return
    end

    # Place the ship manually.
    positions.each { |row, col| player_board[row][col] = "ship_#{size}" }
    if role == 1
      @game.player1_board = player_board
    else
      @game.player2_board = player_board
    end

    @game.save!
    render json: { board: player_board, message: "Ship placed successfully." }
  end

  # POST /games/:uuid/finalize_placement
  def finalize_placement
    role = session["game_#{@game.uuid}_player_role"]
    if @game.status != "setup"
      render json: { error: "Ship placement already finalized." }, status: :unprocessable_entity and return
    end

    board = role == 1 ? @game.player1_board : @game.player2_board

    # For each ship type, auto-place any missing ships.
    ships_to_place.each do |size, count|
      placed_count = board.flatten.count { |cell| cell == "ship_#{size}" } / size
      missing_count = count - placed_count
      missing_count.times do
        success = place_ship_randomly(board, size)
        unless success
          render json: { error: "Failed to auto-place ship." }, status: :unprocessable_entity and return
        end
      end
    end

    # Mark player's placement as done.
    if role == 1
      @game.player1_board = board
      @game.player1_placement_done = true
    else
      @game.player2_board = board
      @game.player2_placement_done = true
    end

    @game.save!

    # If both players are done, start the game.
    if @game.player1_placement_done && @game.player2_placement_done
      @game.update!(status: "ongoing")
    end

    render json: { board: board, message: "Ship placement finalized." }
  end

  # POST /games/:uuid/move
  def move
    session_key = "game_#{@game.uuid}_player_role"
    role = session[session_key]

    unless role.is_a?(Integer)
      render json: { error: "Spectators cannot make moves." }, status: :forbidden and return
    end

    player = role.to_i

    if @game.status != "ongoing"
      render json: { error: "Game is not in progress." }, status: :unprocessable_entity and return
    end

    if player != @game.current_turn
      render json: { error: "Not your turn." }, status: :unprocessable_entity and return
    end

    x = params[:x].to_i
    y = params[:y].to_i
    board = (player == 1) ? @game.player2_board : @game.player1_board
    cell = board[y][x]

    if cell == "hit" || cell == "miss"
      render json: { error: "You already fired at that cell." }, status: :unprocessable_entity and return
    end

    game_over = false
    if cell.to_s.start_with?("ship_")
      board[y][x] = "hit"
      if board.flatten.none? { |c| c.to_s.start_with?("ship_") }
        @game.status = "finished_player#{player}_won"
        message = "Hit! You sunk all opponent's ships. Player #{player} wins!"
        game_over = true
      else
        message = "Hit!"
      end
    else
      board[y][x] = "miss"
      message = "Miss!"
      @game.current_turn = (player == 1 ? 2 : 1)
    end

    if player == 1
      @game.player2_board = board
    else
      @game.player1_board = board
    end

    @game.save!
    render json: { message: message, game: @game.slice("player1_board", "player2_board", "current_turn", "status"), game_over: game_over }
  end

  # GET /games/:uuid/state
  def state
    render json: @game.slice("player1_board", "player2_board", "current_turn", "status")
  end

  private

  def set_game
    @game = Game.find_by!(uuid: params[:uuid])
  end

  # Defines the ships configuration.
  def ships_to_place
    {
      4 => 1,
      3 => 2,
      2 => 3,
      1 => 4
    }
  end

  # Helper method to randomly place a ship of a given size.
  def place_ship_randomly(board, size)
    placed = false
    attempts = 0
    while !placed && attempts < 100
      attempts += 1
      horizontal = [true, false].sample
      if horizontal
        start_x = rand(0..(10 - size))
        start_y = rand(0..9)
        positions = (start_x...(start_x + size)).map { |x| [start_y, x] }
      else
        start_y = rand(0..(10 - size))
        start_x = rand(0..9)
        positions = (start_y...(start_y + size)).map { |y| [y, start_x] }
      end

      if positions.all? { |row, col| board[row][col] == "empty" }
        positions.each { |row, col| board[row][col] = "ship_#{size}" }
        placed = true
      end
    end
    placed
  end
end
