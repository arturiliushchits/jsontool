export class EditorSubject {
  constructor() {
    this.observers = new Set()
  }

  subscribe(observer) {
    this.observers.add(observer)
    return () => this.observers.delete(observer)
  }

  notify(schemaText) {
    for (const observer of this.observers) observer.update(schemaText)
  }
}

export class LiveValidationObserver {
  constructor({ endpoint, onResult, onError, delay = 250 }) {
    this.endpoint = endpoint
    this.onResult = onResult
    this.onError = onError
    this.delay = delay
  }

  update(schemaText) {
    clearTimeout(this.timer)
    this.timer = setTimeout(async () => {
      try {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: schemaText }),
        })
        const result = await response.json()
        if (!response.ok)
          throw new Error(result.error || 'Schema validation failed.')
        this.onResult(result)
      } catch (error) {
        this.onError(error)
      }
    }, this.delay)
  }
}

export class FlatViewObserver {
  constructor(onUpdate) {
    this.onUpdate = onUpdate
  }

  update(schemaText) {
    try {
      const schema = JSON.parse(schemaText)
      const rows = []
      const walk = (node, prefix = []) => {
        if (!node || typeof node !== 'object') return
        const requiredNames = new Set(node.required || [])
        for (const [name, property] of Object.entries(node.properties || {})) {
          const propertyPath = [...prefix, name]
          const path = propertyPath.join('.')
          const type = Array.isArray(property.type)
            ? property.type.join(' | ')
            : property.type || 'any'
          rows.push({
            path,
            propertyPath,
            type,
            required: requiredNames.has(name),
            description: property.description || '',
          })
          walk(property, propertyPath)
        }
      }
      walk(schema)
      this.onUpdate(rows, schema)
    } catch {
      this.onUpdate([], null)
    }
  }
}
