import { useEffect, useState } from 'react';
import { Pause, Play, Zap, RotateCw, Rocket, Power } from 'lucide-react';
import { SentinelState, apiPost } from '../hooks/usePolling';

type Mode = 'avvia' | 'ferma';

interface ActionButtonProps {
  label: string;
  caption?: string;
  variant?: 'primary' | 'danger' | 'default';
  active?: boolean;
  disabled?: boolean;
  endpoint?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

function ActionButton({ label, caption, variant = 'default', active = false, disabled = false, endpoint, onClick, icon }: ActionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  const baseMap = {
    primary: 'bg-[var(--accent-grad)] text-white border border-white/15',
    danger: 'bg-[var(--danger-grad)] text-white border border-white/15',
    default: 'bg-[var(--surface-3)] hover:bg-[var(--border-strong)] text-[var(--text-main)] border border-[var(--border-light)] hover:border-[var(--border-strong)]',
  };

  const activeMap = {
    primary: 'bg-[var(--accent-grad)] text-white ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--surface-1)] border border-white/20',
    danger: 'bg-[var(--danger-grad)] text-white ring-2 ring-[var(--danger)] ring-offset-2 ring-offset-[var(--surface-1)] border border-white/20',
    default: 'bg-[var(--border-strong)] ring-2 ring-[var(--border-strong)] ring-offset-2 ring-offset-[var(--surface-1)] text-[var(--text-main)] border border-[var(--border-strong)]',
  };

  const shadowMap = {
    primary: 'shadow-[var(--shadow-btn)]',
    danger: 'shadow-[var(--shadow-btn-danger)]',
    default: 'shadow-sm',
  };

  async function click() {
    if (cooldown || disabled || active) return;
    if (onClick) { onClick(); return; }
    if (!endpoint) return;
    setCooldown(true);
    setLoading(true);
    try {
      await apiPost(endpoint);
    } catch { /* no-op */ }
    setLoading(false);
    setTimeout(() => setCooldown(false), 2000);
  }

  return (
    <button
      onClick={click}
      disabled={disabled || loading || active}
      title={caption ?? label}
      className={`${active ? activeMap[variant] : baseMap[variant]} ${shadowMap[variant]} px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:brightness-100 flex flex-col items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2`}
    >
      {loading ? '...' : (
        <>
          <span className="flex items-center justify-center gap-1.5 leading-none tracking-wide uppercase text-[13px]">
            {icon}
            {active ? `${label} ON` : label}
          </span>
          {caption && <span className="text-[10px] font-normal opacity-90 leading-tight text-center">{caption}</span>}
        </>
      )}
    </button>
  );
}

export function ActionPanel({ docker }: { docker: SentinelState['docker'] }) {
  const [pending, setPending] = useState<Mode | null>(null);

  const allUp = docker.total > 0 && docker.up === docker.total;
  const allDown = docker.up === 0;
  const active: Mode | null = pending ?? (allUp ? 'avvia' : allDown ? 'ferma' : null);

  useEffect(() => {
    if (!pending) return;
    const done = pending === 'avvia' ? allUp : allDown;
    if (done) setPending(null);
  }, [docker, pending]);

  // safety: release the lock if the system never reaches the expected state
  useEffect(() => {
    if (!pending) return;
    const id = setTimeout(() => setPending(null), 120000);
    return () => clearTimeout(id);
  }, [pending]);

  async function run(mode: Mode) {
    if (active) return;
    setPending(mode);
    try {
      await apiPost(mode === 'avvia' ? '/api/avvia-tutto' : '/api/ferma-tutto');
    } catch { /* no-op */ }
  }

  return (
    <div className="px-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <ActionButton label="AVVIA TUTTO" caption="stack docker + torrent" variant="primary" active={active === 'avvia'} onClick={() => run('avvia')} />
        <ActionButton label="FERMA TUTTO" caption="stack docker + torrent" variant="danger" active={active === 'ferma'} onClick={() => run('ferma')} />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <ActionButton label="Sospendi" caption="tutti i torrent" endpoint="/api/torrent/pause" icon={<Pause size={14} />} />
        <ActionButton label="Riprendi" caption="tutti i torrent" endpoint="/api/torrent/resume" variant="primary" icon={<Play size={14} />} />
        <ActionButton label="Forza" caption="tutti i torrent" endpoint="/api/torrent/force" icon={<Zap size={14} />} />
        <ActionButton label="Restart" caption="stack docker" endpoint="/api/docker/restart" icon={<RotateCw size={14} />} />
      </div>
    </div>
  );
}
