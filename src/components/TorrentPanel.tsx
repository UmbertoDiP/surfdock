import { useEffect, useState } from 'react';
import { Pause, Play, Zap, RefreshCw, Trash2, Loader2, ZoomOut, ZoomIn } from 'lucide-react';
import { SentinelState, TorrentDetail, fetchTorrents, apiPost } from '../hooks/usePolling';
import { RateLimitSlider } from './RateLimitSlider';
import { useLanguage } from '../i18n/LanguageContext';

function humanSpeed(b: number): string {
  if (b <= 0) return '0 B';
  for (const u of ['B', 'KB', 'MB', 'GB']) {
    if (b < 1024) return `${b.toFixed(1)} ${u}`;
    b /= 1024;
  }
  return `${b.toFixed(1)} TB`;
}

function humanSize(b: number): string {
  for (const u of ['B', 'KB', 'MB', 'GB', 'TB']) {
    if (b < 1024) return `${b.toFixed(1)} ${u}`;
    b /= 1024;
  }
  return `${b.toFixed(1)} PB`;
}

function humanEta(sec: number): string {
  if (sec < 0) return '--';
  if (sec >= 3600) return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
  if (sec >= 60) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${sec}s`;
}

function stateLabel(state: string, t: (key: string) => string): string {
  const keys: Record<string, string> = {
    downloading: 'torrent.download',
    pausedDL: 'torrent.paused',
    metaDL: 'torrent.metadata',
    checkingDL: 'torrent.checking',
    checkingUP: 'torrent.checking',
    checkingResumeData: 'torrent.checking',
    stoppedDL: 'torrent.stopped',
    stoppedUP: 'torrent.stopped',
    forcedDL: 'torrent.forced',
    forcedUP: 'torrent.forced',
    allocating: 'torrent.allocating',
    error: 'torrent.error',
    moving: 'torrent.moving',
  };
  const raw: Record<string, string> = {
    uploading: 'upload',
    pausedUP: 'pausa upload',
    queuedDL: 'in coda',
    queuedUP: 'coda upload',
    stalledDL: 'senza peer',
    stalledUP: 'stallo',
  };
  const k = keys[state];
  if (k) return t(k);
  return raw[state] ?? state;
}

const stateColor: Record<string, string> = {
  downloading: 'var(--accent)',
  forcedDL: 'var(--accent)',
  metaDL: 'var(--warning)',
  stalledDL: 'var(--warning)',
  pausedDL: 'var(--text-muted)',
  stoppedDL: 'var(--text-muted)',
  pausedUP: 'var(--text-muted)',
  stoppedUP: 'var(--text-muted)',
  uploading: 'var(--success)',
  forcedUP: 'var(--success)',
  error: 'var(--danger)',
};

const DL_STATES = ['downloading', 'forcedDL', 'metaDL', 'stalledDL', 'queuedDL', 'pausedDL', 'checkingDL', 'checkingResumeData', 'allocating', 'error'];

function IconBtn({ title, onClick, acting, primary, danger, children }: {
  title: string;
  onClick: () => void;
  acting?: boolean;
  primary?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={acting}
      className={`w-6 h-6 rounded-md flex items-center justify-center transition-all disabled:opacity-50 ${
        danger
          ? 'text-[var(--danger)] hover:bg-[var(--danger)]/10'
          : primary
            ? 'text-[var(--accent)] bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--surface-2)]'
      }`}
    >
      {acting ? <Loader2 size={14} className="animate-spin" /> : children}
    </button>
  );
}

export function TorrentPanel({ state }: { state: SentinelState }) {
  const { t } = useLanguage();
  const stats = state.torrent;
  const [torrents, setTorrents] = useState<TorrentDetail[]>([]);
  const [live, setLive] = useState(false);
  const [acting, setActing] = useState<Record<string, string>>({});
  const [zoom, setZoom] = useState<number>(() => {
    const saved = localStorage.getItem('lokino-torrent-zoom');
    const n = saved ? parseInt(saved, 10) : 3;
    return n >= 1 && n <= 6 ? n : 3;
  });

  function changeZoom(delta: number) {
    setZoom(z => {
      const next = Math.min(6, Math.max(1, z + delta));
      localStorage.setItem('lokino-torrent-zoom', String(next));
      return next;
    });
  }

  async function refresh() {
    try {
      const data = await fetchTorrents();
      setTorrents(data);
      setLive(true);
    } catch {
      setLive(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const data = await fetchTorrents();
        if (cancelled) return;
        setTorrents(data);
        setLive(true);
      } catch {
        if (!cancelled) setLive(false);
      }
    }
    poll();
    const id = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  async function act(hash: string, action: string, confirmMsg?: string) {
    if (acting[hash]) return;
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setActing(a => ({ ...a, [hash]: action }));
    try {
      await apiPost(`/api/torrent/${action}?hash=${hash}`);
    } catch { /* no-op */ }
    setActing(a => ({ ...a, [hash]: '' }));
    refresh();
  }

  return (
    <div className="mx-4 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-light)] flex flex-col flex-1 min-h-[180px]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider">Qbittorrent</div>
        <span className="text-[10px] text-[var(--text-muted)]">
          {live ? t('torrent.realtime') : t('torrent.offline')}
        </span>
      </div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-[var(--success)] font-bold">{stats.dl} {t('torrent.download')}</span>
          <span className="text-[var(--text-secondary)]">{stats.paused} {t('torrent.paused')}</span>
          <span className="text-[var(--text-secondary)]">{stats.seed} {t('torrent.seed')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            <IconBtn title="Zoom out (meno colonne)" onClick={() => changeZoom(-1)}>
              <ZoomOut size={14} />
            </IconBtn>
            <span className="text-[10px] text-[var(--text-muted)] w-6 text-center tabular-nums">{zoom} {t('torrent.col')}</span>
            <IconBtn title="Zoom in (piu colonne)" onClick={() => changeZoom(1)}>
              <ZoomIn size={14} />
            </IconBtn>
          </div>
          <span className="text-xs text-[var(--text-muted)]">{t('torrent.tot')} {stats.total}</span>
        </div>
      </div>

      <RateLimitSlider speedKb={stats.speed_kb ?? 0} />

      {torrents.length === 0 ? (
        <div className="text-xs text-[var(--text-muted)] py-2">Nessun download in corso</div>
      ) : (
        <div
          className="grid gap-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin"
          style={{ gridTemplateColumns: `repeat(${zoom}, minmax(0, 1fr))` }}
        >
          {torrents.filter(tor => DL_STATES.includes(tor.state) || tor.progress < 1).map(tor => {
            const metaDL = tor.state === 'metaDL';
            const pct = Math.round(tor.progress * 100);
            return (
              <div key={tor.hash} className="p-2 rounded-lg bg-[var(--surface-3)] border border-[var(--border-light)]">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[var(--text-main)] truncate" title={tor.name}>
                      {tor.name}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono leading-tight">
                      {tor.hash.slice(0, 12)}… {tor.category && <span className="text-[var(--accent)]">· {tor.category}</span>}
                    </div>
                  </div>
                  <span
                    className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                    style={{ background: 'var(--surface-2)', color: stateColor[tor.state] ?? 'var(--text-secondary)' }}
                  >
                    {stateLabel(tor.state, t)}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 bg-[var(--surface-2)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: stateColor[tor.state] ?? 'var(--accent)' }}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)] w-10 text-right">{pct}%</span>
                </div>

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-xs text-[var(--text-secondary)]">
                  <span className="text-[var(--accent)]">↓ {humanSpeed(tor.dlspeed)}/s</span>
                  <span className="text-[var(--success)]">↑ {humanSpeed(tor.upspeed)}/s</span>
                  <span>S {tor.seeds}·P {tor.peers}</span>
                  <span>{humanSize(tor.size)}</span>
                  <span>ETA {humanEta(tor.eta)}</span>
                  {metaDL && (
                    <span className="text-[var(--warning)] font-semibold">importando metadati dal tracker...</span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-1 mt-1.5 border-t border-[var(--border-light)] pt-1">
                  {(['downloading', 'forcedDL', 'metaDL', 'stalledDL', 'queuedDL', 'checkingDL', 'checkingResumeData', 'allocating', 'error'].includes(tor.state)) && (
                    <IconBtn title="Pausa" onClick={() => act(tor.hash, 'pause')} acting={acting[tor.hash] === 'pause'}>
                      <Pause size={14} />
                    </IconBtn>
                  )}
                  {(['pausedDL', 'stoppedDL', 'pausedUP', 'stoppedUP'].includes(tor.state)) && (
                    <IconBtn title="Riprendi" primary onClick={() => act(tor.hash, 'resume')} acting={acting[tor.hash] === 'resume'}>
                      <Play size={14} />
                    </IconBtn>
                  )}
                  <IconBtn title="Forza" onClick={() => act(tor.hash, 'force')} acting={acting[tor.hash] === 'force'}>
                    <Zap size={14} />
                  </IconBtn>
                  <IconBtn title="Recheck" onClick={() => act(tor.hash, 'recheck')} acting={acting[tor.hash] === 'recheck'}>
                    <RefreshCw size={14} />
                  </IconBtn>
                  <IconBtn
                    title="Rimuovi (i file restano sul disco)"
                    danger
                    onClick={() => act(tor.hash, 'delete', `Rimuovere "${tor.name}"? I file restano sul disco.`)}
                    acting={acting[tor.hash] === 'delete'}
                  >
                    <Trash2 size={14} />
                  </IconBtn>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
