import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { SentinelState } from '../hooks/usePolling';

const vpnMap: Record<string, { label: string; color: string }> = {
  healthy:   { label: 'VPN OK', color: 'var(--success)' },
  unhealthy: { label: 'VPN GIU', color: 'var(--danger)' },
  starting:  { label: 'AVVIO', color: 'var(--warning)' },
  missing:   { label: 'NO VPN', color: 'var(--text-muted)' },
  error:     { label: 'ERR', color: 'var(--warning)' },
  unknown:   { label: '?', color: 'var(--text-muted)' },
};

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--surface-3)] text-[var(--text-secondary)] transition-colors"
      title={theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function TitleBar({ state }: { state?: SentinelState | null }) {
  return (
    <div className="flex items-center h-11 px-3 gap-3 bg-[var(--surface-2)] border-b border-[var(--border-light)] select-none" style={{ WebkitAppRegion: 'drag' } as any}>
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="w-6 h-6 rounded-md bg-[var(--accent)] flex items-center justify-center shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round"><path d="M2 6c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2"/><path d="M2 12c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2"/><path d="M2 18c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2"/></svg>
        </div>
        <span className="text-[13px] font-semibold text-[var(--text-main)]">SurfDock</span>
      </div>

      {state && (
        <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <Pill label={vpnMap[state.vpn]?.label || '?'} color={vpnMap[state.vpn]?.color || 'var(--text-muted)'} />
          <Pill label={dockLabel(state)} color={dockColor(state)} />
          <Pill label={jfLabel(state)} color={jfColor(state)} />
        </div>
      )}

      <div className="ml-auto flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <ThemeToggle />
      </div>
    </div>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold leading-tight" style={{ background: `${color}14`, color }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      {label}
    </span>
  );
}

function dockLabel(state: SentinelState): string {
  const up = state.docker.up;
  const total = state.docker.total;
  if (up === total) return 'Docker OK';
  if (up === 0) return 'Docker GIU';
  return `Docker ${up}/${total}`;
}

function dockColor(state: SentinelState): string {
  const up = state.docker.up;
  const total = state.docker.total;
  if (up === total) return 'var(--success)';
  if (up > 0) return 'var(--warning)';
  return 'var(--danger)';
}

function jfLabel(state: SentinelState): string {
  return state.jellyfin === 'OK' ? 'Jellyfin OK' : 'Jellyfin OFF';
}

function jfColor(state: SentinelState): string {
  return state.jellyfin === 'OK' ? 'var(--success)' : 'var(--danger)';
}