import logger from '../logger.js'

export default class SchemaRepository {
  constructor(database) {
    this.database = database
    this.findSchema = database.prepare('SELECT id FROM schemas WHERE link = ?')
    this.insertSchema = database.prepare(
      'INSERT INTO schemas (link) VALUES (?)',
    )
    this.insertHistory = database.prepare(
      'INSERT INTO schema_history (schema_id, content, label) VALUES (?, ?, ?)',
    )
    this.latestHistory = database.prepare(`
      SELECT id, created_at, content, label
      FROM schema_history
      WHERE schema_id = ?
      ORDER BY id DESC
      LIMIT 1
    `)
    this.savedHistory = database.prepare(
      'SELECT created_at, label FROM schema_history WHERE id = ?',
    )
    this.historyByLinkAndId = database.prepare(`
      SELECT schema_history.id, schema_history.content, schema_history.created_at
      FROM schema_history
      JOIN schemas ON schemas.id = schema_history.schema_id
      WHERE schemas.link = ? AND schema_history.id = ?
    `)
    this.renameHistory = database.prepare(`
      UPDATE schema_history SET label = ?
      WHERE id = ? AND schema_id = (SELECT id FROM schemas WHERE link = ?)
    `)
    this.deleteHistory = database.prepare(`
      DELETE FROM schema_history
      WHERE id = ? AND schema_id = (SELECT id FROM schemas WHERE link = ?)
    `)
    this.countHistory = database.prepare(
      'SELECT COUNT(*) AS count FROM schema_history WHERE schema_id = ?',
    )
    this.deleteSchema = database.prepare('DELETE FROM schemas WHERE id = ?')
    this.historyByLink = database.prepare(`
      SELECT schema_history.id, schema_history.created_at, schema_history.content,
        COALESCE(schema_history.label, schema_history.created_at) AS label
      FROM schema_history
      JOIN schemas ON schemas.id = schema_history.schema_id
      WHERE schemas.link = ?
      ORDER BY schema_history.id ASC
    `)
    this.latestByLink = database.prepare(`
      SELECT schema_history.content, schema_history.created_at
      FROM schemas
      JOIN schema_history ON schema_history.schema_id = schemas.id
      WHERE schemas.link = ?
      ORDER BY schema_history.id DESC
      LIMIT 1
    `)
  }

  hasSchema(link) {
    return Boolean(this.findSchema.get(link))
  }

  getSchemaId(link) {
    return this.findSchema.get(link)?.id
  }

  createSnapshot(requestedLink, content, label, createSchema) {
    return this.withTransaction(() => {
      let schema = createSchema ? null : this.findSchema.get(requestedLink)
      if (!createSchema && !schema) return { outcome: 'schema-not-found' }
      if (createSchema) {
        this.insertSchema.run(requestedLink)
        schema = this.findSchema.get(requestedLink)
      }

      const latest = this.latestHistory.get(schema.id)
      if (latest?.content === content) {
        return {
          outcome: 'unchanged',
          result: {
            link: requestedLink,
            historyId: latest.id,
            updatedAt: latest.created_at,
            label: latest.label,
          },
        }
      }

      const history = this.insertHistory.run(schema.id, content, label)
      const saved = this.savedHistory.get(history.lastInsertRowid)
      return {
        outcome: 'created',
        result: {
          link: requestedLink,
          historyId: Number(history.lastInsertRowid),
          updatedAt: saved.created_at,
          label: saved.label,
        },
      }
    })
  }

  getHistoryVersion(link, historyId) {
    return this.historyByLinkAndId.get(link, historyId)
  }

  renameHistoryVersion(link, historyId, label) {
    const schema = this.findSchema.get(link)
    if (!schema) return { outcome: 'schema-not-found' }
    const result = this.renameHistory.run(label, historyId, link)
    return result.changes
      ? { outcome: 'renamed' }
      : { outcome: 'history-not-found' }
  }

  deleteHistoryVersion(link, historyId) {
    return this.withTransaction(() => {
      const schema = this.findSchema.get(link)
      if (!schema) return { outcome: 'schema-not-found' }
      const result = this.deleteHistory.run(historyId, link)
      if (!result.changes) return { outcome: 'history-not-found' }
      const schemaDeleted = this.countHistory.get(schema.id).count === 0
      if (schemaDeleted) this.deleteSchema.run(schema.id)
      return { outcome: 'deleted', schemaDeleted }
    })
  }

  getHistory(link) {
    if (!this.findSchema.get(link)) return null
    return this.historyByLink.all(link)
  }

  getLatest(link) {
    return this.latestByLink.get(link)
  }

  withTransaction(operation) {
    this.database.exec('BEGIN IMMEDIATE')
    try {
      const result = operation()
      if (result.outcome?.endsWith('not-found')) {
        this.database.exec('ROLLBACK')
        return result
      }
      this.database.exec('COMMIT')
      return result
    } catch (error) {
      try {
        this.database.exec('ROLLBACK')
      } catch (rollbackError) {
        logger.error('Database rollback failed:', rollbackError)
      }
      throw error
    }
  }
}
