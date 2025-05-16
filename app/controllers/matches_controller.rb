class MatchesController < ApplicationController
  before_action :authenticate_user!

  def index
    @matches = current_user
                 .matches_as_p1.or(current_user.matches_as_p2)
                 .includes(:winner)
                 .recent
  end
end
