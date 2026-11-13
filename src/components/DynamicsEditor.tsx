import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import Slider from './Slider';
import { compressorModes, dynamicsValue, gateModes, ratios, transferDb, type DynamicsKind } from '../mixer/dynamics';
import type { useMixer } from '../mixer/useMixer';
const accent = '#74e0df';
function Knob({ label, text, value, disabled, onChange }: { label: string; text: string; value: number; disabled: boolean; onChange: (v: number) => void }) {
  const a = (-135 + value * 270) * Math.PI / 180;
  return <View style={[s.knob, disabled && { opacity: .4 }]}>
    <Text style={s.small}>{label.toUpperCase()}</Text>
    <Svg width={76} height={76} viewBox="0 0 76 76" pointerEvents="none"><Circle cx={38} cy={38} r={29} stroke="#284752" strokeWidth={5} fill="#112a32" /><Circle cx={38} cy={38} r={23} stroke={accent} strokeWidth={1} fill="#153640" /><Line x1={38 + 8 * Math.sin(a)} y1={38 - 8 * Math.cos(a)} x2={38 + 22 * Math.sin(a)} y2={38 - 22 * Math.cos(a)} stroke={accent} strokeWidth={3} strokeLinecap="round" /></Svg>
    <Text style={s.value}>{text}</Text><Slider accessibilityLabel={label} value={value} disabled={disabled} minimumValue={0} maximumValue={1} minimumTrackTintColor={accent} maximumTrackTintColor="#284752" thumbTintColor={accent} onValueChange={onChange} />
  </View>;
}
function ProcessorPanel({ id, mixer, kind }: { id: string; mixer: ReturnType<typeof useMixer>; kind: DynamicsKind }) {
  const root = `${id}/${kind}`;
  const number = (field: string) => { const v = mixer.values[`${root}/${field}`]; return typeof v === 'number' && Number.isFinite(v) ? v : undefined; };
  const mode = number('mode'), on = number('on'), threshold = number('thr'), ratio = number('ratio');
  const modeValid = mode !== undefined && Number.isInteger(mode) && mode >= 0 && mode < (kind === 'gate' ? 5 : 2);
  const ratioValid = ratio !== undefined && Number.isInteger(ratio) && ratio >= 0 && ratio < ratios.length;
  const modeName = kind === 'gate' ? 'Gate' : 'Compressor';
  const modes = kind === 'gate' ? gateModes : compressorModes;
  const active = mixer.status === 'demo' || mixer.status === 'connected';
  const ready = modeValid && threshold !== undefined && (kind === 'gate' ? number('range') !== undefined : ratioValid && number('mgain') !== undefined);
  const thr = dynamicsValue(kind, 'thr', threshold ?? .5);
  const range = dynamicsValue(kind, 'range', number('range') ?? .5);
  const makeup = dynamicsValue(kind, 'mgain', number('mgain') ?? 0);
  const path = Array.from({ length: 241 }, (_, i) => {
    const x = -80 + i / 240 * 80;
    const y = on === 1 ? transferDb(x, { kind, threshold: thr, mode: mode ?? 0, range, ratio: ratios[ratio ?? 0] ?? 1, makeup }) : x;
    return `${i ? 'L' : 'M'}${(42 + (x + 80) / 80 * 270).toFixed(2)},${(226 - Math.max(0, Math.min(80, y + 80)) / 80 * 200).toFixed(2)}`;
  }).join(' ');
  function write(field: string, value: number, integer = false) { if (active && number(field) !== undefined) mixer.write(`${root}/${field}`, value, integer ? 'i' : 'f'); }
  const format = (field: string) => { const v = number(field); if (v === undefined) return '—'; const real = dynamicsValue(kind,field,v); return field === 'thr' || field === 'range' || field === 'mgain' ? `${real.toFixed(1)} dB` : real >= 1000 ? `${(real / 1000).toFixed(2)} s` : `${real.toFixed(real < 1 ? 2 : 1)} ms`; };
  const attack = number('attack'), hold = number('hold'), release = number('release');
  const timingReady = attack !== undefined && hold !== undefined && release !== undefined;
  // Schematic spacing keeps all three timing phases legible, not a time-axis scale.
  const ax = 25 + (attack ?? 0) * 80, hx = ax + 35 + (hold ?? 0) * 65, rx = Math.min(360, hx + 35 + (release ?? 0) * 110);
  return <View accessibilityLabel={`${modeName} controls`}>
    <View style={s.header}><Text style={s.processorTitle}>{modeName}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${modeName} power`} disabled={!active || on === undefined} onPress={() => write('on',on === 1 ? 0 : 1,true)} style={[s.button, on === 1 && s.selected]}><Text style={{color:on === 1 ? accent : '#91a8b5'}}>{modeName.toUpperCase()} {on === 1 ? 'ON' : on === 0 ? 'BYPASS' : '—'}</Text></Pressable></View>
    <View style={s.modes}>{modes.map((label,index) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={`${modeName} mode ${label}`} disabled={!active || !modeValid} onPress={() => write('mode',index,true)} style={[s.mode,mode === index && s.selected]}><Text style={[s.small,mode === index && {color:accent}]}>{label}</Text></Pressable>)}</View>
    <View style={s.panels}>
      <View style={s.transfer}>
        <Text style={s.title}>Transfer curve</Text>
        <View style={s.curveRow}><View style={s.threshold}><Text style={s.small}>THRESHOLD</Text><Text style={s.value}>{format('thr')}</Text><View style={{height:220,width:46,alignSelf:'center'}}><Slider accessibilityLabel={`${modeName} threshold`} style={{width:208,height:40,position:'absolute',left:-81,top:88,transform:[{rotate:'-90deg'}]}} minimumValue={0} maximumValue={1} value={threshold ?? 0} disabled={!active || threshold === undefined} minimumTrackTintColor={accent} maximumTrackTintColor="#284752" thumbTintColor={accent} onValueChange={v=>write('thr',v)} /></View></View>
          <View style={{flex:1,minWidth:150}}><Svg width="100%" height={260} viewBox="0 0 335 260" pointerEvents="none">
            {[-80,-60,-40,-20,0].map(db=><React.Fragment key={db}><Line x1={42+(db+80)/80*270} x2={42+(db+80)/80*270} y1={26} y2={226} stroke="#20414b" /><Line x1={42} x2={312} y1={226-(db+80)/80*200} y2={226-(db+80)/80*200} stroke="#20414b" /><SvgText x={42+(db+80)/80*270} y={244} textAnchor="middle" fill="#73939e" fontSize={9}>{db}</SvgText><SvgText x={32} y={229-(db+80)/80*200} textAnchor="end" fill="#73939e" fontSize={9}>{db}</SvgText></React.Fragment>)}
            <Line x1={42} y1={226} x2={312} y2={26} stroke="#355761" strokeDasharray="4 4" />
            {ready && <><Path d={`${path} L312,226 L42,226 Z`} fill="#36b5c1" fillOpacity={on === 1 ? .2 : .05} /><Line x1={42+(thr+80)/80*270} x2={42+(thr+80)/80*270} y1={26} y2={226} stroke="#91d9df" strokeDasharray="3 4" opacity={.5} /><Path d={path} fill="none" stroke={accent} strokeWidth={2.5} /></>}
            <SvgText x={177} y={259} textAnchor="middle" fill="#73939e" fontSize={8}>INPUT dB</SvgText>
          </Svg>{!ready && <Text style={s.loading}>Connect the mixer or use demo mode to load dynamics.</Text>}</View>
        </View>
        <View style={s.extra}><Text style={s.small}>{kind === 'gate' ? 'ATTENUATION RANGE' : 'RATIO'}</Text><Text style={s.value}>{kind === 'gate' ? format('range') : ratioValid ? `${ratios[ratio!]}:1` : '—'}</Text><Slider accessibilityLabel={kind === 'gate' ? 'Gate range' : 'Compressor ratio'} value={kind === 'gate' ? number('range') ?? 0 : ratio ?? 0} minimumValue={0} maximumValue={kind === 'gate' ? 1 : ratios.length - 1} step={kind === 'gate' ? .001 : 1} disabled={!active || (kind === 'gate' ? number('range') === undefined : !ratioValid)} minimumTrackTintColor={accent} maximumTrackTintColor="#284752" thumbTintColor={accent} onValueChange={v=>write(kind === 'gate' ? 'range' : 'ratio',v,kind === 'dyn')} /></View>
      </View>
      <View style={s.timing}><Text style={s.title}>Envelope</Text><View style={s.envelope}><Svg width="100%" height={130} viewBox="0 0 380 130" pointerEvents="none"><Line x1={15} y1={105} x2={365} y2={105} stroke="#284752" />{timingReady && <><Path d={`M15,105 L${ax},25 L${hx},25 L${rx},105 Z`} fill="#39bdcb" fillOpacity={.23} /><Path d={`M15,105 L${ax},25 L${hx},25 L${rx},105`} fill="none" stroke={accent} strokeWidth={2} /><Line x1={ax} x2={ax} y1={20} y2={110} stroke="#467884" strokeDasharray="3 3" /><Line x1={hx} x2={hx} y1={20} y2={110} stroke="#467884" strokeDasharray="3 3" /></>}<SvgText x={50} y={123} fill="#73939e" fontSize={9}>ATTACK</SvgText><SvgText x={170} y={123} fill="#73939e" fontSize={9}>HOLD</SvgText><SvgText x={290} y={123} fill="#73939e" fontSize={9}>RELEASE</SvgText></Svg></View>
        <View style={s.knobs}>{['attack','hold','release'].map(field=><Knob key={field} label={`${modeName} ${field}`} text={format(field)} value={number(field) ?? 0} disabled={!active || number(field) === undefined} onChange={v=>write(field,v)} />)}</View>
        {kind === 'dyn' && <View style={s.extra}><View style={s.header}><Text style={s.small}>MAKEUP GAIN</Text><Text style={s.value}>{format('mgain')}</Text></View><Slider accessibilityLabel="Compressor makeup gain" minimumValue={0} maximumValue={1} value={number('mgain') ?? 0} disabled={!active || number('mgain') === undefined} minimumTrackTintColor={accent} maximumTrackTintColor="#284752" thumbTintColor={accent} onValueChange={v=>write('mgain',v)} /></View>}
      </View>
    </View><Text style={s.note}>Modeled hard-knee transfer · schematic timing envelope · no live metering</Text>
  </View>;
}
export default function DynamicsEditor({ id, mixer }: { id: string; mixer: ReturnType<typeof useMixer> }) {
  const [width, setWidth] = useState(0);
  const hasGate = id.startsWith('/ch/');
  return <View accessibilityLabel="Dynamics channel controls" onLayout={e => setWidth(e.nativeEvent.layout.width)}>
    <View style={s.combined}>
      {hasGate && <View style={[s.processorPanel, { width: width >= 1200 ? '49%' : '100%' }]}><ProcessorPanel id={id} mixer={mixer} kind="gate" /></View>}
      <View style={[s.processorPanel, { width: hasGate && width >= 1200 ? '49%' : '100%' }]}><ProcessorPanel id={id} mixer={mixer} kind="dyn" /></View>
    </View>
  </View>;
}
const s=StyleSheet.create({
  combined:{flexDirection:'row',flexWrap:'wrap',gap:20},processorPanel:{borderWidth:1,borderColor:'#294550',borderRadius:10,padding:14,backgroundColor:'#101c24'},processorTitle:{color:'#d9edf2',fontSize:17,fontWeight:'600'},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'},switches:{flexDirection:'row',gap:8},button:{padding:12,borderWidth:1,borderColor:'#2c4652',borderRadius:7,backgroundColor:'#14252f'},selected:{borderColor:accent,backgroundColor:'#1a3942'},label:{color:'#d9edf2',fontSize:13,fontWeight:'600'},modes:{flexDirection:'row',gap:6,marginVertical:16,flexWrap:'wrap'},mode:{paddingVertical:10,paddingHorizontal:14,borderWidth:1,borderColor:'#29434e',borderRadius:5},small:{color:'#8ea9b7',fontSize:10,letterSpacing:.6},value:{color:'#dceff2',fontSize:12,fontVariant:['tabular-nums']},title:{color:'#cce8ed',fontSize:14,fontWeight:'600',marginBottom:14},panels:{flexDirection:'row',gap:16,flexWrap:'wrap'},transfer:{flex:1,minWidth:240,backgroundColor:'#091e26',borderWidth:1,borderColor:'#25515e',borderRadius:9,padding:16},curveRow:{flexDirection:'row',gap:8},threshold:{width:68,alignItems:'center',gap:10,paddingTop:6},timing:{flex:1,minWidth:240,backgroundColor:'#091e26',borderWidth:1,borderColor:'#25515e',borderRadius:9,padding:16},envelope:{backgroundColor:'#0c2630',borderRadius:6},knobs:{flexDirection:'row',gap:6,marginTop:18},knob:{flex:1,minWidth:65,alignItems:'center'},extra:{marginTop:16,padding:12,borderRadius:6,backgroundColor:'#0d2832'},loading:{color:'#8ea9b7',fontSize:11,lineHeight:18,paddingHorizontal:20},note:{color:'#617e8b',fontSize:10,marginTop:14},
});
