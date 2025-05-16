class Match < ApplicationRecord
  belongs_to :game
  belongs_to :player1, polymorphic: true
  belongs_to :player2, polymorphic: true
  belongs_to :winner,  polymorphic: true

  scope :recent, -> { order(finished_at: :desc) }
end
