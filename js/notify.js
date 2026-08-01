// Notifications — "Gugugaga te necesita".
//
// WHAT THIS CAN DO: while the app is open (or recently backgrounded and still
// alive), it watches her needs and fires a local notification when one gets
// critical. On an installed PWA that shows up like any app notification.
//
// WHAT THIS CANNOT DO, and why: the web platform has no reliable way to schedule
// a notification for later while the app is fully closed. The old Notification
// Triggers API never shipped. Reaching a locked iPad genuinely requires the Push
// API, and Push needs a SERVER holding VAPID keys to send the message — there is
// no serverless workaround. So:
//
//   · app open / recently backgrounded -> works, no server (this file)
//   · iPad locked, app closed for hours -> needs a push server (not built)
//
// Extra constraints on iOS: notifications only work from a PWA added to the Home
// Screen (iOS 16.4+), permission must be requested from a user gesture, and it
// will not work inside a cross-origin iframe such as the Artifact preview.
(function () {
  const GG = (window.GG = window.GG || {});

  const COOLDOWN = 25 * 60 * 1000; // never nag about the same need twice in 25 min
  const lastSent = {};

  const NEEDS = [
    { key: "hunger", limit: 18, title: "🍼 ¡Gugugaga tiene hambre!", body: "Guu... ¿le das algo rico?" },
    { key: "energy", limit: 18, title: "😴 Gugugaga tiene sueño", body: "Ayudala a irse a dormir." },
    { key: "cleanliness", limit: 18, title: "🛁 Gugugaga está sucia", body: "¡Hora del baño con burbujas!" },
    { key: "happiness", limit: 18, title: "🎈 Gugugaga se aburre", body: "¿Jugamos un ratito?" },
  ];

  GG.Notify = {
    supported() {
      return typeof Notification !== "undefined" && window.isSecureContext;
    },
    permission() {
      return this.supported() ? Notification.permission : "unsupported";
    },
    // Why it may not work here — null when everything is fine.
    reason() {
      if (typeof Notification === "undefined") return "Este navegador no admite notificaciones.";
      if (!window.isSecureContext) return "Hace falta una conexión segura (https).";
      if (Notification.permission === "denied") return "Están bloqueadas en los ajustes del navegador.";
      if (window.top !== window.self) return "Dentro de una vista previa no funcionan: instalá el juego en la pantalla de inicio.";
      return null;
    },

    // Must be called from a tap (iOS requires a user gesture).
    async request() {
      if (!this.supported()) throw new Error("No admitido");
      const res = await Notification.requestPermission();
      return res === "granted";
    },

    async show(title, body, tag) {
      if (this.permission() !== "granted") return false;
      const opts = {
        body,
        tag: tag || "gugugaga",
        icon: "assets/icons/icon-192.png",
        badge: "assets/icons/icon-192.png",
        renotify: false,
      };
      try {
        // A service worker notification survives the page being backgrounded and
        // is the only kind an installed PWA can show on iOS.
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
          const reg = await navigator.serviceWorker.ready;
          if (reg && reg.showNotification) { reg.showNotification(title, opts); return true; }
        }
        new Notification(title, opts);
        return true;
      } catch (e) {
        return false;
      }
    },

    // Called from the game loop. Only nags while the tab is hidden, so she is
    // never notified about something she is already looking at.
    check(state) {
      if (!state.notify || this.permission() !== "granted") return;
      if (!document.hidden) return;
      if (state.sleeping) return;
      const now = Date.now();
      for (const n of NEEDS) {
        if (state.stats[n.key] > n.limit) continue;
        if (lastSent[n.key] && now - lastSent[n.key] < COOLDOWN) continue;
        lastSent[n.key] = now;
        this.show(n.title, n.body, "need-" + n.key);
        return; // one at a time — never a burst
      }
      if (GG.isSick(state) && (!lastSent.sick || now - lastSent.sick > COOLDOWN)) {
        lastSent.sick = now;
        this.show("🤒 Gugugaga está enfermita", "Hay que llevarla al doctor.", "sick");
      }
    },
  };
})();
