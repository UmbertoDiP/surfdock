import { useEffect, useRef, useState } from 'react';
import { Gauge, Infinity as InfinityIcon } from 'lucide-react';
import { fetchRate, setRateLimit } from '../hooks/usePolling';

function mb(v: number): string {
  if (v <= 0) return 'illimitato';
  return `${Math.round(v)} MB/s`;
}

// Slider limite download globale: si adatta da solo alla banda rilevata.
// - auto-rilevazione: il max del range segue il picco di velocita' osservato
// - default 50% del range quando il limite e' illimitato (posizione visiva)
// - debounce 700ms prima di applicare il limite via API
export function RateLimitSlider({ speedKb }: { speedKb: number }) {
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

  // carica il limite attuale da qBittorrent; se illimitato, thumb al 50%
  useEffect(() => {
    let cancelled = false;
    fetchRate().then(r => {
      if (cancelled) return;
      setLimitKb(r.dl_limit_kb || 0);
      const p = Math.max(r.dl_speed_kb, 512);
      setPeakKb(p);
      const m = Math.max(10, Math.min(1000, Math.round((p / 1024) * 1.6)));
      setMax(m);
      setValue(r.dl_limit_kb > 0 ? Math.round(r.dl_limit_kb / 1024) : Math.round(m * 0.5));
      setSaved(true);
    }).catch(() => { /* backend non pronto */ });
    return () => { cancelled = true; };
  }, []);

  // sync automatica quando il limite cambia dal backend (es. pausa/resume)
  useEffect(() => {
    if (!limitKb && saved) {
      setValue(v => Math.min(v, max));
    }
  }, [limitKb, saved, max]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function change(v: number) {
    setValue(v);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const kb = Math.round(v * 1024);
      setRateLimit(kb).then(r => {
        setLimitKb(r.dl_limit_kb || 0);
        setSaved(true);
      }).catch(() => { setSaved(true); });
    }, 700);
  }

  function unlimited() {
    setValue(Math.round(max * 0.5));
    setLimitKb(0);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    setRateLimit(0).then(r => { setLimitKb(r.dl_limit_kb || 0); setSaved(true); })
      .catch(() => setSaved(true));
  }

  const applied = limitKb > 0 ? Math.round(limitKb / 1024) : 0;

  return (
    <div className="mb-2 px-3 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--border-light)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-main)]">
          <Gauge size={14} className="text-[var(--accent)]" />
          Limite download globale
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-muted)]">
            banda rilevata ~{mb(peakKb / 1024)} · ora {mb(speedKb / 1024)}
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${applied > 0 ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'bg-[var(--surface-2)] text-[var(--text-secondary)]'}`}>
            {applied > 0 ? mb(applied) : 'illimitato'}
          </span>
          <button
            onClick={unlimited}
            title="Rimuovi il limite (illimitato)"
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
          >
            <InfinityIcon size={11} />
            Illimitato
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
        title={`Limite: ${mb(value)} (max auto: ${max} MB/s)`}
      />
    </div>
  );
}
