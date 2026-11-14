# OSCr — XR18 remote mixer

An Expo / React Native starter for controlling a Behringer XR18 over the local network. Dark mixing desk UI for phones and tablets, with a browser demo.

## Start

Use **Node.js 24 LTS** (`nvm use` if you have nvm). Expo SDK 58 requires Node 22.13 or newer; this machine's default Node 20 is too old.

```sh
npm install
npm run web
```

Choose **Explore demo**. All demo changes stay in memory; there is no audio engine and nothing is sent to hardware. Browser live control is unavailable because browsers cannot open raw UDP sockets.

## Connect to a real mixer

Live control requires a custom native development build, **not Expo Go**. `react-native-udp` is autolinked into the native app.

1. Install Xcode and CocoaPods for iOS, or Android Studio and its SDK for Android.
2. Build and launch:

   ```sh
   npm run ios -- --device
   # or
   npm run android -- --device
   ```

3. Join the same network as your XR18. This may be its access point or your external router. Internet access is not necessary for mixer control.
4. Open **Connection**, enter the mixer's actual IPv4 address, and choose **Connect**. `192.168.1.1` is only an editable starting value.
5. Allow the iOS local network permission when requested. The app checks `/xinfo` for an XR18, reads its current values, and enables controls as their values arrive.

Subsequent development sessions can use `npm start`. `eas.json` also provides development, preview, and production profiles if you prefer EAS builds (requires your Expo account and signing configuration).

## Mixing toolbar

The top bar stays visible while scrolling. Main controls the LR mix; Bus1–Bus6 select monitor sends, and FX1–FX4 select effect sends. Each send mix shows its own output master. On small screens, swipe the tab row horizontally; the Settings gear stays on the right. Input mute buttons affect every mix, including when a send tab is selected.

Each fader includes a compact, read-only signal overview: input gain/48 V, six bus-send bars, four FX-send bars, gate/dynamics and EQ enable states, and main LR pan position. Return summaries show bus sends, EQ, and pan, omitting input-only preamp/phantom and gate/dynamics stages. Tap it to open a focused view with just that fader on the left and channel controls on the right. Channel controls have Input, Sends, EQ, Dynamics, Insert, and Output tabs. Input provides channel naming, fixed-pair stereo link, polarity inversion, analog/USB selection, assigned-preamp gain and phantom, USB trim, and HPF frequency/bypass with a schematic curve. Returns expose source selection and USB trim only. Controls wait for readback; preamp gain and phantom follow the assigned analog input. These mappings require physical-mixer validation. Dynamics shows gate and compressor together (side by side on wide screens, stacked on narrow screens), with independent bypass, gate/expander/ducker modes, thresholds, gate range, compressor ratio/makeup, and attack/hold/release controls. Its graphs show a modeled hard-knee transfer and a schematic timing envelope, not live levels or gain reduction. EQ provides a draggable, logarithmic frequency response graph without RTA, per-band frequency/gain/Q and filter type controls, plus EQ bypass. Channels/returns have four bands; Main and buses have six. Bus/Main editing requires PEQ mode, which the app does not switch automatically. The displayed response is a 48 kHz biquad model; Vintage is approximated as a bell and the separate input low-cut stage is not plotted. Band controls remain disabled until mixer readback arrives. Back to mixer restores all faders; selecting another top-bar mix also closes the focused view. The miniature EQ curve uses the same per-channel band settings and response model as the full EQ editor. It updates with edits and mixer readback, shows a flat response when bypassed, and withholds the curve until all bands arrive. GEQ/TEQ modes are labeled rather than plotted using unrelated PEQ settings.

## Automatic discovery

Native development builds search once at launch with read-only `/xinfo` UDP broadcasts on port 10024. A unique XR18 reply connects automatically; multiple mixers are listed in Connection so you can choose. Find mixer retries the scan. Starting a manual connection, entering demo mode, backgrounding, or unmounting cancels any scan. A timeout, blocked broadcast, or local network permission failure leaves manual IP connection available. Discovery does not cross routers/VLANs and may be blocked by Wi-Fi client isolation.

**iOS:** Apple requires the multicast networking entitlement for UDP broadcast. This project does not enable that entitlement automatically, so ordinary signed builds can still test manual IP connections. For iOS discovery, first obtain [Apple’s approval](https://developer.apple.com/contact/request/networking-multicast), then add `"entitlements": { "com.apple.developer.networking.multicast": true }` under `expo.ios` in app.json and rebuild with a matching provisioning profile. Local network permission is also required. Android discovery requires the same local network as the mixer. Browser builds show the limitation and keep discovery disabled.

Discovery parsing, unique-mixer selection, broadcast packets, cancellation and socket cleanup are tested with simulated sockets. Physical iOS/Android discovery remains untested.

## Implemented controls

- 16 mono input faders, mute, solo, pan, and channel names.
- Stereo auxiliary input 17/18 and four stereo FX return levels, mute, and pan.
- Six bus masters, four FX send masters, and main LR level/mute.
- Per-input send levels to six monitor buses and four FX buses.
- Per-input EQ, gate, compressor, and low-cut on/off, using the mixer’s existing processing settings.
- Bidirectional OSC state updates, periodic `/xremote` subscription renewal, initial read retries, device identity check, and connection timeout.
- In-memory demo mode. No settings are pushed when connecting. Backgrounding the native app disconnects it; reconnect after returning.

Mute uses `/mix/on`: **0 means muted**, 1 means on. Fader and send values are normalized 0–1 with the XR18 piecewise dB taper. Set 0 dB uses 0.75. Fader readings represent control positions, **not audio meters**.

This is a foundation, not a replacement for every X AIR Edit feature. Live meters, advanced dynamics knee/detection/sidechain controls, scene recall, routing patch editing, FX algorithms, and saved connection profiles are not implemented. Use X AIR Edit for those settings. Linked-channel behavior follows the mixer's own configuration.

## Checks

```sh
npm run typecheck
npm test
npx expo export --platform all
```

Tests cover OSC byte layout, query and mute types, identity/string decoding, malformed packets, fader conversion, and XR18 address coverage. iOS, Android, and web JavaScript exports were verified. A native binary and a physical XR18 connection have not been tested in this environment; full Xcode and a reachable mixer were unavailable.

## Project layout

- `App.tsx`: connection dialog, channel strips, and detail controls.
- `src/components/Slider*`: native slider and accessible browser range input.
- `src/mixer/model.ts`: XR18 strips and initial read paths.
- `src/mixer/osc.ts`: binary OSC codec and fader taper.
- `src/mixer/transport.native.ts`: native UDP socket on port 10024.
- `src/mixer/transport.ts`: browser fallback and shared transport interface.
- `src/mixer/useMixer.ts`: session lifecycle, state sync, and demo state.

Protocol reference: [Music Tribe X AIR Remote Control Protocol](https://mediadl.musictribe.com/download/software/behringer/XAIR/X%20AIR%20Remote%20Control%20Protocol.pdf). Native networking: [react-native-udp](https://github.com/tradle/react-native-udp). Build setup: [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/).

Solo buttons sit above each signal overview and use the XR18 `/-stat/solosw/NN` addresses. They stay disabled until readback arrives and highlight amber when active. Solo follows the mixer’s monitor configuration and exclusive-solo preference; demo solo changes only local state. Address mapping reference: [XR18 parameter overview](https://www.scribd.com/document/819735371/Parameters). Hardware solo behavior has not been verified here.
