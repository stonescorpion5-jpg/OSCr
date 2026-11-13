import { clamp01 } from './eq';
export type DynamicsKind = 'gate' | 'dyn';
export const ratios = [1.1, 1.3, 1.5, 2, 2.5, 3, 4, 5, 7, 10, 20, 100];
export const gateModes = ['Exp 2:1', 'Exp 3:1', 'Exp 4:1', 'Gate', 'Ducker'];
export const compressorModes = ['Compressor', 'Expander'];
export function dynamicsFields(kind: DynamicsKind) { return ['mode', 'thr', 'attack', 'hold', 'release', ...(kind === 'gate' ? ['range'] : ['ratio', 'mgain'])]; }
export function hasCompressor(id: string) { return id.startsWith('/ch/') || id.startsWith('/bus/') || id === '/lr'; }
export function dynamicsValue(kind: DynamicsKind, field: string, value: number): number {
  const v = clamp01(value);
  switch (field) {
    case 'thr': return (kind === 'gate' ? -80 : -60) * (1 - v);
    case 'range': return 3 + 57 * v;
    case 'attack': return 120 * v;
    case 'hold': return .02 * Math.pow(100000, v);
    case 'release': return 5 * Math.pow(800, v);
    case 'mgain': return 24 * v;
    default: return value;
  }
}
export function dynamicsWire(kind: DynamicsKind, field: string, value: number): number {
  switch (field) {
    case 'thr': return clamp01(1 + value / (kind === 'gate' ? 80 : 60));
    case 'range': return clamp01((value - 3) / 57);
    case 'attack': return clamp01(value / 120);
    case 'hold': return clamp01(Math.log(value / .02) / Math.log(100000));
    case 'release': return clamp01(Math.log(value / 5) / Math.log(800));
    case 'mgain': return clamp01(value / 24);
    default: return value;
  }
}
export type Transfer = { kind: DynamicsKind; threshold: number; mode: number; range: number; ratio: number; makeup: number };
// Static hard-knee approximation. This is not a live input/output or GR meter.
export function transferDb(input: number, p: Transfer): number {
  const delta = input - p.threshold;
  if (p.kind === 'gate') {
    if (p.mode === 4) return input - (delta > 0 ? p.range : 0);
    const reduction = p.mode === 3 ? (delta < 0 ? p.range : 0) : Math.min(p.range, Math.max(0, -delta * (p.mode + 1)));
    return input - reduction;
  }
  if (p.mode === 1) return input + Math.min(0, delta * (p.ratio - 1)) + p.makeup;
  return input - Math.max(0, delta) * (1 - 1 / p.ratio) + p.makeup;
}
