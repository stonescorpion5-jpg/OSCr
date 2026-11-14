import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Slider from './Slider';
import type { useMixer } from '../mixer/useMixer';
import { levelLabel } from '../mixer/osc';
const taps = ['IN', 'PreEQ', 'PostEQ', 'Pre', 'Post', 'SubGroup'];
type Props = { id: string; label: string; mixer: ReturnType<typeof useMixer> };
export default function SendsEditor({ id, label, mixer }: Props) {
  const [selected, setSelected] = useState(1);
  const count = id.startsWith('/ch/') ? 10 : id.startsWith('/rtn/') ? 6 : 0;
  const root = `${id}/mix/${String(selected).padStart(2, '0')}`;
  const tap = mixer.values[`${root}/tap`];
  const destination = (n: number) => n <= 6 ? `BUS ${n}` : `FX ${n - 6}`;
  function section(title: string, first: number, last: number, color: string) {
    return <View style={s.section}><Text style={s.heading}>{title}</Text><View style={s.faders}>{Array.from({ length: last - first + 1 }, (_, i) => {
      const n = first + i;
      const path = `${id}/mix/${String(n).padStart(2, '0')}`;
      const level = mixer.values[`${path}/level`];
      const known = typeof level === 'number';
      const sendTap = mixer.values[`${path}/tap`];
      return <View key={n} style={[s.strip, selected === n && { borderColor: color }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Select ${destination(n)} tap point`} accessibilityState={{ selected: selected === n }} onPress={() => setSelected(n)} style={s.select}>
          <Text style={[s.destination, { color }]}>{destination(n)}</Text><Text style={s.value}>{known ? `${levelLabel(level)} dB` : '—'}</Text>
        </Pressable>
        <View style={s.well}><View style={s.scale}>{['+10', '0', '−10', '−30', '−∞'].map(mark => <Text key={mark} style={s.small}>{mark}</Text>)}</View><Slider accessibilityLabel={`${label} ${destination(n)} send`} style={s.slider} value={known ? level : 0} disabled={!known} minimumValue={0} maximumValue={1} minimumTrackTintColor={color} maximumTrackTintColor="#26323d" thumbTintColor={color} onValueChange={v => mixer.write(`${path}/level`, v)} /></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`${destination(n)} tap point: ${typeof sendTap === 'number' ? taps[sendTap] ?? 'unknown' : 'unavailable'}`} accessibilityState={{ selected: selected === n }} onPress={() => setSelected(n)} style={[s.tap, selected === n && { backgroundColor: '#24384a' }]}><Text style={[s.tapText, { color }]}>{typeof sendTap === 'number' ? taps[sendTap] ?? '—' : '—'}</Text></Pressable>
      </View>;
    })}</View></View>;
  }
  if (!count) return <Text style={s.small}>No channel sends are available for this strip.</Text>;
  return <View style={s.layout}>
    <ScrollView horizontal style={s.scroll} contentContainerStyle={s.sections}>
      {section('BUS SENDS', 1, 6, '#6de0bc')}
      {count > 6 && section('EFFECT SENDS', 7, 10, '#c49bff')}
    </ScrollView>
    <View style={s.selector}><Text style={s.heading}>{destination(selected)} · TAP POINT</Text><View style={s.options}>{taps.map((name, index) => <Pressable key={name} accessibilityRole="button" accessibilityLabel={`${destination(selected)} tap ${name}`} accessibilityState={{ selected: tap === index, disabled: typeof tap !== 'number' }} disabled={typeof tap !== 'number'} onPress={() => mixer.write(`${root}/tap`, index, 'i')} style={[s.option, tap === index && s.active, typeof tap !== 'number' && { opacity: .35 }]}><Text style={[s.optionText, tap === index && { color: '#7caaff' }]}>{name}</Text></Pressable>)}</View><Text style={s.hint}>Select a send’s label or tap point to edit it.</Text></View>
  </View>;
}
const s = StyleSheet.create({
  layout: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, scroll: { flexBasis: 300, flexGrow: 1, flexShrink: 1 },
  sections: { gap: 18, paddingBottom: 10 }, section: { gap: 12 }, heading: { color: '#a9bac8', fontSize: 11, fontWeight: '700', letterSpacing: 1, textAlign: 'center' },
  faders: { flexDirection: 'row', gap: 6 }, strip: { width: 84, borderWidth: 1, borderColor: '#26323d', borderRadius: 7, backgroundColor: '#0c141c', overflow: 'hidden' },
  select: { paddingVertical: 12, alignItems: 'center', gap: 8 }, destination: { fontSize: 11, fontWeight: '700' }, value: { color: '#a9c8e8', fontSize: 12, fontVariant: ['tabular-nums'] },
  well: { height: 270, position: 'relative' }, slider: { width: 260, height: 40, position: 'absolute', left: -80, top: 115, transform: [{ rotate: '-90deg' }] },
  scale: { position: 'absolute', left: 5, top: 8, bottom: 8, justifyContent: 'space-between' }, small: { color: '#718592', fontSize: 9 },
  tap: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderColor: '#26323d' }, tapText: { fontSize: 11, fontWeight: '600' },
  selector: { flexBasis: 170, flexGrow: 1, maxWidth: 300, gap: 12, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#26323d', backgroundColor: '#0c141c' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, option: { minWidth: 120, flexGrow: 1, minHeight: 44, padding: 12, borderWidth: 1, borderColor: '#405363', borderRadius: 5, backgroundColor: '#1d2b36', alignItems: 'center', justifyContent: 'center' },
  active: { borderColor: '#7caaff', backgroundColor: '#203c56' }, optionText: { color: '#b1bfca', fontSize: 13, fontWeight: '600' }, hint: { color: '#718592', fontSize: 11, lineHeight: 17 },
});
