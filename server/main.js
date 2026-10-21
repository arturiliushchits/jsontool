import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import express from 'express'
import { createDatabase } from './db/database.js'
import exportRouter from './routes/export.js'
import createSchemasRouter from './routes/schemas.js'
import validationRouter from './routes/validation.js'

const serverDirectory = dirname(fileURLToPath(import.meta.url))
const statusByErrorType = {
  'entity.too.large': 413,
  'entity.parse.failed': 400,
  'request.aborted': 400,
  'request.size.invalid': 400,
  'charset.unsupported': 415,
  'encoding.unsupported': 415,
  'entity.verify.failed': 403,
}
const messageByStatus = {
  400: 'Malformed JSON request body.',
  403: 'Request body was rejected.',
  413: 'Request body is too large.',
  415: 'Unsupported request encoding or charset.',
  500: 'Internal server error.',
}

export function createApp(database) {
  const app = express()
  app.use(express.json({ limit: '2mb' }))
  app.use(express.static(join(serverDirectory, '..', 'public')))
  app.use('/api/schemas', createSchemasRouter(database))
  app.use('/api/export', exportRouter)
  app.use('/api/validate', validationRouter)
  app.use((request, response, next) => {
    if (request.path === '/api' || request.path.startsWith('/api/')) {
      return response.status(404).json({ error: 'API route not found.' })
    }
    return next()
  })
  app.use((error, request, response, next) => {
    if (response.headersSent) return next(error)
    if (request.path !== '/api' && !request.path.startsWith('/api/'))
      return next(error)
    const status = statusByErrorType[error.type] ?? 500
    if (status === 500) console.error('API request failed:', error)
    return response.status(status).json({ error: messageByStatus[status] })
  })
  return app
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const database = createDatabase()
  const port = Number(process.env.PORT) || 3000
  const server = createApp(database).listen(port, () => {
    console.log(`JSON Tool is running at http://localhost:${port}`)
  })
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () =>
      server.close(() => {
        database.close()
        process.exit(0)
      }),
    )
  }
}
