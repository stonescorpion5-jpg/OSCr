export function outputPaths(id: string): string[] {
  const input = id.startsWith('/ch/');
  const routed = input || id.startsWith('/rtn/') || id.startsWith('/bus/');
  return [
    ...(routed ? [`${id}/mix/lr`] : []),
    ...(id !== '/lr' ? [`${id}/grp/dca`, `${id}/grp/mute`] : []),
    ...(input ? [`${id}/automix/group`, `${id}/automix/weight`] : []),
  ];
}
export function toggleGroup(mask: number, group: number): number {
  return (mask ^ (1 << group)) & 15;
}
export const weightFromWire = (value: number) => value * 24 - 12;
