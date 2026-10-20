export default class ExportContext {
  constructor(strategy) {
    this.setStrategy(strategy)
  }

  setStrategy(strategy) {
    if (!strategy || typeof strategy.export !== 'function') {
      throw new TypeError('An export strategy is required.')
    }
    this.strategy = strategy
  }

  export(schemaObject) {
    return this.strategy.export(schemaObject)
  }
}
