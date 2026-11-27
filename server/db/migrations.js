export function runDdlMigration(database) {
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
  `)

  const historyColumns = database
    .prepare('PRAGMA table_info(schema_history)')
    .all()
  if (!historyColumns.some((column) => column.name === 'label')) {
    database.exec('ALTER TABLE schema_history ADD COLUMN label TEXT')
  }
}

export function runDataMigration(database) {
  database.exec(`
    UPDATE schema_history
    SET label = substr(created_at, 1, 10) || ' ' ||
      substr(created_at, 12, 8) || ' UTC'
    WHERE label IS NULL
  `)
  database.exec(`
    UPDATE schema_history
    SET label = substr(label, 1, 10) || ' ' || substr(label, 12, 8) || ' UTC'
    WHERE label GLOB '????-??-??T??:??:??.???Z'
  `)
}

export function runIndexMigration(database) {
  database.exec(`
    CREATE INDEX IF NOT EXISTS schema_history_latest
      ON schema_history(schema_id, id DESC);
  `)
}

export function runDatabaseMigrations(database) {
  runDdlMigration(database)
  runDataMigration(database)
  runIndexMigration(database)
}
