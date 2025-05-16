class LeaderboardsController < ApplicationController
  def index
    @users = User.order(rating: :desc).limit(1000)
  end
end
