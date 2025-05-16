class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  has_many :won_matches,  class_name: "Match", as: :winner
  has_many :matches_as_p1, class_name: "Match", as: :player1
  has_many :matches_as_p2, class_name: "Match", as: :player2

  K_FACTOR = 32.0

  def expected_score(opponent_rating)
    1.0 / (1.0 + 10 ** ((opponent_rating - rating) / 400.0))
  end

  def apply_result(opponent_rating, score)
    self.rating = (rating + K_FACTOR * (score - expected_score(opponent_rating))).round
    save!
  end
end
