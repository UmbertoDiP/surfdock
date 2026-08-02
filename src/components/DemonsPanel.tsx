import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function DemonsPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-light)] hover:border-[var(--border-strong)] transition-colors"
      >
        <span className="text-sm font-semibold text-[var(--text-main)]">Demons (7)</span>
        {open ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
      </button>
      {open && (
        <div className="mt-2 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-light)]">
          <div className="space-y-2 text-xs text-[var(--text-secondary)]">
            <div className="flex justify-between"><span>Iron Gate (60s)</span><span className="text-[var(--success)]">thread sentinel</span></div>
            <div className="flex justify-between"><span>State Poller (8s)</span><span className="text-[var(--success)]">thread sentinel</span></div>
            <div className="flex justify-between"><span>Watchdog (5 min)</span><span>Scheduled Task</span></div>
            <div className="flex justify-between"><span>GitHub Runner</span><span>Runner.Listener</span></div>
            <div className="flex justify-between"><span>UX Telemetry</span><span>pythonw script</span></div>
            <div className="flex justify-between"><span>Metadata Sync</span><span>pythonw script</span></div>
            <div className="flex justify-between"><span>Torrent Pipeline</span><span>batch/pythonw</span></div>
          </div>
        </div>
      )}
    </div>
  );
}