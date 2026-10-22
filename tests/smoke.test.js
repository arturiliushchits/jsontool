import assert from 'node:assert/strict'
import test, { describe } from 'node:test'

describe('Smoke test', () => {
  test('Test runner works', () => {
    assert.equal(1 + 1, 2)
  })

  test('Node.js version is compatible', () => {
    const [majorVersion, minorVersion] = process.versions.node
      .split('.')
      .map(Number)
    assert.ok(
      majorVersion > 22 || (majorVersion === 22 && minorVersion >= 13),
      'Node.js version must be 22.13 or higher',
    )
  })
})
