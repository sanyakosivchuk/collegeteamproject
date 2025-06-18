class Game < ApplicationRecord
  TURN_DURATION = 30.seconds

  before_create :assign_uuid
  after_update :record_match_if_finished, if: :saved_change_to_status?
  belongs_to :player1, class_name: "User", optional: true
  belongs_to :player2, class_name: "User", optional: true

  scope :timed_out, -> { where("turn_started_at < ?", Time.current - TURN_DURATION) }

  def to_param
    uuid
  end

  def switch_turn
    self.current_turn = (current_turn == 1 ? 2 : 1)
    self.turn_started_at = Time.current
  end

  def reset_missed_turns
    if current_turn == 1
      self.player1_missed_turns = 0
    else
      self.player2_missed_turns = 0
    end
  end

  def handle_turn_timeout
    if current_turn == 1
      self.player1_missed_turns += 1
      self.status = "finished_player2_won" if player1_missed_turns >= 2
    else
      self.player2_missed_turns += 1
      self.status = "finished_player1_won" if player2_missed_turns >= 2
    end
    switch_turn unless status.starts_with?("finished")
    save!
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
