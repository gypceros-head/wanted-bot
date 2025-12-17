Rails.application.routes.draw do
  devise_for :users
  get "home/index"
  get "/terms", to: "pages#terms", as: :terms
  get "/privacy", to: "pages#privacy", as: :privacy

  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/*
  get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker
  get "manifest" => "rails/pwa#manifest", as: :pwa_manifest

  # Defines the root path route ("/")
  root "home#index"

  resources :posts do
    collection do
      get :mine
    end

    member do
      delete :destroy_image
      patch  :toggle_publish
    end

    resources :comments, only: %i[create destroy]
    resource :bookmark, only: %i[create destroy]
  end

  resources :blueprints, only: %i[new create edit update show] do
    member do
      post :preview_image
    end
  end
end
