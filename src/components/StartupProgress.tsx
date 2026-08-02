import { StartupProgress as StartupType } from '../hooks/usePolling';

export function StartupProgress({ startup }: { startup: StartupType | null }) {
  if (!startup || startup.phase === 'ARMED') return null;

  const pct = Math.round(((startup.step + 1) / startup.total) * 100);

  return (
    <div className="mx-4 p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--accent-dim)]">
      <div className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider mb-2">
        SentryFlow [{startup.step + 1}/{startup.total}]
      </div>
      <div className="text-sm font-semibold text-[var(--text-main)] mb-1">{startup.phase}: {startup.detail}</div>
      <div className="w-full h-1.5 bg-[var(--surface-3)] rounded-full overflow-hidden mt-2">
        <div
          className="h-full bg-[var(--accent)] rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      {startup.log && startup.log.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {startup.log.slice(-2).map((l, i) => (
            <div key={i} className="text-xs text-[var(--text-muted)]">{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}