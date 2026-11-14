# Development

## Scripts

| Command | What it does |
|---------|--------------|
| `pnpm dev` | run the app in development |
| `pnpm -r typecheck` | TypeScript strict check across packages |
| `pnpm lint` | ESLint (no `any`, no `console`, hook rules) |
| `pnpm -r test` | all unit/integration suites (Vitest) |
| `pnpm eval` | agent eval harness against the real LLM (skips without a key) |
| `pnpm strings:inventory` | regenerate `strings-inventory.md` after changing `strings.ts` |
| `pnpm --filter @apollo/desktop fetch-models` | download the on-device embedding model (build time only) |
| `pnpm --filter @apollo/desktop package` | build installable artifacts into `apps/desktop/release/` |

Tests run under the Node ABI and dev/packaging under the Electron ABI; the
`native-abi.mjs` script swaps `better-sqlite3`'s binary automatically via the
`pretest`/`predev`/`prepackage` hooks.
