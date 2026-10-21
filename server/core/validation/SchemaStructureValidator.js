import Ajv from 'ajv'
import Ajv2020 from 'ajv/dist/2020.js'
import BaseValidator from './BaseValidator.js'

export default class SchemaStructureValidator extends BaseValidator {
  validateRules(schema) {
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
      return [
        {
          instancePath: '',
          keyword: 'type',
          message: 'A JSON Schema must be an object.',
        },
      ]
    }

    const schemaUri = schema.$schema || ''
    if (
      schemaUri &&
      !schemaUri.includes('draft-07') &&
      !schemaUri.includes('2020-12')
    ) {
      return [
        {
          instancePath: '/$schema',
          keyword: '$schema',
          message: 'Only draft-07 and draft-2020-12 are supported.',
        },
      ]
    }

    const Validator = schemaUri.includes('2020-12') ? Ajv2020 : Ajv
    const ajv = new Validator({ allErrors: true, strict: false })
    try {
      if (ajv.validateSchema(schema)) return []
      return (
        ajv.errors || [
          {
            instancePath: '',
            keyword: 'schema',
            message: 'Invalid JSON Schema.',
          },
        ]
      )
    } catch (error) {
      return [{ instancePath: '', keyword: 'schema', message: error.message }]
    }
  }
}
