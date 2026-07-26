# Architecture overview

OpenBrowser is a single Electron desktop app written in plain Node.js /
CommonJS with **zero runtime dependencies** — HTTP servers, the CDP client, the
proxy forwarder, and the MCP server are all hand-rolled. All application code
lives under `Browserapp/`. This document is the public map of how the pieces fit
together (it replaces the maintainer-only `CODE_OVERVIEW.md`).

## Layers

```
 Application shell  →  Engine  →  Fingerprint  →  Kernel  →  Isolation
                              ↘  Proxy   ↘  Window sync   ↘  Automation
```

### 1. Application shell
- `main.js` — Electron main process: window creation, ~90 IPC channels
  (`profiles:*`, `kernel:*`, `sync:*`, `proxy:*`, `automation:*`, …), app
  auto-update, global shortcuts, window tiling, trusted-IPC validation.
- `preload.js` — `contextBridge` `window.ops` API surface.
- `renderer.js` + `index.html` + CSS themes — the UI (see `renderer/README.md`
  for the ongoing modular split).
- `i18n.js` — UI translations (zh-CN and en complete; other languages partial).

### 2. Engine
- `engine.js` — `BrowserEngine`: profile schema sanitation, per-profile data
  root, launch/stop, proxy resolution, fingerprint application per tab and
  worker, extension assignment, start-page URL building, process watch/kill.
- `cdp.js` — raw Chrome DevTools Protocol over HTTP + WebSocket (no
  puppeteer/playwright): `targets`, `navigate`, `call`, `setWindowBounds`, etc.

### 3. Fingerprint (the anti-detect core)
- `automation/fingerprint.js` — deterministic, seed-derived fingerprint. Split
  into **staticConfig** (stable identity: canvas/webgl/audio noise, cores,
  memory, platform, media devices) and **dynamicConfig** (exit-IP layer:
  timezone, geoposition, WebRTC). Exports `buildFingerprint`,
  `buildInjectionScript`, `buildWorkerInjectionScript`, `chromeArgsForFingerprint`.
- `automation/user-agent.js` — UA + Client Hints + TLS extension policy.
- `automation/kernel-init-sync.js` — maps the JS fingerprint into the native
  kernel's `init.json` so the injection layer and the kernel agree on one
  identity (`mapFingerprintToInitFields`, `fingerprintForNativeKernelInject`,
  `consistencyFromFp`).

### 4. Kernel
- `automation/browser-kernel.js` — `BrowserKernelManager`: resolves the
  integrated kernel under `kernels/`, CDP-readiness detection, archive
  extraction, and kernel policy (prefer independent kernel, optional
  system-browser fallback). macOS x86_64 ships the OpenBrowser 148 kernel.

### 5. Isolation
- `automation/isolation.js` — per-profile lock files with PID liveness,
  path-containment checks, and refusal to run against system Chrome/Edge data.

### 6. Proxy
- `proxy-forwarder.js` — HTTP/HTTPS/SOCKS5 parsing, authenticated local
  forwarder, TLS/JA3 shaping, country lookup, SSRF guards.
- `automation/proxy-store.js`, `automation/ip-health-score.js`.

### 7. Window sync
- `live-sync-v5.js` — current `LiveSyncController` (production entry point).
  `live-sync-v4.js` is an internal dependency of v5; `live-sync.js` is legacy.
- `native-*.cs` — Windows UIAutomation input mirroring (compiled at build time).

### 8. Automation (Local API / MCP / RPA)
- `automation/index.js` — mounts the automation stack.
- `automation/local-api-server.js` — HTTP API on `127.0.0.1:50325`.
- `automation/mcp-server.js` — stdio JSON-RPC MCP server.
- `automation/rpa-engine.js` + `rpa-store.js` + templates.
- `automation/cloud-sync.js` — local / WebDAV / GitHub backup.

## Launch path

`main.js` `profiles:start` → `BrowserEngine.start()` → `buildFingerprint()` +
`chromeArgsForFingerprint()` → write kernel `init.json` (`kernel-init-sync`) →
resolve kernel (`browser-kernel`) → spawn → CDP (`cdp.js`) → apply fingerprint
per tab/worker.

## Tests

Self-tests are plain Node `assert` scripts (throw → non-zero exit), grouped by
`scripts/run-selftests.js`:
- `unit` — offline logic / protocol / security / fingerprint consistency (CI).
- `fingerprint` — offline anti-detect consistency subset.
- `e2e` — real kernel + multi-window (needs git-lfs kernel binaries).

Online detection-site regression is `scripts/detect-regression.js`
(`npm run detect:regression`), run locally or nightly — not in push CI.

## Platform focus

Delivery currently targets **macOS x86_64 (Intel)**. Windows / macOS arm64 /
Linux code paths remain in the tree (native drivers, arm64 packaging,
cross-platform detection) but are not a CI/release target — see the README
platform table.
