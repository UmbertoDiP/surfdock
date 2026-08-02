import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SentinelState } from '../hooks/usePolling';

const displayNames: Record<string, string> = {
  jellyfin: 'Jellyfin',
  gluetun: 'Mullvad VPN',
  qbittorrent: 'qBittorrent',
  sonarr: 'Sonarr',
  radarr: 'Radarr',
  prowlarr: 'Prowlarr',
};

export function DockerPanel({ state }: { state: SentinelState }) {
  const [open, setOpen] = useState(false);
  const d = state.docker.details;
  const ok = state.docker.up === state.docker.total;

  return (
    <div className="mx-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-light)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[var(--surface-3)] transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-bold text-[var(--accent)] uppercase tracking-wider">
          <span className={`w-2 h-2 rounded-full ${ok ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'}`} />
          Docker Stack
          <span className="text-[var(--text-muted)]">{state.docker.up}/{state.docker.total}</span>
        </span>
        {open ? <ChevronUp size={15} className="text-[var(--text-muted)]" /> : <ChevronDown size={15} className="text-[var(--text-muted)]" />}
      </button>
      {open && (
        <>
          <div className="px-4 grid grid-cols-1 min-[420px]:grid-cols-2 min-[620px]:grid-cols-3 gap-2">
            {Object.entries(d).map(([name, status]) => {
              const color = status === 'running' ? 'var(--success)' : status === 'exited' ? 'var(--warning)' : 'var(--danger)';
              const label = status === 'running' ? 'running' : status === 'exited' ? 'exited' : 'missing';
              return (
                <div key={name} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--surface-3)]">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-xs text-[var(--text-secondary)] truncate">{displayNames[name] || name}</span>
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide shrink-0" style={{ color }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="px-4 pb-3 pt-2 flex items-center gap-4 text-[10px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--success)]" />running</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--warning)]" />exited</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--danger)]" />missing</span>
          </div>
        </>
      )}
    </div>
  );
}
