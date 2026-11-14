import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import Slider from './Slider';
import { gainFromWire, headampRoot, hpfFromWire, linkPath } from '../mixer/input';
import type { useMixer } from '../mixer/useMixer';
type Props = { id: string; mixer: ReturnType<typeof useMixer> };
const accent = '#7caaff';
export default function InputEditor({ id, mixer }: Props) {
  const read = (path: string) => { const v = mixer.values[path]; return typeof v === 'number' ? v : undefined; };
  const input = id.startsWith('/ch/');
  const returns = id.startsWith('/rtn/');
  const name = mixer.values[`${id}/config/name`];
  const [draft, setDraft] = useState(String(name ?? ''));
  const source = read(`${id}/config/insrc`);
  const ha = headampRoot(source);
  const link = linkPath(id);
  const usb = read(`${id}/preamp/rtnsw`);
  const hp = read(`${id}/preamp/hpon`);
  const frequency = read(`${id}/preamp/hpf`);
  function button(text: string, path: string | undefined, activeValue = 1, red = false) {
    const value = path ? read(path) : undefined;
    const active = value === activeValue;
    return <Pressable accessibilityRole="button" accessibilityLabel={text} accessibilityState={{ selected: active, disabled: value === undefined }} disabled={value === undefined} onPress={() => path && mixer.write(path, active ? 0 : activeValue, 'i')} style={[s.button, active && { borderColor: red ? '#fa7878' : accent, backgroundColor: red ? '#482427' : '#203c56' }, value === undefined && { opacity: .35 }]}><Text style={[s.buttonText, active && { color: red ? '#fa7878' : accent }]}>{text}{value === undefined ? ' —' : ''}</Text></Pressable>;
  }
  function knob(title: string, path: string | undefined, format: (v: number) => string, emphasized = true, steps = 144) {
    const value = path ? read(path) : undefined;
    const angle = (-135 + (value ?? 0) * 270) * Math.PI / 180;
    return <View style={[s.knob, !emphasized && { opacity: .55 }]}><Text style={s.value}>{value === undefined ? '—' : format(value)}</Text><Svg width={100} height={100} viewBox="0 0 100 100"><Circle cx={50} cy={50} r={40} fill="#172632" stroke="#354b5c" strokeWidth={3} /><Circle cx={50} cy={50} r={29} fill="#203747" /><Line x1={50 + Math.sin(angle) * 22} y1={50 - Math.cos(angle) * 22} x2={50 + Math.sin(angle) * 36} y2={50 - Math.cos(angle) * 36} stroke={value === undefined ? '#526575' : accent} strokeWidth={4} strokeLinecap="round" /></Svg><Text style={s.title}>{title}</Text><Slider accessibilityLabel={title} style={s.slider} value={value ?? 0} disabled={value === undefined} minimumValue={0} maximumValue={1} step={1 / steps} minimumTrackTintColor={accent} maximumTrackTintColor="#26323d" thumbTintColor={accent} onValueChange={v => path && mixer.write(path, v)} /></View>;
  }
  const curve = Array.from({ length: 61 }, (_, i) => {
    const f = 20 * Math.pow(1000, i / 60);
    const cutoff = hpfFromWire(frequency ?? 0);
    const db = hp === 1 ? -10 * Math.log10(1 + Math.pow(cutoff / f, 4)) : 0;
    return `${i ? 'L' : 'M'}${i * 4},${8 + Math.min(48, -db * 1.5)}`;
  }).join(' ');
  return <View style={s.layout}>
    <View style={[s.panel, s.channel]}><Text style={s.heading}>CHANNEL</Text><TextInput accessibilityLabel="Channel name" maxLength={12} value={draft} onChangeText={setDraft} placeholder="Channel name" placeholderTextColor="#718592" style={s.input} /><Pressable accessibilityRole="button" disabled={name === undefined} onPress={() => mixer.write(`${id}/config/name`, draft.trim(), 's')} style={s.button}><Text style={s.buttonText}>Save</Text></Pressable>{input && <><Text style={s.hint}>{link?.split('/').pop()} stereo pair</Text>{button('LINK', link)}{button('Ø · Polarity invert', `${id}/preamp/invert`)}</>}</View>
    {(input || returns) && <View style={[s.panel, s.preamp]}><Text style={s.heading}>SOURCE / PREAMP</Text><View style={s.row}>{button(input ? 'MIC / LINE' : 'ANALOG', `${id}/preamp/rtnsw`, 0)}{button('USB', `${id}/preamp/rtnsw`)}</View>{input && <><Text style={s.hint}>Analog {typeof source === 'number' ? source < 16 ? `input ${source + 1}` : source === 18 ? 'off' : source === 16 ? 'Aux L' : 'Aux R' : '—'} · USB {typeof mixer.values[`${id}/config/rtnsrc`] === 'number' ? Number(mixer.values[`${id}/config/rtnsrc`]) + 1 : '—'}</Text>{button('48V', ha ? `${ha}/phantom` : undefined, 1, true)}</>}<View style={s.row}>{input && knob('MIC GAIN', ha ? `${ha}/gain` : undefined, v => `${gainFromWire(v).toFixed(1)} dB`, usb !== 1)}{knob('USB TRIM', `${id}/preamp/rtntrim`, v => `${(-18 + v * 36).toFixed(1)} dB`, usb === 1)}</View></View>}
    {input && <View style={[s.panel, s.hpf]}><Text style={s.heading}>HIGH-PASS FILTER</Text>{button('HPF ON', `${id}/preamp/hpon`)}<View style={s.curve}><Svg width="100%" height={60} viewBox="0 0 240 60" preserveAspectRatio="none"><Line x1={0} x2={240} y1={8} y2={8} stroke="#263b4a" />{frequency !== undefined && hp !== undefined && <Path d={curve} fill="none" stroke={hp === 1 ? accent : '#526575'} strokeWidth={2} />}</Svg></View>{knob('HPF FREQUENCY', `${id}/preamp/hpf`, v => `${Math.round(hpfFromWire(v))} Hz`, hp === 1, 100)}</View>}
  </View>;
}
const s = StyleSheet.create({ layout: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, panel: { padding: 18, borderWidth: 1, borderColor: '#263b4a', borderRadius: 10, backgroundColor: '#0c141c', gap: 16 }, channel: { flexBasis: 190, flexGrow: 1 }, preamp: { flexBasis: 330, flexGrow: 2 }, hpf: { flexBasis: 240, flexGrow: 1, alignItems: 'center' }, heading: { color: '#a9bac8', fontSize: 11, fontWeight: '700', letterSpacing: 1, textAlign: 'center' }, title: { color: '#a9bac8', fontSize: 11, fontWeight: '700' }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }, button: { minHeight: 44, padding: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#405363', borderRadius: 5, backgroundColor: '#1d2b36' }, buttonText: { color: '#b1bfca', fontSize: 13, fontWeight: '600' }, input: { color: '#edf4f6', backgroundColor: '#172632', borderWidth: 1, borderColor: '#354b5c', borderRadius: 5, padding: 12 }, knob: { alignItems: 'center', gap: 6, flexGrow: 1, minWidth: 130 }, value: { color: accent, fontSize: 14, fontWeight: '700' }, slider: { width: 130, height: 40 }, hint: { color: '#718592', fontSize: 11, textAlign: 'center' }, curve: { width: '100%', maxWidth: 260, backgroundColor: '#101b25', borderRadius: 5 } });
