/* /js/diary.js
   日記ページ共通初期化（完全端末保管：window.loadRecords/saveRecordsのみ使用）
   対応: diary（トップ）, diary-list（一覧）
*/
(() => {
  const ready = (fn) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  };

  const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);

  const pad2 = (n) => String(n).padStart(2, '0');
  const labelYMD = (ts) => {
    const d = new Date(ts);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };
  const labelYMDHM = (ts) => {
    const d = new Date(ts);
    return `${labelYMD(ts)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };

  const norm = (s) => String(s ?? '').toLowerCase().trim();
  const snippet = (t, n = 120) => {
    const s = String(t ?? '').trim();
    return s.length <= n ? s : s.slice(0, n) + '…';
  };

  const getStore = () => {
    const { loadRecords, saveRecords } = window;
    if (typeof loadRecords !== 'function' || typeof saveRecords !== 'function') return null;
    return { loadRecords, saveRecords };
  };

  // ------------- diary（トップ）-------------
  async function initDiaryTop() {
    const $banners = document.getElementById('banners');
    const $empty   = document.getElementById('empty');
    const $stat    = document.getElementById('stat');
    const $modal   = document.getElementById('modal');

    if (!$banners || !$empty || !$stat || !$modal) return;

    if (isIOS()) document.getElementById('backup-details')?.removeAttribute('hidden');

    const store = getStore();
    if (!store) {
      $stat.textContent = '読み込み準備中…（更新してみてください）';
      return;
    }
    const { loadRecords, saveRecords } = store;

    const $mDate  = document.getElementById('m-date');
    const $mBody  = document.getElementById('m-body');
    const $mClose = document.getElementById('m-close');
    const $mDel   = document.getElementById('m-del');

    let current = null;

    const openModal = (rec) => {
      current = rec;
      const ts = rec.recordDate ?? rec.createdAt;
      $mDate.textContent = rec.dateText || labelYMD(ts);
      $mBody.textContent = rec.content || '';
      $modal.hidden = false;
    };
    const closeModal = () => {
      $modal.hidden = true;
      current = null;
    };

    $mClose?.addEventListener('click', closeModal);
    $modal.addEventListener('click', (e) => { if (e.target === $modal) closeModal(); });

    $mDel?.addEventListener('click', async () => {
      if (!current) return;
      if (!confirm('削除しますか？')) return;

      const all = await loadRecords();
      await saveRecords(all.filter(r => String(r.id) !== String(current.id)));
      closeModal();
      await draw();
    });

    async function draw() {
      const list = (await loadRecords()).slice().sort((a, b) => {
        const ta = (a.recordDate ?? a.createdAt) ?? 0;
        const tb = (b.recordDate ?? b.createdAt) ?? 0;
        return tb - ta;
      });

      $banners.innerHTML = '';

      if (!list.length) {
        $empty.hidden = false;
        $stat.textContent = '保存件数: 0 / 最終記録: なし';
        return;
      }

      $empty.hidden = true;
      const newest = list[0];
      const nts = newest.recordDate ?? newest.createdAt;

      $stat.textContent = `保存件数: ${list.length} / 最終記録: ${newest.dateText || labelYMD(nts)}`;

      list.slice(0, 20).forEach((rec) => {
        const ts = rec.recordDate ?? rec.createdAt;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'banner';
        btn.textContent = rec.dateText || labelYMD(ts);
        btn.addEventListener('click', () => openModal(rec));
        $banners.appendChild(btn);
      });
    }

    draw();
  }

  // ------------- diary-list（一覧）-------------
  async function initDiaryList() {
    const $q     = document.getElementById('q');
    const $list  = document.getElementById('list');
    const $empty = document.getElementById('empty');
    const $modal = document.getElementById('modal');

    if (!$q || !$list || !$empty || !$modal) return;

    const store = getStore();
    if (!store) return;
    const { loadRecords, saveRecords } = store;

    const $mDate  = document.getElementById('m-date');
    const $mBody  = document.getElementById('m-body');
    const $mClose = document.getElementById('m-close');
    const $mDel   = document.getElementById('m-del');

    let current = null;
    let master = [];

    const openModal = (r) => {
      current = r;
      const ts = r.recordDate ?? r.createdAt;
      $mDate.textContent = r.dateText || labelYMD(ts);
      $mBody.textContent = r.content || '';
      $modal.hidden = false;
    };
    const closeModal = () => { $modal.hidden = true; current = null; };

    $mClose?.addEventListener('click', closeModal);
    $modal.addEventListener('click', (e) => { if (e.target === $modal) closeModal(); });

    async function refresh() {
      const all = await loadRecords();
      master = all.slice().sort((a, b) => {
        const ta = (a.recordDate ?? a.createdAt) ?? 0;
        const tb = (b.recordDate ?? b.createdAt) ?? 0;
        return tb - ta;
      });
    }

    async function deleteRecord(rec) {
      if (!rec) return;
      if (!confirm('削除しますか？')) return;

      const all = await loadRecords();
      await saveRecords(all.filter(r => String(r.id) !== String(rec.id)));

      if (current && String(current.id) === String(rec.id)) closeModal();
      await refresh();
      draw();
    }

    $mDel?.addEventListener('click', async () => { await deleteRecord(current); });

    function match(r, key) {
      if (!key) return true;
      const target = norm(r.content) + ' ' + norm(r.dateText);
      return target.includes(key);
    }

    function draw() {
      const key = norm($q.value);
      const items = master.filter(r => match(r, key));

      $list.innerHTML = '';
      if (!items.length) {
        $empty.hidden = false;
        return;
      }
      $empty.hidden = true;

      items.slice(0, 200).forEach((r) => {
        const card = document.createElement('div');
        card.className = 'card';

        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.addEventListener('click', () => openModal(r));

        const chip = document.createElement('div');
        chip.className = 'chip';
        const ts = r.recordDate ?? r.createdAt;
        chip.textContent = r.dateText || labelYMD(ts);

        const p = document.createElement('p');
        p.className = 'snippet';
        p.textContent = snippet(r.content, 120);

        meta.append(chip, p);

        const act = document.createElement('div');
        act.className = 'actions';

        const bOpen = document.createElement('button');
        bOpen.className = 'sbtn sbtn-open';
        bOpen.type = 'button';
        bOpen.textContent = '開く';
        bOpen.addEventListener('click', (e) => { e.stopPropagation(); openModal(r); });

        const bDel = document.createElement('button');
        bDel.className = 'sbtn sbtn-del';
        bDel.type = 'button';
        bDel.textContent = '削除';
        bDel.addEventListener('click', async (e) => { e.stopPropagation(); await deleteRecord(r); });

        act.append(bOpen, bDel);
        card.append(meta, act);
        $list.appendChild(card);
      });
    }

    const debounced = (() => {
      let t;
      return () => {
        clearTimeout(t);
        t = setTimeout(draw, 120);
      };
    })();

    $q.addEventListener('input', debounced);

    await refresh();
    draw();
  }

  // ------------- entry -------------
  ready(() => {
    const page = document.querySelector('main')?.dataset?.page || '';
    if (page === 'diary') initDiaryTop();
    if (page === 'diary-list') initDiaryList();
  });
})();
