# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_05_16_130658) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "games", force: :cascade do |t|
    t.string "uuid", null: false
    t.string "status", default: "waiting"
    t.json "player1_board", default: {}
    t.json "player2_board", default: {}
    t.integer "current_turn", default: 1
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "player1_session"
    t.string "player2_session"
    t.datetime "placement_deadline"
    t.boolean "player1_placement_done", default: false
    t.boolean "player2_placement_done", default: false
    t.index ["uuid"], name: "index_games_on_uuid", unique: true
  end

  create_table "matches", force: :cascade do |t|
    t.bigint "game_id", null: false
    t.string "player1_type", null: false
    t.bigint "player1_id", null: false
    t.string "player2_type", null: false
    t.bigint "player2_id", null: false
    t.string "winner_type", null: false
    t.bigint "winner_id", null: false
    t.datetime "finished_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["game_id"], name: "index_matches_on_game_id"
    t.index ["player1_type", "player1_id"], name: "index_matches_on_player1"
    t.index ["player2_type", "player2_id"], name: "index_matches_on_player2"
    t.index ["winner_type", "winner_id"], name: "index_matches_on_winner"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "rating"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "matches", "games"
end
