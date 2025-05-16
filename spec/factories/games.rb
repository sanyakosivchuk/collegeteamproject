FactoryBot.define do
  factory :game do
    sequence(:uuid) { SecureRandom.uuid }
    player1_board    { Array.new(10) { Array.new(10, "empty") } }
    player2_board    { Array.new(10) { Array.new(10, "empty") } }
    current_turn     { 1 }
    status           { "setup" }
    placement_deadline { 1.hour.from_now }

    trait :ongoing do
      status { "ongoing" }
      placement_deadline { 1.hour.ago }
    end

    trait :finished_player1_won do
      status { "finished_player1_won" }
    end

    trait :with_players do
      association :player1, factory: :user
      association :player2, factory: :user
    end
  end
end
