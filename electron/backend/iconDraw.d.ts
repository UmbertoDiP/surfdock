export type Rgba = [number, number, number, number];

export function encodePng(width: number, height: number, rgba: Buffer): Buffer;
export function encodeIco(pngBuffers: Buffer[]): Buffer;
export function crc32(buf: Buffer): number;
export function drawSentinelIcon(statusColor: Rgba, size?: number): Buffer;
export const PALETTE: Record<string, Rgba>;
