// ===================== 0. 基本設定 =====================
const VERSION      = 'v3';                 // ← 更新時は数字を変える
const CACHE_SHELL  = `shell-${VERSION}`;   // HTML等（アプリ骨格）
const CACHE_ASSETS = `assets-${VERSION}`;  // 画像・CSS・JS

// オフライン用
const OFFLINE_URL = '/offline.html';

// ===================== 1. プリキャッシュ（アプリ骨格） =====================
// ※ ここに入れるのは「絶対に落ちない & 最低限で成立する」ものだけ推奨
const SHELL = [
  '/',
  '/home.html',

  // diary / clip（端末機能の核）
  '/diary.html', '/diary-detail.html', '/diary-new.html', '/diary-list.html',
  '/clip.html',

  // 共通CSS/JS（今の構造に合わせて最低限）
  '/css/common.css',
  // どれが本命か揺れてるので「存在している方だけ」残す運用が安全。
  // いまのプロジェクトに合わせて必要な方に寄せてね。
  '/js/lib.js',
  '/js/store.js',

  OFFLINE_URL
];

// ===================== 1-A. install =====================
self.addEventListener('install', (evt) => {
  evt.waitUntil((async () => {
    const cache = await caches.open(CACHE_SHELL);

    // addAllは1つでも404だと全体が落ちやすいので、個別に入れる
    await Promise.all(
      SHELL.map(async (url) => {
        try {
          const req = new Request(url, { cache: 'reload' });
          const res = await fetch(req);
          if (res.ok) await cache.put(req, res.clone());
        } catch (e) {
          // オフライン等でもSW自体は生かす（最低限）
        }
      })
    );

    self.skipWaiting(); // 即時アクティブ化
  })());
});

// ===================== 2. activate（古いキャッシュ削除） =====================
self.addEventListener('activate', (evt) => {
  evt.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => ![CACHE_SHELL, CACHE_ASSETS].includes(k))
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// ===================== 3. fetch（ルーティング） =====================
self.addEventListener('fetch', (evt) => {
  const req = evt.request;

  // SWが触って良いのは基本GETだけ（POST等は壊しやすい）
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 外部オリジン（lh3.googleusercontent.com 等）は基本ノータッチ
  // ※必要なら後で「外部画像もキャッシュ」に変更できる
  if (url.origin !== self.location.origin) return;

  // ---- 3-A 相談支援ページ：常にネット ----
  if (url.pathname.startsWith('/support')) {
    evt.respondWith(fetch(req));
    return;
  }

  // ---- 3-B HTML ナビゲーション：NetworkFirst + fallback ----
  // 更新が反映されやすく、白紙事故も減る
  if (req.mode === 'navigate') {
    evt.respondWith(networkFirstHtml(req));
    return;
  }

  // ---- 3-C 画像・CSS・JS：Stale-While-Revalidate ----
  if (['image', 'style', 'script'].includes(req.destination)) {
    evt.respondWith(staleWhileRevalidate(req));
    return;
  }

  // ---- 3-D その他：CacheFirst（あれば）→ ネット ----
  evt.respondWith(cacheFirst(req));
});

// ===================== 4. SW 内ユーティリティ =====================

async function networkFirstHtml(request) {
  const cache = await caches.open(CACHE_SHELL);

  try {
    // ナビゲーションは「最新優先」
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      // HTMLはキャッシュ更新
      cache.put(request, fresh.clone());
      return fresh;
    }
    // 変な応答ならキャッシュへ
    const cached = await cache.match(request);
    return cached || cache.match(OFFLINE_URL);
  } catch (e) {
    // オフライン：キャッシュ or オフラインページ
    const cached = await cache.match(request);
    return cached || cache.match(OFFLINE_URL);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_ASSETS);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || caches.match(OFFLINE_URL);
}

async function cacheFirst(request) {
  const cached =
    (await caches.match(request)) ||
    (await (await caches.open(CACHE_ASSETS)).match(request));

  return cached || fetch(request).catch(() => caches.match(OFFLINE_URL));
}
