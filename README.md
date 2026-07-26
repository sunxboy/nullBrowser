<div align="center">

<img src="./assets/openbrowser-title.svg" alt="OpenBrowser" width="820">

[![Version](https://img.shields.io/badge/version-1.1.0-blue)](https://github.com/lyu0805/OpenBrowser)
[![Platform](https://img.shields.io/badge/platform-macOS%20x86__64-blue)](https://github.com/lyu0805/OpenBrowser)
[![License](https://img.shields.io/badge/source-MIT-green)](./LICENSE)
[![Distribution](https://img.shields.io/badge/installer-AGPL--3.0-orange)](./Browserapp/THIRD-PARTY-NOTICES.md)
[![Node](https://img.shields.io/badge/Node.js-LTS-339933.svg)](https://nodejs.org/)

**Multi-language support / 多国语言支持**

🇺🇸 **English** · 🇨🇳 [中文](./README_CN.md)

**Local fingerprint browser · Isolated Chromium profiles · Proxy / fingerprint / sync / RPA**

</div>

---

## Overview

OpenBrowser is a local desktop fingerprint browser for managing multiple isolated Chromium environments. It combines profile isolation, proxy configuration, browser fingerprint controls, extension management, window synchronization, a local API, MCP integration, and local RPA workflows in one desktop app.

The app supports multiple UI languages, currently including English and Chinese.

> Read the [disclaimer](./DISCLAIMER.md) before use. OpenBrowser does not guarantee anonymity, unique fingerprints, or compatibility with any specific website.

## Contents

- [Screenshots](#screenshots)
- [Key features](#key-features)
- [Supported platforms](#supported-platforms)
- [Quick start](#quick-start)
- [Packaging](#packaging)
- [Self-tests](#self-tests)
- [Project layout](#project-layout)
- [Data and security](#data-and-security)

## Screenshots

| Overview | Environments |
| :---: | :---: |
| ![Overview](./docs/screenshots/openbrowser-overview.png) | ![Environments](./docs/screenshots/environment-management.png) |
| Main navigation and module entry points | Profiles, start/stop controls, and groups |

| Profile / fingerprint | Local settings |
| :---: | :---: |
| ![Profile editor](./docs/screenshots/profile-fingerprint-editor.png) | ![Settings](./docs/screenshots/automation-and-system.png) |
| Proxy, fingerprint, and extension settings | Theme, language, and system options |

## Key features

| Area | What it provides |
| --- | --- |
| **Profile isolation** | Separate Chromium profiles so cookies, cache, and storage do not mix. |
| **Batch management** | Groups, tags, bulk start/stop, logs, and window sizing. |
| **Proxy support** | HTTP / HTTPS / SOCKS proxies per environment, with egress checks. |
| **Fingerprint controls** | Platform, language, timezone, user agent, Canvas, WebGL, WebRTC, and more. |
| **Extension center** | Built-in, recommended, and local extensions loaded per environment. |
| **Window sync** | CDP-based synchronization for clicks, scrolling, input, and tabs. |
| **Local RPA** | Flows for navigation, waiting, clicking, typing, and screenshots. |
| **Local API / MCP** | Local integration endpoint on `127.0.0.1:50325` by default. |
| **Independent kernel** | Download a standalone Chromium kernel or use a custom local path. |
| **Backup options** | Local, WebDAV, GitHub, and cloud-drive backups when explicitly enabled. |

## Supported platforms

Development currently focuses on **macOS Intel** to make one platform solid before expanding. Windows / macOS arm64 / Linux code paths are kept in the tree, but they are not a CI build, test, or release target right now.

| Platform | Architecture | Status |
| --- | --- | --- |
| macOS | x86_64 (Intel) | ✅ Primary — built, tested, and released |
| macOS | arm64 | 🧪 Experimental — code retained, best-effort, no CI/release guarantee |
| Windows | x86_64 | 🧪 Experimental — code retained, best-effort, no CI/release guarantee |
| Linux | — | 🧪 Detection only — no packaging |

## Quick start

Requires Node.js LTS and npm.

```bash
cd Browserapp
npm ci --include=dev
npm run selftest
npm start
```

Or use the launcher scripts from the repository root:

| Platform | Launcher |
| --- | --- |
| macOS | [`start-test.command`](./start-test.command) |
| Windows | [`start-test.cmd`](./start-test.cmd) |

## Packaging

```bash
cd Browserapp
# Optional: OPENBROWSER_PACKAGE_ARCH=x86_64 or arm64
npm run package:portable
```

Build output is written to `Browserapp/dist/`.

| Platform | Output notes |
| --- | --- |
| Windows | Includes `START.cmd`. |
| macOS | Includes `OpenBrowser.app` and `启动.command`. |

## Self-tests

Tests are grouped by what they need. The `unit` group runs offline (no kernel, no Electron binary, no network) and is what CI runs on every push:

```bash
cd Browserapp
npm run selftest:unit          # offline logic / protocol / security / fingerprint consistency
npm run selftest:fingerprint   # offline anti-detect consistency subset
npm run selftest:e2e           # real kernel + multi-window (needs git-lfs kernel binaries)
npm run selftest:all           # unit + e2e
```

Individual legacy self-tests remain available (`npm run selftest`, `selftest:automation`, `selftest:protocol`, `selftest:isolation`, `selftest:kernel`, `selftest:cloud`).

## Project layout

```text
OpenBrowser/
├── Browserapp/            # App source
├── docs/screenshots/      # Screenshots
├── start-test.command     # macOS launcher
├── start-test.cmd         # Windows launcher
├── DISCLAIMER.md
├── LICENSE
├── README.md              # English documentation
└── README_CN.md           # Chinese documentation
```

This repository contains source code and documentation only. It does not include profiles, cookies, proxy credentials, bundled kernel binaries, or installers. The macOS x86_64 build includes the OpenBrowser 148 kernel; experimental Windows / macOS arm64 builds obtain the matching Wayfern kernel during CI packaging.

## Data and security

- The local API binds to loopback by default.
- If `OPENBROWSER_API_KEY` is set, requests must include the `api-key` header.
- Browser startup failures are appended to the local-only `browser-startup.log` under the user's OpenBrowser data directory. Inspect it with `npm run log:startup` from `Browserapp/`; logs are ignored by Git.
- Third-party notices are documented in [`THIRD-PARTY-NOTICES.md`](./Browserapp/THIRD-PARTY-NOTICES.md).
- Cloud backup integrations only connect outward after explicit user configuration.

## Documentation

- [Architecture overview](./docs/ARCHITECTURE.md)
- [Changelog](./CHANGELOG.md)
- [Automation module](./Browserapp/automation/README.md)
- [Disclaimer](./DISCLAIMER.md)
- [Third-party notices](./Browserapp/THIRD-PARTY-NOTICES.md)

---

<details>
<summary>Third-party kernel sources</summary>

<br>

The independent kernel comes from [Donut Browser](https://github.com/zhom/donutbrowser) / [Wayfern](https://wayfern.com/) by [zhom](https://github.com/zhom). Update feed: [wayfern.json](https://donutbrowser.com/wayfern.json). Terms: [Wayfern ToS](https://wayfern.com/tos).

The repository does not store kernel binaries. Official platform packages obtain the matching Wayfern kernel from the official feed during CI packaging; macOS x86_64 packages use the checked-in OpenBrowser 148 runtime.

</details>

## License

OpenBrowser uses a **two-layer** license:

- **Project source code** in this repository is [MIT](./LICENSE).
- **Distributed installers** bundle an independent browser kernel (Wayfern / OpenBrowser) that is licensed under **AGPL-3.0**. Because the packaged app ships that kernel, the installer as a whole is governed by **AGPL-3.0-or-later**. See [`THIRD-PARTY-NOTICES.md`](./Browserapp/THIRD-PARTY-NOTICES.md).

In short: reuse the source under MIT; redistribute the built installer under AGPL-3.0.

---

<div align="center">

If OpenBrowser is useful to you, a Star is appreciated ⭐

</div>
