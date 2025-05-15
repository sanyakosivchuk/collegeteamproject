Rails.application.routes.draw do
  devise_for :users

  root "games#index"

  resources :games, param: :uuid, only: [:index, :show, :create] do
    member do
      post   :move
      post   :place_ship
      post   :finalize_placement
      get    :state
    end
  end
end
