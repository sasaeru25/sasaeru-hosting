<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>記録トップ</title>

  <!-- ★ PWA ------------------------------------------- -->
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#FFF9F2">

  <!-- 共通 CSS があればここで読み込む -->
  <link rel="stylesheet" href="/css/common.css">
  <!-- -------------------------------------------------- -->

  <style>
    :root{
      --bg:#FFF9F2; --accent:#FFDC65; --border:#e6e6e6;
      --purple:#6a1b9a; --safe-bottom:env(safe-area-inset-bottom);
      --sh-1:0 3px 10px rgba(0,0,0,.08); /* iPhone バックアップ案内用 */
    }
    body{background:var(--bg);}

    /* *******  以降 既存のスタイルそのまま ******* */
    .diary-page{box-sizing:border-box;max-width:560px;margin:0 auto;
      padding:18px 16px 28px;color:#333;
      font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans JP",sans-serif;
      text-align:center;}

    .page-head{display:flex;justify-content:center;margin-bottom:10px;}
    .page-head h2{margin:0;display:inline-flex;align-items:center;gap:10px;
      padding:10px 22px;border-radius:999px;background:#fff;
      border:1px solid var(--border);font-weight:900;font-size:1.05rem;}

    .guide-top{display:flex;justify-content:center;margin:10px 0 14px;}
    .guide-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;
      padding:10px 18px;border-radius:999px;background:#fff;border:1px solid #ddd;
      color:var(--purple);text-decoration:none;font-weight:900;
      box-shadow:0 6px 10px rgba(0,0,0,.08);}

    .actions{display:flex;justify-content:center;margin:6px 0 10px;}
    .btn-link{display:inline-flex;align-items:center;justify-content:center;
      min-height:64px;min-width:240px;padding:16px 20px;border-radius:18px;
      background:#fff;border:1px solid #ddd;text-decoration:none;
      color:#111;font-weight:900;font-size:1.15rem;
      box-shadow:0 10px 16px rgba(0,0,0,.10);}

    .section{margin-top:14px;background:#fff;border:1px solid #eee;border-radius:12px;
      padding:14px;box-shadow:0 3px 10px rgba(0,0,0,.06);text-align:left;}
    .section h3{margin:0 0 6px;font-size:1rem;font-weight:900;}

    .stat{font-size:12px;color:#666;margin:-2px 0 10px;text-align:center;}

    .banners{display:flex;flex-direction:column;gap:10px;}
    .banner{width:100%;appearance:none;border:none;cursor:pointer;
      background:var(--accent);border-radius:999px;padding:12px 16px;
      font-weight:900;font-size:1.05rem;text-align:center;
      box-shadow:0 6px 10px rgba(0,0,0,.10);}

    .empty{color:#666;text-align:center;margin:14px 0;line-height:1.9;}

    .bottom-row{margin-top:16px;display:flex;justify-content:flex-start;}
    .link{color:var(--purple);text-decoration:none;font-weight:900;}

    @media(max-width:430px){.btn-link{min-width:100%;}}

    main{padding-bottom:calc(28px + var(--safe-bottom));}

    /* ----- モーダル ----- */
    .modal[hidden]{display:none!important;}
    .modal{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);
      display:flex;align-items:flex-end;justify-content:center;padding:14px;}
    .sheet{width:min(640px,100%);max-height:85vh;background:#fff;border-radius:18px;
      box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden;display:flex;flex-direction:column;}
    .sheet-head{padding:12px 14px;border-bottom:1px solid #eee;
      display:flex;justify-content:space-between;align-items:center;}
    .chip{background:var(--accent);border-radius:999px;padding:6px 12px;font-weight:900;}
    .sheet-body{padding:14px;overflow:auto;}
    .fulltext{white-space:pre-wrap;line-height:1.75;font-size:1rem;}
    .sheet-actions{border-top:1px solid #eee;padding:12px 14px;display:flex;justify-content:flex-end;}
    .mbtn{padding:10px 16px;border-radius:12px;border:1px solid #ef4444;
      background:#fff;color:#ef4444;font-weight:900;cursor:pointer;}
    #m-close{border:1px solid #ddd;background:#fff;border-radius:12px;
      padding:8px 12px;font-weight:900;cursor:pointer;}

    /* iPhone バックアップ案内 */
    .backup-details{max-width:560px;margin:0 auto 10px;text-align:left;}
    .backup-details summary{background:#fff;border-radius:12px;padding:12px 14px;
      box-shadow:var(--sh-1);cursor:pointer;list-style:none;border:1px solid #eee;}
    .backup-details summary::-webkit-details-marker{display:none;}
    .backup-box{background:#fff;border-radius:12px;padding:12px 14px;margin-top:10px;
      box-shadow:var(--sh-1);border:1px solid #eee;}
    .muted{color:#666;font-size:.92rem;line-height:1.7;margin:0 0 10px;}
  </style>
</head>

<body>
<main class="diary-page">
  <div class="page-head"><h2>🐤 記録 🐤</h2></div>

  <div class="guide-top">
    <a class="guide-btn" href="?page=diary-guide">CLICK HERE</a>
  </div>

  <!-- iPhone だけに表示するバックアップ案内 -->
  <details id="backup-details" class="backup-details" hidden>
    <summary>🔒 端末にちゃんと残す（バックアップ）</summary>
    <div class="backup-box">
      <p class="muted">iPhone では環境により記録が消えることがあります。<br>
        念のため端末に残すことができます。</p>
      <a class="btn secondary" href="?page=backup">バックアップ画面を開く</a>
    </div>
  </details>

  <div class="actions">
    <a class="btn-link" href="?page=diary-new">＋ 新規作成</a>
  </div>

  <section class="section">
    <h3>最新の記録</h3>
    <div class="stat" id="stat"></div>

    <div class="banners" id="banners"></div>
    <div class="empty" id="empty" hidden>まだ記録がありません<br>「＋ 新規作成」から始めましょう</div>

    <div class="bottom-row">
      <a class="link" href="?page=diary-list">← 一覧表示</a>
    </div>
  </section>
</main>

<!-- モーダル -->
<div class="modal" id="modal" hidden>
  <div class="sheet">
    <div class="sheet-head">
      <span class="chip" id="m-date"></span>
      <button id="m-close">閉じる</button>
    </div>
    <div class="sheet-body"><div class="fulltext" id="m-body"></div></div>
    <div class="sheet-actions"><button class="mbtn" id="m-del">削除</button></div>
  </div>
</div>

<!-- ★ iPhone 判定でバックアップ案内を開放 -->
<script>
(() => {
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isIOS) document.getElementById('backup-details')?.removeAttribute('hidden');
})();
</script>

<!-- 共通 JS（Service Worker 登録など） -->
<script src="/js/common.js" defer></script>

<!-- ページ固有ロジック -->
<script type="module">
import { loadRecords, saveRecords } from '/js/store.js';   // ← path は環境に合わせて

/* -------------- DOM 取得 -------------- */
const $banners = document.getElementById('banners');
const $empty   = document.getElementById('empty');
const $stat    = document.getElementById('stat');

/* ---- モーダル ---- */
const $modal = document.getElementById('modal');
const $mDate = document.getElementById('m-date');
const $mBody = document.getElementById('m-body');
let current  = null;
const label  = d => `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;

const openModal = rec =>{
  current = rec;
  const d = new Date(rec.recordDate ?? rec.createdAt);
  $mDate.textContent = rec.dateText || label(d);
  $mBody.textContent = rec.content  || '';
  $modal.hidden = false;
};
const closeModal = () => { $modal.hidden = true; current = null; };
document.getElementById('m-close').onclick = closeModal;
$modal.onclick = e => { if (e.target === $modal) closeModal(); };
document.getElementById('m-del').onclick = async () =>{
  if (!current) return;
  if (!confirm('削除しますか？')) return;
  const list = await loadRecords();
  await saveRecords(list.filter(r => r.id !== current.id));
  closeModal();
  draw();
};

/* -------------- 描画 -------------- */
async function draw(){
  const list = (await loadRecords()).slice()
               .sort((a,b)=>(b.recordDate ?? b.createdAt) -
                             (a.recordDate ?? a.createdAt));

  $banners.innerHTML = '';
  if (!list.length){
    $empty.hidden = false;
    $stat.textContent = '保存件数: 0 / 最終記録: なし';
    return;
  }
  $empty.hidden = true;

  const newest = list[0];
  const ts     = newest.recordDate ?? newest.createdAt;
  $stat.textContent =
    `保存件数: ${list.length} / 最終記録: ${newest.dateText || label(new Date(ts))}`;

  list.slice(0,20).forEach(rec=>{
    const d   = new Date(rec.recordDate ?? rec.createdAt);
    const btn = document.createElement('button');
    btn.className = 'banner';
    btn.textContent = rec.dateText || label(d);
    btn.onclick     = () => openModal(rec);
    $banners.appendChild(btn);
  });
}

draw();
</script>
</body>
</html>
