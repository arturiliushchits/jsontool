export class ReplaceSchemaCommand {
  constructor(editor, nextValue, onChange) {
    this.editor = editor
    this.nextValue = nextValue
    this.previousValue = editor.value
    this.onChange = onChange
  }

  execute() {
    this.editor.value = this.nextValue
    this.onChange(this.nextValue)
  }

  undo() {
    this.editor.value = this.previousValue
    this.onChange(this.previousValue)
  }
}

export class UpdatePropertyCommand {
  constructor(editor, path, property, value, onChange) {
    this.editor = editor
    this.path = path
    this.property = property
    this.value = value
    this.onChange = onChange
    const schema = JSON.parse(editor.value)
    const target = this.#getTarget(schema)
    this.previousValue = target[property]
    this.hadPreviousValue = Object.hasOwn(target, property)
  }

  execute() {
    this.#setValue(this.value, true)
  }

  undo() {
    this.#setValue(this.previousValue, this.hadPreviousValue)
  }

  #setValue(value, shouldSet) {
    const schema = JSON.parse(this.editor.value)
    const target = this.#getTarget(schema)
    if (shouldSet) target[this.property] = value
    else delete target[this.property]
    const nextText = `${JSON.stringify(schema, null, 2)}\n`
    this.editor.value = nextText
    this.onChange(nextText)
  }

  #getTarget(schema) {
    let target = schema
    for (const key of this.path) {
      target = target?.properties?.[key]
      if (!target || typeof target !== 'object')
        throw new Error('Property no longer exists in the schema.')
    }
    return target
  }
}

export class CommandHistory {
  constructor() {
    this.snapshots = []
    this.cursor = -1
    this.editor = null
    this.onChange = null
  }

  execute(command) {
    command.execute()
    this.record(command)
  }

  record(command) {
    this.editor = command.editor
    this.onChange = command.onChange
    this.snapshots.splice(this.cursor + 1)
    this.snapshots.push(command.editor.value)
    this.cursor = this.snapshots.length - 1
  }

  initialize(snapshots, editor, onChange) {
    this.snapshots = [...snapshots]
    if (!this.snapshots.length) this.snapshots.push(editor.value)
    this.cursor = this.snapshots.length - 1
    this.editor = editor
    this.onChange = onChange
  }

  get canUndo() {
    return this.cursor > 0
  }

  get canRedo() {
    return this.cursor >= 0 && this.cursor < this.snapshots.length - 1
  }

  undo() {
    if (!this.canUndo) return false
    this.cursor -= 1
    this.onChange(this.snapshots[this.cursor])
    return true
  }

  redo() {
    if (!this.canRedo) return false
    this.cursor += 1
    this.onChange(this.snapshots[this.cursor])
    return true
  }
}
