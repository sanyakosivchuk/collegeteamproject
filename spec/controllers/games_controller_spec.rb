require "rails_helper"

RSpec.describe GamesController, type: :controller do
  let(:game) do
    Game.create!(
      player1_board: Array.new(10) { Array.new(10, "empty") },
      player2_board: Array.new(10) { Array.new(10, "empty") },
      current_turn: 1,
      status: "setup",
      placement_deadline: 10.minutes.from_now
    )
  end

  before do
    session["game_#{game.uuid}_player_role"] = 1
    game.update!(player1_session: session.id)
  end

  describe "GET #index" do
    it "renders the index page" do
      get :index
      expect(response).to be_successful
    end
  end

  describe "POST #create" do
    it "creates a new game and redirects to the game page" do
      expect {
        post :create
      }.to change(Game, :count).by(1)
      new_game = controller.instance_variable_get(:@game)
      expect(response).to redirect_to(game_path(new_game))
    end
  end

  describe "GET #show" do
    context "when session role is not set" do
      before do
        session.delete("game_#{game.uuid}_player_role")
        game.update!(player1_session: nil, player2_session: nil)
      end

      it "assigns a player role to the session" do
        get :show, params: { uuid: game.uuid }
        assigned_role = session["game_#{game.uuid}_player_role"]
        expect(assigned_role).to be_present
        expect(assigned_role).to eq(1)
      end
    end

    context "when session role is already set" do
      it "does not change the session role" do
        session["game_#{game.uuid}_player_role"] = 1
        get :show, params: { uuid: game.uuid }
        expect(session["game_#{game.uuid}_player_role"]).to eq(1)
      end
    end
  end

  describe "POST #place_ship" do
    context "when ship placement is valid" do
      it "places the ship successfully and returns a success message" do
        post :place_ship, params: { uuid: game.uuid, x: 0, y: 0, size: 3, orientation: "horizontal" }
        json = JSON.parse(response.body)
        expect(response).to have_http_status(:success)
        expect(json["message"]).to eq("Ship placed successfully.")
        board = json["board"]
        expect(board[0][0]).to eq("ship_3")
        expect(board[0][1]).to eq("ship_3")
        expect(board[0][2]).to eq("ship_3")
      end
    end

    context "when ship is out of bounds" do
      it "returns an error message" do
        post :place_ship, params: { uuid: game.uuid, x: 8, y: 0, size: 3, orientation: "horizontal" }
        json = JSON.parse(response.body)
        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]).to eq("Ship out of bounds.")
      end
    end

    context "when ship overlaps an existing ship" do
      before do
        board = game.player1_board
        board[0][0] = "ship_3"
        game.update!(player1_board: board)
      end

      it "returns an error message" do
        post :place_ship, params: { uuid: game.uuid, x: 0, y: 0, size: 3, orientation: "horizontal" }
        json = JSON.parse(response.body)
        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]).to eq("Ship overlaps another ship.")
      end
    end

    context "when ship is adjacent to another ship" do
      before do
        board = game.player1_board
        board[4][4] = "ship_3"
        board[4][5] = "ship_3"
        board[4][6] = "ship_3"
        game.update!(player1_board: board)
      end

      it "returns an error due to adjacent placement" do
        post :place_ship, params: { uuid: game.uuid, x: 7, y: 3, size: 2, orientation: "vertical" }
        json = JSON.parse(response.body)
        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]).to eq("Ships cannot be adjacent to one another.")
      end
    end
  end

  describe "POST #finalize_placement" do
    it "finalizes the placement and auto-places missing ships" do
      board = game.player1_board
      board[0][0] = "ship_3"
      board[0][1] = "ship_3"
      board[0][2] = "ship_3"
      game.update!(player1_board: board)
      post :finalize_placement, params: { uuid: game.uuid, force: "true" }
      json = JSON.parse(response.body)
      expect(response).to have_http_status(:success)
      expect(json["message"]).to eq("Ship placement finalized.")
      expect(game.reload.status).to eq("ongoing")
    end
  end

  describe "POST #move" do
    context "when a valid move is made" do
      before do
        game.update!(status: "ongoing", current_turn: 1)
        board = game.player2_board
        board[0][0] = "ship_2"
        game.update!(player2_board: board)
        session["game_#{game.uuid}_player_role"] = 1
      end

      it "registers a hit if a ship is hit" do
        post :move, params: { uuid: game.uuid, x: 0, y: 0 }
        json = JSON.parse(response.body)
        expect(response).to have_http_status(:success)
        expect(json["message"]).to match(/Hit!/)
      end

      it "registers a miss if no ship is hit" do
        post :move, params: { uuid: game.uuid, x: 5, y: 5 }
        json = JSON.parse(response.body)
        expect(response).to have_http_status(:success)
        expect(json["message"]).to eq("Miss!")
      end
    end

    context "when it is not the player's turn" do
      before do
        game.update!(status: "ongoing", current_turn: 1)
        session["game_#{game.uuid}_player_role"] = 2
      end

      it "returns an error" do
        post :move, params: { uuid: game.uuid, x: 0, y: 0 }
        json = JSON.parse(response.body)
        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]).to eq("Not your turn.")
      end
    end
  end

  describe "GET #state" do
    it "returns the current game state" do
      get :state, params: { uuid: game.uuid }
      json = JSON.parse(response.body)
      expect(response).to have_http_status(:success)
      expect(json.keys).to include("player1_board", "player2_board", "current_turn", "status")
    end
  end
end
