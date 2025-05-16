import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    noSuitableGames: String,
    findingMatch:    String,
    joinLabel:       String
  }

  connect() {
    this.refresh()
    this.timer = setInterval(() => this.refresh(), 5000)
  }

  disconnect() {
    clearInterval(this.timer)
  }

  refresh() {
    fetch("/games/open")
      .then(r => r.json())
      .then(rows => {
        const tbody = this.element.querySelector("tbody")
        tbody.innerHTML = ""

        rows.forEach(r => {
          tbody.insertAdjacentHTML("beforeend", `
            <tr class="hover:bg-white/10">
              <td class="px-4 py-3 text-sm">${r.host}</td>
              <td class="px-4 py-3 text-sm">${r.rating}</td>
              <td class="px-4 py-3 text-sm">${r.created}</td>
              <td class="px-4 py-3">
                <a 
                  href="/games/${r.uuid}" 
                  data-turbo="false" 
                  class="bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded text-sm font-semibold"
                >
                  ${this.joinLabelValue}
                </a>
              </td>
            </tr>
          `)
        })

        if (rows.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="4" class="px-4 py-4 text-center text-sm">
                ${this.noSuitableGamesValue}
              </td>
            </tr>
          `
        }
      })
  }

  quickMatch(event) {
    event.preventDefault()
    const btn = event.currentTarget
    btn.disabled = true
    btn.innerHTML = `
      <svg class="animate-spin h-5 w-5 mr-2 inline" xmlns="http://www.w3.org/2000/svg"
           fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10"
                stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8"></path>
      </svg>
      ${this.findingMatchValue}
    `

    fetch("/games/matchmaking", {
      method: "POST",
      headers: { "X-CSRF-Token": document.querySelector("[name=csrf-token]").content }
    })
      .then(r => r.json())
      .then(data => {
        if (data.wait) {
          this.pollMatch(data.uuid)
        } else {
          window.location = `/games/${data.uuid}`
        }
      })
  }

  pollMatch(uuid) {
    this.matchTimer = setInterval(() => {
      fetch(`/games/${uuid}/state`, { headers: { Accept: "application/json" } })
        .then(r => r.json())
        .then(game => {
          if (game.players === 2) {
            clearInterval(this.matchTimer)
            window.location = `/games/${uuid}`
          }
        })
    }, 3000)
  }
}
