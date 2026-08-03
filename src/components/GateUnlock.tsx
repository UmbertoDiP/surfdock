import { useState } from 'react';
import { ShieldOff, ShieldCheck, Lock, Unlock } from 'lucide-react';
import { apiPost } from '../hooks/usePolling';

interface Props {
  gateDown: boolean;
  unlocked: boolean;
  remainingSec: number;
}

export function GateUnlock({ gateDown, unlocked, remainingSec }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(action: 'unlock' | 'arm') {
    setBusy(true);
    try {
      await apiPost(action === 'unlock' ? '/api/gate/unlock?minutes=15' : '/api/gate/arm');
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  const mmss = `${String(Math.floor(remainingSec / 60)).padStart(2, '0')}:${String(remainingSec % 60).padStart(2, '0')}`;

  if (unlocked) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-[var(--warning)] font-semibold flex items-center gap-1">
          <Unlock size={12} /> GATE APERTO · riarmo tra {mmss}
        </span>
        <button
          onClick={() => run('arm')}
          disabled={busy}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
        >
          <Lock size={11} /><span className="text-[11px]">Riarma ora</span>
        </button>
      </span>
    );
  }

  if (gateDown) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-[var(--danger)] font-semibold flex items-center gap-1">
          <ShieldOff size={12} /> Iron Gate DOWN
        </span>
        <button
          onClick={() => setConfirming(true)}
          disabled={busy}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--warning)] transition-colors disabled:opacity-50"
        >
          <Unlock size={11} /><span className="text-[11px]">Sblocca 15 min</span>
        </button>
        {confirming && (
          <span className="flex items-center gap-1.5">
            <span className="text-[var(--warning)] text-[11px]">I torrent viaggeranno in chiaro dal tuo IP.</span>
            <button onClick={() => run('unlock')} className="px-2 py-0.5 rounded-md bg-[var(--danger)] text-white text-[11px] font-semibold hover:opacity-90 transition-opacity">
              Conferma sblocco
            </button>
            <button onClick={() => setConfirming(false)} className="px-2 py-0.5 rounded-md bg-[var(--surface-3)] text-[var(--text-muted)] text-[11px] hover:text-[var(--accent)] transition-colors">
              Annulla
            </button>
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="text-[var(--success)] font-semibold flex items-center gap-1">
      <ShieldCheck size={12} /> ARMED
    </span>
  );
}
