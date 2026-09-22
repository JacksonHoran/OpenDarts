// Thin client for the darts tracking API. All calls fail soft so gameplay
// never breaks if the backend is unavailable.

export async function recordThrow(payload) {
  try {
    await fetch('/api/throws', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // tracking is best-effort; ignore network errors
  }
}

export async function fetchPlayers() {
  try {
    const res = await fetch('/api/players')
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export async function createPlayer(name) {
  try {
    const res = await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function fetchThrows({ player = 'all', mode = 'all' } = {}) {
  try {
    const params = new URLSearchParams()
    if (player && player !== 'all') params.set('player', player)
    if (mode && mode !== 'all') params.set('mode', mode)
    const res = await fetch(`/api/throws?${params.toString()}`)
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}
