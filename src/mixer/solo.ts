// XR18 parameter table: the OSC suffix is one-based, with USB solos
// occupying 22–39 between FX returns and bus masters.
export function soloPath(id: string): string | undefined {
  let index: number | undefined;
  const match = id.match(/^\/(ch|rtn|bus|fxsend)\/(\d+)$/);
  if (id === '/rtn/aux') index = 17;
  else if (id === '/lr') index = 50;
  else if (match) {
    const n = Number(match[2]);
    if (match[1] === 'ch' && n >= 1 && n <= 16) index = n;
    if (match[1] === 'rtn' && n >= 1 && n <= 4) index = n + 17;
    if (match[1] === 'bus' && n >= 1 && n <= 6) index = n + 39;
    if (match[1] === 'fxsend' && n >= 1 && n <= 4) index = n + 45;
  }
  return index === undefined ? undefined : `/-stat/solosw/${String(index).padStart(2, '0')}`;
}
