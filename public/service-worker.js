/* public/service-worker.js */
'use strict';

// ===================== 0. 基本設定 =====================
// ★更新時は VERSION を変える運用のままでもOK（当面 v4 のままでも動く）
const VERSION      = 'v6';
const CACHE_SHELL  = `shell-${VERSION}`;   // HTML等（アプリ骨格）
const CACHE_ASSETS = `assets-${VERSION}`;  // 画像・CSS・JS

// オフライン用（navigate時のみ）
const OFFLINE_URL = '/offline.html';

// ===================== 1. プリキャッシュ（アプリ骨格） =====================
// ※ ここに入れるのは「読む＋日記（画面）」の最低限だけ
const SHELL = [
  '/',
  '/index.html',
  '/home.html',

  '/kodomo.html',
  '/kodomo2.html',
  '/kodomo3.html',
  '/kodomo4.html',
  '/kodomo5.html',
  '/kodomo6.html',

  '/dankai1.html',
  '/dankai2.html',
  '/dankai3.html',
  '/dankai4.html',
  '/dankai5.html',

  '/kuni.html',
  '/kuni1.html',
  '/kuni2.html',
  '/kuni3.html',
  '/kuni4.html',
  '/kuni5.html',

  '/message.html',

  '/step1.html',
  '/step1-2.html',
  '/step1-3.html',
  '/step1-4.html',
  '/step1-5.html',

  '/step2.html',
  '/step2-2.html',
  '/step2-3.html',
  '/step2-4.html',

  '/step3.html',
  '/step3-2.html',
  '/step3-3.html',
  '/step3-4.html',
  '/step3-5.html',

  '/renkei1.html',
  '/renkei2.html',
  '/renkei3.html',

  '/sankou.html',

  // ★タイポ修正
  '/manabi-school.html',

  // diary / clip（端末機能の核）
  '/diary.html', '/diary-detail.html', '/diary-new.html', '/diary-list.html',
  '/clip.html',

  // 共通CSS/JS（芯）
  '/css/common.css',
  '/js/common.js',
  '/js/lib.js',
  '/js/store.js',

  // ★PWA（manifest / icons）
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png',

  OFFLINE_URL
];

// ===================== 1-A. install =====================
// ★ここが重要：self.skipWaiting() をしない（＝waiting を作って更新ボタンで切替）
self.addEventListener('install', (evt) => {
  evt.waitUntil((async () => {
    const cache = await caches.open(CACHE_SHELL);

    await Promise.all(
      SHELL.map(async (url) => {
        try {
          const req = new Request(url, { cache: 'reload' });
          const res = await fetch(req);
          if (res && res.ok) await cache.put(req, res.clone());
        } catch (e) {}
      })
    );

    // self.skipWaiting();  ← ★削除（更新ボタン方式）
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

// ===================== 2-A. message（更新ボタン→即時切替） =====================
// ★common.js の「更新」ボタンから postMessage({type:'SKIP_WAITING'}) を受ける
self.addEventListener('message', (evt) => {
  if (evt.data && evt.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// ===================== 3. fetch（ルーティング） =====================
self.addEventListener('fetch', (evt) => {
  const req = evt.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // ---- 3-A スプレッド連携ページ：常にネット（＝溜めない） ----
  const SPREAD_PAGES = [
    '/center', '/center.html',
    '/center2', '/center2.html',
    '/center3', '/center3.html',

    '/freeschool', '/freeschool.html',
    '/freeschool2', '/freeschool2.html',
    '/freeschool3', '/freeschool3.html',

    '/soudankikan', '/soudankikan.html',
    '/soudankikan2', '/soudankikan2.html',
  ];
  if (SPREAD_PAGES.includes(url.pathname)) {
    evt.respondWith(fetch(req));
    return;
  }

  // ---- 3-B API/JSON（データ取得系）：常にネット（＝溜めない） ----
  // ★ただし manifest.json は PWA の要なので例外
  const isManifest = (url.pathname === '/manifest.json');

  const isDataFetch =
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/gas') ||
    url.pathname.startsWith('/data') ||
    url.pathname.endsWith('.json') ||
    url.href.includes('script.google.com/macros/s/');
  if (isDataFetch && !isManifest) {
    evt.respondWith(fetch(req));
    return;
  }

  // ---- 3-C HTML ナビゲーション：本文もキャッシュ優先（SWR） + fallback（OFFLINEはここだけ） ----
  // ★ここが重要：network-first → stale-while-revalidate（本文も軽く）
  if (req.mode === 'navigate') {
    evt.respondWith(staleWhileRevalidateHtml(req));
    return;
  }

  // ---- 3-D 画像・CSS・JS：Stale-While-Revalidate（OFFLINE返さない） ----
  if (['image', 'style', 'script'].includes(req.destination)) {
    evt.respondWith(staleWhileRevalidate(req));
    return;
  }

  // ---- 3-E その他：CacheFirst → ネット（OFFLINE返さない） ----
  evt.respondWith(cacheFirst(req));
});

// ===================== 4. SW 内ユーティリティ =====================

// 本文（HTML）用：SWR（キャッシュを先に返し、裏で更新して次回に反映）
async function staleWhileRevalidateHtml(request) {
  const cache = await caches.open(CACHE_SHELL);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);

  // 本文は「まずキャッシュ」→なければネット→それでもダメなら offline
  return cached || (await fetchPromise) || cached || cache.match(OFFLINE_URL);
}

// （残しておいてOK：使わないが、比較や戻す時に便利）
async function networkFirstHtml(request) {
  const cache = await caches.open(CACHE_SHELL);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      cache.put(request, fresh.clone());
      return fresh;
    }
    const cached = await cache.match(request);
    return cached || cache.match(OFFLINE_URL);
  } catch (e) {
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

  // 画像/CSS/JSは、オフライン時に無理に offline.html を返さない
  return cached || (await fetchPromise) || new Response('', { status: 504 });
}

async function cacheFirst(request) {
  const cached =
    (await caches.match(request)) ||
    (await (await caches.open(CACHE_ASSETS)).match(request));

  // その他リソースも、オフライン時は空レスポンスでOK
  return cached || fetch(request).catch(() => new Response('', { status: 504 }));
}