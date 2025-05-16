FactoryBot.define do
  factory :match do
    association :game
    association :player1, factory: :user
    association :player2, factory: :user
    association :winner,  factory: :user
    finished_at { Time.current }
  end
end
