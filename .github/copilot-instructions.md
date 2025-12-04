<!-- Short repository-specific instructions for AI coding agents -->
# Copilot instructions — WIQL Formatter (repo-specific)

Purpose
- Help AI agents become productive quickly when working on this VS Code extension that formats WIQL files.

Big picture
- This is a minimal VS Code extension (TypeScript) that formats `.wiql` files by normalizing whitespace, uppercasing keywords (optionally), and breaking clauses/columns into readable lines.
- Runtime flow: `src/extension.ts` registers a `DocumentFormattingEditProvider` that calls `WiqlFormatter.format()` (exported from `src/formatter.ts`). `src/parser.ts` uses `node-sql-parser` to attempt AST-based normalization and falls back to heuristics.

Key files and responsibilities
- `src/extension.ts` — VS Code activation, configuration read (`wiqlFormatter.uppercaseKeywords`), and registration of the formatter provider.
- `src/formatter.ts` — Core formatting logic. Important functions:
  - `WiqlFormatter.format(input, options)` — main entry point used by extension, `test-format.js`, and tests.
  - `splitConjunctionsWithDepth` — handles indentation/splitting of `AND`/`OR` by nesting depth.
  - Keyword list: `KEYWORDS` near top; modify here to add/remove recognized tokens.
- `src/parser.ts` — wraps `node-sql-parser` (`Parser.astify` + `Parser.sqlify`) to produce a normalized SQL-like string. Parsing errors are propagated so `formatter.ts` can fallback.
- `test/formatter.test.js` — unit tests (Mocha + Chai) that assert formatting behavior; tests import the compiled `out/formatter`.
- `test-format.js` and `sample.wiql`/`sample2.wiql` — simple runner and samples for manual verification.
- `package.json` — build/test scripts to use: `npm run compile`, `npm test`, and `npm run watch`.

Build / test / debug workflows (explicit)
- Compile (required before running tests or `test-format.js`):
  - `npm run compile` (runs `tsc -p ./` with `outDir: out`).
- Run tests:
  - `npm test` (compiles then runs `mocha --exit` against `out/` compiled files).
- Manual formatter runner:
  - `node test-format.js` (requires compiled `out/formatter` and `.wiql` samples in repo root). Useful for quick checks.
- Debugging the extension in VS Code:
  - Compile, open the workspace in VS Code and press F5 to launch an Extension Development Host. Then open a `.wiql` file and run `Format Document`.

Project-specific conventions & patterns
- Tests import compiled output in `out/` (not `src/`); always compile before running tests or manual scripts.
- Parser-first with graceful fallback: `WiqlFormatter.format` prefers `parseAndNormalize()` (AST-based) when `uppercaseKeywords=true`. If parsing fails it replaces string literals with `__STRn__` placeholders and runs heuristics, then restores them. When `uppercaseKeywords=false` the parser step is skipped and heuristics are used while still extracting strings.
- String extraction token: `__STR{n}__` (used in `formatter.ts`). If you modify extraction, update both extraction and restoration logic.
- Clause and column formatting is heuristic-driven: changing newline/indent rules requires editing `formatter.ts` where `SELECT ... FROM` handling and `splitConjunctionsWithDepth` live.
- The parser (`node-sql-parser`) may change identifier quoting (backticks/[]). Tests account for this by using regexes that accept quoted or unquoted identifiers.

Integration points & external deps
- `node-sql-parser` (see `package.json`): used to normalize SQL-like WIQL. Be aware of dialect differences; `parser.sqlify(ast)` may produce SQL that differs from original casing/quoting.
- VS Code API (`vscode` devDependency) — extension activation relies on `onLanguage:wiql` (see `package.json -> activationEvents`) and `contributes.languages` for `.wiql` mapping.

Common edits and examples
- To add a keyword: update `KEYWORDS` array in `src/formatter.ts` and ensure tests cover its casing behavior.
- To change how SELECT columns are split: edit the code that finds `SELECT ... FROM` in `src/formatter.ts` (look for `selFrom` regex and the `parts` splitting loop).
- To adjust indentation rules for `AND`/`OR`: edit `splitConjunctionsWithDepth` (in `src/formatter.ts`) — tests assert indentation by matching `\n\s+AND` / `\n\s+OR`.

Quick checks before PRs
- Run `npm run compile` then `npm test` — failing tests often mean formatting logic regressed or parser output changed.
- Run `node test-format.js` to preview formatted samples (`sample.wiql`, `sample2.wiql`).

Notes for AI agents
- Preserve the exported APIs and public behavior of `WiqlFormatter.format` when making changes; tests and extension assume the signature and `out/` compiled artifact.
- Avoid changing `package.json` scripts unless you update README and CI accordingly.
- When changing parsing behavior, update tests in `test/` and `sample*.wiql` if necessary.

If anything is unclear or you want this tailored further (e.g., stricter rules, more examples), ask and I'll iterate.
