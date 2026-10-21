import { randomBytes } from 'node:crypto'
import express from 'express'

export default function createSchemasRouter(database) {
  const router = express.Router()
  const findSchema = database.prepare('SELECT id FROM schemas WHERE link = ?')
  const insertSchema = database.prepare('INSERT INTO schemas (link) VALUES (?)')
  const insertHistory = database.prepare(
    'INSERT INTO schema_history (schema_id, content, label) VALUES (?, ?, ?)',
  )
  const renameHistory = database.prepare(
    'UPDATE schema_history SET label = ? WHERE id = ? AND schema_id = ?',
  )
  const deleteHistory = database.prepare(
    'DELETE FROM schema_history WHERE id = ? AND schema_id = ?',
  )
  const countHistory = database.prepare(
    'SELECT COUNT(*) AS count FROM schema_history WHERE schema_id = ?',
  )
  const deleteSchema = database.prepare('DELETE FROM schemas WHERE id = ?')

  router.post('/', (request, response) => {
    const {
      link: requestedLink,
      content,
      label: requestedLabel,
    } = request.body || {}
    if (typeof content !== 'string') {
      return response.status(400).json({ error: 'content must be a string.' })
    }
    if (
      requestedLabel !== undefined &&
      (typeof requestedLabel !== 'string' || requestedLabel.trim().length > 80)
    ) {
      return response
        .status(400)
        .json({ error: 'label must be a string up to 80 characters.' })
    }
    if (
      requestedLink !== undefined &&
      (typeof requestedLink !== 'string' ||
        !/^[\w-]{1,80}$/.test(requestedLink))
    ) {
      return response.status(400).json({ error: 'link must be a valid slug.' })
    }

    database.exec('BEGIN IMMEDIATE')
    let result
    let status = 201
    try {
      let link = requestedLink
      let schema = link ? findSchema.get(link) : null
      if (link && !schema) {
        database.exec('ROLLBACK')
        return response
          .status(404)
          .json({ error: 'Schema link was not found.' })
      }
      if (!link) {
        do {
          link = randomBytes(6).toString('base64url')
        } while (findSchema.get(link))
        insertSchema.run(link)
        schema = findSchema.get(link)
      }

      const latest = database
        .prepare(`
      SELECT schema_history.id, schema_history.created_at, schema_history.content, schema_history.label
      FROM schema_history
      WHERE schema_history.schema_id = ?
      ORDER BY schema_history.id DESC
      LIMIT 1
    `)
        .get(schema.id)
      if (latest?.content === content) {
        status = 200
        result = {
          link,
          historyId: latest.id,
          updatedAt: latest.created_at,
          label: latest.label,
        }
      } else {
        const label =
          requestedLabel?.trim() ||
          new Date()
            .toISOString()
            .replace('T', ' ')
            .replace(/\.\d{3}Z$/, ' UTC')
        const history = insertHistory.run(schema.id, content, label)
        const saved = database
          .prepare('SELECT created_at, label FROM schema_history WHERE id = ?')
          .get(history.lastInsertRowid)
        result = {
          link,
          historyId: Number(history.lastInsertRowid),
          updatedAt: saved.created_at,
          label: saved.label,
        }
      }
      database.exec('COMMIT')
    } catch (error) {
      try {
        database.exec('ROLLBACK')
      } catch (rollbackError) {
        console.error('Database rollback failed:', rollbackError)
      }
      throw error
    }
    return response.status(status).json(result)
  })

  router.get('/:link/history/:historyId', (request, response) => {
    const historyId = Number(request.params.historyId)
    const version = database
      .prepare(`
      SELECT schema_history.id, schema_history.content, schema_history.created_at
      FROM schema_history
      JOIN schemas ON schemas.id = schema_history.schema_id
      WHERE schemas.link = ? AND schema_history.id = ?
    `)
      .get(request.params.link, historyId)
    if (!version || !Number.isSafeInteger(historyId))
      return response
        .status(404)
        .json({ error: 'History version was not found.' })
    return response.json(version)
  })

  router.patch('/:link/history/:historyId', (request, response) => {
    const historyIdText = request.params.historyId
    const historyId = Number(historyIdText)
    const rawLabel = request.body?.label
    const label = typeof rawLabel === 'string' ? rawLabel.trim() : ''
    if (
      !/^[1-9]\d*$/.test(historyIdText) ||
      !Number.isSafeInteger(historyId) ||
      historyId < 1 ||
      label.length < 1 ||
      label.length > 80
    ) {
      return response
        .status(400)
        .json({ error: 'Provide a name from 1 to 80 characters.' })
    }
    const schema = findSchema.get(request.params.link)
    if (!schema)
      return response.status(404).json({ error: 'Schema link was not found.' })
    const result = renameHistory.run(label, historyId, schema.id)
    if (!result.changes)
      return response
        .status(404)
        .json({ error: 'History version was not found.' })
    return response.json({ id: historyId, label })
  })

  router.delete('/:link/history/:historyId', (request, response) => {
    const historyIdText = request.params.historyId
    const historyId = Number(historyIdText)
    if (!/^[1-9]\d*$/.test(historyIdText) || !Number.isSafeInteger(historyId)) {
      return response.status(400).json({ error: 'Invalid history version ID.' })
    }
    const schema = findSchema.get(request.params.link)
    if (!schema)
      return response.status(404).json({ error: 'Schema link was not found.' })

    database.exec('BEGIN IMMEDIATE')
    try {
      const result = deleteHistory.run(historyId, schema.id)
      if (!result.changes) {
        database.exec('ROLLBACK')
        return response
          .status(404)
          .json({ error: 'History version was not found.' })
      }
      const remainingVersions = countHistory.get(schema.id).count
      const schemaDeleted = remainingVersions === 0
      if (schemaDeleted) deleteSchema.run(schema.id)
      database.exec('COMMIT')
      return response.json({ id: historyId, deleted: true, schemaDeleted })
    } catch (error) {
      try {
        database.exec('ROLLBACK')
      } catch (rollbackError) {
        console.error('Database rollback failed:', rollbackError)
      }
      throw error
    }
  })

  router.get('/:link/history', (request, response) => {
    if (!findSchema.get(request.params.link))
      return response.status(404).json({ error: 'Schema link was not found.' })
    const versions = database
      .prepare(`
      SELECT schema_history.id, schema_history.created_at, schema_history.content, COALESCE(schema_history.label, schema_history.created_at) AS label
      FROM schema_history
      JOIN schemas ON schemas.id = schema_history.schema_id
      WHERE schemas.link = ?
      ORDER BY schema_history.id ASC
    `)
      .all(request.params.link)
    return response.json(versions)
  })

  router.get('/:link', (request, response) => {
    const latest = database
      .prepare(`
      SELECT schema_history.content, schema_history.created_at
      FROM schemas
      JOIN schema_history ON schema_history.schema_id = schemas.id
      WHERE schemas.link = ?
      ORDER BY schema_history.id DESC
      LIMIT 1
    `)
      .get(request.params.link)
    if (!latest)
      return response.status(404).json({ error: 'Schema link was not found.' })
    return response.json({
      link: request.params.link,
      content: latest.content,
      updatedAt: latest.created_at,
    })
  })

  return router
}
