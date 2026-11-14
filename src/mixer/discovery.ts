import { decode, encode } from './osc';
export type MixerDevice = { host: string; name: string; model: 'XR18'; version: string };
export function parseDiscoveryReply(bytes: Uint8Array, remote: { address: string; port: number }): MixerDevice | undefined {
  if (remote.port !== 10024 || !/^(\d{1,3}\.){3}\d{1,3}$/.test(remote.address) || remote.address.split('.').some(v => +v > 255)) return;
  try {
    const packet = decode(bytes);
    if (packet.address !== '/xinfo' && packet.address !== '/info') return;
    const [, name, model, version] = packet.args;
    if (model !== 'XR18' || typeof name !== 'string' || typeof version !== 'string') return;
    // Use the reply's source IP, not an IP claimed in its payload.
    return { host: remote.address, name, model, version };
  } catch { return; }
}
export interface DiscoverySocket {
  on(event: 'message', callback: (bytes: Uint8Array, remote: { address: string; port: number }) => void): unknown;
  on(event: 'error', callback: (error: Error) => void): unknown;
  bind(port: number, callback: () => void): void;
  setBroadcast(enabled: boolean): void;
  send(bytes: Uint8Array, offset: number, length: number, port: number, host: string, callback: (error?: Error) => void): void;
  close(): void;
}
export function scanMixerNetwork(createSocket: () => DiscoverySocket, signal?: AbortSignal, windowMs = 4000): Promise<MixerDevice[]> {
  if (signal?.aborted) return Promise.reject(new Error('Discovery cancelled.'));
  return new Promise((resolve, reject) => {
    const socket = createSocket(), found = new Map<string, MixerDevice>();
    let done = false, retry: ReturnType<typeof setInterval> | undefined;
    const finish = (error?: Error) => {
      if (done) return; done = true; clearTimeout(deadline); if (retry) clearInterval(retry);
      signal?.removeEventListener('abort', abort);
      try { socket.close(); } catch { /* Already closed or never bound. */ }
      if (error) reject(error); else resolve([...found.values()].sort((a,b) => a.host.localeCompare(b.host)));
    };
    const abort = () => finish(new Error('Discovery cancelled.'));
    const deadline = setTimeout(() => finish(), windowMs);
    signal?.addEventListener('abort', abort, { once: true });
    socket.on('error', error => finish(error));
    socket.on('message', (bytes, remote) => { if (done) return; const device = parseDiscoveryReply(bytes, remote); if (device) found.set(device.host, device); });
    const packet = encode('/xinfo');
    const probe = () => {
      if (done) return;
      try { socket.send(packet, 0, packet.length, 10024, '255.255.255.255', error => { if (error) finish(error); }); } catch (e) { finish(e instanceof Error ? e : new Error('Discovery send failed.')); }
    };
    try {
      socket.bind(0, () => {
        if (done) return;
        try { socket.setBroadcast(true); probe(); if (!done) retry = setInterval(probe, 1000); } catch (e) { finish(e instanceof Error ? e : new Error('Broadcast discovery is unavailable.')); }
      });
    } catch (e) { finish(e instanceof Error ? e : new Error('Could not open discovery socket.')); }
  });
}
export function autoConnectCandidate(devices: MixerDevice[]): MixerDevice | undefined { return devices.length === 1 ? devices[0] : undefined; }
