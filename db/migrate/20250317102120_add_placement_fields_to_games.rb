class AddPlacementFieldsToGames < ActiveRecord::Migration[8.0]
  def change
    add_column :games, :placement_deadline, :datetime
    add_column :games, :player1_placement_done, :boolean, default: false
    add_column :games, :player2_placement_done, :boolean, default: false
  end
end
