import { useEffect, useState } from 'react';
import { fetchLicense, activateLicense, clearLicense } from '../hooks/usePolling';
import { X, Key, ExternalLink, CheckCircle2, CreditCard } from 'lucide-react';

interface LicenseInfo {
  ok: boolean;
  tier: string;
  email: string | null;
  activated_at: string | null;
  expires_at: string | null;
  has_license: boolean;
  stripe_basic_url?: string;
  stripe_dev_url?: string;
}

type Lang = 'it' | 'en';

const DICT: Record<string, Record<string, string>> = {
  it: {
    title: 'Licenza SurfDock',
    status: 'Stato',
    free: 'Versione Free',
    basic: 'Basic',
    dev: 'Dev',
    buyBasic: '29 EUR · Acquista Basic',
    buyDev: '79 EUR · Acquista Dev',
    basicFeat1: 'Iron Gate, dashboard, torrent, Docker',
    basicFeat2: 'Configurazione via file',
    basicFeat3: '1 anno aggiornamenti',
    basicFeat4: 'Supporto email 30 giorni',
    devFeat1: 'Tutto Basic + sorgente completo',
    devFeat2: 'Script build e integrazione API',
    devFeat3: '1 anno supporto prioritario',
    devFeat4: 'Licenza commerciale 1 server',
    enterKey: 'Inserisci chiave licenza',
    activate: 'Attiva',
    clear: 'Rimuovi licenza',
    noKey: 'Nessuna licenza inserita',
    expired: 'Scaduta',
    activated: 'Attivata il',
    expires: 'Scade il',
    close: 'Chiudi',
    features: 'Cosa include',
    go: 'Acquista su Stripe',
  },
  en: {
    title: 'SurfDock License',
    status: 'Status',
    free: 'Free Version',
    basic: 'Basic',
    dev: 'Dev',
    buyBasic: '29 EUR · Buy Basic',
    buyDev: '79 EUR · Buy Dev',
    basicFeat1: 'Iron Gate, dashboard, torrents, Docker',
    basicFeat2: 'File-based configuration',
    basicFeat3: '1 year of updates',
    basicFeat4: '30 days email support',
    devFeat1: 'All Basic + full source',
    devFeat2: 'Build scripts and API integration',
    devFeat3: '1 year priority support',
    devFeat4: 'Commercial 1-server license',
    enterKey: 'Enter license key',
    activate: 'Activate',
    clear: 'Remove license',
    noKey: 'No license key',
    expired: 'Expired',
    activated: 'Activated on',
    expires: 'Expires on',
    close: 'Close',
    features: 'Includes',
    go: 'Buy on Stripe',
  },
};

function t(key: string, lang: Lang): string {
  return DICT[lang]?.[key] ?? key;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('it-IT', { year: 'numeric', month: 'short', day: 'numeric' });
}

function Toggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <button
      onClick={() => setLang(lang === 'it' ? 'en' : 'it')}
      className="absolute top-4 right-14 text-xs px-2.5 py-1 rounded-full border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--accent)] transition-colors"
    >
      {lang === 'it' ? 'EN' : 'IT'}
    </button>
  );
}

export function RegistrationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [lang, setLang] = useState<Lang>('it');
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [activating, setActivating] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (open) {
      setMsg('');
      setKeyInput('');
      fetchLicense().then(setLicense).catch(() => {});
    }
  }, [open]);

  async function handleActivate() {
    if (!keyInput.trim()) return;
    setActivating(true);
    setMsg('');
    try {
      const res = await activateLicense(keyInput.trim());
      if (res.ok && res.tier !== 'none') {
        setLicense(prev => prev ? { ...prev, tier: res.tier, has_license: true, activated_at: new Date().toISOString(), expires_at: res.expires_at } : null);
        setKeyInput('');
        setMsg(lang === 'it' ? 'Licenza attivata!' : 'License activated!');
      } else {
        setMsg(lang === 'it' ? 'Chiave non valida.' : 'Invalid key.');
      }
    } catch { setMsg(lang === 'it' ? 'Errore di connessione.' : 'Connection error.'); }
    setActivating(false);
  }

  async function handleClear() {
    try {
      await clearLicense();
      setLicense(prev => prev ? { ...prev, tier: 'none', has_license: false, email: null, activated_at: null, expires_at: null } : null);
      setMsg('');
    } catch { /* no-op */ }
  }

  function openStripe(url: string) {
    if (url) window.open(url, '_blank');
  }

  if (!open) return null;

  const isRegistered = license?.has_license && license.tier !== 'none';
  const stripeBasic = license?.stripe_basic_url || '';
  const stripeDev = license?.stripe_dev_url || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--surface-1)] border border-[var(--border-light)] shadow-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <Toggle lang={lang} setLang={setLang} />
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-3)] transition-colors">
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-[var(--text-main)] mb-1">{t('title', lang)}</h2>

        {/* License status */}
        <div className="flex items-center gap-2 mb-5 text-sm">
          <span className="text-[var(--text-secondary)]">{t('status', lang)}:</span>
          {isRegistered ? (
            <span className="flex items-center gap-1 text-[var(--success)] font-semibold">
              <CheckCircle2 size={16} />
              {license!.tier === 'basic' ? t('basic', lang) : t('dev', lang)}
            </span>
          ) : (
            <span className="text-[var(--text-muted)]">{t('free', lang)}</span>
          )}
        </div>

        {/* Activation message */}
        {msg && (
          <div className={`text-sm mb-3 px-3 py-1.5 rounded-lg ${msg.includes('ok') || msg.includes('attivata') ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--danger)]/10 text-[var(--danger)]'}`}>
            {msg}
          </div>
        )}

        {/* Pricing cards */}
        {!isRegistered && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {/* Basic */}
            <div className="rounded-xl bg-[var(--surface-2)] border border-[var(--border-light)] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[var(--text-main)] text-lg">{t('basic', lang)}</h3>
                <span className="text-xs font-semibold text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-full">29 EUR</span>
              </div>
              <ul className="text-xs text-[var(--text-secondary)] space-y-1.5">
                <li className="flex items-start gap-1.5"><CheckCircle2 size={12} className="mt-0.5 shrink-0 text-[var(--success)]" />{t('basicFeat1', lang)}</li>
                <li className="flex items-start gap-1.5"><CheckCircle2 size={12} className="mt-0.5 shrink-0 text-[var(--success)]" />{t('basicFeat2', lang)}</li>
                <li className="flex items-start gap-1.5"><CheckCircle2 size={12} className="mt-0.5 shrink-0 text-[var(--success)]" />{t('basicFeat3', lang)}</li>
                <li className="flex items-start gap-1.5"><CheckCircle2 size={12} className="mt-0.5 shrink-0 text-[var(--success)]" />{t('basicFeat4', lang)}</li>
              </ul>
              <button
                onClick={() => openStripe(stripeBasic)}
                className="mt-auto w-full py-2 rounded-lg bg-[var(--accent)] text-white font-semibold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                <CreditCard size={14} />{t('buyBasic', lang)}
              </button>
            </div>
            {/* Dev */}
            <div className="rounded-xl bg-[var(--surface-2)] border-2 border-[var(--accent)]/40 p-4 flex flex-col gap-3 relative">
              <div className="absolute -top-2.5 right-3 text-[10px] font-bold text-white bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] px-2 py-0.5 rounded-full">
                {lang === 'it' ? 'MIGLIOR VALORE' : 'BEST VALUE'}
              </div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[var(--text-main)] text-lg">{t('dev', lang)}</h3>
                <span className="text-xs font-semibold text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-full">79 EUR</span>
              </div>
              <ul className="text-xs text-[var(--text-secondary)] space-y-1.5">
                <li className="flex items-start gap-1.5"><CheckCircle2 size={12} className="mt-0.5 shrink-0 text-[var(--success)]" />{t('devFeat1', lang)}</li>
                <li className="flex items-start gap-1.5"><CheckCircle2 size={12} className="mt-0.5 shrink-0 text-[var(--success)]" />{t('devFeat2', lang)}</li>
                <li className="flex items-start gap-1.5"><CheckCircle2 size={12} className="mt-0.5 shrink-0 text-[var(--success)]" />{t('devFeat3', lang)}</li>
                <li className="flex items-start gap-1.5"><CheckCircle2 size={12} className="mt-0.5 shrink-0 text-[var(--success)]" />{t('devFeat4', lang)}</li>
              </ul>
              <button
                onClick={() => openStripe(stripeDev)}
                className="mt-auto w-full py-2 rounded-lg bg-gradient-to-r from-[var(--accent)] to-cyan-400 text-white font-semibold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                <CreditCard size={14} />{t('buyDev', lang)}
              </button>
            </div>
          </div>
        )}

        {/* License key activation */}
        <div className="rounded-xl bg-[var(--surface-2)] border border-[var(--border-light)] p-4">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-[var(--text-secondary)]">
            <Key size={16} />{t('enterKey', lang)}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              placeholder="SURFDK-..."
              className="flex-1 px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border-light)] text-[var(--text-main)] text-sm placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
            />
            <button
              onClick={handleActivate}
              disabled={activating || !keyInput.trim()}
              className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-semibold text-sm disabled:opacity-40 hover:brightness-110 transition-all flex items-center gap-1.5"
            >
              {activating ? '...' : <><CheckCircle2 size={14} />{t('activate', lang)}</>}
            </button>
          </div>
          {isRegistered && (
            <button
              onClick={handleClear}
              className="mt-2 text-xs text-[var(--danger)] hover:underline"
            >
              {t('clear', lang)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}