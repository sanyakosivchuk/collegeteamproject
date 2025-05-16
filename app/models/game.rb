class Game < ApplicationRecord
  before_create :assign_uuid
  after_update :record_match_if_finished, if: :saved_change_to_status?

  def to_param
    uuid
  end

  private

  def assign_uuid
    self.uuid ||= SecureRandom.uuid
  end

  def record_match_if_finished
    return unless status&.match?(/finished_player(\d)_won/)
  
    winner_role   = Regexp.last_match(1).to_i        # 1 or 2
    loser_role    = winner_role == 1 ? 2 : 1
    winner_user   = winner_role == 1 ? player1_user : player2_user
    loser_user    = loser_role  == 1 ? player1_user : player2_user
  
    Match.create!(
      game:        self,
      player1:     player1_user,
      player2:     player2_user,
      winner:      winner_user,
      finished_at: Time.current
    )
  
    ActiveRecord::Base.transaction do
      winner_user.apply_result(loser_user.rating, 1)
      loser_user .apply_result(winner_user.rating, 0)
    end
  end
end
