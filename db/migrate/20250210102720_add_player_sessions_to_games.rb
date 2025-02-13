class AddPlayerSessionsToGames < ActiveRecord::Migration[8.0]
  def change
    add_column :games, :player1_session, :string
    add_column :games, :player2_session, :string
  end
end
