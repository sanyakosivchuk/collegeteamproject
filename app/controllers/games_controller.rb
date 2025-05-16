class GamesController < ApplicationController
  skip_before_action :verify_authenticity_token
  before_action :set_game, only: [ :show, :move, :state, :place_ship, :finalize_placement ]

  def index
  end

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
    @game.update!(player1_session: session.id, player1: current_user)
    redirect_to game_path(@game)
  end

  def show
    session_key = "game_#{@game.uuid}_player_role"

    unless session[session_key]
      if @game.player1_session.nil?
        session[session_key] = 1
        @game.update!(player1_session: session.id, player1: current_user)
      elsif @game.player2_session.nil?
        session[session_key] = 2
        @game.update!(player2_session: session.id, player2: current_user)
      else
        session[session_key] = "spectator"
      end
    end
  end

  def place_ship
    role = session["game_#{@game.uuid}_player_role"]
    if @game.status != "setup"
      render json: { error: "Ship placement is closed." }, status: :unprocessable_entity and return
    end

    player_board = role == 1 ? @game.player1_board : @game.player2_board
    start_x = params[:x].to_i
    start_y = params[:y].to_i
    size = params[:size].to_i
    orientation = params[:orientation]

    positions = if orientation == "horizontal"
      (start_x...(start_x + size)).map { |x| [ start_y, x ] }
    else
      (start_y...(start_y + size)).map { |y| [ y, start_x ] }
    end

    unless positions.all? { |row, col| row.between?(0, 9) && col.between?(0, 9) }
      render json: { error: "Ship out of bounds." }, status: :unprocessable_entity and return
    end

    if positions.any? { |row, col| player_board[row][col] != "empty" }
      render json: { error: "Ship overlaps another ship." }, status: :unprocessable_entity and return
    end

    positions.each do |row, col|
      adjacent_cells(row, col).each do |adj_row, adj_col|
        next if positions.include?([ adj_row, adj_col ])
        if player_board[adj_row][adj_col] != "empty"
          render json: { error: "Ships cannot be adjacent to one another." }, status: :unprocessable_entity and return
        end
      end
    end

    positions.each { |row, col| player_board[row][col] = "ship_#{size}" }
    if role == 1
      @game.player1_board = player_board
    else
      @game.player2_board = player_board
    end

    @game.save!
    render json: { board: player_board, message: "Ship placed successfully." }
  end

  def finalize_placement
    role = session["game_#{@game.uuid}_player_role"]
    if @game.status != "setup"
      render json: { error: "Ship placement already finalized." }, status: :unprocessable_entity and return
    end

    board = role == 1 ? @game.player1_board : @game.player2_board

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

    if role == 1
      @game.player1_board = board
      @game.player1_placement_done = true
    else
      @game.player2_board = board
      @game.player2_placement_done = true
    end

    if Time.current > @game.placement_deadline || params[:force] == "true"
      if !@game.player1_placement_done
        @game.player1_board = auto_finalize_board(@game.player1_board)
        @game.player1_placement_done = true
      end
      if !@game.player2_placement_done
        @game.player2_board = auto_finalize_board(@game.player2_board)
        @game.player2_placement_done = true
      end
    end

    @game.save!

    if @game.player1_placement_done && @game.player2_placement_done
      @game.update!(status: "ongoing")
    end

    render json: { board: board, message: "Ship placement finalized.", status: @game.status }
  end

  def adjacent_cells(row, col)
    neighbors = []
    (-1..1).each do |dr|
      (-1..1).each do |dc|
        next if dr == 0 && dc == 0
        new_row = row + dr
        new_col = col + dc
        if new_row.between?(0, 9) && new_col.between?(0, 9)
          neighbors << [ new_row, new_col ]
        end
      end
    end
    neighbors
  end

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
      board[y][x] = "hit_#{cell}"
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

  def state
    render json: @game.slice("player1_board", "player2_board", "current_turn", "status")
  end

  private

  def set_game
    @game = Game.find_by!(uuid: params[:uuid])
  end

  def ships_to_place
    {
      4 => 1,
      3 => 2,
      2 => 3,
      1 => 4
    }
  end

  def place_ship_randomly(board, size)
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

      next unless positions.all? { |row, col| board[row][col] == "empty" }

      valid_placement = positions.all? do |row, col|
        adjacent_cells(row, col).all? do |adj_row, adj_col|
          positions.include?([ adj_row, adj_col ]) || board[adj_row][adj_col] == "empty"
        end
      end

      if valid_placement
        positions.each { |row, col| board[row][col] = "ship_#{size}" }
        placed = true
      end
    end
    placed
  end

  def auto_finalize_board(board)
    ships_to_place.each do |size, count|
      placed_count = board.flatten.count { |cell| cell == "ship_#{size}" } / size
      missing_count = count - placed_count
      missing_count.times do
        success = place_ship_randomly(board, size)
      end
    end
    board
  end
end
