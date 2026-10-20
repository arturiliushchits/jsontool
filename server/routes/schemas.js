import { randomBytes } from 'node:crypto'
import express from 'express'

export default function createSchemasRouter(database) {
  const router = express.Router()
  const findSchema = database.prepare('SELECT id FROM schemas WHERE link = ?')
  const insertSchema = database.prepare('INSERT INTO schemas (link) VALUES (?)')
  const insertHistory = database.prepare(
    'INSERT INTO schema_history (schema_id, content) VALUES (?, ?)',
  )

  router.post('/', (request, response) => {
    const { link: requestedLink, content } = request.body || {}
    if (typeof content !== 'string') {
      return response.status(400).json({ error: 'content must be a string.' })
    }
    if (
      requestedLink !== undefined &&
      (typeof requestedLink !== 'string' ||
        !/^[\w-]{1,80}$/.test(requestedLink))
    ) {
      return response.status(400).json({ error: 'link must be a valid slug.' })
    }

    let link = requestedLink
    let schema = link ? findSchema.get(link) : null
    if (link && !schema)
      return response.status(404).json({ error: 'Schema link was not found.' })
    if (!link) {
      do {
        link = randomBytes(6).toString('base64url')
      } while (findSchema.get(link))
      insertSchema.run(link)
      schema = findSchema.get(link)
    }

    const latest = database
      .prepare(`
      SELECT schema_history.id, schema_history.created_at, schema_history.content
      FROM schema_history
      WHERE schema_history.schema_id = ?
      ORDER BY schema_history.id DESC
      LIMIT 1
    `)
      .get(schema.id)
    if (latest?.content === content) {
      return response.json({
        link,
        historyId: latest.id,
        updatedAt: latest.created_at,
      })
    }

    const history = insertHistory.run(schema.id, content)
    const saved = database
      .prepare('SELECT created_at FROM schema_history WHERE id = ?')
      .get(history.lastInsertRowid)
    return response.status(201).json({
      link,
      historyId: Number(history.lastInsertRowid),
      updatedAt: saved.created_at,
    })
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

  router.get('/:link/history', (request, response) => {
    const versions = database
      .prepare(`
      SELECT schema_history.id, schema_history.created_at, schema_history.content
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
