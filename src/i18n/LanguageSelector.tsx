import { useEffect, useRef, useState } from 'react';
import { Languages, Check } from 'lucide-react';
import { useLanguage } from './LanguageContext';

// Selettore lingua: lista compatta con nome nativo + flag, tier 1 in cima.
export function LanguageSelector() {
  const { language, setLanguage, availableLanguages } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const current = availableLanguages.find(l => l.code === language);
  const sorted = [...availableLanguages].sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Lingua"
        className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--surface-2)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
      >
        <Languages size={13} />
        <span className="text-[11px] font-semibold">{current?.code.toUpperCase()}</span>
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-1 max-h-72 overflow-y-auto min-w-[180px] rounded-lg bg-[var(--surface-3)] border border-[var(--border-light)] shadow-xl z-50 py-1">
          {sorted.map(l => (
            <button
              key={l.code}
              onClick={() => { setLanguage(l.code); setOpen(false); }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-left hover:bg-[var(--surface-2)] transition-colors ${l.code === language ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-main)]'}`}
            >
              <span>{l.rtl ? `${l.name} (RTL)` : l.name}</span>
              <span className="flex items-center gap-1">
                <span className="text-[10px] text-[var(--text-muted)]">{l.code}</span>
                {l.code === language && <Check size={11} />}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
