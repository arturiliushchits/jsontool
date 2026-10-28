import { randomBytes } from 'node:crypto'

export default class SchemaService {
  constructor(repository) {
    this.repository = repository
  }

  createSnapshot({ link, content, label }) {
    const createSchema = !link
    if (createSchema) {
      do {
        link = randomBytes(6).toString('base64url')
      } while (this.repository.hasSchema(link))
    }
    const normalizedLabel =
      label?.trim() ||
      new Date()
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d{3}Z$/, ' UTC')
    const result = this.repository.createSnapshot(
      link,
      content,
      normalizedLabel,
      createSchema,
    )
    if (result.outcome === 'schema-not-found') return result
    return {
      status: result.outcome === 'unchanged' ? 200 : 201,
      data: result.result,
    }
  }

  getHistoryVersion(link, historyId) {
    if (!Number.isSafeInteger(historyId)) return null
    return this.repository.getHistoryVersion(link, historyId) ?? null
  }

  renameHistoryVersion(link, historyId, label) {
    const result = this.repository.renameHistoryVersion(link, historyId, label)
    return result.outcome === 'renamed' ? { id: historyId, label } : result
  }

  deleteHistoryVersion(link, historyId) {
    const result = this.repository.deleteHistoryVersion(link, historyId)
    return result.outcome === 'deleted'
      ? { id: historyId, deleted: true, schemaDeleted: result.schemaDeleted }
      : result
  }

  getHistory(link) {
    return this.repository.getHistory(link)
  }

  getLatest(link) {
    return this.repository.getLatest(link) ?? null
  }
}
