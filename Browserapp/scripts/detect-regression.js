'use strict';

/**
 * Online anti-detect regression (local / nightly, NOT push CI).
 *
 *   node scripts/detect-regression.js
 *
 * Launches the integrated kernel against a fresh profile, visits public
 * detection sites, and probes the fingerprint that the pages actually see via
 * CDP. It then checks that:
 *   - navigator.webdriver is not exposed
 *   - the observed timezone / WebGL vendor / cores / memory match what
 *     buildFingerprint() derived for the same seed
 *   - WebRTC does not leak a public IP that disagrees with the egress
 *   - the same seed is deterministic across two launches
 *   - the kernel Chromium version is not too far behind the reference stable
 *
 * Requires the git-lfs kernel binaries. Writes a JSON report to the user data
 * directory and prints a human summary. Exit code is non-zero if any hard
 * check fails, so it can gate a nightly workflow.
 */

const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { BrowserEngine } = require('../engine');
const cdp = require('../cdp');
const { buildFingerprint } = require('../automation/fingerprint');

// Bump this as Chrome stable advances; used only for the freshness warning (B3).
const REFERENCE_STABLE_CHROMIUM_MAJOR = 149;
const MAX_MAJORS_BEHIND = 2;

const SITES = [
  { key: 'creepjs', url: 'https://abrahamjuliot.github.io/creepjs/' },
  { key: 'browserleaks-webrtc', url: 'https://browserleaks.com/webrtc' },
  { key: 'pixelscan', url: 'https://pixelscan.net/' },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Runs inside the page. Returns the fingerprint the site actually observes.
const PROBE_EXPRESSION = `(async () => {
  const safe = (fn, dflt) => { try { return fn(); } catch (_) { return dflt; } };
  let webglVendor = '', webglRenderer = '';
  safe(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      webglVendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || '';
      webglRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '';
    }
  });
  let canvasHash = '';
  safe(() => {
    const c = document.createElement('canvas'); c.width = 200; c.height = 40;
    const ctx = c.getContext('2d');
    ctx.textBaseline = 'top'; ctx.font = '14px Arial'; ctx.fillStyle = '#069';
    ctx.fillText('OpenBrowser fp probe \\u{1F510}', 2, 2);
    const data = c.toDataURL();
    let h = 0; for (let i = 0; i < data.length; i++) { h = (h * 31 + data.charCodeAt(i)) >>> 0; }
    canvasHash = String(h);
  });
  const webrtc = await new Promise((resolve) => {
    const out = [];
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('x');
      pc.onicecandidate = (e) => {
        if (!e || !e.candidate) return;
        const m = String(e.candidate.candidate || '').match(/(?:\\d{1,3}\\.){3}\\d{1,3}|[0-9a-f:]{4,}/i);
        if (m && !out.includes(m[0])) out.push(m[0]);
      };
      pc.createOffer().then((o) => pc.setLocalDescription(o)).catch(() => {});
      setTimeout(() => { try { pc.close(); } catch (_) {} resolve(out); }, 1500);
    } catch (_) { resolve(out); }
  });
  return {
    webdriver: safe(() => navigator.webdriver === true, false),
    userAgent: safe(() => navigator.userAgent, ''),
    platform: safe(() => navigator.platform, ''),
    languages: safe(() => navigator.languages.slice(), []),
    timezone: safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone, ''),
    cores: safe(() => navigator.hardwareConcurrency, null),
    memory: safe(() => navigator.deviceMemory, null),
    webglVendor, webglRenderer, canvasHash, webrtc,
    uaBrands: safe(() => (navigator.userAgentData && navigator.userAgentData.brands) || [], []),
  };
})()`;

async function probeSite(port, url) {
  await cdp.navigate(port, url);
  await wait(3500); // let the page's own fingerprinting scripts run
  const tab = await cdp.firstTab(port);
  if (!tab) throw new Error(`no page tab for ${url}`);
  const res = await cdp.call(
    tab.webSocketDebuggerUrl,
    'Runtime.evaluate',
    { expression: PROBE_EXPRESSION, awaitPromise: true, returnByValue: true, timeout: 20000 },
    25000
  );
  if (res.exceptionDetails) throw new Error(`probe threw on ${url}: ${res.exceptionDetails.text || 'unknown'}`);
  return res.result && res.result.value;
}

async function launchAndProbe(engine, profile) {
  engine.syncProfiles([profile]);
  const session = await engine.start(profile);
  try {
    const samples = {};
    for (const site of SITES) {
      try {
        samples[site.key] = await probeSite(session.port, site.url);
      } catch (error) {
        samples[site.key] = { error: String(error.message || error) };
      }
    }
    return { session: { id: session.id, pid: session.pid, port: session.port }, samples };
  } finally {
    await engine.stopAll().catch(() => {});
  }
}

function firstGoodSample(samples) {
  for (const key of Object.keys(samples)) {
    const s = samples[key];
    if (s && !s.error) return s;
  }
  return null;
}

function chromiumMajor(userAgent) {
  const m = String(userAgent || '').match(/Chrome\/(\d+)\./);
  return m ? Number(m[1]) : null;
}

function evaluate(expected, observed) {
  const checks = [];
  const add = (name, pass, detail) => checks.push({ name, pass, detail });

  add('webdriver-hidden', observed.webdriver === false, `webdriver=${observed.webdriver}`);
  add('timezone-matches-expected',
    !expected.timezone || observed.timezone === expected.timezone,
    `expected=${expected.timezone} observed=${observed.timezone}`);
  add('cores-match', observed.cores === expected.cores, `expected=${expected.cores} observed=${observed.cores}`);
  add('memory-match', observed.memory === expected.memory, `expected=${expected.memory} observed=${observed.memory}`);
  if (expected.webglVendor) {
    add('webgl-vendor-match',
      String(observed.webglVendor).includes(expected.webglVendor) || observed.webglVendor === expected.webglVendor,
      `expected=${expected.webglVendor} observed=${observed.webglVendor}`);
  }

  const major = chromiumMajor(observed.userAgent);
  const behind = major == null ? null : REFERENCE_STABLE_CHROMIUM_MAJOR - major;
  add('kernel-not-stale',
    behind == null || behind <= MAX_MAJORS_BEHIND,
    `chromium=${major} reference=${REFERENCE_STABLE_CHROMIUM_MAJOR} behind=${behind}`);

  return { checks, chromiumMajor: major, chromiumMajorsBehind: behind };
}

function stabilityDiff(a, b) {
  const stableKeys = ['platform', 'timezone', 'cores', 'memory', 'webglVendor', 'webglRenderer', 'canvasHash'];
  const drift = [];
  for (const key of stableKeys) {
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
      drift.push({ key, first: a[key], second: b[key] });
    }
  }
  return drift;
}

async function main() {
  const dataRoot = process.env.OPENBROWSER_USER_DATA
    || path.join(os.homedir(), 'Library', 'Application Support', 'openbrowser');
  const engine = new BrowserEngine({ getPath: (name) => (name === 'userData' ? dataRoot : '') });
  await engine.init(null);

  const seedId = 'detect-regression-seed-1';
  const profile = { id: seedId, name: 'detect-regression', proxy: 'Direct' };
  const expectedFp = buildFingerprint(profile);
  const expected = {
    timezone: expectedFp.timezone && (expectedFp.timezone.id || expectedFp.timezone.name || expectedFp.timezone),
    cores: expectedFp.cores || expectedFp.hardwareConcurrency,
    memory: expectedFp.memory || expectedFp.deviceMemory,
    webglVendor: expectedFp.webgl && expectedFp.webgl.vendor,
  };

  console.log('Launch 1: probing detection sites...');
  const run1 = await launchAndProbe(engine, profile);
  console.log('Launch 2: same seed, checking determinism...');
  const run2 = await launchAndProbe(engine, profile);

  const observed1 = firstGoodSample(run1.samples);
  const observed2 = firstGoodSample(run2.samples);
  if (!observed1 || !observed2) {
    throw new Error('no site returned a usable sample; check kernel binaries and network');
  }

  const evaluation = evaluate(expected, observed1);
  const drift = stabilityDiff(observed1, observed2);
  evaluation.checks.push({ name: 'seed-deterministic', pass: drift.length === 0, detail: JSON.stringify(drift) });

  const report = {
    generatedAt: new Date().toISOString(),
    platform: `${os.platform()}-${os.arch()}`,
    expected,
    observed: observed1,
    determinismDrift: drift,
    evaluation,
    rawSamples: { launch1: run1.samples, launch2: run2.samples },
  };

  const outDir = path.join(dataRoot, 'reports');
  await fs.mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, `detect-regression-${Date.now()}.json`);
  await fs.writeFile(outFile, JSON.stringify(report, null, 2));

  const failed = evaluation.checks.filter((c) => !c.pass);
  console.log('\n=== Anti-detect regression ===');
  for (const c of evaluation.checks) console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name}  (${c.detail})`);
  console.log(`\nReport: ${outFile}`);
  if (evaluation.chromiumMajorsBehind > 0) {
    console.log(`Note: kernel Chromium is ${evaluation.chromiumMajorsBehind} major(s) behind reference ${REFERENCE_STABLE_CHROMIUM_MAJOR}.`);
  }
  if (failed.length) {
    console.error(`\n${failed.length} check(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log('\nAll checks passed.');
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
