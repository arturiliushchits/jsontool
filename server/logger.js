import { format } from 'node:util'
import { getRequestContext } from './requestContext.js'

function write(level, ...values) {
  const context = getRequestContext()
  const processId = context?.pid ?? process.pid
  const requestLabel = context?.requestId
    ? ` requestId=${context.requestId}`
    : ''
  const entityLabel =
    context?.schemaId == null
      ? `ip=${context?.ip ?? 'unknown'}`
      : `schemaId=${context.schemaId}`
  const prefix = `[pid=${processId}${requestLabel} ${entityLabel}]`
  const message = format(...values)
  const lines = message.split(/\r?\n/).map((line) => `${prefix} ${line}`)
  console[level](lines.join('\n'))
}

const logger = {
  error: (...values) => write('error', ...values),
  info: (...values) => write('log', ...values),
}

export default logger
