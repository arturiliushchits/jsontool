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

The SQLite database is created at `server/db/json-tool.sqlite` on first startup. Draft schemas are kept in the browser until you choose **Share**; shared schemas are autosaved with a version history. Links are public and do not require an account.

## Features

- JSON Schema editor with syntax highlighting, formatting, and live draft-07 / draft-2020-12 diagnostics
- Visual property metadata editor, flat property view, and data validation
- Undo/redo for source and metadata changes
- Public share links, autosave, and restoreable version history
- Markdown table and canonical JSON exports

## Project checks

`npm run check` runs Biome. `npm test` uses Node's test runner.