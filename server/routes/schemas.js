import express from 'express'

export default function createSchemasRouter(schemaService) {
  const router = express.Router()

  router.post('/', (request, response) => {
    const { link, content, label } = request.body || {}
    if (typeof content !== 'string') {
      return response.status(400).json({ error: 'content must be a string.' })
    }
    if (
      label !== undefined &&
      (typeof label !== 'string' || label.trim().length > 80)
    ) {
      return response
        .status(400)
        .json({ error: 'label must be a string up to 80 characters.' })
    }
    if (
      link !== undefined &&
      (typeof link !== 'string' || !/^[\w-]{1,80}$/.test(link))
    ) {
      return response.status(400).json({ error: 'link must be a valid slug.' })
    }

    const result = schemaService.createSnapshot({ link, content, label })
    if (result.outcome === 'schema-not-found') {
      return response.status(404).json({ error: 'Schema link was not found.' })
    }
    return response.status(result.status).json(result.data)
  })

  router.get('/:link/history/:historyId', (request, response) => {
    const historyId = Number(request.params.historyId)
    const version = schemaService.getHistoryVersion(
      request.params.link,
      historyId,
    )
    if (!version)
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
    const result = schemaService.renameHistoryVersion(
      request.params.link,
      historyId,
      label,
    )
    if (result.outcome === 'schema-not-found') {
      return response.status(404).json({ error: 'Schema link was not found.' })
    }
    if (result.outcome === 'history-not-found') {
      return response
        .status(404)
        .json({ error: 'History version was not found.' })
    }
    return response.json(result)
  })

  router.delete('/:link/history/:historyId', (request, response) => {
    const historyIdText = request.params.historyId
    const historyId = Number(historyIdText)
    if (!/^[1-9]\d*$/.test(historyIdText) || !Number.isSafeInteger(historyId)) {
      return response.status(400).json({ error: 'Invalid history version ID.' })
    }
    const result = schemaService.deleteHistoryVersion(
      request.params.link,
      historyId,
    )
    if (result.outcome === 'schema-not-found') {
      return response.status(404).json({ error: 'Schema link was not found.' })
    }
    if (result.outcome === 'history-not-found') {
      return response
        .status(404)
        .json({ error: 'History version was not found.' })
    }
    return response.json(result)
  })

  router.get('/:link/history', (request, response) => {
    const versions = schemaService.getHistory(request.params.link)
    if (!versions)
      return response.status(404).json({ error: 'Schema link was not found.' })
    return response.json(versions)
  })

  router.get('/:link', (request, response) => {
    const latest = schemaService.getLatest(request.params.link)
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
