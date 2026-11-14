import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, TextInput, Modal, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Slider from './src/components/Slider';
import InputEditor from './src/components/InputEditor';
import { gainFromWire, headampRoot } from './src/mixer/input';
import SendsEditor from './src/components/SendsEditor';
import OutputEditor from './src/components/OutputEditor';
import EqEditor from './src/components/EqEditor';
import MiniPan from './src/components/MiniPan';
import MiniEqCurve from './src/components/MiniEqCurve';
import DynamicsEditor from './src/components/DynamicsEditor';
import { StatusBar } from 'expo-status-bar';
import { useMixer } from './src/mixer/useMixer';
import { strips, master, type Strip } from './src/mixer/model';
import { levelLabel } from './src/mixer/osc';
import { soloPath } from './src/mixer/solo';
const mixTabs = [
  { label: 'Main', send: null, master },
  ...Array.from({ length: 6 }, (_, i) => ({ label: `Bus${i + 1}`, send: i + 1, master: strips.find(strip => strip.id === `/bus/${i + 1}`)! })),
  ...Array.from({ length: 4 }, (_, i) => ({ label: `FX${i + 1}`, send: i + 7, master: strips.find(strip => strip.id === `/fxsend/${i + 1}`)! })),
];
type MixTab = (typeof mixTabs)[number];
const C = { bg: '#0b1015', panel: '#141c24', border: '#26323d', text: '#edf4f6', muted: '#8b9ba9', green: '#6de0bc', red: '#fa7878' };
type Mixer = ReturnType<typeof useMixer>;
function Button({ text, onPress, active = false, disabled = false, tone }: { text: string; onPress: () => void; active?: boolean; disabled?: boolean; tone?: 'red' }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button, active && s.active, active && tone === 'red' && { backgroundColor: '#482427', borderColor: C.red }, disabled && { opacity: .35 }]}><Text style={[s.buttonText, active && { color: tone === 'red' ? C.red : C.green }]}>{text}</Text></Pressable>;
}
function SignalOverview({ strip, mixer, onSelect }: { strip: Strip; mixer: Mixer; onSelect: () => void }) {
  const input = strip.group === 'Inputs';
  const isReturn = strip.group === 'Returns';
  const pan = mixer.values[`${strip.id}/mix/pan`];
  const status = (path: string) => { const value = mixer.values[`${strip.id}/${path}`]; return value === 1 ? 'ON' : value === 0 ? 'OFF' : '—'; };
  const ha = headampRoot(mixer.values[`${strip.id}/config/insrc`]);
  const rawGain = ha ? mixer.values[`${ha}/gain`] : undefined;
  const gain = typeof rawGain === 'number' ? gainFromWire(rawGain) : undefined;
  const phantom = ha ? mixer.values[`${ha}/phantom`] : undefined;
  function sends(first: number, count: number) {
    return <View style={s.miniSends}>{Array.from({ length: count }, (_, index) => {
      const value = mixer.values[`${strip.id}/mix/${String(first + index).padStart(2, '0')}/level`];
      const known = typeof value === 'number';
      return <View key={index} accessibilityLabel={`${first === 1 ? 'Bus' : 'FX'} ${index + 1}: ${known ? `${levelLabel(value)} dB` : 'unavailable'}`} style={s.miniSendTrack}>{known && <View style={{ height: `${Math.max(3, value * 100)}%`, backgroundColor: value > 0 ? strip.color : '#3a4854', width: '100%', borderRadius: 2 }} />}</View>;
    })}</View>;
  }
  return <Pressable accessibilityRole="button" accessibilityLabel={`${strip.label} signal overview`} accessibilityHint="Open focused channel controls" onPress={onSelect} style={s.signalBox}>
    {!isReturn && <View style={s.signalRow}><Text style={s.signalLabel}>GAIN</Text><Text style={s.signalValue}>{input && typeof gain === 'number' ? `${gain.toFixed(1)}` : '—'}</Text><Text style={[s.phantom, phantom === 1 && { color: C.red, backgroundColor: '#482427' }]}>{input ? `48V ${phantom === 1 ? 'ON' : phantom === 0 ? 'OFF' : '—'}` : '48V N/A'}</Text></View>}
    <View style={s.signalRow}><Text style={s.signalLabel}>SEND</Text>{sends(1, 6)}</View>
    {!isReturn && <View style={s.signalRow}><Text style={s.signalLabel}>FX</Text>{sends(7, 4)}</View>}
    {!isReturn && <View style={s.signalRow}>{[['GATE', 'gate/on'], ['DYN', 'dyn/on']].map(([label, path]) => <View key={path} style={s.processor}><View style={[s.stageDot, status(path) === 'ON' && { backgroundColor: strip.color }]} /><Text style={s.signalLabel}>{label}</Text><Text style={s.stageState}>{status(path)}</Text></View>)}</View>}
    <View style={s.signalRow}><Text style={s.signalLabel}>EQ</Text><MiniEqCurve id={strip.id} label={strip.label} color={strip.color} values={mixer.values} /><Text style={s.stageState}>{status('eq/on')}</Text></View>
    <View style={[s.signalRow, s.signalLastRow]}><Text style={s.signalLabel}>PAN</Text><MiniPan value={pan} color={strip.color} supported={!strip.id.startsWith('/fxsend/')} /></View>
  </Pressable>;
}
function Fader({ strip, mixer, selected, onSelect, onInspect, mix }: { strip: Strip; mixer: Mixer; selected: boolean; onSelect: () => void; onInspect?: () => void; mix?: MixTab }) {
  const base = strip.id; const levelPath = mix?.send ? `${base}/mix/${String(mix.send).padStart(2, '0')}/level` : `${base}/mix/fader`;
  const levelName = mix?.send ? `${strip.label} to ${mix.label}` : `${strip.label} level`;
  const raw = mixer.values[levelPath]; const value = typeof raw === 'number' ? raw : undefined;
  const on = mixer.values[`${base}/mix/on`];
  const soloAddress = soloPath(base);
  const solo = soloAddress ? mixer.values[soloAddress] : undefined;
  const name = mixer.values[`${base}/config/name`];
  return <View style={[s.strip, selected && { borderColor: strip.color }]}>
    <Pressable accessibilityRole="button" onPress={onSelect} style={[s.scribble, { borderTopColor: strip.color }]}><Text style={[s.eyebrow, { color: strip.color }]}>{strip.label}</Text><Text numberOfLines={1} style={s.channelName}>{name || 'Untitled'}</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`${strip.label} solo`} accessibilityState={{ selected: solo === 1 }} disabled={!soloAddress || (solo !== 0 && solo !== 1)} onPress={() => { if (soloAddress) mixer.write(soloAddress, solo === 1 ? 0 : 1, 'i'); }} style={[s.soloButton, solo === 1 && s.soloActive, solo === undefined && { opacity: .35 }]}><Text style={[s.soloText, solo === 1 && { color: '#f7cf74' }]}>SOLO</Text></Pressable>
    <SignalOverview strip={strip} mixer={mixer} onSelect={onInspect ?? onSelect} />
    <Text style={s.db}>{value === undefined ? '—' : levelLabel(value)} <Text style={s.unit}>dB</Text></Text>
    <View style={s.faderWell}>
      <View style={s.scale}>{['+10', '0', '−10', '−30', '−∞'].map(t => <Text key={t} style={s.scaleText}>{t} ─</Text>)}</View>
      <Slider accessibilityLabel={levelName} style={s.verticalSlider} minimumValue={0} maximumValue={1} value={value ?? 0} disabled={value === undefined} minimumTrackTintColor={strip.color} maximumTrackTintColor="#303f4b" thumbTintColor="#edf4f6" onValueChange={v => mixer.write(levelPath, v)} />
    </View>
    <Button text={on === 0 ? 'MUTED' : 'MUTE'} active={on === 0} disabled={on === undefined} onPress={() => mixer.write(`${base}/mix/on`, on === 0 ? 1 : 0, 'i')} />
    <Pressable accessibilityRole="button" onPress={() => value !== undefined && mixer.write(levelPath, .75)} disabled={value === undefined}><Text style={s.reset}>SET 0 dB</Text></Pressable>
  </View>;
}
function ChannelDetails({ strip, mixer, onBack }: { strip: Strip; mixer: Mixer; onBack: () => void }) {
  const input = strip.group === 'Inputs';
  const isReturn = strip.group === 'Returns';
  const hasDynamics = input || strip.id === '/lr' || strip.id.startsWith('/bus/');
  const hasEq = hasDynamics || isReturn;
  const [tab, setTab] = useState<'Input' | 'Sends' | 'EQ' | 'Dynamics' | 'Insert' | 'Output'>('Input');
  return <View style={s.details}>
    <View style={s.detailsHeader}><Text style={[s.sectionTitle, { marginBottom: 0, flex: 1 }]}>{strip.label} / Channel controls</Text><Button text="← Back to mixer" onPress={onBack} /></View>
    <View style={s.detailTabs}>{(['Input', 'Sends', 'EQ', 'Dynamics', 'Insert', 'Output'] as const).map(item => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: tab === item, disabled: item === 'Dynamics' && !hasDynamics || item === 'EQ' && !hasEq }} disabled={item === 'Dynamics' && !hasDynamics || item === 'EQ' && !hasEq} onPress={() => setTab(item)} style={[s.topTab, tab === item && s.topTabSelected, (item === 'Dynamics' && !hasDynamics || item === 'EQ' && !hasEq) && { opacity: .35 }]}><Text style={[s.topTabText, tab === item && s.topTabTextSelected]}>{item}</Text></Pressable>)}</View>
    {tab === 'Input' && <InputEditor id={strip.id} mixer={mixer} />}
    {tab === 'Sends' && <SendsEditor id={strip.id} label={strip.label} mixer={mixer} />}
    {tab === 'Output' && <OutputEditor id={strip.id} mixer={mixer} />}
    {tab === 'Insert' && <View accessibilityLabel="Channel insert controls"><Text style={s.description}>Insert controls are not implemented yet.</Text></View>}
    {tab === 'Dynamics' && <DynamicsEditor id={strip.id} mixer={mixer} />}
    {tab === 'EQ' && <EqEditor id={strip.id} mixer={mixer} />}
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
    <View style={{ flexShrink: 1 }}><Text numberOfLines={1} style={s.connectionTitle}>{mixer.status === 'demo' ? 'DEMO SESSION' : mixer.status === 'connected' ? mixer.device : mixer.status === 'connecting' ? 'CONNECTING…' : mixer.discovering ? 'SEARCHING…' : 'CONNECT MIXER'}</Text>{!compactBar && <Text style={s.connectionSubtitle}>{mixer.status === 'demo' ? 'Local demo · connection options' : mixer.status === 'connected' ? `${mixer.connectedHost ?? host} : 10024` : 'Demo / local network'}</Text>}</View>
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
  </ScrollView>
  <Modal visible={settings} transparent animationType="fade" onRequestClose={() => setSettings(false)}><View style={s.modalBackdrop}><View style={s.modal}><Text style={s.eyebrow}>SETTINGS / LOCAL NETWORK</Text><Text style={s.title}>Connect your XR18</Text><Text style={s.description}>Join the mixer’s Wi-Fi or the router it’s connected to. Enter the mixer’s IP address below.</Text><View style={s.discoveryBox}><View style={s.row}><Text style={s.body}>Automatic discovery</Text><Button text={mixer.discovering ? 'Searching…' : 'Find mixer'} disabled={Platform.OS === 'web' || mixer.discovering || mixer.status === 'connected' || mixer.status === 'connecting'} onPress={() => { void mixer.discover(); }} /></View><Text style={s.description}>{Platform.OS === 'web' ? 'Available in iOS/Android development builds. One XR18 found connects automatically; multiple results let you choose.' : mixer.discoveryMessage || 'The app searches on launch and auto-connects when one XR18 responds.'}</Text>{mixer.discovered.length > 1 && mixer.discovered.map(found => <Button key={found.host} text={`${found.name} · ${found.host}`} disabled={mixer.status === 'connecting' || mixer.status === 'connected'} onPress={() => { setHost(found.host); void mixer.connect(found.host); }} />)}</View><Text style={s.body}>Mixer IP address</Text><TextInput accessibilityLabel="Mixer IP address" value={mixer.connectedHost ?? host} onChangeText={setHost} editable={mixer.status === 'offline' || mixer.status === 'demo'} keyboardType="decimal-pad" autoCapitalize="none" autoCorrect={false} style={s.input} /><Text style={s.small}>OSC port 10024 · iOS / Android development build required</Text>{!!mixer.error && <Text style={s.error}>{mixer.error}</Text>}<View style={s.wrap}><Button text={mixer.status === 'connected' || mixer.status === 'connecting' ? 'Disconnect' : 'Connect'} active onPress={() => { if (mixer.status === 'connected' || mixer.status === 'connecting') mixer.disconnect(); else void mixer.connect(host.trim()); }} /><Button text="Demo mode" onPress={() => { mixer.demo(); setSettings(false); }} /><Button text="Close" onPress={() => setSettings(false)} /></View><Text style={s.description}>Connecting reads the current mix. Controls send changes only when you adjust them. The app disconnects when sent to the background.</Text></View></View></Modal>
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
  discoveryBox: { borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, gap: 6, backgroundColor: C.bg },
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
  soloButton: { minHeight: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 6, backgroundColor: '#1b2630', marginBottom: 10 },
  soloActive: { backgroundColor: '#483b21', borderColor: '#c29e4d' },
  soloText: { color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
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
  detailTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 12, marginBottom: 18 },
  controlCard: { padding: 16, width: 260, maxWidth: '100%', borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
  controlTitle: { color: C.text, fontSize: 14, fontWeight: '600', marginBottom: 14 },
  sendTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textAlign: 'center' },
  sendValue: { color: C.text, fontSize: 12, textAlign: 'center', fontVariant: ['tabular-nums'], marginTop: 10 },
  sendWell: { width: 78, height: 220, position: 'relative', marginTop: 12 },
  sendScale: { position: 'absolute', left: 0, top: 12, bottom: 12, justifyContent: 'space-between' },
  sendSlider: { width: 208, height: 40, position: 'absolute', left: -65, top: 90, transform: [{ rotate: '-90deg' }] },
  detailsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  focusLayout: { flexDirection: 'row', alignItems: 'flex-start', gap: 18, width: '100%' },
  focusFader: { width: 132, flexShrink: 0 },
  focusControls: { flex: 1, minWidth: 320 },
  details: { padding: 20, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 12 }, sectionTitle: { color: C.text, fontSize: 17, fontWeight: '600', marginBottom: 14 }, input: { borderWidth: 1, borderColor: C.border, borderRadius: 8, backgroundColor: C.bg, color: C.text, padding: 14, minWidth: 120, marginVertical: 8 }, send: { width: 104, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg }, mobileMaster: { flexDirection: 'row', alignItems: 'center' },
  error: { color: C.red, fontSize: 13, lineHeight: 20, marginVertical: 12 }, modalBackdrop: { flex: 1, backgroundColor: '#000b', justifyContent: 'center', alignItems: 'center', padding: 20 }, modal: { width: '100%', maxWidth: 480, padding: 24, borderRadius: 16, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, gap: 8 },
});
