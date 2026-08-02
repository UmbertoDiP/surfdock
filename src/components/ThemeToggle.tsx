import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--surface-3)] text-[var(--text-secondary)] transition-colors"
      title={theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function TitleBar() {
  return (
    <div className="flex items-center justify-between h-12 px-4 bg-[var(--surface-2)] border-b border-[var(--border-light)]" style={{ WebkitAppRegion: 'drag' } as any}>
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round"><path d="M2 6c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2"/><path d="M2 12c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2"/><path d="M2 18c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2"/></svg>
        </div>
        <span className="text-sm font-semibold text-[var(--text-main)]">SurfDock</span>
      </div>
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <ThemeToggle />
      </div>
    </div>
  );
}
