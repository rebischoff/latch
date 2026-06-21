# TypeScript monorepo conventions

How the Latch workspace compiles and resolves modules. Complements [`../reference/packages.md`](../reference/packages.md) (layout) and root [`tsconfig.base.json`](../../../tsconfig.base.json).

## Decision: bundler monorepo — extensionless relative imports (2026-06-20)

**Choice:** Relative imports in app and `@latch/*` package **source** omit file extensions.

```ts
// ✅ bundler monorepo (v1)
import { latch } from "./latch";
import { ContactListPatchSchema } from "./contact_list.schema.generated";

// ❌ NodeNext emit convention — not used in v1
import { latch } from "./latch.js";
import { ContactListPatchSchema } from "./contact_list.schema.generated.js";
```

| Topic | v1 choice |
|-------|-----------|
| Relative imports (`./`, `../`) | **Extensionless** |
| Import path extensions | **Do not** use `.ts` / `.tsx` in specifiers |
| `tsconfig` | `moduleResolution: "bundler"`, `noEmit: true` (root `tsconfig.base.json`) |
| `@latch/*` package `exports` | Point at `./src/index.ts` — unchanged |
| Published npm dist | **Deferred** — Phase 07; no `NodeNext` + emitted `.js` dist in v1 |
| Dev bundler (consumer apps) | **Turbopack** (Next.js 16 default); no webpack `extensionAlias` crutch after migration |

**Rationale:** The repo is a **bundler monorepo**, not a Node ESM emit pipeline. Sources are `.ts`; bundlers (Turbopack, webpack) resolve them directly. The `.js` suffix on `.ts` sources is correct only when TypeScript **emits** `foo.js` beside `foo.ts` (`moduleResolution: "NodeNext"`). That pattern required a webpack-only `extensionAlias` workaround; **Turbopack has no equivalent** ([vercel/next.js#82945](https://github.com/vercel/next.js/issues/82945)), so SubHub and future apps fail with `Module not found: …generated.js` until imports are extensionless.

**Scope:** Import **specifiers** only — generated files remain `*.generated.ts`. Applies to:

- Hand-written app code (`apps/*/lib`, `app/`, `components/`)
- `@latch/*` package internals (`packages/*/src`)
- Codegen output (`*.generated.ts`, scaffold templates under `packages/codegen/template/`)

**Enforcement:** `npm run check:imports` (CI) — fails on relative `.js` / `.mjs` import specifiers in `apps/**` and `packages/*/src`. ESLint `no-restricted-imports` mirrors the rule under `packages/*/src` for IDE feedback.

**Supersedes:** Implicit `NodeNext`-style `.js` suffixes introduced during early scaffold; webpack `extensionAlias` in consumer `next.config.ts` (remove after verification).

## Package imports vs relative imports

| Import style | Extension | Example |
|--------------|-----------|---------|
| Workspace package (`@latch/*`) | N/A — bare specifier | `import { … } from "@latch/dal"` |
| Relative within package or app | **None** | `import { … } from "./repository"` |
| JSON / assets | Per bundler | `import data from "./fixture.json"` |

## Related

- [`../reference/packages.md`](../reference/packages.md) — monorepo layout and boundaries
- [`../../../packages/codegen/docs/reference/codegen-scope.md`](../../../packages/codegen/docs/reference/codegen-scope.md) — codegen emit boundaries
- [SubHub task 21 — bundler import convention](../../../apps/subhub/docs/tasks/21-bundler-import-convention.md) — rollout steps (codemod, Turbopack default, CI)
