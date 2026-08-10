import { useEffect, useRef, useState } from 'react';
import { Gauge, Infinity as InfinityIcon } from 'lucide-react';
import { fetchRate, setRateLimit } from '../hooks/usePolling';
import { useLanguage } from '../i18n/LanguageContext';

function mb(v: number): string {
  if (v <= 0) return 'illimitato';
  return `${Math.round(v)} MB/s`;
}

// Slider limite download globale: si adatta da solo alla banda rilevata.
// - auto-rilevazione: il max del range segue il picco di velocita' osservato
// - fondo corsa (value === max) = illimitato (0): nessun tetto arbitrario
// - debounce 700ms prima di applicare il limite via API
export function RateLimitSlider({ speedKb }: { speedKb: number }) {
  const { t } = useLanguage();
  const [limitKb, setLimitKb] = useState(0);      // 0 = illimitato
  const [value, setValue] = useState(50);          // posizione slider in MB/s
  const [max, setMax] = useState(100);             // max range (MB/s)
  const [peakKb, setPeakKb] = useState(0);         // picco banda rilevato
  const [saved, setSaved] = useState(true);        // true = valore sincronizzato col backend
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // auto-range: max = max(10, picco * 1.6), cap 1000 MB/s
  useEffect(() => {
    const p = Math.max(peakKb, speedKb);
    if (p === peakKb) return;
    setPeakKb(p);
    const m = Math.max(10, Math.min(1000, Math.round((p / 1024) * 1.6)));
    setMax(m);
    setValue(v => Math.min(v, m));
  }, [speedKb, peakKb]);

  // carica il limite attuale da qBittorrent; se illimitato, thumb in fondo (posizione max)
  useEffect(() => {
    let cancelled = false;
    fetchRate().then(r => {
      if (cancelled) return;
      setLimitKb(r.dl_limit_kb || 0);
      const p = Math.max(r.dl_speed_kb, 512);
      setPeakKb(p);
      const m = Math.max(10, Math.min(1000, Math.round((p / 1024) * 1.6)));
      setMax(m);
      setValue(r.dl_limit_kb > 0 ? Math.round(r.dl_limit_kb / 1024) : m);
      setSaved(true);
    }).catch(() => { /* backend non pronto */ });
    return () => { cancelled = true; };
  }, []);

  // sync automatica: se il backend torna illimitato, thumb in fondo (posizione max)
  useEffect(() => {
    if (!limitKb && saved) {
      setValue(max);
    }
  }, [limitKb, saved, max]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // il fondo corsa (value === max) e' SEMPRE illimitato (0): il max del range
  // garantisce la banda massima configurabile e mai un tetto arbitrario
  function change(v: number) {
    setValue(v);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const kb = v >= max ? 0 : Math.round(v * 1024);
      setRateLimit(kb).then(r => {
        setLimitKb(r.dl_limit_kb || 0);
        setSaved(true);
      }).catch(() => { setSaved(true); });
    }, 700);
  }

  function unlimited() {
    setValue(max);
    setLimitKb(0);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    setRateLimit(0).then(r => { setLimitKb(r.dl_limit_kb || 0); setSaved(true); })
      .catch(() => setSaved(true));
  }

  const atMax = value >= max;
  const applied = limitKb > 0 ? Math.round(limitKb / 1024) : 0;
  const label = applied > 0 ? mb(applied) : t('rate.unlimited');

  return (
    <div className="mb-2 px-3 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--border-light)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-main)]">
          <Gauge size={14} className="text-[var(--accent)]" />
          {t('rate.title')}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-muted)]">
            {t('rate.bandwidth_detected', { '1': mb(peakKb / 1024), '2': mb(speedKb / 1024) })}
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${applied > 0 ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'bg-[var(--surface-2)] text-[var(--text-secondary)]'}`}>
            {label}
          </span>
          <button
            onClick={unlimited}
            title={t('rate.remove_limit')}
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
          >
            <InfinityIcon size={11} />
            {t('rate.unlimited')}
          </button>
        </div>
      </div>
      <input
        type="range"
        min={1}
        max={max}
        step={1}
        value={Math.min(value, max)}
        onChange={e => change(Number(e.target.value))}
        className="w-full mt-1.5 h-1.5 rounded-full cursor-pointer accent-[var(--accent)]"
        title={t('rate.limit_value', { '1': atMax ? t('rate.unlimited') : mb(value), '2': String(max) })}
      />
    </div>
  );
}
