import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { startHealthServer } from './healthServer';

let server: http.Server;
let base: string;

function listen(port: number): Promise<number> {
  return new Promise(resolve => {
    server.once('listening', () => resolve((server.address() as any).port));
    server.listen(port, '127.0.0.1');
  });
}

beforeAll(async () => {
  server = startHealthServer(0);
  const p = await listen(0);
  base = `http://127.0.0.1:${p}`;
});

afterAll(() => {
  server.close();
});

describe('origin guard su API locali', () => {
  it('POST con Origin esterno viene rifiutata (403)', async () => {
    const res = await fetch(`${base}/api/gate/arm`, {
      method: 'POST',
      headers: { Origin: 'https://evil.example' },
    });
    expect(res.status).toBe(403);
  });

  it('GET con Origin esterno viene rifiutata (403)', async () => {
    const res = await fetch(`${base}/health`, {
      headers: { Origin: 'https://evil.example' },
    });
    expect(res.status).toBe(403);
  });

  it('richiesta senza Origin passa (curl / main process)', async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
  });

  it('Origin di sviluppo vite passa', async () => {
    const res = await fetch(`${base}/health`, {
      headers: { Origin: 'http://127.0.0.1:5174' },
    });
    expect(res.status).toBe(200);
  });

  it('Origin null (electron prod file://) passa', async () => {
    const res = await fetch(`${base}/health`, {
      headers: { Origin: 'null' },
    });
    expect(res.status).toBe(200);
  });
});
