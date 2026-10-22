# Mutation Testing Notes

First StrykerJS run (`npm run test:mutation`, TAP runner; 2026-10-22): **64.88% mutation score**. Of 373 mutants, 224 were killed, 85 survived, 46 had no coverage, 18 timed out, and none errored. The JSON and HTML reports are in the ignored `reports/mutation/` directory. Stryker's timeouts are counted separately from survivors.

| File | Survived | Classification | Explanation and follow-up |
| --- | ---: | --- | --- |
| `public/js/commands.js` | 16 | 15 missing assertions; 1 equivalent | Add checks for update callbacks, stale property paths, uninitialized/empty history, redo from the initial cursor, and redo when unavailable. The `shouldSet` mutant that writes `undefined` during undo is observationally equivalent here because JSON serialization omits that property. |
| `public/js/observer.js` | 16 | Missing assertions | Exercise rapid updates to prove debounce cancellation; verify HTTP method, headers, and rejected responses; cover flat-view fallback type/description values and non-object input. |
| `public/js/ui/type-controls.js` | 5 | Missing assertions | Assert the complete shared type-options list and generated select/option values, including selection state. Current tests only check the cached instance and one option. |
| `server/core/export/MarkdownExportStrategy.js` | 27 | Missing assertions | Expand exact-output cases for empty/default fields, all headings and separators, examples, multiline/pipe escaping, optional type arrays, and non-object children. |
| `server/core/validation/JsonValueValidator.js` | 8 | Missing assertions | Cover primitive and array schema inputs, draft selection, strict/all-errors configuration effects, and exact normalized error fields/messages. |
| `server/core/validation/SchemaStructureValidator.js` | 12 | Missing assertions | Cover primitive/array inputs, every unsupported-dialect guard, schema compilation failures, and error normalization/configuration branches. |
| `server/core/export/ExportContext.js` | 1 | Out of scope | Only changes the `TypeError` message for a missing strategy; the public contract requires rejection, not a specific wording. |

The 46 **NoCoverage** mutants were in unexercised defensive/error branches, base-class default formatting, and the abstract export strategy. They are not counted as survivors. The 18 **Timeout** mutants need a later run with adjusted timeout/concurrency before drawing conclusions. The classification above is actionable: all non-equivalent survivors identify assertions that would improve confidence, but they do not indicate failures in the production code by themselves.

Classification guide:

- **Equivalent:** The mutation is behaviorally indistinguishable for valid inputs under the contract.
- **Out of scope:** It changes behavior the specification does not require this module to guarantee.
- **Missing assertion:** The mutation represents a meaningful defect and should be killed by an added test.
- **Tool limitation:** The runner cannot observe the mutant reliably; document the limitation and configure around it where practical.