import { rcedit } from 'rcedit';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'));
// package.json is the single source of truth; rcedit wants a 4-part version.
const versionQuad = `${pkg.version}.0`;

const [exePath, iconPath] = process.argv.slice(2);
if (!exePath || !iconPath) {
  throw new Error('Usage: node brand-exe.mjs <exePath> <iconPath>');
}

await rcedit(exePath, {
  'version-string': {
    ProductName: 'OpenBrowser',
    FileDescription: 'OpenBrowser',
    CompanyName: 'OpenBrowser 开源项目',
    LegalCopyright: 'AGPL-3.0-or-later',
    OriginalFilename: 'OpenBrowser.exe'
  },
  'file-version': versionQuad,
  'product-version': versionQuad,
  icon: iconPath,
  'requested-execution-level': 'asInvoker'
});
