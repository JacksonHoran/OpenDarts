import express from 'express'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'
import { recordThrow, listPlayers, getThrows, upsertPlayer } from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.API_PORT || 3001

const app = express()
app.use(express.json())

// List player profiles with throw counts.
app.get('/api/players', (req, res) => {
  res.json(listPlayers())
})

// Create / ensure a player profile exists.
app.post('/api/players', (req, res) => {
  const id = upsertPlayer(req.body?.name)
  if (!id) return res.status(400).json({ error: 'name required' })
  res.json({ id, name: String(req.body.name).trim() })
})

// Record one dart throw.
app.post('/api/throws', (req, res) => {
  const id = recordThrow(req.body || {})
  if (!id) return res.status(400).json({ error: 'playerName required' })
  res.json({ id })
})

// Fetch throws (optionally filtered by ?player= and ?mode=) for the heatmap.
app.get('/api/throws', (req, res) => {
  res.json(getThrows({ player: req.query.player, mode: req.query.mode }))
})

// In production, serve the built frontend.
const dist = join(__dirname, '..', 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (req, res) => res.sendFile(join(dist, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`[darts] API listening on http://localhost:${PORT}`)
})
