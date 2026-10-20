import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import express from 'express'
import { createDatabase } from './db/database.js'
import exportRouter from './routes/export.js'
import createSchemasRouter from './routes/schemas.js'
import validationRouter from './routes/validation.js'

const serverDirectory = dirname(fileURLToPath(import.meta.url))

export function createApp(database) {
  const app = express()
  app.use(express.json({ limit: '2mb' }))
  app.use(express.static(join(serverDirectory, '..', 'public')))
  app.use('/api/schemas', createSchemasRouter(database))
  app.use('/api/export', exportRouter)
  app.use('/api/validate', validationRouter)
  app.use((error, request, response, next) => {
    if (response.headersSent) return next(error)
    if (!request.path.startsWith('/api/')) return next(error)
    const status = error.type === 'entity.too.large' ? 413 : 400
    return response
      .status(status)
      .json({ error: error.message || 'Request failed.' })
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
