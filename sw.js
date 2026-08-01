// Service worker: cache the app shell so Gugugaga works offline
// Bump CACHE whenever the shell changes — activate() drops every older cache.
const CACHE = "gugugaga-v7";
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/save.js",
  "./js/store.js",
  "./js/audio.js",
  "./js/voice.js",
  "./js/cosmetics.js",
  "./js/foods.js",
  "./js/care.js",
  "./js/buddies.js",
  "./js/notify.js",
  "./js/health.js",
  "./js/minigames.js",
  "./js/scene.js",
  "./js/pet.js",
  "./js/game.js",
  "./manifest.webmanifest",
  "./assets/icons/favicon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-180.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Tapping a notification focuses the game instead of opening a second copy.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      if (self.clients.openWindow) return self.clients.openWindow("./");
    })
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((res) => {
          // SÓLO se cachean respuestas buenas. Antes se guardaba cualquier cosa,
          // incluidos los 404 de las piezas de arte que todavía no existen: una
          // vez cacheado ese 404, agregar el PNG después NO servía de nada en un
          // iPad ya instalado — la pieza no aparecía nunca. Las opacas (CORS)
          // tampoco sirven: no se puede saber si salieron bien.
          if (res && res.ok && res.type !== "opaque") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
