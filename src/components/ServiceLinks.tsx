import { useEffect, useState } from 'react';

interface ServiceLink { label: string; url: string; }

const FALLBACK: ServiceLink[] = [
  { label: 'Jellyfin', url: 'http://localhost:8096' },
  { label: 'qBittorrent', url: 'http://localhost:8082' },
  { label: 'Sonarr', url: 'http://localhost:8989' },
  { label: 'Radarr', url: 'http://localhost:7878' },
  { label: 'Prowlarr', url: 'http://localhost:9696' },
];

export function ServiceLinks() {
  const [services, setServices] = useState<ServiceLink[]>(FALLBACK);

  useEffect(() => {
    // Il main process risolve il miglior IP LAN (visibile anche dalla TV).
    (window as any).electronAPI?.getServerUrls?.()
      .then((r: any) => { if (r?.services?.length) setServices(r.services); })
      .catch(() => { /* fallback localhost */ });
  }, []);

  return (
    <div className="mx-4 flex flex-wrap gap-2">
      {services.map(({ label, url }) => (
        <button
          key={label}
          onClick={() => {
            try { (window as any).electronAPI?.openExternal(url); } catch { window.open(url, '_blank'); }
          }}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--surface-3)] hover:bg-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-all"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
