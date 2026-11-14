export const channelColors = [
  { name: 'Off', hex: '#718592' }, { name: 'Red', hex: '#fa7878' },
  { name: 'Green', hex: '#6de0bc' }, { name: 'Yellow', hex: '#f7cf74' },
  { name: 'Blue', hex: '#7caaff' }, { name: 'Magenta', hex: '#d99bff' },
  { name: 'Cyan', hex: '#74cddd' }, { name: 'White', hex: '#edf4f6' },
];
export function channelColor(value: unknown, fallback: string): string {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 15 ? channelColors[value % 8].hex : fallback;
}
