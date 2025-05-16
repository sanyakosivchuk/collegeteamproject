Match.delete_all
Game.delete_all
User.delete_all

puts "Creating users..."
steve = User.create!(
  email: "steve@apple.com",
  password: "password",
  rating: 1000
)

users = (80..120).map do |i|
  User.create!(
    email:    "player#{i}@example.com",
    password: "password",
    rating:   rand(800..1200)
  )
end

puts "Creating matches for steve@apple.com..."

50.times do
  opponent = users.sample
  players  = [ steve, opponent ].shuffle
  winner   = players.sample
  status   = (winner == players[0]) ? "finished_player1_won" : "finished_player2_won"

  game = Game.create!(
    player1_board:     Array.new(10) { Array.new(10, "empty") },
    player2_board:     Array.new(10) { Array.new(10, "empty") },
    current_turn:      1,
    status:            status,
    placement_deadline: 1.hour.ago
  )

  Match.create!(
    game:        game,
    player1:     players[0],
    player2:     players[1],
    winner:      winner,
    finished_at: rand(1..30).days.ago
  )

  ActiveRecord::Base.transaction do
    players[0].reload.apply_result(players[1].rating, (winner == players[0] ? 1 : 0))
    players[1].reload.apply_result(players[0].rating, (winner == players[1] ? 1 : 0))
  end
end

puts "✅ Seeding done!"
