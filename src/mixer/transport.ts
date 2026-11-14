import { Argument } from './osc';
export type Callbacks = { message: (address: string, args: (string | number)[]) => void; error: (message: string) => void };
export interface Transport { open(host: string, callbacks: Callbacks): Promise<void>; send(address: string, args?: Argument[]): void; close(): void; }
// Web has no raw UDP access. Metro resolves transport.native.ts on iOS/Android.
export function createTransport(): Transport { throw new Error('Live UDP control needs an iOS or Android development build. Use demo mode in the browser.'); }

export async function discoverMixers(_signal?: AbortSignal): Promise<import('./discovery').MixerDevice[]> { throw new Error('Discovery needs an iOS or Android development build. Browser demo does not access UDP.'); }
