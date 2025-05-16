require "rails_helper"

RSpec.describe User, type: :model do
  let(:player)   { create(:user, rating: 1000) }
  let(:opponent) { create(:user, :weak) }

  describe "#expected_score" do
    it "is 0.5 when ratings are equal" do
      player.update!(rating: 1000)
      expect(player.expected_score(1000)).to eq(0.5)
    end
    it "is less than 0.5 when opponent is stronger" do
      expect(player.expected_score(1200)).to be < 0.5
    end
    it "is greater than 0.5 when opponent is weaker" do
      expect(player.expected_score(800)).to be > 0.5
    end
  end

  describe "#apply_result" do
    it "increases rating on win" do
      expect {
        player.apply_result(opponent.rating, 1)
      }.to change { player.rating }.by_at_least(1)
    end

    it "decreases rating on loss" do
      expect {
        player.apply_result(opponent.rating, 0)
      }.to change { player.rating }.by_at_most(-1)
    end
  end
end
