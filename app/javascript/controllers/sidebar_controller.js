import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["panel"]

  connect() {
    this._outsideClick = this._outsideClick.bind(this)
    document.addEventListener("click", this._outsideClick)
  }

  disconnect() {
    document.removeEventListener("click", this._outsideClick)
  }

  toggle(event) {
    event.stopPropagation()
    this.panelTarget.classList.toggle("-translate-x-full")
    this.panelTarget.classList.toggle("translate-x-0")
  }

  _outsideClick(event) {
    if (!this.panelTarget.classList.contains("translate-x-0")) return
    if (this.panelTarget.contains(event.target)) return
    this.panelTarget.classList.remove("translate-x-0")
    this.panelTarget.classList.add("-translate-x-full")
  }
}
