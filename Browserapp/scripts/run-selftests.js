'use strict';

/**
 * Grouped self-test runner.
 *   node scripts/run-selftests.js <group>
 *
 * Groups:
 *   unit        - pure logic / protocol / security tests. No kernel, no Electron
 *                 binary, no network. Safe for push/PR CI on any OS.
 *   fingerprint - offline anti-detect consistency subset (also part of `unit`).
 *   e2e         - launches a real kernel + CDP or drives multiple windows.
 *                 Needs git-lfs kernel binaries; run locally or on macOS runners.
 *
 * Each self-test is a standalone Node script that throws on failure (assert),
 * so we only depend on child-process exit codes here.
 */

const path = require('path');
const { spawnSync } = require('child_process');

const APP_ROOT = path.resolve(__dirname, '..');

// --- Group definitions (maintain the lists here) -------------------------

const UNIT = [
  'environment-audit-selftest.js',
  'security-hardening-selftest.js',
  'fingerprint-inject-order-selftest.js',
  'extension-state-unit-selftest.js',
  'profile-batch-unit-selftest.js',
  'sync-backpressure-unit-selftest.js',
  'sync-settings-unit-selftest.js',
  'tab-mapping-unit-selftest.js',
  'i18n-selftest.js',
  'proxy-format-selftest.js',
  'proxy-forwarder-selftest.js',
  'theme-nes-light-selftest.js',
  'theme-retro-desktop-selftest.js',
  'waitforport-selftest.js',
  'prepare-profile-files-selftest.js',
  'rpa-template-audit-selftest.js',
  'automation/automation-selftest.js',
  'automation/platform-preflight-selftest.js',
  'automation/protocol/protocol-selftest.js',
  'automation/isolation-fingerprint-selftest.js',
  'automation/kernel-policy-selftest.js',
  'automation/cloud-sync-security-selftest.js',
  'automation/fingerprint-stability-selftest.js',
  'automation/kernel-init-sync-selftest.js',
  'automation/ip-health-score-selftest.js',
  'automation/env-icon-selftest.js',
];

// Offline anti-detect consistency subset. All of these are also in UNIT.
const FINGERPRINT = [
  'automation/fingerprint-stability-selftest.js',
  'automation/isolation-fingerprint-selftest.js',
  'automation/kernel-init-sync-selftest.js',
  'fingerprint-inject-order-selftest.js',
];

// Real kernel / multi-window integration. Not run in push CI.
const E2E = [
  'browser-startup-diagnostic-selftest.js',
  'automation/kernel-cdp-ready-selftest.js',
  'automation/wayfern-launch-selftest.js',
  'four-window-devtools-selftest.js',
  'four-window-chrome-menu-selftest.js',
  'four-window-extension-popup-selftest.js',
  'four-window-extension-sidepanel-selftest.js',
  'four-window-tab-click-convergence-selftest.js',
  'four-window-upper-ui-jitter-selftest.js',
  'live-sync-selftest.js',
  'live-sync-v4-selftest.js',
  'live-sync-v5-selftest.js',
  'native-omnibox-selftest.js',
  'newtab-sync-selftest.js',
  'proxy-feature-selftest.js',
  'socks5-reset-selftest.js',
  'socks5-retry-selftest.js',
  'specified-text-four-selftest.js',
  'store-batch-four-selftest.js',
  'store-selftest.js',
  'extension-pipe-selftest.js',
  'extension-pipe-port-selftest.js',
  'extension-startup-target-selftest.js',
  'okx-crx-selftest.js',
  'zoom-reconcile-4-selftest.js',
  'zoom-window-selftest.js',
  'dock-shell-selftest.js',
  'disconnect-selftest.js',
];

const GROUPS = { unit: UNIT, fingerprint: FINGERPRINT, e2e: E2E };

// --- Runner --------------------------------------------------------------

function runGroup(name) {
  const files = GROUPS[name];
  if (!files) {
    console.error(`Unknown group "${name}". Available: ${Object.keys(GROUPS).join(', ')}`);
    process.exit(2);
  }

  console.log(`\nRunning "${name}" self-tests (${files.length}):\n`);
  const failed = [];
  const started = process.hrtime.bigint();

  for (const rel of files) {
    const target = path.join(APP_ROOT, rel);
    const t0 = process.hrtime.bigint();
    const res = spawnSync(process.execPath, [target], {
      cwd: APP_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    const ok = res.status === 0;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${rel}  (${ms.toFixed(0)}ms)`);
    if (!ok) {
      failed.push(rel);
      const detail = `${res.stdout || ''}${res.stderr || ''}`
        .split('\n')
        .filter((line) => line.trim())
        .slice(-6)
        .map((line) => `        ${line}`)
        .join('\n');
      if (detail) console.log(detail);
    }
  }

  const totalMs = Number(process.hrtime.bigint() - started) / 1e6;
  console.log(
    `\n${files.length - failed.length}/${files.length} passed in ${(totalMs / 1000).toFixed(1)}s`
  );
  if (failed.length) {
    console.error(`\nFailed: ${failed.join(', ')}`);
    process.exit(1);
  }
}

runGroup((process.argv[2] || 'unit').toLowerCase());
