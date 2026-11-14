import React, { useLayoutEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import Slider from './Slider';
import { clamp01, filterTypes, frequencyFromWire, frequencyToWire, gainToWire, qToWire, readBands, responseDb, type EqBand } from '../mixer/eq';
import type { useMixer } from '../mixer/useMixer';
const colors = ['#69dfd0', '#7caaff', '#c49bff', '#f0bc73', '#f18fab', '#b4d775'];
const H = 280, L = 36, R = 18, T = 20, B = 32;
const dbY = (db: number) => T + (15 - Math.max(-15, Math.min(15, db))) / 30 * (H - T - B);
function BandHandle({ band, width, selected, editable, onSelect, onChange }: { band: EqBand; width: number; selected: boolean; editable: boolean; onSelect: () => void; onChange: (f: number, g: number) => void }) {
  const latest = useRef({ band, width, onSelect, onChange, editable });
  useLayoutEffect(() => { latest.current = { band, width, onSelect, onChange, editable }; }, [band, width, onSelect, onChange, editable]);
  const origin = useRef({ f: 0, g: 0 });
  // PanResponder stores these callbacks; ref reads happen only during gestures.
  // eslint-disable-next-line react-hooks/refs
  const [drag] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => latest.current.editable,
    onPanResponderGrant: () => { const b = latest.current.band; origin.current = { f: frequencyToWire(b.frequency), g: gainToWire(b.gain) }; latest.current.onSelect(); },
    onPanResponderMove: (_, gesture) => { const v = latest.current; if (v.editable) v.onChange(clamp01(origin.current.f + gesture.dx / (v.width - L - R)), clamp01(origin.current.g - gesture.dy / (H - T - B))); },
    onPanResponderTerminationRequest: () => false,
  }));
  return <View {...drag.panHandlers} accessibilityLabel={`EQ band ${band.index} point`} style={[s.handle, { left: L + frequencyToWire(band.frequency) * (width - L - R) - 18, top: dbY(band.type === 0 || band.type === 5 ? 0 : band.gain) - 18, borderColor: colors[band.index - 1], backgroundColor: selected ? '#25484e' : '#10282f', opacity: editable ? 1 : .4 }]}><Text style={{ color: colors[band.index - 1], fontSize: 12, fontWeight: '700' }}>{band.index}</Text></View>;
}
export default function EqEditor({ id, mixer }: { id: string; mixer: ReturnType<typeof useMixer> }) {
  const [width, setWidth] = useState(600), [selected, setSelected] = useState(1);
  const bands = readBands(id, mixer.values), band = bands[selected - 1] ?? bands[0];
  const enabled = mixer.values[`${id}/eq/on`], lowCut = mixer.values[`${id}/preamp/hpon`], mode = mixer.values[`${id}/eq/mode`];
  const isOutput = id === '/lr' || id.startsWith('/bus/');
  const parametric = !isOutput || mode === 0;
  const ready = bands.every(b => b.ready) && parametric;
  const editable = ready && (mixer.status === 'demo' || mixer.status === 'connected');
  const hzX = (hz: number) => L + frequencyToWire(hz) * (width - L - R);
  const curve = (parts: EqBand[]) => Array.from({ length: 241 }, (_, i) => { const f = frequencyFromWire(i / 240); return `${i ? 'L' : 'M'}${hzX(f).toFixed(2)},${dbY(parts.reduce((sum, b) => sum + responseDb(b, f), 0)).toFixed(2)}`; }).join(' ');
  const total = curve(bands), baseline = dbY(0);
  function write(field: 'f' | 'g' | 'q' | 'type', value: number) { if (editable) mixer.write(`${id}/eq/${band.index}/${field}`, value, field === 'type' ? 'i' : 'f'); }
  const fmtHz = (f: number) => f >= 1000 ? `${(f / 1000).toFixed(2)} kHz` : `${Math.round(f)} Hz`;
  return <View accessibilityLabel="EQ channel controls">
    <View style={s.heading}><View><Text style={s.title}>Parametric EQ</Text><Text style={s.hint}>Drag a band to set frequency and gain</Text></View><Pressable accessibilityRole="button" disabled={enabled === undefined} onPress={() => mixer.write(`${id}/eq/on`, enabled === 1 ? 0 : 1, 'i')} style={[s.toggle, enabled === 1 && { borderColor: '#69dfd0' }]}><Text style={{ color: enabled === 1 ? '#69dfd0' : '#99acb9' }}>{enabled === 1 ? 'EQ ON' : enabled === 0 ? 'BYPASS' : 'EQ —'}</Text></Pressable></View>
    <View onLayout={e => setWidth(Math.max(180, e.nativeEvent.layout.width))} style={s.graph}>
      <Svg pointerEvents="none" width="100%" height={H} viewBox={`0 0 ${width} ${H}`}>
        <Defs><LinearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#36cbd2" stopOpacity=".3" /><Stop offset="1" stopColor="#36cbd2" stopOpacity=".04" /></LinearGradient></Defs>
        {[20,30,40,50,60,80,100,200,300,400,500,600,800,1000,2000,3000,4000,5000,6000,8000,10000,20000].map(f => <Line key={f} x1={hzX(f)} x2={hzX(f)} y1={T} y2={H - B} stroke="#18404a" strokeWidth={.6} />)}
        {[-15,-10,-5,0,5,10,15].map(db => <React.Fragment key={db}><Line x1={L} x2={width - R} y1={dbY(db)} y2={dbY(db)} stroke={db === 0 ? '#3d7d86' : '#18404a'} strokeWidth={db === 0 ? 1.2 : .6} /><SvgText x={L - 9} y={dbY(db) + 3} textAnchor="end" fill="#67939c" fontSize="9">{db > 0 ? '+' : ''}{db}</SvgText></React.Fragment>)}
        {[20,100,1000,10000,20000].map(f => <SvgText key={f} x={hzX(f)} y={H - 10} textAnchor={f === 20000 ? 'end' : 'middle'} fill="#67939c" fontSize="10">{f >= 1000 ? `${f / 1000}k` : f}</SvgText>)}
        {ready && <><Path d={`${total} L${width - R},${baseline} L${L},${baseline} Z`} fill="url(#eqFill)" />{bands.map(b => <Path key={b.index} d={curve([b])} fill="none" stroke={colors[b.index - 1]} strokeWidth="1" opacity={enabled === 1 ? .45 : .18} />)}<Path d={enabled === 1 ? total : `M${L},${baseline} L${width - R},${baseline}`} stroke="#65e4e7" strokeWidth="2.5" fill="none" /></>}
      </Svg>
      {ready && bands.map(b => <BandHandle key={b.index} band={b} width={width} selected={selected === b.index} editable={editable} onSelect={() => setSelected(b.index)} onChange={(f,g) => { if (editable) { mixer.write(`${id}/eq/${b.index}/f`, f); if (b.type !== 0 && b.type !== 5) mixer.write(`${id}/eq/${b.index}/g`, g); } }} />)}
      {!ready && <View style={s.graphMessage}><Text style={s.hint}>{parametric || mode === undefined ? 'Connect your mixer or start demo mode to load EQ bands.' : 'Select PEQ mode on the mixer to edit its parametric bands.'}</Text></View>}
    </View>
    <View style={s.bandRow}>{bands.map(b => <Pressable key={b.index} accessibilityRole="button" accessibilityLabel={`Select EQ band ${b.index}`} onPress={() => setSelected(b.index)} style={[s.bandButton, selected === b.index && { borderColor: colors[b.index - 1], backgroundColor: '#1d3039' }]}><Text style={{ color: colors[b.index - 1], fontSize: 12 }}>Band {b.index}</Text><Text style={s.hint}>{b.ready ? fmtHz(b.frequency) : '—'}</Text></Pressable>)}</View>
    {band && <View style={s.controls}>
      {[{label:'Frequency',value:frequencyToWire(band.frequency),text:band.ready ? fmtHz(band.frequency) : '—',field:'f' as const}, {label:'Gain',value:gainToWire(band.gain),text:band.ready ? `${band.gain > 0 ? '+' : ''}${band.gain.toFixed(1)} dB` : '—',field:'g' as const}, {label:'Q / width',value:qToWire(band.q),text:band.ready ? band.q.toFixed(2) : '—',field:'q' as const}].map(control => <View key={control.field} style={s.control}><View style={s.heading}><Text style={s.label}>{control.label}</Text><Text style={s.value}>{control.text}</Text></View><Slider accessibilityLabel={`EQ band ${selected} ${control.label}`} value={control.value} minimumValue={0} maximumValue={1} disabled={!editable || control.field === 'g' && (band.type === 0 || band.type === 5)} minimumTrackTintColor={colors[selected - 1]} maximumTrackTintColor="#263f49" thumbTintColor={colors[selected - 1]} onValueChange={v => write(control.field,v)} /></View>)}
    </View>}
    <View style={s.typeRow}>{filterTypes.map((type,i) => <Pressable key={type} accessibilityRole="button" disabled={!editable} accessibilityLabel={`EQ filter ${type}`} onPress={() => write('type',i)} style={[s.typeButton, band?.type === i && { borderColor: '#65e4e7' }, !editable && {opacity:.4}]}><Text style={s.label}>{type}</Text></Pressable>)}</View>
    {id.startsWith('/ch/') && <Pressable accessibilityRole="button" disabled={lowCut === undefined} onPress={() => mixer.write(`${id}/preamp/hpon`, lowCut === 1 ? 0 : 1, 'i')} style={[s.typeButton, { alignSelf: 'flex-start', marginTop: 12 }, lowCut === 1 && { borderColor: '#65e4e7' }]}><Text style={s.label}>Low cut {lowCut === 1 ? 'ON' : lowCut === 0 ? 'OFF' : '—'}</Text></Pressable>}
    <Text style={s.footnote}>Modeled EQ response · Vintage approximated as bell · separate low-cut stage not plotted</Text>
  </View>;
}
const s = StyleSheet.create({
  heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},title:{color:'#edf4f6',fontSize:18,fontWeight:'600'},hint:{color:'#829aa8',fontSize:11,marginTop:5},toggle:{padding:12,borderWidth:1,borderColor:'#304650',borderRadius:7},
  graph:{height:H,backgroundColor:'#071c23',borderWidth:1,borderColor:'#24505a',borderRadius:9,marginTop:18,overflow:'hidden'},graphMessage:{position:'absolute',top:100,left:44,right:30,alignItems:'center',backgroundColor:'#071c23e8',padding:18,borderRadius:8},handle:{position:'absolute',width:36,height:36,borderRadius:18,borderWidth:2,alignItems:'center',justifyContent:'center'},
  bandRow:{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:16},bandButton:{flex:1,minWidth:76,padding:12,borderWidth:1,borderColor:'#293f49',borderRadius:7,backgroundColor:'#101b24'},controls:{flexDirection:'row',flexWrap:'wrap',gap:12},control:{flex:1,minWidth:200,backgroundColor:'#0d171f',padding:14,borderRadius:8},label:{color:'#a7bbc7',fontSize:12},value:{color:'#edf4f6',fontSize:12,fontVariant:['tabular-nums']},typeRow:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:14},typeButton:{padding:11,borderWidth:1,borderColor:'#293f49',borderRadius:6},footnote:{color:'#657f8b',fontSize:10,marginTop:14},
});
