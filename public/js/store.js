(() => {
  if (window.__SASAERU_STORE_INIT__) return;
  window.__SASAERU_STORE_INIT__ = true;

  try {
    // -----------------------------
    // 1) Clips (existing style)
    // -----------------------------
    const CLIP_DB_NAME = "sasaeru-store";
    const CLIP_STORE = "clips";

    function openClipDB() {
      return new Promise((res, rej) => {
        const req = indexedDB.open(CLIP_DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(CLIP_STORE)) {
            db.createObjectStore(CLIP_STORE, { keyPath: "id" });
          }
        };
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
    }

    async function loadClipsImpl() {
      const db = await openClipDB();
      return new Promise((res, rej) => {
        const tx = db.transaction(CLIP_STORE, "readonly");
        const req = tx.objectStore(CLIP_STORE).getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => rej(req.error);
      });
    }

    async function saveClipsImpl(list) {
      const db = await openClipDB();
      return new Promise((res, rej) => {
        const tx = db.transaction(CLIP_STORE, "readwrite");
        const store = tx.objectStore(CLIP_STORE);

        const clearReq = store.clear();
        clearReq.onerror = () => rej(clearReq.error);

        clearReq.onsuccess = () => {
          (list || []).forEach((item, idx) => {
            if (!item.id) item.id = String(item.url || idx);
            store.put(item);
          });
          tx.oncomplete = () => res(true);
          tx.onerror = () => rej(tx.error);
        };
      });
    }

    if (typeof window.loadClips !== "function") window.loadClips = loadClipsImpl;
    if (typeof window.saveClips !== "function") window.saveClips = saveClipsImpl;

    window.store = window.store || {};
    if (typeof window.store.loadClips !== "function") window.store.loadClips = window.loadClips;
    if (typeof window.store.saveClips !== "function") window.store.saveClips = window.saveClips;

    // -----------------------------
    // 2) Records (perfect version KV + fallback)
    // -----------------------------
    const alreadyHasDiary =
      typeof window.loadRecords === "function" && typeof window.saveRecords === "function";

    const FALL = {
      get: (k) => {
        try {
          return JSON.parse(localStorage.getItem(k) || "null");
        } catch {
          return null;
        }
      },
      set: (k, v) => {
        try {
          localStorage.setItem(k, JSON.stringify(v));
        } catch {}
      },
    };

    const promisify = (req) =>
      new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onabort = () => reject(req.error);
      });

    const txDone = (tx) =>
      new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });

    const createKV = (dbName, storeName) => {
      const openReq = indexedDB.open(dbName);
      openReq.onupgradeneeded = () => {
        const db = openReq.result;
        if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
      };
      const dbp = promisify(openReq);

      return (mode, cb) =>
        dbp.then((db) => {
          const tx = db.transaction(storeName, mode);
          const st = tx.objectStore(storeName);
          return cb(st).then((val) => txDone(tx).then(() => val));
        });
    };

    const KV = createKV("sasaeru-db", "kv");
    const idbGet = (k) => KV("readonly", (s) => promisify(s.get(k)));
    const idbSet = (k, v) =>
      KV("readwrite", (s) => {
        s.put(v, k);
        return Promise.resolve();
      });

    const safeGet = (k) => idbGet(k).catch(() => FALL.get(k)).then((v) => (v ?? []));
    const safeSet = (k, v) => idbSet(k, v).catch(() => FALL.set(k, v));

    if (!alreadyHasDiary) {
      window.loadRecords = () => safeGet("records");
      window.saveRecords = (arr) => safeSet("records", Array.isArray(arr) ? arr : []);
    }

    // -----------------------------
    // 3) iPhone backup prompt (once)
    // -----------------------------
    window.__sasaeru = window.__sasaeru || {};
    window.__sasaeru.isIOS =
      window.__sasaeru.isIOS || (() => /iPhone|iPad|iPod/i.test(navigator.userAgent));

    window.__sasaeru.maybePromptBackupOnce =
      window.__sasaeru.maybePromptBackupOnce ||
      function () {
        try {
          if (!window.__sasaeru.isIOS()) return;

          const KEY = "sasaeru_backup_prompt_shown";
          if (localStorage.getItem(KEY) === "1") return;
          localStorage.setItem(KEY, "1");

          const ok = confirm(
            "保存しました。\n\n" +
              "iPhoneでは環境により、記録が消えることがあります。\n" +
              "端末に保管しておきますか？"
          );
          if (ok) location.href = "/backup.html";
        } catch {}
      };

    window.__STORE_READY__ = true;
  } catch (e) {
    console.error("[store] init failed:", e);
    window.__STORE_ERROR__ = String((e && e.stack) || e);
  }
})();;