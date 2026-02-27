// ======================================================
// Service Worker 登録 + 更新通知（更新ボタンで即時切替）
// ======================================================
(() => {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('/service-worker.js').then((reg) => {
    // 可能なら最新チェック
    reg.update?.().catch(() => {});

    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;

      nw.addEventListener('statechange', () => {
        // 新しいSWが "installed" になり、かつ既にcontrollerがある＝更新が来た状態
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(() => {
            // 押した瞬間の waiting を使う（タイミング事故回避）
            const w = reg.waiting;
            if (w) w.postMessage({ type: 'SKIP_WAITING' });
            else reg.update?.().catch(() => {}); // 念のため再チェック
          });
        }
      });
    });
  }).catch(() => {});

  // SWが切り替わったらリロードして確実に反映
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });

  function showUpdateBanner(onUpdate) {
    if (document.getElementById('sw-update-banner')) return;

    const bar = document.createElement('div');
    bar.id = 'sw-update-banner';
    bar.style.cssText = `
      position:fixed; left:12px; right:12px; bottom:12px; z-index:9999;
      padding:12px 12px; border-radius:14px;
      background:rgba(255,255,255,.95); box-shadow:0 10px 24px rgba(0,0,0,.18);
      font-family:"Noto Sans JP",system-ui,sans-serif; color:#333;
      display:flex; gap:10px; align-items:center; justify-content:space-between;
    `;
    bar.innerHTML = `
      <div style="font-size:14px; line-height:1.4;">
        🔄 更新があります。新しい内容に切り替えますか？
      </div>
      <button id="sw-update-btn" type="button"
        style="border:0; padding:10px 12px; border-radius:12px;
               background:#f29b8f; color:#fff; font-weight:700;">
        更新
      </button>
    `;
    document.body.appendChild(bar);

    const btn = document.getElementById('sw-update-btn');
    if (btn) btn.addEventListener('click', onUpdate);
  }
})();


// ======================================================
// GASテンプレ互換：フッター挿入 + クリップ制御 + iOSバックアップ案内
// ======================================================
document.addEventListener('DOMContentLoaded', () => {
  // 入口（必要ならここだけ変えれば全ページに効く）
  const HOME = '/home.html';

  // -------- 1) フッターナビ（GASと同じ構造） --------
  if (!document.querySelector('nav.footer-nav')) {
    const nav = document.createElement('nav');
    nav.className = 'footer-nav';
    nav.setAttribute('aria-label', 'フッターナビ');
    nav.innerHTML = `
      <div class="footer-nav-inner">
        <button id="clip-toggle" class="star-toggle-large" type="button"
                aria-pressed="false" title="このページをクリップ">☆</button>

        <a href="${HOME}" class="footer-link">メニュー</a>
        <a href="/clip.html" class="footer-link" aria-label="クリップページ"><span>☆ページ</span></a>
        <a href="/diary.html" class="footer-link">記録</a>
      </div>
    `;
    // 既存実装を尊重：body先頭に挿入
    document.body.insertBefore(nav, document.body.firstChild);
  }

  // -------- 2) クリップ制御（☆トグル） --------
  // 前提：store.js に window.loadClips / window.saveClips があること
  (async () => {
    const btn = document.getElementById('clip-toggle');
    if (!btn || !window.loadClips || !window.saveClips) return;

    // Firebase版の「ぶれないキー」：パス（例 /kuni3.html）
    const keyUrl = location.pathname;

    const title   = document.title || '';
    const preview = (document.querySelector('.clip-name')?.textContent || '').trim();

    const setActive = (on) => {
      btn.classList.toggle('active', !!on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    };

    const list0 = await window.loadClips();
    setActive(list0.some(c => c.url === keyUrl));

    btn.addEventListener('click', async () => {
      let list = await window.loadClips();
      const i  = list.findIndex(c => c.url === keyUrl);

      if (i === -1) {
        list.push({ url: keyUrl, title, preview, clippedAt: Date.now() });
        list = list.slice(-200);
        setActive(true);
      } else {
        list.splice(i, 1);
        setActive(false);
      }
      await window.saveClips(list);
    });
  })();

  // -------- 3) iPhone向け：初回だけバックアップ案内 --------
  window.__sasaeru = window.__sasaeru || {};
  window.__sasaeru.isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);

  window.__sasaeru.maybePromptBackupOnce = function () {
    try {
      if (!window.__sasaeru.isIOS()) return;

      const KEY = 'sasaeru_backup_prompt_shown';
      if (localStorage.getItem(KEY) === '1') return;

      localStorage.setItem(KEY, '1');

      const ok = confirm(
        '保存しました。\n\n' +
        'iPhoneでは環境により、記録が消えることがあります。\n' +
        '端末に保管しておきますか？'
      );

      // Firebase版：バックアップページURL（あなたの実ファイルに合わせる）
      if (ok) location.href = '/backup.html';
    } catch (e) {
      console.log(e);
    }
  };
});