# Future MIDI & DAW Integration Investigation Note

> [!NOTE]
> This document records confirmed hardware facts, research constraints, and a potential testing strategy for a future release. **No MIDI features, virtual ports, background listeners, or controller scripts are enabled or implemented in Setlist v1.2.** Setlist remains a 100% offline visual reference and running-order tool.

---

## 1. Confirmed Studio Environment & Hardware Setup

1. **Host DAW:** Fender Studio Pro running on a dual-display Mac (Setlist occupies the right-hand display).
2. **Tempo Entry:** The operator manually inputs song BPM directly into Fender Studio Pro's primary transport tempo field.
3. **Vocal Processing:** Waves Tune Real-Time (one or more active instances in the session).
4. **Physical Controllers:**
   - **Korg nanoKONTROL2:** Buttons are already mapped and actively used by the operator to trigger particular keys in Waves Tune Real-Time.
   - **Behringer X-Touch:** Connected and configured as part of the studio mixer control setup.
5. **Unknowns (Must not be guessed or assumed):**
   - Actual MIDI channels, controller mode (CC vs Mackie/HUI), CC/Note message numbers, velocity/value mappings, or the exact number of linked vocal plugin tracks.

---

## 2. Technical Distinctions from Manufacturer Documentation

- **Fender Control Link:** Fender Studio Pro provides Control Link to map external hardware controls to host commands or plugin parameters.
- **Waves Tune Real-Time Automation:** Waves documents Root and Scale as host-automatable parameters, which behave differently than incoming MIDI performance messages.
- **Target Pitch vs. Key/Scale Selection:** Sending raw MIDI Notes into Waves Tune Real-Time's *Target Pitch* function forces the vocal output to specific chromatic notes; this is distinct from setting the global song Key/Scale root.
- **Multi-Instance Linking:** While newer revisions of Waves Tune Real-Time mention a *Send Scale to All* feature, the exact installed version and multi-track routing in the church's session must be physically confirmed before relying on global broadcast.

---

## 3. Principles for a Later Investigation

When an investigation into MIDI or host synchronization is authorized:

1. **Non-Destructive Coexistence:**
   - Must preserve all existing X-Touch mixer control mappings and Korg nanoKONTROL2 assignments intact.
   - Never write SysEx or switch hardware controller modes.
2. **Explicit User Intent (No Automatic Audio Modulation):**
   - Selecting or browsing a song in Setlist must **never** automatically send MIDI messages or modify live DAW audio.
   - Any future action must require a deliberate, explicit command (such as a dedicated "Apply Key to Session" button).
3. **Dedicated Routing:**
   - Investigate a virtual MIDI route using macOS's built-in **IAC Driver** (*Audio MIDI Setup > MIDI Studio > IAC Driver*).
   - Avoid feedback loops and unintended double-triggering. A console log indicating a message was dispatched is not proof that the DAW plugin parameter changed.
4. **Independent Tempo Testing:**
   - Test DAW host tempo control independently. Do not assume MIDI Clock, raw tempo numbers, or Korg CC messages can set Fender Studio Pro's main transport tempo.
5. **Zero Additional Cost:**
   - Keep the system straightforward and rely on native macOS / DAW capabilities; no third-party paid subscriptions or plugin bridge purchases are authorized.

---

## 4. Official Manufacturer References

- [Fender Studio Pro Manual — Control Linking](https://fenderstudiopromanual.fender.com/en/Content/Control_Link_Topics/Control_Linking.htm)
- [Fender Studio Pro Manual — Mackie Control](https://fenderstudiopromanual.fender.com/en/Content/Control_Link_Topics/Mackie_Control.htm)
- [Waves Forum — Tune Real-Time: Use MIDI to Set Key/Scale Root](https://forum.waves.com/t/waves-tune-real-time-use-midi-to-set-key-scale-root/1557)
- [Waves Tune Real-Time v16 Manual & Specifications](https://assets.wavescdn.com/pdf/plugins/tune-real-time-v16-update.pdf)
- [Apple Support — Transfer MIDI information between apps using the IAC Driver](https://support.apple.com/guide/audio-midi-setup/transfer-midi-information-between-apps-ams1013/mac)
