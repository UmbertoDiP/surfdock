// Genera le icone asset dell'app: assets/surfdock-icon.png (64), @2x (128),
// assets/surfdock-icon.ico (256 + 128 + 64). Eseguire con node dopo il build del backend.
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { drawSentinelIcon, encodeIco, PALETTE } from '../electron/backend/iconDraw.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(outDir, { recursive: true });

const png64 = drawSentinelIcon(PALETTE.cyan, 64);
const png128 = drawSentinelIcon(PALETTE.cyan, 128);
const png256 = drawSentinelIcon(PALETTE.cyan, 256);

fs.writeFileSync(path.join(outDir, 'surfdock-icon.png'), png64);
fs.writeFileSync(path.join(outDir, 'surfdock-icon@2x.png'), png128);
fs.writeFileSync(path.join(outDir, 'surfdock-icon.ico'), encodeIco([png256, png128, png64]));

console.log('[OK] icone generate in', outDir);
