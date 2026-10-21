import ExportStrategy from './ExportStrategy.js'

export default class JsonExportStrategy extends ExportStrategy {
  export(schemaObject) {
    return `${JSON.stringify(schemaObject, null, 2)}\n`
  }
}
