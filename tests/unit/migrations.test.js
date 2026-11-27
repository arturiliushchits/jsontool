import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import {
  runDatabaseMigrations,
  runDataMigration,
  runDdlMigration,
  runIndexMigration,
} from '../../server/db/migrations.js'

test('database migrations are idempotent', () => {
  const database = new DatabaseSync(':memory:')
  try {
    runDatabaseMigrations(database)
    runDatabaseMigrations(database)

    const tables = database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('schemas', 'schema_history')",
      )
      .all()
    assert.deepEqual(tables.map(({ name }) => name).sort(), [
      'schema_history',
      'schemas',
    ])
  } finally {
    database.close()
  }
})

test('DDL migration upgrades a legacy schema history table', () => {
  const database = new DatabaseSync(':memory:')
  try {
    database.exec(`
      CREATE TABLE schemas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        link TEXT UNIQUE NOT NULL
      );
      CREATE TABLE schema_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schema_id INTEGER NOT NULL REFERENCES schemas(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    runDdlMigration(database)

    const columns = database.prepare('PRAGMA table_info(schema_history)').all()
    assert.equal(
      columns.some(({ name }) => name === 'label'),
      true,
    )
  } finally {
    database.close()
  }
})

test('data migration backfills labels and normalizes ISO labels', () => {
  const database = new DatabaseSync(':memory:')
  try {
    runDdlMigration(database)
    database.prepare('INSERT INTO schemas (link) VALUES (?)').run('test')
    const { id: schemaId } = database
      .prepare("SELECT id FROM schemas WHERE link = 'test'")
      .get()
    database
      .prepare(
        'INSERT INTO schema_history (schema_id, content, label) VALUES (?, ?, ?)',
      )
      .run(schemaId, '{}', null)
    database
      .prepare(
        'INSERT INTO schema_history (schema_id, content, label) VALUES (?, ?, ?)',
      )
      .run(schemaId, '{}', '2026-11-27T12:34:56.789Z')

    runDataMigration(database)

    const labels = database
      .prepare('SELECT label FROM schema_history ORDER BY id')
      .all()
      .map(({ label }) => label)
    assert.match(labels[0], /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC$/)
    assert.equal(labels[1], '2026-11-27 12:34:56 UTC')
  } finally {
    database.close()
  }
})

test('index migration creates the latest-history index repeatedly', () => {
  const database = new DatabaseSync(':memory:')
  try {
    runDdlMigration(database)
    runIndexMigration(database)
    runIndexMigration(database)

    const indexes = database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'schema_history_latest'",
      )
      .all()
    assert.equal(indexes.length, 1)
  } finally {
    database.close()
  }
})
