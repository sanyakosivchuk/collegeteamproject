class AddRatingToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :rating, :integer
  end
end
