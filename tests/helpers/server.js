import { once } from 'node:events'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createDatabase } from '../../server/db/database.js'
import { createApp } from '../../server/main.js'

export async function startTestServer() {
  const directory = mkdtempSync(join(tmpdir(), 'jsontool-test-'))
  const database = createDatabase(join(directory, 'test.sqlite'))
  const server = createApp(database).listen(0, '127.0.0.1')
  await once(server, 'listening')
  const { port } = server.address()

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    async close() {
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      )
      database.close()
      rmSync(directory, { recursive: true, force: true })
    },
  }
}
