import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["menu"]

  toggle() {
    this.menuTarget.classList.toggle("hidden")

    this.menuTarget.classList.toggle("opacity-0")
    this.menuTarget.classList.toggle("opacity-100")
    this.menuTarget.classList.toggle("scale-95")
    this.menuTarget.classList.toggle("scale-100")
  }
}
