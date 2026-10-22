import assert from 'node:assert/strict'
import test, { after, before, describe } from 'node:test'
import { startTestServer } from '../helpers/server.js'

let server

before(async () => {
  server = await startTestServer()
})

after(async () => {
  await server.close()
})

async function request(path, options) {
  return fetch(`${server.baseUrl}${path}`, options)
}

function jsonRequest(method, body) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

describe('Schema snapshot API', () => {
  test('creates, retrieves, renames, restores, and deletes snapshots', async () => {
    const firstContent = '{"title":"First","type":"object"}'
    const createdResponse = await request(
      '/api/schemas',
      jsonRequest('POST', { content: firstContent }),
    )
    assert.equal(createdResponse.status, 201)
    const created = await createdResponse.json()
    assert.match(created.link, /^[\w-]+$/)
    assert.match(created.label, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC$/)

    const latestResponse = await request(`/api/schemas/${created.link}`)
    assert.equal(latestResponse.status, 200)
    assert.equal((await latestResponse.json()).content, firstContent)

    const duplicateResponse = await request(
      '/api/schemas',
      jsonRequest('POST', { link: created.link, content: firstContent }),
    )
    assert.equal(duplicateResponse.status, 200)
    assert.equal((await duplicateResponse.json()).historyId, created.historyId)

    const secondContent = '{"title":"Second","type":"object"}'
    const secondResponse = await request(
      '/api/schemas',
      jsonRequest('POST', {
        link: created.link,
        content: secondContent,
        label: '  Release candidate  ',
      }),
    )
    assert.equal(secondResponse.status, 201)
    const second = await secondResponse.json()
    assert.equal(second.label, 'Release candidate')

    const history = await (
      await request(`/api/schemas/${created.link}/history`)
    ).json()
    assert.deepEqual(
      history.map(({ content }) => content),
      [firstContent, secondContent],
    )

    const renameResponse = await request(
      `/api/schemas/${created.link}/history/${created.historyId}`,
      jsonRequest('PATCH', { label: '  Initial draft  ' }),
    )
    assert.deepEqual(await renameResponse.json(), {
      id: created.historyId,
      label: 'Initial draft',
    })

    const restoreResponse = await request(
      `/api/schemas/${created.link}/history/${created.historyId}`,
    )
    assert.equal((await restoreResponse.json()).content, firstContent)

    const deleteFirst = await request(
      `/api/schemas/${created.link}/history/${created.historyId}`,
      { method: 'DELETE' },
    )
    assert.deepEqual(await deleteFirst.json(), {
      id: created.historyId,
      deleted: true,
      schemaDeleted: false,
    })
    const deleteLast = await request(
      `/api/schemas/${created.link}/history/${second.historyId}`,
      { method: 'DELETE' },
    )
    assert.deepEqual(await deleteLast.json(), {
      id: second.historyId,
      deleted: true,
      schemaDeleted: true,
    })
    assert.equal((await request(`/api/schemas/${created.link}`)).status, 404)
  })

  test('rejects invalid snapshot data and unknown history versions', async () => {
    const missingContent = await request(
      '/api/schemas',
      jsonRequest('POST', { label: 'Missing content' }),
    )
    assert.equal(missingContent.status, 400)
    const invalidSlug = await request(
      '/api/schemas',
      jsonRequest('POST', { link: 'bad slug', content: '{}' }),
    )
    assert.equal(invalidSlug.status, 400)
    const notFound = await request('/api/schemas/no-such-schema/history/1')
    assert.equal(notFound.status, 404)
    const invalidRename = await request(
      '/api/schemas/no-such-schema/history/0',
      jsonRequest('PATCH', { label: '' }),
    )
    assert.equal(invalidRename.status, 400)
  })
})

describe('Validation and export API', () => {
  test('validates schema structure and data values', async () => {
    const schemaResult = await request(
      '/api/validate/schema',
      jsonRequest('POST', { content: '{"type":"object"}' }),
    )
    assert.deepEqual(await schemaResult.json(), { valid: true, errors: [] })

    const validData = await request(
      '/api/validate',
      jsonRequest('POST', {
        schema:
          '{"type":"object","required":["name"],"properties":{"name":{"type":"string"}}}',
        data: '{"name":"Ada"}',
      }),
    )
    assert.deepEqual(await validData.json(), { valid: true, errors: [] })

    const invalidData = await request(
      '/api/validate',
      jsonRequest('POST', {
        schema: '{"type":"object","required":["name"]}',
        data: '{}',
      }),
    )
    const invalidResult = await invalidData.json()
    assert.equal(invalidResult.valid, false)
    assert.equal(invalidResult.errors[0].keyword, 'required')
  })

  test('exports JSON and Markdown and rejects malformed requests', async () => {
    const content = '{"type":"object","properties":{"name":{"type":"string"}}}'
    const jsonResponse = await request(
      '/api/export',
      jsonRequest('POST', { content, format: 'json' }),
    )
    assert.equal(
      (await jsonResponse.json()).result,
      `${JSON.stringify(JSON.parse(content), null, 2)}\n`,
    )

    const markdownResponse = await request(
      '/api/export',
      jsonRequest('POST', { content, format: 'markdown' }),
    )
    assert.match((await markdownResponse.json()).result, /\| name \| string \|/)

    const badExport = await request(
      '/api/export',
      jsonRequest('POST', { content: '{', format: 'markdown' }),
    )
    assert.equal(badExport.status, 400)
    const malformedBody = await request('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    })
    assert.equal(malformedBody.status, 400)
    const unknownApi = await request('/api/missing')
    assert.equal(unknownApi.status, 404)
  })
})
