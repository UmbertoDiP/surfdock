import { SentinelState } from '../hooks/usePolling';

const vpnMap: Record<string, { label: string; bg: string }> = {
  healthy:   { label: 'VPN OK', bg: 'var(--success)' },
  unhealthy: { label: 'VPN GIU', bg: 'var(--danger)' },
  starting:  { label: 'AVVIO', bg: 'var(--warning)' },
  missing:   { label: 'NO VPN', bg: 'var(--text-muted)' },
  error:     { label: 'ERR', bg: 'var(--warning)' },
  unknown:   { label: '?', bg: 'var(--text-muted)' },
};

export function StatusPills({ state }: { state: SentinelState }) {
  const vpn = vpnMap[state.vpn] || vpnMap.unknown;
  const dockUp = state.docker.up;
  const dockTotal = state.docker.total;
  const dockOk = dockUp === dockTotal;
  const dockLabel = dockOk ? 'Docker OK' : dockUp === 0 ? 'Docker GIU' : `Docker ${dockUp}/${dockTotal}`;
  const dockBg = dockOk ? 'var(--success)' : dockUp > 0 ? 'var(--warning)' : 'var(--danger)';
  const jfOk = state.jellyfin === 'OK';
  const jfBg = jfOk ? 'var(--success)' : 'var(--danger)';

  return (
    <div className="grid grid-cols-3 gap-3 px-4">
      <div className="flex items-center justify-center py-2.5 rounded-xl text-white font-semibold text-sm transition-all duration-300" style={{ background: vpn.bg }}>
        {vpn.label}
      </div>
      <div className="flex items-center justify-center py-2.5 rounded-xl text-white font-semibold text-sm transition-all duration-300" style={{ background: dockBg }}>
        {dockLabel}
      </div>
      <div className="flex items-center justify-center py-2.5 rounded-xl text-white font-semibold text-sm transition-all duration-300" style={{ background: jfBg }}>
        Jellyfin {jfOk ? 'OK' : 'OFF'}
      </div>
    </div>
  );
}