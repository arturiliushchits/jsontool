import assert from 'node:assert/strict'
import test, { describe } from 'node:test'

describe('Smoke test', () => {
  test('Test runner works', () => {
    assert.equal(1 + 1, 2)
  })

  test('Node.js version is compatible', () => {
    const majorVersion = Number.parseInt(
      process.versions.node.split('.')[0],
      10,
    )
    assert.ok(majorVersion >= 20, 'Node.js version must be 20 or higher')
  })
})
