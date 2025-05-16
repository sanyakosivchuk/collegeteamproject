# Pin npm packages by running ./bin/importmap

pin "application"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "@hotwired--stimulus.js" # @3.2.2
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin_all_from "app/javascript/controllers", under: "controllers"
pin "stimulus" # @3.2.2
pin "i18n-js", to: "https://cdn.jsdelivr.net/npm/i18n-js@3.11.5/dist/i18n.js"
pin "i18n/translations", to: "translations.js", preload: true
