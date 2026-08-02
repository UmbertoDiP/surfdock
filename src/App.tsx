import { useStatePolling } from './hooks/useApi';
import { fetchStartup, StartupProgress } from './hooks/usePolling';
import { TitleBar } from './components/ThemeToggle';
import { StatusPills } from './components/StatusPills';
import { ActionPanel } from './components/ActionPanel';
import { TorrentPanel } from './components/TorrentPanel';
import { DockerPanel } from './components/DockerPanel';
import { ServiceLinks } from './components/ServiceLinks';
import { DemonsPanel } from './components/DemonsPanel';
import { StartupProgress as StartupPanel } from './components/StartupProgress';
import { useEffect, useState } from 'react';

export default function App() {
  const { state, error } = useStatePolling(3000);
  const [startup, setStartup] = useState<StartupProgress | null>(null);

  useEffect(() => {
    async function poll() {
      try { setStartup(await fetchStartup()); } catch { /* */ }
    }
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  if (!state) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--surface-1)]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--accent)] animate-pulse" />
          <div className="text-[var(--text-main)] font-semibold">Connessione al demone SurfDock...</div>
          {error && <div className="text-sm text-[var(--danger)]">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[var(--surface-1)] flex flex-col">
      <TitleBar />

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 py-2 scrollbar-thin flex flex-col">
        <StatusPills state={state} />
        <StartupPanel startup={startup} />
        <ActionPanel docker={state.docker} />
        <TorrentPanel state={state} />
        <DockerPanel state={state} />

        <div className="h-px mx-4 bg-[var(--border-light)]" />

        <ServiceLinks />
        <DemonsPanel />

        <div className="mx-4 px-4 py-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-light)] flex items-center justify-between text-xs">
          <span className="text-[var(--text-muted)]">
            {state.iron_gate_down ? (
              <span className="text-[var(--danger)] font-semibold">Iron Gate DOWN</span>
            ) : (
              <span className="text-[var(--success)] font-semibold">ARMED</span>
            )}
            {' · '}
            {state.vpn === 'healthy' ? 'Iron Gate 6/6' : `VPN: ${state.vpn_detail}`}
          </span>
          <span className="text-[var(--text-secondary)]">
            {state.vpn_detail?.slice(0, 40)}
          </span>
        </div>
      </div>
    </div>
  );
}