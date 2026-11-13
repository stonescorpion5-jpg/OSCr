import { Buffer } from 'buffer';
export type Argument = { type: 'f' | 'i'; value: number } | { type: 's'; value: string };
const string = (value: string) => { const b = Buffer.from(value + '\0', 'utf8'); return Buffer.concat([b, Buffer.alloc((4 - b.length % 4) % 4)]); };
export function encode(address: string, args: Argument[] = []): Buffer {
  return Buffer.concat([string(address), string(',' + args.map(a => a.type).join('')), ...args.map(a => {
    if (a.type === 's') return string(a.value);
    const b = Buffer.alloc(4); if (a.type === 'f') b.writeFloatBE(a.value, 0); else b.writeInt32BE(a.value, 0); return b;
  })]);
}
export function decode(data: Uint8Array): { address: string; args: (number | string)[] } {
  const b = Buffer.from(data); let offset = 0;
  function readString() { const end = b.indexOf(0, offset); if (end < 0) throw new Error('Unterminated OSC string'); const s = b.toString('utf8', offset, end); offset = Math.ceil((end + 1) / 4) * 4; return s; }
  const address = readString(); if (!address.startsWith('/')) throw new Error('Unsupported OSC packet');
  const tags = readString(); if (!tags.startsWith(',')) throw new Error('Invalid OSC tags');
  const args = [...tags.slice(1)].map(t => { if (t === 's') return readString(); if (offset + 4 > b.length) throw new Error('Truncated OSC packet'); let n: number; if (t === 'f') n = b.readFloatBE(offset); else if (t === 'i') n = b.readInt32BE(offset); else throw new Error('Unsupported OSC type'); offset += 4; return n; });
  return { address, args };
}
export function faderDb(value: number): number {
  if (value <= 0) return -Infinity;
  if (value < .0625) return value * 480 - 90;
  if (value < .25) return value * 160 - 70;
  if (value < .5) return value * 80 - 50;
  return value * 40 - 30;
}
export const levelLabel = (v: number) => v <= 0 ? '−∞' : faderDb(v).toFixed(1);
