Rails.application.routes.draw do
  resources :games, param: :uuid, only: [:index, :show, :create] do
    member do
      post :move
      get :state
    end
  end
  root "games#index"
end
