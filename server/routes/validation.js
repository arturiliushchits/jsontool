import express from 'express'
import JsonValueValidator from '../core/validation/JsonValueValidator.js'
import SchemaStructureValidator from '../core/validation/SchemaStructureValidator.js'

const router = express.Router()
const schemaValidator = new SchemaStructureValidator()
const valueValidator = new JsonValueValidator()

router.post('/schema', (request, response) => {
  const { content } = request.body || {}
  if (typeof content !== 'string')
    return response.status(400).json({ error: 'content must be a string.' })
  return response.json(schemaValidator.validate(content))
})

router.post('/', (request, response) => {
  const { schema, data } = request.body || {}
  if (typeof schema !== 'string' || typeof data !== 'string') {
    return response
      .status(400)
      .json({ error: 'schema and data must be JSON strings.' })
  }

  const schemaResult = schemaValidator.validate(schema)
  if (!schemaResult.valid)
    return response.json({
      valid: false,
      errors: schemaResult.errors,
      target: 'schema',
    })
  return response.json(valueValidator.validate(data, JSON.parse(schema)))
})

export default router
