Rails.application.routes.draw do
  devise_for :users

  root "games#index"

  resources :leaderboards, only: [ :index ]
  resources :matches, only: [ :index ]
  post "/locale", to: "locales#update", as: :locale

  resources :games, param: :uuid, only: [ :index, :show, :create ] do
    member do
      post   :move
      post   :place_ship
      post   :finalize_placement
      get    :state
    end
    collection do
      post :matchmaking
      get  :open
    end
  end
end
