// Record your own voice for Gugugaga.
//
// Fully local: getUserMedia -> MediaRecorder -> Blob -> IndexedDB (js/store.js).
// No server, no account, works offline. The trade-off is that clips live on
// THIS device only, so the UI offers a download button as a backup.
//
// Availability is not guaranteed: the microphone needs a secure context (https)
// and, inside an iframe, an explicit `allow="microphone"` from the parent page.
// Everything below degrades to a friendly message instead of throwing.
(function () {
  const GG = (window.GG = window.GG || {});

  GG.VOICE_SLOTS = [
    { id: "hola", label: "Saludo", emoji: "👋", hint: "cuando abre el juego" },
    { id: "feliz", label: "Feliz", emoji: "😄", hint: "al jugar y al comer rico" },
    { id: "llorando", label: "Llorando", emoji: "😢", hint: "cuando algo no le gusta" },
    { id: "hambre", label: "Hambre", emoji: "🍼", hint: "cuando pide comida" },
    { id: "dormir", label: "Dormir", emoji: "😴", hint: "al ir a dormir" },
    { id: "mimos", label: "Mimos", emoji: "💕", hint: "al hacerle cariño" },
  ];

  const urls = {};   // slot -> object URL of the stored clip
  let recorder = null;
  let chunks = [];
  let stream = null;

  function pickMime() {
    const opts = ["audio/webm", "audio/mp4", "audio/ogg"]; // Safari only does mp4
    if (typeof MediaRecorder === "undefined") return null;
    for (const m of opts) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) return m;
    }
    return "";
  }

  GG.Voice = {
    muted: false,

    // Why recording might not be possible here — null when it is.
    unsupportedReason() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return "Este navegador no deja grabar audio.";
      }
      if (typeof MediaRecorder === "undefined") return "Este navegador no deja grabar audio.";
      if (!window.isSecureContext) return "Hace falta una conexión segura (https) para grabar.";
      return null;
    },

    // Load every stored clip into playable URLs. Safe to call on boot.
    async init() {
      const recs = await GG.Store.all("voice");
      recs.forEach((r) => {
        try { urls[r.key] = URL.createObjectURL(r.value); } catch (e) { /* ignore */ }
      });
      return Object.keys(urls);
    },

    has(slot) { return !!urls[slot]; },
    url(slot) { return urls[slot] || null; },

    // Play a recorded clip. Returns false when there is nothing to play, so the
    // caller can fall back to the synthesised blip.
    play(slot) {
      if (this.muted || !urls[slot]) return false;
      try {
        const a = new Audio(urls[slot]);
        a.play().catch(() => {});
        return true;
      } catch (e) {
        return false;
      }
    },

    isRecording() { return !!recorder && recorder.state === "recording"; },

    async start() {
      const why = this.unsupportedReason();
      if (why) throw new Error(why);
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      chunks = [];
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.start();
    },

    // Stop and persist under `slot`. Resolves with the clip's object URL.
    stop(slot) {
      return new Promise((resolve, reject) => {
        if (!recorder) return reject(new Error("No estaba grabando."));
        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          chunks = [];
          if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
          recorder = null;
          if (!blob.size) return reject(new Error("No se grabó nada."));
          await GG.Store.put("voice", slot, blob);
          if (urls[slot]) URL.revokeObjectURL(urls[slot]);
          urls[slot] = URL.createObjectURL(blob);
          resolve(urls[slot]);
        };
        try { recorder.stop(); } catch (e) { reject(e); }
      });
    },

    cancel() {
      try { if (recorder && recorder.state === "recording") recorder.stop(); } catch (e) { /* ignore */ }
      if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
      recorder = null;
      chunks = [];
    },

    async remove(slot) {
      await GG.Store.del("voice", slot);
      if (urls[slot]) URL.revokeObjectURL(urls[slot]);
      delete urls[slot];
    },
  };
})();
