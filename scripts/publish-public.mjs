// Pubblica la parte pubblica di SurfDock nel repo pubblico (solo file sanitizzati).
// Esclusi automaticamente: node_modules, dist, dist-electron, dist_electron, config.local.json,
// __pycache__, logs, taskgemini.
// Uso: node scripts/publish-public.mjs [--skip-push]
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(__dirname, '..');
const PUB = process.env.SURFDOCK_PUBLIC_REPO || 'C:\\Users\\umber\\Documents\\MyProjects\\surfdock';

const INCLUDE = [
  'src', 'electron', 'assets', 'landing', 'public',
  'scripts/build-electron.mjs', 'scripts/generate-icon.mjs', 'scripts/publish-public.mjs',
  'index.html', 'package.json', 'package-lock.json',
  'tsconfig.json', 'tsconfig.node.json', 'vite.config.ts',
  'README.md', 'LICENSE.md', '.gitignore',
];
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', 'dist-electron', 'dist_electron', '__pycache__', 'logs', 'taskgemini', '.git']);

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function cleanDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { cleanDir(p); fs.rmdirSync(p); }
    else fs.rmSync(p);
  }
}

function copyEntry(rel) {
  const src = path.join(APP, rel);
  const dst = path.join(PUB, rel);
  if (!fs.existsSync(src)) { console.warn('[WARN] manca file:', rel); return; }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (fs.statSync(src).isDirectory()) { cleanDir(dst); copyDir(src, dst); }
  else fs.copyFileSync(src, dst);
  console.log('[OK]', rel);
}

console.log('=== SurfDock publish-public ===');
console.log('App:', APP);
console.log('Repo pubblico:', PUB);
if (!fs.existsSync(path.join(PUB, '.git'))) {
  console.error('ERRORE: ' + PUB + ' non e\' un repo git. Inizializzare prima.');
  process.exit(1);
}

for (const rel of INCLUDE) copyEntry(rel);

const run = (cmd) => execSync(cmd, { cwd: PUB, stdio: 'inherit', shell: true });
// Imposta identita' una tantum nel repo locale (non serve -c ogni volta).
run('git config user.name "Umberto Di Puorto"');
run('git config user.email "umberto.dipuorto2@consultant.aruba.it"');
run('git add -A');
try { run('git commit -m "release: sync pubblica SurfDock"'); }
catch { console.log('Nessuna modifica da committare.'); }
if (!process.argv.includes('--skip-push')) {
  run('git push origin main');
  console.log('PUSH_OK');
}
console.log('=== fine publish-public ===');