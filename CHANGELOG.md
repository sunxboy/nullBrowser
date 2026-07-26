# Changelog

All notable changes to OpenBrowser are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Grouped self-test runner (`scripts/run-selftests.js`) with `unit` / `fingerprint` / `e2e` groups and matching npm scripts (`selftest:unit`, `selftest:fingerprint`, `selftest:e2e`, `selftest:all`).
- Push/PR CI workflow (`.github/workflows/ci.yml`) that runs the offline unit self-tests on every push and pull request — no kernel binaries, no Electron runtime, no network.
- Offline anti-detect consistency regression is now part of `unit` CI (fingerprint stability, isolation, kernel-init parity, inject order).
- `docs/ARCHITECTURE.md` module overview to replace the private-only code overview.

### Changed
- Delivery focus narrowed to **macOS x86_64 (Intel)**. Windows / macOS arm64 / Linux source code is retained but no longer a CI build, test, or release target.
- `scripts/brand-exe.mjs` now reads the version from `package.json` instead of hardcoding it, making `package.json` the single source of truth for the version.
- Licensing clarified: project source is MIT, but distributed installers are governed by AGPL-3.0 because they bundle an AGPL-3.0 kernel (see README and `THIRD-PARTY-NOTICES.md`).

### Fixed
- `fingerprint-inject-order-selftest.js` no longer asserts a stale 350 ms welcome-page re-collect timer; it matches the current 450 ms settle delay.

### Known issues
- macOS x86_64 ships the OpenBrowser 148 kernel (Chromium 148); an older browser version is itself a weak fingerprint signal. Kernel upgrade is tracked but not performed this cycle.
- `store-offline-selftest.js` builds its fixture with `tar.exe` (Windows) and cannot run on macOS; it is excluded from the unit group. Production archive handling in `main.js` is already cross-platform.

## [1.0.3] - 2026-07-24

### Fixed
- Windows profile path encoding (CJK / spaces in `C:\Users\...`), profile lock liveness across sessions and elevation, and portable launch reliability.
- Window tile layout stability and eliminated slave-window reload loops.
- Window sync active-mode highlighting and control state.
- MCP/API 401 caused by a missing runtime API key in the UI configuration.

### Added
- Device name, WebRTC public/local IPs, geolocation, speech-synthesis voices, and font flag are now mapped into the native kernel `init.json`, keeping the JS injection layer and kernel identity in agreement.

### Changed
- Multi-platform runtime performance improvements for sync and browser processes.
- macOS app bundle is re-signed after packaging mutations; Windows portable zip can be published when the NSIS installer is unavailable.

## [1.0.2] - 2026-07-21

### Added
- Independent per-platform builds with integrated kernels; CDP-ready integrated kernels preferred, with free RPA templates.
- RPA diagnostics for automation gate failures.
- Windows Chrome and Edge fallback choices.

### Changed
- Release packaging split into independent per-platform jobs.
- UI polish and additional themes.

### Fixed
- macOS arm64 kernel extraction and symlink preservation during packaging.

## [1.0.1] - 2026-07-20

### Added
- Proxy fingerprint fill, dynamic extraction, refresh, and failover.
- Session canvas Hamming locks and TLS profile hooks; site-aware fingerprint stability.
- Start page shows egress region and unlock status.

### Changed
- Installer packaging is manual/on-demand only.
- CPU and memory fingerprint settings; default to a single environment on first run.
- Bilingual README and UI polish.

### Fixed
- Proxy failover forced-candidate path, proxy editor double-bind, and direct-connection egress lookup.

## [1.0.0] - 2026-07-19

### Added
- Initial OpenBrowser release: isolated Chromium profiles, proxy configuration, fingerprint controls, extension center, window sync, local API / MCP, and local RPA workflows.

[Unreleased]: https://github.com/lyu0805/OpenBrowser/compare/v1.0.3...HEAD
[1.0.3]: https://github.com/lyu0805/OpenBrowser/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/lyu0805/OpenBrowser/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/lyu0805/OpenBrowser/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/lyu0805/OpenBrowser/releases/tag/v1.0.0
