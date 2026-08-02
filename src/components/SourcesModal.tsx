import { useEffect, useState } from 'react';
import { X, Plus, Trash2, Globe, Lock } from 'lucide-react';

interface TrackerSource {
  id: string;
  name: string;
  announceUrl: string;
  username: string;
  password: string;
  addedAt: string;
}

const API = 'http://127.0.0.1:5192';

async function fetchSources(): Promise<TrackerSource[]> {
  const res = await fetch(`${API}/api/sources`);
  const data = await res.json();
  return data.sources || [];
}

async function addSource(src: { name: string; announceUrl: string; username: string; password: string }): Promise<boolean> {
  const params = new URLSearchParams(src);
  const res = await fetch(`${API}/api/sources/add?${params}`, { method: 'POST' });
  return res.ok;
}

async function removeSource(id: string): Promise<boolean> {
  const res = await fetch(`${API}/api/sources/remove?id=${id}`, { method: 'POST' });
  return res.ok;
}

export function SourcesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [sources, setSources] = useState<TrackerSource[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', announceUrl: '', username: '', password: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) load();
  }, [open]);

  async function load() {
    try { setSources(await fetchSources()); } catch { /* no-op */ }
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.announceUrl.trim()) return;
    setSaving(true);
    await addSource(form);
    setSaving(false);
    setForm({ name: '', announceUrl: '', username: '', password: '' });
    setShowForm(false);
    load();
  }

  async function handleRemove(id: string) {
    await removeSource(id);
    load();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto rounded-2xl bg-[var(--surface-1)] border border-[var(--border-light)] shadow-2xl p-5" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-3)] transition-colors">
          <X size={20} />
        </button>
        <h2 className="text-lg font-bold text-[var(--text-main)] mb-1">Tracker personalizzati</h2>
        <p className="text-xs text-[var(--text-muted)] mb-4">Aggiungi le tue fonti torrent (tracker) con credenziali. I dati restano in locale, mai inviati.</p>

        {sources.length === 0 && !showForm && (
          <div className="text-sm text-[var(--text-muted)] py-6 text-center">Nessuna fonte configurata.</div>
        )}

        <div className="space-y-2">
          {sources.map(src => (
            <div key={src.id} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-light)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0 mt-0.5">
                <Globe size={16} className="text-[var(--accent)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[var(--text-main)]">{src.name}</div>
                <div className="text-[11px] text-[var(--text-muted)] font-mono truncate">{src.announceUrl}</div>
                {src.username && (
                  <div className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)] mt-0.5">
                    <Lock size={10} />
                    {src.username}
                  </div>
                )}
              </div>
              <button onClick={() => handleRemove(src.id)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors shrink-0">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        {showForm && (
          <div className="mt-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-light)] space-y-2.5">
            <input type="text" placeholder="Nome (es. Corsaro Nero)" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border-light)] text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]" />
            <input type="text" placeholder="Announce URL (es. udp://tracker.example.com:1337)" value={form.announceUrl} onChange={e => setForm(f => ({...f, announceUrl: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border-light)] text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]" />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Username (opzionale)" value={form.username} onChange={e => setForm(f => ({...f, username: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border-light)] text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]" />
              <input type="password" placeholder="Password (opzionale)" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border-light)] text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg bg-[var(--surface-3)] text-[var(--text-secondary)] text-sm font-semibold hover:text-[var(--text-main)] transition-colors">Annulla</button>
              <button onClick={handleAdd} disabled={saving || !form.name || !form.announceUrl} className="flex-1 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-semibold disabled:opacity-40 hover:brightness-110 transition-all">{saving ? 'Salvataggio...' : 'Aggiungi'}</button>
            </div>
          </div>
        )}

        {!showForm && (
          <button onClick={() => setShowForm(true)} className="mt-3 w-full py-2.5 rounded-xl border-2 border-dashed border-[var(--border-light)] text-[var(--text-muted)] text-sm font-semibold hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all flex items-center justify-center gap-2">
            <Plus size={16} /> Aggiungi fonte
          </button>
        )}
      </div>
    </div>
  );
}