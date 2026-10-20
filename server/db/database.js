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
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS schema_history_latest
      ON schema_history(schema_id, id DESC);
  `)
  return database
}
