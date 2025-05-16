class CreateMatches < ActiveRecord::Migration[8.0]
  def change
    create_table :matches do |t|
      t.references :game, null: false, foreign_key: true
      t.references :player1, polymorphic: true, null: false
      t.references :player2, polymorphic: true, null: false
      t.references :winner, polymorphic: true, null: false
      t.datetime :finished_at

      t.timestamps
    end
  end
end
