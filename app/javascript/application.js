import I18n from "i18n-js"
import en from "locales/en.json"
import uk from "locales/uk.json"

I18n.translations = { en, uk }
I18n.locale       = document.documentElement.lang || "en"
window.I18n       = I18n
// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails"
import "controllers"
