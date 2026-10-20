export default class BaseValidator {
  validate(rawText, schema) {
    const parsed = this.parseJson(rawText)
    if (parsed.errors.length) {
      return { valid: false, errors: this.formatErrors(parsed.errors) }
    }

    const errors = this.validateRules(parsed.value, schema)
    return { valid: errors.length === 0, errors: this.formatErrors(errors) }
  }

  parseJson(rawText) {
    try {
      return { value: JSON.parse(rawText), errors: [] }
    } catch (error) {
      return {
        value: null,
        errors: [
          { instancePath: '', keyword: 'parse', message: error.message },
        ],
      }
    }
  }

  validateRules() {
    throw new Error('validateRules must be implemented by a validator')
  }

  formatErrors(errors) {
    return errors.map((error) => ({
      path: error.instancePath || '/',
      keyword: error.keyword || 'validation',
      message: error.message || 'Validation failed',
    }))
  }
}
