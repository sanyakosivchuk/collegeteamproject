class AddPlayersToGames < ActiveRecord::Migration[8.0]
  def change
    add_reference :games, :player1, polymorphic: true, null: true
    add_reference :games, :player2, polymorphic: true, null: true
  end
end
