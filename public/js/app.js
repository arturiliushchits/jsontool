import {
  CommandHistory,
  ReplaceSchemaCommand,
  UpdatePropertyCommand,
} from './commands.js'
import {
  EditorSubject,
  FlatViewObserver,
  LiveValidationObserver,
} from './observer.js'
import { TypeControlFactory } from './ui/type-controls.js'

const byId = (id) => document.getElementById(id)
const editor = byId('schema-editor')
const dataEditor = byId('data-editor')
const subject = new EditorSubject()
const commandHistory = new CommandHistory()
const typeControlFactory = new TypeControlFactory()
let schemaLink = new URLSearchParams(location.search).get('schema')
let previousText = editor.value
let toastTimer

const initialSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Contact',
  type: 'object',
  required: ['id', 'name', 'email'],
  properties: {
    id: {
      type: 'integer',
      description: 'Unique contact identifier',
      example: 42,
    },
    name: { type: 'string', description: 'Full name', example: 'Ada Lovelace' },
    email: {
      type: 'string',
      format: 'email',
      description: 'Preferred email address',
      example: 'ada@example.com',
    },
  },
}

function setStatus(message, state = '') {
  byId('save-status').textContent = message
  byId('save-status').previousElementSibling.className =
    `status-dot ${state ? `is-${state}` : ''}`
}

function showToast(message) {
  const toast = byId('toast')
  toast.textContent = message
  toast.classList.add('is-visible')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600)
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function paintEditor() {
  const source = editor.value
  const tokenPattern =
    /("(?:\\.|[^"\\])*"(?=\s*:)|"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b|[{}[\],:])/g
  let highlighted = ''
  let cursor = 0
  for (const match of source.matchAll(tokenPattern)) {
    const token = match[0]
    const offset = match.index
    highlighted += escapeHtml(source.slice(cursor, offset))
    const afterToken = source.slice(offset + token.length).trimStart()
    const className = token.startsWith('"')
      ? afterToken.startsWith(':')
        ? 'token-key'
        : 'token-string'
      : /^-?\d/.test(token)
        ? 'token-number'
        : /^(true|false|null)$/.test(token)
          ? 'token-literal'
          : ''
    const safeToken = escapeHtml(token)
    highlighted += className
      ? `<span class="${className}">${safeToken}</span>`
      : safeToken
    cursor = offset + token.length
  }
  highlighted += escapeHtml(source.slice(cursor))
  byId('schema-highlight').innerHTML =
    highlighted + (source.endsWith('\n') ? ' ' : '\n')
  const lineCount = source.split('\n').length
  byId('line-numbers').textContent = Array.from(
    { length: lineCount },
    (_, index) => index + 1,
  ).join('\n')
  byId('schema-location').textContent = `JSON Schema · ${schemaDialect(source)}`
  byId('schema-highlight').scrollTop = editor.scrollTop
  byId('schema-highlight').scrollLeft = editor.scrollLeft
  byId('line-numbers').scrollTop = editor.scrollTop
}

function schemaDialect(source) {
  try {
    const dialect = JSON.parse(source).$schema || ''
    return dialect.includes('2020-12') ? 'draft-2020-12' : 'draft-07'
  } catch {
    return 'JSON'
  }
}

function setEditorText(text, { clearHistory = false } = {}) {
  editor.value = text
  previousText = text
  if (clearHistory) {
    commandHistory.initialize([text], editor, setEditorText)
    updateHistoryButtons()
  } else {
    setStatus(schemaLink ? 'Local changes' : 'Local draft')
  }
  paintEditor()
  subject.notify(text)
}

function handleEditorChange() {
  const nextText = editor.value
  if (nextText !== previousText) {
    const command = new ReplaceSchemaCommand(editor, nextText, setEditorText)
    command.previousValue = previousText
    commandHistory.record(command)
    previousText = nextText
    setStatus(schemaLink ? 'Local changes' : 'Local draft')
  }
  paintEditor()
  subject.notify(nextText)
  updateHistoryButtons()
}

function updateHistoryButtons() {
  byId('undo-button').disabled = !commandHistory.canUndo
  byId('redo-button').disabled = !commandHistory.canRedo
}

function renderSchemaResult(result) {
  const chip = byId('schema-status')
  chip.className = `validation-chip ${result.valid ? 'is-valid' : 'is-invalid'}`
  byId('schema-status-label').textContent = result.valid
    ? 'Valid schema'
    : 'Schema needs attention'
  byId('diagnostic-count').textContent = result.valid
    ? 'No issues'
    : `${result.errors.length} issue${result.errors.length === 1 ? '' : 's'}`
  const list = byId('schema-errors')
  list.replaceChildren()
  if (result.valid) {
    const note = document.createElement('p')
    note.className = 'empty-note'
    note.textContent = 'No schema errors found.'
    list.append(note)
    return
  }
  for (const error of result.errors) {
    const item = document.createElement('div')
    item.className = 'diagnostic-item'
    const path = document.createElement('span')
    path.className = 'diagnostic-path'
    path.textContent = `${error.path} ·`
    const message = document.createElement('span')
    message.textContent = error.message
    item.append(path, message)
    list.append(item)
  }
}

function createField(labelText, control) {
  const label = document.createElement('label')
  label.className = 'field-label'
  label.append(document.createTextNode(labelText), control)
  return label
}

function createTextControl(property, value) {
  const input = document.createElement('input')
  input.className = 'field-control'
  input.dataset.property = property
  input.value = value ?? ''
  return input
}

function renderProperties(rows) {
  const container = byId('property-editor')
  container.replaceChildren()
  byId('property-count').textContent =
    `${rows.length} field${rows.length === 1 ? '' : 's'}`
  if (!rows.length) {
    const note = document.createElement('p')
    note.className = 'empty-note'
    note.textContent =
      'Add properties in the schema editor to edit their metadata here.'
    container.append(note)
    return
  }

  for (const row of rows) {
    const details = document.createElement('details')
    details.className = 'property-card'
    const summary = document.createElement('summary')
    const path = document.createElement('span')
    path.className = 'property-path'
    path.textContent = row.path
    const type = document.createElement('span')
    type.className = 'type-badge'
    type.textContent = row.type
    summary.append(path, type)
    if (row.required) {
      const required = document.createElement('span')
      required.className = 'required-mark'
      required.textContent = '*'
      required.title = 'Required'
      summary.append(required)
    }

    const fields = document.createElement('div')
    fields.className = 'property-fields'
    const fieldset = document.createElement('div')
    fieldset.className = 'property-meta-row'
    const typeControl = typeControlFactory.get(row.type).createSelect(row.type)
    typeControl.dataset.path = JSON.stringify(row.propertyPath)
    fieldset.append(createField('TYPE', typeControl))
    const formatControl = createTextControl('format', row.property.format)
    formatControl.dataset.path = JSON.stringify(row.propertyPath)
    fieldset.append(createField('FORMAT', formatControl))
    const descriptionControl = createTextControl(
      'description',
      row.property.description,
    )
    descriptionControl.dataset.path = JSON.stringify(row.propertyPath)
    fields.append(fieldset, createField('DESCRIPTION', descriptionControl))
    const exampleControl = createTextControl(
      'example',
      row.property.example === undefined
        ? ''
        : JSON.stringify(row.property.example),
    )
    exampleControl.dataset.path = JSON.stringify(row.propertyPath)
    fields.append(createField('EXAMPLE · JSON OR TEXT', exampleControl))
    details.append(summary, fields)
    container.append(details)
  }
}

function renderFlatView(rows, schema) {
  const container = byId('flat-view')
  container.replaceChildren()
  byId('flat-count').textContent =
    `${rows.length} path${rows.length === 1 ? '' : 's'}`
  if (!schema) {
    const note = document.createElement('p')
    note.className = 'empty-note'
    note.textContent = 'Fields appear here once the schema is valid JSON.'
    container.append(note)
    return
  }
  if (!rows.length) {
    const note = document.createElement('p')
    note.className = 'empty-note'
    note.textContent = 'This schema has no properties yet.'
    container.append(note)
    return
  }
  for (const row of rows) {
    const item = document.createElement('div')
    item.className = 'flat-row'
    const name = document.createElement('span')
    name.className = 'flat-path'
    name.textContent = row.path
    name.title = row.description || row.path
    const type = document.createElement('span')
    type.className = 'flat-type'
    type.textContent = row.type
    if (row.required) {
      const marker = document.createElement('span')
      marker.className = 'flat-required'
      marker.textContent = '*'
      type.append(marker)
    }
    item.append(name, type)
    container.append(item)
  }
}

function renderDataResult(result) {
  const container = byId('data-errors')
  container.replaceChildren()
  byId('data-status').textContent = result.valid ? 'Valid data' : 'Invalid data'
  byId('data-status').style.color = result.valid
    ? 'var(--green-dark)'
    : 'var(--coral)'
  if (result.valid) {
    const note = document.createElement('p')
    note.className = 'data-success'
    note.textContent = 'This JSON matches the current schema.'
    container.append(note)
    return
  }
  for (const error of result.errors) {
    const note = document.createElement('div')
    note.className = 'data-error'
    note.textContent = `${error.path} · ${error.message}`
    container.append(note)
  }
}

const liveValidation = new LiveValidationObserver({
  endpoint: '/api/validate/schema',
  onResult: renderSchemaResult,
  onError: (error) => showToast(error.message),
})
const flatView = new FlatViewObserver((rows, schema) => {
  renderProperties(
    rows.map((row) => ({
      ...row,
      property: getProperty(schema, row.propertyPath),
    })),
  )
  renderFlatView(rows, schema)
})
subject.subscribe(liveValidation)
subject.subscribe(flatView)

function getProperty(schema, path) {
  let target = schema
  for (const key of path) target = target?.properties?.[key]
  return target || {}
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options)
  const result = await response.json()
  if (!response.ok)
    throw new Error(result.error || `Request failed (${response.status}).`)
  return result
}

async function validateData() {
  byId('data-errors').replaceChildren()
  byId('data-status').textContent = 'Checking…'
  try {
    const result = await requestJson('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schema: editor.value, data: dataEditor.value }),
    })
    renderDataResult(result)
  } catch (error) {
    renderDataResult({
      valid: false,
      errors: [{ path: '/', message: error.message }],
    })
  }
}

async function refreshHistory() {
  const container = byId('history-list')
  if (!schemaLink) {
    container.innerHTML =
      '<p class="empty-note">Save a version to start remote history.</p>'
    return
  }
  try {
    const versions = await requestJson(
      `/api/schemas/${encodeURIComponent(schemaLink)}/history`,
    )
    renderHistory(versions)
  } catch (error) {
    container.replaceChildren()
    const note = document.createElement('p')
    note.className = 'empty-note'
    note.textContent = error.message
    container.append(note)
  }
}

function renderHistory(versions) {
  const container = byId('history-list')
  container.replaceChildren()
  if (!versions.length) {
    const note = document.createElement('p')
    note.className = 'empty-note'
    note.textContent = 'No saved versions yet.'
    container.append(note)
    return
  }
  for (const [index, version] of versions.entries()) {
    const row = document.createElement('div')
    row.className = 'history-item'
    const entry = document.createElement('div')
    entry.className = 'history-entry'
    const name = document.createElement('span')
    name.className = 'history-name'
    name.textContent = version.label || `Version ${index + 1}`
    const date = document.createElement('span')
    date.className = 'history-time'
    date.textContent = new Date(
      `${version.created_at.replace(' ', 'T')}Z`,
    ).toLocaleString()
    entry.append(name, date)
    const restore = document.createElement('button')
    restore.className = 'history-restore'
    restore.textContent = 'Restore'
    restore.addEventListener('click', () => restoreVersion(version.id))
    const rename = document.createElement('button')
    rename.className = 'history-rename'
    rename.textContent = 'Rename'
    rename.addEventListener('click', () =>
      renameVersion(version.id, version.label || `Version ${index + 1}`),
    )
    const remove = document.createElement('button')
    remove.className = 'history-delete'
    remove.textContent = 'Delete'
    remove.addEventListener('click', () =>
      deleteVersion(
        version.id,
        version.label || `Version ${index + 1}`,
        versions.length === 1,
      ),
    )
    row.append(entry, rename, restore, remove)
    container.append(row)
  }
}

async function renameVersion(historyId, currentLabel) {
  const label = window.prompt('Name this version', currentLabel)
  if (label === null) return
  try {
    await requestJson(
      `/api/schemas/${encodeURIComponent(schemaLink)}/history/${historyId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      },
    )
    await refreshHistory()
    showToast('Version renamed.')
  } catch (error) {
    showToast(error.message)
  }
}

async function deleteVersion(historyId, label, isLastVersion) {
  const detail = isLastVersion
    ? ' This will also remove the public share link.'
    : ''
  if (!window.confirm(`Delete "${label}"? This cannot be undone.${detail}`))
    return
  try {
    const result = await requestJson(
      `/api/schemas/${encodeURIComponent(schemaLink)}/history/${historyId}`,
      { method: 'DELETE' },
    )
    if (result.schemaDeleted) {
      schemaLink = null
      const nextUrl = new URL(location.href)
      nextUrl.searchParams.delete('schema')
      history.replaceState(null, '', nextUrl)
      setStatus('Local draft')
    }
    await refreshHistory()
    showToast(
      result.schemaDeleted
        ? 'Version and share link deleted.'
        : 'Version deleted.',
    )
  } catch (error) {
    showToast(error.message)
  }
}

async function restoreVersion(historyId) {
  try {
    const version = await requestJson(
      `/api/schemas/${encodeURIComponent(schemaLink)}/history/${historyId}`,
    )
    commandHistory.execute(
      new ReplaceSchemaCommand(editor, version.content, setEditorText),
    )
    previousText = editor.value
    updateHistoryButtons()
    showToast('Version restored.')
  } catch (error) {
    showToast(error.message)
  }
}

async function saveSchema({ silent = false } = {}) {
  setStatus('Saving…', 'saving')
  const button = byId('save-button')
  button.disabled = true
  const content = editor.value
  try {
    const result = await requestJson('/api/schemas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(schemaLink ? { link: schemaLink } : {}),
        content,
      }),
    })
    schemaLink = result.link
    const shareUrl = new URL(location.href)
    shareUrl.searchParams.set('schema', schemaLink)
    history.replaceState(null, '', shareUrl)
    setStatus('Saved remotely', 'saved')
    await refreshHistory()
    if (!silent) showToast('Version saved.')
    return result
  } catch (error) {
    setStatus('Save failed', 'error')
    if (!silent) showToast(error.message)
    return null
  } finally {
    button.disabled = false
  }
}

async function shareSchema() {
  const saved = await saveSchema({ silent: true })
  if (!saved) return
  const shareUrl = new URL(location.href)
  shareUrl.searchParams.set('schema', saved.link)
  try {
    try {
      await navigator.clipboard.writeText(shareUrl.href)
      showToast('Share link copied to clipboard.')
    } catch {
      window.prompt('Copy your share link', shareUrl.href)
    }
  } catch (error) {
    showToast(error.message)
  }
}

async function exportSchema() {
  try {
    const format = byId('export-format').value
    const result = await requestJson('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editor.value, format }),
    })
    const blob = new Blob([result.result], {
      type: format === 'json' ? 'application/json' : 'text/markdown',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = format === 'json' ? 'schema.json' : 'schema.md'
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    showToast(`${format.toUpperCase()} export downloaded.`)
  } catch (error) {
    showToast(error.message)
  }
}

function changeProperty(control) {
  const path = JSON.parse(control.dataset.path)
  const property = control.dataset.property
  let value = control.value
  if (property === 'example' && value !== '') {
    try {
      value = JSON.parse(value)
    } catch {
      value = control.value
    }
  }
  const command = new UpdatePropertyCommand(
    editor,
    path,
    property,
    value,
    setEditorText,
  )
  commandHistory.execute(command)
  previousText = editor.value
  updateHistoryButtons()
}

editor.addEventListener('input', handleEditorChange)
editor.addEventListener('scroll', paintEditor, { passive: true })
editor.addEventListener('keydown', (event) => {
  if (event.key === 'Tab') {
    event.preventDefault()
    const start = editor.selectionStart
    const end = editor.selectionEnd
    editor.setRangeText('  ', start, end, 'end')
    handleEditorChange()
  }
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    liveValidation.update(editor.value)
    validateData()
  }
})
byId('property-editor').addEventListener('change', (event) => {
  if (event.target.matches('[data-property]')) changeProperty(event.target)
})
byId('format-button').addEventListener('click', () => {
  try {
    const nextText = `${JSON.stringify(JSON.parse(editor.value), null, 2)}\n`
    commandHistory.execute(
      new ReplaceSchemaCommand(editor, nextText, setEditorText),
    )
    previousText = editor.value
    updateHistoryButtons()
  } catch {
    showToast('Fix the JSON syntax before formatting.')
  }
})
byId('validate-data-button').addEventListener('click', validateData)
byId('share-button').addEventListener('click', shareSchema)
byId('save-button').addEventListener('click', saveSchema)
byId('export-button').addEventListener('click', exportSchema)
byId('refresh-history').addEventListener('click', refreshHistory)
byId('undo-button').addEventListener('click', () => {
  commandHistory.undo()
  updateHistoryButtons()
})
byId('redo-button').addEventListener('click', () => {
  commandHistory.redo()
  updateHistoryButtons()
})
document.addEventListener('keydown', (event) => {
  if (
    (event.ctrlKey || event.metaKey) &&
    !event.shiftKey &&
    event.key.toLowerCase() === 'z'
  ) {
    event.preventDefault()
    commandHistory.undo()
    updateHistoryButtons()
  } else if (
    (event.ctrlKey || event.metaKey) &&
    (event.key.toLowerCase() === 'y' ||
      (event.shiftKey && event.key.toLowerCase() === 'z'))
  ) {
    event.preventDefault()
    commandHistory.redo()
    updateHistoryButtons()
  }
})

async function loadInitialSchema() {
  if (!schemaLink) {
    setEditorText(`${JSON.stringify(initialSchema, null, 2)}\n`, {
      clearHistory: true,
    })
    validateData()
    return
  }
  try {
    const versions = await requestJson(
      `/api/schemas/${encodeURIComponent(schemaLink)}/history`,
    )
    if (!versions.length) throw new Error('Schema link was not found.')
    const latestContent = versions[versions.length - 1].content
    setEditorText(latestContent, { clearHistory: true })
    renderHistory(versions)
    setStatus('Shared schema loaded', 'saved')
  } catch (error) {
    schemaLink = null
    history.replaceState(null, '', location.pathname)
    setEditorText(`${JSON.stringify(initialSchema, null, 2)}\n`, {
      clearHistory: true,
    })
    showToast(`${error.message} Opened a fresh draft instead.`)
  }
  validateData()
}

paintEditor()
loadInitialSchema()
