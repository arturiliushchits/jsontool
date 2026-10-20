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

export class AutoSaveObserver {
  constructor({
    getLink,
    onSaved,
    onError,
    onPending = () => {},
    delay = 900,
  }) {
    this.getLink = getLink
    this.onSaved = onSaved
    this.onError = onError
    this.onPending = onPending
    this.delay = delay
    this.pendingContent = null
    this.lastSavedContent = null
    this.saving = false
  }

  update(schemaText) {
    this.pendingContent = schemaText
    if (!this.getLink()) return
    if (schemaText === this.lastSavedContent) {
      clearTimeout(this.timer)
      this.pendingContent = null
      return
    }
    this.onPending()
    this.schedule()
  }

  markSaved(content) {
    this.lastSavedContent = content
    if (this.pendingContent === content) this.pendingContent = null
    if (
      this.getLink() &&
      this.pendingContent !== null &&
      this.pendingContent !== content
    )
      this.schedule()
  }

  schedule() {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.flush(), this.delay)
  }

  async flush() {
    const link = this.getLink()
    if (!link || this.pendingContent === null || this.saving) return
    const content = this.pendingContent
    this.pendingContent = null
    if (content === this.lastSavedContent) return

    this.saving = true
    try {
      const response = await fetch('/api/schemas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link, content }),
      })
      const result = await response.json()
      if (!response.ok)
        throw new Error(result.error || 'Unable to save this schema.')
      this.lastSavedContent = content
      this.onSaved(result)
    } catch (error) {
      this.onError(error)
      if (this.pendingContent === null) this.pendingContent = content
    } finally {
      this.saving = false
      if (
        this.pendingContent !== null &&
        this.pendingContent !== this.lastSavedContent
      )
        this.schedule()
    }
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
