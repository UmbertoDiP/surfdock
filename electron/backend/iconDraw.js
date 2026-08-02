// Motore di disegno icone puro (no electron): usato dal tray a runtime
// e dallo script scripts/generate-icon.mjs per i file asset (png/ico).
import zlib from 'zlib';

export function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const CRC_TABLE = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

export function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export function encodeIco(pngBuffers) {
  // ICO con payload PNG (Windows Vista+). Ogni entry: width/height byte (0=256), 1 byte colors, 1 byte reserved, planes, bitcount, size, offset.
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  let offset = 6 + 16 * count;
  const entries = [];
  for (const png of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry[0] = pngWidth(png) >= 256 ? 0 : pngWidth(png);
    entry[1] = pngHeight(png) >= 256 ? 0 : pngHeight(png);
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);   // planes
    entry.writeUInt16LE(32, 6);  // bitcount
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    entries.push(entry);
  }
  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

function pngWidth(png) {
  return png.readUInt32BE(16);
}
function pngHeight(png) {
  return png.readUInt32BE(20);
}

class Canvas {
  constructor(size) {
    this.size = size;
    this.px = Buffer.alloc(size * size * 4);
  }

  set(x, y, [r, g, b, a]) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return;
    const i = (y * this.size + x) * 4;
    const sa = a / 255;
    const da = this.px[i + 3] / 255;
    const oa = sa + da * (1 - sa);
    if (oa === 0) return;
    this.px[i] = Math.round((r * sa + this.px[i] * da * (1 - sa)) / oa);
    this.px[i + 1] = Math.round((g * sa + this.px[i + 1] * da * (1 - sa)) / oa);
    this.px[i + 2] = Math.round((b * sa + this.px[i + 2] * da * (1 - sa)) / oa);
    this.px[i + 3] = Math.round(oa * 255);
  }

  disc(cx, cy, radius, color) {
    const r2 = radius * radius;
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2) this.set(x, y, color);
      }
    }
  }

  thickLine(x1, y1, x2, y2, width, color) {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 2 || 1;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.disc(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, width / 2, color);
    }
  }

  // Fill poligono (even-odd) con scanline.
  polygon(pts, color) {
    const ys = [];
    for (const p of pts) ys.push(p[1]);
    const yMin = Math.floor(Math.min(...ys));
    const yMax = Math.ceil(Math.max(...ys));
    for (let y = yMin; y <= yMax; y++) {
      const hits = [];
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % pts.length];
        if ((y1 <= y + 0.5 && y2 > y + 0.5) || (y2 <= y + 0.5 && y1 > y + 0.5)) {
          const t = (y + 0.5 - y1) / (y2 - y1);
          hits.push(x1 + t * (x2 - x1));
        }
      }
      hits.sort((a, b) => a - b);
      for (let k = 0; k + 1 < hits.length; k += 2) {
        for (let x = Math.ceil(hits[k]); x <= Math.floor(hits[k + 1]); x++) this.set(x, y, color);
      }
    }
  }

  // Rounded rect fill via scanline.
  roundRect(x, y, w, h, r, color) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        let inRect = true;
        if (xx < x + r && yy < y + r) inRect = (xx - (x + r)) ** 2 + (yy - (y + r)) ** 2 <= r * r;
        else if (xx >= x + w - r && yy < y + r) inRect = (xx - (x + w - r)) ** 2 + (yy - (y + r)) ** 2 <= r * r;
        else if (xx < x + r && yy >= y + h - r) inRect = (xx - (x + r)) ** 2 + (yy - (y + h - r)) ** 2 <= r * r;
        else if (xx >= x + w - r && yy >= y + h - r) inRect = (xx - (x + w - r)) ** 2 + (yy - (y + h - r)) ** 2 <= r * r;
        if (inRect) this.set(xx, yy, color);
      }
    }
  }

  toPng() {
    return encodePng(this.size, this.size, this.px);
  }
}

export const PALETTE = {
  dark: [10, 14, 20, 255],
  border: [255, 255, 255, 26],
  white: [255, 255, 255, 255],
  whiteSoft: [255, 255, 255, 235],
  cyan: [6, 182, 212, 255],
  red: [220, 60, 60, 255],
  orange: [220, 140, 40, 255],
  yellow: [200, 200, 60, 255],
  green: [60, 200, 90, 255],
  idle: [120, 160, 180, 255],
};

// Icona "Sentinel": rounded-square scuro SurfDock, scudo nel colore di stato,
// spunta bianca. Motivo: protezione VPN (guard).
export function drawSentinelIcon(statusColor, size = 64) {
  const c = new Canvas(size);
  const s = size / 64;

  // sfondo rounded square (palette dark SurfDock)
  c.roundRect(2 * s, 2 * s, 60 * s, 60 * s, 13 * s, PALETTE.dark);
  c.roundRect(2.5 * s, 2.5 * s, 59 * s, 59 * s, 12.5 * s, PALETTE.border);

  // scudo
  const pts = [
    [32 * s, 11 * s],
    [46 * s, 17 * s],
    [46 * s, 34 * s],
    [37 * s, 45 * s],
    [32 * s, 52 * s],
    [27 * s, 45 * s],
    [18 * s, 34 * s],
    [18 * s, 17 * s],
  ];
  c.polygon(pts, statusColor);
  // bordo interno bianco morbido
  const inset = pts.map(([x, y]) => [x, y + 2.2 * s]);
  c.polygon(inset, PALETTE.whiteSoft);

  // spunta bianca
  c.thickLine(25 * s, 33 * s, 30 * s, 38 * s, 4.4 * s, PALETTE.white);
  c.thickLine(30 * s, 38 * s, 41 * s, 26 * s, 4.4 * s, PALETTE.white);

  return c.toPng();
}
