# JSON Tool

A lightweight workbench for editing JSON Schema, validating JSON data, inspecting nested properties, sharing versions, and exporting schema documentation.

## Requirements

- Node.js 22.13 or newer (built-in `node:sqlite`)
- npm

## Run

```sh
npm install
npm start
```

Open `http://localhost:3000`. For automatic server restarts during development, use `npm run dev`.

The SQLite database is created at `server/db/json-tool.sqlite` on first startup. Edits and Undo/Redo history stay local until you choose **Save version** or **Share**. Snapshots default to their UTC save date and time (`YYYY-MM-DD HH:mm:ss UTC`) as a name and can be renamed, restored, or deleted with confirmation. Share saves the current snapshot before copying the public link. Deleting the last snapshot also removes its public link. Links are public and do not require an account.

## Features

- JSON Schema editor with syntax highlighting, formatting, and live draft-07 / draft-2020-12 diagnostics
- Visual property metadata editor, flat property view, and data validation
- Undo/redo for source and metadata changes
- Explicitly saved, renameable, restorable, and deletable remote snapshots
- Public share links with confirmation before deleting remote history
- Markdown table and canonical JSON exports

## Testing

`npm test` runs the unit, integration, and Playwright end-to-end suites. The unit and integration suites use `node:test`; integration tests use native `fetch` against isolated databases and ephemeral ports. Install the browser binary once after `npm install`:

```sh
npx playwright install chromium
```

Run one suite with `npm run test:unit`, `npm run test:integration`, or `npm run test:e2e`. Mutation testing is separate because it takes longer: run `npm run test:mutation`. Stryker reports are written to `reports/mutation/`; classify survivors in [tests/mutation-survivors.md](tests/mutation-survivors.md).

`npm run check` runs Biome.