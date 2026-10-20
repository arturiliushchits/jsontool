import Ajv from 'ajv'
import Ajv2020 from 'ajv/dist/2020.js'
import BaseValidator from './BaseValidator.js'

export default class JsonValueValidator extends BaseValidator {
  validateRules(value, schema) {
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
      return [
        {
          instancePath: '',
          keyword: 'schema',
          message: 'A JSON Schema object is required.',
        },
      ]
    }

    const Validator = (schema.$schema || '').includes('2020-12') ? Ajv2020 : Ajv
    const ajv = new Validator({ allErrors: true, strict: false })
    try {
      const validate = ajv.compile(schema)
      return validate(value) ? [] : validate.errors || []
    } catch (error) {
      return [{ instancePath: '', keyword: 'schema', message: error.message }]
    }
  }
}
