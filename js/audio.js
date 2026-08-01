// Tiny WebAudio sound engine — cute synthesized blips, no audio files needed.
// (Real voice clips can be added later by dropping files in assets/audio/.)
(function () {
  const GG = (window.GG = window.GG || {});

  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        try { ctx = new AC(); } catch (e) { ctx = null; }
      }
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // One enveloped note; freq can be a number or [from, to] for a glide.
  function note(freq, start, dur, type, gain) {
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + start;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || "sine";
    if (Array.isArray(freq)) {
      o.frequency.setValueAtTime(freq[0], t0);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, freq[1]), t0 + dur);
    } else {
      o.frequency.setValueAtTime(freq, t0);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain || 0.16, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }

  const SOUNDS = {
    pet() { note([500, 760], 0, 0.12, "sine", 0.16); note([720, 520], 0.11, 0.12, "sine", 0.14); }, // "gu-gu~"
    feed() { note(300, 0, 0.09, "sine", 0.18); note(360, 0.1, 0.11, "sine", 0.18); },               // gulp gulp
    play() { [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.08, 0.16, "triangle", 0.14)); }, // yay!
    clean() { [1200, 1500, 1850].forEach((f, i) => note(f, i * 0.06, 0.14, "sine", 0.1)); },         // sparkle
    sleep() { note([420, 170], 0, 0.55, "sine", 0.16); },                                            // yawn
    wake() { note([300, 640], 0, 0.3, "sine", 0.16); },                                              // rise & shine
    cry() { note([620, 500], 0, 0.45, "sawtooth", 0.12); note([560, 440], 0.4, 0.5, "sawtooth", 0.12); }, // waaah
  };

  GG.Audio = {
    play(name) {
      if (muted) return;
      const f = SOUNDS[name];
      if (f) { try { f(); } catch (e) {} }
    },
    // Single free note — the memory mini-game gives each pad its own pitch.
    tone(freq, dur) {
      if (muted) return;
      try { note(freq, 0, dur || 0.24, "triangle", 0.15); } catch (e) {}
    },
    setMuted(m) { muted = !!m; },
    isMuted() { return muted; },
    resume() { ensure(); },
  };
})();
