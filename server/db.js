import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, 'darts.db')

export const db = new DatabaseSync(DB_PATH)

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL COLLATE NOCASE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS throws (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    game_mode TEXT,
    value INTEGER,        -- base number (0 = miss, 25 = bull)
    multiplier INTEGER,   -- 1 single, 2 double, 3 triple
    score INTEGER,        -- value * multiplier
    label TEXT,           -- e.g. "T20", "D16", "Bull (50)", "Miss"
    x REAL,               -- board-space x (-110..110), null if no location
    y REAL,               -- board-space y
    thrown_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (player_id) REFERENCES players(id)
  );

  CREATE INDEX IF NOT EXISTS idx_throws_player ON throws(player_id);
`)

// Seed the four requested profiles (idempotent).
const seed = db.prepare('INSERT OR IGNORE INTO players (name) VALUES (?)')
for (const name of ['Jackson', 'Miles', 'Anton', 'Max']) seed.run(name)

// Return an existing player id by name, creating the profile if needed.
const findPlayer = db.prepare('SELECT id, name FROM players WHERE name = ?')
const insertPlayer = db.prepare('INSERT INTO players (name) VALUES (?)')
export function upsertPlayer(name) {
  const clean = String(name || '').trim()
  if (!clean) return null
  const existing = findPlayer.get(clean)
  if (existing) return existing.id
  const info = insertPlayer.run(clean)
  return Number(info.lastInsertRowid)
}

const insertThrow = db.prepare(`
  INSERT INTO throws (player_id, game_mode, value, multiplier, score, label, x, y)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)
export function recordThrow(t) {
  const playerId = upsertPlayer(t.playerName)
  if (!playerId) return null
  const x = Number.isFinite(t.x) ? t.x : null
  const y = Number.isFinite(t.y) ? t.y : null
  const info = insertThrow.run(
    playerId,
    t.gameMode || null,
    t.value ?? null,
    t.multiplier ?? null,
    t.score ?? null,
    t.label || null,
    x,
    y,
  )
  return Number(info.lastInsertRowid)
}

export function listPlayers() {
  return db
    .prepare(`
      SELECT p.id, p.name,
             COUNT(t.id) AS throw_count,
             MAX(t.thrown_at) AS last_thrown
      FROM players p
      LEFT JOIN throws t ON t.player_id = p.id
      GROUP BY p.id
      ORDER BY p.name COLLATE NOCASE
    `)
    .all()
}

export function getThrows({ player, mode } = {}) {
  const clauses = []
  const params = []
  if (player && player !== 'all') {
    clauses.push('p.name = ?')
    params.push(player)
  }
  if (mode && mode !== 'all') {
    clauses.push('t.game_mode = ?')
    params.push(mode)
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  return db
    .prepare(`
      SELECT t.id, p.name AS player, t.game_mode AS mode,
             t.value, t.multiplier, t.score, t.label, t.x, t.y, t.thrown_at
      FROM throws t
      JOIN players p ON p.id = t.player_id
      ${where}
      ORDER BY t.thrown_at ASC, t.id ASC
    `)
    .all(...params)
}
