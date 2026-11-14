export const hpfFromWire = (value: number) => 20 * Math.pow(20, value);
export const gainFromWire = (value: number) => -12 + value * 72;
export function headampRoot(source: unknown): string | undefined {
  return typeof source === 'number' && Number.isInteger(source) && source >= 0 && source < 16 ? `/headamp/${String(source + 1).padStart(2, '0')}` : undefined;
}
export function linkPath(id: string): string | undefined {
  if (!/^\/ch\/\d{2}$/.test(id)) return undefined;
  const n = Number(id.slice(-2));
  const first = n % 2 ? n : n - 1;
  return n >= 1 && n <= 16 ? `/config/chlink/${first}-${first + 1}` : undefined;
}
export function inputPaths(id: string): string[] {
  const input = id.startsWith('/ch/');
  const returns = id.startsWith('/rtn/');
  return [
    ...(input ? ['config/insrc', 'config/rtnsrc', 'preamp/invert', 'preamp/hpon', 'preamp/hpf'].map(p => `${id}/${p}`) : []),
    ...(input || returns ? ['preamp/rtnsw', 'preamp/rtntrim'].map(p => `${id}/${p}`) : []),
    ...(linkPath(id) ? [linkPath(id)!] : []),
  ];
}
