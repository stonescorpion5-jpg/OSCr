import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { createTransport, type Transport } from './transport';
import { queryPaths, strips, master } from './model';
import type { Argument } from './osc';
export type Status = 'offline' | 'connecting' | 'connected' | 'demo';
export function useMixer() {
  const [status, setStatus] = useState<Status>('offline');
  const [values, setValues] = useState<Record<string, number | string>>({});
  const [error, setError] = useState(''); const [device, setDevice] = useState('XR18');
  const transport = useRef<Transport | null>(null); const mode = useRef<Status>('offline');
  const timers = useRef<ReturnType<typeof setInterval>[]>([]); const lastSeen = useRef(0);
  const session = useRef(0);
  function disconnect() { session.current++; timers.current.forEach(clearInterval); timers.current = []; transport.current?.close(); transport.current = null; mode.current = 'offline'; setStatus('offline'); setValues({}); }
  useEffect(() => { const sub = AppState.addEventListener('change', s => { if (s !== 'active' && mode.current !== 'demo') disconnect(); }); return () => { sub.remove(); disconnect(); }; }, []);
  function demo() {
    disconnect(); setError(''); const initial: Record<string, number | string> = {};
    [...strips, master].forEach((s, i) => { initial[`${s.id}/mix/fader`] = .65 - (i % 4) * .06; initial[`${s.id}/mix/on`] = 1; initial[`${s.id}/mix/pan`] = .5; initial[`${s.id}/config/name`] = s.label;
      ['eq/on','gate/on','dyn/on','preamp/hpon'].forEach(p => initial[`${s.id}/${p}`] = 0);
      for (let n = 1; n <= 10; n++) initial[`${s.id}/mix/${String(n).padStart(2,'0')}/level`] = 0;
    }); setValues(initial); mode.current = 'demo'; setStatus('demo');
  }
  async function connect(host: string) {
    disconnect(); setError('');
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.split('.').some(v => +v > 255) || host === '0.0.0.0' || host.endsWith('.255')) { setError('Enter the mixer’s unicast IPv4 address, such as 192.168.1.1.'); return; }
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
  return { status, values, error, device, connect, disconnect, demo, write };
}
