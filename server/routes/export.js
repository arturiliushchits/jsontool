import express from 'express'
import ExportContext from '../core/export/ExportContext.js'
import JsonExportStrategy from '../core/export/JsonExportStrategy.js'
import MarkdownExportStrategy from '../core/export/MarkdownExportStrategy.js'

const strategies = {
  json: new JsonExportStrategy(),
  markdown: new MarkdownExportStrategy(),
}

const router = express.Router()
router.post('/', (request, response) => {
  const { content, format } = request.body || {}
  if (typeof content !== 'string' || !strategies[format]) {
    return response.status(400).json({
      error: 'Provide JSON content and a supported format (json or markdown).',
    })
  }

  let schema
  try {
    schema = JSON.parse(content)
  } catch {
    return response.status(400).json({ error: 'content must be valid JSON.' })
  }

  const result = new ExportContext(strategies[format]).export(schema)
  return response.json({ result })
})

export default router
