import assert from 'node:assert/strict'
import test from 'node:test'
import logger from '../../server/logger.js'
import {
  createRequestContext,
  runWithRequestContext,
} from '../../server/requestContext.js'

test('request contexts get unique UUIDs', () => {
  const firstContext = createRequestContext({ pid: 42, ip: '127.0.0.1' })
  const secondContext = createRequestContext({ pid: 42, ip: '127.0.0.1' })

  assert.match(
    firstContext.requestId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  )
  assert.notEqual(firstContext.requestId, secondContext.requestId)
})

test('logger prefixes each line with the schema ID and process ID', (t) => {
  const messages = []
  t.mock.method(console, 'error', (message) => messages.push(message))

  runWithRequestContext(
    { pid: 42, requestId: 'request-1', schemaId: 7, ip: '127.0.0.1' },
    () => {
      logger.error('first line\nsecond line')
    },
  )

  assert.deepEqual(messages, [
    '[pid=42 requestId=request-1 schemaId=7] first line\n[pid=42 requestId=request-1 schemaId=7] second line',
  ])
})

test('logger uses the request IP when no schema ID is available', (t) => {
  const messages = []
  t.mock.method(console, 'error', (message) => messages.push(message))

  runWithRequestContext(
    { pid: 42, requestId: 'request-2', ip: '127.0.0.1' },
    () => {
      logger.error('request failed')
    },
  )

  assert.deepEqual(messages, [
    '[pid=42 requestId=request-2 ip=127.0.0.1] request failed',
  ])
})
