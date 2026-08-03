import { useEffect, useState } from 'react';
import {
  X, ShieldCheck, Mail, KeyRound, Globe, Wifi, CheckCircle2, ChevronRight, ChevronLeft,
  User, Sparkles, AlertTriangle, Trash2, Plus, Lock,
} from 'lucide-react';
import {
  fetchProfile, saveProfileEmail, setVpnEnabled, addVpnConnector, removeVpnConnector,
  markWizardDone, activateLicense, fetchLicense, fetchSources, addSource, removeSource,
  ProfileResponse, UserProfile, VpnConnector, TrackerSource,
} from '../hooks/usePolling';

type Lang = 'it' | 'en';

interface D {
  title: string; subtitle: string;
  step1Title: string; step1Sub: string;
  email: string; emailPh: string; name: string; namePh: string; adminHint: string; adminBadge: string;
  step2Title: string; step2Sub: string; skipLicense: string; keyPh: string; activate: string; activated: string; free: string;
  step3Title: string; step3Sub: string; vpnOn: string; vpnOnDesc: string; vpnOff: string; vpnOffDesc: string;
  vpnOffConfirm: string; provider: string; chooseProvider: string; username: string; pass: string; server: string;
  addVpn: string; noVpn: string; yourVpn: string;
  step4Title: string; step4Sub: string; noSources: string; addTracker: string; srcName: string; srcUrl: string; save: string; saved: string;
  step5Title: string; step5Sub: string; doneSummary: string; openApp: string;
  back: string; next: string; finish: string; skip: string; langLabel: string;
}

const DICT: Record<Lang, D> = {
  it: {
    title: 'Benvenuto in SurfDock', subtitle: 'Configurazione guidata in pochi passi. Puoi modificare tutto in seguito dal menu Configura.',
    step1Title: 'Il tuo account', step1Sub: 'Usa la tua email: se sei l\'amministratore, i tracker privati vengono configurati automaticamente.',
    email: 'Email', emailPh: 'tu@email.com', name: 'Nome (opzionale)', namePh: 'Come vuoi essere chiamato',
    adminHint: 'Account admin rilevato: configuriamo automaticamente i tuoi tracker privati.', adminBadge: 'ADMIN',
    step2Title: 'Licenza', step2Sub: 'Hai una chiave? Attivala ora. Puoi anche farlo dopo.',
    skipLicense: 'Saltare per ora', keyPh: 'SURFDK-...', activate: 'Attiva', activated: 'Licenza attiva', free: 'Versione Free',
    step3Title: 'Connessione VPN', step3Sub: 'Aggiungi il tuo account VPN, oppure configura più provider. La VPN protegge il traffico torrent.',
    vpnOn: 'VPN attiva (consigliata)', vpnOnDesc: 'Iron Gate blocca i torrent se la connessione cade.',
    vpnOff: 'Nessuna VPN', vpnOffDesc: 'Traffico torrent diretto, senza protezione.',
    vpnOffConfirm: 'Ho capito: senza VPN i torrent viaggiano in chiaro dal mio IP',
    provider: 'Provider', chooseProvider: 'Scegli un provider', username: 'Username / Email', pass: 'Password', server: 'Server (opzionale)',
    addVpn: 'Aggiungi connettore', noVpn: 'Nessun connettore configurato', yourVpn: 'I tuoi connettori',
    step4Title: 'Fonti torrent', step4Sub: 'Aggiungi i tuoi tracker personali con credenziali. Dati salvati solo in locale.',
    noSources: 'Nessuna fonte. Puoi aggiungerle dopo.', addTracker: 'Aggiungi tracker', srcName: 'Nome (es. Corsaro Nero)', srcUrl: 'Announce URL', save: 'Aggiungi', saved: 'Salvato',
    step5Title: 'Tutto pronto!', step5Sub: 'Ecco il riepilogo della tua configurazione.',
    doneSummary: 'Apri la dashboard e goditi la baia sicura.', openApp: 'Apri SurfDock',
    back: 'Indietro', next: 'Avanti', finish: 'Fine', skip: 'Salta', langLabel: 'EN',
  },
  en: {
    title: 'Welcome to SurfDock', subtitle: 'Guided setup in a few steps. You can change everything later from the Setup menu.',
    step1Title: 'Your account', step1Sub: 'Use your email: if you are the administrator, private trackers are configured automatically.',
    email: 'Email', emailPh: 'you@email.com', name: 'Name (optional)', namePh: 'How should we call you',
    adminHint: 'Admin account detected: your private trackers are being configured automatically.', adminBadge: 'ADMIN',
    step2Title: 'License', step2Sub: 'Got a key? Activate it now, or later.',
    skipLicense: 'Skip for now', keyPh: 'SURFDK-...', activate: 'Activate', activated: 'License active', free: 'Free version',
    step3Title: 'VPN connection', step3Sub: 'Add your VPN account, or set up multiple providers. VPN protects torrent traffic.',
    vpnOn: 'VPN enabled (recommended)', vpnOnDesc: 'Iron Gate blocks torrents if the connection drops.',
    vpnOff: 'No VPN', vpnOffDesc: 'Direct torrent traffic, no protection.',
    vpnOffConfirm: 'I understand: without VPN torrents travel in the clear from my IP',
    provider: 'Provider', chooseProvider: 'Choose a provider', username: 'Username / Email', pass: 'Password', server: 'Server (optional)',
    addVpn: 'Add connector', noVpn: 'No connector configured', yourVpn: 'Your connectors',
    step4Title: 'Torrent sources', step4Sub: 'Add your private trackers with credentials. Data is stored locally only.',
    noSources: 'No sources yet. You can add them later.', addTracker: 'Add tracker', srcName: 'Name (e.g. Black Corsair)', srcUrl: 'Announce URL', save: 'Add', saved: 'Saved',
    step5Title: 'All set!', step5Sub: 'Here is a summary of your setup.',
    doneSummary: 'Open the dashboard and enjoy the safe bay.', openApp: 'Open SurfDock',
    back: 'Back', next: 'Next', finish: 'Finish', skip: 'Skip', langLabel: 'IT',
  },
};

const PROVIDERS: { id: string; labelIt: string; labelEn: string }[] = [
  { id: 'nordvpn', labelIt: 'NordVPN', labelEn: 'NordVPN' },
  { id: 'protonvpn', labelIt: 'ProtonVPN', labelEn: 'ProtonVPN' },
  { id: 'mullvad', labelIt: 'Mullvad', labelEn: 'Mullvad' },
  { id: 'surfshark', labelIt: 'Surfshark', labelEn: 'Surfshark' },
  { id: 'custom', labelIt: 'OpenVPN / Custom', labelEn: 'OpenVPN / Custom' },
];

function t(lang: Lang): D {
  return DICT[lang];
}

export function SetupWizard({ open, onClose, onProfileChange }: { open: boolean; onClose: () => void; onProfileChange?: (p: UserProfile) => void }) {
  const [lang, setLang] = useState<Lang>('it');
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sources, setSources] = useState<TrackerSource[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [licenseActive, setLicenseActive] = useState(false);
  const [vpnMode, setVpnMode] = useState<'on' | 'off'>('on');
  const [vpnOffConfirm, setVpnOffConfirm] = useState(false);
  const [vpnProvider, setVpnProvider] = useState('nordvpn');
  const [vpnUser, setVpnUser] = useState('');
  const [vpnPass, setVpnPass] = useState('');
  const [vpnServer, setVpnServer] = useState('');
  const [srcName, setSrcName] = useState('');
  const [srcUrl, setSrcUrl] = useState('');

  useEffect(() => {
    if (open) {
      setStep(0);
      setMsg('');
      loadProfile();
    }
  }, [open]);

  async function loadProfile() {
    try {
      const res: ProfileResponse = await fetchProfile();
      const p = res.profile;
      setProfile(p);
      setIsAdmin(p.role === 'admin');
      setEmail(p.email || '');
      setDisplayName(p.displayName || '');
      setVpnMode(p.vpnEnabled ? 'on' : 'off');
      setLicenseActive((await fetchLicense()).has_license);
      const src = await fetchSources();
      setSources(Array.isArray(src) ? src : []);
      if (onProfileChange) onProfileChange(p);
    } catch { /* no-op */ }
  }

  function applyProfile(p: UserProfile) {
    setProfile(p);
    if (onProfileChange) onProfileChange(p);
  }

  async function handleAccount() {
    if (!email.trim()) return;
    setSaving(true);
    try {
      const res = await saveProfileEmail(email, displayName);
      if (res.ok) {
        applyProfile(res.profile);
        setIsAdmin(res.profile.role === 'admin');
        const src = await fetchSources();
        setSources(Array.isArray(src) ? src : []);
      }
    } catch { setMsg(t(lang).step5Sub); }
    setSaving(false);
  }

  async function handleLicense() {
    if (!keyInput.trim()) return;
    setSaving(true);
    try {
      const res = await activateLicense(keyInput.trim());
      if (res.ok && res.tier !== 'none') {
        setLicenseActive(true);
        setMsg(t(lang).activated);
      } else {
        setMsg(t(lang).free);
      }
    } catch { setMsg(t(lang).free); }
    setSaving(false);
  }

  async function handleVpn() {
    setSaving(true);
    try {
      let p = await setVpnEnabled(vpnMode === 'on');
      if (vpnMode === 'on' && vpnUser.trim() && vpnProvider) {
        p = await addVpnConnector({
          provider: vpnProvider,
          label: vpnProvider,
          username: vpnUser.trim(),
          password: vpnPass,
          server: vpnServer.trim(),
        });
      }
      applyProfile(p.profile);
    } catch { /* no-op */ }
    setSaving(false);
  }

  async function handleAddSource() {
    if (!srcName.trim() || !srcUrl.trim()) return;
    await addSource({ name: srcName.trim(), announceUrl: srcUrl.trim(), username: '', password: '' });
    setSrcName('');
    setSrcUrl('');
    const src = await fetchSources();
    setSources(Array.isArray(src) ? src : []);
  }

  async function handleRemoveSource(id: string) {
    await removeSource(id);
    const src = await fetchSources();
    setSources(Array.isArray(src) ? src : []);
  }

  async function handleFinish() {
    try {
      const res = await markWizardDone();
      applyProfile(res.profile);
    } catch { /* no-op */ }
    onClose();
  }

  async function handleRemoveVpn(id: string) {
    const res = await removeVpnConnector(id);
    applyProfile(res.profile);
  }

  if (!open) return null;
  const D = t(lang);
  const providerLabel = PROVIDERS.find(p => p.id === vpnProvider);
  const nextDisabled =
    (step === 1 && !email.trim()) ||
    (step === 3 && vpnMode === 'off' && !vpnOffConfirm);

  function StepIndicator() {
    const steps = 5;
    return (
      <div className="flex items-center gap-1.5 mb-5">
        {Array.from({ length: steps }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-[var(--accent)]' : 'bg-[var(--surface-3)]'}`} />
        ))}
      </div>
    );
  }

  function inputCls() {
    return 'w-full px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border-light)] text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--surface-1)] border border-[var(--border-light)] shadow-2xl p-6 scrollbar-thin">
        <button
          onClick={() => setLang(lang === 'it' ? 'en' : 'it')}
          className="absolute top-4 right-14 text-xs px-2.5 py-1 rounded-full border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--accent)] transition-colors"
        >
          {D.langLabel}
        </button>
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-3)] transition-colors">
          <X size={20} />
        </button>

        <StepIndicator />

        {step === 0 && (
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[var(--accent)] to-cyan-400 flex items-center justify-center mb-4">
              <ShieldCheck size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">{D.title}</h2>
            <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">{D.subtitle}</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <Mail size={18} />
              <h2 className="text-lg font-bold text-[var(--text-main)]">{D.step1Title}</h2>
            </div>
            <p className="text-xs text-[var(--text-muted)] -mt-2">{D.step1Sub}</p>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">{D.email}</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setIsAdmin(false); }} placeholder={D.emailPh} className={inputCls()} />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">{D.name}</label>
              <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={D.namePh} className={inputCls()} />
            </div>
            {isAdmin && (
              <div className="flex items-start gap-2 text-xs px-3 py-2.5 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                <Sparkles size={14} className="mt-0.5 shrink-0" />
                <span><b className="font-bold">{D.adminBadge}:</b> {D.adminHint}</span>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <KeyRound size={18} />
              <h2 className="text-lg font-bold text-[var(--text-main)]">{D.step2Title}</h2>
            </div>
            <p className="text-xs text-[var(--text-muted)] -mt-2">{D.step2Sub}</p>
            {licenseActive ? (
              <div className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg bg-[var(--success)]/10 text-[var(--success)]">
                <CheckCircle2 size={16} /> {D.activated}
              </div>
            ) : (
              <div className="flex gap-2">
                <input type="text" value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder={D.keyPh} className={inputCls()} />
                <button onClick={handleLicense} disabled={saving || !keyInput.trim()} className="shrink-0 px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-semibold text-sm disabled:opacity-40 hover:brightness-110 transition-all">
                  {D.activate}
                </button>
              </div>
            )}
            {msg && <div className="text-xs text-[var(--text-secondary)]">{msg}</div>}
            <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5"><Wifi size={12} />{D.free}</div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <ShieldCheck size={18} />
              <h2 className="text-lg font-bold text-[var(--text-main)]">{D.step3Title}</h2>
            </div>
            <p className="text-xs text-[var(--text-muted)] -mt-2">{D.step3Sub}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button onClick={() => setVpnMode('on')} className={`p-3 rounded-xl border text-left transition-all ${vpnMode === 'on' ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border-light)] bg-[var(--surface-2)] hover:border-[var(--border-light)]'}`}>
                <div className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-1.5"><ShieldCheck size={14} className="text-[var(--accent)]" />{D.vpnOn}</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-1">{D.vpnOnDesc}</div>
              </button>
              <button onClick={() => setVpnMode('off')} className={`p-3 rounded-xl border text-left transition-all ${vpnMode === 'off' ? 'border-[var(--danger)] bg-[var(--danger)]/10' : 'border-[var(--border-light)] bg-[var(--surface-2)] hover:border-[var(--border-light)]'}`}>
                <div className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-1.5"><AlertTriangle size={14} className="text-[var(--danger)]" />{D.vpnOff}</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-1">{D.vpnOffDesc}</div>
              </button>
            </div>

            {vpnMode === 'off' && (
              <label className="flex items-start gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" checked={vpnOffConfirm} onChange={e => setVpnOffConfirm(e.target.checked)} className="mt-0.5 accent-[var(--danger)]" />
                <span>{D.vpnOffConfirm}</span>
              </label>
            )}

            {vpnMode === 'on' && (
              <>
                <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-light)] space-y-2.5">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">{D.provider}</label>
                    <select value={vpnProvider} onChange={e => setVpnProvider(e.target.value)} className={inputCls()}>
                      <option value="">{D.chooseProvider}</option>
                      {PROVIDERS.map(p => (
                        <option key={p.id} value={p.id}>{lang === 'it' ? p.labelIt : p.labelEn}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={vpnUser} onChange={e => setVpnUser(e.target.value)} placeholder={D.username} className={inputCls()} />
                    <input type="password" value={vpnPass} onChange={e => setVpnPass(e.target.value)} placeholder={D.pass} className={inputCls()} />
                  </div>
                  <input type="text" value={vpnServer} onChange={e => setVpnServer(e.target.value)} placeholder={D.server} className={inputCls()} />
                  <button onClick={handleVpn} disabled={saving || !vpnProvider} className="w-full py-2 rounded-lg bg-[var(--accent)] text-white font-semibold text-sm disabled:opacity-40 hover:brightness-110 transition-all">
                    {D.addVpn}
                  </button>
                </div>

                <div>
                  <div className="text-xs font-semibold text-[var(--text-secondary)] mb-2">{D.yourVpn}</div>
                  {!profile || profile.vpn.length === 0 ? (
                    <div className="text-xs text-[var(--text-muted)] px-3 py-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-light)]">{D.noVpn}</div>
                  ) : (
                    <div className="space-y-1.5">
                      {profile.vpn.map(c => (
                        <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border-light)] text-sm">
                          <ShieldCheck size={14} className="text-[var(--success)] shrink-0" />
                          <span className="font-semibold text-[var(--text-main)] capitalize">{c.provider}</span>
                          <span className="text-[11px] text-[var(--text-muted)] truncate">{c.username}</span>
                          <button onClick={() => handleRemoveVpn(c.id)} className="ml-auto p-1 rounded text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <Globe size={18} />
              <h2 className="text-lg font-bold text-[var(--text-main)]">{D.step4Title}</h2>
            </div>
            <p className="text-xs text-[var(--text-muted)] -mt-2">{D.step4Sub}</p>

            {sources.length === 0 ? (
              <div className="text-xs text-[var(--text-muted)] px-3 py-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border-light)]">{D.noSources}</div>
            ) : (
              <div className="space-y-1.5">
                {sources.map(s => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border-light)] text-sm">
                    <Lock size={13} className="text-[var(--accent)] shrink-0" />
                    <span className="font-semibold text-[var(--text-main)]">{s.name}</span>
                    <span className="text-[11px] text-[var(--text-muted)] font-mono truncate">{s.announceUrl}</span>
                    <button onClick={() => handleRemoveSource(s.id)} className="ml-auto p-1 rounded text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={srcName} onChange={e => setSrcName(e.target.value)} placeholder={D.srcName} className={inputCls()} />
              <input type="text" value={srcUrl} onChange={e => setSrcUrl(e.target.value)} placeholder={D.srcUrl} className={inputCls()} />
            </div>
            <button onClick={handleAddSource} disabled={!srcName.trim() || !srcUrl.trim()} className="w-full py-2 rounded-xl border-2 border-dashed border-[var(--border-light)] text-[var(--text-muted)] text-sm font-semibold hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all flex items-center justify-center gap-2 disabled:opacity-40">
              <Plus size={15} /> {D.addTracker}
            </button>
          </div>
        )}

        {step === 5 && (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--success)]/15 flex items-center justify-center">
              <CheckCircle2 size={34} className="text-[var(--success)]" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-main)]">{D.step5Title}</h2>
            <div className="text-left space-y-1.5 max-w-sm mx-auto text-sm">
              <div className="flex items-center gap-2 text-[var(--text-secondary)]"><User size={13} />{profile?.email || '—'}</div>
              <div className="flex items-center gap-2 text-[var(--text-secondary)]"><ShieldCheck size={13} />{profile?.vpnEnabled ? D.vpnOn : D.vpnOff}</div>
              <div className="flex items-center gap-2 text-[var(--text-secondary)]"><Globe size={13} />{sources.length} {lang === 'it' ? 'fonti' : 'sources'}</div>
            </div>
            <p className="text-xs text-[var(--text-muted)]">{D.doneSummary}</p>
            <button onClick={handleFinish} className="mt-2 px-8 py-2.5 rounded-lg bg-[var(--accent)] text-white font-semibold hover:brightness-110 transition-all flex items-center gap-2 mx-auto">
              <CheckCircle2 size={16} /> {D.openApp}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--surface-3)] transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft size={15} /> {D.back}
          </button>

          {step === 0 && (
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 px-5 py-2 rounded-lg bg-[var(--accent)] text-white font-semibold text-sm hover:brightness-110 transition-all"
            >
              {D.next} <ChevronRight size={15} />
            </button>
          )}
          {step === 1 && (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={nextDisabled}
              className="flex items-center gap-1 px-5 py-2 rounded-lg bg-[var(--accent)] text-white font-semibold text-sm disabled:opacity-40 hover:brightness-110 transition-all"
            >
              {D.next} <ChevronRight size={15} />
            </button>
          )}
          {step === 1 && (
            <button onClick={() => setStep(2)} className="px-3 py-2 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
              {D.skip}
            </button>
          )}
          {step === 2 && (
            <button onClick={() => setStep(3)} className="flex items-center gap-1 px-5 py-2 rounded-lg bg-[var(--accent)] text-white font-semibold text-sm hover:brightness-110 transition-all">
              {D.next} <ChevronRight size={15} />
            </button>
          )}
          {step === 3 && (
            <button
              onClick={async () => { await handleVpn(); setStep(4); }}
              disabled={nextDisabled}
              className="flex items-center gap-1 px-5 py-2 rounded-lg bg-[var(--accent)] text-white font-semibold text-sm disabled:opacity-40 hover:brightness-110 transition-all"
            >
              {D.next} <ChevronRight size={15} />
            </button>
          )}
          {step === 4 && (
            <button onClick={() => setStep(5)} className="flex items-center gap-1 px-5 py-2 rounded-lg bg-[var(--accent)] text-white font-semibold text-sm hover:brightness-110 transition-all">
              {D.next} <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
