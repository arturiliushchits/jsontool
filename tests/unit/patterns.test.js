import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import {
  CommandHistory,
  ReplaceSchemaCommand,
  UpdatePropertyCommand,
} from '../../public/js/commands.js'
import {
  EditorSubject,
  FlatViewObserver,
  LiveValidationObserver,
} from '../../public/js/observer.js'
import { TypeControlFactory } from '../../public/js/ui/type-controls.js'
import ExportContext from '../../server/core/export/ExportContext.js'
import JsonExportStrategy from '../../server/core/export/JsonExportStrategy.js'
import MarkdownExportStrategy from '../../server/core/export/MarkdownExportStrategy.js'
import BaseValidator from '../../server/core/validation/BaseValidator.js'
import JsonValueValidator from '../../server/core/validation/JsonValueValidator.js'
import SchemaStructureValidator from '../../server/core/validation/SchemaStructureValidator.js'

describe('Strategy pattern', () => {
  test('exports canonical JSON with a trailing newline', () => {
    const schema = { type: 'object', properties: { name: { type: 'string' } } }
    const context = new ExportContext(new JsonExportStrategy())
    assert.equal(context.export(schema), `${JSON.stringify(schema, null, 2)}\n`)
  })

  test('exports nested property details as escaped Markdown rows', () => {
    const schema = {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: ['string', 'null'], description: 'First | last\nname' },
        address: {
          type: 'object',
          properties: { city: { type: 'string', format: 'text' } },
        },
      },
    }
    const markdown = new ExportContext(new MarkdownExportStrategy()).export(
      schema,
    )
    assert.ok(
      markdown.includes(
        '| name | string \\| null |  | Yes | First \\| last name |',
      ),
    )
    assert.match(markdown, /\| address\.city \| string \| text \| No \|/)
  })

  test('rejects a strategy without an export method', () => {
    assert.throws(() => new ExportContext({}), TypeError)
  })
})

describe('Template Method pattern', () => {
  test('validates draft-07 and draft-2020-12 schemas', () => {
    const validator = new SchemaStructureValidator()
    assert.equal(validator.validate('{"type":"object"}').valid, true)
    assert.equal(
      validator.validate(
        '{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object"}',
      ).valid,
      true,
    )
  })

  test('formats parse and structure failures for callers', () => {
    const validator = new SchemaStructureValidator()
    const parseFailure = validator.validate('{')
    assert.equal(parseFailure.valid, false)
    assert.equal(parseFailure.errors[0].keyword, 'parse')
    assert.equal(parseFailure.errors[0].path, '/')
    assert.equal(
      validator.validate('[]').errors[0].message,
      'A JSON Schema must be an object.',
    )
    assert.equal(
      validator.validate('{"$schema":"https://example.test/draft-99"}')
        .errors[0].keyword,
      '$schema',
    )
  })

  test('delegates rule validation and rejects an unimplemented step', () => {
    assert.throws(
      () => new BaseValidator().validate('{}'),
      /validateRules must be implemented/,
    )
  })

  test('validates JSON data against a schema and reports required paths', () => {
    const validator = new JsonValueValidator()
    const schema = {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } },
    }
    assert.deepEqual(validator.validate('{"name":"Ada"}', schema), {
      valid: true,
      errors: [],
    })
    const invalid = validator.validate('{"name":42}', schema)
    assert.equal(invalid.valid, false)
    assert.equal(invalid.errors[0].path, '/name')
    assert.equal(validator.validate('{}', schema).errors[0].keyword, 'required')
    assert.deepEqual(validator.validate('{}', 'not-a-schema'), {
      valid: false,
      errors: [
        {
          path: '/',
          keyword: 'schema',
          message: 'A JSON Schema object is required.',
        },
      ],
    })
  })
})

describe('Flyweight pattern', () => {
  test('reuses one control flyweight per type', () => {
    const factory = new TypeControlFactory()
    const firstString = factory.get('string')
    assert.equal(factory.get('string'), firstString)
    assert.notEqual(factory.get('number'), firstString)
    assert.equal(firstString.type, 'string')
    assert.ok(firstString.options.includes('integer'))
  })
})

describe('Observer pattern', () => {
  test('notifies subscribers and supports unsubscribe', () => {
    const subject = new EditorSubject()
    const updates = []
    const unsubscribe = subject.subscribe({
      update: (value) => updates.push(value),
    })
    subject.notify('{"type":"object"}')
    unsubscribe()
    subject.notify('{}')
    assert.deepEqual(updates, ['{"type":"object"}'])
  })

  test('flattens nested properties and clears invalid JSON', () => {
    let latest
    const observer = new FlatViewObserver((rows, schema) => {
      latest = { rows, schema }
    })
    observer.update(
      '{"type":"object","required":["user"],"properties":{"user":{"type":"object","properties":{"name":{"type":"string"}}}}}',
    )
    assert.deepEqual(
      latest.rows.map(({ path, required }) => ({ path, required })),
      [
        { path: 'user', required: true },
        { path: 'user.name', required: false },
      ],
    )
    observer.update('{')
    assert.deepEqual(latest, { rows: [], schema: null })
  })

  test('debounces live validation through native fetch', async (context) => {
    const originalFetch = globalThis.fetch
    const requestBodies = []
    const results = []
    globalThis.fetch = async (_url, options) => {
      requestBodies.push(JSON.parse(options.body))
      return { ok: true, json: async () => ({ valid: true, errors: [] }) }
    }
    context.after(() => {
      globalThis.fetch = originalFetch
    })
    const observer = new LiveValidationObserver({
      endpoint: '/api/validate/schema',
      delay: 10,
      onResult: (result) => results.push(result),
      onError: (error) => {
        throw error
      },
    })
    observer.update('{"type":"string"}')
    observer.update('{"type":"number"}')
    await new Promise((resolve) => setTimeout(resolve, 30))
    assert.deepEqual(requestBodies, [{ content: '{"type":"number"}' }])
    assert.deepEqual(results, [{ valid: true, errors: [] }])
  })
})

describe('Command pattern', () => {
  test('replaces schema text and restores it on undo', () => {
    const editor = { value: '{"type":"string"}' }
    const updates = []
    const command = new ReplaceSchemaCommand(
      editor,
      '{"type":"number"}',
      (value) => updates.push(value),
    )
    command.execute()
    assert.equal(editor.value, '{"type":"number"}')
    command.undo()
    assert.equal(editor.value, '{"type":"string"}')
    assert.deepEqual(updates, ['{"type":"number"}', '{"type":"string"}'])
  })

  test('updates a nested property and restores an absent property on undo', () => {
    const editor = {
      value:
        '{"properties":{"user":{"properties":{"name":{"type":"string"}}}}}',
    }
    const command = new UpdatePropertyCommand(
      editor,
      ['user', 'name'],
      'description',
      'Full name',
      () => {},
    )
    command.execute()
    assert.equal(
      JSON.parse(editor.value).properties.user.properties.name.description,
      'Full name',
    )
    command.undo()
    assert.equal(
      Object.hasOwn(
        JSON.parse(editor.value).properties.user.properties.name,
        'description',
      ),
      false,
    )
  })

  test('supports undo, redo, and branching after undo', () => {
    const editor = { value: 'zero' }
    const updates = []
    const history = new CommandHistory()
    const apply = (value) => {
      editor.value = value
      updates.push(value)
    }
    history.initialize(['zero'], editor, apply)
    history.execute(new ReplaceSchemaCommand(editor, 'one', apply))
    history.execute(new ReplaceSchemaCommand(editor, 'two', apply))
    assert.equal(history.undo(), true)
    assert.equal(editor.value, 'one')
    assert.equal(history.redo(), true)
    assert.equal(editor.value, 'two')
    history.undo()
    history.execute(new ReplaceSchemaCommand(editor, 'branch', apply))
    assert.equal(history.canRedo, false)
    assert.equal(history.undo(), true)
    assert.equal(editor.value, 'one')
    assert.equal(history.undo(), true)
    assert.equal(editor.value, 'zero')
    assert.equal(history.undo(), false)
    assert.deepEqual(updates, [
      'one',
      'two',
      'one',
      'two',
      'one',
      'branch',
      'one',
      'zero',
    ])
  })
})
