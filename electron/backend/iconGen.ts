import { nativeImage, NativeImage } from 'electron';
import { drawSentinelIcon, PALETTE } from './iconDraw.js';

export type Rgba = [number, number, number, number];

export function makeIcon(color: Rgba): NativeImage {
  return nativeImage.createFromBuffer(drawSentinelIcon(color, 64));
}

export const ICON_COLORS: Record<string, Rgba> = {
  red: PALETTE.red as Rgba,
  orange: PALETTE.orange as Rgba,
  yellow: PALETTE.yellow as Rgba,
  green: PALETTE.green as Rgba,
  idle: PALETTE.idle as Rgba,
};

export function iconColorForState(vpn: string, dl: number): Rgba {
  if (vpn === 'unhealthy') return ICON_COLORS.red;
  if (vpn === 'error') return ICON_COLORS.orange;
  if (vpn === 'missing' || vpn === 'unknown' || vpn === 'starting') return ICON_COLORS.yellow;
  return dl > 0 ? ICON_COLORS.green : ICON_COLORS.idle;
}
