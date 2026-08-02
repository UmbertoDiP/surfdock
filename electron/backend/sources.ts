import fs from 'fs';
import path from 'path';
import { ROOT } from './config';

export interface TrackerSource {
  id: string;
  name: string;
  announceUrl: string;
  username: string;
  password: string;
  addedAt: string;
}

const SOURCES_FILE = path.join(ROOT, 'config', 'surfdock-sources.json');

function loadAll(): TrackerSource[] {
  try {
    if (fs.existsSync(SOURCES_FILE)) {
      return JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf-8'));
    }
  } catch { /* no-op */ }
  return [];
}

function saveAll(sources: TrackerSource[]) {
  try {
    fs.mkdirSync(path.dirname(SOURCES_FILE), { recursive: true });
    fs.writeFileSync(SOURCES_FILE, JSON.stringify(sources, null, 2), 'utf-8');
  } catch { /* no-op */ }
}

export function getSources(): TrackerSource[] {
  return loadAll();
}

export function addSource(source: Omit<TrackerSource, 'id' | 'addedAt'>): TrackerSource {
  const sources = loadAll();
  const entry: TrackerSource = {
    ...source,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    addedAt: new Date().toISOString(),
  };
  sources.push(entry);
  saveAll(sources);
  return entry;
}

export function removeSource(id: string): boolean {
  const sources = loadAll();
  const idx = sources.findIndex(s => s.id === id);
  if (idx === -1) return false;
  sources.splice(idx, 1);
  saveAll(sources);
  return true;
}

export function getSourceByName(name: string): TrackerSource | undefined {
  return loadAll().find(s => s.name.toLowerCase() === name.toLowerCase());
}