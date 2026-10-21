export default class ExportStrategy {
  export() {
    throw new Error('export must be implemented by an export strategy')
  }
}
