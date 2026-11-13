export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const frequencyFromWire = (v: number) => 20 * Math.pow(1000, clamp01(v));
export const frequencyToWire = (hz: number) => clamp01(Math.log(hz / 20) / Math.log(1000));
export const gainFromWire = (v: number) => clamp01(v) * 30 - 15;
export const gainToWire = (db: number) => clamp01((db + 15) / 30);
export const qFromWire = (v: number) => .3 * Math.pow(10 / .3, 1 - clamp01(v));
export const qToWire = (q: number) => clamp01(1 - Math.log(q / .3) / Math.log(10 / .3));
export const bandCount = (id: string) => id === '/lr' || id.startsWith('/bus/') ? 6 : id.startsWith('/fxsend/') ? 0 : 4;
export const filterTypes = ['Low cut', 'Low shelf', 'Bell', 'Vintage', 'High shelf', 'High cut'];
export type EqBand = { index: number; frequency: number; gain: number; q: number; type: number; ready: boolean };
export function readBands(id: string, values: Record<string, string | number>): EqBand[] {
  return Array.from({ length: bandCount(id) }, (_, i) => {
    const root = `${id}/eq/${i + 1}`;
    const f = values[`${root}/f`], g = values[`${root}/g`], q = values[`${root}/q`], type = values[`${root}/type`];
    const ready = [f, g, q, type].every(v => typeof v === 'number' && Number.isFinite(v)) && Number.isInteger(type) && Number(type) >= 0 && Number(type) <= 5;
    return { index: i + 1, frequency: frequencyFromWire(typeof f === 'number' ? f : frequencyToWire([80, 300, 2000, 8000, 12000, 16000][i])), gain: gainFromWire(typeof g === 'number' ? g : .5), q: qFromWire(typeof q === 'number' ? q : qToWire(1.4)), type: typeof type === 'number' ? type : 2, ready };
  });
}
// RBJ biquad response model at 48 kHz. Vintage is approximated by a bell;
// this display is not a measurement of the mixer's proprietary DSP.
export function responseDb(band: EqBand, frequency: number): number {
  const w = 2 * Math.PI * band.frequency / 48000, c = Math.cos(w), sn = Math.sin(w);
  const a = Math.pow(10, band.gain / 40), alpha = sn / (2 * band.q);
  let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;
  if (band.type === 0 || band.type === 5) {
    const highpass = band.type === 0;
    b0 = (1 + (highpass ? c : -c)) / 2; b1 = highpass ? -(1 + c) : 1 - c; b2 = b0;
    a0 = 1 + alpha; a1 = -2 * c; a2 = 1 - alpha;
  } else if (band.type === 1 || band.type === 4) {
    const beta = 2 * Math.sqrt(a) * alpha;
    if (band.type === 1) {
      b0 = a * ((a + 1) - (a - 1) * c + beta); b1 = 2 * a * ((a - 1) - (a + 1) * c); b2 = a * ((a + 1) - (a - 1) * c - beta);
      a0 = (a + 1) + (a - 1) * c + beta; a1 = -2 * ((a - 1) + (a + 1) * c); a2 = (a + 1) + (a - 1) * c - beta;
    } else {
      b0 = a * ((a + 1) + (a - 1) * c + beta); b1 = -2 * a * ((a - 1) + (a + 1) * c); b2 = a * ((a + 1) + (a - 1) * c - beta);
      a0 = (a + 1) - (a - 1) * c + beta; a1 = 2 * ((a - 1) - (a + 1) * c); a2 = (a + 1) - (a - 1) * c - beta;
    }
  } else {
    b0 = 1 + alpha * a; b1 = -2 * c; b2 = 1 - alpha * a; a0 = 1 + alpha / a; a1 = -2 * c; a2 = 1 - alpha / a;
  }
  const x = 2 * Math.PI * frequency / 48000;
  const magnitude = (v0: number, v1: number, v2: number) => Math.pow(v0 + v1 * Math.cos(x) + v2 * Math.cos(2 * x), 2) + Math.pow(v1 * Math.sin(x) + v2 * Math.sin(2 * x), 2);
  return 10 * Math.log10(Math.max(1e-20, magnitude(b0, b1, b2)) / Math.max(1e-20, magnitude(a0, a1, a2)));
}
