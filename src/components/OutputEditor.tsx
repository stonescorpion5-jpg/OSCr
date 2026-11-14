import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Polygon } from 'react-native-svg';
import Slider from './Slider';
import type { useMixer } from '../mixer/useMixer';
import { toggleGroup, weightFromWire } from '../mixer/output';
type Props = { id: string; mixer: ReturnType<typeof useMixer> };
const blue = '#7caaff';
export default function OutputEditor({ id, mixer }: Props) {
  const read = (suffix: string) => { const value = mixer.values[`${id}/${suffix}`]; return typeof value === 'number' ? value : undefined; };
  const input = id.startsWith('/ch/');
  const hasPan = !id.startsWith('/fxsend/');
  const hasLr = input || id.startsWith('/rtn/') || id.startsWith('/bus/');
  const pan = read('mix/pan');
  const lr = read('mix/lr');
  const group = read('automix/group');
  const weight = read('automix/weight');
  const button = (label: string, active: boolean, disabled: boolean, onPress: () => void) => <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: active, disabled }} disabled={disabled} onPress={onPress} style={[s.button, active && s.selected, disabled && s.disabled]}><Text style={[s.buttonText, active && { color: blue }]}>{label}</Text></Pressable>;
  return <View style={s.layout}>
    {hasPan && <View style={[s.panel, s.panPanel]}>
      <Text style={s.title}>{id === '/lr' || id.startsWith('/rtn/') ? 'BALANCE' : 'PAN'}</Text>
      <View accessibilityRole="image" accessibilityLabel={`Pan ${pan === undefined ? 'unavailable' : Math.round((pan - .5) * 200)}`} style={s.display}>
        <Svg width="100%" height={110} viewBox="0 0 400 110" preserveAspectRatio="none">
          <Polygon points="0,5 200,55 0,105" fill={blue} fillOpacity={.35} />
          <Polygon points="400,5 200,55 400,105" fill={blue} fillOpacity={.35} />
          {Array.from({ length: 65 }, (_, i) => <Line key={i} x1={i * 6.25} x2={i * 6.25} y1={5} y2={105} stroke="#101b25" strokeWidth={2} />)}
          <Line x1={200} x2={200} y1={0} y2={110} stroke="#526575" strokeDasharray="3 3" />
          {pan !== undefined && <Line x1={pan * 400} x2={pan * 400} y1={0} y2={110} stroke="#edf4f6" strokeWidth={2} />}
        </Svg>
      </View>
      <Slider accessibilityLabel="Output pan / balance" value={pan ?? .5} disabled={pan === undefined} minimumValue={0} maximumValue={1} minimumTrackTintColor={blue} maximumTrackTintColor="#26323d" thumbTintColor={blue} onValueChange={v => mixer.write(`${id}/mix/pan`, v)} />
      <View style={s.labels}><Text style={s.small}>L</Text><Text style={s.value}>{pan === undefined ? '—' : Math.abs(pan - .5) < .005 ? 'CENTER' : `${pan < .5 ? 'L' : 'R'} ${Math.round(Math.abs(pan - .5) * 200)}`}</Text><Text style={s.small}>R</Text></View>
      {hasLr && <View style={s.assignment}><Text style={s.title}>MAIN STEREO</Text>{button('LR', lr === 1, lr === undefined, () => mixer.write(`${id}/mix/lr`, lr === 1 ? 0 : 1, 'i'))}</View>}
    </View>}
    {id !== '/lr' && <View style={[s.panel, s.groups]}>{(['dca', 'mute'] as const).map(kind => {
      const mask = read(`grp/${kind}`);
      return <View key={kind} style={s.column}><Text style={s.title}>{kind === 'dca' ? 'DCA GROUP' : 'MUTE GROUP'}</Text>{[0, 1, 2, 3].map(i => button(String(i + 1), mask !== undefined && !!(mask & (1 << i)), mask === undefined, () => { if (mask !== undefined) mixer.write(`${id}/grp/${kind}`, toggleGroup(mask, i), 'i'); }))}</View>;
    })}</View>}
    {input && <View style={[s.panel, s.automix]}>
      <View style={s.column}><Text style={s.title}>AUTO MIX</Text><View style={s.labels}>{['X', 'Y'].map((label, i) => button(label, group === i + 1, group === undefined, () => mixer.write(`${id}/automix/group`, group === i + 1 ? 0 : i + 1, 'i')))}</View><Text style={s.small}>Channel assignment</Text></View>
      <View style={s.column}><Text style={s.title}>WEIGHT</Text><View style={s.well}><Slider accessibilityLabel="Automix weight" style={s.vertical} value={weight ?? .5} disabled={weight === undefined} minimumValue={0} maximumValue={1} step={1 / 48} minimumTrackTintColor={blue} maximumTrackTintColor="#26323d" thumbTintColor={blue} onValueChange={v => mixer.write(`${id}/automix/weight`, v)} /></View><Text style={s.value}>{weight === undefined ? '—' : `${weightFromWire(weight).toFixed(1)} dB`}</Text></View>
      <View style={s.column}><Text style={s.title}>GR</Text><View style={s.meter}>{Array.from({ length: 20 }, (_, i) => <View key={i} style={s.segment} />)}</View><Text style={s.small}>Unavailable</Text></View>
    </View>}
  </View>;
}
const s = StyleSheet.create({
  layout: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  panel: { backgroundColor: '#0c141c', borderColor: '#263b4a', borderWidth: 1, borderRadius: 10, padding: 18, minHeight: 310 },
  panPanel: { flexGrow: 2, flexBasis: 330, minWidth: 240 },
  title: { color: '#a9bac8', fontSize: 11, fontWeight: '700', letterSpacing: 1, textAlign: 'center' },
  display: { marginTop: 20, marginBottom: 16, borderWidth: 1, borderColor: '#263b4a', backgroundColor: '#101b25' },
  labels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  value: { color: blue, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  small: { color: '#718592', fontSize: 10, textAlign: 'center' },
  assignment: { alignItems: 'center', gap: 12, marginTop: 24 },
  groups: { flexDirection: 'row', flexGrow: 1, justifyContent: 'space-around', gap: 20 },
  column: { alignItems: 'center', justifyContent: 'center', gap: 14 },
  button: { minWidth: 48, minHeight: 44, padding: 10, borderWidth: 1, borderColor: '#405363', backgroundColor: '#1d2b36', borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  selected: { borderColor: blue, backgroundColor: '#203c56' },
  disabled: { opacity: .35 },
  buttonText: { color: '#b1bfca', fontSize: 18, fontWeight: '600' },
  automix: { flexGrow: 1, flexDirection: 'row', justifyContent: 'space-around', gap: 20 },
  well: { width: 50, height: 180, alignItems: 'center', justifyContent: 'center' },
  vertical: { width: 180, height: 40, transform: [{ rotate: '-90deg' }] },
  meter: { height: 180, gap: 4, justifyContent: 'space-between' },
  segment: { width: 20, height: 5, backgroundColor: '#263746', borderRadius: 3 },
});
