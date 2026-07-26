# renderer/ — modular split of renderer.js

`renderer.js` is a large single file loaded as a classic `<script>` (no bundler,
no ES modules). We are splitting it into focused modules **incrementally**, one
cohesive slice at a time, so the working UI is never rewritten in one risky pass.

## Convention

- Each module is a classic script under `renderer/` that runs in the shared
  global scope (no `import`/`export`).
- Load each module in `index.html` **before** `renderer.js`, so its top-level
  `function` / `const` declarations are visible to the rest of the renderer.
  Call sites stay unqualified (e.g. `formatBytes(x)`), unchanged from before.
- Move code out of `renderer.js` **only when it is self-contained** — pure
  helpers first (no closures over renderer state, no dependency on load order
  beyond what the module itself declares). Stateful views come later, once there
  is UI test coverage to catch regressions.
- A symbol must be defined in exactly one place. When you move a function here,
  delete its definition from `renderer.js`.

## Current modules

- `util.js` — pure formatting / hashing helpers (`formatBytes`, `hashHue`,
  `markGradientFromColor`). First extraction; the template for the rest.

## Next candidates (not yet extracted)

- Group/profile pure helpers (`positiveProfileNumber`, `createGroupId`, …).
- Per-view render logic (logs, system) once behavior is pinned by tests.
