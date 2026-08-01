// Tiny IndexedDB wrapper for binary-ish data (voice clips, photos).
//
// localStorage (js/save.js) holds the small JSON game state; it is text-only and
// capped around 5MB, so blobs go here instead. Everything is local to the
// device — no server, no account. If IndexedDB is unavailable (private mode, a
// locked-down iframe), we degrade to an in-memory map so the UI still works for
// the session instead of throwing.
(function () {
  const GG = (window.GG = window.GG || {});

  const DB = "gugugaga";
  const STORE = "blobs";
  const mem = new Map(); // fallback when IndexedDB is unavailable
  let dbPromise = null;
  let usingMemory = false;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      let req;
      try {
        req = indexedDB.open(DB, 1);
      } catch (e) {
        usingMemory = true;
        return resolve(null);
      }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" }).createIndex("kind", "kind");
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { usingMemory = true; resolve(null); };
      // Safari can leave the request hanging when storage is blocked.
      setTimeout(() => { if (!req.readyState || req.readyState !== "done") { usingMemory = true; resolve(null); } }, 3000);
    });
    return dbPromise;
  }

  function tx(db, mode) {
    return db.transaction(STORE, mode).objectStore(STORE);
  }

  GG.Store = {
    // True once we know blobs will NOT survive a reload.
    isMemoryOnly: () => usingMemory,

    async put(kind, key, value) {
      const id = kind + ":" + key;
      const rec = { id, kind, key, value, ts: Date.now() };
      const db = await openDB();
      if (!db) { mem.set(id, rec); return rec; }
      return new Promise((resolve) => {
        const r = tx(db, "readwrite").put(rec);
        r.onsuccess = () => resolve(rec);
        r.onerror = () => { mem.set(id, rec); resolve(rec); };
      });
    },

    async get(kind, key) {
      const id = kind + ":" + key;
      const db = await openDB();
      if (!db) return mem.get(id) || null;
      return new Promise((resolve) => {
        const r = tx(db, "readonly").get(id);
        r.onsuccess = () => resolve(r.result || mem.get(id) || null);
        r.onerror = () => resolve(mem.get(id) || null);
      });
    },

    async del(kind, key) {
      const id = kind + ":" + key;
      mem.delete(id);
      const db = await openDB();
      if (!db) return;
      return new Promise((resolve) => {
        const r = tx(db, "readwrite").delete(id);
        r.onsuccess = r.onerror = () => resolve();
      });
    },

    // All records of a kind, newest first.
    async all(kind) {
      const db = await openDB();
      if (!db) {
        return [...mem.values()].filter((r) => r.kind === kind).sort((a, b) => b.ts - a.ts);
      }
      return new Promise((resolve) => {
        const out = [];
        const r = tx(db, "readonly").index("kind").openCursor(IDBKeyRange.only(kind));
        r.onsuccess = () => {
          const c = r.result;
          if (c) { out.push(c.value); c.continue(); }
          else resolve(out.sort((a, b) => b.ts - a.ts));
        };
        r.onerror = () => resolve([]);
      });
    },
  };
})();
