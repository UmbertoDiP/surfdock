import { useEffect, useState } from 'react';
import { X, Search, Download, Loader2, ArrowUpDown, Film, Tv, Music, Monitor, Tag } from 'lucide-react';
import { searchTorrents, addTorrent, SearchResult } from '../hooks/usePolling';

const CATEGORIES = [
  { id: 'all', label: 'Tutti', icon: Tag },
  { id: 'movies', label: 'Film', icon: Film },
  { id: 'tv', label: 'Serie TV', icon: Tv },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'pc', label: 'Software', icon: Monitor },
];

const ICONS: Record<string, typeof Tag> = { Movie: Film, TV: Tv, Audio: Music, PC: Monitor };

function fmtSize(bytes: number): string {
  if (!bytes) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}

function fmtAge(hours: number | null): string {
  if (hours == null) return '-';
  if (hours < 24) return `${Math.round(hours)}h`;
  if (hours < 24 * 30) return `${Math.round(hours / 24)}g`;
  return `${Math.round(hours / (24 * 30))}m`;
}

export function TorrentSearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'seeders' | 'size' | 'age'>('seeders');
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [minSeeders, setMinSeeders] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setError('');
      setAdded(new Set());
    }
  }, [open]);

  async function runSearch() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError('');
    try {
      setResults(await searchTorrents(q, category, 50));
    } catch (e: any) {
      setError(String(e?.message || e));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(r: SearchResult) {
    if (!r.magnet || adding) return;
    setAdding(r.title);
    try {
      const ok = await addTorrent(r.magnet);
      if (ok) setAdded(prev => new Set(prev).add(r.title));
      else setError('Aggiunta fallita: controlla che il client torrent sia attivo.');
    } catch {
      setError('Errore di rete durante l\'aggiunta.');
    } finally {
      setAdding(null);
    }
  }

  const sorted = [...results]
    .filter(r => r.seeders >= minSeeders)
    .sort((a, b) => {
      if (sortBy === 'size') return b.size - a.size;
      if (sortBy === 'age') return (a.ageHours ?? Infinity) - (b.ageHours ?? Infinity);
      return b.seeders - a.seeders;
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-3xl mx-4 max-h-[85vh] overflow-y-auto rounded-2xl bg-[var(--surface-1)] border border-[var(--border-light)] shadow-2xl p-5" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-3)] transition-colors">
          <X size={20} />
        </button>
        <h2 className="text-lg font-bold text-[var(--text-main)] mb-1">Ricerca torrent</h2>
        <p className="text-xs text-[var(--text-muted)] mb-4">Cerca su tutti i tracker configurati in Prowlarr.</p>

        <div className="flex gap-2 mb-3">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border-light)] focus-within:border-[var(--accent)] transition-colors">
            <Search size={15} className="text-[var(--text-muted)] shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runSearch()}
              placeholder="Cerca un film, serie, album o software..."
              className="flex-1 bg-transparent text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none"
            />
          </div>
          <button onClick={runSearch} disabled={loading || !query.trim()} className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold disabled:opacity-40 hover:brightness-110 transition-all flex items-center gap-2">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            Cerca
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${category === c.id ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-3)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'}`}
            >
              <c.icon size={13} /> {c.label}
            </button>
          ))}
          <div className="flex-1" />
          <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            Min seeders
            <select value={minSeeders} onChange={e => setMinSeeders(Number(e.target.value))} className="px-2 py-1 rounded-lg bg-[var(--surface-3)] text-[var(--text-main)] text-xs outline-none border border-[var(--border-light)]">
              <option value={0}>0</option>
              <option value={1}>1+</option>
              <option value={5}>5+</option>
              <option value={10}>10+</option>
              <option value={50}>50+</option>
            </select>
          </label>
          <button onClick={() => setSortBy(sortBy === 'seeders' ? 'size' : sortBy === 'size' ? 'age' : 'seeders')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--surface-3)] text-[var(--text-secondary)] hover:text-[var(--text-main)] text-xs font-semibold transition-all">
            <ArrowUpDown size={13} />
            {sortBy === 'seeders' ? 'Seed' : sortBy === 'size' ? 'Dimensione' : 'Data'}
          </button>
        </div>

        {error && <div className="mb-3 p-3 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-sm text-[var(--danger)]">{error}</div>}

        {results.length > 0 && !loading && (
          <div className="mb-2 text-xs text-[var(--text-muted)]">{sorted.length} risultati</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[var(--text-muted)]">
            <Loader2 size={20} className="animate-spin" /> Ricerca in corso...
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-sm text-[var(--text-muted)] py-8 text-center">Nessun risultato. Prova un'altra query o cambia filtro.</div>
        ) : (
          <div className="space-y-2">
            {sorted.map(r => {
              const Icon = ICONS[r.category] ?? Tag;
              const isAdding = adding === r.title;
              return (
                <div key={r.title + r.indexer + r.size} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-light)]">
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={16} className="text-[var(--accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[var(--text-main)] leading-snug">{r.title}</div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[var(--text-muted)] mt-1">
                      <span className="text-[var(--success)] font-semibold">{r.seeders} seed</span>
                      <span className="text-[var(--text-secondary)]">{r.leechers} leech</span>
                      <span>{fmtSize(r.size)}</span>
                      <span>{fmtAge(r.ageHours)}</span>
                      <span className="text-[var(--text-secondary)]">{r.indexer}</span>
                      <span className="px-1.5 py-px rounded bg-[var(--surface-3)] text-[var(--text-secondary)]">{r.category}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAdd(r)}
                    disabled={isAdding || added.has(r.title) || !r.magnet}
                    title={r.magnet ? 'Aggiungi al client torrent' : 'Nessun magnet disponibile'}
                    className={`p-2 rounded-lg transition-all shrink-0 ${added.has(r.title) ? 'bg-[var(--success)]/15 text-[var(--success)]' : 'bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white'} disabled:opacity-40`}
                  >
                    {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
