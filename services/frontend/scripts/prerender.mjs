// Prerenders the public marketing routes to static HTML after `vite build`, so
// crawlers/link-unfurlers that don't execute JS (older Bing bots, WhatsApp,
// Facebook, LinkedIn preview scrapers) see real per-page titles/OG tags/content
// instead of the SPA shell — useSEO() only sets those after React mounts and
// runs its effect, which non-JS clients never trigger.
//
// Non-fatal by design: if Chromium isn't available in this build environment
// (missing system libs, no `playwright install` run), we log a warning and
// exit 0 rather than fail the whole deploy — the SPA already works fine for
// JS-executing crawlers (Googlebot) without this step.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

const ROUTES = [
  '/', '/faq', '/docs', '/tutorials', '/contact', '/privacy', '/terms', '/register',
  '/features/cbc-academics',
  '/features/fee-management',
  '/features/exams-results',
  '/features/timetable',
  '/features/parent-communication',
  '/features/transport',
  '/features/hr-payroll',
  '/features/procurement',
];

function waitForServer(url, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) return resolve();
      } catch { /* not up yet */ }
      if (Date.now() - start > timeoutMs) return reject(new Error('vite preview did not start in time'));
      setTimeout(check, 300);
    };
    check();
  });
}

async function run() {
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: rootDir,
    stdio: 'ignore',
  });

  try {
    await waitForServer(BASE_URL);
    const browser = await chromium.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();

    for (const route of ROUTES) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
      // useSEO's useEffect and the per-page JSON-LD injection run after mount,
      // one tick past networkidle is enough for them to have committed.
      await page.waitForTimeout(300);
      const html = await page.content();

      const outDir = route === '/' ? distDir : path.join(distDir, route.replace(/^\//, ''));
      await mkdir(outDir, { recursive: true });
      await writeFile(path.join(outDir, 'index.html'), html, 'utf8');
      console.log(`Prerendered ${route} -> ${path.relative(rootDir, outDir)}/index.html`);
    }

    await browser.close();
  } finally {
    preview.kill();
  }
}

run().catch(err => {
  console.warn('Prerender step skipped (non-fatal):', err.message);
  process.exit(0);
});
