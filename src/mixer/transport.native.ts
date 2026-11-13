import { Buffer } from 'buffer';
import { NativeModules } from 'react-native';
import { encode, decode, type Argument } from './osc';
import type { Callbacks, Transport } from './transport';
export function createTransport(): Transport {
  if (!NativeModules.UdpSockets) throw new Error('UDP is unavailable in Expo Go. Install a development build with npm run ios or npm run android.');
  const module = require('react-native-udp');
  const udp = module.default ?? module;
  let socket: any; let host = ''; let callbacks: Callbacks;
  return {
    open(ip, cb) {
      host = ip; callbacks = cb;
      return new Promise((resolve, reject) => {
        socket = udp.createSocket({ type: 'udp4' });
        socket.on('error', (e: Error) => { reject(e); callbacks.error(e.message); });
        socket.on('message', (bytes: Buffer, remote: { address: string; port: number }) => {
          if (remote.address !== host || remote.port !== 10024) return;
          try { const packet = decode(bytes); callbacks.message(packet.address, packet.args); } catch { /* Ignore unsupported meter blobs and malformed datagrams. */ }
        });
        socket.bind(0, () => resolve());
      });
    },
    send(address, args: Argument[] = []) { const b = encode(address, args); socket?.send(b, 0, b.length, 10024, host, (e?: Error) => { if (e) callbacks.error(e.message); }); },
    close() { socket?.removeAllListeners(); socket?.close(); socket = undefined; },
  };
}
