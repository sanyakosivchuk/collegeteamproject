class LocalesController < ApplicationController
  def update
    session[:locale] = params[:locale]
    redirect_back fallback_location: root_path
  end
end