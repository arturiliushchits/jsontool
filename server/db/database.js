import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

const databasePath = fileURLToPath(
  new URL('./json-tool.sqlite', import.meta.url),
)

export function createDatabase(filePath = databasePath) {
  mkdirSync(dirname(filePath), { recursive: true })
  const database = new DatabaseSync(filePath)
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS schemas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      link TEXT UNIQUE NOT NULL
    );
    CREATE TABLE IF NOT EXISTS schema_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schema_id INTEGER NOT NULL REFERENCES schemas(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      label TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS schema_history_latest
      ON schema_history(schema_id, id DESC);
  `)
  const historyColumns = database
    .prepare('PRAGMA table_info(schema_history)')
    .all()
  if (!historyColumns.some((column) => column.name === 'label')) {
    database.exec('ALTER TABLE schema_history ADD COLUMN label TEXT')
  }
  database.exec(
    'UPDATE schema_history SET label = created_at WHERE label IS NULL',
  )
  database.exec(`
    UPDATE schema_history
    SET label = substr(label, 1, 10) || ' ' || substr(label, 12, 8) || ' UTC'
    WHERE label GLOB '????-??-??T??:??:??.???Z'
  `)
  return database
}
