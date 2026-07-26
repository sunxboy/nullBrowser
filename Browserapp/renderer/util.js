'use strict';

// Pure, stateless renderer utilities. Loaded as a classic <script> BEFORE
// renderer.js, so these function declarations live on the same global scope the
// rest of the renderer uses — call sites stay `formatBytes(x)`, unqualified.
// See renderer/README.md for the split convention.

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function hashHue(text) {
  const s = String(text || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

function markGradientFromColor(color) {
  const raw = String(color || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
    const r = parseInt(raw.slice(1, 3), 16);
    const g = parseInt(raw.slice(3, 5), 16);
    const b = parseInt(raw.slice(5, 7), 16);
    const d = (n) => Math.max(0, Math.min(255, Math.round(n * 0.72)));
    return `linear-gradient(145deg, ${raw}, rgb(${d(r)}, ${d(g)}, ${d(b)}))`;
  }
  const hue = hashHue(raw || 'mark');
  return `linear-gradient(145deg, hsl(${hue} 72% 52%), hsl(${hue} 68% 38%))`;
}
