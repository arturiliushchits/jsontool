import ExportStrategy from './ExportStrategy.js'

function escapeCell(value) {
  return String(value ?? '')
    .replaceAll('|', '\\|')
    .replaceAll('\n', ' ')
}

export default class MarkdownExportStrategy extends ExportStrategy {
  export(schemaObject) {
    const rows = []
    const walk = (node, path = '') => {
      if (!node || typeof node !== 'object') return
      const properties = node.properties || {}
      const requiredNames = new Set(node.required || [])
      for (const [name, property] of Object.entries(properties)) {
        const fieldPath = path ? `${path}.${name}` : name
        const type = Array.isArray(property.type)
          ? property.type.join(' | ')
          : property.type || 'any'
        rows.push([
          fieldPath,
          type,
          property.format || '',
          requiredNames.has(name) ? 'Yes' : 'No',
          property.description || '',
          property.example === undefined
            ? ''
            : JSON.stringify(property.example),
        ])
        walk(property, fieldPath)
      }
    }
    walk(schemaObject)

    const headings = [
      'Field',
      'Type',
      'Format',
      'Required',
      'Description',
      'Example',
    ]
    const divider = headings.map(() => '---')
    return [headings, divider, ...rows]
      .map((row) => `| ${row.map(escapeCell).join(' | ')} |`)
      .join('\n')
  }
}
