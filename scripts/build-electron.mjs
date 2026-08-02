import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [
    path.join(__dirname, '../electron/main.ts'),
    path.join(__dirname, '../electron/state.ts'),
    path.join(__dirname, '../electron/utils.ts'),
    path.join(__dirname, '../electron/windowManager.ts'),
    path.join(__dirname, '../electron/ipcHandlers.ts'),
  ],
  outdir: path.join(__dirname, '../dist-electron'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  external: ['electron', 'child_process', 'http', 'path', 'fs', 'url', 'crypto'],
  sourcemap: true,
  tsconfig: path.join(__dirname, '../tsconfig.node.json'),
});