class AddTurnTimerToGames < ActiveRecord::Migration[8.0]
  def change
    add_column :games, :turn_started_at, :datetime
    add_column :games, :player1_missed_turns, :integer, default: 0
    add_column :games, :player2_missed_turns, :integer, default: 0
  end
end
