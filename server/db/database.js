import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { runDatabaseMigrations } from './migrations.js'

const databasePath = fileURLToPath(
  new URL('./json-tool.sqlite', import.meta.url),
)

export function createDatabase(filePath = databasePath) {
  mkdirSync(dirname(filePath), { recursive: true })
  const database = new DatabaseSync(filePath)
  runDatabaseMigrations(database)
  return database
}
