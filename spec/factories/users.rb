FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "player#{n}@example.com" }
    password { "secret1" }
    rating   { 1000 }

    trait :strong do
      rating { 1200 }
    end

    trait :weak do
      rating { 800 }
    end
  end
end