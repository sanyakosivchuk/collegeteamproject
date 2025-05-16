require "rails_helper"

RSpec.describe Game, type: :model do
  let(:p1) { create(:user, rating: 1000) }
  let(:p2) { create(:user, rating: 1000) }

  let(:game) do
    create(
      :game,
      player1:          p1,
      player2:          p2,
      status:           "ongoing",
      player1_board:    Array.new(10) { Array.new(10, "empty") },
      player2_board:    Array.new(10) { Array.new(10, "empty") },
      current_turn:     1,
      placement_deadline: 1.hour.ago
    )
  end

  describe "#record_match_if_finished" do
    it "creates a Match and adjusts both players' ratings when status flips to finished" do
      expect {
        game.update!(status: "finished_player1_won")
      }.to change(Match, :count).by(1)
        .and change { p1.reload.rating }.by_at_least(1)
        .and change { p2.reload.rating }.by_at_most(-1)
    end
  end
end
