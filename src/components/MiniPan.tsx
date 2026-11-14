import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Polygon } from 'react-native-svg';
type Props = { value: string | number | undefined; color: string; supported: boolean };
function MiniPan({ value, color, supported }: Props) {
  const pan = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : undefined;
  const description = !supported ? 'not available' : pan === undefined ? 'unavailable' : Math.abs(pan - .5) < .005 ? 'center' : `${pan < .5 ? 'left' : 'right'} ${Math.round(Math.abs(pan - .5) * 200)}`;
  return <View accessibilityLabel={`Pan ${description}`} style={s.frame}>
    {!supported || pan === undefined ? <Text style={s.empty}>{supported ? '—' : 'N/A'}</Text> : <Svg pointerEvents="none" width="100%" height={18} viewBox="0 0 100 20" preserveAspectRatio="none">
      <Polygon points="0,1 50,10 0,19" fill={color} fillOpacity={.5} />
      <Polygon points="100,1 50,10 100,19" fill={color} fillOpacity={.5} />
      {Array.from({ length: 25 }, (_, i) => <Line key={i} x1={i * 100 / 24} x2={i * 100 / 24} y1={0} y2={20} stroke="#0e151c" strokeWidth={1.5} />)}
      <Line x1={50} x2={50} y1={0} y2={20} stroke="#526575" strokeWidth={.6} />
      <Line x1={pan * 98 + 1} x2={pan * 98 + 1} y1={0} y2={20} stroke="#edf4f6" strokeWidth={1.5} />
    </Svg>}
  </View>;
}
export default memo(MiniPan);
const s = StyleSheet.create({ frame: { flex: 1, height: 20, marginLeft: 4, justifyContent: 'center' }, empty: { color: '#718592', fontSize: 7, textAlign: 'center' } });
