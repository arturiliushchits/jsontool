# Mutation Testing Audit

## Scores

Both runs used the TAP runner and 373 mutants. The baseline is the first recorded run (2026-10-22); the follow-up is the full `npm run test:mutation` run after the three regression-test commits (2026-10-28).

| Run | Mutation score | Killed | Survived | No coverage | Timeout | Errors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 64.88% | 224 | 85 | 46 | 18 | 0 |
| Follow-up | 68.63% | 248 | 71 | 46 | 8 | 0 |

The score rose 3.75 percentage points. The report's three targeted mutants are now killed:

| Mutant | Mutation that had survived | Strengthened test / previous gap | Test-only commit |
| --- | --- | --- | --- |
| `public/js/observer.js` #87 | Removed `clearTimeout(this.timer)` | The old test sent only one update. It now sends two rapid updates and asserts that only the latest schema is posted and returned. | `23519fa` `test: cover live validation debounce cancellation` |
| `server/core/validation/JsonValueValidator.js` #299 | Removed the non-object schema type check | The old test passed `null`, which still hit the `!schema` part of the guard. It now asserts the complete normalized error for a non-empty string schema. | `88215b0` `test: assert invalid schema type rejection` |
| `server/core/export/MarkdownExportStrategy.js` #236 | Reversed the `example === undefined` test | The old assertion stopped before the example column. It now checks the serialized, pipe-escaped example cell. | `b7437a2` `test: assert Markdown example cells` |

These are three separate commits, each containing a test-only change. The full mutation run completed successfully; Stryker reported 248 killed and all three IDs above as killed. The JSON and HTML run artifacts are generated under the ignored `reports/mutation/` directory.

## Branch Coverage

Reproduce the Node built-in coverage report with `npm run test:coverage` (Node 22.19.0 in the recorded run). The script runs smoke and unit tests with `--experimental-test-coverage`; it reports line, branch, and function coverage.

| Module | Line | Branch | Function | Test signal |
| --- | ---: | ---: | ---: | --- |
| `public/js/commands.js` | 100.00% | 87.50% | 100.00% | History edge states and property-update callbacks are not asserted. |
| `public/js/observer.js` | 97.44% | 76.19% | 100.00% | Request failures/options and flat-view fallback values remain weakly asserted. |
| `public/js/ui/type-controls.js` | 71.43% | 100.00% | 75.00% | `createSelect` is not executed; the branch percentage does not reflect missing DOM behavior. |
| `server/core/export/ExportContext.js` | 100.00% | 100.00% | 100.00% | Rejection behavior is covered; only the unspecified error wording survives. |
| `server/core/export/ExportStrategy.js` | 60.00% | 100.00% | 0.00% | Abstract default method is not exercised. |
| `server/core/export/JsonExportStrategy.js` | 100.00% | 100.00% | 100.00% | Unit behavior is covered; current timeout mutants are listed below. |
| `server/core/export/MarkdownExportStrategy.js` | 100.00% | 86.36% | 100.00% | Exact table output, missing-field cells, and headings are not fully asserted. |
| `server/core/validation/BaseValidator.js` | 100.00% | 83.33% | 100.00% | No uncovered lines; some normalization behavior still lacks assertions. |
| `server/core/validation/JsonValueValidator.js` | 92.31% | 72.73% | 100.00% | Ajv draft/configuration and compile-error branches are weakly tested. |
| `server/core/validation/SchemaStructureValidator.js` | 79.59% | 85.71% | 100.00% | Lines 36-47 are uncovered; invalid recognized-draft schemas and error normalization are missing. |
| `server/logger.js` | 100.00% | 66.67% | 75.00% | Some logger branches are not covered by the unit suite. |
| `server/requestContext.js` | 100.00% | 100.00% | 100.00% | Covered. |
| **All files** | **96.38%** | **88.07%** | **95.88%** | Includes smoke and unit tests, not integration or E2E tests. |

The weakest behavior coverage is `type-controls.js` (its DOM methods have no unit coverage), followed by `SchemaStructureValidator.js` (55.36% mutation score), `observer.js` (64.06%), and `JsonValueValidator.js` (68.57%). `MarkdownExportStrategy.js` has 71.43% mutation score despite full line coverage: reaching a line is not the same as asserting its output. `commands.js` is also only 75.00% by mutation score. The overall branch percentage hides these module-level gaps.

## Survivor Audit

The following inventory accounts for every one of the 71 survivors in the follow-up JSON report. “Defer” means it is not one of the three regression fixes requested here; it does **not** mean the behavior is proven equivalent or safe. The note states why the current test let it survive and the contract/risk that would make it reasonable to defer.

### `public/js/commands.js` (16)

| ID | Mutant | Why it survived; disposition |
| ---: | --- | --- |
| 12 | `shouldSet` becomes `true` | Undo writes `undefined`, which `JSON.stringify` omits; the post-undo parsed-object assertion sees the same result. Equivalent for this JSON serialization contract. |
| 15 | Remove `onChange(nextText)` | Update-property test supplies a no-op callback. Defer; callback notification is observable and not tested for this command. |
| 18 | Remove optional access before `[key]` | Tests only follow an existing nested path. Defer; missing intermediate properties may now throw differently. |
| 19 | Remove optional access before `.properties` | Same valid-path-only setup. Defer; stale paths lack assertions. |
| 21 | Disable first invalid-target condition | No test updates a property after its path becomes invalid. Defer; stale schema edits are untested. |
| 22 | Change guard `||` to `&&` | Same missing stale-path case; valid object paths do not distinguish the guard. Defer. |
| 24 | Disable the `typeof target` condition | No primitive intermediate path is tested. Defer; malformed paths are weakly covered. |
| 29 | Empty `CommandHistory` constructor | Every history workflow calls `initialize` before use. Defer; fresh-instance behavior is not a tested contract. |
| 30 | Replace initial empty snapshots with a sentinel | Constructor state is overwritten by `initialize` in the test. Defer; no fresh-history assertion. |
| 31 | Change initial cursor `-1` to `+1` | `initialize` resets the cursor before any history operation. Equivalent under the tested initialize-first usage. |
| 41 | Replace copied snapshots with `[]` | The test initializes a single snapshot equal to `editor.value`; the empty-list fallback reconstructs that same state. Defer; a distinct/multi-entry imported history is not tested, and could be lost. |
| 44 | Skip adding editor value for empty snapshots | Tests initialize with a non-empty snapshot list. Defer; empty initialization is not exercised. |
| 46 | Set cursor to `length + 1` | The test executes a command immediately after initialization, and `record` resets the cursor. Defer; undo/redo before the first recorded command is not asserted and can observe an invalid cursor. |
| 56 | Force first `canRedo` condition true | The second range check masks it for tested cursor values. Equivalent while the cursor is always valid; initial/uninitialized state is untested. |
| 57 | Change `cursor >= 0` to `cursor > 0` | No assertion asks `canRedo` at cursor zero with multiple snapshots. Defer; redo from the initial snapshot is not directly checked. |
| 74 | Disable the unavailable-redo guard | The test checks unavailable undo but not unavailable redo. Defer; calling redo at the end may change return behavior. |

### `public/js/observer.js` (15)

| ID | Mutant | Why it survived; disposition |
| ---: | --- | --- |
| 91 | Change request method `POST` to empty | Fetch stub ignores options other than body. Defer; HTTP method is part of the request contract. |
| 92 | Remove request headers | Test does not assert headers. Defer; server content negotiation may fail. |
| 93 | Empty the content-type header value | Same request-options gap as #92. Defer. |
| 97 | Disable `response.ok` failure check | Only successful responses are tested. Defer; rejected HTTP responses lack coverage. |
| 113 | Disable non-object node guard | Tests only use object schema nodes. Defer; malformed/null children may fail during flattening. |
| 114 | Change guard `||` to `&&` | Same untested non-object child path. Defer; malformed input behavior may change. |
| 116 | Disable `typeof node` check | Primitive child schemas are not checked. Defer. |
| 122 | Default required list to a sentinel array | No property named `Stryker was here` is tested when `required` is absent. Defer; unusual but observable false-required output. |
| 130 | Force type fallback condition true | Existing flat-view test uses explicit types. Defer; missing-type fallback is untested. |
| 131 | Force type fallback condition false | Same missing-type case. Defer. |
| 132 | Change type fallback `||` to `&&` | Same fallback-value gap. Defer; absent type may produce a different value. |
| 136 | Force description fallback condition true | Existing flat-view test uses a description. Defer; absent-description output is untested. |
| 137 | Force description fallback condition false | Same absent-description case. Defer. |
| 138 | Change description fallback `||` to `&&` | Same fallback-value gap. Defer; empty and missing descriptions are not distinguished. |
| 139 | Replace empty description fallback with text | No assertion covers a property without a description. Defer. |

### `public/js/ui/type-controls.js` (6)

| ID | Mutant | Why it survived; disposition |
| ---: | --- | --- |
| 147 | Replace `string` option with empty text | Test checks only that `integer` is present, not the complete options list. Defer; available JSON Schema types are user-visible. |
| 148 | Replace `number` option with empty text | Same incomplete-list assertion. Defer. |
| 150 | Replace `boolean` option with empty text | Same incomplete-list assertion. Defer. |
| 151 | Replace `object` option with empty text | Same incomplete-list assertion. Defer. |
| 152 | Replace `array` option with empty text | Same incomplete-list assertion. Defer. |
| 153 | Replace `null` option with empty text | Same incomplete-list assertion. Defer. |

### `server/core/export/MarkdownExportStrategy.js` (16)

| ID | Mutant | Why it survived; disposition |
| ---: | --- | --- |
| 202 | Disable non-object node guard | Tested inputs contain object nodes. Defer for malformed/non-schema child values; valid schema behavior does not exercise it. |
| 205 | Disable the `typeof node` part of the guard | Same non-object-input gap. Defer; null/primitive child handling is not asserted. |
| 214 | Default `required` to a sentinel array | Test has an explicit `required` list. Defer; absent-list edge case with a matching field name is untested. |
| 233 | Replace missing-description fallback with text | Both tested rows have no assertion for the empty description cell on every field. Defer; output changes for undocumented fields. |
| 235 | Force the example-presence condition false | The strengthened row has an example; the no-example row is only checked by a prefix. Defer; blank example-cell output is not exact-asserted. |
| 237 | Replace empty example fallback with text | Same no-example row gap as #235. Defer. |
| 240 | Remove the headings array | Test searches for data-row substrings, not the full table. Defer; Markdown header can disappear unnoticed. |
| 241 | Empty `Field` heading | Header is not asserted. Defer; exported column label is observable. |
| 242 | Empty `Type` heading | Header is not asserted. Defer. |
| 243 | Empty `Format` heading | Header is not asserted. Defer. |
| 244 | Empty `Required` heading | Header is not asserted. Defer. |
| 245 | Empty `Description` heading | Header is not asserted. Defer. |
| 246 | Empty `Example` heading | Header is not asserted. Defer. |
| 247 | Make divider mapper return `undefined` | Test does not assert the Markdown separator row. Defer; table formatting may be invalid. |
| 248 | Empty divider cell | Same missing separator-row assertion. Defer. |
| 253 | Join rows without newline separators | Substring assertions still find each row. Defer; output layout is not fully asserted. |

### `server/core/validation/JsonValueValidator.js` (5)

| ID | Mutant | Why it survived; disposition |
| ---: | --- | --- |
| 311 | Replace absent `$schema` fallback with text | Tests do not exercise draft selection with a schema that differentiates drafts. Defer; implicit-draft handling is weakly tested. |
| 312 | Replace absent `$schema` fallback with empty string | Same draft-selection gap. Defer. |
| 313 | Remove Ajv options | Tests do not assert strictness or complete error aggregation. Defer; accepted schemas/error details may change. |
| 314 | Set `allErrors` false | Current invalid-value assertion checks only the first required error. Defer; multiple-error reporting is untested. |
| 315 | Set `strict` true | Tested schemas do not expose strict-mode differences. Defer; unknown-keyword/format behavior is untested. |

### `server/core/validation/SchemaStructureValidator.js` (12)

| ID | Mutant | Why it survived; disposition |
| ---: | --- | --- |
| 331 | Disable falsy-schema guard | Test checks an array, not `null` or other falsy schema values. Defer; input-type edge cases are incomplete. |
| 332 | Change invalid-schema guard `||` to `&&` | Test checks an array only. Defer; primitive schema inputs are not covered. |
| 334 | Disable non-object type check | Same missing primitive-schema cases. Defer. |
| 340 | Replace empty `instancePath` fallback with text | Structure test asserts message only. Defer; normalized path is not asserted for this error. |
| 341 | Empty the structure error keyword | Test checks message but not the complete error object. Defer. |
| 359 | Empty unsupported-dialect `instancePath` | Test checks keyword only. Defer; exact error path is missing. |
| 361 | Empty unsupported-dialect message | Test checks keyword only. Defer; message is not asserted. |
| 362 | Make draft-selection substring empty | Tested draft-07/2020 schemas use constructs accepted by both validators. Defer; draft-specific behavior is not proven. |
| 363 | Remove Ajv options | Strictness/error aggregation are not asserted. Defer. |
| 364 | Set `allErrors` false | No test checks multiple schema-structure errors. Defer. |
| 365 | Set `strict` true | No schema using an unknown keyword/format exercises this option. Defer. |
| 367 | Always accept `validateSchema` | No invalid schema under a supported dialect is tested. Defer; this is a meaningful validation gap. |

### `server/core/export/ExportContext.js` (1)

| ID | Mutant | Why it survived; disposition |
| ---: | --- | --- |
| 183 | Change missing-strategy error message | Test asserts `TypeError`, not wording. Equivalent to the documented contract, which requires rejection but specifies no message. |

## Timeout Audit

Stryker's configured default `timeoutMS` is 5000 ms, with `concurrency: 2` and default `timeoutFactor: 1.5`. The first run's 18 timeout statuses were not equivalent to survivors; they were inconclusive test executions. On the follow-up run, 15 of those IDs became killed, two became survivors, and one remained timed out. Seven other mutants timed out, leaving eight timeout statuses total. The changing set indicates timeouts are sensitive to runtime/worker load; it does not prove that the remaining mutants are harmless. Raising the timeout would improve diagnosis but also increases the full-run duration; no timeout mutant is counted as killed or ignored in the score.

| Baseline timeout | Follow-up status | Baseline timeout | Follow-up status |
| --- | --- | --- | --- |
| `observer.js` #135 | Killed | `SchemaStructureValidator.js` #284 | Killed |
| `type-controls.js` #153 | Survived | `SchemaStructureValidator.js` #285 | Killed |
| `MarkdownExportStrategy.js` #205 | Survived | `BaseValidator.js` #289 | Killed |
| `MarkdownExportStrategy.js` #218 | Killed | `BaseValidator.js` #290 | Killed |
| `MarkdownExportStrategy.js` #224 | Killed | `JsonValueValidator.js` #294 | Killed |
| `MarkdownExportStrategy.js` #225 | Killed | `JsonValueValidator.js` #295 | Killed |
| `BaseValidator.js` #259 | Killed | `ExportContext.js` #173 | Killed |
| `BaseValidator.js` #269 | Killed | `ExportContext.js` #174 | Timeout |
| `BaseValidator.js` #270 | Killed | `BaseValidator.js` #272 | Killed |

The eight timeouts in the follow-up report are `type-controls.js` #169 and #170; `MarkdownExportStrategy.js` #198 and #203; `JsonValueValidator.js` #303; `ExportContext.js` #174; and `JsonExportStrategy.js` #188 and #189. They need a targeted rerun with a larger `timeoutMS` before an individual kill/survive conclusion is possible.

The follow-up report also has 46 **NoCoverage** mutants (10 in `type-controls.js`, 13 in `SchemaStructureValidator.js`, 8 in `observer.js`, 6 in `JsonValueValidator.js`, 3 in `commands.js`, 2 each in `MarkdownExportStrategy.js`, `BaseValidator.js`, and `ExportStrategy.js`). NoCoverage means the relevant code was not executed, not that the mutant survived or was killed.