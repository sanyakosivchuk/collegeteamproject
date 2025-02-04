class CreateGames < ActiveRecord::Migration[8.0]
  def change
    create_table :games do |t|
      t.string :uuid, null: false
      t.string :status, default: "waiting"
      t.json :player1_board, default: {}
      t.json :player2_board, default: {}
      t.integer :current_turn, default: 1
      t.timestamps
    end

    add_index :games, :uuid, unique: true
  end
end
