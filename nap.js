/* NAP.JS — Bảng mốc tích điểm nạp. Quà + vàng do SERVER (worker.js) tự gửi vào HỘP THƯ 📬 khi SePay báo có tiền.
   Gắn: <script src="nap.js?v=4"></script> ngay SAU game.js trong index.html.
   Firestore (client chỉ ĐỌC ở đây):
     topup/{uid}      = { points, totalVnd }     ← CHỈ server ghi
     topup_cfg/main   = { needs, rows, url, ... } ← CHỈ admin ghi
     mail_inbox/{uid}/msgs/{id}                   ← server gửi quà, người chơi bấm Nhận trong Hộp Thư
   Mốc nào có điểm >= mốc thì hiện "Đã nhận" (quà đã nằm trong Hộp Thư). */
(function () {
  const $ = id => document.getElementById(id);
  const esc = x => String(x).replace(/[<>&"]/g, '');
  const DEF_NEEDS = [150, 500, 1000, 2000, 5000, 10000, 20000];
  const N = { points: 0, needs: DEF_NEEDS.slice(), rows: [], url: 'nap.html', per1000: 3, goldPt: 10 };
  // Thu nho anh vat pham trong Hop Thu (thu qua nap + thu admin): anh khong co class se hien to bang anh goc
  (function () {
    if ($('mail-img-fix')) return;
    const st = document.createElement('style'); st.id = 'mail-img-fix';
    st.textContent = '.bm-info small img{height:22px!important;width:auto!important;max-width:30px!important;max-height:22px!important;vertical-align:middle;object-fit:contain;display:inline-block}';
    document.head.appendChild(st);
  })();
  const ready = () => typeof clUser !== 'undefined' && clUser && typeof clDb !== 'undefined' && clDb;

  function css() {
    if ($('ev-login-css')) return;
    const st = document.createElement('style'); st.id = 'ev-login-css';
    st.textContent = '.evl-box{max-width:460px;width:94%}.evl-list{max-height:70vh;overflow-y:auto;padding:2px 2px 6px}.evl-row{background:rgba(0,0,0,.35);border:2px solid #8b6b2e;border-radius:10px;padding:6px 8px;margin:8px 0}.evl-t{font-weight:900;color:#fde68a;font-size:13px;margin-bottom:5px}.evl-t b.ok{color:#4ade80}.evl-t b.no{color:#f87171}.evl-line{display:flex;gap:5px;align-items:stretch}.evl-slot{flex:1 1 0;min-width:0;aspect-ratio:1/1;background:rgba(0,0,0,.45);border:1px solid #6b5a3a;border-radius:7px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;color:#fff;font-weight:800;overflow:hidden}.evl-slot.empty{opacity:.55}.evl-slot .ic{font-size:22px;line-height:1.1}.evl-slot .ic img{height:26px;width:auto}.evl-slot .ic .hero-img{width:28px;height:28px}.evl-slot .ic .eq-img{height:28px;width:auto;max-width:100%}.evl-slot small{font-size:8px;font-weight:600;opacity:.85;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.evl-btn{flex:0 0 74px;border:2px solid #14532d;border-radius:9px;background:linear-gradient(#16a34a,#14532d);color:#fff;font-weight:900;font-size:13px;cursor:pointer}.evl-btn:disabled{background:#1f2937;border-color:#374151;color:#9ca3af;cursor:default}';
    document.head.appendChild(st);
  }

  async function load() {
    if (!ready()) return false;
    const uid = clUser.uid;
    try {
      const [p, c] = await Promise.all([
        clDb.collection('topup').doc(uid).get(),
        clDb.collection('topup_cfg').doc('main').get()
      ]);
      N.points = p.exists ? Number((p.data() || {}).points) || 0 : 0;
      const cfg = c.exists ? c.data() || {} : {};
      N.url = String(cfg.url || 'nap.html'); N.per1000 = Number(cfg.per1000) || 3; N.goldPt = Number(cfg.goldPt) || 10;
      N.needs = Array.isArray(cfg.needs) && cfg.needs.length ? cfg.needs.map(Number) : DEF_NEEDS.slice();
      N.rows = N.needs.map((_, i) => rwList((((cfg.rows || [])[i]) || {}).gifts).slice(0, EV_SLOTS));
      return true;
    } catch (e) { console.warn('nap load', e); return false; }
  }

  function render() {
    css();
    const m = $('qs-modal');
    const slot = r => { if (!r) return '<div class="evl-slot empty"></div>'; const i = rwInfo(r); return `<div class="evl-slot" title="${esc(i.name)}"><span>x${fmtN(i.n)}</span><span class="ic">${i.ico}</span><small>${esc(i.name)}</small></div>`; };
    const list = N.needs.map((need, i) => {
      const g = N.rows[i] || [], can = N.points >= need;
      const btn = !g.length ? '<button class="evl-btn" disabled>Chưa có quà</button>'
        : can ? '<button class="evl-btn" disabled>Đã nhận</button>' : '<button class="evl-btn" disabled>Chưa đạt</button>';
      return `<div class="evl-row"><div class="evl-t">Tích lũy ${fmtN(need)} điểm nhận : <b class="${can ? 'ok' : 'no'}">${fmtN(Math.min(N.points, need))}</b> / ${fmtN(need)}</div><div class="evl-line">${Array.from({ length: EV_SLOTS }, (_, k) => slot(g[k])).join('')}${btn}</div></div>`;
    }).join('');
    m.innerHTML = `<div class="md-box evl-box"><button class="md-x" onclick="document.getElementById('qs-modal').style.display='none'">✕</button><div class="hd-name" style="text-align:center;color:#fde047">Nạp Tích Điểm</div><div style="text-align:center;color:#a7f3d0;font-weight:800;margin:2px 0 4px">Điểm nạp của bạn: ${fmtN(N.points)} • 1.000đ = ${N.per1000} điểm<br><small style="color:#fde68a;font-weight:600">1 điểm = ${N.goldPt} vàng • Quà + vàng tự gửi vào 📬 Hộp Thư</small></div><div style="text-align:center;margin:6px 0"><button class="evl-btn" style="flex:none;padding:8px 18px" onclick="window.open('${esc(N.url)}','_blank')">💳 Nạp thêm</button> <button class="evl-btn" style="flex:none;padding:8px 14px;background:#1e3a8a;border-color:#1e40af" onclick="openNap()">↻ Làm mới</button></div><div class="evl-list">${list}</div></div>`;
    m.style.display = 'flex';
  }

  window.openNap = async function () {
    if (!ready()) return scToast('Hãy đăng nhập tài khoản trước');
    css(); const m = $('qs-modal');
    m.innerHTML = '<div class="md-box evl-box"><div class="hd-name" style="text-align:center;color:#fde047">Đang tải…</div></div>'; m.style.display = 'flex';
    if (!(await load())) { m.style.display = 'none'; return scToast('Không tải được dữ liệu nạp (mất mạng?)'); }
    render();
    try { if (typeof mailInboxFetch === 'function') mailInboxFetch(); } catch (e) {}   // lấy thư quà mới
  };

  // Nút nổi mở bảng mốc (bỏ đoạn này nếu bạn tự gắn onclick="openNap()" vào nút khác)
  const b = document.createElement('button'); b.textContent = '💳 Nạp'; b.onclick = () => openNap();
  b.style.cssText = 'position:fixed;top:64px;right:6px;z-index:90;padding:6px 10px;font-weight:900;font-size:12px;border-radius:16px;border:2px solid #fde047;background:linear-gradient(#ea580c,#9a3412);color:#fff;cursor:pointer';
  document.body.appendChild(b);
})();