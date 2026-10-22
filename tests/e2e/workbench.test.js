import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright'
import { startTestServer } from '../helpers/server.js'

test('supports schema validation, remote snapshots, sharing, and export', async () => {
  const server = await startTestServer()
  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({ acceptDownloads: true })
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const page = await context.newPage()
    await page.goto(server.baseUrl)
    await page.getByText('Valid schema', { exact: true }).waitFor()

    const schema = {
      title: 'E2E baseline',
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } },
    }
    const savedText = `${JSON.stringify(schema, null, 2)}\n`
    const editor = page.getByRole('textbox', { name: 'JSON Schema source' })
    const initialText = await editor.inputValue()
    await editor.fill(savedText)
    await page.getByText('Valid schema', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Undo' }).click()
    assert.equal(await editor.inputValue(), initialText)
    await page.getByRole('button', { name: 'Redo' }).click()
    assert.equal(await editor.inputValue(), savedText)
    await page.getByRole('button', { name: 'Validate JSON' }).click()
    await page.getByText('Valid data', { exact: true }).waitFor()

    await page
      .getByRole('textbox', { name: 'JSON data to validate' })
      .fill('{}')
    await page.getByRole('button', { name: 'Validate JSON' }).click()
    await page.getByText('Invalid data', { exact: true }).waitFor()

    await page.getByRole('button', { name: 'Save version' }).click()
    await page.getByText('Version saved.', { exact: true }).waitFor()
    await page.getByText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC$/).waitFor()

    page.once('dialog', (dialog) => dialog.accept('E2E baseline snapshot'))
    await page.getByRole('button', { name: 'Rename' }).click()
    await page.getByText('E2E baseline snapshot', { exact: true }).waitFor()

    await editor.fill(
      `${JSON.stringify({ ...schema, title: 'Unsaved draft' }, null, 2)}\n`,
    )
    await page.getByRole('button', { name: 'Restore' }).click()
    await page.getByText('Version restored.', { exact: true }).waitFor()
    assert.equal(await editor.inputValue(), savedText)

    await editor.fill(
      `${JSON.stringify({ ...schema, title: 'E2E shared latest' }, null, 2)}\n`,
    )
    await page.getByRole('button', { name: 'Share' }).click()
    await page
      .getByText('Share link copied to clipboard.', { exact: true })
      .waitFor()
    const schemaLink = new URL(page.url()).searchParams.get('schema')
    assert.ok(schemaLink)
    const history = await page.evaluate(async (link) => {
      const response = await fetch(`/api/schemas/${link}/history`)
      return response.json()
    }, schemaLink)
    assert.equal(history.at(-1).content, await editor.inputValue())

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export' }).click()
    const download = await downloadPromise
    assert.equal(download.suggestedFilename(), 'schema.md')
  } finally {
    await browser.close()
    await server.close()
  }
})
