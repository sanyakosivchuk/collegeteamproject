class ApplicationController < ActionController::Base
  before_action :authenticate_user!
  before_action :set_locale
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  def after_sign_out_path_for(resource_or_scope)
    new_user_session_path
  end

  def set_locale
    I18n.locale = session[:locale] || I18n.default_locale
  end
end
