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

ActiveRecord::Schema[8.0].define(version: 2025_03_17_102120) do
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
end
