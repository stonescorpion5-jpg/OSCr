export type Strip = { id: string; label: string; group: 'Inputs' | 'Returns' | 'Buses'; color: string };
export const strips: Strip[] = [
  ...Array.from({ length: 16 }, (_, i): Strip => ({ id: `/ch/${String(i + 1).padStart(2, '0')}`, label: `CH ${String(i + 1).padStart(2, '0')}`, group: 'Inputs', color: ['#6de0bc', '#7caaff', '#c49bff', '#f0bc73'][Math.floor(i / 4)] })),
  { id: '/rtn/aux', label: 'AUX 17/18', group: 'Returns', color: '#74cddd' },
  ...Array.from({ length: 4 }, (_, i): Strip => ({ id: `/rtn/${i + 1}`, label: `FX ${i + 1} RTN`, group: 'Returns', color: '#c49bff' })),
  ...Array.from({ length: 6 }, (_, i): Strip => ({ id: `/bus/${i + 1}`, label: `BUS ${i + 1}`, group: 'Buses', color: '#f0bc73' })),
  ...Array.from({ length: 4 }, (_, i): Strip => ({ id: `/fxsend/${i + 1}`, label: `FX ${i + 1} SEND`, group: 'Buses', color: '#c49bff' })),
];
export const master: Strip = { id: '/lr', label: 'MAIN LR', group: 'Buses', color: '#6de0bc' };
export const queryPaths = () => [...strips, master].flatMap(strip => {
  const paths = [`${strip.id}/config/name`, ...['fader', 'on', 'pan'].map(p => `${strip.id}/mix/${p}`)];
  if (strip.group === 'Inputs') paths.push(...['eq/on', 'gate/on', 'dyn/on', 'preamp/hpon'].map(p => `${strip.id}/${p}`));
  const sendCount = strip.group === 'Inputs' ? 10 : strip.group === 'Returns' ? 6 : 0;
  for (let send = 1; send <= sendCount; send++) paths.push(`${strip.id}/mix/${String(send).padStart(2, '0')}/level`);
  return paths;
});
