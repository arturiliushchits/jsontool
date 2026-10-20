const TYPE_OPTIONS = [
  'string',
  'number',
  'integer',
  'boolean',
  'object',
  'array',
  'null',
]

export class TypeControlFlyweight {
  constructor(type) {
    this.type = type
    this.options = TYPE_OPTIONS
  }

  createSelect(value) {
    const select = document.createElement('select')
    select.className = 'field-control'
    select.dataset.property = 'type'
    for (const type of this.options) {
      const option = document.createElement('option')
      option.value = type
      option.textContent = type
      option.selected = value === type
      select.append(option)
    }
    return select
  }
}

export class TypeControlFactory {
  constructor() {
    this.cache = new Map()
  }

  get(type) {
    if (!this.cache.has(type))
      this.cache.set(type, new TypeControlFlyweight(type))
    return this.cache.get(type)
  }
}
