/*!
 * idb-keyval v6.2.0 | MIT License | https://github.com/jakearchibald/idb-keyval
 */
(function () {
  'use strict';
  function promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.oncomplete = request.onsuccess = () => resolve(request.result);
      request.onabort = request.onerror = () => reject(request.error);
    });
  }
  function createStore(dbName, storeName) {
    const request = indexedDB.open(dbName);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    const dbp = promisifyRequest(request);
    return (txMode, callback) =>
      dbp.then((db) => {
        const tx = db.transaction(storeName, txMode);
        const store = tx.objectStore(storeName);
        return callback(store).then((result) =>
          promisifyRequest(tx).then(() => result)
        );
      });
  }
  let defaultStore;
  function getDefaultStore() {
    if (!defaultStore) defaultStore = createStore('keyval-store', 'keyval');
    return defaultStore;
  }
  function get(key, store = getDefaultStore()) {
    return store('readonly', (s) => promisifyRequest(s.get(key)));
  }
  function set(key, value, store = getDefaultStore()) {
    return store('readwrite', (s) => {
      s.put(value, key);
      return promisifyRequest(s.transaction);
    });
  }
  window.idbKeyval = { get, set, createStore };
})();

/* ========= 共通ヘルパ ========= */

/** iframe 内でも “親 (top) の URL” を安全に取る */
window.__topHref = function () {
  try {
    return window.top.location.href;
  } catch (e) {
    return window.location.href;
  }
};

/** クエリは必ず top URL から取る */
window.__topParams = function () {
  try {
    return new URL(window.__topHref()).searchParams;
  } catch (e) {
    return new URL(window.location.href).searchParams;
  }
};

/** GAS WebApp の /exec or /dev を含む “ベース URL” を作る（クエリ無し） */
window.__execBase = function () {
  const href = window.__topHref();
  let u;
  try {
    u = new URL(href);
  } catch (e) {
    return '';
  }

  // pathname 例: /a/.../macros/s/AKfy.../exec
  let base = u.origin + u.pathname;

  // 末尾スラッシュを除去
  base = base.replace(/\/+$/, '');

  return base;
};

/**
 * どのページからも確実に top を遷移させる（唯一の go）
 * - ?page=... のような相対 URL は execBase を付与して “絶対 URL” にする
 */
window.go = function (url) {
  try {
    const base = window.__execBase() || '';
    let dest = String(url || '');

    // すでに絶対 URL ならそのまま
    if (/^https?:\/\//i.test(dest)) {
      window.top.location.href = dest;
      return;
    }

    // "?page=xxx" / "&..." は base に連結
    if (dest.startsWith('?') || dest.startsWith('&')) {
      dest = base + dest;
    } else if (dest.startsWith('/')) {
      // ルート相対は origin に
      const u = new URL(base || window.location.href);
      dest = u.origin + dest;
    } else {
      // その他は base 相対として扱う
      dest = base + '/' + dest.replace(/^\.?\//, '');
    }

    window.top.location.href = dest;
  } catch (e) {
    /* 最後の保険 */
    try {
      window.location.href = url;
    } catch (_) {}
  }
};
