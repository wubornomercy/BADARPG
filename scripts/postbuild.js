/**
 * Postbuild: copy Phase 1 runtime/ blueprints into dist/runtime/ so the
 * deployed site has both Phase 1 UI blueprints AND Phase 2 combat sandbox.
 *
 * Vite's build only emits the root index.html + bundled assets. The
 * Phase 1 HTML blueprints are independent static pages that work from
 * file://; we copy them into the dist output for the deployed site.
 */
import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const SRC = 'runtime';
const DST = 'dist/runtime';

try {
  if (!existsSync(SRC)) {
    console.log(`[postbuild] no ${SRC}/ — skipping`);
    process.exit(0);
  }
  await mkdir('dist', { recursive: true });
  await cp(SRC, DST, { recursive: true });
  console.log(`[postbuild] copied ${SRC}/ -> ${DST}/`);
} catch (err) {
  console.error('[postbuild] failed:', err);
  process.exit(1);
}
