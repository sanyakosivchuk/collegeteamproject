import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [ "message" ]

  connect() {
    setTimeout(() => {
      this.messageTargets.forEach(el => el.classList.add("opacity-0"))
    }, 4000)

    setTimeout(() => {
      this.element.remove()
    }, 4500)
  }
}
