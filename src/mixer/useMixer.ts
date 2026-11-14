import { inputPaths } from './input';
import { outputPaths } from './output';
import { autoConnectCandidate, type MixerDevice } from './discovery';
import { soloPath } from './solo';
import { dynamicsWire, hasCompressor, type DynamicsKind } from './dynamics';
import { bandCount, frequencyToWire, gainToWire, qToWire } from './eq';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { createTransport, discoverMixers, type Transport } from './transport';
import { queryPaths, strips, master } from './model';
import type { Argument } from './osc';
export type Status = 'offline' | 'connecting' | 'connected' | 'demo';
export function useMixer() {
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<MixerDevice[]>([]);
  const [discoveryMessage, setDiscoveryMessage] = useState('');
  const [connectedHost, setConnectedHost] = useState<string>();
  const scanController = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<Status>('offline');
  const [values, setValues] = useState<Record<string, number | string>>({});
  const [error, setError] = useState(''); const [device, setDevice] = useState('XR18');
  const transport = useRef<Transport | null>(null); const mode = useRef<Status>('offline');
  const timers = useRef<ReturnType<typeof setInterval>[]>([]); const lastSeen = useRef(0);
  const session = useRef(0);
  function disconnect() { session.current++; scanController.current?.abort(); scanController.current = null; setDiscovering(false); setConnectedHost(undefined); timers.current.forEach(clearInterval); timers.current = []; transport.current?.close(); transport.current = null; mode.current = 'offline'; setStatus('offline'); setValues({}); }
  // Scan once on mount; reconnects and rescans are explicit user actions.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (Platform.OS !== 'web') void discover(); const sub = AppState.addEventListener('change', s => { if (s !== 'active' && mode.current !== 'demo') disconnect(); }); return () => { sub.remove(); disconnect(); }; }, []);
  async function discover() {
    disconnect(); setError(''); setDiscovered([]); setDiscoveryMessage('Searching the local network…');
    const token = session.current, controller = new AbortController(); scanController.current = controller; setDiscovering(true);
    try {
      const devices = await discoverMixers(controller.signal);
      if (token !== session.current) return;
      setDiscovered(devices); setDiscovering(false); scanController.current = null;
      const candidate = autoConnectCandidate(devices);
      if (candidate) { setDiscoveryMessage(`Found ${candidate.name}. Connecting…`); await connect(candidate.host); }
      else setDiscoveryMessage(devices.length ? 'Multiple XR18 mixers found. Choose the one to connect to.' : 'No XR18 responded. Check Wi-Fi/local network permissions, or enter its IP manually.');
    } catch (e) {
      if (token !== session.current) return;
      setDiscovering(false); scanController.current = null;
      setDiscoveryMessage(`${e instanceof Error ? e.message : 'Discovery failed.'}${Platform.OS === 'ios' ? ' iOS broadcast discovery requires Apple’s multicast entitlement; manual IP connection is still available.' : ''}`);
    }
  }
  function demo() {
    disconnect(); setError(''); const initial: Record<string, number | string> = {};
    [...strips, master].forEach((s, i) => { initial[`${s.id}/mix/fader`] = .65 - (i % 4) * .06; initial[`${s.id}/mix/on`] = 1; initial[`${s.id}/mix/pan`] = .5; initial[`${s.id}/config/name`] = s.label;
      outputPaths(s.id).forEach(path => { initial[path] = path.endsWith('/weight') ? .5 : path.endsWith('/lr') ? 1 : 0; });
      const solo = soloPath(s.id); if (solo) initial[solo] = 0;
      inputPaths(s.id).forEach(path => initial[path] = 0);
      if (s.group === 'Inputs') { initial[`${s.id}/config/insrc`] = i; initial[`${s.id}/config/rtnsrc`] = i; initial[`/headamp/${s.id.slice(-2)}/gain`] = (24 + (i % 4) * 3) / 72; initial[`/headamp/${s.id.slice(-2)}/phantom`] = 0; initial[`${s.id}/preamp/hpf`] = Math.log(4) / Math.log(20); }
      if (s.group === 'Inputs' || s.group === 'Returns') initial[`${s.id}/preamp/rtntrim`] = .5;
      ['eq/on','gate/on','dyn/on','preamp/hpon'].forEach(p => initial[`${s.id}/${p}`] = 0);
      const processors: DynamicsKind[] = s.group === 'Inputs' ? ['gate', 'dyn'] : hasCompressor(s.id) ? ['dyn'] : [];
      processors.forEach(kind => {
        const root = `${s.id}/${kind}`;
        initial[`${root}/on`] = 1;
        initial[`${root}/mode`] = kind === 'gate' ? 3 : 0;
        initial[`${root}/thr`] = dynamicsWire(kind, 'thr', kind === 'gate' ? -40 : -18);
        initial[`${root}/attack`] = dynamicsWire(kind, 'attack', kind === 'gate' ? 5 : 15);
        initial[`${root}/hold`] = dynamicsWire(kind, 'hold', 80);
        initial[`${root}/release`] = dynamicsWire(kind, 'release', 220);
        if (kind === 'gate') initial[`${root}/range`] = dynamicsWire(kind, 'range', 45);
        else { initial[`${root}/ratio`] = 6; initial[`${root}/mgain`] = dynamicsWire(kind, 'mgain', 0); }
      });
      if (bandCount(s.id)) {
        initial[`${s.id}/eq/on`] = 1;
        initial[`${s.id}/eq/mode`] = 0;
        for (let band = 1; band <= bandCount(s.id); band++) {
          const root = `${s.id}/eq/${band}`;
          initial[`${root}/type`] = 2;
          initial[`${root}/f`] = frequencyToWire([60, 140, 1400, 5000, 9000, 15000][band - 1]);
          initial[`${root}/g`] = gainToWire([3, -4, 4, -3, 0, 0][band - 1]);
          initial[`${root}/q`] = qToWire(1.4);
        }
      }
      for (let n = 1; n <= (s.group === 'Inputs' ? 10 : s.group === 'Returns' ? 6 : 0); n++) {
        const root = `${s.id}/mix/${String(n).padStart(2, '0')}`;
        initial[`${root}/level`] = 0; initial[`${root}/tap`] = n <= 6 ? 2 : 4;
      }
    }); setValues(initial); mode.current = 'demo'; setStatus('demo');
  }
  async function connect(host: string) {
    disconnect(); setError('');
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.split('.').some(v => +v > 255) || host === '0.0.0.0' || host.endsWith('.255')) { setError('Enter the mixer’s unicast IPv4 address, such as 192.168.1.1.'); return; }
    setConnectedHost(host);
    const token = session.current; mode.current = 'connecting'; setStatus('connecting'); lastSeen.current = Date.now();
    const fail = (message: string) => { if (token !== session.current) return; disconnect(); setError(message); };
    try {
      const client = createTransport(); transport.current = client;
      await client.open(host, { error: fail, message(address, args) {
        if (token !== session.current) return; lastSeen.current = Date.now();
        if ((address === '/xinfo' || address === '/info') && mode.current === 'connecting') {
          const model = String(args[2] ?? '');
          if (model !== 'XR18') { fail(`Expected an XR18; device reported ${model || 'an unknown model'}.`); return; }
          setDevice(`${model} · ${args[3] ?? ''}`); mode.current = 'connected'; setStatus('connected');
          client.send('/xremote');
          const initialPaths = queryPaths();
          // Repeat reads to recover from individual UDP datagram loss.
          const paths = [...initialPaths, ...initialPaths]; let index = 0;
          const sync = setInterval(() => { if (token !== session.current) return; for (let n = 0; n < 12 && index < paths.length; n++) client.send(paths[index++]); if (index >= paths.length) clearInterval(sync); }, 40); timers.current.push(sync);
        } else if (args.length && (typeof args[0] === 'string' || (typeof args[0] === 'number' && Number.isFinite(args[0])))) {
          setValues(v => ({ ...v, [address]: args[0] }));
        }
      }});
      if (token !== session.current) { client.close(); return; }
      client.send('/xinfo');
      timers.current.push(setInterval(() => { if (mode.current === 'connecting') client.send('/xinfo'); else { client.send('/xremote'); client.send('/xinfo'); } }, 4000));
      timers.current.push(setInterval(() => { if (Date.now() - lastSeen.current > 12000) fail('Mixer is not responding. Check its IP address, Wi-Fi, and local network permission, then reconnect.'); }, 1000));
    } catch (e) { fail(e instanceof Error ? e.message : 'Could not open UDP connection.'); }
  }
  function write(address: string, value: string | number, type: 'f' | 'i' | 's' = 'f') {
    if (mode.current !== 'connected' && mode.current !== 'demo') return;
    if (typeof value === 'number' && !Number.isFinite(value)) return;
    if (mode.current === 'connected') {
      const arg: Argument = type === 's' ? { type, value: String(value) } : { type, value: Number(value) };
      transport.current?.send(address, [arg]);
    }
    setValues(v => ({ ...v, [address]: value }));
  }
  return { status, values, error, device, connectedHost, discovering, discovered, discoveryMessage, discover, connect, disconnect, demo, write };
}
