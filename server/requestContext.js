import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'

const requestContext = new AsyncLocalStorage()

export function createRequestContext(context) {
  return { ...context, requestId: randomUUID() }
}

export function runWithRequestContext(context, callback) {
  return requestContext.run(context, callback)
}

export function getRequestContext() {
  return requestContext.getStore()
}
