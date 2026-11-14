import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { bandCount, frequencyFromWire, readBands, responseDb } from '../mixer/eq';
type Props = { id: string; label: string; color: string; values: Record<string, string | number> };
function MiniEqCurve({ id, label, color, values }: Props) {
  const bands = readBands(id, values);
  const on = values[`${id}/eq/on`];
  const isOutput = id === '/lr' || id.startsWith('/bus/');
  const mode = values[`${id}/eq/mode`];
  const supportedMode = !isOutput || mode === 0;
  const ready = bands.length > 0 && bands.every(band => band.ready) && supportedMode;
  if (!bands.length) return <View style={s.frame}><Text style={s.empty}>N/A</Text></View>;
  if ((on !== 0 && on !== 1) || (on !== 0 && !ready)) return <View style={s.frame}><Text style={s.empty}>{isOutput && typeof mode === 'number' && mode !== 0 ? (mode === 1 ? 'GEQ' : 'TEQ') : '—'}</Text></View>;
  const curve = Array.from({ length: 81 }, (_, i) => {
    const db = on === 1 ? bands.reduce((sum, band) => sum + responseDb(band, frequencyFromWire(i / 80)), 0) : 0;
    return `${i ? 'L' : 'M'}${(i / 80 * 100).toFixed(2)},${(15 - Math.max(-15, Math.min(15, db)) / 15 * 13).toFixed(2)}`;
  }).join(' ');
  return <View accessibilityRole="image" accessibilityLabel={`${label} EQ response${on === 0 ? ', bypassed' : ''}`} style={s.frame}>
    <Svg pointerEvents="none" width="100%" height={26} viewBox="0 0 100 30" preserveAspectRatio="none">
      <Line x1={0} x2={100} y1={15} y2={15} stroke="#354d58" strokeWidth={.6} strokeDasharray="3 3" />
      {on === 1 && <Path d={`${curve} L100,15 L0,15 Z`} fill={color} fillOpacity={.15} />}
      <Path d={curve} fill="none" stroke={on === 1 ? color : '#617582'} strokeWidth={1.7} />
    </Svg>
  </View>;
}
// Ignore unrelated fader/mute/meter updates; redraw only when this EQ changes.
export default memo(MiniEqCurve, (previous, next) => {
  if (previous.id !== next.id || previous.label !== next.label || previous.color !== next.color) return false;
  const root = next.id;
  const paths = [`${root}/eq/on`, `${root}/eq/mode`];
  for (let band = 1; band <= bandCount(root); band++) paths.push(...['type', 'f', 'g', 'q'].map(field => `${root}/eq/${band}/${field}`));
  return paths.every(path => previous.values[path] === next.values[path]);
});
const s = StyleSheet.create({ frame: { flex: 1, marginHorizontal: 4, height: 26, justifyContent: 'center' }, empty: { color: '#718592', fontSize: 7, textAlign: 'center' } });
