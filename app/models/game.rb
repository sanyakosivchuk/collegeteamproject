class Game < ApplicationRecord
  before_create :assign_uuid
  after_update :record_match_if_finished, if: :saved_change_to_status?
  belongs_to :player1, class_name: "User", optional: true
  belongs_to :player2, class_name: "User", optional: true

  def to_param
    uuid
  end

  private

  def assign_uuid
    self.uuid ||= SecureRandom.uuid
  end

  def record_match_if_finished
    return unless status =~ /finished/
    return unless player1 && player2

    winner_role = status.include?("player1") ? 1 : 2
    winner      = (winner_role == 1 ? player1 : player2)
    loser       = (winner_role == 1 ? player2 : player1)

    Match.create!(
      game: self,
      player1: player1,
      player2: player2,
      winner:  winner,
      finished_at: Time.current
    )

    ActiveRecord::Base.transaction do
      winner.apply_result(loser.rating, 1)
      loser .apply_result(winner.rating, 0)
    end
  end
end
