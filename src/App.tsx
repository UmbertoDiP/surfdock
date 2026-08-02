import { useStatePolling } from './hooks/useApi';
import { fetchStartup, StartupProgress } from './hooks/usePolling';
import { fetchProfile, UserProfile } from './hooks/usePolling';
import { TitleBar } from './components/ThemeToggle';
import { StatusPills } from './components/StatusPills';
import { ActionPanel } from './components/ActionPanel';
import { TorrentPanel } from './components/TorrentPanel';
import { DockerPanel } from './components/DockerPanel';
import { ServiceLinks } from './components/ServiceLinks';
import { DemonsPanel } from './components/DemonsPanel';
import { StartupProgress as StartupPanel } from './components/StartupProgress';
import { RegistrationModal } from './components/RegistrationModal';
import { SourcesModal } from './components/SourcesModal';
import { TorrentSearchModal } from './components/TorrentSearchModal';
import { SetupWizard } from './components/SetupWizard';
import { useEffect, useState } from 'react';
import { Key, Globe, Settings, Search } from 'lucide-react';

export default function App() {
  const { state, error } = useStatePolling(3000);
  const [startup, setStartup] = useState<StartupProgress | null>(null);
  const [showLicense, setShowLicense] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function poll() {
      try { setStartup(await fetchStartup()); } catch { /* */ }
    }
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetchProfile()
      .then(res => {
        setProfile(res.profile);
        if (!res.profile.wizardDone) setShowSetup(true);
      })
      .catch(() => {});
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
      <TitleBar state={state} />

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 py-2 scrollbar-thin flex flex-col">
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
          <span className="flex items-center gap-2">
            <button onClick={() => setShowSetup(true)} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
              <Settings size={11} /><span className="text-[11px]">Configura</span>
            </button>
            <button onClick={() => setShowSources(true)} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
              <Globe size={11} /><span className="text-[11px]">Fonti</span>
            </button>
            <button onClick={() => setShowSearch(true)} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
              <Search size={11} /><span className="text-[11px]">Cerca</span>
            </button>
            <button
              onClick={() => setShowLicense(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
            >
              <Key size={11} />
              <span>{state.license_tier === 'none' ? 'Free' : state.license_tier === 'basic' ? 'Basic' : 'Dev'}</span>
            </button>
          </span>
        </div>
      </div>

      <RegistrationModal open={showLicense} onClose={() => setShowLicense(false)} />
      <SourcesModal open={showSources} onClose={() => setShowSources(false)} />
      <TorrentSearchModal open={showSearch} onClose={() => setShowSearch(false)} />
      <SetupWizard
        open={showSetup}
        onClose={() => setShowSetup(false)}
        onProfileChange={setProfile}
      />
    </div>
  );
}