import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, TextInput, Modal, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Slider from './src/components/Slider';
import { StatusBar } from 'expo-status-bar';
import { useMixer } from './src/mixer/useMixer';
import { strips, master, type Strip } from './src/mixer/model';
import { levelLabel } from './src/mixer/osc';
const mixTabs = [
  { label: 'Main', send: null, master },
  ...Array.from({ length: 6 }, (_, i) => ({ label: `Bus${i + 1}`, send: i + 1, master: strips.find(strip => strip.id === `/bus/${i + 1}`)! })),
  ...Array.from({ length: 4 }, (_, i) => ({ label: `FX${i + 1}`, send: i + 7, master: strips.find(strip => strip.id === `/fxsend/${i + 1}`)! })),
];
type MixTab = (typeof mixTabs)[number];
const C = { bg: '#0b1015', panel: '#141c24', border: '#26323d', text: '#edf4f6', muted: '#8b9ba9', green: '#6de0bc', red: '#fa7878' };
type Mixer = ReturnType<typeof useMixer>;
function Button({ text, onPress, active = false, disabled = false }: { text: string; onPress: () => void; active?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button, active && s.active, disabled && { opacity: .35 }]}><Text style={[s.buttonText, active && { color: C.green }]}>{text}</Text></Pressable>;
}
function SignalOverview({ strip, mixer, onSelect }: { strip: Strip; mixer: Mixer; onSelect: () => void }) {
  const input = strip.group === 'Inputs';
  const isReturn = strip.group === 'Returns';
  const pan = mixer.values[`${strip.id}/mix/pan`];
  const panLabel = typeof pan !== 'number' ? '—' : Math.abs(pan - .5) < .005 ? 'C' : `${pan < .5 ? 'L' : 'R'} ${Math.round(Math.abs(pan - .5) * 200)}`;
  const status = (path: string) => { const value = mixer.values[`${strip.id}/${path}`]; return value === 1 ? 'ON' : value === 0 ? 'OFF' : '—'; };
  const gain = mixer.values[`${strip.id}/overview/gain`];
  const phantom = mixer.values[`${strip.id}/overview/phantom`];
  function sends(first: number, count: number) {
    return <View style={s.miniSends}>{Array.from({ length: count }, (_, index) => {
      const value = mixer.values[`${strip.id}/mix/${String(first + index).padStart(2, '0')}/level`];
      const known = typeof value === 'number';
      return <View key={index} accessibilityLabel={`${first === 1 ? 'Bus' : 'FX'} ${index + 1}: ${known ? `${levelLabel(value)} dB` : 'unavailable'}`} style={s.miniSendTrack}>{known && <View style={{ height: `${Math.max(3, value * 100)}%`, backgroundColor: value > 0 ? strip.color : '#3a4854', width: '100%', borderRadius: 2 }} />}</View>;
    })}</View>;
  }
  return <Pressable accessibilityRole="button" accessibilityLabel={`${strip.label} signal overview`} accessibilityHint="Open focused channel controls" onPress={onSelect} style={s.signalBox}>
    {!isReturn && <View style={s.signalRow}><Text style={s.signalLabel}>GAIN</Text><Text style={s.signalValue}>{input && typeof gain === 'number' ? `${gain.toFixed(1)}` : '—'}</Text><Text style={[s.phantom, phantom === 1 && { color: '#f0bc73', backgroundColor: '#493d27' }]}>{input ? `48V ${phantom === 1 ? 'ON' : phantom === 0 ? 'OFF' : '—'}` : '48V N/A'}</Text></View>}
    <View style={s.signalRow}><Text style={s.signalLabel}>SEND</Text>{sends(1, 6)}</View>
    {!isReturn && <View style={s.signalRow}><Text style={s.signalLabel}>FX</Text>{sends(7, 4)}</View>}
    {!isReturn && <View style={s.signalRow}>{[['GATE', 'gate/on'], ['DYN', 'dyn/on']].map(([label, path]) => <View key={path} style={s.processor}><View style={[s.stageDot, status(path) === 'ON' && { backgroundColor: strip.color }]} /><Text style={s.signalLabel}>{label}</Text><Text style={s.stageState}>{status(path)}</Text></View>)}</View>}
    <View style={s.signalRow}><Text style={s.signalLabel}>EQ</Text><View style={s.eqLine}><View style={[s.eqStroke, status('eq/on') === 'ON' && { backgroundColor: strip.color }]} /></View><Text style={s.stageState}>{status('eq/on')}</Text></View>
    <View style={[s.signalRow, s.signalLastRow]}><Text style={s.signalLabel}>PAN LR</Text><Text style={[s.signalValue, { color: strip.color }]}>{panLabel}</Text></View>
  </Pressable>;
}
function Fader({ strip, mixer, selected, onSelect, onInspect, mix }: { strip: Strip; mixer: Mixer; selected: boolean; onSelect: () => void; onInspect?: () => void; mix?: MixTab }) {
  const base = strip.id; const levelPath = mix?.send ? `${base}/mix/${String(mix.send).padStart(2, '0')}/level` : `${base}/mix/fader`;
  const levelName = mix?.send ? `${strip.label} to ${mix.label}` : `${strip.label} level`;
  const raw = mixer.values[levelPath]; const value = typeof raw === 'number' ? raw : undefined;
  const on = mixer.values[`${base}/mix/on`]; const pan = mixer.values[`${base}/mix/pan`];
  const name = mixer.values[`${base}/config/name`];
  return <View style={[s.strip, selected && { borderColor: strip.color }]}>
    <Pressable accessibilityRole="button" onPress={onSelect} style={[s.scribble, { borderTopColor: strip.color }]}><Text style={[s.eyebrow, { color: strip.color }]}>{strip.label}</Text><Text numberOfLines={1} style={s.channelName}>{name || 'Untitled'}</Text></Pressable>
    <SignalOverview strip={strip} mixer={mixer} onSelect={onInspect ?? onSelect} />
    <Text style={s.db}>{value === undefined ? '—' : levelLabel(value)} <Text style={s.unit}>dB</Text></Text>
    <View style={s.faderWell}>
      <View style={s.scale}>{['+10', '0', '−10', '−30', '−∞'].map(t => <Text key={t} style={s.scaleText}>{t} ─</Text>)}</View>
      <Slider accessibilityLabel={levelName} style={s.verticalSlider} minimumValue={0} maximumValue={1} value={value ?? 0} disabled={value === undefined} minimumTrackTintColor={strip.color} maximumTrackTintColor="#303f4b" thumbTintColor="#edf4f6" onValueChange={v => mixer.write(levelPath, v)} />
    </View>
    <Button text={on === 0 ? 'MUTED' : 'MUTE'} active={on === 0} disabled={on === undefined} onPress={() => mixer.write(`${base}/mix/on`, on === 0 ? 1 : 0, 'i')} />
    {!mix?.send && strip.group !== 'Buses' && <><View style={s.panLabel}><Text style={s.small}>L</Text><Text style={s.small}>PAN</Text><Text style={s.small}>R</Text></View><Slider accessibilityLabel={`${strip.label} pan`} value={typeof pan === 'number' ? pan : .5} disabled={pan === undefined} minimumValue={0} maximumValue={1} minimumTrackTintColor={strip.color} maximumTrackTintColor={C.border} thumbTintColor={strip.color} onValueChange={v => mixer.write(`${base}/mix/pan`, v)} /></>}
    <Pressable accessibilityRole="button" onPress={() => value !== undefined && mixer.write(levelPath, .75)} disabled={value === undefined}><Text style={s.reset}>SET 0 dB</Text></Pressable>
  </View>;
}
function ChannelDetails({ strip, mixer, onBack }: { strip: Strip; mixer: Mixer; onBack: () => void }) {
  const input = strip.group === 'Inputs';
  const isReturn = strip.group === 'Returns';
  const hasDynamics = input || strip.id === '/lr' || strip.id.startsWith('/bus/');
  const hasEq = hasDynamics || isReturn;
  const namePath = `${strip.id}/config/name`;
  const current = mixer.values[namePath];
  const [draft, setDraft] = useState(String(current || ''));
  const [tab, setTab] = useState<'Default' | 'Dynamics' | 'EQ'>('Default');
  const gainPath = `${strip.id}/overview/gain`;
  const phantomPath = `${strip.id}/overview/phantom`;
  const gain = mixer.values[gainPath];
  const phantom = mixer.values[phantomPath];
  const panPath = `${strip.id}/mix/pan`;
  const pan = mixer.values[panPath];
  const panLabel = typeof pan !== 'number' ? '—' : Math.abs(pan - .5) < .005 ? 'Center' : `${pan < .5 ? 'L' : 'R'} ${Math.round(Math.abs(pan - .5) * 200)}`;
  const sendCount = input ? 10 : isReturn ? 6 : 0;
  function toggle(label: string, path: string) {
    const value = mixer.values[`${strip.id}/${path}`];
    return <Button text={`${label} ${value === 1 ? 'ON' : value === 0 ? 'OFF' : '—'}`} active={value === 1} disabled={value === undefined} onPress={() => mixer.write(`${strip.id}/${path}`, value === 1 ? 0 : 1, 'i')} />;
  }
  return <View style={s.details}>
    <View style={s.detailsHeader}><Text style={[s.sectionTitle, { marginBottom: 0, flex: 1 }]}>{strip.label} / Channel controls</Text><Button text="← Back to mixer" onPress={onBack} /></View>
    <View style={s.detailTabs}>{(['Default', 'Dynamics', 'EQ'] as const).map(item => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: tab === item, disabled: item === 'Dynamics' && !hasDynamics || item === 'EQ' && !hasEq }} disabled={item === 'Dynamics' && !hasDynamics || item === 'EQ' && !hasEq} onPress={() => setTab(item)} style={[s.topTab, tab === item && s.topTabSelected, (item === 'Dynamics' && !hasDynamics || item === 'EQ' && !hasEq) && { opacity: .35 }]}><Text style={[s.topTabText, tab === item && s.topTabTextSelected]}>{item}</Text></Pressable>)}</View>
    {tab === 'Default' && <View accessibilityLabel="Default channel controls">
      <View style={s.row}><TextInput accessibilityLabel="Channel name" maxLength={12} placeholder="Channel name" placeholderTextColor={C.muted} value={draft} onChangeText={setDraft} style={[s.input, { flex: 1 }]} /><Button text="Save name" disabled={current === undefined} onPress={() => mixer.write(namePath, draft.trim(), 's')} /></View>
      <View style={[s.wrap, { marginVertical: 18 }]}>
        {input && <>
          <View style={s.controlCard}><View style={s.row}><Text style={s.body}>Gain</Text><Text style={s.small}>{typeof gain === 'number' ? `${gain.toFixed(1)} dB` : '—'}</Text></View><Slider accessibilityLabel={`${strip.label} input gain`} minimumValue={-12} maximumValue={60} step={0.5} value={typeof gain === 'number' ? gain : -12} disabled={mixer.status !== 'demo'} minimumTrackTintColor={C.green} maximumTrackTintColor={C.border} thumbTintColor={C.green} onValueChange={value => { if (mixer.status === 'demo') mixer.write(gainPath, Math.round(value * 2) / 2); }} /></View>
          <View style={s.controlCard}><Text style={[s.body, { marginBottom: 12 }]}>Phantom power</Text><Button text={`48V ${phantom === 1 ? 'ON' : phantom === 0 ? 'OFF' : '—'}`} active={phantom === 1} disabled={mixer.status !== 'demo'} onPress={() => { if (mixer.status === 'demo') mixer.write(phantomPath, phantom === 1 ? 0 : 1, 'i'); }} /></View>
        </>}
        {!strip.id.startsWith('/fxsend/') && <View style={s.controlCard}><View style={s.row}><Text style={s.body}>Pan / balance LR</Text><Text style={s.small}>{panLabel}</Text></View><Slider accessibilityLabel={`${strip.label} channel pan`} minimumValue={0} maximumValue={1} value={typeof pan === 'number' ? pan : .5} disabled={pan === undefined} minimumTrackTintColor={C.green} maximumTrackTintColor={C.border} thumbTintColor={C.green} onValueChange={value => mixer.write(panPath, value)} /></View>}
      </View>
      {input && mixer.status !== 'demo' && <Text style={s.description}>Gain and 48V controls are available in demo mode; live preamp readback is pending.</Text>}
      {sendCount > 0 && <><Text style={s.sectionTitle}>Sends</Text><View style={s.wrap}>{Array.from({ length: sendCount }, (_, i) => {
        const path = `${strip.id}/mix/${String(i + 1).padStart(2, '0')}/level`;
        const value = mixer.values[path];
        return <View key={path} style={s.send}><View style={s.row}><Text style={s.body}>{i < 6 ? `BUS ${i + 1}` : `FX ${i - 5}`}</Text><Text style={s.small}>{typeof value === 'number' ? `${levelLabel(value)} dB` : '—'}</Text></View><Slider accessibilityLabel={`${strip.label} ${i < 6 ? 'bus' : 'FX'} ${i < 6 ? i + 1 : i - 5} send`} value={typeof value === 'number' ? value : 0} disabled={value === undefined} minimumValue={0} maximumValue={1} minimumTrackTintColor={C.green} maximumTrackTintColor={C.border} thumbTintColor={C.green} onValueChange={v => mixer.write(path, v)} /></View>;
      })}</View></>}
    </View>}
    {tab === 'Dynamics' && <View accessibilityLabel="Dynamics channel controls"><Text style={s.sectionTitle}>Dynamics</Text><View style={s.wrap}>{input && <View style={s.controlCard}><Text style={s.controlTitle}>Gate</Text>{toggle('Gate', 'gate/on')}</View>}<View style={s.controlCard}><Text style={s.controlTitle}>Compressor</Text>{toggle('Compressor', 'dyn/on')}</View></View><Text style={s.description}>Enable or bypass the mixer’s existing dynamics settings.</Text></View>}
    {tab === 'EQ' && <View accessibilityLabel="EQ channel controls"><Text style={s.sectionTitle}>Equalizer</Text><View style={s.wrap}><View style={s.controlCard}><Text style={s.controlTitle}>EQ</Text>{toggle('EQ', 'eq/on')}</View>{input && <View style={s.controlCard}><Text style={s.controlTitle}>Low cut</Text>{toggle('Low cut', 'preamp/hpon')}</View>}</View><Text style={s.description}>Enable or bypass the mixer’s existing EQ settings.</Text></View>}
  </View>;
}
function MixerApp() {
  const mixer = useMixer(); const [host, setHost] = useState('192.168.1.1'); const [settings, setSettings] = useState(false);
  const [mix, setMix] = useState(mixTabs[0]);
  const [selected, setSelected] = useState(strips[0]);
  const [focused, setFocused] = useState(false);
  const inspect = (strip: Strip) => { setSelected(strip); setFocused(true); };
  const { width } = useWindowDimensions(); const ready = mixer.status === 'connected' || mixer.status === 'demo';
  const output = mix.master;
  const visibleStrips = mix.send
    ? [...strips.filter(strip => strip.group === 'Inputs'), ...strips.filter(strip => mix.send! <= 6 ? strip.group === 'Returns' : strip.id === `/rtn/${mix.send! - 6}`)]
    : strips.filter(strip => strip.group === 'Inputs' || strip.group === 'Returns');
  const compactBar = width < 1100;
  const logo = <View style={s.barLogo}><Text style={s.brand}>OSC<Text style={{ color: C.green }}>r</Text></Text><Text style={s.brandSub}>/ X AIR CONTROL</Text></View>;
  const connection = <Pressable accessibilityRole="button" accessibilityLabel="Connection status" accessibilityHint="Open connection and demo options" onPress={() => setSettings(true)} style={({ pressed }) => [s.connectionBadge, pressed && s.active]}>
    <View style={[s.dot, { backgroundColor: ready ? C.green : '#f0bc73' }]} />
    <View style={{ flexShrink: 1 }}><Text numberOfLines={1} style={s.connectionTitle}>{mixer.status === 'demo' ? 'DEMO SESSION' : mixer.status === 'connected' ? mixer.device : mixer.status === 'connecting' ? 'CONNECTING…' : 'CONNECT MIXER'}</Text>{!compactBar && <Text style={s.connectionSubtitle}>{mixer.status === 'demo' ? 'Local demo · connection options' : mixer.status === 'connected' ? `${host} : 10024` : 'Demo / local network'}</Text>}</View>
    <Text style={s.small}>⌄</Text>
  </Pressable>;
  const settingsControl = <Pressable accessibilityRole="button" accessibilityLabel="Settings" accessibilityHint="Open mixer connection settings" onPress={() => setSettings(true)} style={({ pressed }) => [s.settingsButton, pressed && s.active]}><Text style={s.gearIcon}>⚙</Text></Pressable>;
  const tabs = <ScrollView horizontal style={s.topTabs} contentContainerStyle={s.topTabsContent} showsHorizontalScrollIndicator={false}>
    {mixTabs.map(tab => <Pressable key={tab.label} accessibilityRole="tab" accessibilityState={{ selected: mix.label === tab.label }} onPress={() => { setMix(tab); setSelected(strips[0]); setFocused(false); }} style={[s.topTab, mix.label === tab.label && s.topTabSelected]}><Text style={[s.topTabText, mix.label === tab.label && s.topTabTextSelected]}>{tab.label}</Text></Pressable>)}
  </ScrollView>;
  return <SafeAreaView style={s.root}><StatusBar style="light" />
    <View style={s.topBar}>
      {compactBar ? <View style={[s.topBarInner, s.compactBar]}><View style={s.topMeta}>{logo}<View style={{ flex: 1 }} />{connection}{settingsControl}</View><View style={s.compactTabs}>{tabs}</View></View> : <View style={s.topBarInner}>{logo}{tabs}{connection}{settingsControl}</View>}
    </View>
    <ScrollView contentContainerStyle={s.page}>
    {!!mixer.error && <Text accessibilityRole="alert" style={s.error}>{mixer.error}</Text>}

    {focused ? <>
      <ScrollView horizontal contentContainerStyle={{ width: Math.max(500, Math.min(width - 44, 1556)) }}>
        <View style={s.focusLayout}>
          <View style={s.focusFader}><Fader strip={selected} mixer={mixer} selected onSelect={() => setFocused(false)} onInspect={() => setFocused(false)} mix={selected.id === output.id || (selected.group === 'Returns' && (mix.send ?? 0) > 6) ? undefined : mix} /></View>
          <View style={s.focusControls}><ChannelDetails key={`${selected.id}-${mixer.status}-${mixer.values[`${selected.id}/config/name`] ?? ''}`} strip={selected} mixer={mixer} onBack={() => setFocused(false)} /></View>
        </View>
      </ScrollView>
    </> : <>
    <View style={{ flexDirection: width > 600 ? 'row' : 'column', gap: 16 }}><ScrollView horizontal style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 12 }} showsHorizontalScrollIndicator><>{visibleStrips.map(strip => <Fader key={`${mix.label}-${strip.id}`} strip={strip} mix={strip.group === 'Returns' && (mix.send ?? 0) > 6 ? undefined : mix} mixer={mixer} selected={selected.id === strip.id} onSelect={() => setSelected(strip)} onInspect={() => inspect(strip)} />)}</></ScrollView><View style={width <= 600 ? s.mobileMaster : undefined}><Fader key={output.id} strip={output} mixer={mixer} selected={selected.id === output.id} onSelect={() => setSelected(output)} onInspect={() => inspect(output)} />{width <= 600 && <View style={{ flex: 1, padding: 16 }}><Text style={s.sectionTitle}>{mix.send ? `${mix.label} master output` : 'Main stereo output'}</Text><Text style={s.description}>{mix.send ? `The master fader controls the ${mix.label} output level.` : 'The master fader controls your main LR mix.'}</Text></View>}</View></View>
    </>}
    <Text style={s.footer}>OSCr  /  XR18 WORKSPACE     •     {mixer.status === 'demo' ? 'DEMO MODE' : 'OSC / UDP'}\nLevels are control values, not audio meters.</Text>
  </ScrollView>
  <Modal visible={settings} transparent animationType="fade" onRequestClose={() => setSettings(false)}><View style={s.modalBackdrop}><View style={s.modal}><Text style={s.eyebrow}>SETTINGS / LOCAL NETWORK</Text><Text style={s.title}>Connect your XR18</Text><Text style={s.description}>Join the mixer’s Wi-Fi or the router it’s connected to. Enter the mixer’s IP address below.</Text><Text style={s.body}>Mixer IP address</Text><TextInput accessibilityLabel="Mixer IP address" value={host} onChangeText={setHost} editable={mixer.status === 'offline' || mixer.status === 'demo'} keyboardType="decimal-pad" autoCapitalize="none" autoCorrect={false} style={s.input} /><Text style={s.small}>OSC port 10024 · iOS / Android development build required</Text>{!!mixer.error && <Text style={s.error}>{mixer.error}</Text>}<View style={s.wrap}><Button text={mixer.status === 'connected' || mixer.status === 'connecting' ? 'Disconnect' : 'Connect'} active onPress={() => { if (mixer.status === 'connected' || mixer.status === 'connecting') mixer.disconnect(); else void mixer.connect(host.trim()); }} /><Button text="Demo mode" onPress={() => { mixer.demo(); setSettings(false); }} /><Button text="Close" onPress={() => setSettings(false)} /></View><Text style={s.description}>Connecting reads the current mix. Controls send changes only when you adjust them. The app disconnects when sent to the background.</Text></View></View></Modal>
  </SafeAreaView>;
}
export default function App() { return <SafeAreaProvider><MixerApp /></SafeAreaProvider>; }
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg }, page: { padding: 22, paddingBottom: 40, maxWidth: 1600, width: '100%', alignSelf: 'center' },
  topBar: { backgroundColor: C.panel, borderBottomWidth: 1, borderBottomColor: C.border },
  topBarInner: { width: '100%', maxWidth: 1600, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 12, gap: 8 },
  compactBar: { flexDirection: 'column', gap: 0 },
  topMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', paddingTop: 8 },
  compactTabs: { flexDirection: 'row', width: '100%' },
  barLogo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 14, flexShrink: 0 },
  connectionBadge: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 44, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.border, borderRadius: 8, backgroundColor: '#1b2630', flexShrink: 1 },
  connectionTitle: { color: C.text, fontSize: 10, fontWeight: '700', letterSpacing: .5 },
  connectionSubtitle: { color: C.muted, fontSize: 10, marginTop: 3 },
  topTabs: { flex: 1 }, topTabsContent: { gap: 4, paddingVertical: 10 },
  topTab: { minHeight: 44, minWidth: 62, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  topTabSelected: { backgroundColor: '#203b34', borderColor: '#497d6b' },
  topTabText: { color: C.muted, fontSize: 13, fontWeight: '600' }, topTabTextSelected: { color: C.green },
  settingsButton: { width: 46, height: 44, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: C.border, marginLeft: 4 },
  gearIcon: { color: C.text, fontSize: 27, lineHeight: 32 },
  mixNotice: { color: C.muted, fontSize: 12, lineHeight: 19, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 26 }, brand: { color: C.text, fontSize: 26, fontWeight: '800', letterSpacing: -1 }, brandSub: { color: C.muted, fontSize: 8, letterSpacing: 1 }, subtitle: { color: C.muted, fontSize: 13, marginTop: 4 },
  button: { borderWidth: 1, borderColor: C.border, borderRadius: 8, backgroundColor: '#1b2630', paddingHorizontal: 13, paddingVertical: 12, alignItems: 'center' }, buttonText: { color: C.text, fontSize: 12, fontWeight: '700' }, active: { backgroundColor: '#203b34', borderColor: '#497d6b' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBar: { padding: 15, borderWidth: 1, borderColor: C.border, borderRadius: 10, gap: 8, flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', backgroundColor: C.panel }, dot: { width: 7, height: 7, borderRadius: 4 }, body: { color: C.text, fontSize: 13 }, small: { color: C.muted, fontSize: 11 }, eyebrow: { color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.8 }, title: { color: C.text, fontSize: 25, fontWeight: '600', marginTop: 6, marginBottom: 12 },
  welcome: { marginTop: 24, padding: 26, borderRadius: 14, borderWidth: 1, borderColor: '#2b4d45', backgroundColor: '#13241f' }, hero: { color: C.text, fontSize: 36, fontWeight: '600', letterSpacing: -1 }, description: { color: C.muted, fontSize: 13, lineHeight: 21, marginVertical: 14 },
  signalBox: { minHeight: 158, justifyContent: 'space-between', borderWidth: 1, borderColor: C.border, backgroundColor: '#0e151c', borderRadius: 7, paddingHorizontal: 6, marginBottom: 10 },
  signalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, minHeight: 26, borderBottomWidth: 1, borderBottomColor: '#202c35' },
  signalLastRow: { borderBottomWidth: 0 },
  signalLabel: { color: '#91a2b0', fontSize: 7, fontWeight: '700', letterSpacing: .5 },
  signalValue: { color: C.text, fontSize: 9, fontVariant: ['tabular-nums'] },
  phantom: { fontSize: 6, color: C.muted, padding: 3, borderRadius: 3, backgroundColor: '#1c2731' },
  miniSends: { flexDirection: 'row', gap: 3, flex: 1, height: 15, justifyContent: 'flex-end' },
  miniSendTrack: { width: 7, height: 15, backgroundColor: '#24313c', justifyContent: 'flex-end', borderRadius: 2 },
  processor: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  stageDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#46525d' },
  stageState: { fontSize: 6, color: C.muted },
  eqLine: { height: 12, flex: 1, justifyContent: 'center', marginHorizontal: 4 },
  eqStroke: { height: 1, backgroundColor: '#46525d' },
  strip: { width: 132, borderWidth: 1, borderColor: C.border, borderRadius: 10, backgroundColor: C.panel, padding: 10 }, scribble: { borderTopWidth: 3, paddingTop: 12, paddingBottom: 14 }, channelName: { color: C.text, fontSize: 14, fontWeight: '600', marginTop: 7 }, db: { color: C.text, textAlign: 'center', fontSize: 22, fontVariant: ['tabular-nums'], marginTop: 4 }, unit: { color: C.muted, fontSize: 10 },
  faderWell: { height: 260, width: 110, position: 'relative', marginVertical: 12 }, scale: { position: 'absolute', left: 2, top: 9, bottom: 9, justifyContent: 'space-between' }, scaleText: { color: '#7d8d9a', fontSize: 9 }, verticalSlider: { width: 248, height: 40, position: 'absolute', left: -60, top: 110, transform: [{ rotate: '-90deg' }] }, panLabel: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 }, reset: { color: C.muted, fontSize: 9, textAlign: 'center', paddingTop: 14, paddingBottom: 4, letterSpacing: 1 },
  detailTabs: { flexDirection: 'row', gap: 6, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 12, marginBottom: 18 },
  controlCard: { padding: 16, width: 260, maxWidth: '100%', borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
  controlTitle: { color: C.text, fontSize: 14, fontWeight: '600', marginBottom: 14 },
  detailsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  focusLayout: { flexDirection: 'row', alignItems: 'flex-start', gap: 18, width: '100%' },
  focusFader: { width: 132, flexShrink: 0 },
  focusControls: { flex: 1, minWidth: 320 },
  details: { padding: 20, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 12 }, sectionTitle: { color: C.text, fontSize: 17, fontWeight: '600', marginBottom: 14 }, input: { borderWidth: 1, borderColor: C.border, borderRadius: 8, backgroundColor: C.bg, color: C.text, padding: 14, minWidth: 120, marginVertical: 8 }, send: { width: 220, padding: 12, borderRadius: 8, backgroundColor: C.bg }, footer: { color: '#647684', fontSize: 10, lineHeight: 20, letterSpacing: 1, marginTop: 28 }, mobileMaster: { flexDirection: 'row', alignItems: 'center' },
  error: { color: C.red, fontSize: 13, lineHeight: 20, marginVertical: 12 }, modalBackdrop: { flex: 1, backgroundColor: '#000b', justifyContent: 'center', alignItems: 'center', padding: 20 }, modal: { width: '100%', maxWidth: 480, padding: 24, borderRadius: 16, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, gap: 8 },
});
