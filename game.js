/* GAME.JS — toàn bộ JS của game gộp thành 1 file (trước đây ~100 file). Mỗi khối bắt đầu bằng banner "=== đường-dẫn-cũ ===".
   Thứ tự = thứ tự cũ trong index.html. Dữ liệu tướng nằm ở heros/hero-data.js (nạp ngay trước file này).
   Sửa xong nhớ tăng ?v= của game.js trong index.html để trình duyệt tải bản mới. */

/* === BỘ NẠP ẢNH NỀN (GP) — thay cho mọi chỗ "new Image().src = ..." nạp sẵn lúc khởi động ===
   Trước đây game nạp sẵn ~54 MB ảnh (mọi sprite tướng, thần thú, hiệu ứng) NGAY khi mở trang → mạng chậm thì đứng/lag, icon & khung hiện trễ, chỗ có chỗ không.
   Giờ: GP.add(url|[url], prio) xếp hàng, tối đa 2-3 ảnh cùng lúc, chỉ bắt đầu sau khi trang hiện xong + lúc rảnh.
     prio 0 = giao diện (icon, khung)   prio 1 = ảnh/sprite tướng ĐÃ SỞ HỮU   prio 2 = phần còn lại (chạy ngầm, bỏ qua khi bật Tiết kiệm dữ liệu / mạng 2G-3G).
   Ảnh nào cần gấp (vào trận, mở màn) thì trình duyệt vẫn tự tải khi hiển thị, GP chỉ làm nóng cache trước. === */
window.GP = (function () {
  const q = new Map();                       // url -> prio (đang chờ)
  const done = new Set();                    // đã xếp/ đã nạp
  const cn = navigator.connection || {};
  const slow = !!cn.saveData || /(^|-)(2g|3g)$/.test(cn.effectiveType || '');
  const MAX = slow ? 2 : 3;
  let active = 0, started = false, lastAct = Date.now(), timer = 0;
  ['pointerdown', 'touchstart', 'keydown'].forEach(ev => window.addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true, capture: true }));
  const hooks = [];
  function next(maxPrio) {
    let best = null, bp = 9;
    q.forEach((p, u) => { if (p < bp && p <= maxPrio) { bp = p; best = u; } });
    if (best === null) return null;
    q.delete(best); return best;
  }
  function load(u) {
    active++;
    const im = new Image(); im.decoding = 'async';
    im.onload = im.onerror = () => { active--; later(30); };
    im.src = u;
  }
  function later(ms) { clearTimeout(timer); timer = setTimeout(pump, ms); }
  function pump() {
    if (!started) return;
    // prio 0/1 (giao diện + tướng đã sở hữu): tối đa MAX ảnh cùng lúc
    while (active < MAX) { const u = next(1); if (u === null) break; load(u); }
    // prio 2 (phần ít cần): CHỈ 1 ảnh một lần, chỉ khi không còn việc gấp và người chơi đã ngừng chạm >1,5 giây
    if (active === 0 && q.size) {
      if (Date.now() - lastAct < 1500) return later(800);
      const u = next(2); if (u !== null) { load(u); }
    }
  }
  function add(urls, prio) {
    prio = prio == null ? 1 : prio;
    (Array.isArray(urls) ? urls : [urls]).forEach(u => {
      if (!u) return;
      if (prio >= 2 && slow) return;                       // mạng chậm/tiết kiệm dữ liệu: không nạp ngầm phần ít cần
      if (done.has(u)) { if (q.has(u) && q.get(u) > prio) q.set(u, prio); return; }   // đã xếp rồi: chỉ nâng ưu tiên
      done.add(u); q.set(u, prio);
    });
    if (started) later(0);
  }
  function start() { if (started) return; started = true; hooks.forEach(f => { try { f(); } catch (e) {} }); pump(); }
  const kick = () => setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(start, { timeout: 3000 }) : start()), 600);
  if (document.readyState === 'complete') kick(); else window.addEventListener('load', kick);
  return { add, start, onStart: f => hooks.push(f) };
})();

/* === heros/hero-loader.js (viết lại, không XHR) === */
/* === BỘ NẠP TƯỚC: đọc window.HERO_DATA (heros/hero-data.js) rồi dựng toàn bộ bảng dữ liệu mà các file khác dùng
   (HEROES, ROLE_DEFAULT, HERO_SND_SRC, SEQ, SEQ_IDLE, ...). Chạy ĐẦU TIÊN trong game.js. Không còn XHR đồng bộ → trang không bị đứng, mở file:// cũng chạy. === */
(function () {
  const base = 'heros/';
  const fix = (slug, p) => p ? base + slug + '/' + p : p;            // đường dẫn trong dữ liệu tính từ thư mục tướng

  const META = window.HERO_DATA.heroes;
  const T = { combat: {}, tia: {}, startProg: {}, border: {}, ultName: {}, role: {}, sound: {}, seq: {}, seqIdle: {}, skill: {}, ultFn: {} };
  META.forEach(m => {
    const id = m.id;
    T.combat[id] = m.combat; T.tia[id] = m.tia || 1; T.startProg[id] = { lv: m.constants.lv, star: m.constants.star };
    if (m.constants.border && m.constants.border !== 'orange') T.border[id] = m.constants.border;
    T.ultName[id] = m.constants.ultName; T.role[id] = m.role;
    if (m.audio) T.sound[id] = fix(m.slug, m.audio);
    if (m.idle) T.seqIdle[id] = m.idle;
    if (m.ultFn) T.ultFn[id] = m.ultFn;
    Object.keys(m.sprites || {}).forEach(k => { const s = Object.assign({}, m.sprites[k]); s.src = fix(m.slug, s.src); T.seq[k] = s; });
    Object.assign(T.skill, m.skillConfig || {});
  });

  // HEROES: đúng các trường như bản cũ (roster.js)
  T.heroes = META.map(m => {
    const h = { id: m.id, name: m.name, emoji: m.emoji, img: fix(m.slug, m.img), body: fix(m.slug, m.body) };
    if (m.bodyH) h.bodyH = m.bodyH;
    Object.assign(h, m.stats);
    const c = m.combat; h.def = c.def; h.dodge = c.dodge; h.acc = c.acc; h.crit = c.crit; h.critDmg = c.critDmg; h.tough = c.tough; h.pierce = c.pierce; h.block = c.block;
    h.tia = Math.max(1, Math.floor(m.tia || 1));
    return h;
  });

  // Chạy tuyệt kỹ theo tên hàm ghi trong dữ liệu (ultFn)
  window.heroUltFn = id => { const n = T.ultFn[id]; return n && typeof window[n] === 'function' ? window[n] : null; };
  window.HERO_META = META; window.HERO_T = T;
})();

;
/* === js/core/remote-config.js === */
/* CẤU HÌNH DO ADMIN CHỈNH (thông số tướng, Bảo Vật, trang bị, boss bang, Lò Luyện Hỏa)
   - Admin sửa ở trang riêng admin-config.html -> lưu Firestore 'game_config/main' (1 field 'json').
   - Game tải qua REST (không cần đăng nhập), cache ở localStorage 'game_cfg' (KHÔNG theo save/đám mây của người chơi).
     Mất mạng vẫn dùng bản cache; chưa có cấu hình thì dùng số mặc định trong code.
   - File này nạp ĐẦU TIÊN. Các file dữ liệu gọi cfgSnap(...) để lưu bản mặc định, cfgApply() ghi đè lên đúng đối tượng.
   Cấu trúc JSON:
     heroes:   { "<id>": { hp, atk, def, dodge, acc, crit, critDmg, tough, pierce, block, heal, spd, startRage, tia, role } }  (chỉ trường nào khác mặc định)
     treasure: { starAdd, maxLv, maxStar, kinds: { "<loại>": [ {base, per} | null, ... 3 dòng ] } }
     equip:    { maxLv, rewardEach, rewardStartLv, per: { hat, armor, sword, boots } }
     progress: { lvPerStar, maxStar, starNeedsLv, accLimitsLv, lvGrowthPct, starGrowthPct, skillGrowthPct, skillMax, costSilver, costRice, costGrowthPct }   (luật cấp/sao tướng)
     exp:      { base, growth }                                  (EXP lên cấp 2 • % tăng mỗi cấp)
     pve:      { silverBase, riceBase, growth, thanBase, tienBase, expBase, pillBase, extra: [ {t,n,...} ] }   (extra = thưởng thêm mỗi trận)
     foe:      { hp, atk, def, dodge, growth, bossMult, counts:[t1,t2,t3,t4], rules:[{from,to,c:[..]}] }   (địch PVE)
     boss:     { daily, baseHp, hpMult, ctMult, atkDiv, heroDmgMult, maxRounds, ptsPerDmg, killPts }
     guild:    { hp1, def1, atk, hp2, def2, pierce, heal, spd, critDmg, boss }     (mỗi cấp Lò Luyện Hỏa)
     stamina:  { max, regenSec, perWave, waves, pill }            (thể lực: tối đa • giây hồi 1 điểm • tốn/trận • số trận/Bàn • mỗi viên +bao nhiêu)
     recruit:  { lam|tim|ten: { cdMin, n, cost }, mergeCost, shardPerStar, weights: { "<idTướng>": trọng số } }   (Chiêu Mộ + ghép mảnh)
     pvp:      { power, hp, atk, def, hpMax, atkMax, defMax, rounds, flameWin, flameLose, flameCost }   (Tỷ Võ)
     mail:     { daily (1/0), days, gifts: [ {t,n,...} ], letters: [ {id,title,body,gifts,from,to} ] }   (Hộp Thư: quà hằng ngày + thư admin gửi)
     quest:    { tasks: { "<id>": { name, n, pts, off } }, chests: [ { pts, gifts: [ {t,n,...} ] } ] }    (Nhiệm Vụ / Tích Cực)
     event:    { list: [ { id, name, ico, kind: 'daily'|'once'|'soon', gifts, from, to, off } ] }        (Sự Kiện)
     misc:     { sweepN, ttFeed: {"Thú Hồn","Thú Linh"}, bagPrice: {"<vật phẩm>": giá bán}, bossBeastRage }
   Quà (reward) dùng chung 1 định dạng với Gift Code: { t: 'silver'|'rice'|'gold'|'than'|'tien'|'pill'|'hammer'|'exp'|'shard'|'treasure'|'tsshard'|'beast'|'tshard'|'item', n, id?, name?, ico? } */

const CFG_URL = 'https://firestore.googleapis.com/v1/projects/game-118e8/databases/(default)/documents/game_config/main';
let GAME_CFG = (() => { try { return JSON.parse(localStorage.getItem('game_cfg')) || {}; } catch (e) { return {}; } })();
const cfgBase = {};   // bản MẶC ĐỊNH nguyên gốc (chụp lúc file dữ liệu nạp, trước khi ghi đè)
function cfgSnap(name, v) { if (!(name in cfgBase)) cfgBase[name] = JSON.parse(JSON.stringify(v)); return v; }
function cfgGet(path, def) {
  let o = GAME_CFG;
  for (const k of path.split('.')) { if (o === null || typeof o !== 'object') return def; o = o[k]; }
  return (o === undefined || o === null || o === '') ? def : o;
}
const cfgNum = (path, def) => { const v = Number(cfgGet(path, def)); return isFinite(v) ? v : def; };

// Các file dữ liệu đăng ký hàm đọc cấu hình: chạy ngay 1 lần khi đăng ký và chạy lại mỗi lần cfgApply (khi admin đổi số).
const cfgHooks = [];
function cfgOnApply(fn) { cfgHooks.push(fn); try { fn(); } catch (e) { console.warn('cfgHook', e); } }

// ----- Quà (reward): cùng định dạng với Gift Code. Dùng cho Hộp Thư, Nhiệm Vụ, Sự Kiện. -----
const RW_DAN_ICO = f => ({ 'than-dan': IC_THAN, 'tien-dan': IC_TIEN, 'vien-the-luc': IC_PILL }[f] || '');
// ===== ICON TIỀN TỆ DÙNG CHUNG (muốn đổi icon vàng/bạc/gạo toàn game: sửa 3 dòng này) =====
const IC_GOLD = '💰', IC_SILVER = '🥈', IC_RICE = '🍚';
const IC_THAN = '🟣', IC_TIEN = '🔴', IC_PILL = '💊', IC_PEACH = '🍑';   // Thần Đan / Tiên Đan / Viên Thể Lực / Đào Tiên
const RW_GOLD_ICO = IC_GOLD;
// ICON ẢNH dùng chung (nơi nào có ảnh thì hiện ảnh, ảnh lỗi/chưa có thì tự về emoji). Chỉ dùng trong HTML (innerHTML), KHÔNG dùng trong alert / toast chữ thuần.
const ICO_SRC = { silver: 'giao-dien/icon-home/thoi-bac.webp', rice: 'giao-dien/icon-home/gao.webp', gold: 'giao-dien/icon-home/thoi-vang.webp', than: 'vat-pham-game/than-dan.webp', tien: 'vat-pham-game/tien-dan.webp', pill: 'vat-pham-game/vien-the-luc.webp', hammer: 'vat-pham-game/trang-bi/icon_hao_thien_chuy_khong_ten.webp' };
const ICO_EMO = { silver: IC_SILVER, rice: IC_RICE, gold: IC_GOLD, than: IC_THAN, tien: IC_TIEN, pill: IC_PILL, hammer: '🔨' };
const icoImg = (k, h) => `<img class="gi-g" src="${ICO_SRC[k]}" alt="${ICO_EMO[k]}" style="height:${h || '1.15em'};width:auto" onerror="this.outerHTML='${ICO_EMO[k]}'">`;
const rwOk = r => !!(r && r.t && Number(r.n) > 0);
const rwList = v => (Array.isArray(v) ? v : []).filter(rwOk);
// Trả { ico (HTML), name, n } để hiển thị 1 phần quà
function rwInfo(r) {
  const n = Math.floor(Number(r.n)) || 0;
  const simple = { silver: [icoImg('silver'), 'Bạc'], rice: [icoImg('rice'), 'Gạo'], gold: [icoImg('gold'), 'Vàng'], than: [icoImg('than'), 'Thần Đan'], tien: [icoImg('tien'), 'Tiên Đan'], pill: [icoImg('pill'), 'Viên Thể Lực'], hammer: [icoImg('hammer'), 'Búa'], exp: ['✨', 'EXP'] };
  if (simple[r.t]) return { ico: simple[r.t][0], name: simple[r.t][1], n };
  // ẢNH luôn ưu tiên (không phụ thuộc admin): có ảnh thì hiện ảnh, thiếu ảnh / lỗi mới về emoji
  const safe = (fn, emo) => { try { const v = fn(); return v || emo; } catch (e) { return emo; } };
  const tsImgH = id => safe(() => (typeof TS_IMG !== 'undefined' && TS_IMG[id]) ? `<img class=\"eq-img\" src=\"${TS_IMG[id]}\" onerror=\"this.outerHTML='🏺'\">` : '', '🏺');
  if (r.t === 'shard') { let nm = 'tướng #' + r.id, ic = '🧩'; try { const h = heroById(Number(r.id)); nm = h.name; ic = h.img ? `<img class=\"hero-img\" src=\"${h.img}\" onerror=\"this.outerHTML='🧩'\">` : (h.emoji || '🧩'); } catch (e) {} return { ico: ic, name: 'Mảnh ' + nm, n }; }
  if (r.t === 'treasure') { let nm = 'Bảo Vật'; try { nm = TS_DEFS[r.id].name; } catch (e) {} return { ico: tsImgH(r.id), name: nm, n }; }
  if (r.t === 'tsshard') { let nm = 'Bảo Vật'; try { nm = TS_DEFS[r.id].name; } catch (e) {} return { ico: tsImgH(r.id), name: 'Mảnh ' + nm, n }; }
  if (r.t === 'linhthu') { let nm = 'Linh Thú'; try { nm = LT_DEFS[r.id].name; } catch (e) {} return { ico: safe(() => (typeof LT_IMG !== 'undefined' && LT_IMG[r.id]) ? `<img class=\"eq-img\" src=\"${LT_IMG[r.id]}\" onerror=\"this.outerHTML='🐾'\">` : (LT_DEFS[r.id].emo || '🐾'), '🐾'), name: nm, n }; }
  if (r.t === 'ltshard') { let nm = 'Linh Thú'; try { nm = LT_DEFS[r.id].name; } catch (e) {} return { ico: safe(() => (typeof LT_IMG !== 'undefined' && LT_IMG[r.id]) ? `<img class=\"eq-img\" src=\"${LT_IMG[r.id]}\" onerror=\"this.outerHTML='🧩'\">` : (LT_DEFS[r.id].emo || '🧩'), '🧩'), name: 'Mảnh ' + nm, n }; }
  if (r.t === 'beast') return { ico: safe(() => (typeof ttImg === 'function' && typeof TT_SLUG !== 'undefined' && TT_SLUG[r.name]) ? ttImg(r.name) : '', '🦄'), name: 'Thần thú ' + (r.name || ''), n: 1 };
  if (r.t === 'tshard') return { ico: safe(() => (typeof gdIco === 'function') ? gdIco('Châu ' + (r.name || ''), '🧩') : '', '🧩'), name: 'Mảnh ' + (r.name || ''), n };
  if (r.t === 'item') return { ico: (typeof gdIco === 'function' ? gdIco(r.name || '', r.ico || '🎁') : (r.ico || '🎁')), name: r.name || 'Vật phẩm', n };
  return { ico: '🎁', name: String(r.t), n };
}
const rwText = r => { const i = rwInfo(r); return i.ico + ' ' + (typeof fmtN === 'function' ? fmtN(i.n) : i.n) + ' ' + i.name; };
const rwTextAll = L => rwList(L).map(rwText).join(' • ');
// Nhận cả danh sách quà (dùng gcGrant của giftcode.js). Trả chuỗi mô tả những gì đã nhận.
function rwGrantAll(L) { const got = []; rwList(L).forEach(r => { try { const t = gcGrant(r); if (t) got.push(t); } catch (e) {} }); return got.join(', '); }

// Ghi đè chỉ số cơ bản tướng. Trả { stat, role } cho statOv / roleOv (chỉ phần Nộ khởi đầu & chất tướng đi đường này).
function cfgHeroPatch() {
  const ov = GAME_CFG.heroes || {}, stat = {}, role = {};
  if (typeof HERO_DEFAULTS === 'undefined' || !cfgBase.hero) return { stat, role };
  Object.keys(HERO_DEFAULTS).forEach(id => {
    Object.assign(HERO_DEFAULTS[id], cfgBase.hero[id]);
    const c = ov[id]; if (!c) return;
    Object.keys(c).forEach(k => {
      if (k === 'role') role[id] = c[k];
      else if (k === 'startRage') (stat[id] = stat[id] || {}).startRage = Number(c[k]);
      else if (k in HERO_DEFAULTS[id] && isFinite(Number(c[k]))) HERO_DEFAULTS[id][k] = Number(c[k]);
    });
  });
  return { stat, role };
}

function cfgApply(refresh) {
  try {
    if (typeof statOv !== 'undefined' && typeof applyStatOv === 'function' && cfgBase.hero) {
      const p = cfgHeroPatch(); statOv = p.stat; roleOv = p.role; applyStatOv();
    }
    if (typeof TS_DEFS !== 'undefined' && cfgBase.ts) {
      const kinds = cfgGet('treasure.kinds', {});
      Object.keys(TS_DEFS).forEach(k => TS_DEFS[k].stats.forEach((st, i) => {
        const b = cfgBase.ts[k].stats[i], o = ((kinds[k] || [])[i]) || {};
        st[1] = isFinite(parseFloat(o.base)) ? +o.base : b[1]; st[2] = isFinite(parseFloat(o.per)) ? +o.per : b[2];
      }));
      TS_STAR_ADD = cfgNum('treasure.starAdd', cfgBase.tsStarAdd); TS_MAX = cfgNum('treasure.maxLv', cfgBase.tsMax); TS_STAR_MAX = cfgNum('treasure.maxStar', cfgBase.tsStarMax);
    }
    if (typeof EQUIP !== 'undefined' && cfgBase.eqper) {
      EQUIP.forEach((e, i) => { e.per = cfgNum('equip.per.' + e.k, cfgBase.eqper[i]); });
      EQUIP_MAX = cfgNum('equip.maxLv', cfgBase.eqMax);
      EQ_REWARD.each = cfgNum('equip.rewardEach', cfgBase.eqReward.each); EQ_REWARD.startLv = cfgNum('equip.rewardStartLv', cfgBase.eqReward.startLv);
    }
    if (typeof GD_PER !== 'undefined' && cfgBase.gdper) Object.assign(GD_PER, cfgBase.gdper, GAME_CFG.guild || {});
    if (typeof BOSS_CFG !== 'undefined' && cfgBase.boss) Object.assign(BOSS_CFG, cfgBase.boss, GAME_CFG.boss || {});
    if (typeof PVE_CFG !== 'undefined' && cfgBase.pve) Object.assign(PVE_CFG, cfgBase.pve, GAME_CFG.pve || {});
    if (typeof FOE_CFG !== 'undefined' && cfgBase.foe) Object.assign(FOE_CFG, cfgBase.foe, GAME_CFG.foe || {});
    if (typeof PROG_CFG !== 'undefined' && cfgBase.progress) { Object.assign(PROG_CFG, cfgBase.progress, GAME_CFG.progress || {}); try { progCfgSync(); } catch (e) {} }
    if (typeof EXP_CFG !== 'undefined' && cfgBase.exp) { Object.assign(EXP_CFG, cfgBase.exp, GAME_CFG.exp || {}); try { updateAccExp(); } catch (e) {} }
    cfgHooks.forEach(fn => { try { fn(); } catch (e) { console.warn('cfgHook', e); } });
    if (refresh) {
      try { if (typeof updateMailBadge === 'function') updateMailBadge(); } catch (e) {} try { if (typeof staRender === 'function') staRender(); } catch (e) {}
      try { renderHomeTeam(); } catch (e) {} try { updatePower(); } catch (e) {} try { if (typeof renderPvp === 'function') renderPvp(); } catch (e) {}
    }
  } catch (e) { console.warn('cfgApply', e); }
}

// Tải cấu hình mới nhất (gọi 1 lần lúc khởi động). Có thay đổi -> lưu cache + áp dụng ngay.
async function cfgFetch() {
  try {
    const r = await fetch(CFG_URL + '?t=' + Date.now(), { cache: 'no-store' });
    if (r.status === 404) { if (localStorage.getItem('game_cfg') !== null) { localStorage.removeItem('game_cfg'); GAME_CFG = {}; cfgApply(true); } return; }
    if (!r.ok) return;
    const d = await r.json(), txt = d && d.fields && d.fields.json && d.fields.json.stringValue;
    if (typeof txt !== 'string' || txt === localStorage.getItem('game_cfg')) return;
    GAME_CFG = JSON.parse(txt); localStorage.setItem('game_cfg', txt); cfgApply(true);
  } catch (e) { /* mất mạng: dùng bản cache */ }
}

;
/* === giang-ho/giangho.js === */
/* GIANG HỒ: Hang Tụ Linh + Danh Tướng Lầu
   - Hang Tụ Linh: 7 hạng (I–VII), mỗi lần đánh = 3 trận địch là tướng ngẫu nhiên, tốn 10 thể lực.
     Thắng đủ 3 trận: nhận 3–5 viên Đá đúng màu của hạng + 900 EXP. Có QUÉT (đánh nhanh) tối đa 3 lần/ngày cho cả Hang.
   - Danh Tướng Lầu: 15 tầng, bấm tầng nào đánh tầng đó với 1 tài khoản Tỷ Võ ngẫu nhiên, chỉ 1 trận. Thắng nhận VẬT PHẨM KỸ NĂNG (Bí Kíp / Yếu Quyết / Vô Tự Thiên Thư) ngẫu nhiên, số lượt rơi admin chỉnh bằng tower.skillMin / tower.skillMax.
   Admin chỉnh trong game_config (remote-config.js):  hang: {...}   tower: {...}   (xem HANG_CFG / TOWER_CFG bên dưới) */

function ghSoon(t) { alert(t + ': tính năng đang phát triển'); }

let ghB = null;   // trận Hang Tụ Linh đang đánh: { kind:'hang', tier }  (pve-battle.js đọc biến này)

// ================= CẤU HÌNH =================
const HANG_TIERS = [
  { n: 'I',   name: 'Đá Xanh Lá', img: 'da-xanh-la', ban: 'hang-1' },
  { n: 'II',  name: 'Đá Tím',     img: 'da-tim',     ban: 'hang-2' },
  { n: 'III', name: 'Đá Đen',     img: 'da-den',     ban: 'hang-3' },
  { n: 'IV',  name: 'Đá Vàng',    img: 'da-vang',    ban: 'hang-4' },
  { n: 'V',   name: 'Đá Cam',     img: 'da-cam',     ban: 'hang-5' },
  { n: 'VI',  name: 'Đá Đỏ',      img: 'da-do',      ban: 'hang-6' },
  { n: 'VII', name: 'Đá Trắng',   img: 'da-trang',   ban: 'hang-7' }
];
// sta: thể lực/lần đánh • gemMin/gemMax: số đá rơi • exp: EXP tài khoản • sweepPerDay: số lần quét/ngày
// bans[i]: độ mạnh địch hạng i+1 = như Bàn thứ ... của PVE (đếm liên tục, Ải a Bàn b = (a-1)*10+b) • counts: số tướng địch ở trận 1..3 (trận 3 là boss)
// on: 1 bật / 0 khóa cả Hang • lockMode: 'open' mở hết | 'clear' thắng hạng trước mới mở hạng sau | 'level' khóa theo cấp tài khoản (levels[i] = cấp tối thiểu của hạng i+1)
// sweepNeedClear: 1 = phải thắng hạng đó ít nhất 1 lần mới được Quét
const HANG_DEF = { on: 1, lockMode: 'open', sta: 10, gemMin: 3, gemMax: 5, exp: 900, sweepPerDay: 3, sweepNeedClear: 1, levels: [1, 5, 10, 15, 20, 25, 30], bans: [10, 20, 30, 40, 50, 60, 70], counts: [3, 4, 5] };
const HANG_CFG = cfgSnap('hang', JSON.parse(JSON.stringify(HANG_DEF)));   // bản sao: HANG_DEF giữ nguyên để làm số dự phòng
const hangArr = (k, i) => { const v = Number((HANG_CFG[k] || [])[i]); return v > 0 ? v : HANG_DEF[k][i]; };   // ô admin bỏ trống → dùng số mặc định
// floors: { "1": [quà...], "2": [...] } thưởng riêng từng tầng (admin cập nhật sau) • all: thưởng chung nếu tầng không có riêng
// quà cùng định dạng Gift Code: { t:'silver'|'rice'|'gold'|'than'|'tien'|'pill'|'exp'|'shard'|'item', n, ... }
// on / lockMode / levels giống Hang (levels[f-1] = cấp tối thiểu của tầng f)
const TOWER_DEF = { on: 1, lockMode: 'open', levels: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29], floors: {}, all: [], skillMin: 3, skillMax: 5 };   // skillMin/skillMax: số lượt rơi vật phẩm kỹ năng mỗi tầng thắng (floors/all cũ không còn dùng)
const TOWER_CFG = cfgSnap('tower', JSON.parse(JSON.stringify(TOWER_DEF)));
const towerLv = f => { const v = Number((TOWER_CFG.levels || [])[f - 1]); return v > 0 ? v : TOWER_DEF.levels[f - 1]; };
cfgOnApply(() => { Object.assign(HANG_CFG, cfgBase.hang, cfgGet('hang', {})); Object.assign(TOWER_CFG, cfgBase.tower, cfgGet('tower', {})); });

// Lưu dữ liệu Hang / Tháp lên đám mây cùng tài khoản: thêm 2 khóa vào danh sách đồng bộ (SV_KEYS của cloud.js)
function ghRegisterSave() { try { ['hang_state', 'tower_state', 'lk_state', 'bk_state', 'dt_state', 'tr_state', 'hero_exp'].forEach(k => { if (SV_KEYS.indexOf(k) < 0) SV_KEYS.push(k); }); } catch (e) {} }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ghRegisterSave); else ghRegisterSave();
// kiểm tra khóa: trả '' nếu mở, ngược lại là lý do khóa
function ghLockWhy(mode, clearedPrev, lvNeed, what) {
  if (mode === 'clear') return clearedPrev ? '' : `Hãy thắng ${what} trước`;
  if (mode === 'level') return accLevel >= lvNeed ? '' : `Cần đạt cấp ${lvNeed} để mở`;
  return '';
}

const ghToday = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const ghRand = (a, b) => { a = Math.floor(a); b = Math.max(a, Math.floor(b)); return a + Math.floor(Math.random() * (b - a + 1)); };
const ghGemImg = (t, px) => `<img src="vat-pham-game/da-linh/${t.img}.webp" alt="${t.name}" style="width:${px || 30}px;height:auto;vertical-align:middle">`;

// ================= HANG TỤ LINH =================
let hangState = null;   // đọc lười: file này nạp trước game-state.js nên chưa có loadJSON lúc nạp
const hangInit = () => { if (!hangState) { const s = loadJSON('hang_state'); hangState = { day: s.day || '', sweep: Math.max(0, s.sweep | 0), clear: s.clear && typeof s.clear === 'object' ? s.clear : {} }; } return hangState; };
const hangSave = () => saveJSON('hang_state', hangState);
function hangDay() { hangInit(); if (hangState.day !== ghToday()) { hangState.day = ghToday(); hangState.sweep = 0; hangSave(); } }
const hangSweepLeft = () => { hangDay(); return Math.max(0, (Number(HANG_CFG.sweepPerDay) || 0) - hangState.sweep); };
const hangWhy = i => ghLockWhy(HANG_CFG.lockMode, i === 0 || !!hangState.clear[i], hangArr('levels', i), 'Hạng ' + (HANG_TIERS[i - 1] || {}).n);
const hangOpen = i => !hangWhy(i);

function openHang() { if (Number(HANG_CFG.on) === 0) return scToast('Hang Tụ Linh đang tạm đóng'); renderHang(); switchScreen('hang'); }
function renderHang() {
  hangDay();
  const sta = document.getElementById('hg-sta'); if (sta) sta.innerText = `Thể lực ${staState.v}/${STA_MAX}`;
  const sw = document.getElementById('hg-sweep'); if (sw) sw.innerText = `Quét còn ${hangSweepLeft()}/${Number(HANG_CFG.sweepPerDay) || 0} lần hôm nay`;
  const L = document.getElementById('hg-list'); if (!L) return;
  const sta10 = Math.max(0, Math.floor(Number(HANG_CFG.sta) || 0));
  L.innerHTML = HANG_TIERS.map((t, i) => {
    const open = hangOpen(i), cleared = !!hangState.clear[i + 1];
    return `<div class="hg-row ${open ? '' : 'locked'}">` +
      `<div class="hg-art"><img class="hg-ban" src="giao-dien/hang-tu-linh/${t.ban}.webp" alt="Hạng Tụ Linh ${t.n}" draggable="false">` +
      `<div class="hg-drop"><span>Rớt: ${ghGemImg(t, 26)} <b>${HANG_CFG.gemMin}–${HANG_CFG.gemMax}</b> ${t.name}</span><span>✨ ${fmtN(HANG_CFG.exp)} EXP</span></div>` +
      `</div>` +
      `<div class="bd-btnrow"><button class="bd-go" onclick="hangStart(${i + 1})" ${open ? '' : 'disabled'}>Đánh (${sta10}⚡)</button>` +
      `<button class="bd-go sw" onclick="hangSweep(${i + 1})" ${open && (cleared || Number(HANG_CFG.sweepNeedClear) === 0) ? '' : 'disabled'}>Quét</button></div>` +
      `${open ? '' : `<div class="hg-lock">🔒 ${hangWhy(i)}</div>`}</div>`;
  }).join('');
}

function hangGrant(tier) {   // trả chuỗi mô tả thưởng
  const t = HANG_TIERS[tier - 1], n = ghRand(HANG_CFG.gemMin, HANG_CFG.gemMax);
  danAdd(t.name, '💎', n);   // ảnh hiển thị do gdIco() (js/social/guild-sub.js) tra theo tên
  const exp = Math.max(0, Math.floor(Number(HANG_CFG.exp) || 0)), up = exp && typeof addAccExp === 'function' ? addAccExp(exp) : 0;
  try { if (typeof renderBag === 'function' && document.getElementById('bag-modal').style.display === 'flex') renderBag(); } catch (e) {}
  return `💎 +${n} ${t.name}` + (exp ? `\n✨ +${fmtN(exp)} EXP` : '') + (up ? `\n🎉 Lên cấp ${accLevel}!` : '');
}
function hangSweep(tier) {
  hangDay();
  if (!hangOpen(tier - 1)) return scToast(hangWhy(tier - 1));
  if (Number(HANG_CFG.sweepNeedClear) !== 0 && !hangState.clear[tier]) return scToast('Hãy thắng hạng này 1 lần trước khi quét');
  if (hangSweepLeft() < 1) return scToast('Hôm nay hết lượt quét');
  if (!staSpend(Math.max(0, Math.floor(Number(HANG_CFG.sta) || 0)))) return scToast('Không đủ thể lực');
  hangState.sweep++; hangSave();
  pvpToast(`Quét Hang Tụ Linh - Hạng ${HANG_TIERS[tier - 1].n}\n` + hangGrant(tier), true);
  renderHang();
}
function hangStart(tier) {
  hangDay();
  if (Number(HANG_CFG.on) === 0) return scToast('Hang Tụ Linh đang tạm đóng');
  const i = tier - 1; if (!hangOpen(i)) return scToast(hangWhy(i));
  if (!team.length) { alert('Hãy chọn Đội ngũ ra trận trước!'); return; }
  if (!staSpend(Math.max(0, Math.floor(Number(HANG_CFG.sta) || 0)))) return scToast('Không đủ thể lực');
  ghBegin({ kind: 'hang', tier });
}
// Dựng trận PVE dùng chung cho Hang Tụ Linh và Luận Kiếm (giống pve/pve-start.js). g = { kind:'hang', tier } | { kind:'lk', ai }
function ghBegin(g) {
  battleToken++; playBattleOpen(); battleFast = false;
  pvp = null; bossB = null; ghB = g; pvpRound = 0; currentWave = 1; busy = false;
  document.getElementById('bf-units').innerHTML = '';
  const sel = teamSel();
  const pos = HERO_POS[Math.min(5, Math.max(1, sel.length))].map(p => [p[0], p[1] + HERO_DY]);
  const _tm = ttMine(); ttSetupUI(_tm, ttFake(g.kind + (g.tier || g.ai)));
  waveUnits = {
    heroes: sel.map((h, k) => {
      const s = heroBattleStats(h.id, false, ttBonus(_tm && _tm.pt));
      const u = makeUnit('hero', heroIcon(h), pos[k][0], pos[k][1], s.hp, s.atk, false, h.name);
      u.id = h.id; u.emoji = heroIcon(h); u.def = s.def; u.spd = s.spd; u.dodge = s.dodge; u.acc = s.acc; u.crit = s.crit; u.critDmg = s.critDmg; u.tough = s.tough; u.pierce = s.pierce; u.tia = s.tia || 1; u.block = s.block; u.regen = s.heal || 0; u.sk = skillMult(h.id); u.alwaysUlt = !!h.alwaysUlt; u.taunt = !!h.taunt; u.prio2 = !!h.prio2;
      u.rage = h.startRage || 0; grantStart(u); u.acted = false;
      return u;
    }),
    enemies: []
  };
  document.getElementById('battle-overlay').style.display = 'flex';
  loadWave();   // pve-battle.js thấy ghB → gọi ghLoadWave()
}
const HANG_WAVES = 3;
function ghLoadWave() {
  const tok = battleToken, g = ghB, lk = g.kind === 'lk';
  const bd = !!BD_MODES[g.kind], waves = ghWaves(g);
  document.getElementById('ui-stage-title').innerText = lk ? `Luận Kiếm - Ải ${g.ai}` : bd ? `${BD_MODES[g.kind].name} - Ải ${g.tier}` : `Hang Tụ Linh - Hạng ${HANG_TIERS[g.tier - 1].n}`;
  document.getElementById('ui-wave-title').innerText = lk ? 'Boss' : `Trận ${currentWave}/${waves}`;
  waveUnits.enemies.forEach(e => e.el.remove());
  let B, n, mult, boss = lk || currentWave === waves;
  if (lk) { B = Math.max(1, Math.floor(Number(LK_CFG.baseBan) || LK_DEF.baseBan)); n = Math.floor(Number(LK_CFG.bosses) || LK_DEF.bosses); mult = Math.pow(1 + (Number(LK_CFG.stepPct) >= 0 ? Number(LK_CFG.stepPct) : LK_DEF.stepPct) / 100, g.ai - 1); }
  else if (bd) { B = 1; n = bdCount(g.kind); mult = 1; }   // Bảo Khố / Đào Tiên: chỉ số boss đặt cứng bên dưới (bdApplyStats)
  else { B = Math.max(1, Math.floor(hangArr('bans', g.tier - 1))); n = Math.floor(hangArr('counts', currentWave - 1)); mult = 1; }
  mult *= Math.pow(foeNum(FOE_CFG.growth, 1.32), B - 1);
  if (boss) mult *= foeNum(FOE_CFG.bossMult, 1.2);
  n = Math.max(1, Math.min(5, n, enemyPool().length));
  const r = heroFoes(n, mult); if (bd) bdApplyStats(r.foes, g); else lccAddSoldiers(r, mult);   // Hang Tụ Linh: trận 2 tướng → thêm 3 Lính Cầm Cờ (Luận Kiếm bị chặn trong hàm)
  waveUnits.enemies = r.foes;
  document.getElementById('ui-enemy-name').innerText = (boss ? 'BOSS: ' : '') + r.picks.map(h => h.name.toUpperCase()).join(' • ');
  waveRound = 1;
  waveUnits.heroes.forEach(h => {
    h.acted = false; h.stun = 0; h.bleed = 0; h.bleedPct = 0; clearDebuffs(h); clearMods(h); grantStart(h);
    h.el.classList.remove('stunned');
    h.el.querySelectorAll('.bf-stun, .bf-bleed').forEach(ic => ic.remove());
  });
  clearDefBuff(waveUnits.heroes);
  busy = false; isPlayerTurn = true;
  refreshPanel();
  setTimeout(() => { if (tok === battleToken) autoStep(); }, 600);
}
const ghWaves = g => g.kind === 'lk' ? 1 : BD_MODES[g.kind] ? Math.max(1, Math.min(3, Math.floor(bdN(g.kind, 'waves')) || 1)) : HANG_WAVES;
function ghNextWave() { if (ghB.kind === 'lk') return ghFinish(true); if (currentWave < ghWaves(ghB)) { currentWave++; loadWave(); } else ghFinish(true); }
function ghFinish(win) {
  const g = ghB; closeBattle();
  if (!g) return;
  if (g.kind === 'lk') return lkFinish(g, win);
  if (BD_MODES[g.kind]) return bdFinish(g, win);
  if (win) {
    hangState.clear[g.tier] = 1; hangSave();
    pvpToast(`🏆 Hoàn thành Hang Tụ Linh - Hạng ${HANG_TIERS[g.tier - 1].n}!\n` + hangGrant(g.tier), true);
  } else pvpToast('💀 Thất bại! Đội ngũ đã gục ngã.\nĐã mất thể lực của lượt này.', false);
  renderHang();
}

// ================= BẢO KHỐ + ĐÀO TIÊN =================
// 10 ải (I–X), làm theo Hang Tụ Linh: tốn thể lực mỗi lần đánh, Quét tối đa N lần/ngày cho cả chế độ, thắng ải trước mới mở ải sau (lockMode 'clear').
// Địch: mỗi trận 3–5 boss (tướng ngẫu nhiên, tối đa 5 vì đội địch chỉ có 5 ô), CHỈ SỐ BOSS đặt cứng, con nào cũng như nhau: ải 1 = hp/atk/def/heal, mỗi ải sau × (1 + statPct%).
// Thưởng: ải 1 = reward, mỗi ải sau × rewardMul.  Bảo Khố: reward bạc + reward gạo.  Đào Tiên: reward quả Đào Tiên (1 quả = 300 EXP tướng).
// Admin chỉnh trong game_config: bk: {...}  dt: {...}  (cùng khóa với BD_DEF bên dưới, thêm rewardArr[10] / riceArr[10] = thưởng riêng từng ải, riceReward = gạo ải 1)
const BD_AI = 10;
const BD_MODES = {
  bk: { name: 'Bảo Khố',  screen: 'bk', ban: 'giang-ho/baokho-',  ext: 'webp', save: 'bk_state' },
  dt: { name: 'Đào Tiên', screen: 'dt', ban: 'giang-ho/daotien-', ext: 'webp', save: 'dt_state' },
  tr: { name: 'Trốn',     screen: 'tr', ban: 'giao-dien/tron/',   ext: 'webp', save: 'tr_state', ais: 7 }   // thưởng Búa 🔨
};
const BD_DEF = { on: 1, lockMode: 'clear', sta: 10, sweepPerDay: 3, sweepNeedClear: 1, waves: 3, bossMin: 3, bossMax: 5, levels: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19],
  hp: 5000, atk: 2500, def: 1500, heal: 500, statPct: 50, rewardMul: 5, reward: 20000 };
const BD_DEFS = { bk: BD_DEF, dt: Object.assign({}, BD_DEF, { reward: 25 }), tr: Object.assign({}, BD_DEF, { hp: 7000, atk: 5000, reward: 3 }) };   // Trốn: boss ải 1 = 7000 HP, công 5000; thưởng ải 1 = 3 búa, 7 ải
const BD_CFG = { bk: cfgSnap('bk', JSON.parse(JSON.stringify(BD_DEFS.bk))), dt: cfgSnap('dt', JSON.parse(JSON.stringify(BD_DEFS.dt))), tr: cfgSnap('tr', JSON.parse(JSON.stringify(BD_DEFS.tr))) };
cfgOnApply(() => { ['bk', 'dt', 'tr'].forEach(m => Object.assign(BD_CFG[m], cfgBase[m], cfgGet(m, {}))); });
const bdN = (m, k) => { const v = BD_CFG[m][k], n = Number(v); return v === '' || v == null || !isFinite(n) || n < 0 ? BD_DEFS[m][k] : n; };   // ô admin trống/sai → số mặc định
const bdCount = m => { const a = Math.max(1, Math.floor(bdN(m, 'bossMin'))), b = Math.max(a, Math.floor(bdN(m, 'bossMax'))); return ghRand(a, b); };   // mỗi trận có bossMin–bossMax con boss, MỖI con đều có chỉ số của ải đó
const bdLvNeed = (m, ai) => { const v = Number((BD_CFG[m].levels || [])[ai - 1]); return v > 0 ? v : BD_DEF.levels[ai - 1]; };
const bdStats = (m, ai) => { const f = Math.pow(1 + bdN(m, 'statPct') / 100, ai - 1); return { hp: Math.round(bdN(m, 'hp') * f), atk: Math.round(bdN(m, 'atk') * f), def: Math.round(bdN(m, 'def') * f), heal: Math.round(bdN(m, 'heal') * f) }; };
// Thưởng từng ải: nếu admin nhập riêng cho ải đó (rewardArr = bạc/Đào Tiên, riceArr = gạo) thì lấy đúng số đó;
// ô trống → tự tính: ải 1 = reward (gạo: riceReward, trống = bằng reward), mỗi ải sau × rewardMul.
const bdArr = (m, k, ai) => { const a = (BD_CFG[m][k] || [])[ai - 1], v = Number(a); return a === '' || a == null || !isFinite(v) || v < 0 ? null : v; };
function bdReward(m, ai, rice) {
  const o = bdArr(m, rice ? 'riceArr' : 'rewardArr', ai); if (o != null) return Math.round(o);
  let b = bdN(m, 'reward'); const rr = BD_CFG[m].riceReward;
  if (rice && rr !== '' && rr != null && isFinite(Number(rr)) && Number(rr) >= 0) b = Number(rr);
  return Math.round(b * Math.pow(bdN(m, 'rewardMul'), ai - 1));
}
function bdApplyStats(foes, g) {   // ghLoadWave gọi: ép chỉ số boss theo bảng
  const s = bdStats(g.kind, g.tier);
  foes.forEach(e => {
    e.max = e.hp = s.hp; e.atk = s.atk; e.def = s.def; e.regen = s.heal;
    if ('baseAtk' in e) e.baseAtk = s.atk; if ('baseDef' in e) e.baseDef = s.def; if ('maxHp' in e) e.maxHp = s.hp;
  });
}

const bdSt = {};
function bdInit(m) { if (!bdSt[m]) { const s = loadJSON(BD_MODES[m].save); bdSt[m] = { day: s.day || '', sweep: Math.max(0, s.sweep | 0), clear: s.clear && typeof s.clear === 'object' ? s.clear : {} }; } return bdSt[m]; }
const bdSave = m => saveJSON(BD_MODES[m].save, bdSt[m]);
function bdDay(m) { const s = bdInit(m); if (s.day !== ghToday()) { s.day = ghToday(); s.sweep = 0; bdSave(m); } return s; }
const bdSweepLeft = m => Math.max(0, bdN(m, 'sweepPerDay') - bdDay(m).sweep);
const bdWhy = (m, ai) => ghLockWhy(BD_CFG[m].lockMode, ai === 1 || !!bdInit(m).clear[ai - 1], bdLvNeed(m, ai), 'Ải ' + (ai - 1));
const bdOpen = (m, ai) => !bdWhy(m, ai);

function dtGive(n) { const s = gdSt(); (s.kho['Đào Tiên'] = s.kho['Đào Tiên'] || { ico: '🍑', qty: 0 }).qty += n; gdSave(s); }   // vào kho (Túi Đồ) giống Đá Linh / Sách kỹ năng
const dtQty = () => skbQty('Đào Tiên');
function bdGrant(m, ai) {   // trả chuỗi mô tả thưởng
  const n = bdReward(m, ai);
  if (m === 'bk') { const g = bdReward(m, ai, true); try { rwGrantAll(rwList([{ t: 'silver', n }, { t: 'rice', n: g }])); } catch (e) {} return `🥈 +${fmtN(n)} bạc\n🍚 +${fmtN(g)} gạo`; }
  if (m === 'tr') { try { rwGrantAll(rwList([{ t: 'hammer', n }])); } catch (e) {} return `🔨 +${fmtN(n)} Búa`; }
  dtGive(n);
  try { if (typeof renderBag === 'function' && document.getElementById('bag-modal').style.display === 'flex') renderBag(); } catch (e) {}
  return `🍑 +${fmtN(n)} Đào Tiên`;
}
function openBD(m) { if (Number(BD_CFG[m].on) === 0) return scToast(BD_MODES[m].name + ' đang tạm đóng'); renderBD(m); switchScreen(BD_MODES[m].screen); }
const openBaoKho = () => openBD('bk'), openDaoTien = () => openBD('dt'), openTron = () => openBD('tr');
function renderBD(m) {
  const M = BD_MODES[m]; bdDay(m);
  const sta = document.getElementById(m + '-sta'); if (sta) sta.innerText = `Thể lực ${staState.v}/${STA_MAX}`;
  const sw = document.getElementById(m + '-sweep'); if (sw) sw.innerText = `Quét còn ${bdSweepLeft(m)}/${bdN(m, 'sweepPerDay')} lần hôm nay`;
  const L = document.getElementById(m + '-list'); if (!L) return;
  const sta10 = Math.max(0, Math.floor(bdN(m, 'sta'))), roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  let h = '';
  for (let ai = 1; ai <= (M.ais || BD_AI); ai++) {
    const open = bdOpen(m, ai), cleared = !!bdSt[m].clear[ai], s = bdStats(m, ai), r = bdReward(m, ai);
    const rw = m === 'bk' ? `<span>🥈 <b>${fmtN(r)}</b> bạc</span><span>🍚 <b>${fmtN(bdReward(m, ai, true))}</b> gạo</span>` : m === 'tr' ? `<span>${icoImg('hammer', '1.2em')} <b>${fmtN(r)}</b> Búa</span>` : `<span>🍑 <b>${fmtN(r)}</b> Đào Tiên</span>`;
    h += `<div class="hg-row ${open ? '' : 'locked'}">` +
      `<div class="hg-art"><img class="hg-ban" src="${M.ban}${ai}.${M.ext}" alt="${M.name} ${roman[ai - 1]}" draggable="false">` +
      `<div class="bd-info">${rw}<span>❤️ ${fmtN(s.hp)} ⚔️ ${fmtN(s.atk)}</span></div>` +
      `</div>` +
      `<div class="bd-btnrow"><button class="bd-go" onclick="bdStart('${m}',${ai})" ${open ? '' : 'disabled'}>Đánh (${sta10}⚡)</button>` +
      `<button class="bd-go sw" onclick="bdSweep('${m}',${ai})" ${open && (cleared || bdN(m, 'sweepNeedClear') === 0) ? '' : 'disabled'}>Quét</button></div>` +
      `${open ? '' : `<div class="hg-lock">🔒 ${bdWhy(m, ai)}</div>`}</div>`;
  }
  L.innerHTML = h;
}
function bdStart(m, ai) {
  bdDay(m); const M = BD_MODES[m];
  if (Number(BD_CFG[m].on) === 0) return scToast(M.name + ' đang tạm đóng');
  if (!bdOpen(m, ai)) return scToast(bdWhy(m, ai));
  if (!team.length) { alert('Hãy chọn Đội ngũ ra trận trước!'); return; }
  if (!staSpend(Math.max(0, Math.floor(bdN(m, 'sta'))))) return scToast('Không đủ thể lực');
  ghBegin({ kind: m, tier: ai });
}
function bdSweep(m, ai) {
  bdDay(m); const M = BD_MODES[m];
  if (!bdOpen(m, ai)) return scToast(bdWhy(m, ai));
  if (bdN(m, 'sweepNeedClear') !== 0 && !bdSt[m].clear[ai]) return scToast('Hãy thắng ải này 1 lần trước khi quét');
  if (bdSweepLeft(m) < 1) return scToast('Hôm nay hết lượt quét');
  if (!staSpend(Math.max(0, Math.floor(bdN(m, 'sta'))))) return scToast('Không đủ thể lực');
  bdSt[m].sweep++; bdSave(m);
  pvpToast(`Quét ${M.name} - Ải ${ai}\n` + bdGrant(m, ai), true);
  renderBD(m);
}
function bdFinish(g, win) {   // ghFinish gọi
  const m = g.kind, M = BD_MODES[m]; bdDay(m);
  if (win) {
    bdSt[m].clear[g.tier] = 1; bdSave(m);
    pvpToast(`🏆 Vượt ${M.name} - Ải ${g.tier}!\n` + bdGrant(m, g.tier), true);
  } else pvpToast('💀 Thất bại! Đội ngũ đã gục ngã.\nĐã mất thể lực của lượt này.', false);
  renderBD(m);
}

// ================= SÁCH KỸ NĂNG (Bí Kíp / Yếu Quyết / Vô Tự Thiên Thư) =================
// Chỉ rơi ở Danh Tướng Lầu. Cấp kỹ năng 1→2 miễn phí; các cấp sau tốn sách theo bảng. cost[0] = lên cấp 3 … cost[7] = lên cấp 10. Admin chỉnh ở tab "Luận Kiếm & Sách".
const SKB_ITEMS = ['Bí Kíp', 'Yếu Quyết', 'Vô Tự Thiên Thư'];
const SKB_COST_DEF = [{ item: 'Bí Kíp', n: 10 }, { item: 'Bí Kíp', n: 20 }, { item: 'Yếu Quyết', n: 40 }, { item: 'Yếu Quyết', n: 80 }, { item: 'Vô Tự Thiên Thư', n: 100 }, { item: 'Vô Tự Thiên Thư', n: 200 }, { item: 'Vô Tự Thiên Thư', n: 400 }, { item: 'Vô Tự Thiên Thư', n: 1000 }];
const SKB_CFG = cfgSnap('skillbook', { cost: JSON.parse(JSON.stringify(SKB_COST_DEF)) });
// chi phí để LÊN cấp kỹ năng lv: null = miễn phí
function skbCost(lv) {
  if (lv <= 2) return null;
  const i = lv - 3, last = SKB_COST_DEF[SKB_COST_DEF.length - 1];
  if (i >= SKB_COST_DEF.length) return { item: last.item, n: last.n * Math.pow(2, i - SKB_COST_DEF.length + 1) };   // cấp vượt bảng (nếu admin nâng skillMax)
  const d = SKB_COST_DEF[i], r = (SKB_CFG.cost || [])[i] || {}, n = Math.floor(Number(r.n));
  return { item: SKB_ITEMS.includes(r.item) ? r.item : d.item, n: n >= 0 && r.n !== '' && r.n != null ? n : d.n };
}
const skbQty = name => { const e = (gdSt().kho || {})[name]; return e ? (e.qty | 0) : 0; };
function skbSpend(name, n) { const s = gdSt(); if (!s.kho[name] || s.kho[name].qty < n) return false; s.kho[name].qty -= n; gdSave(s); return true; }
function skbGive(name, n) { const s = gdSt(); (s.kho[name] = s.kho[name] || { ico: '📘', qty: 0 }).qty += n; gdSave(s); }
// Chặn nút "Nâng Kỹ Năng": trừ sách trước, nếu hàm gốc không nâng được thì hoàn lại
function skbInstall() {
  const o = window.upgradeHero; if (typeof o !== 'function' || o.__skb) return;
  const w = function (kind) {
    if (kind !== 'sk') return o.apply(this, arguments);
    const id = vmId, p = getProg(id);
    if (p.sk >= SKILL_MAX) return o.apply(this, arguments);
    const c = skbCost(p.sk + 1);
    if (c && c.n > 0) {
      if (skbQty(c.item) < c.n) return scToast(`Thiếu ${c.item} (${fmtN(skbQty(c.item))}/${fmtN(c.n)})`);
      skbSpend(c.item, c.n);
    }
    const before = getProg(id).sk, r = o.apply(this, arguments);
    if (c && c.n > 0 && getProg(id).sk <= before) skbGive(c.item, c.n);   // không nâng được → trả sách
    return r;
  };
  w.__skb = 1; window.upgradeHero = w;
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', skbInstall); else skbInstall();

// ================= LUẬN KIẾM =================
// Vào qua cánh cửa không gian, KHÔNG tốn thể lực, không giới hạn số trận. Mỗi trận = đánh 1 lượt với `bosses` boss PVE ngẫu nhiên.
// Thắng → sang ải kế tiếp, địch mạnh hơn stepPct% so với ải trước; rơi sách. Mỗi ngày đến resetHour giờ thì về ải 1.
const LK_DEF = { on: 1, resetHour: 5, bosses: 3, stepPct: 30, baseBan: 30, kinds: 1, qtyMin: 3, qtyMax: 5, maxTotal: 10, weights: [1, 1, 1], minAi: [1, 1, 1] };
const LK_CFG = cfgSnap('lk', JSON.parse(JSON.stringify(LK_DEF)));
cfgOnApply(() => { Object.assign(LK_CFG, cfgBase.lk, cfgGet('lk', {})); Object.assign(SKB_CFG, cfgBase.skillbook, cfgGet('skillbook', {})); });
let lkState = null;
const lkKey = () => { const d = new Date(Date.now() - (Number(LK_CFG.resetHour) >= 0 ? Number(LK_CFG.resetHour) : 5) * 3600e3); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
function lkInit() {
  if (!lkState) { const s = loadJSON('lk_state'); lkState = { day: s.day || '', ai: Math.max(1, s.ai | 0 || 1), wins: Math.max(0, s.wins | 0) }; }
  if (lkState.day !== lkKey()) { lkState.day = lkKey(); lkState.ai = 1; lkState.wins = 0; saveJSON('lk_state', lkState); }   // về ải 1 lúc resetHour hằng ngày
  return lkState;
}
const lkSave = () => saveJSON('lk_state', lkState);
const lkArr = (k, i) => { const v = Number((LK_CFG[k] || [])[i]); return v >= 0 && (LK_CFG[k] || [])[i] != null && (LK_CFG[k] || [])[i] !== '' ? v : LK_DEF[k][i]; };
function lkRollDrop(ai) {   // trả [{item, n}]
  const idx = [0, 1, 2].filter(i => lkArr('weights', i) > 0 && ai >= lkArr('minAi', i));
  const kinds = Math.max(1, Math.min(idx.length, Math.floor(Number(LK_CFG.kinds)) || 1)), out = [];
  if (!idx.length) return out;
  const pool = idx.slice();
  for (let k = 0; k < kinds && pool.length; k++) {
    let tot = pool.reduce((a, i) => a + lkArr('weights', i), 0), r = Math.random() * tot, pick = pool[pool.length - 1];
    for (const i of pool) { r -= lkArr('weights', i); if (r < 0) { pick = i; break; } }
    pool.splice(pool.indexOf(pick), 1);
    out.push({ item: SKB_ITEMS[pick], n: ghRand(Number(LK_CFG.qtyMin) >= 0 ? LK_CFG.qtyMin : 3, Number(LK_CFG.qtyMax) >= 0 ? LK_CFG.qtyMax : 5) });
  }
  const cap = Math.max(1, Math.floor(Number(LK_CFG.maxTotal)) || 10);
  while (out.reduce((a, x) => a + x.n, 0) > cap) { const big = out.reduce((a, x) => x.n > a.n ? x : a, out[0]); big.n--; }
  return out.filter(x => x.n > 0);
}
function openLuanKiem() {
  if (Number(LK_CFG.on) === 0) return scToast('Luận Kiếm đang tạm đóng');
  renderLk(); switchScreen('luankiem');
}
function renderLk() {
  lkInit();
  const set = (id, h) => { const e = document.getElementById(id); if (e) e.innerHTML = h; };
  const pct = Math.round((Math.pow(1 + (Number(LK_CFG.stepPct) >= 0 ? Number(LK_CFG.stepPct) : LK_DEF.stepPct) / 100, lkState.ai - 1) - 1) * 100);
  set('lk-ai', `Ải ${lkState.ai}`);
  set('lk-sub', `Địch ${pct > 0 ? 'mạnh hơn ải 1 +' + fmtN(pct) + '%' : 'ở mức khởi đầu'} • Đã thắng hôm nay: ${lkState.wins}`);
  const h = Number(LK_CFG.resetHour) >= 0 ? Number(LK_CFG.resetHour) : 5;
  set('lk-note', `Không tốn thể lực • không giới hạn lượt • về Ải 1 lúc ${h}:00 mỗi ngày<br>Rớt: ${LK_CFG.qtyMin}–${LK_CFG.qtyMax} quyển ${SKB_ITEMS.map(n => gdIco(n, '📘')).join(' ')} (ngẫu nhiên)`);
}
function lkEnter() {
  lkInit();
  if (Number(LK_CFG.on) === 0) return scToast('Luận Kiếm đang tạm đóng');
  if (!team.length) { alert('Hãy chọn Đội ngũ ra trận trước!'); return; }
  try { if (typeof qsAdd === 'function') qsAdd('lk'); } catch (e) {}   // Nhiệm Vụ "Tham gia Luận Kiếm"
  ghBegin({ kind: 'lk', ai: lkState.ai });
}
function lkFinish(g, win) {
  lkInit();
  if (win) {
    const drops = lkRollDrop(g.ai);
    drops.forEach(d => skbGive(d.item, d.n));
    lkState.ai = g.ai + 1; lkState.wins++; lkSave();
    try { if (typeof renderBag === 'function' && document.getElementById('bag-modal').style.display === 'flex') renderBag(); } catch (e) {}
    pvpToast(`🏆 Vượt Luận Kiếm Ải ${g.ai}!\n` + (drops.length ? drops.map(d => `📖 +${d.n} ${d.item}`).join('\n') : 'Không rơi sách') + `\nẢi tiếp theo: ${lkState.ai}`, true);
  } else pvpToast(`💀 Thất bại ở Ải ${g.ai}!\nBạn có thể thử lại ngay (không tốn thể lực).`, false);
  renderLk();
}

// ================= DANH TƯỚNG LẦU =================
const TOWER_FLOORS = 15;
// vị trí số tầng trên ảnh (tỉ lệ % của ảnh 941×1672): tầng 15 ở trên cùng, tầng 1 ở cửa dưới
const TOWER_Y = { 15: 185, 14: 252, 13: 325, 12: 402, 11: 482, 10: 566, 9: 653, 8: 742, 7: 832, 6: 930, 5: 1027, 4: 1130, 3: 1240, 2: 1355, 1: 1465 };
let towerState = null;
// Làm mới hằng ngày: sang ngày mới (mặc định 0h, admin đổi bằng tower.resetHour) thì xóa hết tầng đã chinh phục để đánh lại từ tầng 1
const towerKey = () => { const h = Number(TOWER_CFG.resetHour) >= 0 && TOWER_CFG.resetHour !== '' && TOWER_CFG.resetHour != null ? Number(TOWER_CFG.resetHour) : 0; const d = new Date(Date.now() - h * 3600e3); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const towerInit = () => {
  if (!towerState) { const s = loadJSON('tower_state'); towerState = { day: s.day || '', clear: s.clear && typeof s.clear === 'object' ? s.clear : {} }; }
  if (towerState.day !== towerKey()) { towerState.day = towerKey(); towerState.clear = {}; saveJSON('tower_state', towerState); }
  return towerState;
};
const towerSave = () => saveJSON('tower_state', towerState);
const towerWhy = f => { towerInit(); return ghLockWhy(TOWER_CFG.lockMode, f === 1 || !!towerState.clear[f - 1], towerLv(f), 'tầng ' + (f - 1)); };
const towerOpenF = f => !towerWhy(f);

function openTower() {
  if (Number(TOWER_CFG.on) === 0) return scToast('Danh Tướng Lầu đang tạm đóng');
  renderTower(); switchScreen('tower');
  setTimeout(() => { const s = document.getElementById('tw-scroll'); if (s) s.scrollTop = s.scrollHeight; }, 60);   // mở ra thấy tầng 1 ở dưới
}
function renderTower() {
  towerInit();
  const box = document.getElementById('tw-floors'); if (!box) return;
  let h = '';
  for (let f = 1; f <= TOWER_FLOORS; f++) {
    const done = !!towerState.clear[f], open = towerOpenF(f);
    h += `<button class="tw-f ${done ? 'done' : ''} ${open ? '' : 'lock'}" style="top:${TOWER_Y[f] / 1672 * 100}%" onclick="towerGo(${f})" aria-label="Tầng ${f}">${done ? '<i>✓</i>' : ''}</button>`;
  }
  box.innerHTML = h;
  const c = Object.keys(towerState.clear).length, ct = document.getElementById('tw-count'); if (ct) ct.innerText = `Đã chinh phục ${c}/${TOWER_FLOORS} tầng`;
}
// Danh Tướng Lầu: thưởng = VẬT PHẨM KỸ NĂNG. Mỗi tầng thắng rơi skillMin–skillMax lượt, mỗi lượt 1 loại ngẫu nhiên trong Bí Kíp / Yếu Quyết / Vô Tự Thiên Thư (trùng thì cộng dồn).
const towerSkillRange = () => { let a = Math.floor(Number(TOWER_CFG.skillMin)), b = Math.floor(Number(TOWER_CFG.skillMax)); if (!(a >= 1)) a = TOWER_DEF.skillMin; if (!(b >= 1)) b = TOWER_DEF.skillMax; if (b < a) [a, b] = [b, a]; return [a, b]; };
const towerRollGifts = () => {
  const [a, b] = towerSkillRange(), c = a + Math.floor(Math.random() * (b - a + 1)), got = {};
  for (let i = 0; i < c; i++) { const nm = SKB_ITEMS[Math.floor(Math.random() * SKB_ITEMS.length)]; (got[nm] = got[nm] || { t: 'item', name: nm, ico: '📘', n: 0 }).n += 1; }
  return Object.values(got);
};
async function towerGo(f) {
  towerInit();
  if (towerState.clear[f]) return scToast(`Tầng ${f} đã chinh phục`);
  if (Number(TOWER_CFG.on) === 0) return scToast('Danh Tướng Lầu đang tạm đóng');
  if (!towerOpenF(f)) return scToast(towerWhy(f));
  if (!team.length) { alert('Hãy chọn Đội ngũ ra trận trước!'); return; }
  const [sa, sb] = towerSkillRange();
  if (!confirm(`Tầng ${f}: khiêu chiến 1 người chơi ngẫu nhiên (chỉ 1 trận).\nThưởng: ${sa === sb ? sa : sa + '–' + sb} vật phẩm kỹ năng ngẫu nhiên (Bí Kíp / Yếu Quyết / Vô Tự Thiên Thư)\nBắt đầu?`)) return;
  if (!pvpOpps.length) {
    try { await Promise.resolve(pvpGenOpps()); } catch (e) {}
    for (let i = 0; i < 12 && !pvpOpps.length; i++) await sleep(300);
  }
  if (!pvpOpps.length) return scToast('Chưa có đối thủ, thử lại sau');
  startPvp(Math.floor(Math.random() * pvpOpps.length), f);   // pvp-battle.js: tham số 2 = số tầng
}
function ghTowerFinish(m, win, timeout) {   // pvp-battle.js gọi khi trận Tỷ Võ có m.tower
  towerInit(); const f = m.tower;
  if (win) {
    towerState.clear[f] = 1; towerSave();
    try { if (typeof qsAdd === 'function') qsAdd('dtl'); } catch (e) {}   // Nhiệm Vụ "Vượt ải Danh Tướng Lầu"
    const g = towerRollGifts(); let got = '';
    try { got = g.length ? rwGrantAll(g) : ''; } catch (e) {}
    pvpToast(`🏆 Chinh phục tầng ${f} Danh Tướng Lầu!` + (timeout ? `\n(hết ${PVP_MAX_ROUNDS} lượt, gây nhiều sát thương hơn)` : '') + (got ? `\n🎁 ${got}` : ''), true, { pvp: true, foe: m.opp && m.opp.name });
  } else pvpToast(`💀 Thua ở tầng ${f}${timeout ? ' (hết lượt)' : ''}!\nBạn có thể khiêu chiến lại tầng này.`, false, { pvp: true, foe: m.opp && m.opp.name });
  renderTower();
}

;
/* === js/core/navigation.js === */
/* CHUYỂN MÀN HÌNH CHÍNH (switchScreen)
   (tách từ index.html cũ — script) */

    function switchScreen(screenId) {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
      
      document.getElementById(`screen-${screenId}`).classList.add('active');
      const navBtn = document.getElementById(`nav-btn-${screenId}`);
      if(navBtn) navBtn.classList.add('active');
      
      if(['home','picker','vhub','bvhub','eqhub','lthub','guild','thanthu','dienvo','quest','daisanh','upg','team','tpick','ghep'].includes(screenId)) {
        document.getElementById('app-header').style.display = 'block';
        document.getElementById('app-nav').style.display = 'flex';
      } else {
        document.getElementById('app-header').style.display = 'none';
        document.getElementById('app-nav').style.display = 'none';
      }
    }

;
/* === js/battle/hero3d.js === */
/* HERO 3D: lớp Hero3D
   (tách từ index.html cũ — script) */

    // --- HERO 3D CLASS (Tích hợp sẵn) ---
    class Hero3D {
      constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.init();
      }
      init() {
        if (!this.container) return;
        this.container.innerHTML = '';
        this.stage = document.createElement('div');
        this.stage.className = 'hero-3d-stage';
        
        this.pedestal = document.createElement('div');
        this.pedestal.className = 'hero-3d-pedestal';
        this.pedestal.innerHTML = `<div class="pedestal-ring ring-outer"></div><div class="pedestal-ring ring-inner"></div><div class="taichi-symbol"></div>`;

        this.sprite = document.createElement('div');
        this.sprite.className = 'hero-3d-sprite idle';
        this.sprite.innerText = "🧙🏻‍♂️";

        this.aura = document.createElement('div');
        this.aura.className = 'hero-3d-aura';
        this.aura.innerHTML = `<div class="yin-yang-ball ball-left">☯</div><div class="yin-yang-ball ball-right">☯</div>`;

        this.shadow = document.createElement('div');
        this.shadow.className = 'hero-3d-shadow';

        this.stage.appendChild(this.pedestal);
        this.stage.appendChild(this.shadow);
        this.stage.appendChild(this.aura);
        this.stage.appendChild(this.sprite);
        this.container.appendChild(this.stage);
      }
      playAnimation(animName, duration = 1500) {
        this.sprite.className = 'hero-3d-sprite';
        this.aura.className = 'hero-3d-aura';
        this.stage.className = 'hero-3d-stage';
        setTimeout(() => {
          this.sprite.classList.add(animName);
          this.aura.classList.add(animName + '-aura');
          if (animName === 'skill') this.stage.classList.add('screen-shake');
        }, 10);
        if (animName !== 'idle') setTimeout(() => { this.playAnimation('idle', 0); }, duration);
      }
    }

;
/* === pve/pve-stages.js === */
/* PVE: chọn Ải / Bàn, tiến trình mở khóa
   (tách từ index.html cũ — script) */

    // --- PVE SYSTEM ---
    let progress = JSON.parse(localStorage.getItem('pve_progress')) || { maxStage: 1, maxBattle: 1 };

    function renderStages() {
      const container = document.getElementById('stage-list-container');
      let html = '<div class="stage-grid">';
      for (let i = 1; i <= 100; i++) {
        let isLocked = i > progress.maxStage;
        html += `
          <div class="stage-item ${isLocked ? 'locked' : ''}" onclick="${isLocked ? '' : `selectStage(${i})`}">
            ${isLocked ? '🔒 Ải ' + i : 'Ải ' + i}
          </div>
        `;
      }
      html += '</div>';
      container.innerHTML = html;
    }

    function selectStage(stageNum) {
      document.getElementById('pve-stage-screen').style.display = 'none';
      document.getElementById('pve-battle-screen').style.display = 'flex';
      document.getElementById('ui-selected-stage').innerText = `Ải ${stageNum} - Chọn Bàn`;

      const container = document.getElementById('battle-list-container');
      // Bàn 1 nằm DƯỚI CÙNG, bàn 2 ở trên nó... Chỉ hiện các bàn đã mở: xong bàn 1 thì bàn 2 mới hiện ra
      const shown = stageNum < progress.maxStage ? 10 : (stageNum === progress.maxStage ? progress.maxBattle : 0);
      container.style.display = 'flex'; container.style.flexDirection = 'column';
      let html = '<div class="battle-list" style="margin-top:auto">';
      for (let i = 10; i >= 1; i--) {
        if (i > shown) continue;
        let isLocked = false;
        if (stageNum === progress.maxStage && i > progress.maxBattle) isLocked = true;
        if (stageNum > progress.maxStage) isLocked = true;

        html += `
          <div class="battle-item ${isLocked ? 'locked' : ''}" onclick="${isLocked ? '' : `startBattleSequence(${stageNum}, ${i})`}">
            <div>
              <div class="battle-item-title">Bàn ${i} ${isLocked ? '🔒' : ''}</div>
              <div class="battle-item-desc">🥈 ${fmtN(banReward(stageNum, i).silver)} bạc • 🍚 ${fmtN(banReward(stageNum, i).rice)} gạo<br>${danIcoHTML('Thần Đan', '1.1em')} ${fmtN(banReward(stageNum, i).than)} Thần Đan • ${danIcoHTML('Tiên Đan', '1.1em')} ${fmtN(banReward(stageNum, i).tien)} Tiên Đan${banReward(stageNum, i).exp > 0 ? ' • ✨ ' + fmtN(banReward(stageNum, i).exp) + ' EXP' : ''}<br>⚡ Tốn ${STA_WAVES * STA_PER_WAVE} thể lực • ${pillPerClear() > 0 ? '💊 Thưởng ' + pillPerClear() + ' viên thể lực' : ''}${extraList().length ? '<br>🎁 Thêm: ' + extraRewardText() : ''}${stageNum === EQ_REWARD.stage && i === EQ_REWARD.battle ? '<br>🎁 Thưởng: ' + EQ_REWARD.each + ' Mũ, ' + EQ_REWARD.each + ' Áo, ' + EQ_REWARD.each + ' Kiếm, ' + EQ_REWARD.each + ' Giày' : ''}</div>
            </div>
            ${isLocked ? '<div class="battle-item-btn disabled">Chưa mở</div>' : `<div class="battle-btns">${isCleared(stageNum, i) ? `<div class="battle-item-btn sweep" onclick="event.stopPropagation();sweepBattle(${stageNum}, ${i})">Quét ×${SWEEP_N}<small>⚡${SWEEP_N * STA_WAVES * STA_PER_WAVE}</small></div>` : ''}<div class="battle-item-btn">Đánh ▶</div></div>`}
          </div>
        `;
      }
      html += '</div>';
      container.innerHTML = html;
      container.scrollTop = container.scrollHeight;   // cuộn xuống đáy để thấy bàn 1 và bàn đang đánh
    }

    // ===== QUÉT: đánh nhanh 10 lần 1 Bàn ĐÃ THẮNG, tốn 10 × 4 = 40 thể lực, nhận thưởng x10 (bạc, gạo, viên thể lực) =====
    let SWEEP_N = 10;   // số Bàn quét 1 lần — admin chỉnh: misc.sweepN
    cfgOnApply(() => { SWEEP_N = Math.max(1, Math.min(100, Math.floor(cfgNum('misc.sweepN', 10)))); });
    const isCleared = (stage, battle) => stage < progress.maxStage || (stage === progress.maxStage && battle < progress.maxBattle);
    function sweepBattle(stage, battle) {
      if (!isCleared(stage, battle)) return;
      const cost = SWEEP_N * STA_WAVES * STA_PER_WAVE;
      if (!staSpend(cost)) { alert('⚡ Không đủ thể lực để quét! Cần ' + cost + ' thể lực (có ' + staState.v + ').\nDùng 💊 Viên Thể Lực trong Túi đồ để hồi thêm.'); return; }
      const r = banReward(stage, battle); let extra = ''; const lv0 = accLevel;
      for (let n = 0; n < SWEEP_N; n++) { grantBanReward(stage, battle); grantPills(); if (n === 0) extra = grantStageReward(stage, battle); }
      extra = grantExtraReward(SWEEP_N) + extra;
      if (typeof updatePower === 'function') updatePower();
      pvpToast(`⚔️ Quét Ải ${stage} - Bàn ${battle} ×${SWEEP_N}!\n\n🥈 +${fmtN(r.silver * SWEEP_N)} bạc • 🍚 +${fmtN(r.rice * SWEEP_N)} gạo\n🟣 +${fmtN(r.than * SWEEP_N)} Thần Đan • 🔴 +${fmtN(r.tien * SWEEP_N)} Tiên Đan${r.exp > 0 ? '\n✨ +' + fmtN(r.exp * SWEEP_N) + ' EXP' + (accLevel > lv0 ? ' • 🎉 Lên cấp ' + accLevel + '!' : '') : ''}\n${pillPerClear() > 0 ? '💊 +' + pillPerClear() * SWEEP_N + ' Viên Thể Lực (có ' + staState.pills + ')\n' : ''}⚡ -${cost} thể lực` + extra, true);
    }

    function backToStages() {
      document.getElementById('pve-battle-screen').style.display = 'none';
      document.getElementById('pve-stage-screen').style.display = 'flex';
      renderStages();
    }

    function unlockNextLevel(currentStage, currentBattle) {
      if (currentStage === progress.maxStage && currentBattle === progress.maxBattle) {
        if (currentBattle < 10) {
          progress.maxBattle++;
        } else if (currentStage < 100) {
          progress.maxStage++;
          progress.maxBattle = 1;
        }
        localStorage.setItem('pve_progress', JSON.stringify(progress));
      }
    }

    function resetProgress() {
      return;   // đã tắt chức năng xóa tiến trình PVE
      if (confirm("Xóa toàn bộ tiến trình PVE và quay về Ải 1 Bàn 1?")) {
        progress = { maxStage: 1, maxBattle: 1 };
        localStorage.setItem('pve_progress', JSON.stringify(progress));
        renderStages();
      }
    }

;
/* === pve/pve-stage-map.js === */
/* ===== pve/pve-stage-map.js =====
   Giao diện chọn Ải dạng bản đồ ảnh (9 Ải / ảnh, tổng 100 Ải).
   Nạp SAU pve-stages.js (để ghi đè renderStages), TRƯỚC boot.js.
   Thêm ảnh mới: chỉ cần thêm 1 phần tử vào STAGE_PAGES ở dưới.
*/

/* Kích thước ảnh gốc mặc định (px). Mỗi trang có thể khai báo riêng w,h = "hệ toạ độ" của x,y.
   Nếu không khai báo thì lấy kích thước thật của ảnh. */
const SM_W = 1199, SM_H = 1312;

/* Cách lấp khung khi màn hình có tỉ lệ khác ảnh:
   'blur'    = giữ nguyên ảnh, phần thừa 2 bên/trên dưới được lấp bằng chính ảnh đó làm mờ (đẹp, không méo)
   'stretch' = kéo giãn ảnh cho tràn hết khung (tràn 100% nhưng ảnh bị méo)
   'contain' = như cũ (có viền tối)  */
const SM_FIT = 'blur';

/* Bật = vẽ thêm số Ải bằng code (dùng khi ảnh KHÔNG có sẵn chữ "Ải N"). */
const SM_DRAW_LABEL = false;

/* Mỗi trang = 1 ảnh = 9 Ải liên tiếp.
   x,y = tâm CỔNG của Ải (khi direct:true) tính theo hệ toạ độ w×h của trang.
   Không có direct = kiểu cũ (x,y là tâm bảng số, cổng nằm trên SM_ORB_UP px).
   nodeW = bề rộng vùng bấm (% bề rộng ảnh). back = vị trí nút "Trở về".
   CĂN TAY: mở màn chọn Ải, nhấn F2, kéo từng cổng cho đúng, bấm "Sao chép" rồi dán đè lên trang tương ứng. */
const STAGE_PAGES = [
  { from: 1, img: 'giang-ho/ai-map-1.webp', w: 1000, h: 1500, direct: true, nodeW: 20,
    back: { x: 109, y: 147 }, nodes: [
    { n: 1, x: 205, y: 433 }, { n: 2, x: 503, y: 433 }, { n: 3, x: 803, y: 433 },
    { n: 4, x: 201, y: 707 }, { n: 5, x: 504, y: 707 }, { n: 6, x: 825, y: 707 },
    { n: 7, x: 197, y: 1023 }, { n: 8, x: 513, y: 1023 }, { n: 9, x: 842, y: 1023 }
  ]},
  { from: 10, img: 'giang-ho/ai-map-2.webp', w: 1199, h: 1312, direct: true, nodeW: 24,
    back: { x: 115, y: 138 }, nodes: [
    { n: 10, x: 242, y: 966 }, { n: 11, x: 621, y: 964 }, { n: 12, x: 986, y: 978 },
    { n: 13, x: 245, y: 657 }, { n: 14, x: 607, y: 657 }, { n: 15, x: 980, y: 657 },
    { n: 16, x: 248, y: 412 }, { n: 17, x: 626, y: 424 }, { n: 18, x: 975, y: 426 }
  ]},
  { from: 19, img: 'giang-ho/ai-map-3.webp', w: 1199, h: 1312, direct: true, nodeW: 24,
    back: { x: 115, y: 138 }, nodes: [
    { n: 19, x: 629, y: 1085 }, { n: 20, x: 280, y: 913 }, { n: 21, x: 906, y: 947 },
    { n: 22, x: 389, y: 733 }, { n: 23, x: 917, y: 764 }, { n: 24, x: 698, y: 599 },
    { n: 25, x: 421, y: 478 }, { n: 26, x: 919, y: 412 }, { n: 27, x: 655, y: 303 }
  ]}
  /* Ảnh 4 (Ải 28–36) bổ sung sau */
];
const SM_MAX_STAGE = 100;
const SM_ORB_UP = 105; /* cổng nằm phía trên bảng số bấy nhiêu px */

let smPage = -1;
/* kích thước THẬT của từng ảnh. Khai báo sẵn để lần vẽ đầu (ảnh chưa tải xong, nhất là mạng chậm) đã đúng tỉ lệ, không bị nhảy vị trí cổng Ải khi ảnh về; vẫn tự đo lại khi ảnh tải xong.
   Thay ảnh bản đồ bằng ảnh khác kích thước thì sửa số ở đây (toạ độ cổng trong STAGE_PAGES vẫn theo w×h riêng của từng trang). */
const smDims = { 'giang-ho/ai-map-1.webp': { w: 1024, h: 1536 }, 'giang-ho/ai-map-2.webp': { w: 1024, h: 1536 }, 'giang-ho/ai-map-3.webp': { w: 1024, h: 1536 } };

/* Kích thước hệ toạ độ của trang: ưu tiên pg.w/pg.h (nếu khai báo), rồi kích thước thật của ảnh, cuối cùng SM_W×SM_H */
function smSize(pg) {
  const d = smDims[pg.img] || {};
  return { W: pg.w || d.w || SM_W, H: pg.h || d.h || SM_H, R: (d.w && d.h) ? d.w / d.h : (pg.w || SM_W) / (pg.h || SM_H) };
}

function smProgress() {
  try {
    const p = JSON.parse(localStorage.getItem('pve_progress') || '{}');
    return { maxStage: Math.max(1, +p.maxStage || 1), maxBattle: +p.maxBattle || 0 };
  } catch (e) { return { maxStage: 1, maxBattle: 0 }; }
}

/* Trạng thái: locked (chưa mở) | current (đang đánh) | cleared (đã qua) */
function smState(n, prog) {
  if (n > Math.min(prog.maxStage, SM_MAX_STAGE)) return 'locked';
  if (n === prog.maxStage) return 'current';
  return 'cleared';
}

/* Chọn Ải: đổi tên hàm này cho khớp với hàm mở danh sách Bàn hiện có
   trong pve-stages.js (nơi vòng for i<=100 đang gắn onclick). */
function smPick(n) {
  if (typeof selectStage === 'function') return selectStage(n);
  if (typeof openStage === 'function') return openStage(n);
  if (typeof renderBattles === 'function') return renderBattles(n);
  console.warn('[stage-map] chưa nối hàm mở Bàn cho Ải', n);
}

function smPageOf(stage) {
  for (let i = 0; i < STAGE_PAGES.length; i++) {
    const p = STAGE_PAGES[i];
    if (stage >= p.from && stage < p.from + p.nodes.length) return i;
  }
  return STAGE_PAGES.length - 1;
}

let smEditOn = false;

function smOut(pg, W, H) {
  const rows = [];
  for (let i = 0; i < pg.nodes.length; i += 3)
    rows.push('    ' + pg.nodes.slice(i, i + 3).map(n => `{ n: ${n.n}, x: ${n.x}, y: ${n.y} }`).join(', '));
  return `{ from: ${pg.from}, img: '${pg.img}', w: ${W}, h: ${H}, direct: true, nodeW: ${pg.nodeW || 24},\n  back: { x: ${pg.back.x}, y: ${pg.back.y} }, nodes: [\n${rows.join(',\n')}\n  ]},`;
}

/* Chế độ CĂN TAY (phím F2): kéo cổng + nút Trở về, chỉnh cỡ vùng bấm, rồi sao chép kết quả */
function smPanel(pg, W, H) {
  let p = document.getElementById('sm-panel');
  if (!p) {
    p = document.createElement('div'); p.id = 'sm-panel';
    p.innerHTML = `<b>CĂN TAY — Trang Ải ${pg.from}</b>
      <div>Kéo từng vòng tròn đặt đúng giữa cổng. Vòng "↩" là nút Trở về.</div>
      <label>Cỡ vùng bấm: <input type="range" min="8" max="40" step="0.5" id="sm-nw"> <span id="sm-nwv"></span>%</label>
      <textarea id="sm-out" readonly></textarea>
      <button id="sm-copy">Sao chép</button> <button id="sm-done">Xong</button>`;
    document.body.appendChild(p);
  }
  p.querySelector('b').textContent = 'CĂN TAY — trang Ải ' + pg.from + '–' + (pg.from + 8);
  const nw = p.querySelector('#sm-nw'), nv = p.querySelector('#sm-nwv'), out = p.querySelector('#sm-out');
  nw.value = pg.nodeW; nv.textContent = pg.nodeW;
  out.value = smOut(pg, W, H);
  nw.oninput = () => {
    pg.nodeW = +nw.value; nv.textContent = nw.value; out.value = smOut(pg, W, H);
    document.querySelectorAll('.sm-node').forEach(e => { e.style.width = pg.nodeW + '%'; });
  };
  p.querySelector('#sm-copy').onclick = () => { out.select(); try { document.execCommand('copy'); } catch (e) {} console.log(out.value); };
  p.querySelector('#sm-done').onclick = () => smEdit(false);
  return () => { out.value = smOut(pg, W, H); };
}

function smDrag(el, obj, stg, W, H, onMove) {
  el.style.touchAction = 'none';
  el.onpointerdown = e => {
    e.preventDefault(); el.setPointerCapture(e.pointerId);
    const mv = ev => {
      const r = stg.getBoundingClientRect();
      obj.x = Math.max(0, Math.min(W, Math.round((ev.clientX - r.left) / r.width * W)));
      obj.y = Math.max(0, Math.min(H, Math.round((ev.clientY - r.top) / r.height * H)));
      el.style.left = (obj.x / W * 100) + '%'; el.style.top = (obj.y / H * 100) + '%';
      onMove();
    };
    const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up);
  };
}

function stageMapRender(host) {
  host = host || document.getElementById('stage-list-container');
  if (!host) return;
  const prog = smProgress();
  if (smPage < 0) smPage = smPageOf(prog.maxStage);
  smPage = Math.max(0, Math.min(STAGE_PAGES.length - 1, smPage));
  const pg = STAGE_PAGES[smPage];
  const sz = smSize(pg), W = sz.W, H = sz.H;

  /* vào chế độ căn tay: quy về kiểu "x,y = tâm cổng" để kéo cho dễ */
  if (smEditOn) {
    if (!pg.direct) { pg.nodes.forEach(n => { n.y -= SM_ORB_UP; }); pg.direct = true; }
    if (!pg.back) pg.back = { x: Math.round(.096 * W), y: Math.round(.105 * H) };
    if (!pg.nodeW) pg.nodeW = 24;
    pg.w = W; pg.h = H;
  }
  const up = pg.direct ? 0 : SM_ORB_UP;
  const nw = pg.nodeW || 24;
  const bk = pg.back || { x: Math.round(.096 * W), y: Math.round(.105 * H) };

  const nodes = pg.nodes.map(nd => {
    const st = smState(nd.n, prog);
    const cx = (nd.x / W) * 100, cy = ((nd.y - up) / H) * 100;
    const label = (SM_DRAW_LABEL || smEditOn) ? `<span class="sm-lbl">${smEditOn ? nd.n : 'Ải ' + nd.n}</span>` : '';
    return `<button class="sm-node ${smEditOn ? 'sm-editing' : 'sm-' + st}" style="left:${cx}%;top:${cy}%;width:${nw}%"
      data-n="${nd.n}" ${st === 'locked' && !smEditOn ? 'aria-disabled="true"' : ''}
      aria-label="Ải ${nd.n}${st === 'locked' ? ' (chưa mở)' : ''}">${label}</button>`;
  }).join('');

  host.innerHTML = `
    <div class="sm-wrap sm-fit-${SM_FIT}" style="--bg:url('${pg.img}')">
      <div class="sm-bgfill"></div>
      <div class="sm-stage" style="--r:${sz.R};background-image:url('${pg.img}')">
        ${nodes}
        <button class="sm-back ${smEditOn ? 'sm-editing' : ''}" style="left:${(bk.x / W) * 100}%;top:${(bk.y / H) * 100}%" aria-label="Trở về">${smEditOn ? '↩' : ''}</button>
        ${smPage > 0 ? '<button class="sm-arrow sm-prev" aria-label="Trang trước">‹</button>' : ''}
        ${smPage < STAGE_PAGES.length - 1 ? '<button class="sm-arrow sm-next" aria-label="Trang sau">›</button>' : ''}
      </div>
    </div>`;

  const stg = host.querySelector('.sm-stage');
  const backBtn = host.querySelector('.sm-back');
  if (smEditOn) {
    const upd = smPanel(pg, W, H);
    host.querySelectorAll('.sm-node').forEach(b => smDrag(b, pg.nodes.find(n => n.n === +b.dataset.n), stg, W, H, upd));
    smDrag(backBtn, pg.back, stg, W, H, upd);
  } else {
    const pnl = document.getElementById('sm-panel'); if (pnl) pnl.remove();
    host.querySelectorAll('.sm-node').forEach(b => {
      b.onclick = () => {
        const n = +b.dataset.n;
        if (b.classList.contains('sm-locked')) {
          if (typeof toast === 'function') toast('Hãy vượt Ải ' + (n - 1) + ' trước');
          return;
        }
        smPick(n);
      };
    });
    if (backBtn) backBtn.onclick = () => switchScreen(window.pveFrom || 'home');
  }

  const probe = new Image();
  probe.onload = () => {   /* đo kích thước thật của ảnh; khác lần trước thì vẽ lại cho đúng tỉ lệ */
    const w = probe.naturalWidth, h = probe.naturalHeight, d = smDims[pg.img];
    if (!d || d.w !== w || d.h !== h) { smDims[pg.img] = { w, h }; if (STAGE_PAGES[smPage] === pg && !smEditOn) stageMapRender(host); }
  };
  probe.onerror = () => console.error('[stage-map] KHÔNG TÌM THẤY ẢNH:', pg.img, '— kiểm tra file có nằm đúng thư mục không');
  if (host.offsetParent !== null) probe.src = pg.img;   // màn PVE đang ẩn (render lúc khởi động) thì khoan đo/tải bản đồ ~700 KB — vào màn mới tải

  const scr = document.getElementById('pve-stage-screen');
  if (scr) scr.classList.add('sm-fullart');
  const pv = host.querySelector('.sm-prev'), nx = host.querySelector('.sm-next');
  if (pv) pv.onclick = () => { smPage--; stageMapRender(host); };
  if (nx) nx.onclick = () => { smPage++; stageMapRender(host); };
}

function smEdit(on) { smEditOn = (on === undefined) ? !smEditOn : !!on; stageMapRender(); }
window.smEdit = smEdit;
document.addEventListener('keydown', e => {   /* F2 = bật/tắt chế độ căn tay (chỉ khi đang ở màn chọn Ải) */
  const h = document.getElementById('stage-list-container');
  if (e.key === 'F2' && h && h.offsetParent) { e.preventDefault(); smEdit(); }
});

/* Ghi đè renderStages cũ để màn PVE dùng bản đồ mới */
window.renderStages = function () {
  smPage = -1;
  stageMapRender();
};

;
/* === js/heroes/roster.js === */
/* TƯỚNG: danh sách HEROES (dữ liệu gốc) và Đội ngũ
   (tách từ index.html cũ — script) */

    // --- ĐỘI NGŨ ---
    // Dữ liệu từng tướng nằm ở heros/hero-data.js (dựng bảng bởi khối hero-loader ở đầu game.js)
    // Gồm: chỉ số (hp/atk/spd/nộ), chỉ số chiến đấu (def, né, chuẩn, bạo, bạo sát, bền, phá giáp, đỡ đòn), tia đánh, chất tướng, tên tuyệt kỹ, âm thanh, sprite...
    // Cờ trong stats: startRage • alwaysUlt • taunt • noEnemy (không nằm trong 3 tướng ngẫu nhiên của boss trận 4)
    const HEROES = HERO_T.heroes;
    const heroIcon = h => h.img ? `<img class="hero-img" src="${h.img}">` : h.emoji;
    let team = [];
    try { team = JSON.parse(localStorage.getItem('team_ids')) || []; } catch (e) {}
    team = team.filter((id, i) => HEROES.some(h => h.id === id) && team.indexOf(id) === i).slice(0, 5);   // bỏ ID lạ, bỏ trùng, tối đa 5 tướng
    if (!team.length) team = [0,1,2,3,4];
    team.sort((a, b) => a - b);
    // Danh sách tướng ra trận THEO ĐÚNG THỨ TỰ đội (không phụ thuộc thứ tự trong hero-data.js), bỏ trùng, tối đa 5
    function teamSel() {
      const seen = new Set(), out = [];
      team.forEach(id => { const h = HEROES.find(x => x.id === id); if (h && !seen.has(id)) { seen.add(id); out.push(h); } });
      return out.slice(0, 5);
    }

    function renderTeam() {
      document.getElementById('tm-list').innerHTML = ownedHeroes().map(h => {
        const on = team.includes(h.id);
        return `<div class="tm-card ${on ? 'on' : ''}" onclick="toggleHero(${h.id})"><div class="e">${heroIcon(h)}</div><div class="n">${h.name}</div><div class="s">${on ? 'Ra trận' : 'Dự bị'}</div></div>`;
      }).join('');
      document.getElementById('tm-sub').innerText = `Đang ra trận: ${team.length}/5 tướng (tối thiểu 1)`;
    }
    function toggleHero(id) {
      if (team.includes(id)) { if (team.length === 1) return; team = team.filter(x => x !== id); }
      else { if (team.length >= 5 || !heroIsOwned(id)) return; team.push(id); }
      team.sort((a, b) => a - b);
      try { localStorage.setItem('team_ids', JSON.stringify(team)); } catch (e) {}
      renderTeam();
    }
    // Đội Ngũ giờ là màn hình đầy đủ (js/heroes/team-screen.js); hộp thoại cũ chỉ còn làm dự phòng
    function openTeam() { if (typeof tnOpen === 'function') return tnOpen(); renderTeam(); document.getElementById('team-modal').style.display = 'flex'; }
    function closeTeam() { document.getElementById('team-modal').style.display = 'none'; renderHomeTeam(); }

;
/* === js/heroes/hero-constants.js === */
/* TƯỚNG: hằng số cấp / sao / kỹ năng, tên ulti, viền
   (tách từ index.html cũ — script) */

    // ================= CHỈ SỐ TƯỚNG • CẤP / SAO / KỸ NĂNG • CÀI ĐẶT =================
    const LV_MAX = 1000, STAR_MAX = 6;
    // ===== QUY TẮC TĂNG TRƯỞNG TƯỚNG — ADMIN CHỈNH ĐƯỢC (game_config → progress) =====
    //  lvPerStar     : cấp tướng cần cho mỗi sao (mặc định 10): muốn lên ★2 phải đạt cấp 20, ★3 cấp 30, ★n cấp 10×n (★1 là sao khởi đầu)
    //  starNeedsLv   : 1 = tăng sao đòi đủ cấp tướng như trên; 0 = tắt luật này
    //  accLimitsLv   : 1 = cấp tướng không được vượt cấp tài khoản; 0 = tắt luật này
    //  maxStar       : sao tối đa (≤ 15, giao diện chỉ vẽ tới ★15)
    //  lvGrowthPct / starGrowthPct / skillGrowthPct : % HP/Công/Thủ tăng mỗi cấp / mỗi sao / mỗi cấp kỹ năng
    //  skillMax      : cấp kỹ năng tối đa
    //  costSilver / costRice / costGrowthPct : chi phí lên cấp 2 (bạc, gạo) và % đắt thêm mỗi cấp
    var PROG_CFG = cfgSnap('progress', { lvPerStar: 10, maxStar: 15, starNeedsLv: 1, accLimitsLv: 1, lvGrowthPct: 3, starGrowthPct: 10, skillGrowthPct: 15, skillMax: 10, costSilver: 100, costRice: 200, costGrowthPct: 10, skillBaseSkill: 60, skillBaseAtk: 150, skillBaseOther: 100, skillStepBi: 5, skillStepYeu: 10, skillStepVo: 15 });
    Object.assign(PROG_CFG, cfgGet('progress', {}));
    let SKILL_MAX = 10, LV_GROWTH = 0.03, STAR_GROWTH = 0.10, SKILL_GROWTH = 0.15;   // đồng bộ từ PROG_CFG bằng progCfgSync() (gọi cuối hero-progress.js và mỗi lần admin đổi cấu hình)
    const _pn = (v, d, lo, hi) => { v = Number(v); if (!isFinite(v)) v = d; return Math.min(hi, Math.max(lo, v)); };
    // Sao tối đa mà tướng cấp `lv` được phép có (★1 luôn có; ★n cần cấp lvPerStar × n)
    const starCapByLv = lv => PROG_CFG.starNeedsLv ? Math.max(1, Math.floor(Math.max(0, lv | 0) / Math.floor(_pn(PROG_CFG.lvPerStar, 10, 1, 1000)))) : 15;
    function progCfgSync() {
      SKILL_MAX = Math.floor(_pn(PROG_CFG.skillMax, 10, 1, 100));
      LV_GROWTH = _pn(PROG_CFG.lvGrowthPct, 3, 0, 1000) / 100; STAR_GROWTH = _pn(PROG_CFG.starGrowthPct, 10, 0, 1000) / 100; SKILL_GROWTH = _pn(PROG_CFG.skillGrowthPct, 15, 0, 1000) / 100;
      try { STAR_ABS_MAX = Math.floor(_pn(PROG_CFG.maxStar, 15, 1, 15)); LV_COST_SILVER = _pn(PROG_CFG.costSilver, 100, 0, 1e12); LV_COST_RICE = _pn(PROG_CFG.costRice, 200, 0, 1e12); LV_COST_GROWTH = 1 + _pn(PROG_CFG.costGrowthPct, 10, 0, 1000) / 100; } catch (e) {}   // các biến này khai báo ở hero-progress.js
    }
    // Cấp & sao ban đầu của từng tướng (chỉ số cơ bản trong HEROES tương ứng với mức này)
    // Tài khoản bị admin "RESET TRẮNG" (cờ blank_start): mọi tướng cấp 1 ★1, cấp acc 1, tài nguyên 0, bang cấp 1
    const BLANK_START = (() => { try { return localStorage.getItem('blank_start') === '1'; } catch (e) { return false; } })();
    const START_PROG_DEF = HERO_T.startProg;
    const START_PROG = (() => { if (!BLANK_START) return START_PROG_DEF; const o = {}; Object.keys(START_PROG_DEF).forEach(k => { o[k] = { lv: 1, star: 1 }; }); return o; })();
    const HERO_BORDER = HERO_T.border;               // còn lại viền cam
    const HERO_ULT_NAME = Object.assign({}, HERO_T.ultName);
    // Admin đổi tên tướng / tên tuyệt kỹ: heroes.<id>.name / heroes.<id>.ultName
    const HERO_NAME_DEF = HEROES.map(h => h.name), HERO_ULT_DEF = Object.assign({}, HERO_ULT_NAME);
    cfgOnApply(() => HEROES.forEach((h, i) => { const o = cfgGet('heroes.' + h.id, {}) || {}; h.name = (typeof o.name === 'string' && o.name.trim()) ? o.name.trim().slice(0, 40) : HERO_NAME_DEF[i]; HERO_ULT_NAME[h.id] = (typeof o.ultName === 'string' && o.ultName.trim()) ? o.ultName.trim().slice(0, 40) : HERO_ULT_DEF[h.id]; }));
    const STAT_FIELDS = [
      { k:'hp',    label:'HP (Máu)',   min:1, max:99999999 },
      { k:'atk',   label:'Công',       min:0, max:9999999 },
      { k:'def',   label:'Thủ',        min:0, max:99999 },
      { k:'dodge', label:'Né',         min:0, max:99999 },
      { k:'acc',   label:'Chuẩn',      min:0, max:99999 },
      { k:'crit',  label:'Bạo',        min:0, max:99999 },
      { k:'critDmg', label:'Bạo Sát',  min:0, max:99999 },
      { k:'tough', label:'Bền',        min:0, max:99999 },
      { k:'pierce', label:'Phá giáp',  min:0, max:9999999 },
      { k:'block', label:'Đỡ đòn (%)', min:0, max:100 },
      { k:'heal',  label:'Hồi máu (mỗi hiệp)', min:0, max:99999999 },
      { k:'spd',   label:'Tốc',        min:0, max:99999 },
      { k:'startRage', label:'Nộ khởi đầu', min:0, max:100 },
      { k:'tia',   label:'Tia đánh',   min:1, max:99 }
    ];

;
/* === js/core/game-state.js === */
/* TRẠNG THÁI CHUNG: tiện ích loadJSON/saveJSON/fmtN, vàng, mảnh tướng, bản gốc chỉ số
   (tách từ index.html cũ — script) */

   
// Hiện SỐ THỰC đầy đủ, không rút gọn K / M / B...
var fmtN = n => {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0';
  return (Math.round(v) + 0).toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 0 });
};

    const heroById = id => HEROES.find(h => h.id === id);

    var HERO_DEFAULTS = {};
    HEROES.forEach(h => { HERO_DEFAULTS[h.id] = { hp:h.hp, atk:h.atk, def:h.def, dodge:h.dodge, acc:h.acc || 0, crit:h.crit || 0, critDmg:h.critDmg || 0, tough:h.tough || 0, pierce:h.pierce || 0, block:h.block || 0, heal:h.heal || 0, spd:h.spd, startRage:h.startRage || 0, tia:h.tia || 1 }; });
    cfgSnap('hero', HERO_DEFAULTS);   // bản mặc định để admin ghi đè (remote-config.js)
    const loadJSON = k => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
    const saveJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
    var statOv = cfgHeroPatch().stat;   // chỉ số tướng do ADMIN chỉnh (không còn chỉnh trong Cài đặt)
    let gold = (() => { try { const v = parseInt(localStorage.getItem('gold_val')); return isNaN(v) ? (BLANK_START ? 0 : 2291) : Math.max(0, v); } catch (e) { return BLANK_START ? 0 : 2291; } })();
    const updateGold = () => { ['gold-val', 'rc-gold'].forEach(i => { const el = document.getElementById(i); if (el) el.innerText = gold; }); };
    const goldSave = () => { try { localStorage.setItem('gold_val', String(gold)); } catch (e) {} updateGold(); };
    // BẠC 🥈 và GẠO 🍚: nhận khi thắng mỗi Bàn PVE, dùng để tăng cấp tướng. (VÀNG 💰 ở trên: dùng Chiêu Mộ, nhận quà Hộp Thư mỗi ngày)
    const _numLS = (k, d) => { try { const v = parseFloat(localStorage.getItem(k)); return isNaN(v) ? d : Math.max(0, v); } catch (e) { return d; } };
    let silver = _numLS('silver_val', BLANK_START ? 0 : 21873054), rice = _numLS('rice_val', BLANK_START ? 0 : 2549836);
    // THẦN ĐAN và TIÊN ĐAN: thưởng khi thắng mỗi Bàn PVE (xem trong Túi Đồ). Hiển thị bằng ảnh trong vat-pham-game/ (không dùng emoji)
const DAN_IMG = { 'Thần Đan': icoImg('than'), 'Tiên Đan': icoImg('tien') };   // ảnh (lỗi ảnh thì tự về emoji)
const danIcoHTML = (name, h) => { const k = name === 'Thần Đan' ? 'than' : name === 'Tiên Đan' ? 'tien' : ''; return k ? icoImg(k, h) : (DAN_IMG[name] || ''); };
    let thanDan = _numLS('thandan_val', 0), tienDan = _numLS('tiendan_val', 0);
    const updateRes = () => { [['silver-val', silver], ['rice-val', rice]].forEach(([i, v]) => { const el = document.getElementById(i); if (el) el.innerText = fmtN(v); }); };
    const resSave = () => { try { localStorage.setItem('silver_val', String(Math.floor(silver))); localStorage.setItem('rice_val', String(Math.floor(rice))); localStorage.setItem('thandan_val', String(Math.floor(thanDan))); localStorage.setItem('tiendan_val', String(Math.floor(tienDan))); } catch (e) {} updateRes(); };
    updateRes();
    let heroShards = loadJSON('hero_shards');   // mảnh tướng: { heroId: số mảnh }
    let recState = loadJSON('rec_state');       // thời điểm được quay miễn phí kế tiếp: { lam, tim, ten }
    let SHARD_PER_STAR = 10;                    // lên ★N cần N × 10 mảnh của chính tướng đó (★6 = 60 mảnh) — admin chỉnh: recruit.shardPerStar
    cfgOnApply(() => { SHARD_PER_STAR = Math.max(1, Math.floor(cfgNum('recruit.shardPerStar', 10))); });
    const shardsOf = id => Math.max(0, heroShards[id] | 0);
    const starCost = star => star * SHARD_PER_STAR;   // chi phí để đạt ★star
    // ---- PHÁCH: từ ★6 trở lên, ngoài mảnh tướng còn tốn Linh Phách + Tiên Phách + Thần Phách (vật phẩm trong Kho) ----
    // Mặc định lên ★6: 10 Linh Phách + 5 Tiên Phách + 2 Thần Phách. Mỗi sao tiếp theo đắt thêm 50% SỐ GỐC (★7 = ×1.5, ★8 = ×2, ★9 = ×2.5…; làm tròn lên).
    // Admin (tab Cấp / Sao tướng): progress.phachFrom (sao đầu tiên tốn phách, mặc định 6) • phachLinh / phachTien / phachThan (số phách ở sao đó) • phachGrowthPct (% đắt thêm mỗi sao, mặc định 50)
    const PHACH_NAMES = ['Linh Phách', 'Tiên Phách', 'Thần Phách'];
    function starPhach(star) {   // [{name, n}] phách cần để đạt ★star ([] nếu chưa tới mốc)
      const from = Math.max(2, Math.floor(cfgNum('progress.phachFrom', 6)));
      if (star < from) return [];
      const m = 1 + Math.max(0, cfgNum('progress.phachGrowthPct', 50)) / 100 * (star - from);
      const base = [cfgNum('progress.phachLinh', 10), cfgNum('progress.phachTien', 5), cfgNum('progress.phachThan', 2)];
      return PHACH_NAMES.map((name, i) => ({ name, n: Math.ceil(Math.round(Math.max(0, base[i]) * m * 1000) / 1000) })).filter(x => x.n > 0);
    }
    const phachMiss = star => starPhach(star).filter(x => skbQty(x.name) < x.n);
    const phachText = star => starPhach(star).map(x => `${x.n} ${x.name} (có ${skbQty(x.name)})`).join(' + ');
    let heroProg = loadJSON('hero_prog');

    // ===== SỞ HỮU TƯỚNG: chỉ có tướng khi đủ 10 MẢNH rồi GHÉP MẢNH (Võ Hiệp → Ghép Mảnh). Mảnh lấy từ Chiêu Mộ / Gift Code =====
    // Áp dụng cho tài khoản kiểu mới "tất cả về 1" (cờ blank_start). Tài khoản kiểu cũ (tướng 70+) vẫn có đủ tướng như trước.
    const OWN_ON = BLANK_START;
    let heroOwned = loadJSON('hero_owned');   // { idTướng: 1 }
    (function () {
      if (!OWN_ON) return;
      let raw = null; try { raw = localStorage.getItem('hero_owned'); } catch (e) {}
      if (raw === null) Object.keys(heroProg).forEach(k => { heroOwned[k] = 1; });   // tài khoản đã reset trắng từ trước: tướng đã có tiến độ thì giữ lại
      saveJSON('hero_owned', heroOwned);
    })();
    const heroIsOwned = id => !OWN_ON || !!heroOwned[id];
    const ownedHeroes = () => HEROES.filter(h => heroIsOwned(h.id));
    let MERGE_COST = 10;   // đủ 10 mảnh ghép thành 1 tướng — admin chỉnh: recruit.mergeCost
    cfgOnApply(() => { MERGE_COST = Math.max(1, Math.floor(cfgNum('recruit.mergeCost', 10))); });
    // Ghép mảnh: tốn MERGE_COST mảnh của tướng `id` để có tướng đó (cấp 1 ★1). Trả về true nếu thành công.
    function heroGain(id) {
      if (!OWN_ON || heroOwned[id] || !heroById(id) || shardsOf(id) < MERGE_COST) return false;
      heroShards[id] = shardsOf(id) - MERGE_COST; saveJSON('hero_shards', heroShards);
      heroOwned[id] = 1; saveJSON('hero_owned', heroOwned);
      if (team.length < 5 && !team.includes(id)) {   // tướng mới tự vào đội nếu đội chưa đủ 5 (tài khoản mới có đội ngay)
        team.push(id); team.sort((a, b) => a - b);
        try { localStorage.setItem('team_ids', JSON.stringify(team)); } catch (e) {}
      }
      return true;
    }
    if (OWN_ON) team = team.filter(heroIsOwned);   // đội hình chỉ gồm tướng đã sở hữu (có thể trống với tài khoản mới)

;
/* === js/heroes/hero-roles.js === */
/* TƯỚNG: CHẤT TƯỚNG (vai trò) và chỉ số chỉnh tay
   (tách từ index.html cũ — script) */

    // cấp / sao / kỹ năng
    // ---- CHẤT TƯỚNG: quyết định nộ đầu trận, ulti liên tục, thứ tự bị đánh (chọn trong Cài đặt) ----
    const ROLE_NAME  = { skill:'Kỹ năng', atk:'Công kích', sup:'Hỗ trợ', heal:'Trị liệu', tank:'Thủ' };
    const ROLE_ICON  = { skill:'✨', atk:'⚔️', sup:'🌟', heal:'💚', tank:'🛡️' };
    const ROLE_COLOR = { tank:'#ef4444', sup:'#facc15', heal:'#22c55e', skill:'#3b82f6', atk:'#f97316' };
    const ROLE_DESC  = {
      get skill() { return 'Kỹ năng: ULTI LIÊN TỤC – lượt nào cũng ulti, không cần đủ nộ. Hiệu lực tuyệt kỹ cấp 1 chỉ ' + Math.round(_pn(PROG_CFG.skillBaseSkill, 60, 0, 1e5)) + '%.'; },
      get atk() { return 'Công kích: vào trận với 50 nộ. Hiệu lực tuyệt kỹ cấp 1 đạt ' + Math.round(_pn(PROG_CFG.skillBaseAtk, 150, 0, 1e5)) + '%.'; },
      sup:  'Hỗ trợ: vào trận 100 nộ. Địch ưu tiên đánh THỨ 2 – khi tướng thủ đã chết thì đánh hỗ trợ trước.',
      heal: 'Trị liệu: vào trận 50 nộ. Địch ưu tiên đánh THỨ 2 – khi tướng thủ đã chết thì đánh trị liệu trước.',
      tank: 'Thủ: vào trận 100 nộ. Địch ưu tiên đánh ĐẦU TIÊN.'
    };
    const ROLE_RULE = {
      skill:{ startRage:100, alwaysUlt:true,  taunt:false, prio2:false },
      atk:  { startRage:50,  alwaysUlt:false, taunt:false, prio2:false },
      sup:  { startRage:100, alwaysUlt:false, taunt:false, prio2:true  },
      heal: { startRage:50,  alwaysUlt:false, taunt:false, prio2:true  },
      tank: { startRage:100, alwaysUlt:false, taunt:true,  prio2:false }
    };
    const ROLE_DEFAULT = HERO_T.role;
    let roleOv = cfgHeroPatch().role;       // chất tướng do ADMIN đặt (mặc định ROLE_DEFAULT)
    const HERO_ROLE = {};
    const roleOf = id => (ROLE_RULE[roleOv[id]] ? roleOv[id] : (ROLE_DEFAULT[id] || 'atk'));
    function applyStatOv() {
      HEROES.forEach(h => {
        const r = roleOf(h.id), rule = ROLE_RULE[r];
        HERO_ROLE[h.id] = r;
        HERO_DEFAULTS[h.id].startRage = rule.startRage;
        Object.assign(h, HERO_DEFAULTS[h.id], { alwaysUlt:rule.alwaysUlt, taunt:rule.taunt, prio2:rule.prio2 }, statOv[h.id] || {});
      });
    }
    applyStatOv();

;
/* === js/heroes/hero-seq.js === */
/* CHUỖI KHUNG HÌNH (sprite sheet) — mỗi sheet = 1 hàng × 12 khung nền trong suốt, mỗi khung cw × ch px.
   Ảnh nằm trong thư mục của từng tướng: heros/<tên-tướng>/. Muốn thêm chuỗi cho tướng khác: thêm 1 dòng vào SEQ (+ SEQ_IDLE nếu là dáng đứng),
   rồi dùng seqEl / seqOverlay trong hàm tuyệt kỹ của tướng đó (xem vtdUlt, tayDocUlt trong khối tay-doc / vuong-trung-duong). */

const SEQ = HERO_T.seq;
// Dáng đứng trong trận: id tướng → { sheet, h = chiều cao hiển thị (px), ms = thời gian 1 vòng }
const SEQ_IDLE = HERO_T.seqIdle;

// THỦY LONG (id 8, trước là Lạc Long Quân): đổi tên + thay toàn bộ hình ảnh bằng bộ mới trong heros/thuy-long/
//   thuy-long-idle.webp   : 25 khung đứng yên     • thuy-long-attack.webp : 25 khung đánh thường
//   thuy-long-body.webp   : ảnh thân tĩnh          • thuy-long.webp        : ảnh đại diện thẻ tướng
(function () {
  const D = 'heros/thuy-long/', V = '?v=2';
  const h = HEROES.find(x => x.id === 8), m = (window.HERO_META || []).find(x => x.id === 8);
  if (m) { Object.keys(m.sprites || {}).forEach(k => { delete SEQ[k]; }); m.name = 'Thủy Long'; m.sprites = { tlIdle: {}, tlAtk: {} }; }
  if (h) { h.name = 'Thủy Long'; h.img = D + 'thuy-long.webp' + V; h.body = D + 'thuy-long-body.webp' + V; }
  SEQ.tlIdle = { src: D + 'thuy-long-idle.webp?v=3', cw: 122, ch: 184, n: 23 };                 // ảnh đứng yên mới (2806×184 = 23 khung 122×184), quay mặt sang TRÁI (mặc định)
  SEQ.tlAtk  = { src: D + 'thuy-long-attack.webp' + V, cw: 308, ch: 205, n: 25, face: 'R' };
  SEQ_IDLE[8] = { sheet: 'tlIdle', h: 110, ms: 1600 };                                           // h = chiều cao hiển thị (px), ms = thời gian 1 vòng
})();

// CHỈNH CỠ TƯỚNG: nhân thêm hệ số vào chiều cao hiển thị của dáng đứng từng tướng (id -> hệ số, mặc định 1).
// Ví dụ tướng id 6 (Hoa Mãn Lâu) thấy to hơn các tướng khác thì ghi 6: 0.9. Hệ số chung HERO_SCALE nhân cho TẤT CẢ tướng.
// Chiều cao tham chiếu: Âu Cơ / Bắc Cái / Đông Tà / Tây Độc / Nam Đế = 104px (khung ~201px cao), Thủy Long = 106px (khung 205px cao).
const HERO_SIZE_ADJ = {}, HERO_SCALE = 1;
const PD_IDLE_H = 112;   // Phạm Dao: chiều cao khung đứng yên (px). Trước dùng bodyH=84 nên nhỏ hơn hẳn các tướng khác (khung 280×264 như Độc Cô/Hoa Mãn Lâu ≈ 120–140)
Object.keys(SEQ_IDLE).forEach(id => { const c = SEQ_IDLE[id]; if (c && !c.sized) { c.h = Math.round(c.h * HERO_SCALE * (HERO_SIZE_ADJ[id] || 1)); c.sized = 1; } });

// Nạp ngầm (không còn nạp hết ~30 MB lúc khởi động): tướng đã sở hữu trước (prio 1), còn lại sau cùng (prio 2)
GP.onStart(() => {
  const own = new Set();
  try { (window.HEROES || []).forEach(h => { if (typeof heroIsOwned === 'function' && heroIsOwned(h.id)) own.add(h.id); }); } catch (e) {}
  const bySlug = {}; (window.HERO_META || []).forEach(m => { bySlug[m.id] = Object.keys(m.sprites || {}).map(k => SEQ[k] && SEQ[k].src); });
  Object.keys(bySlug).forEach(id => GP.add(bySlug[id], own.has(+id) ? 1 : 2));
  Object.keys(SEQ).forEach(k => GP.add(SEQ[k].src, 2));   // lính phụ + sprite còn lại
});

// Đổi mili-giây theo tốc độ trận (cùng quy tắc với sleep của engine) để khung hình không lệch nhịp khi tua nhanh
const seqT = ms => (typeof battleFast !== 'undefined' && battleFast) ? 0 : ms * (typeof ultTimeScale === 'number' ? ultTimeScale : 1) * (typeof battleSlow === 'number' ? battleSlow : 1);

// HƯỚNG MẶT: mặc định mọi chuỗi quay mặt sang TRÁI. Chuỗi nào gốc quay sang PHẢI thì thêm  face: 'R'  vào dòng SEQ của nó.
// Lật ngang khi (đội ta) XOR (chuỗi gốc quay phải) -> hai đội luôn nhìn vào nhau.
const seqFlip = (s, side) => (side === 'hero') !== (s.face === 'R');
// HTML dáng đứng (thay ảnh thân tĩnh) — gọi từ applyRole trong battle/engine.js
// Ảnh gốc các chuỗi khung quay mặt sang TRÁI: đội ta (bên trái) phải lật ngang để nhìn sang phải, đội địch (bên phải) giữ nguyên → 2 đội nhìn vào nhau
function seqIdleHTML(id, hb, side) {
  const c = SEQ_IDLE[id]; if (!c) return '';
  const s = SEQ[c.sheet], h = c.h, w = Math.round(h * s.cw / s.ch), lift = h - ((hb && hb.bodyH) || 76) - Math.round((s.drop || 0) * h);
  return '<div class="hero-seq" style="width:' + w + 'px;height:' + h + 'px;margin:' + (-lift) + 'px 0 0 ' + (-w / 2) + 'px;' + (seqFlip(s, side) ? 'transform:scaleX(-1);' : '') + 'background-image:url(' + s.src + ');background-size:' + (w * s.n) + 'px ' + h + 'px;--end:' + (-w * s.n) + 'px;--ms:' + c.ms + 'ms;animation:seqRun ' + c.ms + 'ms steps(' + s.n + ') infinite"></div>';
}
// Phần tử hiển thị chuỗi khung, rộng w px. d.show(i) = dừng ở khung i; d.loop(ms) = lặp liên tục.
function seqEl(s, w) {
  const h = Math.round(w * s.ch / s.cw), d = document.createElement('div');
  d.className = 'hero-seq'; d.style.width = w + 'px'; d.style.height = h + 'px';
  d.style.backgroundImage = 'url(' + s.src + ')'; d.style.backgroundSize = (w * s.n) + 'px ' + h + 'px';
  d.show = i => { d.style.animation = 'none'; d.style.backgroundPosition = (-i * w) + 'px 0'; };
  d.loop = ms => { d.style.setProperty('--end', (-w * s.n) + 'px'); d.style.animation = 'seqRun ' + ms + 'ms steps(' + s.n + ') infinite'; };
  d.show(0); return d;
}
// Phủ chuỗi khung lên tướng u (ẩn ảnh thân/dáng đứng trong lúc diễn, căn đáy giữa). end() trả lại như cũ.
function seqOverlay(u, s, w) {
  const d = seqEl(s, w); d.classList.add('seq-over'); if (s.drop) d.style.bottom = (2 - Math.round(s.drop * parseFloat(d.style.height))) + 'px'; if (seqFlip(s, u.side)) d.style.transform = 'translateX(-50%) scaleX(-1)'; u.el.appendChild(d);   // đội ta lật ngang để nhìn sang phải (về phía địch)
  const hid = u.el.querySelectorAll('.hero-body, .hero-img, .bf-emo, .bf-sprite .hero-seq'); hid.forEach(b => { b.style.visibility = 'hidden'; });
  return { el: d, show: i => d.show(i), end() { d.remove(); hid.forEach(b => { b.style.visibility = ''; }); } };
}

// ẢNH ĐẠI DIỆN ĐỘNG: dáng đứng (SEQ_IDLE) dùng làm người đại diện ở Tỷ Võ + thẻ tướng trang chủ. Kích thước theo % nên co giãn theo khung chứa.
// w: số px hoặc chuỗi CSS (vd '150%'). Trả '' nếu tướng chưa có chuỗi đứng → nơi gọi dùng ảnh tĩnh như cũ.
function seqAvatarHTML(id, w, extraStyle) {
  const c = SEQ_IDLE[id]; if (!c) return '';
  const s = SEQ[c.sheet];
  return '<div class="seq-av" style="width:' + (typeof w === 'number' ? w + 'px' : w) + ';aspect-ratio:' + s.cw + '/' + s.ch + ';background-image:url(' + s.src + ');background-size:' + (s.n * 100) + '% 100%;--ms:' + c.ms + 'ms;--stp:' + (s.n - 1) + ';' + (extraStyle || '') + '"></div>';
}

;
/* === js/items/treasure.js === */
/* BẢO VẬT (5 loại) + BÚA 🔨
   (tách từ index.html cũ — script) */

    // ---- BẢO VẬT ----
    // LOẠI: 5 gốc + 12 mới (id 10-21, định nghĩa ở treasure-extra.js; phải khai ở đây để túi đồ không lọc mất khi tải lại).
    // 5 gốc: Tôn Sư Ký (id 1) · Bá Vương Kiếm (6) · Thủy Hoàng Đăng (7) · Trống Lôi Âm (8) · Kim Giao Tiễn (9).
    // Có thể sở hữu NHIỀU BẢN của cùng 1 loại (cùng tên, cùng thông số; mỗi bản có cấp/sao riêng, đổi thêm bằng 🔥 ở Tỷ Võ).
    // Mỗi món có mã riêng `u`, `id` là LOẠI. Mỗi KHUNG chỉ gắn tối đa 3 Bảo Vật và KHÔNG được trùng loại (1 mỗi loại / khung).
    const TS_NAME = 'Tôn Sư Ký', TS_KINDS = [1, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21], TS_PER_HERO = 3, TS_FRAMES = 5;
    let TS_MAX = cfgNum('treasure.maxLv', cfgSnap('tsMax', 100)), TS_STAR_MAX = cfgNum('treasure.maxStar', cfgSnap('tsStarMax', 10));   // cấp / sao tối đa (admin chỉnh được)   // Bảo Vật tối đa 10★   // gắn theo KHUNG (tướng đứng ở khung nào nhận chỉ số khung đó), tối đa 3 Bảo Vật / khung
    // Tăng CẤP bằng Búa 🔨: 1 búa = TS_HAM_EXP exp. Lên cấp 1 cần TS_EXP_BASE exp, mỗi cấp sau cần nhiều hơn cấp trước TS_EXP_GROW (30%): 300 → 390 → 507 → ...
    let TS_HAM_EXP = cfgNum('treasure.hammerExp', 300), TS_EXP_BASE = cfgNum('treasure.expBase', 300), TS_EXP_GROW = cfgNum('treasure.expGrow', 30) / 100;
    const tsExpNeed = lv => Math.max(1, Math.round(TS_EXP_BASE * Math.pow(1 + TS_EXP_GROW, Math.max(0, lv | 0))));   // exp cần để lên từ cấp `lv` → `lv`+1
    let TS_STAR_ADD = cfgNum('treasure.starAdd', cfgSnap('tsStarAdd', 0.5));   // mỗi ★: +50% CHỈ SỐ GỐC (cộng thẳng, không cộng dồn lãi)

    // ---- THÔNG SỐ BẢO VẬT (theo bảng thiết kế) ----
    // stats = [[loại chỉ số, chỉ số gốc, điểm cộng mỗi cấp (tỉ lệ của chỉ số sau sao)], ...]  — thứ tự = dòng 1, 2, 3 trong bảng
    // CÔNG THỨC: chỉ số = gốc × (1 + 0.5 × số★) × (1 + điểm_mỗi_cấp × Lv)
    //   ví dụ: Công gốc 300, 10★ → 300 + 150×10 = 1800; mỗi cấp +15% → Lv20: 1800 × (1 + 0.15×20) = 7200
    var TS_DEFS = cfgSnap('ts', {
      1: { name:'Tôn Sư Ký',       stats:[ ['dodge', 30, .03],  ['atkFlat', 1000, .15], ['hpFlat', 5000, .20] ] },
      6: { name:'Bá Vương Kiếm',   stats:[ ['acc', 15, .03],    ['crit', 50, .15],      ['critDmg', 30, .15] ] },
      7: { name:'Thủy Hoàng Đăng', stats:[ ['tough', 25, .05],  ['crit', 25, .15],      ['critDmg', 25, .15] ] },
      8: { name:'Trống Lôi Âm',    stats:[ ['crit', 50, .05],   ['atkFlat', 2000, .15], ['atkFlat', 1500, .15] ] },
      9: { name:'Kim Giao Tiễn',   stats:[ ['spd', 20, .02],    ['critDmg', 500, .15],  ['pierce', 10000, .15] ] }
    });
    const TS_LABEL = { dodge:'Né', acc:'Chuẩn', crit:'Bạo', critDmg:'Bạo Sát', tough:'Bền', heal:'Hồi máu', atkFlat:'Công', hpFlat:'HP', pierce:'Phá giáp', spd:'Tốc' };
    const TS_IMG = { 1:'vat-pham-game/bao-vat/ton-su-ki.webp?v=25', 6:'vat-pham-game/bao-vat/ba-vuong-kiem.webp?v=25', 7:'vat-pham-game/bao-vat/thuy-hoang-dang.webp?v=25', 8:'vat-pham-game/bao-vat/trong-loi-am.webp?v=25', 9:'vat-pham-game/bao-vat/treasure-09.webp' };
    const TS_EMO = {};   // loại nào chưa có ảnh thì khai biểu tượng ở đây
    const tsName = id => TS_DEFS[id] ? TS_DEFS[id].name : TS_NAME;
    const tsIcon = id => TS_IMG[id] ? `<img class="eq-img" src="${TS_IMG[id]}">` : (TS_EMO[id] ? `<span style="font-size:30px;line-height:1">${TS_EMO[id]}</span>` : '📜');
    let tsRefund = 0;   // búa hoàn lại cho Bảo Vật đang quá 10★ (dữ liệu cũ)
    // ---- PHẨM CHẤT BẢO VẬT (A, A+, S, S+, SS, SS+, SSS) → màu viền khung + % tăng theo sao / cấp ----
    //   Xanh lá = A (sao +10%, cấp +5%) • Xanh dương = A+ (20 / 10) • Tím = S (30 / 15) • Cam = S+ và SS (60 / 30) • Đỏ = SS+ và SSS (80 / 40)
    //   CÔNG THỨC: chỉ số cuối = chỉ số gốc × (1 + số★ × %sao + cấp × %cấp)   (cộng thẳng, không nhân chồng)
    //   Admin chỉnh: treasure.grades.<id> (phẩm chất từng Bảo Vật) • treasure.tier.<0-4>.star / .lv (% theo màu) • (Bảo Vật chỉ rơi ở Luận Kiếm: luan.gradeWeights)
    const TS_GRADES = ['A', 'A+', 'S', 'S+', 'SS', 'SS+', 'SSS'];
    const TS_GRADE_TIER = { 'A': 0, 'A+': 1, 'S': 2, 'S+': 3, 'SS': 3, 'SS+': 4, 'SSS': 4 };
    const TS_TIER_NAME = ['Xanh lá', 'Xanh dương', 'Tím', 'Cam', 'Đỏ'], TS_TIER_COLOR = ['#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ef4444'];
    const TS_TIER_PCT_DEF = [[10, 5], [20, 10], [30, 15], [60, 30], [80, 40]];   // [% mỗi sao, % mỗi cấp]
    const TS_GRADE_DEF = { 1: 'A', 6: 'S', 7: 'S+', 8: 'S+', 9: 'SS', 10: 'A+', 11: 'A+', 12: 'A', 13: 'A', 14: 'A', 15: 'S', 16: 'SS+', 17: 'S+', 18: 'S', 19: 'A+', 20: 'S+', 21: 'SS' };   // mặc định tạm — chỉnh trong admin
        function tsGradeOf(kind) { let g; try { g = (cfgGet('treasure.grades', {}) || {})[kind]; } catch (e) {} return TS_GRADES.includes(g) ? g : (TS_GRADE_DEF[kind] || 'A'); }
    const tsTierOf = kind => TS_GRADE_TIER[tsGradeOf(kind)] || 0;
    function tsPct(kind) { const i = tsTierOf(kind), d = TS_TIER_PCT_DEF[i]; return { star: Math.max(0, cfgNum('treasure.tier.' + i + '.star', d[0])) / 100, lv: Math.max(0, cfgNum('treasure.tier.' + i + '.lv', d[1])) / 100 }; }
    const tsColor = kind => TS_TIER_COLOR[tsTierOf(kind)];
    const tsFrameStyle = kind => { const c = tsColor(kind); return `border-color:${c};box-shadow:0 0 7px ${c}aa,inset 0 0 5px ${c}55`; };   // viền khung theo phẩm chất
    const tsGradeTag = kind => `<span style="color:${tsColor(kind)};font-weight:900">${tsGradeOf(kind)}</span>`;
    const tsVal = (st, t) => { const p = tsPct(tsKindOf(t.id)); return st[1] * (1 + p.star * (t.star | 0) + p.lv * (t.lv | 0)); };
    function tsStatOf(t) {
      const o = { dodge:0, atk:0, hp:0, acc:0, crit:0, critDmg:0, tough:0, atkFlat:0, hpFlat:0, pierce:0, spd:0, heal:0 }, d = TS_DEFS[tsKindOf(t.id)];
      if (d) d.stats.forEach(st => { o[st[0]] += tsVal(st, t); });
      return o;
    }
    const tsNum = v => Math.round(v) >= 1000 ? fmtN(v) : String(Math.round(v * 10) / 10);
    function tsLines(t) {
      const d = TS_DEFS[tsKindOf(t.id)]; if (!d) return '';
      const k = tsKindOf(t.id), p = tsPct(k), head = `<div style="color:${tsColor(k)};font-weight:800;font-size:11px">Phẩm chất ${tsGradeOf(k)} (${TS_TIER_NAME[tsTierOf(k)]}) • ★ +${Math.round(p.star * 100)}% • Cấp +${Math.round(p.lv * 100)}%</div>`;
      return head + d.stats.map(st => `<div>${TS_LABEL[st[0]]} +${tsNum(tsVal(st, t))}</div>`).join('');
    }
    // Loại của dữ liệu cũ: id 1-5 (5 Tôn Sư Ký) -> loại 1; 6/7/8 giữ nguyên
    const tsKindOf = id => (id >= 1 && id <= 5) ? 1 : id;
    let tsBag = (() => {
      let b = [], rawBag = null; try { rawBag = localStorage.getItem('ts_bag'); b = JSON.parse(rawBag) || []; } catch (e) {}
      if (!Array.isArray(b)) b = [];
      b = b.filter(x => x && Number.isInteger(x.id) && TS_KINDS.includes(tsKindOf(x.id)));
      const legacy = b.length > 0 && b.every(x => x.u === undefined);   // dữ liệu cũ: id = mã riêng (1-8)
      const have = new Set(b.map(x => x.u === undefined ? x.id : x.u));
      if ((rawBag === null || legacy) && !BLANK_START) for (let i = 1; i <= 9; i++) if (!have.has(i)) b.push({ id: i });   // bộ gốc: 5 Tôn Sư Ký + 4 Bảo Vật đặc biệt
      const out = [], usedU = new Set(), frame = {};
      b.forEach(o => {
        let u = Number.isInteger(o.u) ? o.u : o.id; while (usedU.has(u)) u++; usedU.add(u);
        const kind = tsKindOf(o.id);
        let f = Number.isInteger(o.f) && o.f >= 0 && o.f < TS_FRAMES ? o.f : -1;
        if (o.f === undefined && o.hero !== null && o.hero !== undefined) f = team.indexOf(o.hero);   // dữ liệu cũ (gắn theo tướng) -> khung hiện tại của tướng đó
        if (f >= TS_FRAMES) f = -1;
        const fr = f >= 0 ? (frame[f] = frame[f] || []) : null;
        if (fr && (fr.length >= TS_PER_HERO || fr.includes(kind))) f = -1;   // khung đầy hoặc đã có loại này -> tháo ra túi
        else if (fr) fr.push(kind);
        let st = Math.max(0, o.star | 0); if (st > TS_STAR_MAX) { tsRefund += st - TS_STAR_MAX; st = TS_STAR_MAX; }
        out.push({ u, id: kind, lv: Math.max(0, Math.min(TS_MAX, o.lv | 0)), star: st, f, exp: Math.max(0, Number(o.exp) || 0) });
      });
      return out.sort((x, y) => TS_KINDS.indexOf(x.id) - TS_KINDS.indexOf(y.id) || x.u - y.u);
    })();
    const tsFind = u => tsBag.find(x => x.u === u);
    const tsCount = kind => tsBag.filter(x => x.id === kind).length;
    // Thêm 1 bản mới của 1 loại Bảo Vật (cấp 0, 0★) — dùng khi đổi 🔥 ở Tỷ Võ
    function tsAdd(kind) {
      if (!TS_KINDS.includes(kind)) return null;
      const t = { u: tsBag.reduce((m, x) => Math.max(m, x.u), 0) + 1, id: kind, lv: 0, star: 0, f: -1, exp: 0 };
      tsBag.push(t); tsBag.sort((x, y) => TS_KINDS.indexOf(x.id) - TS_KINDS.indexOf(y.id) || x.u - y.u);
      tsSave(); return t;
    }
    const tsSave = () => saveJSON('ts_bag', tsBag);
    // ---- MẢNH BẢO VẬT: đủ TS_MERGE_COST (25) mảnh CÙNG LOẠI thì ghép thành 1 Bảo Vật mới (Lv0 ★0). Tỷ Võ / Luận Kiếm chỉ rơi MẢNH, không rơi nguyên món. ----
    let TS_MERGE_COST = 25;   // admin chỉnh: treasure.mergeCost
    cfgOnApply(() => { TS_MERGE_COST = Math.max(1, Math.floor(cfgNum('treasure.mergeCost', 25))); });
    let tsShards = (() => { const o = loadJSON('ts_shards'); return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {}; })();   // { loại: số mảnh }
    const tsShardOf = k => Math.max(0, Math.floor(Number(tsShards[k])) || 0);
    const tsShardSave = () => saveJSON('ts_shards', tsShards);
    function tsShardAdd(kind, n) {
      kind = Number(kind); n = Math.floor(Number(n)) || 0; if (n < 1 || !(TS_KINDS.includes(kind) || TS_DEFS[kind])) return 0;
      if (!TS_KINDS.includes(kind)) TS_KINDS.push(kind);
      tsShards[kind] = tsShardOf(kind) + n; tsShardSave(); return n;
    }
    // Ghép: trừ TS_MERGE_COST mảnh của loại `kind`, thêm 1 Bảo Vật. Trả về món mới (hoặc null nếu chưa đủ mảnh)
    function tsMerge(kind) {
      if (!TS_DEFS[kind] || tsShardOf(kind) < TS_MERGE_COST) return null;
      if (!TS_KINDS.includes(kind)) TS_KINDS.push(kind);
      tsShards[kind] = tsShardOf(kind) - TS_MERGE_COST; tsShardSave();
      return tsAdd(kind);
    }
    function tsMergeHTML() {
      const ok = k => tsShardOf(k) >= TS_MERGE_COST;
      const kinds = TS_KINDS.filter(k => TS_DEFS[k]).sort((a, b) => (ok(b) - ok(a)) || (tsShardOf(b) - tsShardOf(a)) || (TS_KINDS.indexOf(a) - TS_KINDS.indexOf(b)));
      const card = k => { const n = tsShardOf(k), can = ok(k);
        return `<div style="background:rgba(0,0,0,.28);border:1px solid ${can ? '#4ade80' : '#475569'};border-radius:10px;padding:6px 4px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:3px"><div class="ts-ico"><div class="ts-em" style="${tsFrameStyle(tsKindOf(k))}">${tsIcon(k)}</div><div class="ts-nm">${tsName(k)} ${tsGradeTag(tsKindOf(k))}</div></div><div style="font-weight:800;font-size:12px;color:${can ? '#4ade80' : '#cbd5e1'}">🧩 ${n}/${TS_MERGE_COST}</div><button class="btn-attack" style="padding:3px 12px;font-size:12px" ${can ? '' : 'disabled'} onclick="tsMergeDo(${k})">Ghép</button></div>`; };
      return `<div style="margin:12px 0 4px;font-weight:900;color:#fde68a;font-size:15px">🧩 Ghép Mảnh Bảo Vật</div><div class="set-note" style="margin-bottom:8px">Đủ ${TS_MERGE_COST} mảnh cùng loại ghép thành 1 Bảo Vật mới (Lv.0 ★0). Mảnh nhận từ Tỷ Võ (đổi 🔥) và Luận Kiếm.</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${kinds.map(card).join('')}</div>`;
    }
    function tsMergeDo(kind) {
      const box = document.getElementById('ts-list'); let sc = null, top = 0;   // giữ nguyên vị trí cuộn sau khi vẽ lại
      for (let e = box; e; e = e.parentElement) if (e.scrollHeight > e.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)) { sc = e; top = e.scrollTop; break; }
      const t = tsMerge(kind);
      if (!t) { try { scToast(`Chưa đủ ${TS_MERGE_COST} mảnh`); } catch (e) {} return; }
      tsRender(); tsRefreshOthers(); if (sc) sc.scrollTop = top;
      try { scToast('🎉 Đã ghép thành ' + tsName(kind) + '!'); } catch (e) {}
    }
    // ---- BÚA 🔨: đánh xong 1 Ải (Bàn 10, lần đầu) nhận 10 búa; mỗi búa tăng 1 ★ cho 1 Bảo Vật ----
    const HAMMER_PER_STAGE = 10;
    let hamClaimed = (() => { let k = 0; try { k = parseInt(localStorage.getItem('ham_claimed')) || 0; } catch (e) {} return Math.max(k, (progress.maxStage || 1) - 1); })();   // số Ải đã nhận búa (người chơi cũ tính bù)
    let hamSpent = (() => { try { return parseInt(localStorage.getItem('ham_spent')) || 0; } catch (e) { return 0; } })();
    if (tsRefund > 0) { hamSpent = Math.max(0, hamSpent - tsRefund); try { localStorage.setItem('ham_spent', String(hamSpent)); } catch (e) {} tsSave(); tsRefund = 0; }
    const hammerCount = () => Math.max(0, hamClaimed * HAMMER_PER_STAGE - hamSpent);
    function claimStageHammer(stage) {
      if (stage <= hamClaimed) return '';
      hamClaimed = stage;
      try { localStorage.setItem('ham_claimed', String(hamClaimed)); } catch (e) {}
      return `\n\n🔨 Nhận ${HAMMER_PER_STAGE} Búa! Búa cất trong Túi Đồ (còn ${hammerCount()} 🔨).`;
    }
    // Tăng sao: tiêu 1 Bảo Vật CÙNG LOẠI (chưa gắn vào khung) làm nguyên liệu, +1★ cho món được chọn. Búa 🔨 vẫn giữ trong Túi Đồ, không dùng ở đây.
    async function tsStarUp(u) {
      const t = tsFind(u); if (!t) return;
      if ((t.star | 0) >= TS_STAR_MAX) { alert('⭐ ' + tsName(t.id) + ' đã đạt tối đa ' + TS_STAR_MAX + ' sao.'); return; }
      const fodder = tsBag.filter(x => x.u !== t.u && x.id === t.id && x.f < 0).sort((x, y) => (x.star | 0) - (y.star | 0) || x.lv - y.lv)[0];
      if (!fodder) { alert('Cần thêm 1 ' + tsName(t.id) + ' cùng loại (chưa gắn vào khung) để làm nguyên liệu tăng sao.\nĐổi thêm bản mới bằng 🔥 ở Tỷ Võ.'); return; }
      if (!(await notifyConfirm('Tiêu 1 ' + tsName(t.id) + ' (Lv.' + fodder.lv + ' ★' + (fodder.star | 0) + ') làm nguyên liệu?\n' + tsName(t.id) + ' sẽ tăng ★' + (t.star | 0) + ' → ★' + ((t.star | 0) + 1) + '.\nNguyên liệu bị mất vĩnh viễn.'))) return;
      tsBag.splice(tsBag.indexOf(fodder), 1);
      t.star = (t.star | 0) + 1; tsSave(); tsRender(); tsRefreshOthers();
    }
    const tsOfFrame = f => f >= 0 ? tsBag.filter(t => t.f === f) : [];
    const tsOf = heroId => tsOfFrame(frameOf(heroId));   // Bảo Vật của khung mà tướng đang đứng
    function tsBonus(heroId) {
      const b = { dodge: 0, atk: 0, hp: 0, acc: 0, crit: 0, critDmg: 0, tough: 0, atkFlat: 0, hpFlat: 0, pierce: 0, spd: 0, heal: 0 };
      tsOf(heroId).forEach(t => { const s = tsStatOf(t); Object.keys(b).forEach(k => { b[k] += s[k]; }); });
      return b;
    }
    const tsFmt = v => String(Math.round(v * 10) / 10);
    function tsRefreshOthers() {
      try { renderHomeTeam(); } catch (e) {}
      try { if (document.getElementById('hero-modal').style.display === 'flex' && detailId !== null) openHeroDetail(detailId); } catch (e) {}
      try { if (document.getElementById('screen-vohiep').classList.contains('active')) renderVoHiep(); } catch (e) {}
    }
    let tsCtx = -1, tsView = 'list';   // tsView: 'list' = tab Bảo Vật (tăng cấp / tăng sao / gắn khung) • 'merge' = tab Mảnh Bảo Vật (ghép mảnh)
    function tsOpen(ctx, view) { tsCtx = (ctx === undefined || ctx < 0) ? -1 : ctx; tsView = (view === 'merge' && tsCtx < 0) ? 'merge' : 'list'; tsRender(); document.getElementById('ts-modal').style.display = 'flex'; }
    function openBvhub() { tsBvBadge(); switchScreen('bvhub'); }
    function bvGo(k) { tsOpen(-1, k === 'merge' ? 'merge' : 'list'); }
    // Chấm đỏ trên icon Mảnh Bảo Vật: số loại đã đủ mảnh để ghép
    function tsBvBadge() { try { const el = document.getElementById('bvmerge-bd'); if (!el) return; const n = TS_KINDS.filter(k => TS_DEFS[k] && tsShardOf(k) >= TS_MERGE_COST).length; el.textContent = n; el.style.display = n > 0 ? '' : 'none'; } catch (e) {} }
    function tsClose() { document.getElementById('ts-modal').style.display = 'none'; tsPickClose(); }
    // Ô khung dùng chung cho Bảo Vật & Trang bị: hiện tướng đang đứng ở khung đó
    function frSlot(f, act, unEq) {
      if (f < 0) return `<div class="ts-hero empty" onclick="${act}">＋</div>`;
      const h = team[f] !== undefined ? heroById(team[f]) : null;
      return `<div class="ts-hero" onclick="${act}">${h ? heroIcon(h) : '—'}<small class="ts-fr">Khung ${f + 1}</small><div class="ts-x" onclick="event.stopPropagation();${unEq}">✕</div></div>`;
    }
    // Thanh EXP dưới tên Bảo Vật: exp hiện có / exp cần để lên cấp kế
    function tsExpBar(t) {
      const max = t.lv >= TS_MAX, need = tsExpNeed(t.lv), cur = max ? need : Math.min(need, Number(t.exp) || 0), pct = max ? 100 : Math.max(0, Math.min(100, cur / need * 100));
      return `<div style="width:92px;max-width:100%;margin-top:3px"><div style="height:7px;border-radius:4px;background:rgba(0,0,0,.55);border:1px solid #a16207;overflow:hidden"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#facc15,#f59e0b)"></div></div><div style="font-size:9px;line-height:1.2;font-weight:800;color:#fde68a;text-align:center;white-space:nowrap">${max ? 'MAX' : fmtN(cur) + '/' + fmtN(need)}</div></div>`;
    }
    function tsRender() {
      const lock = tsCtx >= 0;
      tsBvBadge();
      const ttl = document.getElementById('ts-title'); if (ttl) ttl.textContent = (!lock && tsView === 'merge') ? '🧩 Mảnh Bảo Vật' : '🔮 Bảo Vật';
      if (!lock && tsView === 'merge') { document.getElementById('ts-note').innerHTML = ''; document.getElementById('ts-list').innerHTML = tsMergeHTML(); return; }
      document.getElementById('ts-note').innerHTML = lock
        ? `Chọn Bảo Vật gắn vào <b>Khung ${tsCtx + 1}</b> (${tsOfFrame(tsCtx).length}/${TS_PER_HERO}). Bấm ô khung để gắn / tháo.`
        : `Tăng cấp: dùng Búa ${icoImg('hammer', '1.2em')} (1 búa = ${TS_HAM_EXP} EXP, bạn có <b>${fmtN(hammerCount())}</b> ${icoImg('hammer', '1.2em')}). Tăng sao: tiêu 1 Bảo Vật cùng loại (chưa gắn) để +1★ (% tăng theo phẩm chất, màu viền = phẩm chất). Bảo Vật giúp tăng sức mạnh Võ Hiệp. Mỗi khung gắn tối đa ${TS_PER_HERO} Bảo Vật và không được trùng loại, gắn vào khung nào thì tướng đứng ở khung đó nhận chỉ số (giống trang bị). Bấm ô khung để gắn / đổi, bấm ✕ để tháo. Ghép mảnh ở tab <b>Mảnh Bảo Vật</b> (${TS_MERGE_COST} mảnh = 1 Bảo Vật).`;
      document.getElementById('ts-list').innerHTML = tsBag.map(t => {
        const act = lock ? `tsToggle(${t.u})` : `frPick('ts',${t.u})`;
        return `<div class="ts-row"><div class="ts-ico"><div class="ts-em" style="${tsFrameStyle(tsKindOf(t.id))}">${tsIcon(t.id)}</div><div class="ts-nm">${tsName(t.id)} ${tsGradeTag(tsKindOf(t.id))}</div>${tsExpBar(t)}</div><div class="ts-link">🔗</div>${frSlot(t.f, act, `tsUnequip(${t.u})`)}
          <div class="ts-st"><b>Lv.${t.lv} <span style="color:#fbbf24">★${t.star}/${TS_STAR_MAX}</span></b>${tsLines(t)}${t.f >= 0 ? `<div class="ts-cnt">Khung ${t.f + 1} (${tsOfFrame(t.f).length}/${TS_PER_HERO})</div>` : ''}</div>
          <div class="ts-btns"><button class="btn-attack" ${t.lv >= TS_MAX ? 'disabled' : ''} title="Dùng 1 búa" onclick="tsUp(${t.u},1)">Tăng</button><button class="btn-close-battle" ${t.lv >= TS_MAX ? 'disabled' : ''} title="Dùng 10 búa" onclick="tsUp(${t.u},10)">+10</button><button class="btn-attack" style="background:linear-gradient(180deg,#a855f7,#6b21a8)" ${(t.star | 0) >= TS_STAR_MAX ? 'disabled' : ''} onclick="tsStarUp(${t.u})">⭐ Tăng sao</button></div></div>`;
      }).join('');
    }
    // n = số búa muốn dùng (tối đa bằng số búa đang có; dừng khi đạt cấp tối đa). Mỗi búa +TS_HAM_EXP exp, đủ exp thì lên cấp.
    function tsUp(u, n) {
      const t = tsFind(u); if (!t || t.lv >= TS_MAX) return;
      const have = hammerCount();
      if (have < 1) { try { scToast('Hết Búa 🔨! Búa nhận khi thắng Ải PVE hoặc chế độ Trốn.'); } catch (e) {} return; }
      let used = 0;
      while (used < n && used < have && t.lv < TS_MAX) {
        used++; t.exp = (Number(t.exp) || 0) + TS_HAM_EXP;
        while (t.lv < TS_MAX && t.exp >= tsExpNeed(t.lv)) { t.exp -= tsExpNeed(t.lv); t.lv++; }
      }
      if (t.lv >= TS_MAX) t.exp = 0;
      hamSpent += used; try { localStorage.setItem('ham_spent', String(hamSpent)); } catch (e) {}
      tsSave(); tsRender(); tsRefreshOthers();
    }
    // Khung f đã có Bảo Vật CÙNG LOẠI với t (không tính chính t)?
    const tsDupInFrame = (t, f) => tsOfFrame(f).some(x => x.id === t.id && x.u !== t.u);
    function tsMount(u, f) {
      const t = tsFind(u); if (!t || team[f] === undefined) return;
      if (t.f !== f && tsOfFrame(f).length >= TS_PER_HERO) return;   // khung đủ 3 món
      if (tsDupInFrame(t, f)) { alert('Khung ' + (f + 1) + ' đã có ' + tsName(t.id) + ' rồi.\nMỗi khung chỉ gắn 1 Bảo Vật mỗi loại (không được trùng).'); return; }
      t.f = f; tsSave(); tsRender(); tsRefreshOthers();
    }
    function tsToggle(u) { const t = tsFind(u); if (t) { if (t.f === tsCtx) tsUnequip(u); else tsMount(u, tsCtx); } }
    function tsUnequip(u) { const t = tsFind(u); if (!t) return; t.f = -1; tsSave(); tsRender(); tsRefreshOthers(); }
    // Chọn khung để gắn (Bảo Vật 'ts' hoặc Trang bị 'eq')
    let frPickRef = null;
    function frPick(kind, id) {
      frPickRef = { kind, id };
      const it = kind === 'ts' ? tsFind(id) : eqBag.find(x => x.id === id); if (!it) return;
      document.getElementById('ts-pick-title').textContent = kind === 'ts' ? `Gắn ${tsName(it.id)} vào khung` : `Gắn ${eqType(it.k).name} vào khung`;
      document.getElementById('ts-pick-list').innerHTML = Array.from({ length: FRAMES }, (_, i) => {
        const h = team[i] !== undefined ? heroById(team[i]) : null;
        const n = kind === 'ts' ? tsOfFrame(i).length : 0, mine = it.f === i, full = kind === 'ts' && ((n >= TS_PER_HERO && !mine) || tsDupInFrame(it, i)), dis = !h || full;
        return `<div class="hchip ${mine ? 'sel' : ''}" style="${dis ? 'opacity:.35;' : ''}" onclick="${dis ? '' : `frPickDo(${i})`}"><div class="e">${h ? heroIcon(h) : '—'}</div><div class="n">Khung ${i + 1}</div>${kind === 'ts' ? `<div class="ts-cnt">${n}/${TS_PER_HERO}</div>` : ''}</div>`;
      }).join('');
      document.getElementById('ts-pick').style.display = 'flex';
    }
    function frPickDo(i) { const r = frPickRef; tsPickClose(); if (!r) return; if (r.kind === 'ts') tsMount(r.id, i); else eqMountTo(r.id, i); }
    function tsPickClose() { document.getElementById('ts-pick').style.display = 'none'; frPickRef = null; }

;
/* === js/items/linhthu.js === */
/* LINH THÚ: sưu tầm giống Bảo Vật.
   - Mỗi con có cấp (Lv) và sao (★); có thể sở hữu NHIỀU BẢN cùng loại.
   - Mỗi KHUNG đội hình gắn tối đa LT_PER_FRAME con; tướng đứng ở khung nào nhận chỉ số của con ở khung đó (qua window.linhThuBonus → cột "Linh thú" trong Chi tiết tướng).
   - Mảnh Thú: đủ LT_MERGE_COST mảnh cùng loại ghép thành 1 Linh Thú mới (Lv0 ★0).
   - Cách nhận (quà / Gift Code / mail...): { t: 'linhthu', id: 1, n: 1 } và { t: 'ltshard', id: 1, n: 5 }.
   - stats = [[loại chỉ số, gốc, điểm cộng mỗi cấp], ...]; CÔNG THỨC: gốc × (1 + 0.5×★) × (1 + điểm×Lv).
   - Muốn dùng ảnh riêng thay emoji: khai LT_IMG[id] = 'giao-dien/linh-thu/ten.webp'. */
const LT_FRAMES = 5, LT_PER_FRAME = 1;
let LT_MAX = 100, LT_STAR_MAX = 10, LT_STAR_ADD = 0.5, LT_MERGE_COST = 25;
const LT_DEFS = {
  1: { name: 'Bạch Hổ',   emo: '🐯', stats: [['atk', 900, .12],  ['hp', 4500, .12]] },
  2: { name: 'Thanh Long', emo: '🐲', stats: [['atk', 700, .12],  ['spd', 15, .03]] },
  3: { name: 'Chu Tước',   emo: '🦜', stats: [['atk', 800, .12],  ['critDmg', 40, .08]] },
  4: { name: 'Huyền Vũ',   emo: '🐢', stats: [['hp', 6000, .15],  ['def', 60, .10]] },
  5: { name: 'Cửu Vĩ Hồ',  emo: '🦊', stats: [['hp', 4000, .12],  ['dodge', 15, .04]] },
  6: { name: 'Thiên Lộc',  emo: '🦌', stats: [['hp', 4500, .12],  ['heal', 120, .10]] }
};
const LT_KINDS = Object.keys(LT_DEFS).map(Number);
const LT_LABEL = { hp: 'HP', atk: 'Công', def: 'Thủ', spd: 'Tốc', heal: 'Hồi máu', dodge: 'Né', acc: 'Chuẩn', crit: 'Bạo', critDmg: 'Bạo Sát', tough: 'Bền', pierce: 'Phá giáp' };
const LT_IMG = {};
const ltName = id => LT_DEFS[id] ? LT_DEFS[id].name : 'Linh Thú';
const ltIcon = id => LT_IMG[id] ? `<img class="eq-img" src="${LT_IMG[id]}">` : `<span style="font-size:30px;line-height:1">${LT_DEFS[id] ? LT_DEFS[id].emo : '🐾'}</span>`;
const ltVal = (st, t) => st[1] * (1 + LT_STAR_ADD * (t.star | 0)) * (1 + st[2] * (t.lv | 0));
const ltNum = v => Math.round(v) >= 1000 ? fmtN(v) : String(Math.round(v * 10) / 10);
const ltSortFn = (x, y) => LT_KINDS.indexOf(x.id) - LT_KINDS.indexOf(y.id) || x.u - y.u;
let ltBag = (() => {
  let b = null; try { b = loadJSON('lt_bag'); } catch (e) {}
  if (!Array.isArray(b)) b = [];
  const used = new Set(), cnt = {};
  return b.filter(x => x && LT_DEFS[x.id]).map(o => {
    let u = Number.isInteger(o.u) ? o.u : 1; while (used.has(u)) u++; used.add(u);
    let f = Number.isInteger(o.f) && o.f >= 0 && o.f < LT_FRAMES ? o.f : -1;
    if (f >= 0) { cnt[f] = (cnt[f] || 0) + 1; if (cnt[f] > LT_PER_FRAME) f = -1; }
    return { u, id: o.id, lv: Math.max(0, Math.min(LT_MAX, o.lv | 0)), star: Math.max(0, Math.min(LT_STAR_MAX, o.star | 0)), f };
  }).sort(ltSortFn);
})();
let ltShards = (() => { let o = null; try { o = loadJSON('lt_shards'); } catch (e) {} return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {}; })();
const ltSave = () => saveJSON('lt_bag', ltBag);
const ltShardSave = () => saveJSON('lt_shards', ltShards);
const ltShardOf = k => Math.max(0, Math.floor(Number(ltShards[k])) || 0);
const ltFind = u => ltBag.find(x => x.u === u);
const ltOfFrame = f => f >= 0 ? ltBag.filter(t => t.f === f) : [];
function ltAdd(kind) {
  kind = Number(kind); if (!LT_DEFS[kind]) return null;
  const t = { u: ltBag.reduce((m, x) => Math.max(m, x.u), 0) + 1, id: kind, lv: 0, star: 0, f: -1 };
  ltBag.push(t); ltBag.sort(ltSortFn); ltSave(); return t;
}
function ltShardAdd(kind, n) {
  kind = Number(kind); n = Math.floor(Number(n)) || 0; if (n < 1 || !LT_DEFS[kind]) return 0;
  ltShards[kind] = ltShardOf(kind) + n; ltShardSave(); return n;
}
function ltMerge(kind) {
  if (!LT_DEFS[kind] || ltShardOf(kind) < LT_MERGE_COST) return null;
  ltShards[kind] = ltShardOf(kind) - LT_MERGE_COST; ltShardSave();
  return ltAdd(kind);
}
// Chỉ số Linh Thú cộng cho tướng (nối vào heroStatParts → cột "Linh thú")
window.linhThuBonus = function (heroId) {
  const o = {};
  ltOfFrame(frameOf(heroId)).forEach(t => { const d = LT_DEFS[t.id]; if (d) d.stats.forEach(st => { o[st[0]] = (o[st[0]] || 0) + ltVal(st, t); }); });
  Object.keys(o).forEach(k => { o[k] = Math.round(o[k] * 10) / 10; });
  return o;
};
function ltLines(t) { const d = LT_DEFS[t.id]; return d ? d.stats.map(st => `<div>${LT_LABEL[st[0]] || st[0]} +${ltNum(ltVal(st, t))}</div>`).join('') : ''; }

/* ---- Giao diện ---- */
let ltCtx = -1, ltView = 'list';   // ltView: 'list' = tab Linh Thú • 'merge' = tab Mảnh Thú
function openLthub() { ltBadge(); switchScreen('lthub'); }
function ltGo(k) { ltOpen(-1, k === 'merge' ? 'merge' : 'list'); }
function ltOpen(ctx, view) { ltCtx = (ctx === undefined || ctx < 0) ? -1 : ctx; ltView = (view === 'merge' && ltCtx < 0) ? 'merge' : 'list'; ltRender(); document.getElementById('lt-modal').style.display = 'flex'; }
function ltClose() { document.getElementById('lt-modal').style.display = 'none'; try { tsPickClose(); } catch (e) {} }
function ltBadge() {
  try { const el = document.getElementById('ltmerge-bd'); if (!el) return; const n = LT_KINDS.filter(k => ltShardOf(k) >= LT_MERGE_COST).length; el.textContent = n; el.style.display = n > 0 ? '' : 'none'; } catch (e) {}
}
function ltRefreshOthers() {
  try { renderHomeTeam(); } catch (e) {}
  try { if (document.getElementById('hero-modal').style.display === 'flex' && detailId !== null) openHeroDetail(detailId); } catch (e) {}
  try { if (document.getElementById('screen-vohiep').classList.contains('active')) renderVoHiep(); } catch (e) {}
}
function ltMergeHTML() {
  const ok = k => ltShardOf(k) >= LT_MERGE_COST;
  const kinds = LT_KINDS.slice().sort((a, b) => (ok(b) - ok(a)) || (ltShardOf(b) - ltShardOf(a)) || (LT_KINDS.indexOf(a) - LT_KINDS.indexOf(b)));
  const card = k => { const n = ltShardOf(k), can = ok(k);
    return `<div style="background:rgba(0,0,0,.28);border:1px solid ${can ? '#4ade80' : '#475569'};border-radius:10px;padding:6px 4px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:3px"><div class="ts-ico"><div class="ts-em">${ltIcon(k)}</div><div class="ts-nm">${ltName(k)}</div></div><div style="font-weight:800;font-size:12px;color:${can ? '#4ade80' : '#cbd5e1'}">🧩 ${n}/${LT_MERGE_COST}</div><button class="btn-attack" style="padding:3px 12px;font-size:12px" ${can ? '' : 'disabled'} onclick="ltMergeDo(${k})">Ghép</button></div>`; };
  return `<div style="margin:12px 0 4px;font-weight:900;color:#fde68a;font-size:15px">🧩 Ghép Mảnh Thú</div><div class="set-note" style="margin-bottom:8px">Đủ ${LT_MERGE_COST} mảnh cùng loại ghép thành 1 Linh Thú mới (Lv.0 ★0).</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${kinds.map(card).join('')}</div>`;
}
function ltRender() {
  const lock = ltCtx >= 0, ttl = document.getElementById('lt-title'), note = document.getElementById('lt-note'), box = document.getElementById('lt-list');
  ltBadge();
  if (!lock && ltView === 'merge') { ttl.textContent = '🧩 Mảnh Thú'; note.innerHTML = ''; box.innerHTML = ltMergeHTML(); return; }
  ttl.textContent = '🐾 Linh Thú';
  note.innerHTML = lock
    ? `Chọn Linh Thú gắn vào <b>Khung ${ltCtx + 1}</b> (${ltOfFrame(ltCtx).length}/${LT_PER_FRAME}). Bấm ô khung để gắn / tháo.`
    : `Mỗi khung gắn tối đa ${LT_PER_FRAME} Linh Thú, tướng đứng ở khung nào nhận chỉ số khung đó. Tăng sao: tiêu 1 Linh Thú cùng loại (chưa gắn) để +1★, +50% chỉ số gốc. Ghép mảnh ở tab <b>Mảnh Thú</b> (${LT_MERGE_COST} mảnh = 1 Linh Thú).`;
  box.innerHTML = ltBag.length ? ltBag.map(t => {
    const act = lock ? `ltToggle(${t.u})` : `ltPick(${t.u})`;
    return `<div class="ts-row"><div class="ts-ico"><div class="ts-em">${ltIcon(t.id)}</div><div class="ts-nm">${ltName(t.id)}</div></div><div class="ts-link">🔗</div>${frSlot(t.f, act, `ltUnequip(${t.u})`)}
      <div class="ts-st"><b>Lv.${t.lv} <span style="color:#fbbf24">★${t.star}/${LT_STAR_MAX}</span></b>${ltLines(t)}${t.f >= 0 ? `<div class="ts-cnt">Khung ${t.f + 1} (${ltOfFrame(t.f).length}/${LT_PER_FRAME})</div>` : ''}</div>
      <div class="ts-btns"><button class="btn-attack" ${t.lv >= LT_MAX ? 'disabled' : ''} onclick="ltUp(${t.u},1)">Tăng</button><button class="btn-close-battle" ${t.lv >= LT_MAX ? 'disabled' : ''} onclick="ltUp(${t.u},10)">+10</button><button class="btn-attack" style="background:linear-gradient(180deg,#a855f7,#6b21a8)" ${(t.star | 0) >= LT_STAR_MAX ? 'disabled' : ''} onclick="ltStarUp(${t.u})">⭐ Tăng sao</button></div></div>`;
  }).join('') : `<div class="set-note" style="text-align:center;margin:18px 0">Chưa có Linh Thú nào.<br>Thu thập mảnh rồi vào tab <b>Mảnh Thú</b> để ghép.</div>`;
}
function ltUp(u, n) { const t = ltFind(u); if (!t || t.lv >= LT_MAX) return; t.lv = Math.min(LT_MAX, t.lv + n); ltSave(); ltRender(); ltRefreshOthers(); }
async function ltStarUp(u) {
  const t = ltFind(u); if (!t) return;
  if ((t.star | 0) >= LT_STAR_MAX) { alert('⭐ ' + ltName(t.id) + ' đã đạt tối đa ' + LT_STAR_MAX + ' sao.'); return; }
  const fodder = ltBag.filter(x => x.u !== t.u && x.id === t.id && x.f < 0).sort((x, y) => (x.star | 0) - (y.star | 0) || x.lv - y.lv)[0];
  if (!fodder) { alert('Cần thêm 1 ' + ltName(t.id) + ' cùng loại (chưa gắn vào khung) để làm nguyên liệu tăng sao.\nGhép thêm bản mới ở tab Mảnh Thú.'); return; }
  if (!(await notifyConfirm('Tiêu 1 ' + ltName(t.id) + ' (Lv.' + fodder.lv + ' ★' + (fodder.star | 0) + ') làm nguyên liệu?\n' + ltName(t.id) + ' sẽ tăng ★' + (t.star | 0) + ' → ★' + ((t.star | 0) + 1) + '.\nNguyên liệu bị mất vĩnh viễn.'))) return;
  ltBag.splice(ltBag.indexOf(fodder), 1);
  t.star = (t.star | 0) + 1; ltSave(); ltRender(); ltRefreshOthers();
}
function ltMergeDo(kind) {
  const box = document.getElementById('lt-list'); let sc = null, top = 0;   // giữ vị trí cuộn
  for (let e = box; e; e = e.parentElement) if (e.scrollHeight > e.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)) { sc = e; top = e.scrollTop; break; }
  const t = ltMerge(kind);
  if (!t) { try { scToast(`Chưa đủ ${LT_MERGE_COST} mảnh`); } catch (e) {} return; }
  ltRender(); ltRefreshOthers(); if (sc) sc.scrollTop = top;
  try { scToast('🎉 Đã ghép thành ' + ltName(kind) + '!'); } catch (e) {}
}
// Gắn vào khung: nếu khung đang có con khác thì con đó được tháo ra túi
function ltMount(u, f) {
  const t = ltFind(u); if (!t || team[f] === undefined) return;
  ltOfFrame(f).forEach(x => { if (x.u !== t.u) x.f = -1; });
  t.f = f; ltSave(); ltRender(); ltRefreshOthers();
}
function ltUnequip(u) { const t = ltFind(u); if (!t) return; t.f = -1; ltSave(); ltRender(); ltRefreshOthers(); }
function ltToggle(u) { const t = ltFind(u); if (t) { if (t.f === ltCtx) ltUnequip(u); else ltMount(u, ltCtx); } }
let ltPickU = null;
function ltPick(u) {
  const it = ltFind(u); if (!it) return; ltPickU = u;
  document.getElementById('ts-pick-title').textContent = `Gắn ${ltName(it.id)} vào khung`;
  document.getElementById('ts-pick-list').innerHTML = Array.from({ length: FRAMES }, (_, i) => {
    const h = team[i] !== undefined ? heroById(team[i]) : null, mine = it.f === i, dis = !h;
    return `<div class="hchip ${mine ? 'sel' : ''}" style="${dis ? 'opacity:.35;' : ''}" onclick="${dis ? '' : `ltPickDo(${i})`}"><div class="e">${h ? heroIcon(h) : '—'}</div><div class="n">Khung ${i + 1}</div><div class="ts-cnt">${ltOfFrame(i).length}/${LT_PER_FRAME}</div></div>`;
  }).join('');
  document.getElementById('ts-pick').style.display = 'flex';
}
function ltPickDo(i) { const u = ltPickU; try { tsPickClose(); } catch (e) {} ltPickU = null; if (u !== null) ltMount(u, i); }
// Ô Linh Thú trong bảng Chi tiết tướng (nằm cột phải, dưới 4 ô trang bị)
function ltSlotHTML(f) {
  const x = f >= 0 ? ltOfFrame(f)[0] : null, act = f >= 0 ? `ltOpen(${f})` : '';
  const slot = x
    ? `<div class="hd-slot" onclick="${act}"><span>${ltIcon(x.id)}</span><small>Lv.${x.lv}</small>${x.star ? `<div class="hd-ts-stars" style="--n:${x.star}">${'<i>★</i>'.repeat(x.star)}</div>` : ''}</div>`
    : `<div class="hd-slot empty" onclick="${act}"><span>🐾</span><small>Gắn</small></div>`;
  return `<div class="hd-lt-wrap" style="margin-top:auto;text-align:center"><div style="font-size:11px;font-weight:800;color:#fde68a;margin-bottom:3px">🐾 Linh Thú</div>${slot}</div>`;
}
;

/* === js/items/treasure-extra.js === */
/* ===== js/items/treasure-extra.js =====
   Thêm 12 Bảo Vật mới (id 10-21). Nạp NGAY SAU treasure.js, TRƯỚC hero-progress.js.
   Tên + chỉ số bên dưới chỉ là GIÁ TRỊ MẶC ĐỊNH — chỉnh trong admin (mục Bảo Vật).
   Mỗi Bảo Vật: stats = [[loại, gốc, điểm/cấp] x3]. Loại hợp lệ: dodge, acc, crit, critDmg,
   tough, heal, atkFlat, hpFlat, pierce, spd, atk, hp. */
(function () {
  if (typeof TS_DEFS === 'undefined' || typeof TS_IMG === 'undefined') {
    console.error('[treasure-extra] không thấy TS_DEFS/TS_IMG — kiểm tra thứ tự nạp (phải sau treasure.js)');
    return;
  }
  const EXTRA = {
    10: { name: 'Tử Long Đao', stats: [['atkFlat', 1000, 0.15], ['crit', 30, 0.1], ['critDmg', 30, 0.15]] },
    11: { name: 'Xích Hỏa Thương', stats: [['atkFlat', 1000, 0.15], ['pierce', 5000, 0.15], ['crit', 30, 0.1]] },
    12: { name: 'Liệt Hỏa Luân', stats: [['atkFlat', 800, 0.15], ['critDmg', 20, 0.15], ['spd', 10, 0.02]] },
    13: { name: 'Tử Ngọc Địch', stats: [['hpFlat', 4000, 0.2], ['dodge', 20, 0.03], ['heal', 500, 0.15]] },
    14: { name: 'Thúy Trúc Trượng', stats: [['hpFlat', 4000, 0.2], ['tough', 20, 0.05], ['heal', 500, 0.15]] },
    15: { name: 'Vô Tự Thiên Thư', stats: [['acc', 15, 0.03], ['critDmg', 20, 0.15], ['spd', 10, 0.02]] },
    16: { name: 'Thất Sắc Liên Hoa', stats: [['atkFlat', 1500, 0.15], ['hpFlat', 6000, 0.2], ['crit', 40, 0.1]] },
    17: { name: 'Hắc Long Châu', stats: [['tough', 30, 0.05], ['pierce', 8000, 0.15], ['hpFlat', 6000, 0.2]] },
    18: { name: 'Thanh Long Cung', stats: [['acc', 20, 0.03], ['crit', 40, 0.1], ['pierce', 6000, 0.15]] },
    19: { name: 'Đào Hoa Phiến', stats: [['dodge', 30, 0.03], ['spd', 15, 0.02], ['critDmg', 25, 0.15]] },
    20: { name: 'Hỏa Phụng Cầm', stats: [['atkFlat', 1000, 0.15], ['heal', 600, 0.15], ['spd', 10, 0.02]] },
    21: { name: 'Kim Quang Kiếm', stats: [['atkFlat', 1200, 0.15], ['crit', 35, 0.1], ['critDmg', 30, 0.15]] }
  };
  const EXTRA_IMG = { 10: 'vat-pham-game/bao-vat/treasure-10.webp', 11: 'vat-pham-game/bao-vat/treasure-11.webp', 12: 'vat-pham-game/bao-vat/treasure-12.webp', 13: 'vat-pham-game/bao-vat/treasure-13.webp', 14: 'vat-pham-game/bao-vat/treasure-14.webp', 15: 'vat-pham-game/bao-vat/treasure-15.webp', 16: 'vat-pham-game/bao-vat/treasure-16.webp', 17: 'vat-pham-game/bao-vat/treasure-17.webp', 18: 'vat-pham-game/bao-vat/treasure-18.webp', 19: 'vat-pham-game/bao-vat/treasure-19.webp', 20: 'vat-pham-game/bao-vat/treasure-20.webp', 21: 'vat-pham-game/bao-vat/treasure-21.webp' };

  const base = {}; /* bản gốc để quay về khi admin xoá ghi đè */
  Object.keys(EXTRA).forEach(k => {
    base[k] = JSON.parse(JSON.stringify(EXTRA[k]));
    if (!TS_DEFS[k]) TS_DEFS[k] = JSON.parse(JSON.stringify(EXTRA[k]));
    if (!TS_IMG[k]) TS_IMG[k] = EXTRA_IMG[k];
  });

  /* Đọc cấu hình admin dạng chữ (tên, loại) từ bản lưu 'game_cfg' */
  function cfgRaw(path) {
    try {
      const c = JSON.parse(localStorage.getItem('game_cfg') || '{}');
      return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), c);
    } catch (e) { return undefined; }
  }

  /* Áp tên / loại / gốc / điểm mỗi cấp do admin chỉnh (cho mọi id mới) */
  function apply() {
    Object.keys(EXTRA).forEach(k => {
      const d = TS_DEFS[k], b = base[k];
      if (!d) return;
      const nm = cfgRaw('treasure.names.' + k);
      d.name = (typeof nm === 'string' && nm.trim()) ? nm.trim() : b.name;
      d.stats = b.stats.map((st, i) => {
        const t = cfgRaw('treasure.kinds.' + k + '.' + i + '.t');
        const g = typeof cfgNum === 'function' ? cfgNum('treasure.kinds.' + k + '.' + i + '.base', st[1]) : st[1];
        const p = typeof cfgNum === 'function' ? cfgNum('treasure.kinds.' + k + '.' + i + '.per', st[2]) : st[2];
        return [(typeof t === 'string' && t) ? t : st[0], g, p];
      });
    });
  }
  apply();
  if (typeof cfgOnApply === 'function') cfgOnApply(apply);
})();

;
/* === js/heroes/hero-progress.js === */
/* TƯỚNG: cấp / sao / hệ số tăng trưởng
   (tách từ index.html cũ — script) */

    // Cứ 10 cấp tướng được tăng thêm 1 sao (cấp 150 → tối đa ★15); thấp nhất vẫn là ★6 như cũ
    let STAR_ABS_MAX = 15;   // sao tối đa (admin chỉnh PROG_CFG.maxStar, ≤ 15)
    // Sao tối đa theo cấp tướng: cấp 20 → ★2, cấp 30 → ★3 ... (cấp 10 mỗi sao; admin chỉnh PROG_CFG.lvPerStar)
    const starCapOf = lv => Math.min(STAR_ABS_MAX, starCapByLv(lv));
    // CÁCH HIỂN THỊ SAO (dùng chung thẻ tướng, Tỷ Võ, Tăng Sao):
    //  ★1-5  : n sao thường (vàng)
    //  ★6-10 : sao LỚN = 2 sao → ★6 = 1 lớn + 4 nhỏ, ★7 = 2 lớn + 3 nhỏ … ★10 = 5 lớn
    //  ★11-15: luôn 5 sao lớn, đổi dần từ vàng sang ĐỎ → ★11 = 1 đỏ + 4 vàng, ★12 = 2 đỏ + 3 vàng … ★15 = 5 đỏ (tối đa)
    // opt.off: luôn hiện đủ 5 ô (sao chưa đạt mờ) • opt.bigPx: cỡ chữ sao lớn (mặc định 12)
    const heroStarsHTML = (n, opt) => {
      opt = opt || {}; n = Math.max(0, Math.min(STAR_ABS_MAX, n | 0));
      const big = n <= 5 ? 0 : Math.min(5, n - 5), red = n > 10 ? n - 10 : 0, px = opt.bigPx || 12;
      const one = (cls, bigStar) => '<i class="hs ' + cls + '"' + (bigStar ? ' style="font-size:' + px + 'px"' : '') + '>★</i>';
      let h = '';
      for (let k = 0; k < big; k++) h += one('b' + (k < red ? ' r' : ''), true);
      const sm = n <= 5 ? n : 5 - big;
      for (let k = 0; k < sm; k++) h += one('', false);
      if (opt.off && n < 5) for (let k = n; k < 5; k++) h += one('off', false);
      return h;
    };
    const homeStars = n => heroStarsHTML(n);
    const starStr = n => n <= STAR_MAX ? '★'.repeat(n) : '★×' + Math.min(n, STAR_ABS_MAX);
    function getProg(id) {
      const s = START_PROG[id] || { lv:1, star:1 }, p = heroProg[id] || {};
      const lv = Math.min(LV_MAX, Math.max(s.lv, p.lv || s.lv));
      return {
        lv,
        star: Math.min(starCapOf(lv), Math.max(s.star, p.star || s.star)),
        sk:   Math.min(SKILL_MAX, Math.max(1,     p.sk   || 1)),
        ql:   Math.min(6, Math.max(0, p.ql | 0))   // phẩm chất: 0=A, 1=A+, 2=S, 3=S+, 4=SS, 5=SS+, 6=SSS (mặc định mọi tướng = A)
      };
    }
    // % cộng thêm vào chỉ số cơ bản từ CẤP và SAO (cộng dồn, KHÔNG nhân chồng): cấp +3%/cấp, sao +10%/sao
    function growthParts(id) {
      const s = START_PROG[id] || { lv:1, star:1 }, p = getProg(id);
      return { lv: LV_GROWTH * (p.lv - s.lv), star: STAR_GROWTH * (p.star - s.star) };
    }
    function growth(id) { const g = growthParts(id); return 1 + g.lv + g.star; }   // hệ số hiển thị (chưa tính Đột Phá / Kinh Mạch)
    // HIỆU LỰC TUYỆT KỸ = hệ số gốc theo CHẤT TƯỚNG (cấp 1) + cộng thêm mỗi cấp kỹ năng theo loại sách dùng để lên cấp đó.
    //   Gốc cấp 1: Kỹ năng 60% • Công kích 150% • Hỗ trợ / Trị liệu / Thủ 100%   (admin: progress.skillBaseSkill / skillBaseAtk / skillBaseOther, đơn vị %)
    //   Mỗi cấp: Bí Kíp +5% • Yếu Quyết +10% • Vô Tự Thiên Thư +15%   (progress.skillStepBi / skillStepYeu / skillStepVo). Cấp 2 (miễn phí) tính như Bí Kíp.
    //   Loại sách của từng cấp lấy từ bảng skbCost() (Luận Kiếm & Sách): cấp 3-4 Bí Kíp, 5-6 Yếu Quyết, 7+ Vô Tự Thiên Thư.
    const SKILL_BASE_DEF = { skillBaseSkill: 60, skillBaseAtk: 150, skillBaseOther: 100 }, SKILL_STEP_DEF = { skillStepBi: 5, skillStepYeu: 10, skillStepVo: 15 };
    // PHẨM CHẤT TƯỚNG (A → SSS): quyết định hiệu lực tuyệt kỹ khởi điểm (%) theo chất tướng. Cột: skill = Kỹ năng • atk = Công kích • other = Hỗ trợ / Trị liệu / Thủ (hộ vệ)
    const QL_NAMES = ['A', 'A+', 'S', 'S+', 'SS', 'SS+', 'SSS'], QL_MAX = 6;
    const QL_COLOR = ['#9ca3af', '#4ade80', '#38bdf8', '#a78bfa', '#f472b6', '#fb923c', '#facc15'];
    const QL_TABLE = { skill: [60, 70, 90, 120, 160, 200, 400], atk: [150, 160, 180, 210, 250, 290, 490], other: [100, 110, 130, 160, 200, 240, 440] };
    const skillBaseOf = (id, qlo) => {
      let r = 'atk'; try { if (id != null && typeof roleOf === 'function') r = roleOf(id); } catch (e) {}
      const col = r === 'skill' ? 'skill' : r === 'atk' ? 'atk' : 'other';
      const k = r === 'skill' ? 'skillBaseSkill' : r === 'atk' ? 'skillBaseAtk' : 'skillBaseOther';
      let ql = qlo; if (ql == null) { try { ql = id != null ? getProg(id).ql : 0; } catch (e) { ql = 0; } }
      ql = Math.min(QL_MAX, Math.max(0, ql | 0));
      return (_pn(PROG_CFG[k], SKILL_BASE_DEF[k], 0, 100000) + (QL_TABLE[col][ql] - QL_TABLE[col][0])) / 100;   // phẩm chất A = số gốc (admin chỉnh được), mỗi bậc cộng thêm phần chênh của bảng
    };
    const skillStepOf = lv => {   // phần cộng thêm (dạng thập phân) khi LÊN cấp kỹ năng lv
      if (lv <= 1) return 0;
      let item = 'Bí Kíp'; try { const c = typeof skbCost === 'function' ? skbCost(lv) : null; if (c && c.item) item = c.item; } catch (e) {}
      const k = item === 'Vô Tự Thiên Thư' ? 'skillStepVo' : item === 'Yếu Quyết' ? 'skillStepYeu' : 'skillStepBi';
      return _pn(PROG_CFG[k], SKILL_STEP_DEF[k], 0, 100000) / 100;
    };
    const skillMultOf = (sk, id, qlo) => { let m = skillBaseOf(id, qlo); for (let lv = 2; lv <= sk; lv++) m += skillStepOf(lv); return m; };
    const skillMult = id => skillMultOf(getProg(id).sk, id);

    // ---- CHI PHÍ LÊN CẤP TƯỚNG: cấp 2 = 100 bạc + 200 gạo; mỗi cấp sau đắt hơn cấp trước 10% (cấp 3 = cấp 2 + 10%, cấp 4 = cấp 3 + 10%, ...) ----
    let LV_COST_SILVER = 100, LV_COST_RICE = 200, LV_COST_GROWTH = 1.1;
    const lvCost = lv => { const m = Math.pow(LV_COST_GROWTH, Math.max(0, lv - 2)); return { silver: Math.round(LV_COST_SILVER * m), rice: Math.round(LV_COST_RICE * m) }; };   // chi phí để LÊN cấp `lv`
    const lvCostRange = (from, n) => { let s = 0, r = 0; for (let i = 1; i <= n; i++) { const c = lvCost(from + i); s += c.silver; r += c.rice; } return { silver: s, rice: r }; };
    // Với số bạc/gạo hiện có, lên được tối đa bao nhiêu cấp (không quá n)
    const lvAffordable = (from, n) => { let k = 0, s = silver, r = rice; while (k < n) { const c = lvCost(from + k + 1); if (s < c.silver || r < c.rice) break; s -= c.silver; r -= c.rice; k++; } return k; };

    // ---- EXP TƯỚNG TỪ ĐÀO TIÊN: lên cấp tốn bạc + gạo (lvCost, như cũ) VÀ thêm EXP của tướng ----
    // 1 quả Đào Tiên = 300 EXP. EXP cần để lên cấp 1→2 = 20, mỗi cấp sau tăng thêm 30% (cấp 2→3 = 26, 3→4 = 34 ...).
    // Đào trong kho (Túi Đồ) được TỰ DÙNG khi bấm Lên cấp nếu EXP của tướng chưa đủ; EXP dư giữ lại cho tướng đó. Admin chỉnh: progress.taoExp / hexpBase / hexpGrowth
    let TAO_EXP = 300, HEXP_BASE = 20, HEXP_GROWTH = 30;
    cfgOnApply(() => { TAO_EXP = Math.max(1, Math.floor(cfgNum('progress.taoExp', 300))); HEXP_BASE = Math.max(1, cfgNum('progress.hexpBase', 20)); HEXP_GROWTH = Math.max(0, cfgNum('progress.hexpGrowth', 30)); });
    let heroExp = loadJSON('hero_exp');   // EXP đang dành cho từng tướng: { heroId: exp }
    const heroExpOf = id => Math.max(0, Number(heroExp[id]) || 0);
    const heroExpSave = () => saveJSON('hero_exp', heroExp);
    const heroExpNeed = lv => Math.max(1, Math.round(HEXP_BASE * Math.pow(1 + HEXP_GROWTH / 100, Math.max(0, lv - 1))));   // EXP để lên từ cấp `lv` → `lv+1`
    const heroExpRange = (from, n) => { let s = 0; for (let i = 0; i < n; i++) s += heroExpNeed(from + i); return s; };       // EXP để lên n cấp liên tiếp từ cấp `from`
    const taoQty = () => typeof skbQty === 'function' ? skbQty('Đào Tiên') : 0;
    const heroExpAvail = id => heroExpOf(id) + taoQty() * TAO_EXP;   // EXP của tướng + EXP quy đổi từ đào trong kho
    const heroExpLevels = (id, from, n) => { let k = 0, e = heroExpAvail(id); while (k < n) { const c = heroExpNeed(from + k); if (e < c) break; e -= c; k++; } return k; };   // lên được tối đa bao nhiêu cấp (≤ n) với EXP hiện có
    function heroExpSpend(id, from, levels) {   // trừ EXP cho `levels` cấp vừa lên: dùng EXP tướng trước, thiếu thì tiêu đào
      const need = heroExpRange(from, levels); let pool = heroExpOf(id);
      if (pool < need) { const tao = Math.ceil((need - pool) / TAO_EXP); if (typeof skbSpend === 'function') skbSpend('Đào Tiên', tao); pool += tao * TAO_EXP; }
      heroExp[id] = pool - need; heroExpSave();
    }
    // Chặn nút Lên cấp ('lv'): chỉ lên số cấp đủ EXP, lên xong mới trừ EXP/đào (không lên được thì không mất đào)
    function taoInstall() {
      const o = window.upgradeHero; if (typeof o !== 'function' || o.__tao) return;
      const w = function (kind, n) {
        if (kind !== 'lv') return o.apply(this, arguments);
        const id = vmId, p = getProg(id), want = Math.max(1, Math.floor(Number(n)) || 1), k = heroExpLevels(id, p.lv, want);
        if (k < 1) { try { scToast(`Thiếu EXP: cần ${fmtN(heroExpNeed(p.lv))}, đang có ${fmtN(heroExpAvail(id))} (1 Đào Tiên = ${TAO_EXP} EXP)`); } catch (e) {} return; }
        const before = p.lv, r = o.call(this, kind, k), gained = getProg(id).lv - before;
        if (gained > 0) heroExpSpend(id, before, gained);
        try { if (typeof renderUpg === 'function') renderUpg(); } catch (e) {}
        return r;
      };
      w.__tao = 1; window.upgradeHero = w;
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', taoInstall); else taoInstall();

progCfgSync();   // áp thông số admin (sau khi các biến ở trên đã khai báo)

;
/* === js/items/equipment-data.js === */
/* TRANG BỊ: định nghĩa loại trang bị và phần thưởng
   (tách từ index.html cũ — script) */

    // Chỉ số thực dùng trong trận = cơ bản × hệ số cấp/sao
    // ---- TRANG BỊ: gắn vào KHUNG (vị trí 1-5 ở trang chủ). Tướng đang đứng ở khung nào thì nhận chỉ số của khung đó ----
    const FRAMES = 5;
    let EQUIP_MAX = cfgNum('equip.maxLv', cfgSnap('eqMax', 1000));
    var EQUIP = [
      { k:'hat',   name:'Mũ',   icon:'<img class="eq-img" src="vat-pham-game/trang-bi/equipment-hat.webp?v=24">', stat:'hp',  per:1000, label:'HP'   },
      { k:'armor', name:'Áo',   icon:'<img class="eq-img" src="vat-pham-game/trang-bi/equipment-armor.webp?v=24">', stat:'def', per:50,   label:'Thủ'  },
      { k:'sword', name:'Kiếm', icon:'<img class="eq-img" src="vat-pham-game/trang-bi/equipment-sword.webp?v=24">', stat:'atk', per:300,  label:'Công' },
      { k:'boots', name:'Giày', icon:'<img class="eq-img" src="vat-pham-game/trang-bi/equipment-boots.webp?v=24">', stat:'spd', per:1,    label:'Tốc'  }
    ];
    // Phần thưởng: đánh thắng Ải 4 - Bàn 10 nhận mỗi loại 4 món vào Túi đồ (once = chỉ nhận lần đầu thắng)
    const EQ_REWARD = cfgSnap('eqReward', { stage:4, battle:10, each:4, startLv:1, once:true });
    cfgSnap('eqper', EQUIP.map(e => e.per)); EQUIP.forEach(e => { e.per = cfgNum('equip.per.' + e.k, e.per); });   // admin chỉnh "mỗi cấp +bao nhiêu"
    EQ_REWARD.each = cfgNum('equip.rewardEach', EQ_REWARD.each); EQ_REWARD.startLv = cfgNum('equip.rewardStartLv', EQ_REWARD.startLv);

;
/* === js/core/acc-exp.js === */
/* CẤP TÀI KHOẢN + EXP (thay cho hệ thống Chìa Khóa 🔑 cũ)
   - Thắng mỗi Bàn PVE (và quét) nhận EXP (admin chỉnh `pve.expBase` như bạc/gạo/Thần Đan/Tiên Đan). Đủ EXP thì tự lên cấp acc.
   - Cấp tướng ≤ cấp acc. Tăng sao đòi cấp tướng: cấp 20 mới lên ★2, cấp 30 mới lên ★3... (hệ số 10 và 2 luật này admin chỉnh ở game_config → progress). Trang bị cũng bị giới hạn bởi cấp acc (eqCap).
   - Admin chỉnh ở admin-config.html → tab "Cấp & EXP":
       exp.base = EXP cần để lên cấp 2 • exp.growth = % tăng thêm mỗi cấp  (EXP nhận mỗi Bàn: tab "Thưởng PVE")
   - Cấp 1→2 cần `base` EXP; cấp k→k+1 cần base × (1 + growth/100)^(k−1)  (mặc định 3000, +10%/cấp) */

const ACC_START = BLANK_START ? 1 : 74;   // tài khoản kiểu cũ (không có cờ blank_start) vẫn bắt đầu cấp 74
var EXP_CFG = cfgSnap('exp', { base: 3000, growth: 10 });
Object.assign(EXP_CFG, cfgGet('exp', {}));

let accLevel = (() => { let v = 0; try { v = parseInt(localStorage.getItem('acc_level')) || 0; } catch (e) {}
  return Math.min(LV_MAX, Math.max(ACC_START, v)); })();
let accExp = (() => { try { return Math.max(0, Math.floor(parseFloat(localStorage.getItem('acc_exp')) || 0)); } catch (e) { return 0; } })();   // EXP đang có ở cấp hiện tại

// EXP cần để lên từ cấp `lv` → `lv+1`
const expNeed = lv => {
  const base = Math.max(1, Number(EXP_CFG.base) || 3000), g = Math.max(0, Number(EXP_CFG.growth)); const gr = 1 + (isFinite(g) ? g : 10) / 100;
  const v = Math.round(base * Math.pow(gr, Math.max(0, lv - 1)));
  return isFinite(v) ? Math.max(1, v) : Number.MAX_SAFE_INTEGER;
};

// Cấp acc chính là giới hạn cấp của TẤT CẢ tướng và trang bị
// Cấp tối đa của 1 tướng = cấp acc (admin có thể tắt bằng progress.accLimitsLv = 0). Tướng đã vượt mức này từ trước giữ nguyên cấp.
const heroCap = id => Math.max(PROG_CFG.accLimitsLv ? accLevel : LV_MAX, getProg(id).lv);
const eqCap = () => accLevel;

function accSave() {
  try { localStorage.setItem('acc_level', String(accLevel)); localStorage.setItem('acc_exp', String(Math.floor(accExp))); } catch (e) {}
}
function updateAccExp() {
  const al = document.getElementById('acc-level'); if (al) al.innerText = accLevel;
  const full = accLevel >= LV_MAX, need = expNeed(accLevel), pct = full ? 100 : Math.max(0, Math.min(100, accExp / need * 100));
  const f = document.getElementById('exp-fill'); if (f) f.style.width = pct + '%';
  const t = document.getElementById('exp-text'); if (t) t.innerText = full ? 'EXP MAX' : 'EXP ' + fmtN(accExp) + ' / ' + fmtN(need);
}
const updateKeys = updateAccExp;   // tên cũ (một số file vẫn gọi)

// Cộng EXP, tự lên cấp. Trả về số cấp vừa lên.
function addAccExp(n) {
  n = Math.max(0, Math.floor(Number(n) || 0)); if (!n || accLevel >= LV_MAX) return 0;
  const from = accLevel; accExp += n;
  while (accLevel < LV_MAX) { const need = expNeed(accLevel); if (accExp < need) break; accExp -= need; accLevel++; }
  if (accLevel >= LV_MAX) accExp = 0;
  accSave(); updateAccExp();
  if (accLevel > from) {
    try { if (typeof updatePower === 'function') updatePower(); } catch (e) {}
    try { const s = document.getElementById('screen-vohiep'); if (s && s.classList.contains('active') && typeof renderVoHiep === 'function') renderVoHiep(); } catch (e) {}
  }
  return accLevel - from;
}

;
/* === js/core/stamina.js === */
/* THỂ LỰC và VIÊN THỂ LỰC
   (tách từ index.html cũ — script) */

    // ================= THỂ LỰC & VIÊN THỂ LỰC =================
    // • PvE: mỗi TRẬN tốn 1 thể lực (1 Bàn = 4 trận → tốn 4, trừ ngay khi vào Bàn) • 1 thể lực hồi sau 1 phút, hồi tối đa tới 200
    // • Đánh xong 1 Bàn nhận 10 Viên Thể Lực vào Túi đồ, mỗi viên +30 thể lực • PvP không tốn thể lực, không giới hạn lượt
    // Admin chỉnh ở admin.html → tab Thể lực (stamina.max / regenSec / perWave / waves / pill)
    let STA_MAX = 200, STA_REGEN_MS = 60000, STA_PER_WAVE = 1, STA_WAVES = 4, PILL_STA = 30;
    const PILL_PER_CLEAR = 10;
    cfgOnApply(() => {
      STA_MAX = Math.max(1, Math.floor(cfgNum('stamina.max', 200))); STA_REGEN_MS = Math.max(1, cfgNum('stamina.regenSec', 60)) * 1000;
      STA_PER_WAVE = Math.max(0, Math.floor(cfgNum('stamina.perWave', 1))); STA_WAVES = Math.max(1, Math.floor(cfgNum('stamina.waves', 4))); PILL_STA = Math.max(0, Math.floor(cfgNum('stamina.pill', 30)));
    });
    let staState = (() => {
      const s = loadJSON('sta_state'), now = Date.now();
      return { v: Number.isFinite(s.v) ? Math.max(0, Math.floor(s.v)) : STA_MAX, t: Number(s.t) || now, pills: Math.max(0, Math.floor(s.pills) || 0) };
    })();
    const staSave = () => saveJSON('sta_state', staState);
    function staTick() {
      const now = Date.now();
      if (staState.v >= STA_MAX) { staState.t = now; return; }
      const n = Math.floor((now - staState.t) / STA_REGEN_MS);
      if (n > 0) {
        staState.v = Math.min(STA_MAX, staState.v + n);
        staState.t = staState.v >= STA_MAX ? now : staState.t + n * STA_REGEN_MS;
        staSave();
      }
    }
    function staRender() {
      staTick();
      const v = document.getElementById('sta-val'), t = document.getElementById('sta-title');
      if (v) v.innerText = staState.v + '/' + STA_MAX;
      if (t) {
        if (staState.v >= STA_MAX) t.innerText = 'Thể Lực Đầy';
        else { const rest = Math.max(0, STA_REGEN_MS - (Date.now() - staState.t)); t.innerText = 'Thể Lực • +1 sau ' + Math.ceil(rest / 1000) + 's'; }
      }
    }
    function staSpend(n) {
      staTick();
      if (staState.v < n) return false;
      if (staState.v >= STA_MAX) staState.t = Date.now();   // bắt đầu tính giờ hồi từ lúc tụt dưới mức đầy
      staState.v -= n; staSave(); staRender();
      return true;
    }
    // Viên thể lực nhận mỗi Bàn: admin chỉnh ở pve.pillBase (cố định, không tăng theo Bàn)
    const pillPerClear = () => { const v = (typeof PVE_CFG !== 'undefined' && PVE_CFG.pillBase !== undefined) ? Number(PVE_CFG.pillBase) : PILL_PER_CLEAR; return isFinite(v) ? Math.max(0, Math.floor(v)) : PILL_PER_CLEAR; };
    function grantPills() {
      const n = pillPerClear(); if (n < 1) return '';
      staState.pills += n; staSave();
      if (document.getElementById('equip-modal').style.display === 'flex') renderEquip();
      return `\n\n💊 Nhận ${n} Viên Thể Lực vào Túi đồ (có ${staState.pills} viên)!`;
    }
    function usePills(n) {
      n = Math.min(n, staState.pills);
      if (n < 1) return;
      staTick();
      if (staState.v >= STA_MAX) staState.t = Date.now();
      staState.pills -= n; staState.v += n * PILL_STA; staSave();
      staRender(); renderEquip();
    }
    function pillPanelHtml() {
      const c = staState.pills;
      return `<div class="pill-box"><div class="pb-info">💊 <b>Viên Thể Lực</b> × ${c}<br><small>Mỗi viên +${PILL_STA} thể lực • Hiện có ${staState.v}/${STA_MAX}</small></div>` +
        `<button ${c < 1 ? 'disabled' : ''} onclick="usePills(1)">Dùng 1</button><button ${c < 1 ? 'disabled' : ''} onclick="usePills(10)">Dùng 10</button></div>`;
    }
    setInterval(staRender, 1000); staRender();

;
/* === js/items/equipment.js === */
/* TRANG BỊ: túi đồ, khung, cộng chỉ số
   (tách từ index.html cũ — script) */

    const eqType = k => EQUIP.find(e => e.k === k);
    // Túi đồ: mảng các món { id, k: loại, lv: cấp, f: số khung 0-4 đang gắn (-1 = nằm trong túi) }
    let eqBag = (() => {
      try {
        const a = JSON.parse(localStorage.getItem('eq_bag'));
        if (Array.isArray(a)) return a.filter(i => i && eqType(i.k)).map(i => ({
          id: Math.floor(i.id) || 0, k: i.k, lv: Math.min(EQUIP_MAX, Math.max(1, Math.floor(i.lv) || 1)),
          star: Math.max(0, Math.min(eqStarMax(), Math.floor(i.star) || 0)),
          f: (Number.isInteger(i.f) && i.f >= 0 && i.f < FRAMES) ? i.f : -1 }));
      } catch (e) {}
      // Chuyển dữ liệu bản trước (mỗi loại 1 món) sang túi đồ
      const lv = loadJSON('eq_lv'), mt = loadJSON('eq_mount'), out = [];
      EQUIP.forEach(e => {
        const l = Math.floor(lv[e.k] || 0), m = mt[e.k];
        if (l > 0 || (m !== undefined && m !== null)) out.push({ id: out.length + 1, k: e.k, lv: Math.min(EQUIP_MAX, Math.max(1, l)), f: (m >= 0 && m < FRAMES) ? m : -1 });
      });
      return out;
    })();
    const frameOf = id => team.indexOf(id);      // khung hiện tại của tướng (-1 = không ra trận)
    const eqAt = (f, k) => f >= 0 ? eqBag.find(i => i.f === f && i.k === k) : undefined;   // món loại k đang gắn ở khung f
    // ---- SAO TRANG BỊ: chỉ số cuối = chỉ số gốc × (1 + số★ × 25% + cấp × 5%) ----
    // chỉ số gốc = e.per (admin: "Chỉ số gốc" từng loại trang bị). Admin chỉnh: equip.starAdd (% mỗi sao, mặc định 25), equip.lvAdd (% mỗi cấp, mặc định 5), equip.maxStar (mặc định 10).
    // Tăng sao: tiêu 1 trang bị CÙNG LOẠI chưa gắn khung (tự chọn món cấp thấp nhất) → +1★ cho món được chọn.
    function eqStarAdd() { return Math.max(0, cfgNum('equip.starAdd', 25)) / 100; }
    function eqLvAdd() { return Math.max(0, cfgNum('equip.lvAdd', 5)) / 100; }
    function eqStarMax() { return Math.max(0, Math.floor(cfgNum('equip.maxStar', 10))); }
    function eqVal(it) { const e = eqType(it.k); return e ? e.per * (1 + (it.star | 0) * eqStarAdd() + (it.lv | 0) * eqLvAdd()) : 0; }
    function equipBonus(frame) {
      const b = { hp:0, atk:0, def:0, spd:0 };
      if (frame < 0) return b;
      eqBag.forEach(i => { if (i.f === frame) { const e = eqType(i.k); b[e.stat] += eqVal(i); } });
      return b;
    }

;
/* === js/heroes/hero-stats.js === */
/* TƯỚNG: chỉ số thực dụng trong trận và mô tả kỹ năng
   (tách từ index.html cũ — script) */

    // ===== DÀN HỖ TRỢ (màn Đội Ngũ) =====
    // 6 ô. Mỗi tướng hỗ trợ cộng cho TOÀN ĐỘI: HP / Công / Thủ / Hồi = chỉ số bồi dưỡng của chính tướng đó × (số sao ÷ 10)
    // VD: tướng có 100 HP — 10★ cộng +100 HP, 15★ cộng +150 HP. Đổi hệ số ở SUP_STAR_DIV.
    const SUP_SLOTS = 6, SUP_STAR_DIV = 10;
    let supIds = (() => {
      let a = []; try { a = JSON.parse(localStorage.getItem('support_ids')) || []; } catch (e) {}
      const out = [];
      for (let i = 0; i < SUP_SLOTS; i++) { const v = a[i]; out.push(Number.isInteger(v) && HEROES.some(h => h.id === v) && heroIsOwned(v) && !out.includes(v) && !team.includes(v) ? v : null); }
      return out;
    })();
    const supSave = () => { try { localStorage.setItem('support_ids', JSON.stringify(supIds)); } catch (e) {} };
    // chỉ số BỒI DƯỠNG của 1 tướng = đúng các thanh HP/Công/Thủ/Hồi ở màn Bồi Dưỡng (dotpha.js: exp × tỉ lệ), KHÔNG phải chỉ số gốc
    function supBase(id, base) {
      if (typeof dpBonusOf === 'function') return dpBonusOf(id);
      try {   // dự phòng nếu dotpha.js nạp sau / chưa nạp: đọc thẳng dữ liệu đã lưu
        const e = Math.max(0, ((JSON.parse(localStorage.getItem('dp_prog')) || {})[id] || {}).exp | 0);
        return { hp: Math.round(e * 0.5), atk: Math.round(e * 0.3), def: Math.round(e * 0.1), heal: Math.round(e * 0.1) };
      } catch (er) { return { hp: 0, atk: 0, def: 0, heal: 0 }; }
    }
    // phần 1 tướng hỗ trợ cộng cho đội
    function supGive(id, base) {
      const k = getProg(id).star / SUP_STAR_DIV, b = supBase(id, base);
      return { hp: Math.round(b.hp * k), atk: Math.round(b.atk * k), def: Math.round(b.def * k), heal: Math.round(b.heal * k) };
    }
    // tổng cả dàn hỗ trợ
    function supTotal(base) {
      const t = { hp: 0, atk: 0, def: 0, heal: 0 };
      supIds.forEach(id => { if (id == null || team.includes(id)) return; const g = supGive(id, base); t.hp += g.hp; t.atk += g.atk; t.def += g.def; t.heal += g.heal; });
      return t;
    }
    /* ======================= CƠ CHẾ TÍNH CHỈ SỐ (theo bảng thiết kế) =======================
       KHI ĐÁNH chỉ lấy chỉ số VÔ TRẬN:        vô trận = phụ thể × (tổng của tướng)        → heroBattleStats()
       TỔNG CỦA TƯỚNG (khi chưa vô trận)       = cơ bản tướng + bảo vật + bang + trang bị + hỗ trợ + bồi dưỡng + linh thú   → heroStats()
       • CƠ BẢN   = chỉ số gốc × (1 + 3%/cấp + 10%/sao + 5%/cấp đột phá)  — các % CỘNG DỒN trên chỉ số gốc, không nhân chồng.
                    Kinh Mạch tăng chỉ số cơ bản theo cấp kinh mạch (Tốc / Thủ / Né: +% trên gốc; Bền / Đỡ đòn: cộng thẳng).
                    Đột Phá còn nâng giới hạn Bồi Dưỡng (dotpha.js).
       • BẢO VẬT  = cộng thêm: % chỉ số cơ bản (đã gồm cấp/sao/đột phá/kinh mạch) + điểm cố định + các chỉ số phụ
       • BANG     = cộng thêm từ Lò Luyện Hỏa
       • TRANG BỊ = (trang bị + ngọc) × phụ linh        (ngọc / phụ linh: móc nối sẵn, xem gemBonus / phuLinhMult bên dưới)
       • HỖ TRỢ   = cộng thêm từ dàn Hỗ Trợ (chỉ tướng đang ra trận)
       • BỒI DƯỠNG = cộng thêm từ Bồi Dưỡng (exp × tỉ lệ)
       • LINH THÚ = cộng thêm từ linh thú (móc nối sẵn, xem linhThuBonus bên dưới)
       Mỗi tướng trả kèm .parts (không đếm khi sao chép) để màn Chi Tiết hiển thị từng nguồn. */
    const STAT_KEYS = ['hp', 'atk', 'def', 'heal', 'spd', 'dodge', 'acc', 'crit', 'critDmg', 'tough', 'pierce', 'block'];
    const ZERO_PART = () => { const o = {}; STAT_KEYS.forEach(k => { o[k] = 0; }); return o; };
    const STAT_PART_NAMES = [['base', 'Cơ bản'], ['bv', 'Bảo vật'], ['bang', 'Bang'], ['eq', 'Trang bị'], ['sup', 'Hỗ trợ'], ['boi', 'Bồi dưỡng'], ['linh', 'Linh thú']];
    // ---- Các nguồn nối từ file khác (lỗi / chưa nạp thì coi như 0) ----
    const _num = v => Number(v) || 0;
    function statSrc(fn, arg) { try { const r = (typeof fn === 'function') ? fn(arg) : null; if (!r) return ZERO_PART(); const o = ZERO_PART(); Object.keys(r).forEach(k => { if (k in o) o[k] = _num(r[k]); }); return o; } catch (e) { return ZERO_PART(); } }
    const kmSrc = id => { try { const b = (typeof window.kmBonus === 'function') ? window.kmBonus(id) : null; return Object.assign({ spd: 0, def: 0, dodge: 0, tough: 0, block: 0 }, b || {}); } catch (e) { return { spd: 0, def: 0, dodge: 0, tough: 0, block: 0 }; } };
    const dpSrc = id => { try { return (typeof window.dpStatsOf === 'function') ? window.dpStatsOf(id) : { bp: 0, exp: 0, pct: 0 }; } catch (e) { return { bp: 0, exp: 0, pct: 0 }; } };
    // Ngọc gắn trên trang bị của khung (CHƯA có hệ thống ngọc): định nghĩa window.gemBonus = frame => ({ hp, atk, def, spd }) khi làm xong.
    const gemSrc = frame => statSrc(window.gemBonus, frame);
    // Phụ linh nhân cho (trang bị + ngọc) (CHƯA có): window.phuLinhMult = frame => hệ số (1 = không phụ linh, 1.5 = +50%).
    const phuLinhSrc = frame => { try { const v = (typeof window.phuLinhMult === 'function') ? Number(window.phuLinhMult(frame)) : 1; return isFinite(v) && v > 0 ? v : 1; } catch (e) { return 1; } };
    // Linh thú cộng cho tướng (CHƯA có): window.linhThuBonus = heroId => ({ hp, atk, def, heal, spd, ... }).
    const linhThuSrc = id => statSrc(window.linhThuBonus, id);

    // Tính đủ từng nguồn + tổng. base = true (Tỷ Võ): chỉ lấy chỉ số cơ bản gốc, không lấy số chỉnh trong Cài đặt
    function heroStatParts(id, base) {
      const h = base ? Object.assign({}, heroById(id), HERO_DEFAULTS[id]) : heroById(id), R = Math.round, fr = frameOf(id);
      const gp = growthParts(id), dp = dpSrc(id), km = kmSrc(id), tb = tsBonus(id), eb = equipBonus(fr), gem = gemSrc(fr), pl = phuLinhSrc(fr);
      const gb = (typeof gdBonus === 'function') ? gdBonus() : {};
      const P = {}; STAT_PART_NAMES.forEach(([k]) => { P[k] = ZERO_PART(); });
      const pct = 1 + gp.lv + gp.star + (dp.pct || 0) / 100;   // % cấp + sao + đột phá: CỘNG DỒN
      // 1) CƠ BẢN
      P.base.hp = R(h.hp * pct); P.base.atk = R(h.atk * pct); P.base.heal = R((h.heal || 0) * pct);
      P.base.def = R(h.def * (pct + km.def / 100));
      P.base.spd = R(h.spd * (1 + km.spd / 100));
      P.base.dodge = Math.round((h.dodge || 0) * (1 + km.dodge / 100) * 10) / 10;
      P.base.acc = h.acc || 0; P.base.crit = h.crit || 0; P.base.critDmg = h.critDmg || 0; P.base.pierce = h.pierce || 0;
      P.base.tough = (h.tough || 0) + km.tough; P.base.block = Math.min(100, (h.block || 0) + km.block);
      // 2) BẢO VẬT (% tính trên chỉ số cơ bản)
      P.bv.hp = R(P.base.hp * tb.hp / 100) + tb.hpFlat; P.bv.atk = R(P.base.atk * tb.atk / 100) + tb.atkFlat;
      ['dodge', 'acc', 'crit', 'critDmg', 'tough', 'pierce', 'spd', 'heal'].forEach(k => { P.bv[k] = tb[k] || 0; });
      // 3) BANG
      ['hp', 'atk', 'def', 'pierce', 'spd', 'critDmg', 'heal'].forEach(k => { P.bang[k] = gb[k] || 0; });
      // 4) TRANG BỊ = (trang bị + ngọc) × phụ linh
      ['hp', 'atk', 'def', 'spd'].forEach(k => { P.eq[k] = R(((eb[k] || 0) + gem[k]) * pl); });
      // 5) HỖ TRỢ (chỉ tướng ra trận)
      if (team.includes(id)) { const b = supTotal(base); ['hp', 'atk', 'def', 'heal'].forEach(k => { P.sup[k] = b[k] || 0; }); }
      // 6) BỒI DƯỠNG
      try { if (typeof dpBonusOf === 'function') { const b = dpBonusOf(id); ['hp', 'atk', 'def', 'heal'].forEach(k => { P.boi[k] = b[k] || 0; }); } } catch (e) {}
      // 7) LINH THÚ
      P.linh = linhThuSrc(id);
      const t = {};
      STAT_KEYS.forEach(k => { t[k] = STAT_PART_NAMES.reduce((a, [p]) => a + (P[p][k] || 0), 0); });
      ['hp', 'atk', 'def', 'heal', 'spd'].forEach(k => { t[k] = R(t[k]); });
      t.dodge = Math.round(t.dodge * 10) / 10; t.block = Math.min(100, t.block);
      t.healGuild = P.bang.heal; t.rage = h.startRage || 0; t.tia = Math.max(1, Math.floor(h.tia || 1));
      Object.defineProperty(t, 'parts', { value: P, enumerable: false });   // không bị Object.assign / JSON cuốn theo
      return t;
    }
    // TỔNG CỦA TƯỚNG khi chưa vô trận (PVE / Tỷ Võ / chi tiết tướng đều dùng hàm này)
    function heroStats(id, base) { return heroStatParts(id, base); }
    // CHỈ SỐ VÔ TRẬN = phụ thể × tổng của tướng. Mọi trận đánh chỉ lấy số này.
    // bonus: ttBonus(...) đã tính sẵn (bỏ trống = phụ thể của thần thú đang mang). Truyền id để phụ thể theo chất tướng ăn đúng tướng.
    function heroBattleStats(id, base, bonus) {
      const s = Object.assign({}, heroStats(id, base));
      let b = bonus;
      if (b === undefined) { let tm = null; try { tm = (typeof ttMine === 'function') ? ttMine() : null; } catch (e) {} b = (typeof ttBonus === 'function') ? ttBonus(tm && tm.pt) : {}; }
      return (typeof ttApply === 'function') ? ttApply(s, b || {}, id) : s;
    }
    // Bảng "từng nguồn" cho màn Chi Tiết tướng (HP / Công / Thủ / Hồi + dòng vô trận)
    function heroBreakdownHTML(id) {
      const st = heroStats(id), P = st.parts, bs = heroBattleStats(id), cols = [['hp', '❤️ HP'], ['atk', '⚔️ Công'], ['def', '🛡️ Thủ'], ['heal', '💚 Hồi']];
      const td = 'style="padding:2px 6px;text-align:right"', th = 'style="padding:2px 6px;text-align:right;opacity:.75;font-weight:700"';
      const row = (nm, f, bold) => `<tr style="${bold ? 'font-weight:900;border-top:1px solid #475569' : ''}"><td style="padding:2px 6px;text-align:left">${nm}</td>${cols.map(c => `<td ${td}>${fmtN(f(c[0]))}</td>`).join('')}</tr>`;
      return `<details style="margin-top:8px"><summary style="cursor:pointer;font-weight:800">📊 Chỉ số tính từ đâu?</summary><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><tr><td></td>${cols.map(c => `<td ${th}>${c[1]}</td>`).join('')}</tr>`
        + STAT_PART_NAMES.map(([k, n]) => row(n, s => P[k][s] || 0)).join('')
        + row('Tổng của tướng', s => st[s] || 0, true) + row('Vô trận (× phụ thể)', s => bs[s] || 0, true)
        + `</table></div><div class="set-note" style="margin-top:4px">Khi đánh chỉ lấy dòng "Vô trận". Trang bị = (trang bị + ngọc) × phụ linh.</div></details>`;
    }

    // ---- Mô tả kỹ năng (số liệu lấy đúng theo cơ chế trận đấu + cấp kỹ năng hiện tại) ----
    function heroSkills(id) {
      const st = heroStats(id), sk = skillMult(id), p = getProg(id), pct = x => Math.round(x * 100);
      let ult;
      if (id === 4) ult = `KHÔNG TỐN NỘ – lượt nào cũng ulti được. Tụ khối cầu Thái Cực trắng đen, nhảy lên trời rồi ném xuống: gây ${TAICHI_HITS} lần sát thương, tổng ${pct(TAICHI_MULT * sk)}% Công (≈ ${fmtN(st.atk * TAICHI_MULT * sk)}) lên TOÀN BỘ địch. ${p.star >= STAR_MAX ? '(Đang ★6) ' : '(Đang ★' + p.star + ') '}★5: ngay sau khi ulti xong, choáng 1 địch ngẫu nhiên 2 hiệp (không chảy máu). ★6: TRƯỚC khi ném xuống, toàn bộ địch bị CHẢY MÁU ${TAICHI_BLEED_TURNS} hiệp, mỗi hiệp mất ${pct(TAICHI_BLEED_PCT)}% HP hiện tại; ngay sau khi ulti xong, choáng 2 địch ngẫu nhiên 2 hiệp.`;
      else if (id === 3) ult = `Cần đầy 100 nộ. Nhảy vọt lên, triệu hồi cơn mưa ${DUCO_SWORDS} thanh kiếm tím từ trên trời cắm xuống ào ạt. Tấn công TOÀN địch ${DUCO_HIT_COUNT} lần, tổng ${pct(DUCO_MULT * sk)}% Công, mỗi lần ≈ ${fmtN(st.atk * DUCO_MULT * sk / DUCO_HIT_COUNT)}. Toàn địch giảm ${pct(DUCO_SLOW)}% Tốc, toàn đội ta tăng ${pct(DUCO_HASTE)}% Tốc trong ${DUCO_BUFF_TURNS} hiệp.`;
      else if (id === 0) ult = `Cần đầy 100 nộ. Tan thành sương tím, DỊCH CHUYỂN sang sau đội hình địch rồi ulti ${TADE_HITS} nhát chém tím từ nhiều hướng; mỗi nhát trúng TOÀN BỘ địch còn sống: tổng ${pct(TADE_MULT * sk)}% Công (≈ ${fmtN(st.atk * TADE_MULT * sk)}, mỗi nhát ≈ ${fmtN(st.atk * TADE_MULT * sk / TADE_HITS)}). Mỗi nhát GIẢM ${pct(TADE_SLOW)}% Tốc toàn địch trong ${TADE_SLOW_TURNS} hiệp (không cộng dồn) và BỎ QUA BẤT TỬ – giết được cả tướng đang bất tử. Khi vào chiêu, TOÀN ĐỘI ta +${TADE_PIERCE} Phá giáp trong ${TADE_PIERCE_TURNS} hiệp. Xong dịch chuyển về chỗ cũ, nộ về 0.`;
      else if (id === 12) ult = `Ra trận ĐẦY NỘ. Ulti 18 đạo tàn ảnh dồn dập chạy từ đội ta sang đội địch. TOÀN ĐỘI nhận trong ${LB_TURNS} hiệp: +${pct(LB_DODGE_MULT)}% Né của Đoàn Dự (≈ +${fmtN(st.dodge * LB_DODGE_MULT)}% Né), +${pct(LB_SPD_MULT)}% Tốc của Đoàn Dự (≈ +${fmtN(st.spd * LB_SPD_MULT)} Tốc) và mỗi hiệp hồi ${pct(LB_HEAL_MULT)}% Máu của Đoàn Dự (≈ ${fmtN(st.hp * LB_HEAL_MULT)} máu/hiệp). Cần đầy 100 nộ, mỗi lần ulti xong nộ về 0.`;
      else if (id === 11) ult = `KHÔNG TỐN NỘ – hiệp nào cũng ulti được. Đứng tại chỗ tung chiêu: ${GO_STONES} cây cờ Thái Cực phóng thật nhanh xuống đội địch từng cây một, mỗi cây trúng gây ${pct(GO_STONE_PCT)}% HP hiện tại của địch bị trúng. Sau đó chọn BOSS MẠNH NHẤT (nhiều HP tối đa nhất), SAO CHÉP: đồng đội nhận CÔNG / THỦ / HP của boss, boss GIỮ NGUYÊN chỉ số. Từ lần sao chép thứ 2: so với lần trước, chỉ số nào lần 1 cao hơn thì giữ nguyên, chỉ số nào lần 2 cao hơn thì lấy lần 2 (không cộng dồn).`;
      else if (id === 10) ult = `KHÔNG TỐN NỘ – lượt nào cũng ulti được. Dang tay triệu hồi đầu lâu lửa phun lửa xuống TOÀN BỘ địch: ${SKEL_HITS} lần sát thương, tổng ${pct(SKEL_MULT * sk)}% Công (≈ ${fmtN(st.atk * SKEL_MULT * sk)}, mỗi lần ≈ ${fmtN(st.atk * SKEL_MULT * sk / SKEL_HITS)}) và GIẢM ${pct(SKEL_PCT)}% MÁU HIỆN TẠI của địch trong ${PD_HP_TURNS} hiệp (hết hạn thì máu được cộng lại). Địch né được thì không dính. Địch bị đánh xong mà HP còn ≤ ${pct(EXEC_PCT)}% HP tối đa sẽ bị TẤT SÁT – kết liễu ngay. Bản thân không bị trừ máu.`;
      else if (id === 2) ult = `KHÔNG TỐN NỘ – lượt nào cũng ulti được. Hằng Nga từ mặt đất bay vút lên trời, ngồi trên vầng trăng sáng; ánh trăng chiếu xuống toàn đội: GIẢI TẤT CẢ hiệu ứng bất lợi (chảy máu, choáng) của phe ta và dựng KHIÊN NGUYỆT QUANG: PHẢN ${pct(MOON_REFLECT)}% sát thương nhận vào về cho địch, đồng đội chỉ chịu ${pct(MOON_TAKE)}% sát thương. Khiên duy trì ${MOON_TURNS} hiệp.`;
      else if (id === 8) ult = `KHÔNG TỐN NỘ — lượt nào cũng ulti được. Biến lớn, triệu hồi ${TL_BUBBLES} bong bóng rơi dồn dập như mưa: tấn công TOÀN địch ${TL_HITS} lần, tổng ${pct(TL_MULT * sk)}% Công, mỗi lần ≈ ${fmtN(st.atk * TL_MULT * sk / TL_HITS)}. Cả đội ta +${TL_RAGE} nộ.`;
      else if (id === 7) ult = `Nhảy qua đầu tướng địch, xoay kiếm 5 vòng rồi giáng ${DRAGON_TIERS} lần sát thương lên TOÀN BỘ địch: tổng ${pct(DRAGON_MULT * sk)}% Công (≈ ${fmtN(st.atk * DRAGON_MULT * sk)}, mỗi lần ≈ ${fmtN(st.atk * DRAGON_MULT * sk / DRAGON_TIERS)}). Đồng thời mỗi địch bị GIẢM ${pct(PD_HP_PCT)}% MÁU HIỆN TẠI trong ${PD_HP_TURNS} hiệp (hết hạn thì máu được cộng lại), bản thân +${pct(PD_ATK_BUFF)}% Công ${PD_BUFF_TURNS} hiệp.`;
      else if (id === 1) ult = `Cần đầy 100 nộ. Mưa cánh hoa sen rơi từ trời xuống chỗ đồng đội đã gục, hoa sen xanh nở ra và HỒI SINH tối đa ${REVIVE_COUNT} tướng với ${pct(REVIVE_HP_PCT)}% HP (nộ về 0, chưa ra đòn ngay lượt đó). Chỉ ulti khi có đồng đội đã gục – nếu chưa có thì giữ nộ và đánh thường.`;
      else if (id === 6) ult = `KHÔNG TỐN NỘ – lượt nào cũng ulti được. Thứ tự: (1) TRƯỚC khi ulti, TOÀN ĐỘI được +${pct(BFLY_ATK_BUFF)}% Công (không cộng dồn, kéo dài hết trận); (2) toàn bộ địch dính hiệu ứng GIẢM theo 3 màu bướm ngẫu nhiên (trong 7 màu; đều ${pct(BF_PCT)}%, kéo dài ${BF_TURNS} hiệp): 🔴 Đỏ chảy máu • 🟠 Cam giảm sát thương • 🟡 Vàng giảm Thủ • 🟢 Lục giảm hồi máu • 🔵 Lam giảm nộ • 💜 Tím trúng độc; (3) bướm lần lượt rơi xuống giữa đội địch và nổ tia, mỗi lần gây ${pct(BFLY_MULT * sk / BFLY_HITS)}% Công (tổng ${pct(BFLY_MULT * sk)}%, ≈ ${fmtN(st.atk * (1 + BFLY_ATK_BUFF) * BFLY_MULT * sk / BFLY_HITS)} mỗi lần khi đã cộng Công) lên TOÀN BỘ địch; (4) NGAY SAU KHI ULTI XONG: 🟣 Chàm choáng ${BF_STUN_TARGETS} địch ngẫu nhiên ${BF_STUN_TURNS} hiệp • 💜 Tím câm lặng ${BF_SILENCE_TARGETS} địch ngẫu nhiên (không thể dùng tuyệt kỹ).`;
      else if (id === 5) ult = `Nâng hoa sen nở rộ, hồi ${pct(HEAL_MULT * sk)}% (Công + Thủ) ≈ ${fmtN(HEAL_MULT * sk * (st.atk + st.def))} máu cho toàn bộ đồng đội còn sống.`;
      else if (id === 9) ult = `KHÔNG TỐN NỘ – lượt nào cũng ulti được. Tung chiêu rồi PHÂN THÂN lao sang đội địch, lốc lửa bùng lên 1 lần trên TOÀN BỘ địch nhưng gây ${HTT_HITS} lần sát thương: tổng ${pct(HTT_MULT * sk)}% Công (≈ ${fmtN(st.atk * HTT_MULT * sk)}, mỗi lần ≈ ${fmtN(st.atk * HTT_MULT * sk / HTT_HITS)}). Hiệu ứng: ngay khi bắt đầu ulti TOÀN BỘ địch bị GIẢM ${pct(HTT_DEF_DOWN)}% Thủ ${HTT_DEF_TURNS} hiệp, và sau khi hết lượt đánh mỗi địch bị rút thêm ${pct(HTT_HP_PCT)}% HP hiện tại.`;
      else if (id === 13) ult = `Bay qua đội hình địch, phóng thật nhanh ${BC_HITS} cây tre (hiệu ứng) từ góc chéo trên màn hình xuống, gây sát thương ${BC_DMG_HITS} lần lên TOÀN địch, tổng ${pct(BC_MULT * sk)}% Công (≈ ${fmtN(st.atk * BC_MULT * sk)}). TRƯỚC khi tre rơi: tăng ${pct(BC_ATK_UP)}% Công toàn đội rồi giảm ${pct(BC_DEF_DOWN)}% Thủ của toàn địch (kéo dài ${BC_TURNS} hiệp).`;
      else if (id === 14) ult = `Nhảy lên cao thổi ra sóng âm, ${DT_HITS} lần gây sát thương lên TOÀN địch (tổng ${pct(DT_MULT * sk)}% Công ≈ ${fmtN(st.atk * DT_MULT * sk)}). TRƯỚC khi thổi sóng âm: tăng ${pct(DT_CRIT)}% Bạo toàn đội rồi giảm ${pct(DT_CRIT)}% Bạo của toàn địch (kéo dài ${DT_TURNS} hiệp).`;
      else if (id === 15) ult = `Triệu hồi cóc độc phun độc qua đội hình địch: toàn địch giảm ${pct(TD_DEF_DOWN)}% Thủ, mất ${pct(TD_HP_DOWN)}% máu hiện tại (bỏ qua giáp) và giảm ${pct(TD_SPD_DOWN)}% Tốc trong ${TD_TURNS} hiệp.`;
      else if (id === 16) ult = `Triệu hồi Phật Như Lai, chưởng ấn chữ Vạn rơi từ trời xuống: toàn địch giảm ${pct(ND_ALL_DOWN)}% TẤT CẢ thuộc tính (Công, Thủ, Tốc, Né, Chuẩn, Bạo, Bạo Sát, Bền, Phá giáp, Đỡ đòn) trong ${ND_TURNS} hiệp.`;
      else if (id === 17) ult = `Tăng TẤT CẢ thuộc tính của toàn đội thêm ${pct(VTD_ALL_UP)}% trong ${VTD_TURNS} hiệp, tính theo thuộc tính hiện có của từng đồng đội (Đỡ đòn tối đa 100%).`;
      else ult = `Lao vào địch, đánh ${ULT_HITS} đòn liên tiếp, mỗi đòn ${pct(ULT_MULT * sk)}% Công (≈ ${fmtN(st.atk * ULT_MULT * sk)} mỗi đòn). Cần đầy 100 nộ.`;
      { const hh = heroById(id), free = /^KHÔNG TỐN NỘ – (lượt|hiệp) nào cũng ulti được\.\s*/;
        if (hh.alwaysUlt) { if (!free.test(ult)) ult = 'KHÔNG TỐN NỘ – lượt nào cũng ulti được. ' + ult.replace(/Cần đầy 100 nộ[,.]?\s*/g, ''); }
        else if (free.test(ult)) ult = ult.replace(free, 'Cần đầy 100 nộ mới ulti được. '); }
      return [
        { tag:'Đánh thường', name:'Đòn Thường', desc:`Lao vào 1 địch ngẫu nhiên, gây ${fmtN(st.atk)} sát thương (100% Công). Mỗi lần đánh thường +${RAGE_ATK} nộ; mỗi lần tuyệt kỹ gây sát thương trúng +${RAGE_HIT} nộ; bị đánh không nhận nộ (PvP: +${RAGE_PVP} nộ mỗi lượt).${st.tia > 1 ? ` Mỗi nhịp đánh (đòn thường lẫn từng nhịp tuyệt kỹ) có ${st.tia} tia: mỗi tia gây đủ 3 loại sát thương (Công, Bạo, Phá giáp) 100%, hiện ${st.tia} lần sát thương riêng.` : ''}` },
        { tag:'Tuyệt kỹ', name:HERO_ULT_NAME[id] || 'Tuyệt Kỹ', lv:p.sk, desc:ult },
        { tag:'Nội tại', name:'Nộ Khí', desc:`Mỗi lần bị đánh trúng +20 nộ (đủ 100 nộ để ulti). Né ${tsFmt(st.dodge)} điểm; kẻ tấn công cần Chuẩn ≥ Né + ${HIT_GAP} mới đánh trúng (VD Né ${tsFmt(st.dodge)} → Chuẩn ${tsFmt(st.dodge + HIT_GAP)}).${st.rage ? ` Vào trận với sẵn ${st.rage} nộ.` : ''}` },
        ...(id === 1 ? [{ tag:'Nội tại', name:'Thanh Liên Bất Tử', desc:`Vào trận KHÔNG có nộ. BẤT TỬ trong ${IMMORTAL_TURNS} hiệp đầu mỗi trận: nhận sát thương nhưng máu không thể xuống dưới 1.` }] : []),
        ...(heroById(id).taunt ? [{ tag:'Nội tại', name:(id === 8 ? 'Thiên Long Hộ Thể' : 'Tướng Thủ'), desc:'Là tướng thủ: địch luôn đánh vào tướng này TRƯỚC. Chỉ khi tướng này gục ngã, địch mới đánh sang các tướng khác.' }] : []),
        ...(heroById(id).prio2 ? [{ tag:'Nội tại', name:(HERO_ROLE[id] === 'heal' ? 'Tướng Trị Liệu' : 'Tướng Hỗ Trợ'), desc:(HERO_ROLE[id] === 'heal' ? 'Địch ưu tiên đánh THỨ 2: khi tướng thủ (nếu có) đã gục, địch sẽ đánh tướng này trước các tướng còn lại.' : 'Địch ưu tiên đánh THỨ 3: sau tướng thủ và tướng trị liệu, địch sẽ đánh tướng này trước tướng công kích và kỹ năng.') }] : [])
      ];
    }

    // ---- Mô tả NGẮN của tuyệt kỹ (chỉ hiện tuyệt kỹ trong Chi tiết tướng): đánh ai • tăng/giảm gì • dính hiệu ứng gì • mấy hiệp ----
    function heroUltOverride(id) { try { const o = cfgGet('skillText.' + id, null); return !!(o && typeof o === 'object' && typeof o[1] === 'string' && o[1].trim()); } catch (e) { return false; } }   // admin đã chỉnh chữ tuyệt kỹ → dùng chữ đó
    function heroUltShort(id) {
      try {
        const st = heroStats(id), sk = skillMult(id), pct = x => Math.round(x * 100);
        switch (id) {
          case 0: return `Dịch chuyển, chém TOÀN BỘ địch ${TADE_HITS} nhát (xuyên bất tử, giảm ${pct(TADE_SLOW)}% Tốc địch); đội ta +${TADE_PIERCE} Phá giáp ${TADE_PIERCE_TURNS} hiệp.`;
          case 1: return `Hồi sinh tối đa ${REVIVE_COUNT} đồng đội đã gục với ${pct(REVIVE_HP_PCT)}% HP.`;
          case 2: return `Hằng Nga bay lên ngồi trăng, giải hiệu ứng xấu (chảy máu, choáng) cả đội. Dựng khiên ${MOON_TURNS} hiệp: phản ${pct(MOON_REFLECT)}% sát thương cho địch, đồng đội chỉ chịu ${pct(MOON_TAKE)}% sát thương.`;
          case 3: return `Mưa ${DUCO_SWORDS} kiếm đánh toàn địch ${DUCO_HIT_COUNT} lần. Địch giảm ${pct(DUCO_SLOW)}% Tốc; cả đội ta tăng ${pct(DUCO_HASTE)}% Tốc, ${DUCO_BUFF_TURNS} hiệp.`;
          case 4: return `Đánh TOÀN BỘ địch. ★5: choáng 1 địch ngẫu nhiên 2 hiệp. ★6: toàn địch chảy máu ${TAICHI_BLEED_TURNS} hiệp (mất ${pct(TAICHI_BLEED_PCT)}% HP hiện tại mỗi hiệp), choáng 2 địch ngẫu nhiên 2 hiệp.`;
          case 5: return `Hồi máu cho TOÀN ĐỘI còn sống.`;
          case 6: return `Cả đội +${pct(BFLY_ATK_BUFF)}% Công. Đánh TOÀN BỘ địch; mỗi địch dính 3 hiệu ứng ngẫu nhiên ${BF_TURNS} hiệp (chảy máu, giảm sát thương, giảm Thủ, giảm hồi máu, giảm nộ, trúng độc). Sau đó choáng ${BF_STUN_TARGETS} địch ngẫu nhiên ${BF_STUN_TURNS} hiệp, câm lặng ${BF_SILENCE_TARGETS} địch ngẫu nhiên.`;
          case 7: return `Đánh TOÀN BỘ địch. Địch mất ${pct(PD_HP_PCT)}% máu hiện tại trong ${PD_HP_TURNS} hiệp. Bản thân +${pct(PD_ATK_BUFF)}% Công ${PD_BUFF_TURNS} hiệp.`;
          case 8: return `Mưa ${TL_BUBBLES} bong bóng đánh toàn địch ${TL_HITS} lần; cả đội ta +${TL_RAGE} nộ.`;
          case 9: return `Đánh TOÀN BỘ địch. Địch giảm ${pct(HTT_DEF_DOWN)}% Thủ ${HTT_DEF_TURNS} hiệp và bị rút ${pct(HTT_HP_PCT)}% HP hiện tại.`;
          case 10: return `Đánh TOÀN BỘ địch. Địch mất ${pct(SKEL_PCT)}% máu hiện tại trong ${PD_HP_TURNS} hiệp. Địch còn ≤ ${pct(EXEC_PCT)}% HP bị tất sát.`;
          case 11: return `Địch có Công cao nhất bị choáng 3 hiệp, choáng thêm 2 địch ngẫu nhiên 2 hiệp.`;
          case 12: return `Cả đội ${LB_TURNS} hiệp: +${pct(LB_DODGE_MULT)}% Né, +${pct(LB_SPD_MULT)}% Tốc (theo Đoàn Dự) và hồi ${pct(LB_HEAL_MULT)}% máu Đoàn Dự mỗi hiệp.`;
          case 13: return `Đánh TOÀN BỘ địch. Cả đội +${pct(BC_ATK_UP)}% Công, toàn địch giảm ${pct(BC_DEF_DOWN)}% Thủ, ${BC_TURNS} hiệp.`;
          case 14: return `Đánh TOÀN BỘ địch. Cả đội +${pct(DT_CRIT)}% Bạo, toàn địch giảm ${pct(DT_CRIT)}% Bạo, ${DT_TURNS} hiệp.`;
          case 15: return `TOÀN BỘ địch trong ${TD_TURNS} hiệp: giảm ${pct(TD_DEF_DOWN)}% Thủ, giảm ${pct(TD_SPD_DOWN)}% Tốc, trúng độc mất ${pct(TD_HP_DOWN)}% máu hiện tại.`;
          case 16: return `TOÀN BỘ địch giảm ${pct(ND_ALL_DOWN)}% mọi thuộc tính trong ${ND_TURNS} hiệp.`;
          case 17: return `Cả đội tăng ${pct(VTD_ALL_UP)}% mọi thuộc tính trong ${VTD_TURNS} hiệp.`;
          default: return `Lao vào địch đánh ${ULT_HITS} đòn liên tiếp.`;
        }
      } catch (e) { return ''; }
    }

;
/* === js/heroes/hero-detail.js === */
/* TƯỚNG: thẻ tướng trang chủ và bảng chi tiết tướng
   (tách từ index.html cũ — script) */

    // ---- Thẻ tướng ở trang chủ ----
    function renderHomeTeam() {
      const row = document.getElementById('home-team-row'); if (!row) return;
      row.innerHTML = team.map(id => {
        const h = heroById(id); if (!h) return '';
        const p = getProg(id), b = HERO_BORDER[id] || 'orange';
        return `<div class="hero-card border-${b}" onclick="openHeroDetail(${id})"><div class="hero-top-star"></div><div class="hero-bg-sprite">${heroIcon(h)}</div><div class="hero-bottom-bar"><div class="hero-lvl">${p.lv}</div><div class="hero-stars">${homeStars(p.star)}</div></div></div>`;
      }).join('');
    }

    // ---- Chi tiết tướng (bấm vào thẻ tướng ở trang chủ) ----
    let detailId = null;
    function openHeroDetail(id) {
      detailId = id;
      const h = heroById(id), p = getProg(id), st = heroStats(id), g = growth(id), f = frameOf(id), eb = equipBonus(f), pb = pvpBonus(f);
      document.getElementById('hd-ico').innerHTML = heroIcon(h);
      document.getElementById('hd-name').innerHTML = h.name + (f >= 0 ? `<span class="hd-frame">Khung ${f + 1}</span>` : '');
      document.getElementById('hd-sub').innerText = `Cấp ${p.lv}/${LV_MAX} • ${starStr(p.star)} (${p.star}/${starCapOf(p.lv)}) • Kỹ năng ${p.sk}/${SKILL_MAX}`;
      const gb = (typeof gdBonus === 'function') ? gdBonus() : {};   // cộng từ Lò Luyện Hỏa của bang (đã nằm sẵn trong heroStats → dùng cho cả PVE lẫn Tỷ Võ)
      const line = (label, val, bonus, pv, ts, gd) => `<div class="hd-line"><span>${label}</span><span>${val}${bonus ? ` <em>+${fmtN(bonus)}</em>` : ''}${pv ? ` <em class="pv" title="Cộng từ Tỷ Võ">+${fmtN(pv)}🏅</em>` : ''}${ts ? ` <em class="ts" title="Cộng từ Bảo Vật">+${fmtN(ts)}🔮</em>` : ''}${gd ? ` <em class="gd" title="Cộng từ Bang (Lò Luyện Hỏa)">+${fmtN(gd)}🏰</em>` : ''}</span></div>`;
      const tb = tsBonus(id);
      document.getElementById('hd-stats').innerHTML =
        line('❤️ HP', fmtN(st.hp), st.parts.eq.hp, pb.hp, st.parts.bv.hp, st.parts.bang.hp) + line('⚔️ Công', fmtN(st.atk), st.parts.eq.atk, pb.atk, st.parts.bv.atk, st.parts.bang.atk) + line('🛡️ Thủ', fmtN(st.def), st.parts.eq.def, pb.def, st.parts.bv.def, st.parts.bang.def) +
        line('⚡ Tốc', st.spd, st.parts.eq.spd, 0, st.parts.bv.spd, st.parts.bang.spd) + line('💨 Né', tsFmt(st.dodge)) + line('🎯 Chuẩn', tsFmt(st.acc)) + line('💥 Bạo', tsFmt(st.crit)) + line('🔥 Bạo Sát', tsFmt(st.critDmg), 0, 0, 0, gb.critDmg) + line('🧱 Bền', tsFmt(st.tough)) + line('🗡️ Phá giáp', fmtN(st.pierce), 0, 0, 0, gb.pierce) + line('☄️ Tia đánh', st.tia + ' tia') + line('💚 Hồi máu', fmtN(st.heal || 0) + '/hiệp', 0, 0, 0, gb.heal) + line('🛡️ Đỡ đòn', tsFmt(st.block) + '%') +
        line('🎭 Chất tướng', ROLE_ICON[HERO_ROLE[id]] + ' ' + ROLE_NAME[HERO_ROLE[id]]) + line('🔥 Nộ khởi đầu', st.rage) +
        line('📈 Hệ số cấp/sao', '×' + g.toFixed(2)) +
        (f < 0 ? '<div class="set-note" style="margin-top:6px">Tướng chưa ra trận nên không có khung để gắn trang bị.</div>' : '');
      try { document.getElementById('hd-stats').insertAdjacentHTML('beforeend', heroBreakdownHTML(id)); } catch (e) {}
      document.getElementById('hd-slots').innerHTML = EQUIP.map(e => {
        const it = eqAt(f, e.k);
        return `<div class="hd-slot ${it ? '' : 'empty'}" onclick="openEquip('${e.k}',${f})"><span>${e.icon}</span><small>${it ? 'Lv.' + it.lv + (it.star ? ' ★' + it.star : '') : 'Gắn'}</small></div>`;
      }).join('') + ltSlotHTML(f);
      const tl = tsOfFrame(f);
      document.getElementById('hd-ts').innerHTML = Array.from({ length: TS_PER_HERO }, (_, i) => {
        const x = tl[i], act = f >= 0 ? `tsOpen(${f})` : '';
        return x ? `<div class="hd-slot" style="${tsFrameStyle(tsKindOf(x.id))}" onclick="${act}"><span>${tsIcon(x.id)}</span><small>Lv.${x.lv}</small>${x.star ? `<div class="hd-ts-stars" style="--n:${x.star}">${'<i>★</i>'.repeat(x.star)}</div>` : ''}</div>` : `<div class="hd-slot empty" onclick="${act}"><span>📜</span><small>Gắn</small></div>`;
      }).join('');
      document.getElementById('hd-skills').innerHTML = heroSkills(id).filter(k => k.tag === 'Tuyệt kỹ').map(k =>   // chỉ hiện Tuyệt kỹ, mô tả ngắn
        `<div class="sk-card"><div class="sk-name">${k.name}<span class="sk-tag">${k.tag}</span>${k.lv ? `<span class="sk-lv">Lv ${k.lv}</span>` : ''}</div><div class="sk-desc">${heroUltOverride(id) ? k.desc : (heroUltShort(id) || k.desc)}</div></div>`).join('');
      document.getElementById('hero-modal').style.display = 'flex';
    }
    function closeHeroDetail() { document.getElementById('hero-modal').style.display = 'none'; }
    function upgradeFromDetail() { const id = detailId; closeHeroDetail(); openVoHiep(id); }

;
/* === js/core/settings.js === */
/* CÀI ĐẶT: âm thanh + cập nhật kho tướng + lưu đám mây.
   (Đã bỏ: nhạc nền, chỉnh thông số tướng, sao lưu thủ công. Thông số tướng / bảo vật / trang bị / boss bang
    nay do ADMIN chỉnh ở trang riêng admin-config.html, game tự tải về — xem js/core/remote-config.js.) */

    // ---- Cài đặt âm thanh: bật/tắt âm skill (lưu trong trình duyệt) ----
    let audioSet = Object.assign({ skill: true }, loadJSON('audio_set'));
    function renderAudioSwitches() {
      ['skill'].forEach(k => {
        const b = document.getElementById('sw-' + k); if (!b) return;
        b.className = 'snd-sw ' + (audioSet[k] ? 'on' : 'off');
        b.innerText = audioSet[k] ? 'BẬT' : 'TẮT';
      });
    }
    function toggleAudio(k) {
      audioSet[k] = !audioSet[k]; saveJSON('audio_set', audioSet);
      if (k === 'skill' && !audioSet.skill) { stopHeroSounds(); try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {} }
      renderAudioSwitches();
    }
    function updateRoster() {
      const ico = document.getElementById('ru-ico');
      if (ico) ico.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 700, easing: 'ease-in-out' });
      let n = 0;
      try { n = enemyPool().length; pvpGenOpps(); } catch (e) {}
      try { renderTeam(); renderHomeTeam(); renderPvp(); } catch (e) {}
      const m = document.getElementById('ru-msg');
      if (m) m.textContent = `✅ Đã cập nhật ${n} tướng vào PvE (trận 1, 2, 4) và Tỷ Võ. Đối thủ Tỷ Võ đã được làm mới.`;
    }
    function openSettings() { renderAudioSwitches(); if (typeof clRender === 'function') clRender(); document.getElementById('settings-modal').style.display = 'flex'; }
    function closeSettings() { document.getElementById('settings-modal').style.display = 'none'; renderHomeTeam(); }

;
/* === js/heroes/vohiep.js === */
/* QUẢN LÝ VÕ HIỆP: chọn tướng, tăng cấp
   (tách từ index.html cũ — script) */

    // ---- Quản lý Võ Hiệp: tăng cấp / tăng sao / tăng cấp kỹ năng ----
    let vmId = 0;
    function openVoHiep(id) {
      const _own = ownedHeroes(); if (!_own.length) { if (typeof scToast === 'function') scToast('Chưa có tướng nào — hãy Chiêu Mộ trước'); return; }
      vmId = (id !== undefined && heroById(id) && heroIsOwned(id)) ? id : (team.length ? team[0] : _own[0].id);
      renderVoHiep(); switchScreen('vohiep');
    }
    function vmSelect(id) { if (!heroIsOwned(id)) return; vmId = id; renderVoHiep(); }
    function upgradeHero(kind, n) {
      const cap = { lv:heroCap(vmId), star:starCapOf(getProg(vmId).lv), sk:SKILL_MAX }[kind], p = getProg(vmId);
      if (p[kind] >= cap) return;
      if (kind === 'star') {   // tăng sao tốn mảnh tướng
        const need = starCost(p.star + 1);
        if (shardsOf(vmId) < need) { alert(`Cần ${need} mảnh ${heroById(vmId).name} để lên ★${p.star + 1} (có ${shardsOf(vmId)}).\nQuay Chiêu Mộ để nhận mảnh tướng.`); return; }
        const miss = phachMiss(p.star + 1);
        if (miss.length) { alert(`Lên ★${p.star + 1} còn cần: ${phachText(p.star + 1)}.\nThiếu: ${miss.map(x => x.name).join(', ')}.`); return; }
        starPhach(p.star + 1).forEach(x => skbSpend(x.name, x.n));
        heroShards[vmId] = shardsOf(vmId) - need; saveJSON('hero_shards', heroShards); n = 1;
      }
      if (kind === 'lv') {     // tăng cấp tốn bạc + gạo; +10 cấp thì lên tối đa 10 cấp trong khả năng chi trả
        const k = lvAffordable(p.lv, Math.min(n, cap - p.lv));
        if (k < 1) { const c = lvCost(p.lv + 1); alert(`Không đủ bạc/gạo!\nLên cấp ${p.lv + 1} cần ${fmtN(c.silver)} bạc + ${fmtN(c.rice)} gạo\n(đang có ${fmtN(silver)} bạc, ${fmtN(rice)} gạo).\nĐánh PVE thắng từng Bàn để nhận thêm.`); return; }
        const tot = lvCostRange(p.lv, k); silver -= tot.silver; rice -= tot.rice; resSave(); n = k;
      }
      heroProg[vmId] = Object.assign({}, p, { [kind]: Math.min(cap, p[kind] + n) });
      saveJSON('hero_prog', heroProg); renderVoHiep(); renderHomeTeam(); if (typeof renderUpg === 'function') renderUpg();
    }

;
/* === js/items/equipment-ui.js === */
/* TRANG BỊ: giao diện túi đồ, nâng cấp, gắn/tháo + thưởng ải
   (tách từ index.html cũ — script) */

    // ---- Túi đồ trang bị: nâng cấp / gắn vào khung / tháo ----
    let eqTab = 'sword', eqCtx = -1, eqLock = false, eqMode = 'lv';   // eqMode: 'lv' = tăng cấp (Đá Linh) • 'star' = tăng sao (tiêu trang bị cùng loại)
    // HUB TRANG BỊ (giống hub Bảo Vật): 2 nút Tăng Cấp / Tăng Sao. Icon: giao-dien/trang-bi/tang-cap.webp & tang-sao.webp (chưa có ảnh thì hiện chữ thay thế)
    function openEqhub() { switchScreen('eqhub'); }
    function eqGo(mode) { openEquip(undefined, undefined, mode); }
    function eqIcFallback(img, emoji, label) {
      const d = document.createElement('div'); d.className = img.className;
      d.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-width:130px;min-height:130px;border:3px solid #d4a017;border-radius:16px;background:radial-gradient(circle,#5a3a12,#2a1808);color:#fde68a;font-weight:900;font-size:16px';
      d.innerHTML = `<span style="font-size:46px;line-height:1">${emoji}</span>${label}`; img.replaceWith(d);
    }
    function openEquip(k, ctx, mode) {
      eqMode = (mode === 'star' && !(k && ctx >= 0)) ? 'star' : 'lv';
      if (k) eqTab = k;
      eqCtx = (ctx === undefined) ? -1 : ctx;
      eqLock = !!k && eqCtx >= 0;           // bấm ô trang bị của khung: chỉ hiện loại đó để chọn gắn
      renderEquip(); document.getElementById('equip-modal').style.display = 'flex';
    }
    function closeEquip() { document.getElementById('equip-modal').style.display = 'none'; renderHomeTeam(); }
    function eqSetTab(k) { eqTab = k; renderEquip(); }
    function eqSave() { saveJSON('eq_bag', eqBag); }
    function eqRefresh() {
      eqSave(); renderEquip();
      if (document.getElementById('hero-modal').style.display === 'flex' && detailId !== null) openHeroDetail(detailId);
      if (document.getElementById('screen-vohiep').classList.contains('active')) renderVoHiep();
    }
    // ---- Nâng cấp trang bị bằng ĐÁ LINH (nhận ở Hang Tụ Linh) ----
    // Cấp 1→10: Đá Xanh Lá · 11→20: Đá Tím · 21→30: Đá Đen · 31→40: Vàng · 41→50: Cam · 51→60: Đỏ · 61→70: Trắng
    // Từ cấp 71: mỗi cấp tốn đủ 7 loại đá. Số viên (cấp đầu, kiểu NHÂN/CỘNG, hệ số) do admin chỉnh: admin.html → Trang Bị → "Đá nâng cấp trang bị".
    const EQ_STONES = ['Đá Xanh Lá', 'Đá Tím', 'Đá Đen', 'Đá Vàng', 'Đá Cam', 'Đá Đỏ', 'Đá Trắng'];
    // Mặc định (admin chỉnh). mode: 1 = NHÂN, 0 = CỘNG
    const EQ_STONE_DEF = { maxLv: 100, base: [1, 1, 1, 1, 1, 1, 1], mode: [1, 1, 1, 1, 1, 1, 1], step: [2, 3, 4, 5, 6, 7, 8], allBase: 5, allMode: 1, allStep: 2 };
    function eqStoneCfg() { try { return (typeof cfgGet === 'function' && cfgGet('equip.stone', null)) || {}; } catch (e) { return {}; } }
    const eqNum = (v, d) => { const x = Number(v); return (v !== undefined && v !== null && v !== '' && isFinite(x)) ? x : d; };
    const eqMaxLv = () => Math.max(1, Math.min(Math.floor(eqNum(eqStoneCfg().maxLv, EQ_STONE_DEF.maxLv)), EQUIP_MAX));
    const eqLvCap = () => Math.min(eqMaxLv(), eqCap());
    function eqStoneN(base, mode, step, k) { return Math.max(0, Math.round(mode === 0 ? base + step * k : base * Math.pow(step, k))); }
    function eqStoneCost(lv) {   // đá cần để lên từ cấp lv → lv+1: [{item, n}]
      const c = eqStoneCfg(), D = EQ_STONE_DEF, g = (o, i) => (o && typeof o === 'object') ? o[i] : undefined;
      if (lv <= 70) {
        const t = Math.floor((lv - 1) / 10), k = lv - 1 - t * 10;
        return [{ item: EQ_STONES[t], n: eqStoneN(eqNum(g(c.base, t), D.base[t]), eqNum(g(c.mode, t), D.mode[t]), eqNum(g(c.step, t), D.step[t]), k) }];
      }
      const n = eqStoneN(eqNum(c.allBase, D.allBase), eqNum(c.allMode, D.allMode), eqNum(c.allStep, D.allStep), lv - 71);
      return EQ_STONES.map(item => ({ item, n }));
    }
    const eqStoneQty = name => { const e = ((typeof gdSt === 'function' ? gdSt().kho : null) || {})[name]; return e ? (e.qty | 0) : 0; };
    const eqStoneImg = name => { const t = (typeof HANG_TIERS !== 'undefined' ? HANG_TIERS : []).find(x => x.name === name); return t ? `<img src="vat-pham-game/da-linh/${t.img}.webp" alt="${name}" style="width:16px;height:auto;vertical-align:middle">` : '💎'; };
    function eqUpgrade(id, n) {
      const it = eqBag.find(i => i.id === id), cap = eqLvCap(); if (!it || it.lv >= cap) return;
      const stock = {}, spent = {}; EQ_STONES.forEach(x => { stock[x] = eqStoneQty(x); spent[x] = 0; });
      let steps = 0;
      while (steps < n && it.lv + steps < cap) {
        const c = eqStoneCost(it.lv + steps);
        if (c.some(x => stock[x.item] < x.n)) break;
        c.forEach(x => { stock[x.item] -= x.n; spent[x.item] += x.n; }); steps++;
      }
      if (!steps) { const c = eqStoneCost(it.lv); return scToast('Không đủ đá: cần ' + c.map(x => fmtN(x.n) + ' ' + x.item).join(', ')); }
      const st = gdSt(); EQ_STONES.forEach(x => { if (spent[x] > 0) st.kho[x].qty -= spent[x]; }); gdSave(st);
      it.lv += steps; eqRefresh();
    }
    function eqMountTo(id, f) {
      const it = eqBag.find(i => i.id === id); if (!it || team[f] === undefined) return;
      const old = eqAt(f, it.k); if (old && old !== it) old.f = -1;    // khung đã có món cùng loại -> món cũ về túi
      it.f = f; eqRefresh();
    }
    // TĂNG SAO TRANG BỊ bằng HỎA THẠCH (vật phẩm trong Túi Đồ, rơi từ Ải sau / quà hằng ngày — admin đặt ở Thưởng PVE / Hộp Thư, loại "Vật phẩm" tên "Hỏa Thạch").
    // Sao 1 = equip.starBase (mặc định 10); mỗi sao sau đắt thêm equip.starGrow % (mặc định 40, cộng dồn); equip.starArr[sao-1] = số riêng từng sao (trống = tự tính).
    const EQ_STONE = 'Hỏa Thạch';
    function eqStarCost(n) {
      const o = (cfgGet('equip.starArr', []) || [])[n - 1], ov = Number(o);
      if (o !== '' && o != null && isFinite(ov) && ov >= 0) return Math.round(ov);
      return Math.ceil(Math.max(0, cfgNum('equip.starBase', 10)) * Math.pow(1 + Math.max(0, cfgNum('equip.starGrow', 40)) / 100, Math.max(0, n - 1)) - 1e-9);
    }
    function eqStarUp(id) {
      const it = eqBag.find(i => i.id === id); if (!it) return;
      if ((it.star | 0) >= eqStarMax()) { try { scToast('Đã đạt ' + eqStarMax() + ' sao tối đa'); } catch (e) {} return; }
      const need = eqStarCost((it.star | 0) + 1), have = skbQty(EQ_STONE);
      if (have < need) { try { scToast('Cần ' + fmtN(need) + ' ' + EQ_STONE + ' để lên ★' + ((it.star | 0) + 1) + ' (có ' + fmtN(have) + ')'); } catch (e) {} return; }
      if (need > 0 && !skbSpend(EQ_STONE, need)) return;
      it.star = (it.star | 0) + 1; eqRefresh();
    }
    function eqToggle(id) { const it = eqBag.find(i => i.id === id); if (it) { if (it.f === eqCtx) eqUnmount(id); else eqMountTo(id, eqCtx); } }
    function eqUnmount(id) { const it = eqBag.find(i => i.id === id); if (it) { it.f = -1; eqRefresh(); } }
    // Thưởng qua ải: cộng vào túi đồ, trả về nội dung thông báo ('' nếu không có thưởng)
    function grantStageReward(stage, battle) {
      if (stage !== EQ_REWARD.stage || battle !== EQ_REWARD.battle) return '';
      let done = false; try { done = localStorage.getItem('eq_reward_done') === '1'; } catch (e) {}
      if (EQ_REWARD.once && done) return '';
      let id = eqBag.reduce((m, i) => Math.max(m, i.id), 0);
      EQUIP.forEach(e => { for (let n = 0; n < EQ_REWARD.each; n++) eqBag.push({ id: ++id, k: e.k, lv: EQ_REWARD.startLv, f: -1 }); });
      try { localStorage.setItem('eq_reward_done', '1'); } catch (e) {}
      eqSave();
      return `\n\n🎁 Nhận thưởng vào Túi đồ: ${EQ_REWARD.each} Mũ, ${EQ_REWARD.each} Áo, ${EQ_REWARD.each} Kiếm, ${EQ_REWARD.each} Giày!`;
    }
    function renderEquip() {
      const e = eqType(eqTab);
      document.getElementById('eq-pills').innerHTML = '';   // Viên Thể Lực chỉ nằm trong Túi Đồ
      const ttl = document.getElementById('eq-title'); if (ttl) ttl.textContent = eqLock ? '🎒 Trang Bị' : eqMode === 'star' ? '⭐ Tăng Sao Trang Bị' : '⬆️ Tăng Cấp Trang Bị';
      document.getElementById('eq-sub').innerText = eqLock
        ? `Chọn ${e.name} gắn vào Khung ${eqCtx + 1}. Tướng đứng ở khung nào thì nhận chỉ số của khung đó.`
        : eqMode === 'star'
        ? `Tăng sao: tiêu ${EQ_STONE} (rơi từ Ải sau / quà hằng ngày) để +1★ cho món được chọn. Bạn có ${fmtN(skbQty(EQ_STONE))} ${gdIco(EQ_STONE, '🪨')}. Mỗi ★ +${Math.round(eqStarAdd() * 100)}% chỉ số gốc, mỗi cấp +${Math.round(eqLvAdd() * 100)}%. Tối đa ${eqStarMax()}★.`
        : `Cấp acc ${accLevel} → trang bị nâng tối đa tới cấp ${eqLvCap()} (vượt Ải nhận EXP để lên cấp acc). Nâng cấp tốn Đá Linh từ Hang Tụ Linh. Gắn vào khung nào thì tướng đứng ở khung đó được cộng chỉ số.`;
      document.getElementById('eq-tabs').innerHTML = eqLock ? '' : EQUIP.map(x =>
        `<button class="eq-tab ${x.k === eqTab ? 'on' : ''}" onclick="eqSetTab('${x.k}')">${x.icon} ${x.name} <small>${eqBag.filter(i => i.k === x.k).length}</small></button>`).join('');
      const all = eqBag.filter(i => i.k === eqTab).sort((a, b) => a.id - b.id);
      const rank = it => all.indexOf(it) + 1;
      const list = eqLock
        ? [...all].sort((a, b) => ((b.f === eqCtx) - (a.f === eqCtx)) || ((b.f < 0) - (a.f < 0)) || b.lv - a.lv)
        : all;
      let html = list.map(it => {
        const cap = eqLvCap(), max = it.lv >= cap, fr = it.f;
        const starMode = !eqLock && eqMode === 'star', sMax = eqStarMax(), stNeed = eqStarCost((it.star | 0) + 1), stHave = skbQty(EQ_STONE), canStar = (it.star | 0) < sMax && stHave >= stNeed;
        const cst = (max || starMode) ? [] : eqStoneCost(it.lv), canUp = !max && !cst.some(x => eqStoneQty(x.item) < x.n);
        const costHtml = (max || starMode) ? '' : `<div class="eq-cost" style="display:flex;flex-wrap:wrap;gap:2px 8px;font-size:11px;margin-top:2px">${cst.map(x => { const have = eqStoneQty(x.item); return `<span style="white-space:nowrap;color:${have >= x.n ? '#bbf7d0' : '#f87171'}">${eqStoneImg(x.item)} ${fmtN(have)}/${fmtN(x.n)}</span>`; }).join('')}</div>`;
        const hero = (fr >= 0 && team[fr] !== undefined) ? heroById(team[fr]) : null;
        const act = eqLock ? `eqToggle(${it.id})` : `frPick('eq',${it.id})`;
        return `<div class="ts-row"><div class="ts-ico"><div class="ts-em">${e.icon}</div><div class="ts-nm">${e.name} ${rank(it)}</div></div><div class="ts-link">🔗</div>${frSlot(fr, act, `eqUnmount(${it.id})`)}` +
          `<div class="ts-st"><b>Cấp ${it.lv}/${cap}${max ? (it.lv >= eqMaxLv() ? ' (tối đa)' : ' 🔒') : ''}</b><div style="color:#fbbf24">★${it.star | 0}/${sMax}</div><div>Gốc ${fmtN(e.per)} ${e.label} • ★ +${Math.round(eqStarAdd() * 100)}% • Cấp +${Math.round(eqLvAdd() * 100)}%</div><div>Hiện +${fmtN(eqVal(it))} ${e.label}</div>${starMode ? ((it.star | 0) >= sMax ? '' : `<div style="font-size:11px;color:${stHave >= stNeed ? '#bbf7d0' : '#f87171'}">${gdIco(EQ_STONE, '🪨')} ${EQ_STONE}: ${fmtN(stHave)}/${fmtN(stNeed)} → ★${(it.star | 0) + 1}</div>`) : ''}${costHtml}` +
          `<div class="ts-cnt">${fr < 0 ? '📦 Trong túi đồ' : `Khung ${fr + 1}${hero ? ' – ' + hero.name : ' (trống)'}`}</div></div>` +
          `<div class="ts-btns">${starMode ? `<button class="btn-attack" style="background:linear-gradient(180deg,#a855f7,#6b21a8)" ${canStar ? '' : 'disabled'} onclick="eqStarUp(${it.id})">⭐ Tăng sao</button>` : `<button class="btn-attack" ${canUp ? '' : 'disabled'} onclick="eqUpgrade(${it.id},1)">Tăng</button><button class="btn-close-battle" ${canUp ? '' : 'disabled'} onclick="eqUpgrade(${it.id},10)">+10</button><button class="btn-close-battle" ${canUp ? '' : 'disabled'} onclick="eqUpgrade(${it.id},${eqMaxLv()})">Tối đa</button>`}</div></div>`;
      }).join('');
      if (!list.length) html = `<div class="eq-empty">${eqBag.length ? `Chưa có ${e.name} nào.` : `🎒 Túi đồ trống.<br>Thắng <b>Ải ${EQ_REWARD.stage} - Bàn ${EQ_REWARD.battle}</b> để nhận ${EQ_REWARD.each} Mũ, ${EQ_REWARD.each} Áo, ${EQ_REWARD.each} Kiếm, ${EQ_REWARD.each} Giày.`}</div>`;
      if (eqLock) html += `<div class="md-acts"><button class="btn-close-battle" onclick="openEquip('${eqTab}')">Xem toàn bộ túi đồ</button></div>`;
      document.getElementById('eq-body').innerHTML = html;
    }
    function resetHeroProgress() {
      if (!confirm('Đặt lại cấp, sao, kỹ năng và trang bị của TẤT CẢ tướng về ban đầu?')) return;
      eqBag = []; eqSave(); try { localStorage.removeItem('eq_reward_done'); } catch (e) {}
      heroProg = {}; saveJSON('hero_prog', heroProg); renderVoHiep(); renderHomeTeam();
    }

;
/* === js/heroes/vohiep-render.js === */
/* QUẢN LÝ VÕ HIỆP: vẽ màn hình
   (tách từ index.html cũ — script) */

    function renderVoHiep() {
      const h = heroById(vmId), p = getProg(vmId), st = heroStats(vmId);
      const chips = ownedHeroes().map(x => { const q = getProg(x.id);
        return `<div class="hchip ${x.id === vmId ? 'sel' : ''}" onclick="vmSelect(${x.id})"><div class="e">${heroIcon(x)}</div><div class="n">${x.name}</div><div class="s">Lv${q.lv} ★${q.star}</div></div>`; }).join('');
      const up = (title, cur, next, note, btns) => `<div class="vm-up"><div class="vm-up-info"><b>${title}</b><span>${next ? cur + ' → ' + next : cur + ' (tối đa)'}</span><small>${note}</small></div><div class="vm-up-btns">${btns}</div></div>`;
      const lvCap = heroCap(vmId), lvMax = p.lv >= lvCap, lvFull = p.lv >= LV_MAX, starMax = p.star >= starCapOf(p.lv), skMax = p.sk >= SKILL_MAX;
      document.getElementById('vm-body').innerHTML = `
        <div class="hero-chips">${chips}</div>
        <div class="vm-hero"><div class="hd-ico">${heroIcon(h)}</div><div class="hd-info"><div class="hd-name">${h.name}</div><div class="hd-sub">Cấp ${p.lv}/${LV_MAX} • ★${p.star}/${starCapOf(p.lv)} • Kỹ năng ${p.sk}/${SKILL_MAX}</div><div class="hd-sub">HP ${fmtN(st.hp)} • Công ${fmtN(st.atk)} • Thủ ${fmtN(st.def)} • Tốc ${st.spd}</div></div></div>
        ${up('⬆ Tăng Cấp', 'Cấp ' + p.lv + '/' + lvCap, lvMax ? '' : 'Cấp ' + (p.lv + 1), `+${LV_GROWTH * 100}% HP / Công / Thủ mỗi cấp` + (lvMax ? '' : ` • Lên cấp ${p.lv + 1} tốn 🥈 ${fmtN(lvCost(p.lv + 1).silver)} + 🍚 ${fmtN(lvCost(p.lv + 1).rice)} (có 🥈 ${fmtN(silver)} • 🍚 ${fmtN(rice)}). +10 cấp: nâng tối đa 10 cấp trong khả năng`) + (lvMax ? (lvFull ? ' • Đã đạt cấp tối đa' : ' • 🔒 Đã chạm cấp acc — vượt Ải nhận EXP để lên cấp acc, mở thêm cấp tướng') : ''),
             `<button ${lvMax || lvAffordable(p.lv, 1) < 1 ? 'disabled' : ''} onclick="upgradeHero('lv',1)">+1 cấp</button><button ${lvMax || lvAffordable(p.lv, 1) < 1 ? 'disabled' : ''} onclick="upgradeHero('lv',10)">+10 cấp</button>`)}
        ${up('⭐ Tăng Sao', '★' + p.star, starMax ? '' : '★' + (p.star + 1), `+${STAR_GROWTH * 100}% HP / Công / Thủ mỗi sao` + (starMax ? (p.star >= STAR_ABS_MAX ? ' • Đã đạt sao tối đa' : ` • 🔒 Cần tướng cấp ${PROG_CFG.lvPerStar * (p.star + 1)} để lên ★${p.star + 1}`) : ` • 🧩 Cần ${starCost(p.star + 1)} mảnh (có ${shardsOf(vmId)})` + (starPhach(p.star + 1).length ? ' • 🔮 ' + phachText(p.star + 1) : '')),
             `<button ${starMax || shardsOf(vmId) < starCost(p.star + 1) || phachMiss(p.star + 1).length ? 'disabled' : ''} onclick="upgradeHero('star',1)">Tăng sao</button>`)}
        ${up('📖 Tăng Cấp Kỹ Năng', 'Kỹ năng ' + p.sk, skMax ? '' : 'Kỹ năng ' + (p.sk + 1), (skMax ? 'Đã đạt cấp kỹ năng tối đa' : `+${Math.round(skillStepOf(p.sk + 1) * 100)}% hiệu lực tuyệt kỹ khi lên cấp này`),
             `<button ${skMax ? 'disabled' : ''} onclick="upgradeHero('sk',1)">Nâng cấp</button>`)}
        <div class="vm-links"><button onclick="openEquip()">🎒 Trang bị</button><button onclick="openHeroDetail(${vmId})">📊 Xem thông số &amp; kỹ năng</button><button onclick="resetHeroProgress()">↺ Đặt lại tất cả (Test)</button></div>`;
    }

;
/* === js/heroes/vohiep-upg.js === */
/* MÀN NÂNG CẤP 1 TƯỚNG: Tăng Sao / Thăng Cấp (Bồi Dưỡng) / Nâng Kỹ Năng.
   Luồng: Võ Hiệp -> chọn mục -> chọn tướng -> màn này (trước ➜ sau). Tăng sao chỉ cần MẢNH của chính tướng. */

    let upgId = 0;
    // icon bạc / gạo giống thanh tài nguyên trên cùng (giao-dien/icon-home/thoi-bac.webp, gao.webp)
    const UPG_RES_ICO = f => (f === 'gao' ? IC_RICE : IC_SILVER);
    const UPG_TITLE = { sao: 'Tăng Sao', boiduong: 'Thăng Cấp', kynang: 'Nâng Kỹ Năng', phamchat: 'Nâng Phẩm Chất' };
    (function () {
      const sc = document.createElement('div'); sc.className = 'screen'; sc.id = 'screen-upg';
      sc.innerHTML = '<div class="pve-header"><button class="btn-back" onclick="openPicker(pkMode)">Trở về</button><h2 class="pve-title" id="upg-title"></h2></div><div class="upg-body" id="upg-body"></div>';
      document.getElementById('screen-picker').parentNode.appendChild(sc);
    })();
    function statsAt(id, patch) {   // chỉ số nếu tướng có cấp / sao / kỹ năng như `patch`
      const old = heroProg[id], had = Object.prototype.hasOwnProperty.call(heroProg, id);
      heroProg[id] = Object.assign({}, getProg(id), patch);
      try { return heroStats(id); } finally { if (had) heroProg[id] = old; else delete heroProg[id]; }
    }
    function openUpg(id) { upgId = id; vmId = id; switchScreen('upg'); renderUpg(); }
    function upgNav(d) {
      const ids = ownedHeroes().map(h => h.id), i = ids.indexOf(upgId); if (!ids.length) return; upgId = vmId = ids[(i + d + ids.length) % ids.length]; renderUpg();
    }
    function renderUpg() {
      const sc = document.getElementById('screen-upg'); if (!sc || !sc.classList.contains('active')) return;
      const h = heroById(upgId), p = getProg(upgId), cs = heroStats(upgId), mode = pkMode;
      document.getElementById('upg-title').textContent = UPG_TITLE[mode];
      const capLv = heroCap(upgId), capStar = starCapOf(p.lv);
      let patch = null, maxed = false;
      if (mode === 'sao') { maxed = p.star >= capStar; patch = { star: p.star + 1 }; }
      else if (mode === 'boiduong') { maxed = p.lv >= capLv; patch = { lv: p.lv + 1 }; }
      else if (mode === 'phamchat') { maxed = p.ql >= QL_MAX; patch = { ql: p.ql + 1 }; }
      else { maxed = p.sk >= SKILL_MAX; patch = { sk: p.sk + 1 }; }
      const ns = maxed ? cs : statsAt(upgId, patch), np = maxed ? p : Object.assign({}, p, patch);
      const row = (l, a, b) => `<div class="up-r"><span>${l}</span><b>${a}</b><b class="${b !== a ? 'up' : ''}">${b}</b></div>`;
      let rows;
      if (mode === 'kynang') {
        const eff = s => Math.round(100 * skillMultOf(s, upgId)) + '%';
        rows = row('Kỹ năng', 'Lv ' + p.sk, 'Lv ' + np.sk) + row('Hiệu lực tuyệt kỹ', eff(p.sk), eff(np.sk)) + row('Tuyệt kỹ', HERO_ULT_NAME[upgId] || 'Tuyệt Kỹ', HERO_ULT_NAME[upgId] || 'Tuyệt Kỹ');
      } else if (mode === 'phamchat') {
        const eff = (s, q) => Math.round(100 * skillMultOf(s, upgId, q)) + '%', qn = q => `<span style="color:${QL_COLOR[q]};font-weight:900">${QL_NAMES[q]}</span>`;
        rows = `<div class="up-r"><span>Phẩm chất</span><b>${qn(p.ql)}</b><b class="${maxed ? '' : 'up'}">${qn(np.ql)}</b></div>` + row('Kỹ năng', 'Lv ' + p.sk, 'Lv ' + p.sk) + row('Hiệu lực tuyệt kỹ', eff(p.sk, p.ql), eff(np.sk, np.ql)) + row('Tuyệt kỹ', HERO_ULT_NAME[upgId] || 'Tuyệt Kỹ', HERO_ULT_NAME[upgId] || 'Tuyệt Kỹ');
      } else {
        const f = (k, fn) => row(k[0], (fn || fmtN)(cs[k[1]]), (fn || fmtN)(ns[k[1]]));
        rows = row('Cấp', p.lv, np.lv) + [['HP', 'hp'], ['Công', 'atk'], ['Thủ', 'def'], ['Tốc', 'spd'], ['Bạo', 'crit'], ['Bạo Sát', 'critDmg'], ['Bền', 'tough'], ['Chuẩn', 'acc'], ['Né', 'dodge'], ['Phá giáp', 'pierce'], ['Đỡ đòn', 'block']].map(k => f(k, k[1] === 'block' ? (v => tsFmt(v) + '%') : (v => (k[1] === 'hp' || k[1] === 'atk' || k[1] === 'def' || k[1] === 'pierce') ? fmtN(v) : tsFmt(v)))).join('');
      }
      const art = (star, cls) => `<div class="up-hero ${cls}"><div class="up-fig">${h.body ? `<img src="${h.body}" alt="${h.name}">` : heroIcon(h)}</div><div class="up-plat"></div><div class="up-stars">${heroStarsHTML(star, { off: true, bigPx: 15 })}</div></div>`;
      let cost = '', btns = '';
      if (mode === 'sao') {
        const need = starCost(p.star + 1), have = shardsOf(upgId), phs = maxed ? [] : starPhach(p.star + 1), ok = have >= need && phs.every(x => skbQty(x.name) >= x.n);
        cost = maxed ? (p.star >= STAR_ABS_MAX ? '<div class="up-max">Đã đạt sao tối đa</div>' : '<div class="up-max">🔒 Cần tướng cấp ' + PROG_CFG.lvPerStar * (p.star + 1) + ' để lên ★' + (p.star + 1) + ' — hãy Thăng Cấp trước</div>') : `<div class="up-cost"><div class="up-it"><div class="e">${heroIcon(h)}</div><b class="${ok ? '' : 'bad'}">${have}/${need}</b><small>Mảnh ${h.name}</small></div>${phs.map(x => `<div class="up-it"><div class="e">${gdIco(x.name, '🔮')}</div><b class="${skbQty(x.name) >= x.n ? '' : 'bad'}">${fmtN(skbQty(x.name))}/${fmtN(x.n)}</b><small>${x.name}</small></div>`).join('')}</div>`;
        btns = `<button class="up-go" ${maxed || !ok ? 'disabled' : ''} onclick="upgradeHero('star',1)">Tăng Sao</button>`;
      } else if (mode === 'boiduong') {
        const c = lvCost(p.lv + 1), exN = heroExpNeed(p.lv), exHave = heroExpAvail(upgId), k = lvAffordable(p.lv, 1) >= 1 && exHave >= exN;
        cost = maxed ? '<div class="up-max">Đã chạm cấp acc (vượt Ải nhận EXP để lên cấp acc)</div>' : (() => { const own = heroExpOf(upgId), pct = Math.min(100, Math.round(exHave / exN * 100)), miss = Math.max(0, exN - exHave); return `<div style="margin:10px 18px 0"><div style="display:flex;justify-content:space-between;font-size:11px;color:#fde68a;margin-bottom:3px"><span>EXP lên cấp ${p.lv + 1}</span><b>${fmtN(exHave)}/${fmtN(exN)}${miss > 0 ? ' · còn thiếu ' + fmtN(miss) : ' · đủ'}</b></div><div style="height:10px;border-radius:6px;background:#0008;border:1px solid #fde047;overflow:hidden"><div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#f59e0b,#fde047)"></div></div><div style="font-size:10px;color:#a0aec0;margin-top:2px">EXP tướng ${fmtN(own)} + ${fmtN(taoQty())} đào × ${TAO_EXP}</div></div>`; })() + `<div class="up-cost"><div class="up-it"><div class="e">${UPG_RES_ICO('thoi-bac')}</div><b class="${silver >= c.silver ? '' : 'bad'}">${fmtN(silver)}/${fmtN(c.silver)}</b><small>Bạc</small></div><div class="up-it"><div class="e">${UPG_RES_ICO('gao')}</div><b class="${rice >= c.rice ? '' : 'bad'}">${fmtN(rice)}/${fmtN(c.rice)}</b><small>Gạo</small></div><div class="up-it"><div class="e">${gdIco('Đào Tiên', '🍑')}</div><b class="${exHave >= exN ? '' : 'bad'}">${fmtN(exHave)}/${fmtN(exN)}</b><small>EXP (có ${fmtN(taoQty())} đào)</small></div></div>`;
        btns = `<button class="up-go" ${maxed || !k ? 'disabled' : ''} onclick="upgradeHero('lv',1)">+1 Cấp</button><button class="up-go alt" ${maxed || !k ? 'disabled' : ''} onclick="upgradeHero('lv',10)">+10 Cấp</button>`;
      } else if (mode === 'phamchat') {
        const need = maxed ? [] : qlCost(p.ql + 1), starLock = !maxed && p.star < qlMinStar(), ok = !starLock && need.every(x => qlHave(x.k, upgId) >= x.n);
        cost = maxed ? '<div class="up-max">Phẩm chất đã đạt tối đa (SSS)</div>' : `${starLock ? `<div class="up-max" style="color:#f87171">🔒 Cần tướng đạt ★${qlMinStar()} mới được nâng phẩm chất (hiện ★${p.star})</div>` : ''}<div class="up-max" style="color:#fde68a;margin-bottom:0">Nâng lên <b style="color:${QL_COLOR[p.ql + 1]}">${QL_NAMES[p.ql + 1]}</b> cần:</div><div class="up-cost ql">${need.map(x => `<div class="up-it"><div class="e">${qlIco(x.k, upgId)}</div><b class="${qlHave(x.k, upgId) >= x.n ? '' : 'bad'}">${fmtN(qlHave(x.k, upgId))}/${fmtN(x.n)}</b><small>${qlName(x.k, upgId)}</small></div>`).join('')}</div>`;
        btns = `<button class="up-go" ${maxed || !ok ? 'disabled' : ''} onclick="qlUpgrade()">Nâng Phẩm Chất</button>`;
      } else {
        const sc = maxed || typeof skbCost !== 'function' ? null : skbCost(p.sk + 1), have = sc ? skbQty(sc.item) : 0, okSk = !sc || sc.n <= 0 || have >= sc.n;   // sc = null: miễn phí (Lv1 → Lv2)
        cost = maxed ? '<div class="up-max">Kỹ năng đã tối đa</div>' : (sc && sc.n > 0 ? `<div class="up-cost"><div class="up-it"><div class="e">${gdIco(sc.item, '📘')}</div><b class="${okSk ? '' : 'bad'}">${fmtN(have)}/${fmtN(sc.n)}</b><small>${sc.item}</small></div></div>` : '<div class="up-max" style="color:#86efac">Nâng kỹ năng miễn phí</div>');
        btns = `<button class="up-go" ${maxed || !okSk ? 'disabled' : ''} onclick="upgradeHero('sk',1)">Nâng Kỹ Năng</button>`;
      }
      document.getElementById('upg-body').innerHTML = `
        <div class="up-name"><button onclick="upgNav(-1)">◀</button><b>${h.name}</b><button onclick="upgNav(1)">▶</button></div>
        <div class="up-stage ${mode}">${art(p.star, 'l')}<div class="up-tbl"><div class="up-r hd"><span></span><b>Hiện tại</b><b>Sau</b></div>${rows}</div>${art(np.star, 'r')}</div>
        ${(mode === 'kynang' || mode === 'phamchat') ? `<div class="up-desc">${heroSkills(upgId)[1].desc}</div>` : ''}${cost}<div class="up-btns">${btns}</div>
        <div class="up-note">${mode === 'sao' ? 'Tăng sao chỉ cần mảnh tướng. Cấp tướng được giữ nguyên, chỉ số tăng mạnh.' : mode === 'phamchat' ? 'Mỗi bậc phẩm chất (A → A+ → S → S+ → SS → SS+ → SSS) tăng hiệu lực tuyệt kỹ khởi điểm. Mỗi bậc sau tốn thêm ' + Math.round(cfgNum('quality.grow', QL_GROW * 100)) + '% nguyên liệu so với bậc trước.' : mode === 'boiduong' ? 'Tăng cấp tốn bạc + gạo + EXP tướng. 1 Đào Tiên = ' + TAO_EXP + ' EXP, tự dùng khi thiếu (nhận ở Giang Hồ → Đào Tiên).' : 'Mỗi cấp kỹ năng tăng hiệu lực tuyệt kỹ. Sách kỹ năng chỉ rơi ở Giang Hồ → Danh Tướng Lầu.'}</div>`;
    }
    // ===== NÂNG PHẨM CHẤT TƯỚNG: A → A+ → S → S+ → SS → SS+ → SSS (6 bậc). Chi phí bậc 1 = bảng gốc; mỗi bậc sau đắt hơn bậc trước QL_GROW (30%, cộng dồn: ×1.3 mỗi bậc) =====
    const QL_GROW = 0.3;
    const qlMinStar = () => Math.max(1, Math.floor(cfgNum('quality.minStar', 6)));   // tướng phải đạt ngần này sao mới được nâng phẩm chất (admin chỉnh: quality.minStar, mặc định 6)
    const QL_COST_BASE = [['Linh Phách', 1000], ['Thần Phách', 100], ['Tiên Phách', 10], ['@shard', 250], ['Thần Đan', 500], ['Tiên Đan', 1000], ['Yếu Quyết', 200], ['Bí Kíp', 100], ['Vô Tự Thiên Thư', 50], ['@silver', 2000000], ['@rice', 2000000], ['@gold', 5000]];
    // Admin chỉnh (admin.html → "Phẩm chất tướng"): quality.base[i] = số lượng bậc 1 của nguyên liệu i • quality.grow = % đắt thêm mỗi bậc • quality.arr[bậc-1][i] = số riêng cho từng bậc (trống = tự tính)
    const qlCost = step => {
      const grow = cfgNum('quality.grow', QL_GROW * 100) / 100, base = cfgGet('quality.base', []) || [], arr = ((cfgGet('quality.arr', []) || [])[step - 1]) || [], f = Math.pow(1 + Math.max(0, grow), Math.max(0, step - 1));
      return QL_COST_BASE.map(([k, n0], i) => {
        const o = arr[i], ov = Number(o), b = Number(base[i]);
        if (o !== '' && o != null && isFinite(ov) && ov >= 0) return { k, n: Math.round(ov) };
        const n = (base[i] !== '' && base[i] != null && isFinite(b) && b >= 0) ? b : n0;
        return { k, n: Math.ceil(n * f - 1e-9) };
      });   // step = bậc mới (1…6)
    };
    const qlHave = (k, id) => k === '@shard' ? shardsOf(id) : k === '@silver' ? silver : k === '@rice' ? rice : k === '@gold' ? gold : skbQty(k);
    const qlName = (k, id) => k === '@shard' ? 'Mảnh ' + heroById(id).name : k === '@silver' ? 'Bạc' : k === '@rice' ? 'Gạo' : k === '@gold' ? 'Vàng' : k;
    const qlIco = (k, id) => k === '@shard' ? heroIcon(heroById(id)) : k === '@silver' ? icoImg('silver', '100%') : k === '@rice' ? icoImg('rice', '100%') : k === '@gold' ? icoImg('gold', '100%') : (k === 'Thần Đan' ? icoImg('than', '100%') : k === 'Tiên Đan' ? icoImg('tien', '100%') : gdIco(k, '📦'));
    function qlUpgrade() {
      const id = upgId, p = getProg(id); if (p.ql >= QL_MAX) return;
      if (p.star < qlMinStar()) { alert('Tướng cần đạt ★' + qlMinStar() + ' mới được nâng phẩm chất (hiện ★' + p.star + ').'); return; }
      const need = qlCost(p.ql + 1), miss = need.filter(x => qlHave(x.k, id) < x.n);
      if (miss.length) { alert('Chưa đủ nguyên liệu để nâng lên phẩm chất ' + QL_NAMES[p.ql + 1] + ':\n' + miss.map(x => '• ' + qlName(x.k, id) + ': ' + fmtN(qlHave(x.k, id)) + '/' + fmtN(x.n)).join('\n')); return; }
      need.forEach(x => {
        if (x.k === '@shard') { heroShards[id] = shardsOf(id) - x.n; }
        else if (x.k === '@silver') silver -= x.n; else if (x.k === '@rice') rice -= x.n; else if (x.k === '@gold') gold -= x.n;
        else skbSpend(x.k, x.n);
      });
      saveJSON('hero_shards', heroShards); resSave(); goldSave(); try { updateGold(); } catch (e) {}
      heroProg[id] = Object.assign({}, getProg(id), { ql: p.ql + 1 });
      saveJSON('hero_prog', heroProg);
      try { renderHomeTeam(); updatePower(); } catch (e) {}
      renderUpg();
      try { scToast('Phẩm chất ' + heroById(id).name + ' → ' + QL_NAMES[p.ql + 1] + ' ✔'); } catch (e) {}
    }
    // skillMultOf(sk, id) khai báo cùng skillMult (phần cấp / sao / kỹ năng)

;
/* === js/heroes/recruit.js === */
/* CHIÊU MỘ
   (tách từ index.html cũ — script) */

    // ================= CHIÊU MỘ =================
    // Phổ Thông: 5 phút miễn phí 1 lần → 1 mảnh • Cao Cấp: 5 giờ miễn phí 1 lần → 10 mảnh • 10 Lần: 1 ngày miễn phí 1 lần → 100 mảnh, quay tiếp tốn 300 vàng
    // Không cộng dồn lượt: chỉ quay xong mới tính lại thời gian chờ. Mỗi mảnh rơi ngẫu nhiên vào 1 tướng bất kỳ.
    // Admin chỉnh ở admin.html → tab Chiêu Mộ: recruit.<lam|tim|ten>.{cdMin phút chờ, n số mảnh, cost vàng khi quay tiếp} + recruit.weights (tỷ lệ rơi từng tướng)
    const REC_DEF = { lam: { cd: 5 * 60e3, n: 1, cost: 0 }, tim: { cd: 5 * 3600e3, n: 10, cost: 0 }, ten: { cd: 24 * 3600e3, n: 100, cost: 300 } };
    const REC = {
      lam: { name: 'Phổ Thông', cd: 5 * 60e3, n: 1, art: 0 },
      tim: { name: 'Cao Cấp', cd: 5 * 3600e3, n: 10, art: 1 },
      ten: { name: '10 Lần', cd: 24 * 3600e3, n: 100, art: 2, cost: 300 }
    };
    cfgOnApply(() => Object.keys(REC).forEach(k => {
      const d = REC_DEF[k], g = x => cfgNum('recruit.' + k + '.' + x, null);
      REC[k].cd = Math.max(0, cfgNum('recruit.' + k + '.cdMin', d.cd / 60e3)) * 60e3; REC[k].n = Math.max(1, Math.floor(cfgNum('recruit.' + k + '.n', d.n))); REC[k].cost = Math.max(0, Math.floor(cfgNum('recruit.' + k + '.cost', d.cost)));
    }));
    function recPick() {   // chọn tướng theo trọng số admin đặt (mặc định mọi tướng bằng nhau)
      const w = cfgGet('recruit.weights', {}) || {}, ws = HEROES.map(h => { const v = Number(w[h.id]); return isFinite(v) && v >= 0 ? v : 1; }), tot = ws.reduce((a, b) => a + b, 0);
      if (tot <= 0) return rand(HEROES);
      let r = Math.random() * tot; for (let i = 0; i < HEROES.length; i++) { r -= ws[i]; if (r < 0) return HEROES[i]; }
      return HEROES[HEROES.length - 1];
    }
    const recLeft = k => Math.max(0, (Number(recState[k]) || 0) - Date.now());
    function openRecruit() { renderRecruit(); switchScreen('chieumo'); const b = document.getElementById('nav-btn-chieumo'); if (b) b.classList.add('active'); }
    function renderRecruit() {
      updateGold();
      document.getElementById('rc-body').innerHTML =
        `<div class="rc-row">${Object.keys(REC).map(k => { const r = REC[k], h = HEROES[(r.art * 3 + 1) % HEROES.length];
          return `<div class="rc-p ${k}"><div class="rc-ttl">${r.name}</div><div class="rc-art">${heroIcon(h)}</div><div class="rc-info" id="rc-st-${k}"></div><button class="rc-btn" id="rc-btn-${k}" onclick="doRecruit('${k}')"></button></div>`; }).join('')}</div>
        <div class="set-note" style="margin-top:8px">🧩 Mỗi mảnh rơi ngẫu nhiên vào 1 tướng bất kỳ. Đủ ${MERGE_COST} mảnh của một tướng thì vào Võ Hiệp → Ghép Mảnh để ghép thành tướng. Tăng sao cần mảnh của chính tướng đó: lên ★N cần N × ${SHARD_PER_STAR} mảnh (★6 = ${starCost(6)} mảnh). Lượt miễn phí không cộng dồn, quay xong mới tính lại thời gian.</div>
        <div class="vm-up-info" style="margin:6px 0 2px"><b>🧩 Kho mảnh tướng</b></div><div class="hero-chips" id="rc-inv" style="flex-wrap:wrap;overflow:visible"></div>`;
      renderRecruitInv(); recTick();
    }
    function renderRecruitInv() {
      const el = document.getElementById('rc-inv'); if (!el) return;
      el.innerHTML = [...HEROES].sort((a, b) => shardsOf(b.id) - shardsOf(a.id)).map(h => { const p = getProg(h.id), n = shardsOf(h.id);
        return `<div class="hchip ${n ? 'sel' : ''}" style="${n ? '' : 'opacity:.5;'}cursor:default"><div class="e">${heroIcon(h)}</div><div class="n">${h.name}</div><div class="s">${!heroIsOwned(h.id) ? '🔒 ' + n + '/' + MERGE_COST + ' mảnh' : n + ' mảnh' + (p.star < starCapOf(p.lv) ? `<br>★${p.star + 1}: ${starCost(p.star + 1)}` : '<br>★ tối đa')}</div></div>`; }).join('');
    }
    function recTick() {
      Object.keys(REC).forEach(k => {
        const st = document.getElementById('rc-st-' + k), bt = document.getElementById('rc-btn-' + k); if (!st || !bt) return;
        const r = REC[k], left = recLeft(k), free = left <= 0;
        st.innerHTML = `+${r.n} mảnh tướng bất kỳ<br>` + (free ? '<b>Miễn phí 1 lần</b>' : `<span class="tm">⏳ ${fmtClock(left)}</span>`);
        if (free) { bt.disabled = false; bt.innerHTML = 'Miễn phí<small>Mời</small>'; }
        else if (r.cost) { bt.disabled = false; bt.innerHTML = `💰 ${r.cost}<small>10 Lần</small>`; }
        else { bt.disabled = true; bt.innerHTML = 'Chờ<small>miễn phí</small>'; }
      });
    }
    setInterval(() => { if (document.getElementById('screen-chieumo').classList.contains('active')) recTick(); }, 1000);
    // CỔNG CHIÊU MỘ: chuỗi 24 khung (0-14 cổng mở ra, DỪNG CỐ ĐỊNH ở khung 14 chờ chạm tướng, 15-23 tan biến). Khung 9-20 vị trí/độ sáng lệch nhau nên KHÔNG lặp để cổng không rung. Tướng hiện trong cổng, chạm vào tướng thì cổng mới tan, xong mới hiện bảng kết quả.
    const REC_GATE = { src: 'giao-dien/cong-chieu-mo-idle.webp?v=2', cw: 256, ch: 256, n: 24 };
    try { GP.add(REC_GATE.src, 1); } catch (e) {}
    function recGate(h, cnt, done) {
      const old = document.getElementById('rc-gate'); if (old) old.remove();
      const ov = document.createElement('div'); ov.id = 'rc-gate';
      const W = Math.round(Math.max(220, Math.min(window.innerWidth * 0.92, window.innerHeight * 0.6, 420)));
      ov.innerHTML = `<div class="rcg-box" style="width:${W}px;height:${W}px"><div class="rcg-hero"><div class="rcg-art">${heroIcon(h)}</div><div class="rcg-n">${h.name}</div><div class="rcg-c">+${cnt} mảnh</div></div></div><div class="rcg-hint">Chạm vào tướng</div>`;
      document.body.appendChild(ov);
      const box = ov.querySelector('.rcg-box'), hero = ov.querySelector('.rcg-hero'), hint = ov.querySelector('.rcg-hint'), sp = seqEl(REC_GATE, W);
      sp.classList.add('rcg-seq'); box.insertBefore(sp, box.firstChild);
      let st = 'in', f = 0, busy = false, ended = false;
      const end = () => { if (ended) return; ended = true; clearInterval(tm); ov.classList.add('fade'); setTimeout(() => { ov.remove(); done(); }, 260); };
      const tm = setInterval(() => {
        if (st === 'in') { sp.show(f); if (f === 14) { st = 'hold'; hero.classList.add('on'); hint.classList.add('on'); } f++; }
        else if (st === 'hold') { /* giữ nguyên khung 14: cổng đứng yên */ }
        else { sp.show(f); f++; if (f > REC_GATE.n - 1) end(); }
      }, 75);
      hero.addEventListener('click', () => {
        if (st !== 'hold' || busy) return; busy = true; hero.classList.add('out'); hint.classList.remove('on');
        setTimeout(() => { st = 'out'; f = 15; }, 250);
      });
    }
    function doRecruit(k) {
      const r = REC[k]; if (!r) return;
      if (recLeft(k) <= 0) { recState[k] = Date.now() + r.cd; saveJSON('rec_state', recState); }   // lượt miễn phí: bắt đầu tính lại thời gian chờ
      else if (r.cost) {
        if (gold < r.cost) { alert(`Không đủ vàng! Cần ${r.cost} 💰 (có ${gold}).`); return; }
        gold -= r.cost; goldSave();
      } else return;
      const got = {};
      for (let i = 0; i < r.n; i++) { const h = recPick(); got[h.id] = (got[h.id] || 0) + 1; heroShards[h.id] = shardsOf(h.id) + 1; }
      saveJSON('hero_shards', heroShards);
      try { renderHomeTeam(); updatePower(); } catch (e) {}
      const list = Object.keys(got).map(Number).sort((a, b) => got[b] - got[a]).map(id => { const h = heroById(id);
        return `<div class="hchip sel" style="cursor:default"><div class="e">${heroIcon(h)}</div><div class="n">${h.name}</div><div class="s">+${got[id]} mảnh</div></div>`; }).join('');
      const showRes = () => pvShow(pvHead(`🎴 Chiêu Mộ ${r.name}`, `Nhận ${r.n} mảnh tướng`) + `<div class="hero-chips" style="flex-wrap:wrap;overflow:visible;justify-content:center">${list}</div>` +
        `<button class="btn-attack pv-go" onclick="pvClose()">Xong</button>`);
      renderRecruit();
      const topId = Object.keys(got).map(Number).sort((a, b) => got[b] - got[a])[0];
      try { recGate(heroById(topId), got[topId], showRes); } catch (e) { showRes(); }   // lỗi cổng → vẫn hiện kết quả như cũ
    }
    updateGold();

;
/* === js/battle/engine.js === */
/* TRẬN ĐẤU: động cơ chung (đơn vị, sát thương, buff/debuff, hồi sinh)
   (tách từ index.html cũ — script) */

    // --- BATTLE SYSTEM (sàn đấu ngang, 1-5 tướng) ---
    let currentStage = 1, currentBattle = 1, currentWave = 1;
    let waveUnits = { heroes: [], enemies: [] };
    let isPlayerTurn = false, battleToken = 0, mult = 1;
    const HERO_HP = 100000;
    // Vị trí [x%, y%] trong sân đấu (đội ta ở nửa TRÁI x<42%, đội địch lấy đối xứng 100-x ở nửa phải). Phần giữa (42–58%) để trống.
    // Giãn rộng để các tướng không đè nhau: 5 tướng xếp kiểu mặt "5" xúc xắc — 1 ở giữa (tướng đầu danh sách), 2 phía trên, 2 phía dưới.
    // 2.5D: bệ đấu là vòng elip nền (chân tướng ≈ y 58–87%, tâm ≈ y 72.5%, trải gần hết chiều ngang). Chân tướng = y + ~4.5%.
    // Mọi tướng đứng TRONG vòng elip: 3 hàng chân ở 65 / 73 / 81 → tâm tướng y = 60.5 / 68.5 / 76.5, đối xứng qua y=68.5 (trên/dưới cân nhau).
    // Đội địch lấy đối xứng 100-x nên 2 bên cân nhau. Hàng sau (x nhỏ) ở xa, hàng trước (x lớn) gần địch; đứng thấp tự to hơn nhờ --dep trong makeUnit.
    // BỐ TRÍ MỚI (2.5D, tản so le): khung sân = 75% chiều cao màn hình, phần sân đấu thật nằm ở 2/3 dưới (trời chiếm 1/3 trên) → tướng đứng y 54–85.
    //   Hàng sau sát mép tường (x ≈ 9–10), hàng giữa x ≈ 21–24, hàng trước x ≈ 32–34. Đội địch lấy đối xứng 100-x.
    //   Thứ tự: [0] giữa • [1] trước-trên • [2] trước-dưới • [3] sau-trên • [4] sau-dưới. Cách nhau ≥ ~12% chiều ngang + ~15% chiều dọc nên không chồng nhau.
    const HERO_POS = {
      1: [[24, 69]],
      2: [[30, 56], [17, 82]],
      3: [[32, 69], [16, 54], [16, 85]],
      4: [[33, 69], [21, 54], [21, 85], [9, 69]],
      5: [[22, 69], [34, 54], [34, 85], [10, 57], [9, 84]]
    };
    const HERO_DY = 0;   // đã tính sẵn vào HERO_POS (đội hình đối xứng quanh y=68.5); giữ biến vì nhiều nơi còn cộng HERO_DY
    // Co nội dung bảng đội hình để luôn vừa đúng 2.5/10 chiều cao màn hình (điện thoại hay máy tính đều không lệch)
    function fitBattlePanel() {
      const p = document.querySelector('#battle-overlay .bf-panel'), c = p && p.querySelector('.bf-fit'); if (!c) return;
      const H = p.clientHeight; if (!H) return;
      c.style.transform = 'none'; c.style.width = '100%'; c.style.top = '0px';
      let k = 1, v = c.offsetHeight;
      for (let i = 0; i < 8 && v > H + 0.5; i++) { k = Math.max(0.3, k * H / v); c.style.width = (100 / k) + '%'; v = c.offsetHeight * k; }
      c.style.transform = k < 1 ? 'scale(' + k + ')' : 'none';
      c.style.top = Math.max(0, (H - v) / 2) + 'px';
    }
    (() => {
      let raf = 0; const go = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fitBattlePanel); };
      const p = document.querySelector('#battle-overlay .bf-panel'); if (!p) return;
      try { new ResizeObserver(go).observe(p); } catch (e) { window.addEventListener('resize', go); }
      try { new MutationObserver(go).observe(p.querySelector('.bf-fit'), { childList: true, subtree: true, characterData: true }); } catch (e) {}
      window.addEventListener('resize', go);
    })();
    let bossB = null;       // BOSS BANG: đang đánh boss bang trên sàn PVE (xem js/social/boss-battle.js); null = không phải trận boss
    var battleFast = false;   // Tỷ Võ: bấm "Bỏ Qua" để tua nhanh trận đấu
    var ultTimeScale = 1;   // các lần ulti lặp (lần 2, 3) chạy nhanh gấp đôi: thu ngắn cả thời gian chờ lẫn hoạt ảnh
    var battleSlow = 1;     // PvE: nút "Chậm" -> 2 = mọi thứ (chờ + hoạt ảnh) chậm gấp đôi; 1 = bình thường
    const sleep = ms => new Promise(r => setTimeout(r, battleFast ? 0 : ms * ultTimeScale * battleSlow));
    (() => {
      const _an = Element.prototype.animate;
      Element.prototype.animate = function (kf, opt) {
        const ts = ultTimeScale * battleSlow;
        if (ts !== 1) {
          if (typeof opt === 'number') opt *= ts;
          else if (opt && typeof opt === 'object') { opt = Object.assign({}, opt); ['duration', 'delay', 'endDelay'].forEach(k => { if (typeof opt[k] === 'number') opt[k] *= ts; }); }
        }
        return _an.call(this, kf, opt);
      };
    })();
    function toggleSlow() {
      battleSlow = battleSlow === 1 ? 2 : 1;
      try { localStorage.setItem('battle_slow', battleSlow === 2 ? '1' : '0'); } catch (e) {}
      updateSlowBtn();
    }
    function updateSlowBtn() { const b = document.getElementById('btn-slow'); if (!b) return; b.textContent = 'Chậm: ' + (battleSlow === 2 ? 'BẬT' : 'TẮT'); b.classList.toggle('on', battleSlow === 2); }
    try { if (localStorage.getItem('battle_slow') === '1') battleSlow = 2; } catch (e) {}
    window.addEventListener('DOMContentLoaded', updateSlowBtn);
    const rand = arr => arr[Math.floor(Math.random() * arr.length)];

    function formatNumber(num) {   // số thực đầy đủ (không K / M / B)
      const v = Number(num); if (!Number.isFinite(v)) return '0';
      return (Math.floor(v) + 0).toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 0 });
    }

    const DEP_BASE = 0.58, DEP_PER_Y = 0.0042;   // cỡ tướng theo độ sâu (y=54 → ×0.81, y=85 → ×0.94). Cũ: 0.7 + y*0.0055 (to quá, dễ chồng). Muốn to lại: tăng DEP_BASE.
    function makeUnit(side, emoji, x, y, hp, atk, big, name) {
      const el = document.createElement('div');
      el.className = `bf-unit ${side}${big ? ' big' : ''}`;
      el.style.left = x + '%'; el.style.top = y + '%'; el.style.zIndex = Math.round(y);
      el.style.setProperty('--dep', (DEP_BASE + y * DEP_PER_Y).toFixed(3));   // 2.5D: đứng càng thấp (gần camera) càng to
      el.innerHTML = `<div class="bf-name">${name || ''}</div><div class="bf-hp"><i></i><b class="bf-hpn">${formatNumber(hp)}</b></div><div class="bf-sprite">${emoji}</div><div class="bf-shadow"></div>`;
      document.getElementById('bf-units').appendChild(el);
      return { el, side, hp, max: hp, atk, x, y, alive: true, def: 0, dodge: 0, acc: 300, crit: 0, critDmg: 0, tough: 0, pierce: 0, tia: 1, block: 0 };
    }

    function setHpBar(u) {
      u.el.querySelector('.bf-hp i').style.width = (u.hp / u.max * 100) + '%';
      const n = u.el.querySelector('.bf-hpn'); if (n) n.textContent = formatNumber(u.hp);
      try {   // số HP dưới thẻ tướng của mình
        if (u.side === 'hero' && typeof waveUnits !== 'undefined' && waveUnits && waveUnits.heroes && !pvp) {
          const i = waveUnits.heroes.indexOf(u), card = i >= 0 ? document.querySelectorAll('#pv-panel .pv-row.mine .pv-c')[i] : null, pw = card && card.querySelector('.pv-pw');
          if (pw) { const s = fmtN(Math.max(0, u.hp)); pw.textContent = s; pw.style.fontSize = pwFs(s) + 'px'; }
        }
      } catch (e) {}
    }
    function removeMoon(u) { u.moon = 0; u.el.classList.remove('moon-on'); const ic = u.el.querySelector('.bf-moonshield'); if (ic) ic.remove(); }
    const noBuff = u => !!(u.dn && u.dn.nobuff > 0);          // Độc Cô Cầu Bại: đang bị khóa tăng phúc
    function applyMoon(u) {
      if (noBuff(u)) { floatText(u, '🚫 KHÓA TĂNG PHÚC'); return; }
      u.moon = MOON_TURNS;
      let ic = u.el.querySelector('.bf-moonshield');
      if (!ic) { ic = document.createElement('div'); ic.className = 'bf-moonshield'; u.el.appendChild(ic); }
      ic.innerHTML = '<b>🌙' + u.moon + '</b>';
    }
    function tickMoon(units) {
      units.forEach(u => { if (!(u.moon > 0)) return; u.moon--;
        if (u.moon <= 0) removeMoon(u); else { const b = u.el.querySelector('.bf-moonshield b'); if (b) b.textContent = '🌙' + u.moon; } });
    }
    // Giải TẤT CẢ hiệu ứng bất lợi (chảy máu, choáng) của phe
    function cleanse(units) {
      units.filter(a => a.alive).forEach(a => {
        let had = false;
        if (a.bleed > 0) { a.bleed = 0; a.bleedPct = 0; const ic = a.el.querySelector('.bf-bleed'); if (ic) ic.remove(); had = true; }
        if ((a.mods && a.mods.some(m => m.kind === 'debuff')) || (a.dn && ['atk', 'def', 'heal', 'rage', 'silence', 'poison'].some(k => a.dn[k] > 0))) { clearDebuffs(a); had = true; }
        if (a.pdDot > 0 || a.pdRet) { a.pdDot = 0; a.pdRet = 0; const pm = a.el.querySelector('.pd-mark'); if (pm) pm.remove(); had = true; }
        if (a.stun > 0) { a.stun = 0; a.el.classList.remove('stunned'); const ic = a.el.querySelector('.bf-stun'); if (ic) ic.remove(); had = true; }
        if (had) floatText(a, '✨ GIẢI HIỆU ỨNG');
      });
    }
    function hit(u, dmg, noRage, src, noRefl, parts, ray) {   // parts = {main, crit, pierce}: 3 loại sát thương của 1 tia (xem strike) • ray = {i, wait}: tia thứ i (i>0 không cộng thêm nộ, chữ sát thương hiện trễ)
      if (!u.alive) return;
      dmg = Math.round(dmg); const dmg0 = dmg;
      if (bossB && u === bossB.unit) {   // BOSS BANG: sát thương lên boss ×heroDmgMult (+ Chí Tôn bang mỗi đòn); mỗi nhát tối đa 3% HP boss (hiệu ứng DOT 1%) để chiêu trừ % máu không giết boss ngay
        const mine = !!(src && src.side === 'hero');
        if (mine) dmg = Math.round(dmg * BOSS_CFG.heroDmgMult) + ((ray && ray.i > 0) ? 0 : (bossB.gb.boss || 0));
        dmg = Math.min(dmg, Math.max(1, Math.round(u.max * (noRage ? .01 : .03))));
      }
      let refl = 0;
      if (u.moon > 0 && !noRage && !noRefl) {      // Khiên Trăng Khuyết: nhận 30%, phản 50% về địch
        refl = Math.round(dmg * MOON_REFLECT); dmg = Math.max(1, Math.round(dmg * MOON_TAKE));
        const ic = u.el.querySelector('.bf-moonshield'); if (ic) ic.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 260 });
      }
      if (u.dn && u.dn.immortal > 0 && dmg >= u.hp) {   // Thanh Y: không thể chết — TRỪ khi người đánh có cờ ignoreImmortal (Tà Đế đang ulti)
        if (src && src.ignoreImmortal) floatText(u, '💀 XUYÊN BẤT TỬ');
        else { dmg = Math.max(0, u.hp - 1); floatText(u, '✨ BẤT TỬ'); }
      }
      const hpBefore = u.hp;
      u.hp = Math.max(0, u.hp - dmg);
      if (pvp) pvpDmg[u.side === 'hero' ? 'enemy' : 'hero'] += hpBefore - u.hp;   // Tỷ Võ: cộng sát thương cho bên gây ra
      setHpBar(u);
      if (parts) {   // hiện riêng 3 loại: Công-Thủ (trắng) • Bạo (vàng) • Phá giáp (tím)
        const k = dmg0 > 0 ? dmg / dmg0 : 1;
        [['main', '', 'bf-d-main', -10, -28], ['crit', '💥 ', 'bf-d-crit', -34, 0], ['pierce', '🗡️ ', 'bf-d-pierce', -58, 28]].forEach(([n, ic, cl, top, dx]) => {
          if (!(parts[n] > 0)) return; const e = document.createElement('div'); e.className = 'bf-dmg ' + cl; e.textContent = ic + formatNumber(Math.max(1, Math.round(parts[n] * k)));
          e.style.top = top + 'px'; e.style.marginLeft = dx + 'px';
          const wait = (ray && ray.wait) || 0;   // nhiều tia: chữ sát thương của từng tia hiện lần lượt, không chồng lên nhau
          if (wait > 0) setTimeout(() => { if (u.el.isConnected) { u.el.appendChild(e); setTimeout(() => e.remove(), 900); } }, wait);
          else { u.el.appendChild(e); setTimeout(() => e.remove(), 900); }
        });
      } else {
        const d = document.createElement('div'); d.className = 'bf-dmg'; d.textContent = formatNumber(dmg);
        u.el.appendChild(d); setTimeout(() => d.remove(), 800);
      }
      const fx = document.createElement('div'); fx.className = 'bf-fx'; fx.textContent = u.side === 'enemy' ? '⚔️' : '💥';
      u.el.appendChild(fx); setTimeout(() => fx.remove(), 350);
      u.el.classList.add('hurt'); setTimeout(() => u.el.classList.remove('hurt'), 180);
      if (u.hp <= 0) { u.alive = false; u.el.classList.add('dead'); u.stun = 0; if (u.moon) removeMoon(u); const ic = u.el.querySelector('.bf-stun'); if (ic) ic.remove(); }
      // Bị đánh KHÔNG nhận nộ (nộ chỉ đến từ đánh thường / chiêu gây sát thương / lượt PvP)
      refreshPanel();
      if (refl > 0) {
        const tgt = (src && src.alive && src.side !== u.side) ? src : rand(foesOf(u).filter(x => x.alive));
        if (tgt) { floatText(u, '🌙 PHẢN'); hit(tgt, refl, true, null, true); }
      }
    }

    // u lao tới mục tiêu, đánh `hits` đòn, rồi quay về
    // Thủy Long: lúc đánh thường phát chuỗi 25 khung "đánh thường" phủ lên tướng, trải đều trong suốt nhịp đánh
    function tlAttackFx(u, hits, tok) {
      if (u.id !== 8 || !SEQ.tlAtk || !SEQ_IDLE[8] || !u.el) return null;
      try {
        const ov = seqOverlay(u, SEQ.tlAtk, Math.round(SEQ.tlAtk.cw * SEQ_IDLE[8].h / SEQ.tlIdle.ch)), tm = [], dur = 460 + 150 * hits;
        for (let i = 0; i < SEQ.tlAtk.n; i++) tm.push(setTimeout(() => { if (tok === battleToken) ov.show(i); }, seqT(dur * i / SEQ.tlAtk.n)));
        return { end() { tm.forEach(clearTimeout); ov.end(); } };
      } catch (e) { return null; }
    }
    async function attack(u, foes, hits, dmg, tok, ultHit) {
      const fx = tlAttackFx(u, hits, tok);
      try { return await attackBase(u, foes, hits, dmg, tok, ultHit); } finally { if (fx) fx.end(); }
    }
    async function attackBase(u, foes, hits, dmg, tok, ultHit) {
      let t = pickTarget(foes);
      if (!t) return;
      const f = document.getElementById('battle-arena');
      let dx = (t.x - u.x) * f.clientWidth / 100, dy = (t.y - u.y) * f.clientHeight / 100;
      dx -= Math.sign(dx) * 55;
      const base = 'translate(-50%,-50%)';
      const go = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
      u.el.animate([{ transform: base }, { transform: go }], { duration: 220, easing: 'ease-out', fill: 'forwards' });
      await sleep(230); if (tok !== battleToken) return;
      for (let k = 0; k < hits; k++) {
        if (!t.alive) t = pickTarget(foes);
        if (!t) break;
        if (!strike(u, t, dmg)) floatText(t, 'NÉ'); else if (ultHit) rageOnHit(u);   // Chuẩn phải ≥ Né + 200 mới trúng
        await sleep(150); if (tok !== battleToken) return;
      }
      u.el.animate([{ transform: go }, { transform: base }], { duration: 220, fill: 'forwards' });
      await sleep(230);
      u.el.getAnimations().forEach(a => a.cancel());
    }

    
    // ===== HỆ THỐNG TÍNH SÁT THƯƠNG =====
    // • Trúng: Chuẩn của người đánh ≥ Né của mục tiêu + 200 (Né = 0 vẫn cần Chuẩn 200). Trượt: không mất máu nhưng hiệu ứng của chiêu vẫn dính.
    // • 1 tia gồm 3 loại sát thương riêng: Công − Thủ • (Bạo − Bền) × Bạo Sát • Phá giáp (bỏ qua mọi giáp).
    // • Đỡ đòn (%) giảm sát thương Công và Bạo (không giảm Phá giáp).  Bạo và Phá giáp là sát thương riêng, cố định mỗi tia, không nhân theo Công hay hệ số chiêu.
    let HIT_GAP = 200, MIN_DMG_PCT = 0.1;   // admin chỉnh: skill.HIT_GAP / skill.MIN_DMG_PCT
    cfgOnApply(() => { HIT_GAP = cfgNum('skill.HIT_GAP', 200); MIN_DMG_PCT = cfgNum('skill.MIN_DMG_PCT', 0.1); });   // sát thương Công tối thiểu 10% (tránh đánh vào giáp quá cao mà chỉ còn 1)
    const missed = (u, t) => (u.acc || 0) - (t.dodge || 0) < HIT_GAP;
    const dodgeChance = (t, u) => missed(u, t) ? 100 : 0;   // dùng cho chiêu chỉ né được
    function calcDmg(u, t, raw) {
      const keep = 1 - Math.min(100, Math.max(0, t.block || 0)) / 100;
      return {
        main: Math.max(1, Math.round(Math.max(raw * MIN_DMG_PCT, raw - (t.def || 0)) * keep)),
        crit: Math.round(Math.max(0, (u.crit || 0) - (t.tough || 0)) * (u.critDmg || 0) * keep),
        pierce: Math.round(u.pierce || 0) };
    }
    // TIA ĐÁNH: số lần sát thương của MỖI nhịp đánh (đòn thường, từng cây tre / bướm / nhát chém / lốc xoáy…). Số nhịp của chiêu giữ nguyên.
    // MỖI TIA = 1 lần ĐỦ 3 loại sát thương (Công−Thủ • Bạo • Phá giáp), mỗi loại 100%, hiện thành từng con số riêng (KHÔNG cộng dồn thành 1).
    // VD Bắc Cái cố định 18 cây tre, 5 tia → mỗi cây trúng 5 lần; Hoa Mãn Lâu 3 bướm, 5 tia → mỗi bướm 5 lần; Trương Tam Phong 5 tia → lốc xoáy 5 lần.
    const tiaOf = u => Math.min(100, Math.max(1, Math.floor((u && u.tia) || 1)));
    const rayWait = i => (battleFast ? 0 : i * 170 * ultTimeScale * battleSlow);
    // PvE: mỗi lần chiêu gây sát thương trúng đích thì người đánh +RAGE_HIT nộ (PvP không có; trượt không có; đánh thường đã có +RAGE_ATK riêng)
    function rageOnHit(u) { if (!pvp && u && u.rage != null && u.alive) gainRage(u, RAGE_HIT); }
    function strike(u, t, raw) {   // false = trượt (trượt thì cả nhịp trượt)
      if (missed(u, t)) return false;
      const n = tiaOf(u);
      for (let i = 0; i < n && t.alive; i++) {
        const p = calcDmg(u, t, raw);   // tính lại mỗi tia (Thủ / Đỡ đòn / khiên của mục tiêu có thể đổi)
        hit(t, p.main + p.crit + p.pierce, false, u, false, p, { i, wait: rayWait(i) });
      }
      return true;
    }
    function floatText(u, t) {
      const d = document.createElement('div'); d.className = 'bf-dmg'; d.style.fontSize = '16px'; d.textContent = t;
      u.el.appendChild(d); setTimeout(() => d.remove(), 800);
    }
    // ---- Helper 2 phe: tướng địch (Trận 4) dùng lại đúng skill của tướng ta ----
    const foesOf   = u => u.side === 'hero' ? waveUnits.enemies : waveUnits.heroes;
    const alliesOf = u => u.side === 'hero' ? waveUnits.heroes  : waveUnits.enemies;
    const skillHit = (t, dmg, src) => { if (!src) return hit(t, Math.max(1, dmg - (t.def || 0))); if (!strike(src, t, dmg)) floatText(t, 'NÉ'); else rageOnHit(src); };   // chiêu cũng tính 3 loại sát thương
    function clearDefBuff(units) {
      units.forEach(h => { if (h.defBuff) { h.def -= h.defBuff; h.defBuff = 0; const ic = h.el.querySelector('.bf-shield'); if (ic) ic.remove(); } });
    }
    // Chảy máu: mỗi hiệp mất 20% HP hiện tại
    async function tickBleed(units) {
      let bled = false;
      units.filter(u => u.alive).forEach(u => {
        if (u.bleed > 0) {
          const d = Math.round(u.hp * (u.bleedPct || BLEED_PCT));
          if (d >= 1) { hit(u, d, true); bled = true; }
          u.bleed--;
          if (u.bleed === 0) { u.bleedPct = 0; const ic = u.el.querySelector('.bf-bleed'); if (ic) ic.remove(); }
        }
        // Trúng độc (bướm Tím): mỗi hiệp mất 25% HP hiện tại
        if (u.alive && u.dn && u.dn.poison > 0) {
          const d = Math.round(u.hp * BF_POISON_PCT);
          if (d >= 1) { hit(u, d, true); bled = true; }
          u.dn.poison--; refreshDbf(u);
        }
        // Phạm Dao: dấu giảm 30% HP kéo dài 2 hiệp (KHÔNG trừ thêm). Hết hạn mà không bị ulti lại -> hiệp kế tiếp được cộng lại 30% HP hiện tại
        if (u.alive && u.pdRet) {
          const r = Math.round(u.hp * (u.pdPct || ((typeof PD_HP_PCT === 'number') ? PD_HP_PCT : 0.3)));   // 30% của MÁU HIỆN TẠI lúc hết hạn (không trả lại số máu đã bị trừ ban đầu)
          u.pdRet = 0; const m = u.el.querySelector('.pd-mark'); if (m) m.remove();
          if (r >= 1) { u.hp = Math.min(u.max, u.hp + r); setHpBar(u); floatText(u, '+' + formatNumber(r) + ' HP'); refreshPanel(); }
        } else if (u.alive && u.pdDot > 0 && --u.pdDot <= 0) { u.pdDot = 0; u.pdRet = 1; }
      });
      return bled;
    }
    // ---- Hiệu ứng bất lợi của bướm Hoa Mãn Lâu (lưu trong u.dn: số hiệp còn lại theo từng loại) ----
    const BF_DN_ICON = { atk: '⚔️↓', def: '🛡️↓', heal: '💔', rage: '⚡↓', silence: '🤐', poison: '☠️', immortal: '✨', nobuff: '🚫✨', hpcut: '🔥↓' };   // hpcut: Đông Phương đánh dấu "sẽ bị trừ 50% HP"
    function refreshDbf(u) {
      let ic = u.el.querySelector('.bf-dbf');
      const s = u.dn ? Object.keys(BF_DN_ICON).filter(k => u.dn[k] > 0).map(k => BF_DN_ICON[k]).join('') : '';
      if (!s) { if (ic) ic.remove(); return; }
      if (!ic) { ic = document.createElement('div'); ic.className = 'bf-dbf'; u.el.appendChild(ic); }
      ic.textContent = s;
    }
    const isSilenced = u => !!(u.dn && u.dn.silence > 0);
    // Thanh Y Tiên Tử: bất tử 3 hiệp đầu mỗi trận (HP không xuống dưới 1)
    // Vai trò (viền): tank = thủ đỏ • sup = hỗ trợ vàng • skill = kỹ năng xanh dương • atk = công kích cam
    const BF_ROLE_BADGE = { sup: '<svg viewBox="0 0 24 24"><rect x="10.6" y="0.8" width="2.8" height="3" rx="1" fill="#a16207"/><path d="M12 3.6c-1.5 0-2.5 1-2.5 2.3 0 .9.5 1.6 1.2 2-1.7.7-2.7 2.1-2.7 3.8 0 1.3.6 2.3 1.6 3-1.9.8-3.1 2.5-3.1 4.6 0 2.9 2.4 5.2 5.5 5.2s5.5-2.3 5.5-5.2c0-2.1-1.2-3.8-3.1-4.6 1-.7 1.6-1.7 1.6-3 0-1.7-1-3.1-2.7-3.8.7-.4 1.2-1.1 1.2-2 0-1.3-1-2.3-2.5-2.3z" fill="#f59e0b" stroke="#92400e" stroke-width="1"/><path d="M9.2 13.8h5.6" stroke="#dc2626" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="9.6" cy="18" rx="1.2" ry="2" fill="#fde68a" opacity=".7"/></svg>', heal: '🌿', atk: '🗡️', skill: '☯️', tank: '🛡️' };   // hỗ trợ/trị liệu = hồ lô • công kích = kiếm • kỹ năng = thái cực • thủ = khiên
    function applyRole(u) {
      const r = HERO_ROLE[u.id]; if (!r || !u.el) return;
      u.el.dataset.role = r; u.el.style.setProperty('--rc', ROLE_COLOR[r]);
      const sp = u.el.querySelector('.bf-sprite'), hb = heroById(u.id);
      if (u.id === 7 && sp && typeof pdMountIdle === 'function') { pdMountIdle(u, sp, Math.round(PD_IDLE_H * HERO_SCALE * (HERO_SIZE_ADJ[7] || 1))); return; }   // Phạm Dao: dáng đứng yên bằng chuỗi 20 khung hòa mượt (heros/pham-dao/pham-dao.js)
      const sq = (typeof seqIdleHTML === 'function') ? seqIdleHTML(u.id, hb, u.side) : '';   // dáng đứng bằng chuỗi khung (hero-seq.js)
      if (sp && sq) { if (!sp.querySelector('.hero-seq')) sp.innerHTML = sq; return; }
      if (sp && hb && hb.body && !sp.querySelector('.hero-body')) { sp.innerHTML = '<img class="hero-body" style="height:' + (hb.bodyH || 76) + 'px" src="' + hb.body + '">'; return; }
      if (sp && hb && hb.img && !hb.body && !sp.querySelector('.hero-body')) { sp.innerHTML = '<img class="hero-body hero-portrait" style="height:80px" src="' + hb.img + '">'; return; }
      if (sp && !sp.querySelector('.hero-img, .bf-emo, .hero-body')) sp.innerHTML = '<span class="bf-emo">' + sp.innerHTML + '</span>';
    }
    function grantStart(u) { applyRole(u); if (u.id === 1) { (u.dn = u.dn || {}).immortal = IMMORTAL_TURNS; refreshDbf(u); } }
    function tickImmortal(units) { units.forEach(u => { if (u.dn && u.dn.immortal > 0) { u.dn.immortal--; refreshDbf(u); } }); }
    const deadAllies = u => alliesOf(u).filter(a => !a.alive);
    // Không ulti được tuyệt kỹ: bị câm lặng, hoặc là Thanh Y mà chưa có đồng đội nào gục để hồi sinh
    const ultBlocked = u => isSilenced(u) || (u.id === 1 && !deadAllies(u).length);

    // Thanh Y Tiên Tử: mưa cánh hoa sen rơi từ trời xuống chỗ đồng đội đã gục -> hoa sen xanh nở -> tướng đó sống lại
    async function reviveUlt(u, tok) {
      const f = document.getElementById('battle-arena'), box = document.getElementById('bf-units');
      const W = f.clientWidth, H = f.clientHeight;
      const targets = shuffled(deadAllies(u)).slice(0, REVIVE_COUNT);
      if (!targets.length) return;
      const made = [];
      const mk = (cls, txt, x, y) => { const d = document.createElement('div'); d.className = cls; d.textContent = txt; d.style.left = x + '%'; d.style.top = y + '%'; box.appendChild(d); made.push(d); return d; };
      try {
        // 1. Mưa cánh hoa sen từ trời rơi xuống chỗ từng tướng đã gục
        sfxRocket();
        targets.forEach((t, ti) => {
          for (let i = 0; i < 18; i++) {
            const sx = t.x + (Math.random() - 0.5) * 26;
            const p = mk('bf-petal', '🪷', sx, -4); p.style.fontSize = (11 + Math.random() * 11) + 'px'; p.style.opacity = '0';
            const dx = (t.x - sx) * W / 100 + (Math.random() - 0.5) * 26, dy = (t.y + 3) * H / 100, sw = (Math.random() - 0.5) * 50;
            const T = (a, b, r) => `translate(calc(-50% + ${a}px),calc(-50% + ${b}px)) rotate(${r}deg)`;
            p.animate([
              { transform: T(0, 0, 0), opacity: 0 },
              { transform: T(dx * 0.3 + sw, dy * 0.3, 120), opacity: 1, offset: 0.15 },
              { transform: T(dx * 0.65 - sw, dy * 0.65, 260), opacity: 1, offset: 0.65 },
              { transform: T(dx, dy, 400), opacity: 0.9, offset: 0.92 },
              { transform: T(dx, dy, 420), opacity: 0 }
            ], { duration: 950 + Math.random() * 450, delay: ti * 350 + i * 55, easing: 'ease-in', fill: 'forwards' });
          }
        });
        await sleep(2000 + (targets.length - 1) * 350); if (tok !== battleToken) return;
        // 2. Hoa sen xanh nở ra tại chỗ tướng gục, tướng sống lại
        for (const t of targets) {
          const LW = Math.round(Math.max(120, Math.min(W * 0.3, 190))), lt = mk('bf-seq-fx', '', t.x, t.y - 4);
          lt.style.width = LW + 'px'; lt.style.height = Math.round(LW * SEQ.tyCast.ch / SEQ.tyCast.cw) + 'px';
          const ls = seqEl(SEQ.tyCast, LW); lt.appendChild(ls);
          for (let i = 0; i < 16; i++) setTimeout(() => { if (tok === battleToken) ls.show(i); }, seqT(i * 80));
          setTimeout(() => lt.remove(), seqT(1400));
          const w = mk('bf-wave', '', t.x, t.y); w.style.borderColor = '#4ade80'; w.style.boxShadow = '0 0 22px #22c55e, inset 0 0 22px #22c55e'; setTimeout(() => w.remove(), 650);
          sfxBell();
          t.alive = true; t.hp = Math.max(1, Math.round(t.max * REVIVE_HP_PCT)); t.rage = 0; t.stun = 0; t.bleed = 0; t.bleedPct = 0; t.pdDot = 0; t.pdRet = 0; { const pm = t.el.querySelector('.pd-mark'); if (pm) pm.remove(); }
          clearDebuffs(t); t.el.classList.remove('dead', 'stunned', 'hurt');
          t.el.querySelectorAll('.bf-stun, .bf-bleed').forEach(ic => ic.remove());
          if (t.side === 'hero') t.acted = true;           // vừa hồi sinh: chưa ra đòn ngay trong lượt này
          setHpBar(t); floatText(t, '🪷 HỒI SINH'); refreshPanel();
          await sleep(450); if (tok !== battleToken) return;
        }
        await sleep(700);
      } finally {
        made.forEach(d => d.remove());
      }
    }
    function gainRage(u, n) {                                  // Lam: nhận nộ ít hơn 25%
      if (u.dn && u.dn.rage > 0) n = Math.round(n * (1 - BF_PCT));
      u.rage = Math.min(100, u.rage + n);
    }
    function endDebuff(u, k) {
      const d = u.dn; if (!d) return;
      if (k === 'atk') { u.atk += d.atkV || 0; d.atkV = 0; }
      if (k === 'def') { u.def = (u.def || 0) + (d.defV || 0); d.defV = 0; }
      d[k] = 0;
    }
    function tickDebuffs(units) {                              // giảm 1 hiệp các hiệu ứng (độc do tickBleed xử lý)
      units.forEach(u => {
        tickMods(u);
        const d = u.dn; if (!d) return;
        ['atk', 'def', 'heal', 'rage', 'silence', 'nobuff'].forEach(k => { if (d[k] > 0 && --d[k] <= 0) endDebuff(u, k); });
        refreshDbf(u);
      });
    }
    function clearDebuffs(u) {
      clearMods(u, 'debuff');
      if (!u.dn) return;
      ['atk', 'def', 'heal', 'rage', 'silence', 'poison', 'nobuff'].forEach(k => endDebuff(u, k));
      refreshDbf(u);
    }
    // ---- Tăng/giảm CHỈ SỐ theo hiệp (Ngũ Tuyệt): u.mods = [{k, d, t, kind}] — hết hạn thì trả lại đúng số đã cộng/trừ ----
    // Bên ta tick đầu hiệp, bên địch tick sau khi ra đòn -> bên ta (và Tỷ Võ) cộng thêm 1 để "N hiệp" đủ N hiệp đầy đủ.
    const MOD_STATS = ['atk', 'def', 'spd', 'dodge', 'acc', 'crit', 'critDmg', 'tough', 'pierce', 'block'];
    function addMod(u, k, delta, turns, kind, tag) {
      if (!delta) return;
      if (kind === 'debuff' && bossB && u === bossB.unit) return;   // boss bang miễn nhiễm hiệu ứng bất lợi
      u.mods = u.mods || []; const old = u.mods.findIndex(m => m.k === k && m.tag === tag);
      if (old >= 0) { u[k] -= u.mods[old].d; u.mods.splice(old, 1); }   // cùng nguồn: làm mới, không cộng dồn
      u.mods.push({ k, d: delta, t: turns + ((u.side === 'hero' || pvp) ? 1 : 0), kind, tag }); u[k] = (u[k] || 0) + delta; refreshMods(u);
    }
    function refreshMods(u) {
      let ic = u.el.querySelector('.bf-mods'); const m = u.mods || [];
      if (!m.length) { if (ic) ic.remove(); return; }
      if (!ic) { ic = document.createElement('div'); ic.className = 'bf-mods'; u.el.appendChild(ic); }
      const up = m.filter(x => x.kind === 'buff'), dn = m.filter(x => x.kind === 'debuff');
      ic.innerHTML = (up.length ? '<b class="up">▲' + Math.max(...up.map(x => x.t)) + '</b>' : '') + (dn.length ? '<b class="dn">▼' + Math.max(...dn.map(x => x.t)) + '</b>' : '');
    }
    function tickMods(u) {
      if (!u.mods || !u.mods.length) return;
      u.mods = u.mods.filter(m => { if (--m.t > 0) return true; u[m.k] -= m.d; return false; }); refreshMods(u);
    }
    function clearMods(u, kind) {       // kind = 'debuff' | 'buff' | undefined (tất cả)
      if (!u.mods || !u.mods.length) return;
      u.mods = u.mods.filter(m => { if (kind && m.kind !== kind) return true; u[m.k] -= m.d; return false; }); refreshMods(u);
    }
    // Hiệu ứng của 1 con bướm: targets = toàn bộ địch
    // phase = 'debuff': các hiệu ứng GIẢM (chảy máu, giảm sát thương/Thủ/hồi máu/nộ, độc) — áp TRƯỚC khi ulti
    // phase = 'cc'    : KHỐNG CHẾ (Chàm choáng, Tím câm lặng) — áp NGAY SAU KHI ulti xong
    // bỏ trống        : áp cả hai cùng lúc (kiểu cũ)
    function bflyEffect(c, targets, phase) {
      const alive = targets.filter(e => e.alive);
      const say = (e, t) => setTimeout(() => { if (e.el.isConnected) floatText(e, t); }, 350);
      const wantDebuff = phase !== 'cc', wantCC = phase !== 'debuff';
      if (c.k === 'indigo') {                                   // Chàm: choáng 2 địch ngẫu nhiên 1 hiệp
        if (!wantCC) return;
        alive.slice().sort(() => Math.random() - 0.5).slice(0, BF_STUN_TARGETS).forEach(e => {
          stunEnemy(e, Math.max(BF_STUN_TURNS, e.stun || 0)); say(e, '💫 CHOÁNG ' + BF_STUN_TURNS + ' HIỆP');
        });
        return;
      }
      if (c.k === 'purple' && !wantDebuff) {                    // Tím (pha khống chế): câm lặng 2 địch ngẫu nhiên
        alive.slice().sort(() => Math.random() - 0.5).slice(0, BF_SILENCE_TARGETS).forEach(e => {
          (e.dn || (e.dn = {})).silence = BF_TURNS; refreshDbf(e); say(e, '🤐 CÂM LẶNG');
        });
        return;
      }
      if (!wantDebuff) return;
      const mute = (c.k === 'purple' && wantCC) ? alive.slice().sort(() => Math.random() - 0.5).slice(0, BF_SILENCE_TARGETS) : [];   // Tím: độc TOÀN địch (+ câm lặng 2 địch nếu không tách pha)
      alive.forEach(e => {
        const d = e.dn || (e.dn = {});
        if (c.k === 'red') {
          e.bleed = Math.max(e.bleed || 0, BF_TURNS); e.bleedPct = Math.max(e.bleedPct || 0, BF_PCT);
          if (!e.el.querySelector('.bf-bleed')) { const ic = document.createElement('div'); ic.className = 'bf-bleed'; ic.textContent = '🩸'; e.el.appendChild(ic); }
          say(e, '🩸 CHẢY MÁU');
        } else if (c.k === 'orange') {
          if (!(d.atk > 0)) { d.atkV = Math.min(e.atk - 1, Math.round(e.atk * BF_PCT)); e.atk -= d.atkV; }
          d.atk = BF_TURNS; say(e, '⚔️ GIẢM SÁT THƯƠNG ' + Math.round(BF_PCT * 100) + '%');
        } else if (c.k === 'yellow') {
          if (!(d.def > 0)) { d.defV = Math.round((e.def || 0) * BF_PCT); e.def = (e.def || 0) - d.defV; }
          d.def = BF_TURNS; say(e, '🛡️ GIẢM THỦ ' + Math.round(BF_PCT * 100) + '%');
        } else if (c.k === 'green') {
          d.heal = BF_TURNS; say(e, '💔 GIẢM HỒI MÁU ' + Math.round(BF_PCT * 100) + '%');
        } else if (c.k === 'blue') {
          d.rage = BF_TURNS; say(e, '⚡ GIẢM NỘ ' + Math.round(BF_PCT * 100) + '%');
        } else if (c.k === 'purple') {
          d.poison = BF_TURNS; if (mute.includes(e)) { d.silence = BF_TURNS; say(e, '☠️ ĐỘC + 🤐 CÂM LẶNG'); } else say(e, '☠️ TRÚNG ĐỘC');
        }
        refreshDbf(e);
      });
    }
    // Địch gục ngay trong lúc ulti: gỡ biểu tượng chảy máu/choáng đã áp TRƯỚC sát thương (hiệu ứng giảm áp trước khi ulti)
    function dropDeadEffects(list) {
      list.forEach(e => {
        if (e.alive) return;
        e.bleed = 0; e.bleedPct = 0; e.stun = 0; e.pdDot = 0; e.pdRet = 0;
        e.el.querySelectorAll('.bf-bleed, .bf-stun, .pd-mark').forEach(ic => ic.remove());
      });
    }
    function stunEnemy(e, turns) {
      if (bossB && e === bossB.unit) { floatText(e, '🛡️ MIỄN KHỐNG CHẾ'); return; }   // boss bang không bị choáng
      e.stun = turns;
      e.el.classList.add('stunned');
      if (!e.el.querySelector('.bf-stun')) {
        const d = document.createElement('div'); d.className = 'bf-stun'; d.textContent = '💫'; e.el.appendChild(d);
      }
    }

;
/* === js/battle/status-icons.js === */
/* KÝ HIỆU HIỆU ỨNG TRÊN ĐẦU TƯỚNG (thay toàn bộ ký hiệu cũ)
   - Đọc trạng thái thật của từng đơn vị (u.mods, u.dn, u.bleed, u.stun, u.defBuff, u.pdDot...) rồi vẽ icon trong giao-dien/icon-kihieu/
   - Có thanh máu (địch ở PVE) -> icon nằm TRÊN thanh máu; không có -> nằm trên đầu tướng (xem css/battle/status-icons.css)
   - Nạp SAU engine.js. Không sửa engine.js. Muốn thêm/đổi icon: sửa bảng SI_* bên dưới. */
(function () {
  var DIR = 'giao-dien/icon-kihieu/';   // thư mục icon của bạn (cùng cấp index.html)

  // Chỉ số tăng/giảm theo hiệp (u.mods: {k, t, kind:'buff'|'debuff'}) -> tên file [tăng, giảm]
  var SI_MOD = {
    atk: ['tang_cong', 'giam_cong'], def: ['tang_thu', 'giam_thu'], spd: ['tang_toc', 'giam_toc'],
    dodge: ['tang_ne', 'giam_ne'], crit: ['tang_bao', 'giam_bao'], critDmg: ['tang_bao_sat', 'giam_bao_sat'],
    pierce: ['tang_pha_giap', 'giam_pha_giap'], acc: ['tang_chinh_xac', 'giam_chinh_xac'],
    tough: ['khang', 'khang'], block: ['do_don', 'do_don']     // Kháng / Đỡ đòn: chỉ có 1 icon cho cả tăng lẫn giảm
  };
  // Hiệu ứng bất lợi của bướm/tướng (u.dn[k] = số hiệp còn lại)
  var SI_DN = { atk: 'giam_cong', def: 'giam_thu', heal: 'giam_hoi', silence: 'cam_lang', poison: 'trung_doc', hpcut: 'giam_hp',
               rage: 'giam_no', immortal: 'bat_tu', nobuff: 'khoa_tang_phuc' };

  function collect(u) {
    var m = {};                                   // icon -> số hiệp (0 = không hiện số)
    function add(ic, t) { t = t > 0 ? Math.round(t) : 0; if (!(ic in m) || t > m[ic]) m[ic] = t; }
    if (!u || !u.alive) return m;
    (u.mods || []).forEach(function (x) { var p = SI_MOD[x.k]; if (p) add(p[x.kind === 'debuff' ? 1 : 0], x.t); });
    if (u.dn) Object.keys(SI_DN).forEach(function (k) { if (u.dn[k] > 0) add(SI_DN[k], u.dn[k]); });
    if (u.bleed > 0) add('chay_mau', u.bleed);
    if (u.stun > 0) add('choang', u.stun);
    if (u.defBuff > 0) add('tang_thu', 0);        // khiên thủ (cũ: .bf-shield)
    if (u.pdDot > 0) add('giam_hp', u.pdDot); else if (u.pdRet) add('giam_hp', 0);   // dấu giảm HP của Phạm Dao
    if (u.lb > 0) { add('tang_ne', u.lb); add('tang_toc', u.lb); }   // Đoàn Dự - Lăng Ba Vi Bộ: +Né +Tốc (cũ: .bf-lb 💨)
    if (u.burn > 0) add('thieu_dot', u.burn);     // nếu sau này có hiệu ứng thiêu đốt: đặt u.burn = số hiệp
    return m;
  }

  function render(u) {
    if (!u || !u.el) return;
    var m = collect(u), keys = Object.keys(m).sort();
    var sig = keys.map(function (k) { return k + ':' + m[k]; }).join('|');
    if (u._siSig === sig) return;
    u._siSig = sig;
    var box = u.el.querySelector('.bf-st');
    if (!keys.length) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('div'); box.className = 'bf-st'; u.el.appendChild(box); }
    box.innerHTML = keys.map(function (k) {
      return '<span class="bf-st-i"><img src="' + DIR + k + '.png" alt="" draggable="false">' + (m[k] ? '<b>' + m[k] + '</b>' : '') + '</span>';
    }).join('');
  }

  function units() {
    var a = [];
    try { if (typeof waveUnits !== 'undefined' && waveUnits) a = a.concat(waveUnits.heroes || [], waveUnits.enemies || []); } catch (e) {}
    try { if (typeof bossB !== 'undefined' && bossB && bossB.unit && a.indexOf(bossB.unit) < 0) a.push(bossB.unit); } catch (e) {}
    return a;
  }

  function tick() { units().forEach(function (u) { try { render(u); } catch (e) {} }); }
  setInterval(tick, 120);
  window.siRender = render;                       // gọi tay nếu cần cập nhật ngay
})();

;
/* === js/battle/formation-config.js === */
/* VỊ TRÍ TƯỚNG DO ADMIN CHỈNH (admin → Thông số game → 📍 Vị trí tướng).
   Nạp SAU js/core/remote-config.js và js/battle/engine.js (nơi khai báo HERO_POS).
   Ghi đè HERO_POS theo cấu hình `formation`; không có cấu hình thì dùng mặc định gốc. */
const FORMATION_DEF = JSON.parse(JSON.stringify(HERO_POS));
function applyFormationCfg() {
  const f = null;   // vị trí tướng cố định theo HERO_POS trong code (admin không còn chỉnh)
  for (let n = 1; n <= 5; n++) {
    const a = f && f[n];
    const ok = Array.isArray(a) && a.length === n && a.every(p => Array.isArray(p) && isFinite(p[0]) && isFinite(p[1]));
    HERO_POS[n] = ok ? a.map(p => [+p[0], +p[1]]) : FORMATION_DEF[n].map(p => p.slice());
  }
}
cfgOnApply(applyFormationCfg);   // chạy ngay 1 lần + chạy lại mỗi khi cấu hình admin được tải về

;
/* === js/battle/audio.js === */
/* TRẬN ĐẤU: âm thanh (tướng, đánh thường, nhạc nền)
   (tách từ index.html cũ — script) */

    // Chiêu cuối: tướng thường dùng kiểu lao vào đánh 3 đòn, Trương Tam Phong có chiêu riêng
    // Âm thanh tuyệt kỹ theo tướng (heros/<tên-tướng>/NN-<tên-tướng>.mp3). [ghi chú cũ: id 0 = Tà Đế, id 2 = Hằng Nga, id 5 = Âu Cơ, id 8 = Lạc Long Quân, id 9 = Hỏa Thiên Tướng, id 10 = Tiểu Yêu (Vô Nhai Tử: không có âm lúc bắt đầu chiêu, mỗi viên cờ rơi kêu 1 tiếng – xem playGoStone)
    const HERO_SND_SRC = HERO_T.sound;   // mỗi tướng 1 âm tuyệt kỹ riêng (tạo bằng tổng hợp âm), phát lúc bắt đầu tung chiêu
    const heroSnd = {};
    Object.keys(HERO_SND_SRC).forEach(id => { try { const a = new Audio(HERO_SND_SRC[id]); a.preload = 'auto'; heroSnd[id] = a; } catch (e) {} });
    function playHeroSound(id) {
      try {
        if (!audioSet.skill) return;
        const src = HERO_SND_SRC[id]; if (!src) return;
        const a = heroSnd[id] || (heroSnd[id] = new Audio(src));
        a.pause(); a.currentTime = 0;
        const p = a.play(); if (p && p.catch) p.catch(() => {});
      } catch (e) {}
    }
    // Vô Nhai Tử: mỗi viên cờ rơi xuống kêu 1 tiếng (không phát lúc bắt đầu chiêu; mỗi viên 1 âm riêng nên tạo Audio mới để chồng được lên nhau)
    const GO_STONE_SND = 'am-thanh-game/go-stone.mp3';
    function playGoStone() {
      try {
        if (!audioSet.skill) return;
        const a = new Audio(GO_STONE_SND); a.volume = 1;
        const p = a.play(); if (p && p.catch) p.catch(() => {});
      } catch (e) {}
    }
    // Âm mở màn: phát 1 lần mỗi khi vào trận (ải thường, Tỷ Võ… ở đâu cũng phát)
    const BATTLE_OPEN_SND = 'am-thanh-game/battle-open.mp3';
    let openSnd = null;
    function playBattleOpen() {
      try {
        if (!audioSet.skill) return;
        if (openSnd) { openSnd.pause(); openSnd.currentTime = 0; }
        openSnd = new Audio(BATTLE_OPEN_SND); openSnd.volume = 1;
        const p = openSnd.play(); if (p && p.catch) p.catch(() => {});
      } catch (e) {}
    }
    // Âm đánh thường: tướng chưa đủ nộ để ulti hoặc đang bị câm lặng thì đánh thường kèm âm này (mỗi đòn 1 Audio mới để chồng được)
    const NORMAL_ATK_SND = 'am-thanh-game/normal-attack.mp3';
    function playNormalAtk() {
      try {
        if (!audioSet.skill) return;
        const a = new Audio(NORMAL_ATK_SND); a.volume = 0.9;
        const p = a.play(); if (p && p.catch) p.catch(() => {});
      } catch (e) {}
    }
    const normalAttack = (u, foes, tok) => { playNormalAtk(); return attack(u, foes, 1, u.atk, tok); };
    // (Đã bỏ nhạc nền.) stopBgm giờ chỉ dừng âm mở màn.
    function stopBgm() { try { if (openSnd) { openSnd.pause(); openSnd.currentTime = 0; } } catch (e) {} }
    function stopHeroSounds() { try { Object.values(heroSnd).forEach(a => { a.pause(); a.currentTime = 0; }); } catch (e) {} }

;
/* === js/battle/ultimate.js === */
/* TRẬN ĐẤU: điều phối tuyệt kỹ (ultimate) và hồi máu
   (tách từ index.html cũ — script) */

    // ★6: ulti 2 lần • ★11: ulti 3 lần • ★16: gộp 3 lần thành 1 lần ulti, sát thương ×3 (vd 300 × 3 lần = 900 → 1 lần đánh 900)
    function ultPlan(star) { return { casts: 1, mult: 1 }; }   // đã bỏ cơ chế ★6/★11/★16: mọi tướng chỉ ulti 1 lần
    function ultStarOf(u) {
      if (u.id === undefined || u.id === null) return 1;
      if (u.side === 'hero') return getProg(u.id).star;
      if (u.star) return u.star;   // đối thủ người thật: số sao thật của họ
      return pvp ? ((START_PROG[u.id] || {}).star || 5) : 1;   // địch trong ải thường không có sao
    }
    const QUICK_CHAIN = new Set([4, 7]);   // Trương Tam Phong, Phạm Dao
    async function ultimate(u, tok) {
      const plan = ultPlan(ultStarOf(u));
      const sk0 = u.sk, z0 = u.el.style.zIndex;
      const chain = QUICK_CHAIN.has(u.id);   // tướng bay lên / nhảy qua đầu: giữ nguyên tư thế, chỉ đánh liên tiếp
      try {
        if (plan.mult !== 1) u.sk = (u.sk || 1) * plan.mult;     // ×3 hiệu lực/sát thương tuyệt kỹ
        for (let i = 0; i < plan.casts; i++) {
          if (tok !== battleToken || !u.alive) return;
          if (i > 0) { if (!foesOf(u).some(e => e.alive)) return; await sleep(chain ? 60 : 200); if (tok !== battleToken || !u.alive) return; }
          u.qRepeat = i > 0; u.qKeep = chain && i < plan.casts - 1; ultTimeScale = i > 0 ? 0.5 : 1;
          await ultimateOnce(u, tok);
        }
      } finally {
        u.sk = sk0; ultTimeScale = 1; u.qRepeat = false; u.qKeep = false;
        if (plan.casts > 1) { try { u.el.getAnimations().forEach(a => a.cancel()); } catch (e) {} u.el.style.zIndex = z0; }
      }
    }
    function ultimateOnce(u, tok) {
      if (u.isSoldier) return lcUlt(u, tok);   // Lính phụ (cờ/kiếm/cung/đao/chuỳ/thương): heros/linh-cam.js
      playHeroSound(u.id);
      { const uf = heroUltFn(u.id); if (uf) return uf(u, tok); }   // tên hàm tuyệt kỹ khai báo trong heros/hero-data.js (ultFn)
      return attack(u, foesOf(u), ULT_HITS, u.atk * ULT_MULT * (u.sk || 1), tok, true);
    }

    function heal(u, amt) {
      if (!u.alive) return;
      if (u.dn && u.dn.heal > 0) amt = Math.round(amt * (1 - BF_PCT));   // bướm Lục: giảm hồi máu 25%
      const before = u.hp;
      u.hp = Math.min(u.max, u.hp + amt);
      setHpBar(u);
      const d = document.createElement('div'); d.className = 'bf-dmg bf-heal'; d.textContent = '+' + formatNumber(Math.round(u.hp - before));
      u.el.appendChild(d); setTimeout(() => d.remove(), 800);
      const fx = document.createElement('div'); fx.className = 'bf-fx'; fx.innerHTML = '<img src="heros/au-co/bup-sen.webp?v=3" alt="" style="width:34px;height:auto;display:inline-block;vertical-align:middle;pointer-events:none;filter:drop-shadow(0 0 6px #f0abfc)">';   // búp sen (thay icon 🌸 cũ)
      u.el.appendChild(fx); setTimeout(() => fx.remove(), 350);
      refreshPanel();
    }

;
/* === js/battle/synth-sfx.js === */
/* TRẬN ĐẤU: bộ tạo âm thanh tổng hợp dùng chung
   (tách từ index.html cũ — script) */

    // Hoa Mãn Lâu: 3 bướm 3 màu ngẫu nhiên xoay quanh thân -> lần lượt bay lên trời -> lần lượt từ từ rơi xuống trúng TOÀN BỘ địch -> +50% Công toàn đội
    // ===== Âm thanh tổng hợp cho Hoa Mãn Lâu (không cần file): pháo xẹt khi bướm bay lên, chuông chùa khi bướm đáp =====
    let sfxCtx = null;
    function sfxGet() {
      try {
        if (!audioSet.skill) return null;
        if (!sfxCtx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; sfxCtx = new C(); }
        if (sfxCtx.state === 'suspended') sfxCtx.resume();
        return sfxCtx;
      } catch (e) { return null; }
    }
    function sfxNoise(ctx, dur) {
      const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf; return src;
    }

;
/* === heros/hero-skills.js === */
/* HERO-SKILLS.JS — hiệu ứng tuyệt kỹ riêng của từng tướng, gộp vào 1 file (trước đây mỗi tướng 1 file heros/<slug>/<slug>.js).
   Mỗi khối bắt đầu bằng banner "=== <slug> ===". Thứ tự giữ đúng như cũ (theo id tướng). Tên hàm chạy tuyệt kỹ khai báo trong heros/hero-data.js (ultFn).
   Ngũ Tuyệt (bac-cai, dong-ta, tay-doc, nam-de, vuong-trung-duong) có khối riêng từng tướng trong game.js (banner === bac-cai ===, === dong-ta === ...). Lính phụ nằm ở heros/linh-cam.js. */

/* === ta-de === */
/* TÀ ĐẾ (id 0): tuyệt kỹ Tà Đế Ngũ Trảm
   Chuỗi khung: SEQ.tdeIdle (đứng yên) • SEQ.tdeTele (18 khung dịch chuyển: 0-6 tan biến, 7-17 hiện ra) • SEQ.tdeSlash1..6 (6 kiểu chém tím, mỗi kiểu 7 khung)
   Trình tự (ms tính từ lúc bắt đầu tiếng, khớp heros/ta-de/00-ta-de.mp3): tan thành sương tím → hiện ra sau đội hình địch → đội ta +TADE_PIERCE Phá giáp
   → TADE_HITS nhát chém từ nhiều hướng (mỗi nhát: toàn địch -TADE_SLOW Tốc, BỎ QUA bất tử) → dịch chuyển về chỗ cũ.
   Tham số chỉnh ở admin.html → tab "Chiêu thức & chiến đấu" → Tà Đế. */
const TADE_T = [1300, 1550, 1800, 2050, 2350];   // mốc từng nhát chém (ms từ lúc bắt đầu tiếng)
async function taDeUlt(u, tok) {
  const f = document.getElementById('battle-arena'), box = document.getElementById('bf-units');
  const W = f.clientWidth, H = f.clientHeight, base = 'translate(-50%,-50%)';
  const alive = () => foesOf(u).filter(e => e.alive);
  const es0 = alive(); if (!es0.length) return;
  const xs = es0.map(e => e.x), ys = es0.map(e => e.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const idleH = (SEQ_IDLE[0] && SEQ_IDLE[0].h) || 120, tw = Math.round(idleH * 1.0913);   // cùng cỡ người với dáng đứng (khung dịch chuyển vuông 296×296)
  const halfW = tw * 0.5 / W * 100 + 2;   // nửa bề rộng khung dịch chuyển (%) + lề: Tà Đế luôn nằm TRỌN trong sân, không văng ra mép/ra ngoài màn hình
  const landX = Math.max(halfW, Math.min(100 - halfW, u.side === 'hero' ? Math.max(...xs) + 9 : Math.min(...xs) - 9)), landY = cy;
  const dx = (landX - u.x) * W / 100, dy = (landY - u.y) * H / 100;
  const land = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
  const oldZ = u.el.style.zIndex, made = [], timers = [];
  const hits = Math.max(1, Math.floor(TADE_HITS)), per = u.atk * TADE_MULT * (u.sk || 1) / hits;
  const rs = ms => (battleFast || ms <= 0) ? Promise.resolve() : new Promise(r => setTimeout(r, ms));
  const t0 = performance.now(), at = ms => rs(t0 + ms - performance.now());
  const flipped = seqFlip(SEQ.tdeTele, u.side);
  const ov = seqOverlay(u, SEQ.tdeTele, tw);
  const face = fl => { ov.el.style.transform = 'translateX(-50%)' + (fl ? ' scaleX(-1)' : ''); };
  const play = async (a, b, ms) => { for (let i = a; i <= b; i++) { if (tok !== battleToken) return false; ov.show(i); await rs(ms); } return tok === battleToken; };
  // vòng sóng tím
  const ring = (x, y) => { const w = document.createElement('div'); w.className = 'bf-wave'; w.style.left = x + '%'; w.style.top = y + '%'; w.style.borderColor = '#a855f7'; w.style.boxShadow = '0 0 24px #7e22ce, inset 0 0 24px #a855f7'; box.appendChild(w); made.push(w); setTimeout(() => w.remove(), 650); };
  // 1 hiệu ứng chém: row = 1..6 (kiểu chém), tâm (xPct,yPct), rộng w px
  const slashFx = (row, xPct, yPct, w, flip) => {
    const s = SEQ['tdeSlash' + row], d = document.createElement('div'); d.className = 'bf-tde-fx';
    const anchored = (row === 2 || row === 6);   // cột tia / bung nổ: đáy đặt ở chân mục tiêu
    d.style.left = xPct + '%'; d.style.top = (anchored ? yPct + 5 : yPct) + '%'; d.style.zIndex = 150;   // hiệu ứng chém phủ LÊN Tà Đế (z 140) để che dáng đứng, chỉ lộ ra khi ánh chém tan
    d.style.transform = (anchored ? 'translate(-50%,-88%)' : 'translate(-50%,-50%)') + (flip ? ' scaleX(-1)' : '');
    const el = seqEl(s, w); d.appendChild(el); box.appendChild(d); made.push(d);
    for (let i = 0; i < s.n; i++) timers.push(setTimeout(() => { if (tok === battleToken) el.show(i); }, battleFast ? 0 : i * 42));
    timers.push(setTimeout(() => d.remove(), battleFast ? 50 : s.n * 42 + 80));
  };
  const ORDER = [1, 4, 3, 2, 5];   // kiểu chém trung tâm của từng nhát (nhát cuối: vòng xoáy lớn + bung nổ dưới chân)
  u.el.style.zIndex = 140;
  try {
    // 1. Tan thành sương tím tại chỗ, rồi hiện ra sau đội hình địch (quay mặt về phía địch)
    await at(60); if (tok !== battleToken) return;
    if (!(await play(0, 6, 55))) return;
    ov.el.style.visibility = 'hidden';
    u.el.getAnimations().forEach(a => a.cancel()); u.el.animate([{ transform: land }], { duration: 1, fill: 'forwards' });
    face(!flipped); ov.el.style.visibility = '';
    ring(landX, landY);
    if (!(await play(7, 17, 45))) return;
    // 2. Dồn lực: hào quang tím + đội ta +Phá giáp
    u.el.animate([{ filter: 'brightness(1) drop-shadow(0 0 0 #a855f7)' }, { filter: 'brightness(1.5) drop-shadow(0 0 22px #c084fc)' }], { duration: 300, fill: 'forwards' });
    alliesOf(u).filter(a => a.alive).forEach(a => { if (!noBuff(a)) { addMod(a, 'pierce', TADE_PIERCE, TADE_PIERCE_TURNS, 'buff', 'tade'); floatText(a, '🗡️ +' + TADE_PIERCE + ' Phá giáp'); } });
    refreshPanel();
    // 3. Các nhát chém (mỗi nhát: toàn địch trúng, -Tốc, xuyên bất tử)
    u.ignoreImmortal = true;
    for (let k = 0; k < hits; k++) {
      await at(TADE_T[k] !== undefined ? TADE_T[k] : TADE_T[TADE_T.length - 1] + (k - TADE_T.length + 1) * 250); if (tok !== battleToken) return;
      const es = alive(); if (!es.length) break;
      const last = k === hits - 1, cRow = ORDER[k % ORDER.length], spanX = (Math.max(...es.map(e => e.x)) - Math.min(...es.map(e => e.x))) * W / 100;
      slashFx(cRow, cx + (Math.random() - 0.5) * 4, cy + (Math.random() - 0.5) * 6, Math.round(Math.max(210, Math.min(W * 0.9, spanX + 200)) * (last ? 1.15 : 1)), Math.random() < 0.5);
      es.forEach((e, j) => {
        let r = 1 + Math.floor(Math.random() * 6); if (r === cRow) r = r % 6 + 1; if (last) r = 6;
        slashFx(r, e.x + (Math.random() - 0.5) * 3, e.y + (Math.random() - 0.5) * 4, 150 + Math.round(Math.random() * 40), Math.random() < 0.5);
      });
      es.forEach(e => {
        skillHit(e, per, u);
        if (e.alive) {   // giảm Tốc tính trên Tốc GỐC (bỏ lớp 'tade' cũ trước) -> nhát nào cũng đúng -30%, không cộng dồn, không trôi số
          const old = (e.mods || []).find(m => m.k === 'spd' && m.tag === 'tade'), d = -Math.round((e.spd - (old ? old.d : 0)) * TADE_SLOW);
          if (d) { addMod(e, 'spd', d, TADE_SLOW_TURNS, 'debuff', 'tade'); if (k === 0) floatText(e, '🐌 -' + Math.round(TADE_SLOW * 100) + '% Tốc'); }
        }
      });
      f.classList.add('screen-shake'); setTimeout(() => f.classList.remove('screen-shake'), last ? 260 : 120);
      if (last) ring(cx, cy);
    }
    u.ignoreImmortal = false;
    // 4. Dịch chuyển về chỗ cũ: tan biến tại chỗ địch → hiện ra ở chỗ đứng cũ
    await at(2980); if (tok !== battleToken) return;
    if (!(await play(0, 6, 55))) return;
    ov.el.style.visibility = 'hidden';
    u.el.getAnimations().forEach(a => a.cancel());
    face(flipped); ov.el.style.visibility = '';
    await play(7, 17, 45);
  } finally {
    u.ignoreImmortal = false;
    timers.forEach(clearTimeout); made.forEach(d => d.remove());
    ov.end();
    try { u.el.getAnimations().forEach(a => a.cancel()); } catch (e) {}
    u.el.style.zIndex = oldZ;
  }
}

/* === thanh-y === */
/* THANH Y TIÊN TỬ (id 1): tuyệt kỹ Thanh Liên Hoàn Sinh
   Mưa cánh hoa (SEQ.thyLeaf, lát 2×4 ô phủ màn hình) → hoa sen xanh (SEQ.thyLotus) nở trên từng đồng đội đã gục → hồi sinh.
   Hồi sinh tối đa 2 đồng đội đã gục (ngẫu nhiên) với 50% HP, nộ về 0. */

    const THY_REVIVE_COUNT = 2;      // số đồng đội được hồi sinh tối đa
    const THY_REVIVE_PCT = 0.5;      // % HP tối đa khi sống lại

    async function reviveUlt(u, tok) {
      const f = document.getElementById('battle-arena'), box = document.getElementById('bf-units');
      const W = f.clientWidth, H = f.clientHeight;
      const base = 'translate(-50%,-50%)', timers = [];
      const targets = shuffled(alliesOf(u).filter(h => !h.alive)).slice(0, THY_REVIVE_COUNT);
      const at = (ms, fn) => timers.push(setTimeout(() => { if (tok === battleToken) fn(); }, seqT(ms)));

      // 1. Mưa cánh hoa: lát 2 cột × N hàng, phủ kín màn hình
      const SL = SEQ.thyLeaf, tw = Math.ceil(W / 2), th = Math.max(1, Math.round(tw * SL.ch / SL.cw)), rows = Math.max(1, Math.ceil(H / th));
      const leaf = document.createElement('div');
      leaf.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;pointer-events:none;z-index:60;';
      const tiles = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < 2; c++) {
        const t = seqEl(SL, tw); t.style.position = 'absolute'; t.style.left = (c * tw) + 'px'; t.style.top = (r * th) + 'px';
        leaf.appendChild(t); tiles.push(t);
      }
      f.appendChild(leaf);

      // 2. Hoa sen xanh trên từng đồng đội sắp hồi sinh
      const SLo = SEQ.thyLotus, LW = Math.round(Math.max(120, Math.min(W * 0.3, 190)));
      const lotuses = targets.map(h => {
        const r = document.createElement('div'); r.className = 'bf-seq-fx';
        r.style.left = h.x + '%'; r.style.top = h.y + '%'; r.style.width = LW + 'px'; r.style.height = Math.round(LW * SLo.ch / SLo.cw) + 'px';
        r.style.transform = base; r.style.opacity = '0';
        const sc = seqEl(SLo, LW); r.appendChild(sc); box.appendChild(r);
        return { r, sc, h };
      });

      try {
        u.el.animate([{ transform: base }, { transform: 'translate(-50%,calc(-50% - 12px))' }, { transform: base }], { duration: 700 });
        for (let i = 0; i < SL.n; i++) at(i * 90, () => tiles.forEach(t => t.show(i)));                 // mưa cánh hoa: 20 khung
        at(1100, () => lotuses.forEach(o => o.r.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, fill: 'forwards' })));
        for (let i = 0; i < SLo.n; i++) at(1100 + i * 80, () => lotuses.forEach(o => o.sc.show(i)));    // hoa sen nở: 20 khung
        await sleep(1900); if (tok !== battleToken) return;                                              // hoa nở rộ → hồi sinh
        targets.forEach(h => { thyRevive(h, THY_REVIVE_PCT); floatText(h, 'HỒI SINH'); });
        await sleep(800); if (tok !== battleToken) return;
        leaf.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
        lotuses.forEach(o => o.r.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }));
        await sleep(350);
      } finally {
        timers.forEach(clearTimeout); leaf.remove(); lotuses.forEach(o => o.r.remove());
        try { u.el.getAnimations().forEach(a => a.cancel()); } catch (e) {}
      }
    }

    // Đưa 1 tướng đã gục trở lại trận: sống, HP = pct × HP tối đa, nộ về 0, hiện lại trên sân
    function thyRevive(h, pct) {
      h.alive = true;
      h.hp = Math.max(1, Math.round(h.max * pct));
      ['rage', 'nu', 'fury', 'energy'].forEach(k => { if (typeof h[k] === 'number') h[k] = 0; });      // nộ về 0 (tên trường tùy engine)
      if (h.el) {
        h.el.classList.remove('dead', 'is-dead', 'bf-dead', 'down', 'ko');
        ['display', 'visibility', 'opacity', 'filter'].forEach(p => { if (h.el.style[p]) h.el.style[p] = ''; });
        try { h.el.getAnimations().forEach(a => a.cancel()); } catch (e) {}
      }
      setHpBar(h); refreshPanel();
    }

/* === hang-nga === */
/* HẰNG NGA (id 2): tuyệt kỹ khiên Nguyệt Quang
   Chuỗi khung: SEQ.hnIdle (20 khung đứng yên) • SEQ.hnCast (24 khung: bay từ đất lên trời, ngồi lên mặt trăng). Hai sheet CÙNG cỡ ô + CÙNG điểm neo (đầu)
   nên khi phủ lên tướng, thân không xê dịch. Tướng bay lên cao dần (animate `bottom`), ánh trăng rọi xuống cả đội:
   giải hiệu ứng xấu + khiên MOON_TURNS hiệp (phản MOON_REFLECT, đồng đội nhận MOON_TAKE). */

    async function hangNgaUlt(u, tok) {
      const f = document.getElementById('battle-arena'), box = document.getElementById('bf-units');
      const W = f.clientWidth, H = f.clientHeight, made = [], timers = [];
      const allies = alliesOf(u).filter(h => h.alive);
      const S = SEQ.hnCast, N = S.n, FR = 85;                                         // 24 khung × 85ms
      const castW = Math.round(S.cw * SEQ_IDLE[2].h / SEQ.hnIdle.ch), castH = Math.round(castW * S.ch / S.cw);   // cùng tỉ lệ với dáng đứng
      const rise = Math.max(0, Math.min(H * 0.3, u.y / 100 * H - castH * 0.6));        // quãng bay lên trời (không vọt khỏi sân)
      const at = (ms, fn) => timers.push(setTimeout(() => { if (tok === battleToken) fn(); }, seqT(ms)));
      const cast = seqOverlay(u, S, castW);
      try {
        for (let i = 0; i < N; i++) at(i * FR, () => cast.show(i));
        cast.el.animate([{ bottom: '2px' }, { bottom: (2 + rise) + 'px' }], { duration: Math.max(1, seqT(FR * (N - 6))), easing: 'ease-in-out', fill: 'forwards' });
        // ánh trăng rọi từ vầng trăng xuống cả đội (rộng đủ phủ mọi đồng đội)
        const ux = u.x / 100 * W, spread = Math.max(...allies.map(a => Math.abs(a.x - u.x))) / 100 * W;
        const bw = Math.min(W * 1.6, Math.max(W * 0.5, spread * 2 + 160)), top = Math.max(0, u.y / 100 * H - rise - castH * 0.5);
        at(FR * 12, () => {
          const beam = document.createElement('div'); beam.className = 'bf-moonbeam';
          beam.style.left = (ux - bw / 2) + 'px'; beam.style.width = bw + 'px'; beam.style.top = top + 'px'; beam.style.height = Math.max(40, H * 0.96 - top) + 'px';
          beam.style.clipPath = 'polygon(44% 0,56% 0,100% 100%,0 100%)'; box.appendChild(beam); made.push(beam);
          for (let i = 0; i < 34; i++) {                                                // hạt ánh sáng lấp lánh rơi xuống
            const sp = document.createElement('div'); sp.className = 'bf-spark'; sp.textContent = rand(['✨', '✦', '✧', '⭐']);
            sp.style.left = (ux - bw / 2 + bw * (0.12 + Math.random() * 0.76)) + 'px'; sp.style.top = (top + (H - top) * (0.05 + Math.random() * 0.2)) + 'px';
            sp.style.fontSize = (10 + Math.random() * 12) + 'px';
            sp.style.setProperty('--d', (0.9 + Math.random() * 0.7) + 's'); sp.style.setProperty('--dl', (Math.random() * 1.0) + 's');
            sp.style.setProperty('--h', ((H - top) * (0.4 + Math.random() * 0.4)) + 'px');
            box.appendChild(sp); made.push(sp);
          }
        });
        await sleep(FR * 17); if (tok !== battleToken) return;
        cleanse(allies);                                                                 // giải TẤT CẢ hiệu ứng bất lợi
        allies.forEach((a, i) => setTimeout(() => { if (!a.alive) return; applyMoon(a); floatText(a, '🌙 KHIÊN PHẢN ' + Math.round(MOON_REFLECT * 100) + '%'); }, i * 120));
        await sleep(FR * (N - 17) + 900); if (tok !== battleToken) return;            // đợi hết chuỗi + giữ dáng ngồi trên trăng
        cast.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' });
        await sleep(260);
      } finally {
        timers.forEach(clearTimeout); made.forEach(d => d.remove());
        cast.end(); u.el.getAnimations().forEach(x => x.cancel());
      }
    }

/* === hero-fx-helpers (hàm dùng chung nhiều tướng: nt, pctMod, sayLater) ===
   nt(u): bộ dựng sân đấu/danh sách địch-ta/hiệu ứng tạm • pctMod: tăng/giảm chỉ số theo % qua addMod (hết hạn tự trả đúng số) • sayLater: chữ nổi trễ.
   Dùng bởi Độc Cô Cầu Bại + Ngũ Tuyệt (Bắc Cái, Đông Tà, Tây Độc, Nam Đế, Vương Trùng Dương). Hàm khai báo ở đây nên đặt trước các khối tướng. === */

    // Bộ dựng chung cho các chiêu: sân đấu, kích thước, danh sách địch/ta còn sống, tạo hiệu ứng tạm
    function nt(u) {
      const f = document.getElementById('battle-arena'), box = document.getElementById('bf-units'), made = [];
      const es = () => foesOf(u).filter(e => e.alive), as = () => alliesOf(u).filter(a => a.alive);
      const box0 = list => { const xs = list.map(e => e.x), ys = list.map(e => e.y); return { cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2, minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }; };
      const mk = (cls, txt, x, y) => { const d = document.createElement('div'); d.className = cls; if (txt) d.innerHTML = txt; d.style.left = x + '%'; d.style.top = y + '%'; box.appendChild(d); made.push(d); return d; };
      const ring = (x, y, c) => { const w = mk('bf-wave', '', x, y); w.style.borderColor = c; w.style.boxShadow = '0 0 24px ' + c + ', inset 0 0 24px ' + c; setTimeout(() => w.remove(), 650); };
      const shake = () => { f.classList.add('screen-shake'); setTimeout(() => f.classList.remove('screen-shake'), 130); };
      return { f, box, W: f.clientWidth, H: f.clientHeight, made, es, as, box0, mk, ring, shake, base: 'translate(-50%,-50%)' };
    }
    // Đổi 1 chỉ số theo % hiện có (âm = giảm). Chỉ số "block" (Đỡ đòn %) không vượt 100.
    function pctMod(t, k, pct, turns, kind, tag) {
      if (typeof t[k] !== 'number' || !isFinite(t[k])) return 0;
      let d = Math.round(t[k] * pct); if (k === 'block' && d > 0) d = Math.min(d, 100 - (t.block || 0));
      if (k === 'atk' && d < 0) d = Math.max(d, -(t.atk - 1));
      addMod(t, k, d, turns, kind, tag); return d;
    }
    const sayLater = (t, txt, ms) => setTimeout(() => { if (t.el.isConnected) floatText(t, txt); }, ms || 300);

/* === doc-co-cau-bai === */
/* ĐỘC CÔ CẦU BẠI (id 3): tuyệt kỹ Độc Cô Cửu Kiếm
   Đứng im 1 chỗ (SEQ.dcIdle) → tung chiêu: từ dưới đất nhảy vọt lên cao (SEQ.dcCast) + trận pháp tím dưới chân
   → 3 thanh kiếm (DUCO_TWISTERS) rơi THẲNG ĐỨNG từ trên trời xuống 3 địch (SEQ.dcSword, 20 khung, phóng to khi cắm)
   → mỗi kiếm gây DUCO_MULT × Công lên 1 địch • địch trúng kiếm giảm DUCO_SPD_DOWN Tốc • cả đội ta tăng DUCO_SPD_UP Tốc (DUCO_TURNS hiệp)
   Tham số chỉnh ở admin.html → tab "Chiêu thức & chiến đấu" → Độc Cô Cầu Bại. */

// ===== Âm thanh: kiếm rít trên không + tiếng cắm xuống =====
function sfxSwordFly() {
  const ctx = sfxGet(); if (!ctx) return;
  try {
    const t = ctx.currentTime, out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(0.55, t + 0.12); out.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); out.connect(ctx.destination);
    const nz = sfxNoise(ctx, 0.6), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 5;
    bp.frequency.setValueAtTime(2600, t); bp.frequency.exponentialRampToValueAtTime(700, t + 0.45);   // vút từ cao xuống thấp
    nz.connect(bp); bp.connect(out); nz.start(t); nz.stop(t + 0.55);
  } catch (e) {}
}
function sfxSwordStab() {
  const ctx = sfxGet(); if (!ctx) return;
  try {
    const t = ctx.currentTime, out = ctx.createGain(); out.gain.value = 1.1;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; out.connect(comp); comp.connect(ctx.destination);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.3);   // bịch nặng
    const og = ctx.createGain(); og.gain.setValueAtTime(0.9, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.connect(og); og.connect(out); o.start(t); o.stop(t + 0.4);
    const nz = sfxNoise(ctx, 0.25), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;   // tiếng kim loại "keng"
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.55, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); nz.connect(hp); hp.connect(ng); ng.connect(out); nz.start(t); nz.stop(t + 0.25);
    const r = ctx.createOscillator(); r.type = 'triangle'; r.frequency.setValueAtTime(1320, t); const rg = ctx.createGain(); rg.gain.setValueAtTime(0.18, t); rg.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    r.connect(rg); rg.connect(out); r.start(t); r.stop(t + 0.55);
  } catch (e) {}
}

async function duCoUlt(u, tok) {
  const f = document.getElementById('battle-arena'), box = document.getElementById('bf-units');
  const W = f.clientWidth, H = f.clientHeight;
  const es0 = foesOf(u).filter(e => e.alive); if (!es0.length) return;
  const allies = alliesOf(u).filter(a => a.alive);
  const made = [], timers = [], oldZ = u.el.style.zIndex;
  const at = (ms, fn) => timers.push(setTimeout(() => { if (tok === battleToken) fn(); }, seqT(ms)));
  const add = (cls, x, y) => { const d = document.createElement('div'); d.className = cls; d.style.left = x + '%'; d.style.top = y + '%'; box.appendChild(d); made.push(d); return d; };
  const nSw = Math.max(1, Math.floor(DUCO_SWORDS));          // số kiếm trong cơn mưa (chỉ là hiệu ứng hình ảnh)
  const nHit = Math.max(1, Math.floor(DUCO_HIT_COUNT));      // số lần sát thương lên MỖI địch (không phụ thuộc số kiếm)
  const per = u.atk * DUCO_MULT * (u.sk || 1) / nHit;   // tổng DUCO_MULT × Công chia đều cho các lần (số tia xử lý chung trong strike() như mọi tướng)
  const castW = Math.round(SEQ.dcCast.cw * SEQ_IDLE[3].h / SEQ.dcIdle.ch), CFR = 86;
  const cast = seqOverlay(u, SEQ.dcCast, castW);
  const KH = Math.round(Math.min(H * 0.58, 270)), KW = Math.round(KH * 0.36);   // kích thước 1 thanh kiếm
  const T0 = 700, SPAN = 1300, STAG = SPAN / nSw, FLY = 460;                     // kiếm đầu rơi lúc T0, 32 kiếm rơi dồn dập trong SPAN ms
  try {
    u.el.style.zIndex = 95;
    // 1. Trận pháp tím dưới chân + nhảy vọt lên cao
    const cw = Math.round(Math.min(300, W * 0.62)), circ = add('bf-dc-circle', u.x, u.y); circ.style.width = cw + 'px';
    circ.innerHTML = '<img src="heros/doc-co-cau-bai/doc-co-circle.webp?v=60" alt="">';
    circ.animate([{ opacity: 0, transform: 'translate(-50%,-34%) scale(.35)' }, { opacity: 1, transform: 'translate(-50%,-34%) scale(1)', offset: .25 }, { opacity: 1, transform: 'translate(-50%,-34%) scale(1.04)', offset: .8 }, { opacity: 0, transform: 'translate(-50%,-34%) scale(1.1)' }],
      { duration: seqT(2300) || 1, easing: 'ease-out', fill: 'forwards' });
    for (let i = 0; i < 15; i++) at(i * CFR, () => cast.show(i));

    // 2. Mưa kiếm: nSw thanh kiếm từ trên trời cắm xuống, rải đều khắp đội hình địch (trộn thứ tự để rơi ào ạt, lộn xộn)
    const order = Array.from({ length: nSw }, (_, i) => i).sort(() => Math.random() - 0.5);
    for (let i = 0; i < nSw; i++) {
      const e = es0[order[i] % es0.length];
      const start = T0 + i * STAG;
      at(start, () => {
        const ex = e.x + (Math.random() - 0.5) * 12;                                   // lệch quanh địch (%)
        const ty = e.y / 100 * H + 26 + (Math.random() - 0.5) * 30;                    // mặt đất nơi kiếm cắm (px)
        // vỏ đứng yên, cắt mọi thứ dưới mặt đất -> kiếm chìm xuống đất sẽ bị che dần
        const el = add('bf-dc-sword', ex, 0); el.style.top = ty + 'px'; el.style.width = KW + 'px'; el.style.height = KH + 'px';
        el.style.transform = 'translate(-50%,-100%)'; el.style.clipPath = 'inset(-3000px -150px 0 -150px)';
        const sw = document.createElement('div'); sw.style.cssText = 'position:absolute;inset:0;transform-origin:50% 100%';
        sw.innerHTML = '<img src="heros/doc-co-cau-bai/kiem-tim-den.webp?v=1" alt="" style="width:100%;height:100%;object-fit:contain;display:block">';
        el.appendChild(sw);
        const rise = ty + KH, dur = FLY * (0.85 + Math.random() * 0.3);
        sw.animate([
          { transform: `translateY(${-rise}px) scale(.9)`, opacity: .3 },
          { transform: `translateY(${-rise * 0.5}px) scale(.95)`, opacity: 1, offset: .35 },
          { transform: 'translateY(0) scale(1)', opacity: 1, offset: 1 }
        ], { duration: seqT(dur) || 1, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'forwards' });
        if (i % 6 === 0) sfxSwordFly();
        at(dur, () => {                                                                // chạm đất: cắm xuống, chớp tím
          if (i % 4 === 0) sfxSwordStab();
          const sp = add('bf-bflash', ex, ty / H * 100); sp.style.setProperty('--fc', '#a855f7'); setTimeout(() => sp.remove(), 300);
          // cắm xuyên xuống đất: chìm dần hết thân kiếm rồi biến mất
          sw.animate([
            { transform: 'translateY(0) scale(1)', opacity: 1 },
            { transform: 'translateY(0) scale(1)', opacity: 1, offset: .3 },
            { transform: `translateY(${KH}px) scale(1)`, opacity: 0 }
          ], { duration: seqT(520) || 1, easing: 'ease-in', fill: 'forwards' });
        });
      });
    }
    // 3. Sát thương: mỗi tướng địch CHỈ nhận nHit lần, rải đều theo nhịp cơn mưa; lần đầu giảm Tốc địch
    const lastLand = T0 + (nSw - 1) * STAG + FLY * 1.15;
    for (let j = 0; j < nHit; j++) {
      const idx = Math.round((j + 1) / nHit * (nSw - 1));
      at(T0 + idx * STAG + FLY, () => {
        f.classList.add('screen-shake'); setTimeout(() => f.classList.remove('screen-shake'), 150);
        es0.forEach(e => {
          if (!e.alive) return;
          skillHit(e, per, u);
          const fl = add('bf-bflash', e.x, e.y); fl.style.setProperty('--fc', '#a855f7'); setTimeout(() => fl.remove(), 450);
          if (j === 0 && e.alive) { pctMod(e, 'spd', -DUCO_SLOW, DUCO_BUFF_TURNS, 'debuff', 'duco'); floatText(e, '⚡ TỐC -' + Math.round(DUCO_SLOW * 100) + '%'); }
        });
        refreshPanel();
      });
    }
    await sleep(lastLand + 80); if (tok !== battleToken) return;
    // 4. Cả đội ta tăng Tốc
    allies.filter(a => a.alive).forEach((a, i) => {
      pctMod(a, 'spd', DUCO_HASTE, DUCO_BUFF_TURNS, 'buff', 'duco');
      setTimeout(() => { if (a.el.isConnected) floatText(a, '⚡ TỐC +' + Math.round(DUCO_HASTE * 100) + '%'); }, seqT(i * 140));
      const w = add('bf-wave', a.x, a.y); w.style.borderColor = '#c084fc'; w.style.boxShadow = '0 0 22px #a855f7, inset 0 0 22px #c084fc'; setTimeout(() => w.remove(), 650);
    });
    refreshPanel();
    await sleep(800); if (tok !== battleToken) return;
  } finally {
    timers.forEach(clearTimeout); cast.end();
    made.forEach(d => d.remove());
    u.el.getAnimations().forEach(a => a.cancel());
    u.el.style.zIndex = oldZ;
  }
}

/* === truong-tam-phong === */
/* TRƯƠNG TAM PHONG (id 4): tuyệt kỹ Thái Cực
   (tách từ index.html cũ — script) */

    // Trương Tam Phong: tụ khối cầu Thái Cực -> nhảy lên trời -> ném xuống gây sát thương toàn địch + choáng ngẫu nhiên 1 địch trong 2 hiệp
    // ===== Âm thanh Trương Tam Phong: "đùng" ly vỡ khi chọi xuống =====
    function sfxGlassBreak() {
      const ctx = sfxGet(); if (!ctx) return;
      try {
        const t = ctx.currentTime;
        const out = ctx.createGain(); out.gain.value = 2.2;
        const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 8;
        out.connect(comp); comp.connect(ctx.destination);
        // "đùng": cú đập trầm
        const o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.28);
        const og = ctx.createGain(); og.gain.setValueAtTime(1, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        o.connect(og); og.connect(out); o.start(t); o.stop(t + 0.4);
        // vỡ ly: xoẹt nhiễu cao + nhiều mảnh thủy tinh leng keng rơi lả tả
        const nz = sfxNoise(ctx, 0.35), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3500;
        const ng = ctx.createGain(); ng.gain.setValueAtTime(0.7, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.33);
        nz.connect(hp); hp.connect(ng); ng.connect(out); nz.start(t); nz.stop(t + 0.36);
        for (let i = 0; i < 14; i++) {
          const at = t + 0.01 + Math.random() * 0.45, f = 2200 + Math.random() * 4800;
          const s2 = ctx.createOscillator(); s2.type = 'sine'; s2.frequency.value = f;
          const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, at);
          g.gain.exponentialRampToValueAtTime(0.18 + Math.random() * 0.15, at + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.12 + Math.random() * 0.15);
          s2.connect(g); g.connect(out); s2.start(at); s2.stop(at + 0.3);
        }
      } catch (e) {}
    }
    async function taichiUlt(u, tok) {
      // Đứng TẠI CHỖ tung tuyệt kỹ (không nhảy): chuỗi 16 khung SEQ.ttpCast phủ lên tướng, lốc xoáy SEQ.ttpStorm mở ra bên địch rồi gây sát thương toàn địch + choáng
      const g = nt(u), { f, W, H, made } = g, es0 = g.es(); if (!es0.length) return;
      const b = g.box0(es0), S = SEQ.ttpStorm;
      const SW = Math.round(Math.max(190, Math.min(W * 0.5, H * 0.85)) * 1.4), SH = Math.round(SW * S.ch / S.cw), hw = SW * 0.5 / W * 100, hh = SH * 0.5 / H * 100;
      const cx = Math.max(hw + 1, Math.min(99 - hw, b.cx)), cy = Math.max(hh + 2, Math.min(98 - hh, b.cy - 3));
      const cast = seqOverlay(u, SEQ.ttpCast, 172), timers = [], oldZ = u.el.style.zIndex; let storm = null;
      const at = (ms, fn) => timers.push(setTimeout(() => { if (tok === battleToken) fn(); }, seqT(ms)));
      try {
        u.el.style.zIndex = 99;
        for (let i = 0; i < 16; i++) at(i * 100, () => cast.show(i));          // 16 khung: tụ cầu → tung ra
        at(780, () => {                                                         // cầu Thái Cực đã lớn → lốc xoáy mở ra bên địch
          storm = g.mk('bf-seq-fx', '', cx, cy); storm.style.width = SW + 'px'; storm.style.height = SH + 'px';
          const sc = seqEl(S, SW); sc.loop(1300); storm.appendChild(sc);
          storm.animate([{ transform: 'translate(-50%,-50%) scale(.15,.05)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.08,1.12)', opacity: 1, offset: .65 }, { transform: 'translate(-50%,-50%) scale(1,1)', opacity: 1 }], { duration: 700, easing: 'ease-out', fill: 'forwards' });
        });
        await sleep(1450); if (tok !== battleToken) return;
        // Lốc xoáy giáng xuống: va chạm
        const es = g.es(); if (!es.length) return;
        sfxGlassBreak();
        f.style.transition = 'filter .08s'; f.style.filter = 'contrast(1.35) brightness(1.25)';
        setTimeout(() => { f.style.filter = 'contrast(1.2) brightness(.8)'; }, 90);
        setTimeout(() => { f.style.filter = ''; }, 380);
        f.classList.add('screen-shake'); setTimeout(() => f.classList.remove('screen-shake'), 400);
        // ★5: choáng 1 địch ngẫu nhiên 2 hiệp, không chảy máu • ★6: choáng 2 địch ngẫu nhiên 2 hiệp + chảy máu 40%
        // THỨ TỰ: hiệu ứng GIẢM (chảy máu ★6) TRƯỚC khi ulti -> sát thương -> KHỐNG CHẾ (choáng) ngay sau khi ulti xong
        const six = (u.side === 'hero' ? getProg(4).star : (u.star || 0)) >= STAR_MAX;
        if (six) es.forEach(e => {
          e.bleed = Math.max(e.bleed || 0, TAICHI_BLEED_TURNS); e.bleedPct = Math.max(e.bleedPct || 0, TAICHI_BLEED_PCT);
          if (!e.el.querySelector('.bf-bleed')) { const ic = document.createElement('div'); ic.className = 'bf-bleed'; ic.textContent = '🩸'; e.el.appendChild(ic); }
          floatText(e, 'CHẢY MÁU ' + Math.round(TAICHI_BLEED_PCT * 100) + '%');
        });
        { const nT = Math.max(1, Math.floor(TAICHI_HITS)), perT = u.atk * TAICHI_MULT * (u.sk || 1) / nT;   // TAICHI_HITS lần sát thương, tổng % Công giữ nguyên
          for (let k = 0; k < nT; k++) { g.es().forEach(e => skillHit(e, perT, u)); if (k < nT - 1) { await sleep(260); if (tok !== battleToken) return; } } }
        dropDeadEffects(es);
        const left = g.es();
        shuffled(left).slice(0, six ? 2 : 1).forEach(v => { stunEnemy(v, Math.max(2, v.stun || 0)); floatText(v, 'CHOÁNG 2 HIỆP'); });
        await sleep(900); if (tok !== battleToken) return;
        if (storm) storm.animate([{ opacity: 1, transform: 'translate(-50%,-50%) scale(1,1)' }, { opacity: 0, transform: 'translate(-50%,-50%) scale(.6,1.25)' }], { duration: 480, fill: 'forwards' });
        await sleep(500);
      } finally {
        timers.forEach(clearTimeout); cast.end(); u.el.style.zIndex = oldZ; made.forEach(d => d.remove());
      }
    }

/* === au-co === */
/* ÂU CƠ (id 5): tuyệt kỹ hoa sen
   Ảnh hiệu ứng (nền trong suốt) nằm trong heros/au-co/:
     • hoa-no-sheet.webp    — 1 ảnh ghép 5×4 = 20 khung HOA SEN NỞ (búp → nở rộ) hiện TRÊN ĐẦU Âu Cơ khi ulti
     • canh-hoa-sheet.webp  — 1 ảnh ghép 5×4 = 20 khung CÁNH HOA BAY ĐẦY TRỜI phủ cả sân khi ulti
     • bup-sen.webp         — BÚP SEN dùng làm icon khi đồng đội được hồi máu (heal() ở ultimate.js) và viên bay tới đồng đội */

    const AC_DIR = 'heros/au-co/', AC_V = '?v=3', AC_N = 20, AC_COLS = 5, AC_ROWS = 4;   // AC_COLS × AC_ROWS = AC_N khung trong mỗi ảnh ghép
    // Kích thước ảnh: mỗi khung = ô gốc + LỀ trong suốt (để các chi tiết vắt qua ranh giới ô không bị cắt vuông). cw/ch = ô gốc, W/H = cả khung ảnh.
    const AC_LOTUS = { cw: 307, ch: 256, W: 367, H: 316 }, AC_PETAL = { cw: 334, ch: 235, W: 430, H: 331 };
    const acImgCache = {};
    function acPreload() {   // tải sẵn 2 ảnh ghép (mỗi ảnh chứa đủ 20 khung) + búp sen để lần ulti đầu không bị chớp
      try {
        ['hoa-no', 'canh-hoa'].forEach(p => { if (!acImgCache[p]) { const im = new Image(); im.decoding = 'async'; im.src = AC_DIR + p + '-sheet.webp' + AC_V; acImgCache[p] = im; } });
        if (!acImgCache.bup) { const im = new Image(); im.src = AC_DIR + 'bup-sen.webp' + AC_V; acImgCache.bup = im; }
      } catch (e) {}
    }
    GP.onStart(() => setTimeout(acPreload, 4000));
    // Chuỗi khung từ 1 ảnh ghép (sprite sheet 5 cột × 4 hàng): el.show(i) dịch background-position sang khung i. el phải đúng tỉ lệ 1 khung.
    function acFrames(prefix, css) {
      const el = document.createElement('div');
      el.style.cssText = 'position:absolute;pointer-events:none;background-repeat:no-repeat;background-size:' + AC_COLS * 100 + '% ' + AC_ROWS * 100 + '%;background-image:url(' + AC_DIR + prefix + '-sheet.webp' + AC_V + ');' + css;
      el.show = i => { const c = i % AC_COLS, r = (i / AC_COLS) | 0; el.style.backgroundPosition = (c / (AC_COLS - 1) * 100) + '% ' + (r / (AC_ROWS - 1) * 100) + '%'; };
      el.show(0);
      return el;
    }
    const acBupImg = (w, extra) => { const o = document.createElement('img'); o.src = AC_DIR + 'bup-sen.webp' + AC_V; o.alt = ''; o.draggable = false; o.style.cssText = 'width:' + w + 'px;height:auto;pointer-events:none;filter:drop-shadow(0 0 6px #f0abfc);' + (extra || ''); return o; };

    // Âu Cơ: hoa sen nở trên đầu (chuỗi hoa-no) + cánh hoa bay đầy trời (chuỗi canh-hoa), rồi búp sen bay tới từng đồng đội và hồi máu = 150% × (công + thủ) của bản thân
    async function lotusUlt(u, tok) {
      const f = document.getElementById('battle-arena'), box = document.getElementById('bf-units');
      const W = f.clientWidth, H = f.clientHeight;
      const base = 'translate(-50%,-50%)', made = [], timers = [];
      const amount = Math.round(HEAL_MULT * (u.sk || 1) * (u.atk + u.def));
      const ly = Math.max(16, u.y - 16);                       // vị trí hoa sen (nhô lên trên đầu tướng)
      acPreload();
      const LW = Math.round(Math.max(190, Math.min(W * 0.46, 300))), ls = LW / AC_LOTUS.cw;       // LW = bề rộng của bông hoa (ô gốc); ls = tỉ lệ phóng
      const lotus = acFrames('hoa-no', 'left:' + u.x + '%;top:' + ly + '%;width:' + Math.round(AC_LOTUS.W * ls) + 'px;height:' + Math.round(AC_LOTUS.H * ls) + 'px;transform:' + base + ';z-index:30');
      const ps = Math.max(W / AC_PETAL.cw, H / AC_PETAL.ch);                                   // cánh hoa: phủ kín sân (ô gốc phủ vừa đủ, phần lề trong suốt tràn ra ngoài)
      const petals = acFrames('canh-hoa', 'left:50%;top:50%;width:' + Math.round(AC_PETAL.W * ps) + 'px;height:' + Math.round(AC_PETAL.H * ps) + 'px;transform:' + base + ';z-index:40;opacity:0');
      lotus.show(0); box.appendChild(lotus); box.appendChild(petals);
      try {
        u.el.animate([{ transform: base }, { transform: 'translate(-50%,calc(-50% - 14px))' }, { transform: base }], { duration: 700 });
        lotus.animate([{ opacity: 0, transform: base + ' scale(.6)' }, { opacity: 1, transform: base + ' scale(1)' }], { duration: 300, easing: 'ease-out', fill: 'forwards' });
        for (let i = 0; i < AC_N; i++) timers.push(setTimeout(() => { if (tok === battleToken) lotus.show(i); }, seqT(i * 75)));          // hoa nở: 20 khung × 75ms
        timers.push(setTimeout(() => {                                                                                                 // khi hoa gần nở rộ: cánh hoa bay đầy trời
          if (tok !== battleToken) return;
          petals.style.transition = 'opacity .25s'; petals.style.opacity = '1';
          for (let i = 0; i < AC_N; i++) timers.push(setTimeout(() => { if (tok === battleToken) petals.show(i); }, seqT(i * 90)));    // 20 khung × 90ms
          timers.push(setTimeout(() => { petals.style.opacity = '0'; }, seqT(AC_N * 90 - 250)));
        }, seqT(600)));
        await sleep(AC_N * 75); if (tok !== battleToken) return;   // hoa đã nở rộ
        // Hoa nở xong: búp sen bay về từng đồng đội rồi hồi máu
        lotus.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
        const allies = alliesOf(u).filter(h => h.alive);
        allies.forEach((h, i) => {
          const o = acBupImg(36, 'position:absolute;z-index:45;left:' + u.x + '%;top:' + ly + '%;'); box.appendChild(o); made.push(o);
          o.animate([{ transform: base + ' scale(1.3)', opacity: 1 }, { transform: 'translate(calc(-50% + ' + ((h.x - u.x) * W / 100) + 'px),calc(-50% + ' + ((h.y - ly) * H / 100) + 'px)) scale(.9)', opacity: 1 }], { duration: 480, delay: i * 50, easing: 'ease-in', fill: 'forwards' });
        });
        await sleep(480 + allies.length * 50); if (tok !== battleToken) return;
        made.forEach(d => d.remove());
        allies.forEach(h => { if (h.alive) heal(h, amount); });
        await sleep(450);                                           // chờ cánh hoa bay nốt
      } finally {
        timers.forEach(clearTimeout); lotus.remove(); petals.remove(); made.forEach(d => d.remove());
        u.el.getAnimations().forEach(a => a.cancel());
      }
    }

/* === hoa-man-lau === */
/* HOA MÃN LÂU (id 6): tuyệt kỹ bướm (dùng ảnh chuỗi khung, không còn emoji)
   (tách từ index.html cũ — script) */

    // Pháo xẹt: tiếng gió rít tăng dần + tiếng huýt cao dần, vút lên rồi tắt
    function sfxRocket() {
      const ctx = sfxGet(); if (!ctx) return;
      try {
        const t = ctx.currentTime, D = 0.65;
        const out = ctx.createGain(); out.gain.setValueAtTime(0.0001, t);
        out.gain.exponentialRampToValueAtTime(0.5, t + 0.05); out.gain.exponentialRampToValueAtTime(0.0001, t + D); out.connect(ctx.destination);
        const nz = sfxNoise(ctx, D), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3;
        bp.frequency.setValueAtTime(700, t); bp.frequency.exponentialRampToValueAtTime(6000, t + D);
        nz.connect(bp); bp.connect(out); nz.start(t); nz.stop(t + D);
        const o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(600, t); o.frequency.exponentialRampToValueAtTime(3000, t + D);
        const og = ctx.createGain(); og.gain.value = 0.25; o.connect(og); og.connect(out); o.start(t); o.stop(t + D);
      } catch (e) {}
    }
    // Chuông chùa: tiếng gõ trầm + các hài âm lệch (inharmonic) ngân dài, tắt dần
    function sfxBell() {
      const ctx = sfxGet(); if (!ctx) return;
      try {
        const t = ctx.currentTime, f0 = 240;
        const out = ctx.createGain(); out.gain.value = 0.55; out.connect(ctx.destination);
        [[1, 1, 3.2], [2.0, 0.55, 2.4], [2.76, 0.4, 1.8], [5.4, 0.22, 1.0], [8.93, 0.12, 0.6]].forEach(([r, a, dec]) => {
          const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f0 * r;
          const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(a * 0.5, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
          o.connect(g); g.connect(out); o.start(t); o.stop(t + dec + 0.05);
        });
        const nz = sfxNoise(ctx, 0.05), ng = ctx.createGain(); ng.gain.setValueAtTime(0.25, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
        nz.connect(lp); lp.connect(ng); ng.connect(out); nz.start(t); nz.stop(t + 0.06);
      } catch (e) {}
    }
    // Hoa Mãn Lâu: đứng TẠI CHỖ tung tuyệt kỹ (SEQ.hmlCast). 3 chuỗi bướm màu ngẫu nhiên (trong 7 màu, mỗi chuỗi 16 khung) lần lượt RƠI THẲNG ĐỨNG từ mép trên màn hình
    // xuống đội địch (nhỏ -> to dần); phát hết các khung rơi, chạm đất mới bung tia nhiều hướng (khung 12-15)
    // + sát thương TOÀN địch. THỨ TỰ: (1) +Công toàn đội (cộng thêm) -> (2) hiệu ứng GIẢM theo màu lên toàn địch -> (3) ulti (bướm nổ) -> (4) KHỐNG CHẾ (choáng/câm lặng) ngay sau khi ulti xong
    const BFLY_SEQ = { red: 'hmlRed', orange: 'hmlOrange', yellow: 'hmlYellow', green: 'hmlGreen', blue: 'hmlBlue', indigo: 'hmlIndigo', purple: 'hmlPurple' };
    async function butterflyUlt(u, tok) {
      const f = document.getElementById('battle-arena'), box = document.getElementById('bf-units');
      const W = f.clientWidth, H = f.clientHeight;
      const alive = () => foesOf(u).filter(e => e.alive);
      const es0 = alive(); if (!es0.length) return;
      let dmg = 0;                                           // chốt SAU khi cộng Công (hiệu ứng cộng thêm áp trước khi ulti)
      const made = [], timers = [], oldZ = u.el.style.zIndex;
      const at = (ms, fn) => timers.push(setTimeout(() => { if (tok === battleToken) fn(); }, seqT(ms)));
      // khung tung chiêu phủ lên tướng: cùng tỉ lệ & điểm neo với dáng đứng (SEQ_IDLE[6]) nên thân không xê dịch
      const CAST_W = Math.round(SEQ.hmlCast.cw * SEQ_IDLE[6].h / SEQ.hmlIdle.ch), CAST_FR = 75;
      const cast = seqOverlay(u, SEQ.hmlCast, CAST_W);
      const FR = 50, FALL = 8, DIVE = 12, BFR = 70, GAP = 420;   // khung 0-7 = rơi chéo (bay tới đích) • khung 8-11 = chạm đất, đứng yên tại đích • khung 12-15 = bung tia; GAP = ms giữa 2 con
      const FW = Math.round(Math.max(260, Math.min(W * 0.66, 470))), FH = Math.round(FW * 256 / 384);
      const fromY = 4;                                        // % chiều cao sân: điểm xuất phát sát mép trên màn hình
      const strike = async (c, i) => {
        await sleep(i * GAP); if (tok !== battleToken) return;
        const es1 = alive(); if (!es1.length) return;
        const tx = es1.reduce((a, e) => a + e.x, 0) / es1.length + (i - 1) * 4, ty = es1.reduce((a, e) => a + e.y, 0) / es1.length + (i - 1) * 2;
        const sx = 0, sy = (fromY - ty) * H / 100;                              // rơi THẲNG ĐỨNG: xuất phát ngay phía trên đích, sát mép trên màn hình (px)
        const ang = 0;                                                        // không nghiêng
        const el = document.createElement('div'); el.className = 'bf-seq-fx';
        el.style.left = tx + '%'; el.style.top = `calc(${ty}% + 10px)`; el.style.width = FW + 'px'; el.style.height = FH + 'px';
        const sc = seqEl(SEQ[BFLY_SEQ[c.k]], FW); el.appendChild(sc); box.appendChild(el); made.push(el);
        el.animate([
          { transform: `translate(calc(-50% + ${sx}px),calc(-50% + ${sy}px)) scale(.28) rotate(${ang}deg)`, opacity: 0 },
          { transform: `translate(calc(-50% + ${sx * 0.88}px),calc(-50% + ${sy * 0.88}px)) scale(.34) rotate(${ang}deg)`, opacity: 1, offset: 0.06 },
          { transform: `translate(calc(-50% + ${sx * 0.35}px),calc(-50% + ${sy * 0.35}px)) scale(.7) rotate(${ang * 0.55}deg)`, opacity: 1, offset: 0.65 },
          { transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 1 }
        ], { duration: battleFast ? 1 : FALL * FR, easing: 'ease-in', fill: 'both' });   // bay tới đích đúng lúc hết khung 7; khung 8-11 phát tại chỗ
        for (let k = 0; k < DIVE; k++) at(k * FR, () => sc.show(k));          // khung 0-7 rơi, 8-11 chạm đất
        await sleep(DIVE * FR); if (tok !== battleToken) return;

        // Sau khi chạm đất (khung 8-11): BUNG TIA nhiều hướng (khung 12-15) + chuông + chớp sáng + sóng + sát thương toàn địch + hiệu ứng theo màu
        for (let k = 0; k < 4; k++) at(k * BFR, () => sc.show(DIVE + k));
        at(4 * BFR + 80, () => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' }));
        sfxBell();
        const col = c.css;
        const fx = document.createElement('div'); fx.className = 'bf-bflash'; fx.style.left = tx + '%'; fx.style.top = ty + '%'; fx.style.setProperty('--fc', col);
        box.appendChild(fx); made.push(fx); setTimeout(() => fx.remove(), 400);
        fx.animate([{ transform: 'translate(-50%,-50%) scale(.5)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(8)', opacity: 0 }], { duration: 350, easing: 'ease-out', fill: 'forwards' });
        const es = alive(); if (!es.length) return;
        es.forEach(e => {
          skillHit(e, dmg, u);
          const w = document.createElement('div'); w.className = 'bf-wave'; w.style.left = e.x + '%'; w.style.top = e.y + '%';
          w.style.borderColor = col; w.style.boxShadow = `0 0 20px ${col}, inset 0 0 20px ${col}`;
          box.appendChild(w); setTimeout(() => w.remove(), 650);
        });
        // (hiệu ứng giảm đã áp trước khi ulti, khống chế áp sau khi ulti xong — xem butterflyUlt)
        f.classList.add('screen-shake'); setTimeout(() => f.classList.remove('screen-shake'), 200);
        await sleep(4 * BFR + 200);
      };
      try {
        u.el.style.zIndex = 95;
        // 0. Chốt 3 màu bướm khác nhau trong 7 màu
        const picks = BFLY_COLORS.slice().sort(() => Math.random() - 0.5).slice(0, BFLY_HITS);
        // 1. TRƯỚC KHI ULTI — (a) hiệu ứng CỘNG THÊM: +Công toàn đội (không cộng dồn)
        alliesOf(u).filter(h => h.alive).forEach(h => {
          if (noBuff(h)) { floatText(h, '🚫 KHÓA TĂNG PHÚC'); return; }
          if (!h.atkBuff) {
            h.atkBuff = Math.round(h.atk * BFLY_ATK_BUFF);
            h.atk += h.atkBuff;
            const ic = document.createElement('div'); ic.className = 'bf-atkup'; ic.textContent = '⚔️'; h.el.appendChild(ic);
          }
          floatText(h, 'CÔNG +' + Math.round(BFLY_ATK_BUFF * 100) + '%');
        });
        dmg = u.atk * BFLY_MULT * (u.sk || 1) / BFLY_HITS;                // sát thương tính trên Công đã cộng
        //                  (b) hiệu ứng GIẢM theo màu bướm lên toàn địch (chảy máu, giảm sát thương/Thủ/hồi máu/nộ, độc)
        picks.forEach(c => bflyEffect(c, es0, 'debuff'));
        refreshPanel();
        // 2. Đứng yên tung chiêu (16 khung)
        for (let i = 0; i < 16; i++) at(i * CAST_FR, () => cast.show(i));
        at(16 * CAST_FR, () => cast.end());
        sfxRocket();
        await sleep(400); if (tok !== battleToken) return;

        // 3. 3 màu lần lượt rơi thẳng đứng từ mép trên màn hình xuống đội địch (ulti: chỉ gây sát thương)
        await Promise.all(picks.map((c, i) => strike(c, i)));
        if (tok !== battleToken) return;
        cast.end();
        dropDeadEffects(es0);

        // 4. NGAY SAU KHI ULTI XONG: hiệu ứng KHỐNG CHẾ — Chàm choáng, Tím câm lặng
        picks.forEach(c => bflyEffect(c, alive(), 'cc'));
        refreshPanel();
        await sleep(225);
      } finally {
        timers.forEach(clearTimeout); cast.end();
        made.forEach(d => d.remove());
        u.el.style.zIndex = oldZ;
      }
    }

/* === pham-dao === */
/* PHẠM DAO (id 7): tuyệt kỹ kiếm huyết — thay thế Kiều Phong
   Gồm: (1) đứng yên cố định, hòa ảnh mượt không lặp  (2) ulti dịch chuyển + kiếm xoay 5 vòng
   Tên file ảnh: pham-dao.webp, pham-dao-body.webp, pham-dao-idle.webp, pham-dao-ult.webp, pham-dao-sword.webp, 07-pham-dao.mp3 */

// ===== Đường dẫn ảnh: tự lấy theo vị trí file JS này =====
const PD_BASE = new URL('heros/pham-dao/', document.baseURI).href;   // (gộp file nên không còn dùng document.currentScript)
(function () {
  const r = document.documentElement.style;
  r.setProperty('--pd-idle',  `url(${PD_BASE}pham-dao-idle.webp)`);
  r.setProperty('--pd-ult',   `url(${PD_BASE}pham-dao-ult.webp)`);
  r.setProperty('--pd-sword', `url(${PD_BASE}pham-dao-sword.webp)`);
  GP.add(['pham-dao-idle.webp', 'pham-dao-ult.webp', 'pham-dao-sword.webp'].map(n => PD_BASE + n), 2);   // nạp ngầm
})();

// ===== Thông số chỉnh nhanh =====
var PD_HP_PCT = 0.30;      // trừ 30% HP HIỆN TẠI của mỗi địch, 1 lần duy nhất (không cộng dồn qua các hiệp)
const PD_HP_TURNS = 2;       // dấu giảm HP kéo dài 2 hiệp; hết hạn mà không bị ulti lại thì được cộng lại 30% HP hiện tại (engine.js tickBleed)
const PD_ATK_BUFF = 0.50;    // +50% công sau ulti
const PD_BUFF_TURNS = 1;     // kéo dài 1 hiệp
const PD_SPINS = 5;          // số vòng xoay kiếm
const PD_SPIN_MS = 1100;     // thời gian xoay (ms) — càng nhỏ càng nhanh
const PD_GHOSTS = 12;        // số lớp tàn ảnh
const PD_SWORD_RATIO = 189 / 774;   // tỉ lệ cao/dài ảnh kiếm
const PD_SWORD_PIVOT = 10.1 / 774;  // vị trí chóp cán kiếm tính từ mép trái ảnh (tỉ lệ)

// ===== 1. ĐỨNG YÊN: tướng cố định 1 chỗ, hòa mượt giữa các khung, bước ngẫu nhiên nên không thấy lặp =====
const PD_IDLE = { cols: 5, rows: 4, n: 20, fps: 9, neigh: [[2, 18, 19], [16, 2, 17], [18, 17, 1], [4, 2, 17], [3, 1, 17], [6, 8, 15], [4, 8, 7], [8, 9, 6], [7, 9, 6], [8, 7, 4], [11, 5, 12], [12, 10, 13], [13, 14, 11], [14, 12, 11], [13, 12, 5], [16, 1, 4], [17, 1, 18], [18, 16, 2], [17, 19, 2], [18, 17, 2]] };
const pdIdleSet = new Set();
let pdIdleRaf = 0, pdIdleLast = 0;

function pdIdlePos(layer, i) {
  const c = i % PD_IDLE.cols, r = (i / PD_IDLE.cols) | 0;
  layer.style.backgroundPosition = `${c / (PD_IDLE.cols - 1) * 100}% ${r / (PD_IDLE.rows - 1) * 100}%`;
}
function pdIdleNext(s) {
  const nb = PD_IDLE.neigh[s.cur], seq = (s.cur + 1) % PD_IDLE.n;
  let pick;
  if (nb.includes(seq) && Math.random() < 0.55) pick = seq;
  else { const pool = nb.filter(j => j !== s.prev); pick = pool[(Math.random() * pool.length) | 0]; }
  return pick;
}
function pdIdleLoop(now) {
  const dt = Math.min(0.1, (now - pdIdleLast) / 1000); pdIdleLast = now;
  pdIdleSet.forEach(s => {
    if (!s.host.isConnected) { pdIdleSet.delete(s); return; }
    s.t += dt * PD_IDLE.fps;
    if (s.t >= 1) { s.t -= 1; s.prev = s.cur; s.cur = s.nxt; s.nxt = pdIdleNext(s); pdIdlePos(s.a, s.cur); pdIdlePos(s.b, s.nxt); }
    s.b.style.opacity = s.t.toFixed(3);   // lớp trên mờ dần hiện ra -> chuyển khung liền mạch, kể cả khung cuối về khung đầu
  });
  pdIdleRaf = pdIdleSet.size ? requestAnimationFrame(pdIdleLoop) : 0;
}
// engine.js -> applyRole() gọi hàm này cho id 7: thay nội dung .bf-sprite bằng chuỗi đứng yên (h = chiều cao hiển thị, px)
function pdMountIdle(u, sp, h) {
  if (!sp || sp._pdIdle) return;
  sp._pdIdle = true; sp.innerHTML = '';
  const box = document.createElement('div'); box.className = 'pd-idle-box';
  box.style.height = h + 'px'; box.style.width = (h * 280 / 264) + 'px';
  const a = document.createElement('div'), b = document.createElement('div'); a.className = b.className = 'pd-idle-l';
  box.append(a, b); sp.appendChild(box);
  const cur = (Math.random() * PD_IDLE.n) | 0, s = { host: box, a, b, cur, prev: -1, nxt: 0, t: Math.random() };
  s.nxt = pdIdleNext(s); pdIdlePos(a, s.cur); pdIdlePos(b, s.nxt); pdIdleSet.add(s);
  if (!pdIdleRaf) { pdIdleLast = performance.now(); pdIdleRaf = requestAnimationFrame(pdIdleLoop); }
}

// ===== 2. ULTI =====
const pdFrame = (d, i) => { d.style.backgroundPosition = `${(i % 5) / 4 * 100}% ${((i / 5) | 0) / 3 * 100}%`; };

async function phamDaoUlt(u, tok) {
  const f = document.getElementById('battle-arena'), box = document.getElementById('bf-units');
  const W = f.clientWidth, H = f.clientHeight;
  const alive = () => foesOf(u).filter(e => e.alive);
  const es0 = alive(); if (!es0.length) return;
  const base = 'translate(-50%,-50%)';
  const cx = es0.reduce((a, e) => a + e.x, 0) / es0.length, cy = es0.reduce((a, e) => a + e.y, 0) / es0.length;   // giữa team địch (%)
  const dx = (cx - u.x) * W / 100, dy = (cy - u.y) * H / 100;
  const land = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
  const made = [], oldZ = u.el.style.zIndex, quick = !!u.qRepeat, keep = !!u.qKeep;   // quick: đã đứng sẵn giữa địch -> không dịch chuyển lại
  const mk = (cls) => { const d = document.createElement('div'); d.className = cls; box.appendChild(d); made.push(d); return d; };
  const rr = f.getBoundingClientRect();
  const ctr = el => { const r = el.getBoundingClientRect(); return [r.left - rr.left + r.width / 2, r.top - rr.top + r.height / 2]; };
  const [ox, oy] = [u.x * W / 100, u.y * H / 100];
  const [lx, ly] = quick ? ctr(u.el) : [cx * W / 100, cy * H / 100];
  const fxH = Math.max(u.el.offsetHeight * 1.5, 130), fxW = fxH * 256 / 216;
  const fx = mk('pd-fx'); fx.style.width = fxW + 'px'; fx.style.height = fxH + 'px';
  const put = (x, y, rot = 0) => { fx.style.left = x + 'px'; fx.style.top = y + 'px'; fx.style.transform = `translate(-50%,-50%) rotate(${rot}deg)`; };
  const play = async (a, b, fps) => { const st = a <= b ? 1 : -1; for (let i = a; st > 0 ? i <= b : i >= b; i += st) { if (tok !== battleToken) return false; pdFrame(fx, i); await sleep(1000 / fps); } return true; };
  try {
    u.el.style.zIndex = 99;
    if (!quick) {
      // 1. Tan biến thành xoáy đỏ tại chỗ (khung 1-5)
      put(ox, oy); pdFrame(fx, 0); u.el.style.visibility = 'hidden';
      if (!await play(0, 4, 13)) return;
      // 2. Vệt đỏ lao tới giữa team địch (khung 7-9)
      const ang = Math.atan2(ly - oy, lx - ox) * 180 / Math.PI, T = 360, t0 = performance.now();
      await new Promise(res => {
        const step = now => {
          if (tok !== battleToken) return res();
          const k = Math.min(1, (now - t0) / T), e = k * k * (3 - 2 * k);
          pdFrame(fx, 6 + Math.min(2, (k * 3) | 0)); put(ox + (lx - ox) * e, oy + (ly - oy) * e, ang);
          k >= 1 ? res() : requestAnimationFrame(step);
        }; requestAnimationFrame(step);
      });
      if (tok !== battleToken) return;
      // 3. Hiện thân giữa team địch (khung 10-20)
      u.el.animate([{ transform: land }, { transform: land }], { duration: 1, fill: 'forwards' });
      put(lx, ly, 0);
      if (!await play(9, 19, 12)) return;
      u.el.style.visibility = 'visible';
      fx.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' });
      await sleep(120);
    }
    // 4. Kiếm xoay quanh chóp cán kiếm, 5 vòng cực nhanh, tàn ảnh dài
    const R = Math.max(150, Math.min(Math.min(W, H) * 0.72, Math.max(...es0.map(e => Math.hypot(e.x * W / 100 - lx, e.y * H / 100 - ly))) + 60));
    const sw = R, sh = R * PD_SWORD_RATIO, pv = R * PD_SWORD_PIVOT;
    const trail = mk('pd-trail'); trail.style.cssText += `;left:${lx}px;top:${ly}px;width:${R * 2}px;height:${R * 2}px`;
    // 6 thanh kiếm chia 6 hướng (cách nhau 60°), cùng xoay; mỗi thanh có chuỗi tàn ảnh riêng
    const PD_BLADES = 6, PD_BLADE_GHOSTS = 8;
    const pivots = [];   // pivots[k][i]: thanh k, lớp i (0 = kiếm thật)
    for (let k = 0; k < PD_BLADES; k++) {
      const row = [];
      for (let i = 0; i <= PD_BLADE_GHOSTS; i++) {
        const p = mk('pd-pivot'); p.style.left = lx + 'px'; p.style.top = ly + 'px';
        const s = document.createElement('div'); s.className = 'pd-sword';
        s.style.cssText = `left:${-pv}px;top:${-sh / 2}px;width:${sw}px;height:${sh}px;opacity:${i === 0 ? 1 : (0.55 * Math.pow(1 - i / (PD_BLADE_GHOSTS + 1), 1.3)).toFixed(3)}`;
        if (i > 0) s.style.filter = 'drop-shadow(0 0 6px #ef4444)';
        p.appendChild(s); row.push(p);
      }
      pivots.push(row);
    }
    const total = PD_SPINS * 360, t1 = performance.now();
    await new Promise(res => {
      const step = now => {
        if (tok !== battleToken) return res();
        const k = Math.min(1, (now - t1) / PD_SPIN_MS), e = k * k * (3 - 2 * k), th = total * e;
        const vel = total * 6 * k * (1 - k) / (PD_SPIN_MS / 1000);          // độ/giây
        const lag = Math.max(2.5, vel * 0.0048);                              // tàn ảnh dài hơn khi xoay nhanh
        const span = Math.min(50, lag * PD_BLADE_GHOSTS);                     // mỗi vệt không chồng sang thanh bên cạnh
        const grads = [];
        for (let b = 0; b < PD_BLADES; b++) {
          const base = th + b * (360 / PD_BLADES);
          pivots[b].forEach((p, i) => { p.style.transform = `rotate(${base - i * lag}deg)`; });
          grads.push(`conic-gradient(from ${90 + base - span}deg at 50% 50%, rgba(239,68,68,0) 0deg, rgba(220,38,38,.5) ${span * 0.85}deg, rgba(254,202,202,.75) ${span}deg, transparent ${span + 0.4}deg)`);
        }
        trail.style.background = grads.join(',');
        k >= 1 ? res() : requestAnimationFrame(step);
      }; requestAnimationFrame(step);
    });
    if (tok !== battleToken) return;
    // 5. Mỗi địch mất 30% HP HIỆN TẠI (VD 100 -> 70; ulti lại khi đang 70 -> 49). Chỉ trừ 1 lần, các hiệp sau không trừ tiếp.
    //    Dấu giảm HP kéo dài PD_HP_TURNS hiệp; ulti lại trong lúc đó thì làm mới dấu và hủy lượt cộng lại.
    alive().forEach(e => {
      hit(e, Math.max(1, Math.round(e.hp * PD_HP_PCT)), true, u); floatText(e, 'GIẢM ' + Math.round(PD_HP_PCT * 100) + '% HP');
      if (e.alive) {
        e.pdDot = PD_HP_TURNS; e.pdRet = 0; e.pdPct = PD_HP_PCT;
        if (!e.el.querySelector('.pd-mark')) { const m = document.createElement('div'); m.className = 'pd-mark'; e.el.appendChild(m); }
      }
    });
    {   // DRAGON_TIERS lần sát thương lên toàn địch, tổng DRAGON_MULT × Công; hiệu ứng giảm máu ở trên tính trước
      const nP = Math.max(1, Math.floor(DRAGON_TIERS)), perP = u.atk * DRAGON_MULT * (u.sk || 1) / nP;
      for (let k = 0; k < nP; k++) { alive().forEach(e => skillHit(e, perP, u)); if (k < nP - 1) { await sleep(170); if (tok !== battleToken) return; } }
    }
    const w = document.createElement('div'); w.className = 'bf-wave'; w.style.left = lx + 'px'; w.style.top = ly + 'px';
    w.style.borderColor = '#ef4444'; w.style.boxShadow = '0 0 26px #b91c1c, inset 0 0 26px #ef4444';
    box.appendChild(w); setTimeout(() => w.remove(), 650);
    f.classList.add('screen-shake'); setTimeout(() => f.classList.remove('screen-shake'), 280);
    dropDeadEffects(es0);
    made.filter(d => d !== fx).forEach(d => d.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' }));
    await sleep(keep ? 100 : 300); if (tok !== battleToken) return;
    // 6. Tăng công bản thân +50% trong 1 hiệp (addMod của engine tự hết hạn và trả lại đúng số đã cộng)
    { const old = (u.mods || []).find(m => m.k === 'atk' && m.tag === 'pham-dao'); addMod(u, 'atk', old ? old.d : Math.round(u.atk * PD_ATK_BUFF), PD_BUFF_TURNS, 'buff', 'pham-dao'); floatText(u, 'CÔNG +50%'); }
    if (!keep) {
      // 7. Về lại chỗ cũ: tan ở giữa địch, hiện lại ở vị trí đầu
      fx.style.opacity = 1; fx.getAnimations().forEach(a => a.cancel()); fx.style.width = fxW + 'px';
      put(lx, ly, 0); u.el.style.visibility = 'hidden';
      if (!await play(1, 4, 14)) return;
      u.el.getAnimations().forEach(a => a.cancel()); put(ox, oy, 0);
      if (!await play(15, 19, 14)) return;
      u.el.style.visibility = 'visible';
      await sleep(60);
    }
  } finally {
    made.forEach(d => d.remove());
    u.el.style.visibility = 'visible';
    if (!keep) { u.el.getAnimations().forEach(a => a.cancel()); u.el.style.zIndex = oldZ; }
  }
}
var dragonUlt = phamDaoUlt;   // giữ tên cũ để index.html gọi dragonUlt() vẫn chạy; nên đổi sang phamDaoUlt()

/* === thuy-long (trước là lac-long-quan) === */
/* THỦY LONG (id 8): tuyệt kỹ mưa bong bóng
   (tách từ index.html cũ — script) */

    // THỨ TỰ ƯU TIÊN BỊ ĐÁNH (đánh thường + tuyệt kỹ đánh ĐƠN mục tiêu không có cơ chế ngẫu nhiên):
    //   hộ vệ (Thủ) → Trị liệu → Hỗ trợ → Công kích → Kỹ năng. Còn sống ở bậc cao nhất thì chỉ đánh bậc đó (ngẫu nhiên 1 địch trong bậc);
    //   bậc đó chết hết mới sang bậc kế. Đơn vị không có chất tướng (lính...) xếp ngang Công kích.
    //   Tuyệt kỹ có cơ chế ngẫu nhiên (VD Độc Cô chọn kiếm cắm ngẫu nhiên) KHÔNG dùng hàm này, giữ ngẫu nhiên hoàn toàn.
    const TARGET_ROLE_RANK = { heal: 1, sup: 2, atk: 3, skill: 4 };
    function targetRank(x) {
      if (x.taunt) return 0;
      const r = (typeof x.id === 'number') ? HERO_ROLE[x.id] : null;
      if (r && TARGET_ROLE_RANK[r]) return TARGET_ROLE_RANK[r];
      return x.prio2 ? TARGET_ROLE_RANK.sup : TARGET_ROLE_RANK.atk;
    }
    function pickTarget(foes) {
      const a = foes.filter(x => x.alive); if (!a.length) return null;
      const best = Math.min(...a.map(targetRank));
      return rand(a.filter(x => targetRank(x) === best));
    }

    // THỦY LONG (id 8): biến lớn -> mưa TL_BUBBLES bong bóng rơi dồn dập xuống phe địch -> TOÀN địch chịu TL_HITS lần sát thương
    //   (tổng TL_MULT × Công) -> cả đội ta +TL_RAGE nộ. (Đã bỏ buff Thủ.) Tên hàm giữ nguyên waterUlt để dữ liệu tướng gọi được.
    async function waterUlt(u, tok) {
      const f = document.getElementById('battle-arena'), box = document.getElementById('bf-units');
      const W = f.clientWidth, H = f.clientHeight, made = [];
      const es0 = foesOf(u).filter(e => e.alive); if (!es0.length) return;
      const allies = alliesOf(u).filter(h => h.alive);
      const nB = Math.max(1, Math.floor(TL_BUBBLES)), nHit = Math.max(1, Math.floor(TL_HITS));
      const per = u.atk * TL_MULT * (u.sk || 1) / nHit;                           // tổng TL_MULT × Công chia đều cho các lần
      const wait = ms => new Promise(r => setTimeout(r, battleFast ? 0 : ms));
      const ring = (x, y) => {
        const w = document.createElement('div'); w.className = 'bf-wave'; w.style.left = x + '%'; w.style.top = y + '%';
        w.style.borderColor = '#38bdf8'; w.style.boxShadow = '0 0 24px #0ea5e9, inset 0 0 24px #38bdf8';
        box.appendChild(w); setTimeout(() => w.remove(), 650);
      };
      const sp = u.el.querySelector('.bf-sprite'), oldZ = u.el.style.zIndex; let grow = null;
      const SPAN = battleFast ? 300 : 1100, FALL = 520;                           // 36 bóng bắt đầu rơi rải trong SPAN ms, mỗi bóng rơi ~FALL ms (nhanh như mưa)

      // ===== Mưa bong bóng: canvas phủ sân, bóng rơi thẳng xuống địch, chạm thì vỡ tung nước =====
      const bubbleRain = () => new Promise(res => {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const cv = document.createElement('canvas'); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;pointer-events:none;z-index:98';
        f.appendChild(cv); made.push(cv);
        const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
        const bubs = [], pops = [], drops = [];
        for (let k = 0; k < nB; k++) {
          const tg = es0[k % es0.length];                                          // chia đều bóng cho mọi địch
          const lx = tg.x * W / 100 + (Math.random() - .5) * 90, ly = tg.y * H / 100 + (Math.random() - .3) * 40;
          const fall = battleFast ? FALL * 0.5 : FALL * (0.8 + Math.random() * 0.4);
          bubs.push({ lx, ly, y: -40, at: (k / nB) * SPAN + Math.random() * 60, sp: (ly + 60) / (fall / 1000), r: 9 + Math.random() * 12, ph: Math.random() * 6.283, sw: 3 + Math.random() * 6, x: lx, done: false });
        }
        const t0 = performance.now(); let last = t0;
        const frame = now => {
          if (tok !== battleToken) return res();
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          const el = now - t0, time = el / 1000;
          ctx.clearRect(0, 0, W, H);
          let pending = 0;
          for (let n = 0; n < bubs.length; n++) {
            const b = bubs[n]; if (b.done) continue;
            pending++; if (el < b.at) continue;
            const py = b.y; b.y += b.sp * dt; b.x = b.lx + Math.sin(time * 3 + b.ph) * b.sw;
            if (b.y >= b.ly) { b.done = true; pops.push({ x: b.x, y: b.ly, r: b.r, age: 0 }); for (let k = 0; k < 5; k++) drops.push({ x: b.x, y: b.ly, vx: (Math.random() - .5) * 180, vy: -(40 + Math.random() * 140), age: 0, life: 0.42 }); continue; }
            const r = b.r;
            const tr = ctx.createLinearGradient(0, py - r * 3.2, 0, b.y); tr.addColorStop(0, 'rgba(125,211,252,0)'); tr.addColorStop(1, 'rgba(186,230,253,.45)');   // vệt nước phía sau bóng -> cảm giác rơi nhanh
            ctx.fillStyle = tr; ctx.fillRect(b.x - r * .35, py - r * 3.2, r * .7, b.y - py + r * 3.2);
            const g = ctx.createRadialGradient(b.x - r * .3, b.y - r * .3, r * .1, b.x, b.y, r);
            g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.4, 'rgba(186,230,253,.28)'); g.addColorStop(1, 'rgba(56,189,248,.5)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, 6.283); ctx.fill();
            ctx.strokeStyle = 'rgba(224,242,254,.95)'; ctx.lineWidth = 1.4; ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(b.x - r * .35, b.y - r * .38, Math.max(1.2, r * .2), 0, 6.283); ctx.fill();
          }
          for (let n = pops.length - 1; n >= 0; n--) {                            // vòng nước loang khi bóng vỡ
            const p = pops[n]; p.age += dt; const k = p.age / 0.3;
            if (k >= 1) { pops.splice(n, 1); continue; }
            ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#bae6fd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + 1.5 * k), 0, 6.283); ctx.stroke();
          }
          ctx.fillStyle = '#e0f2fe';
          for (let n = drops.length - 1; n >= 0; n--) {                           // giọt nước bắn ra
            const d = drops[n]; d.age += dt;
            if (d.age >= d.life) { drops.splice(n, 1); continue; }
            d.vy += 460 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
            ctx.globalAlpha = 1 - d.age / d.life; ctx.beginPath(); ctx.arc(d.x, d.y, 2.2, 0, 6.283); ctx.fill();
          }
          ctx.globalAlpha = 1;
          if ((!pending && !pops.length && !drops.length) || el > SPAN + FALL * 2 + 2000) return res();
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });

      // ===== TL_HITS đợt sát thương lên TOÀN địch, rải đều theo nhịp cơn mưa =====
      const damage = async () => {
        await wait(FALL * 0.7);
        for (let j = 0; j < nHit; j++) {
          if (tok !== battleToken) return;
          f.classList.add('screen-shake'); setTimeout(() => f.classList.remove('screen-shake'), 130);
          es0.forEach(e => {
            if (!e.alive) return;
            skillHit(e, per, u);
            const fl = document.createElement('div'); fl.className = 'bf-bflash'; fl.style.left = e.x + '%'; fl.style.top = e.y + '%'; fl.style.setProperty('--fc', '#38bdf8');
            box.appendChild(fl); made.push(fl); setTimeout(() => fl.remove(), 450);
          });
          refreshPanel();
          if (j < nHit - 1) await wait(SPAN / nHit);
        }
      };

      try {
        u.el.style.zIndex = 95;
        // 1. Biến lớn (ảnh đứng yên phóng to), sóng nước dưới chân
        if (sp) { sp.style.transformOrigin = '50% 90%'; grow = sp.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.7)' }], { duration: seqT(380) || 1, easing: 'ease-out', fill: 'forwards' }); }
        ring(u.x, u.y);
        await sleep(420); if (tok !== battleToken) return;
        // 2. Mưa bong bóng + sát thương toàn địch
        await Promise.all([bubbleRain(), damage()]); if (tok !== battleToken) return;
        dropDeadEffects(es0);
        // 3. Cả đội ta +nộ
        allies.filter(a => a.alive).forEach((a, i) => {
          if (noBuff(a)) { floatText(a, '🚫 KHÓA TĂNG PHÚC'); return; }
          ring(a.x, a.y);
          if (a.rage != null) gainRage(a, TL_RAGE);
          setTimeout(() => { if (a.el.isConnected) floatText(a, '+' + TL_RAGE + ' NỘ'); }, seqT(i * 120));
        });
        refreshPanel();
        await sleep(500); if (tok !== battleToken) return;
        // 4. Thu nhỏ về như cũ
        if (sp && grow) { grow.cancel(); grow = sp.animate([{ transform: 'scale(1.7)' }, { transform: 'scale(1)' }], { duration: seqT(260) || 1, easing: 'ease-in', fill: 'forwards' }); await sleep(280); }
      } finally {
        made.forEach(d => d.remove());
        if (grow) grow.cancel(); if (sp) sp.style.transformOrigin = '';
        u.el.getAnimations().forEach(x => x.cancel());
        u.el.style.zIndex = oldZ;
      }
    }

/* === dong-phuong-co-nuong === */
/* ĐÔNG PHƯƠNG CÔ NƯƠNG (id 9): tuyệt kỹ phân thân + lốc lửa
   Toàn bộ hình ảnh là chuỗi khung (SEQ.dpIdle / dpCast / dpClone / dpFire trong js/heroes/hero-seq.js).
   Đã xóa mạng lửa 3D bằng canvas và ngọn lửa/đốm lửa trên đầu cũ. */

    // Đứng TẠI CHỖ tung chiêu (SEQ.dpCast, 16 khung) -> PHÂN THÂN (SEQ.dpClone, 18 khung) lao sang đội địch
    // -> phân thân tới nơi, lốc lửa (SEQ.dpFire, 20 khung) bùng lên trên MỖI địch.
    // Thứ tự: KHI BẮT ĐẦU ULTI toàn bộ địch dính hiệu ứng "giảm máu" (đánh dấu 🔥↓) -> các tia gây sát thương
    // (mỗi địch chịu HTT_FLAT + Công bản thân, chuẩn, bỏ qua giáp, mỗi tia 1 lần) -> HẾT LƯỢT ĐÁNH mới trừ HTT_HP_PCT (50%) HP hiện tại.
    // 50% HP là hiệu ứng CỘNG THÊM, không nằm trong sát thương của tia.
    async function fireWebUlt(u, tok) {
      const f = document.getElementById('battle-arena'), box = document.getElementById('bf-units');
      const W = f.clientWidth, H = f.clientHeight, base = 'translate(-50%,-50%)';
      const es0 = foesOf(u).filter(e => e.alive); if (!es0.length) return;
      const avg = (a, k) => a.reduce((s, x) => s + x[k], 0) / a.length;
      const tx = avg(es0, 'x'), ty = avg(es0, 'y');
      const dir = tx >= u.x ? 1 : -1;                                  // ảnh phân thân nhìn sang phải; địch ulti thì lật lại
      const PX = 138 / SEQ.dpIdle.ch;                                  // px mỗi px ảnh: cùng cỡ dáng đứng (h = 138)
      const CAST_FR = 70, CLONE_FR = 62, FIRE_FR = 55, HIT_FRAME = 8;
      const made = [], timers = [], oldZ = u.el.style.zIndex;
      const cast = seqOverlay(u, SEQ.dpCast, Math.round(SEQ.dpCast.cw * PX));
      const at = (ms, fn) => timers.push(setTimeout(() => { if (tok === battleToken) fn(); }, seqT(ms)));
      const add = (cls, x, y) => { const d = document.createElement('div'); d.className = cls; d.style.left = x + '%'; d.style.top = y + '%'; box.appendChild(d); made.push(d); return d; };
      try {
        u.el.style.zIndex = 95;
        // 0. KHI BẮT ĐẦU ULTI: toàn bộ địch dính hiệu ứng giảm máu (chỉ đánh dấu, chưa trừ máu)
        es0.forEach(e => { (e.dn = e.dn || {}).hpcut = 1; refreshDbf(e); floatText(e, '🔥 GIẢM ' + Math.round(HTT_HP_PCT * 100) + '% HP'); pctMod(e, 'def', -HTT_DEF_DOWN, HTT_DEF_TURNS, 'debuff', 'htt'); floatText(e, '🛡️ THỦ -' + Math.round(HTT_DEF_DOWN * 100) + '%'); });   // hiệu ứng GIẢM trước khi sát thương
        // 1. Tung chiêu tại chỗ (16 khung)
        for (let i = 0; i < SEQ.dpCast.n; i++) at(i * CAST_FR, () => cast.show(i));
        at(SEQ.dpCast.n * CAST_FR, () => cast.end());
        await sleep(6 * CAST_FR); if (tok !== battleToken) return;
        // 2. Phân thân lao sang giữa đội địch trong ~11 khung đầu, 7 khung cuối tung đòn tại chỗ
        const CW = Math.round(SEQ.dpClone.cw * PX), CH = Math.round(SEQ.dpClone.ch * PX);
        const clone = add('bf-dp-clone', u.x, u.y);
        clone.style.width = CW + 'px'; clone.style.height = CH + 'px';
        const cs = seqEl(SEQ.dpClone, CW); if (dir < 0) cs.style.transform = 'scaleX(-1)'; clone.appendChild(cs);
        for (let i = 0; i < SEQ.dpClone.n; i++) setTimeout(() => { if (tok === battleToken) cs.show(i); }, seqT(i * CLONE_FR));
        const dx = (tx - u.x) * W / 100 - dir * 20, dy = (ty - u.y) * H / 100;
        clone.animate([{ transform: base + ' scale(.9)', opacity: .2 }, { transform: base + ' scale(1)', opacity: 1, offset: .12 },
          { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(1)`, opacity: 1, offset: .62 },
          { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(1)`, opacity: 1, offset: .92 },
          { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(1)`, opacity: 0 }],
          { duration: SEQ.dpClone.n * CLONE_FR, easing: 'ease-in-out', fill: 'forwards' });
        await sleep(Math.round(SEQ.dpClone.n * CLONE_FR * .55)); if (tok !== battleToken) return;
        // 3. Phân thân tới nơi: lốc lửa bùng lên trên MỖI địch
        const FW = 190, FH = Math.round(FW * SEQ.dpFire.ch / SEQ.dpFire.cw);
        f.classList.add('screen-shake'); setTimeout(() => f.classList.remove('screen-shake'), 400);
        const nH = Math.max(1, Math.floor(HTT_HITS)), perH = u.atk * HTT_MULT * (u.sk || 1) / nH;   // HTT_HITS lần sát thương, tổng HTT_MULT × Công
        const strikes = es0.map(async (e, k) => {
          await sleep(k * 60); if (tok !== battleToken) return;
          const el = add('bf-seq-fx', e.x, e.y); el.style.top = `calc(${e.y}% + 34px)`; el.style.width = FW + 'px'; el.style.height = FH + 'px'; el.style.transform = 'translate(-50%,-80%)';
          const fs = seqEl(SEQ.dpFire, FW); el.appendChild(fs);
          for (let i = 0; i < SEQ.dpFire.n; i++) setTimeout(() => { if (tok === battleToken) fs.show(i); }, seqT(i * FIRE_FR));
          await sleep(HIT_FRAME * FIRE_FR); if (tok !== battleToken) return;
          if (e.alive) {                                             // sát thương chuẩn của các tia (50% HP trừ riêng sau khi hết lượt đánh)
            for (let r = 0; r < nH && e.alive; r++) { skillHit(e, perH, u); if (r < nH - 1) { await sleep(150); if (tok !== battleToken) return; } }
            const w = add('bf-wave', e.x, e.y);
            w.style.borderColor = '#fb923c'; w.style.boxShadow = '0 0 24px #ef4444, inset 0 0 24px #f97316';
            setTimeout(() => w.remove(), 650);
          }
          await sleep((SEQ.dpFire.n - HIT_FRAME) * FIRE_FR); if (tok !== battleToken) return;
          el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' });
        });
        await Promise.all(strikes); if (tok !== battleToken) return;
        // HẾT LƯỢT ĐÁNH: trừ 50% HP hiện tại của mọi địch đang dính hiệu ứng (bỏ qua giáp, không cộng nộ, không bị khiên phản)
        await sleep(200); if (tok !== battleToken) return;
        es0.forEach(e => {
          if (!e.alive || !(e.dn && e.dn.hpcut > 0)) return;
          e.dn.hpcut = 0; refreshDbf(e);
          hit(e, Math.max(1, Math.round(e.hp * HTT_HP_PCT)), true, u, true);
          if (e.alive) floatText(e, '💔 -' + Math.round(HTT_HP_PCT * 100) + '% HP');
        });
        refreshPanel();
        await sleep(300);
      } finally {
        es0.forEach(e => { if (e.dn && e.dn.hpcut) { e.dn.hpcut = 0; try { refreshDbf(e); } catch (x) {} } });   // dọn dấu nếu ulti bị ngắt giữa chừng
        timers.forEach(clearTimeout); cast.end();
        made.forEach(d => d.remove());
        u.el.getAnimations().forEach(a => a.cancel());
        u.el.style.zIndex = oldZ;
      }
    }

/* === tieu-yeu === */
/* TIỂU YÊU (id 10): tuyệt kỹ quả cầu phát nổ */

    // Tiểu Yêu: đứng TẠI CHỖ dang tay tung chiêu (chuỗi SEQ.tyCast, 20 khung) -> trên người MỖI địch còn sống hiện 1 quả cầu năng lượng
    // (chuỗi SEQ.tyOrb, 20 khung) xoáy tụ rồi phát nổ. Đòn trúng ở khung nổ mạnh nhất: mỗi địch mất 50% HP HIỆN TẠI
    // (bỏ qua giáp, khiên, bất tử – chỉ Né mới tránh được). Địch sau đòn còn ≤ 10% HP tối đa -> TẤT SÁT, chết ngay. Bản thân không mất máu.
    async function tieuYeuUlt(u, tok) {
      const box = document.getElementById('bf-units');
      const foes = foesOf(u).filter(e => e.alive);
      if (!foes.length) return;
      const CAST_FR = 75, ORB_FR = 55, HIT_FRAME = 11;                                    // ms mỗi khung; khung nổ bung mạnh nhất
      const made = [], timers = [], oldZ = u.el.style.zIndex;
      const castW = Math.round(124 * SEQ.tyCast.cw / SEQ.tyCast.ch);                     // cùng cỡ với dáng đứng (h = 124)
      const cast = seqOverlay(u, SEQ.tyCast, castW);
      const at = (ms, fn) => timers.push(setTimeout(() => { if (tok === battleToken) fn(); }, seqT(ms)));
      try {
        u.el.style.zIndex = 95;
        // 1. Dang tay tung chiêu (20 khung)
        for (let i = 0; i < SEQ.tyCast.n; i++) at(i * CAST_FR, () => cast.show(i));
        at(SEQ.tyCast.n * CAST_FR, () => cast.end());                                       // xong 20 khung thì trả dáng đứng
        await sleep(600); if (tok !== battleToken) return;
        // 2. Quả cầu xoáy rồi phát nổ trên TOÀN BỘ địch, lần lượt cách nhau ~70ms
        const OW = 250, OH = Math.round(OW * SEQ.tyOrb.ch / SEQ.tyOrb.cw);
        const strikes = foes.map(async (t, k) => {
          await sleep(k * 70); if (tok !== battleToken) return;
          const el = document.createElement('div'); el.className = 'bf-ty-orb';
          el.style.cssText = `left:${t.x}%;top:calc(${t.y}% + 10px);width:${OW}px;height:${OH}px;transform:translate(-50%,-55%)`;   // tâm quả cầu đặt giữa thân địch
          const sc = seqEl(SEQ.tyOrb, OW); el.appendChild(sc); box.appendChild(el); made.push(el);
          for (let i = 0; i < SEQ.tyOrb.n; i++) setTimeout(() => { if (tok === battleToken) sc.show(i); }, seqT(i * ORB_FR));
          await sleep(HIT_FRAME * ORB_FR); if (tok !== battleToken) return;
          if (t.alive) {                                                                    // chỉ NÉ mới tránh được
            if (Math.random() * 100 < dodgeChance(t, u)) floatText(t, 'NÉ');
            else {
              // HIỆU ỨNG trước: giảm SKEL_PCT máu hiện tại trong PD_HP_TURNS hiệp (cùng cơ chế Phạm Dao) → rồi SKEL_HITS lần sát thương, tổng SKEL_MULT × Công
              floatText(t, 'GIẢM ' + Math.round(SKEL_PCT * 100) + '% HP');
              hit(t, Math.max(1, Math.round(t.hp * SKEL_PCT)), true, u, true);
              if (t.alive) { t.pdDot = PD_HP_TURNS; t.pdRet = 0; t.pdPct = SKEL_PCT; if (!t.el.querySelector('.pd-mark')) { const m = document.createElement('div'); m.className = 'pd-mark'; t.el.appendChild(m); } }
              const nS = Math.max(1, Math.floor(SKEL_HITS)), perS = u.atk * SKEL_MULT * (u.sk || 1) / nS;
              for (let r = 0; r < nS && t.alive; r++) { skillHit(t, perS, u); if (r < nS - 1) { await sleep(150); if (tok !== battleToken) return; } }
              if (t.alive && t.hp <= t.max * EXEC_PCT) {                                    // TẤT SÁT: còn ≤10% HP tối đa -> kết liễu
                await sleep(260); if (tok !== battleToken) return;
                if (t.alive) {
                  floatText(t, '☠️ TẤT SÁT');
                  if (t.dn) t.dn.immortal = 0;                                              // kết liễu bỏ qua cả bất tử
                  hit(t, t.hp, true, u, true);
                }
              }
            }
          }
          await sleep((SEQ.tyOrb.n - HIT_FRAME) * ORB_FR); if (tok !== battleToken) return;
          el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
        });
        await Promise.all(strikes); if (tok !== battleToken) return;
        await sleep(250);
      } finally {
        timers.forEach(clearTimeout); cast.end();
        made.forEach(d => d.remove());
        u.el.getAnimations().forEach(x => x.cancel());
        u.el.style.zIndex = oldZ;
      }
    }

/* === vo-nhai-tu === */
/* VÔ NHAI TỬ (id 11): tuyệt kỹ cờ vây
   (tách từ index.html cũ — script) */

    // Vô Nhai Tử: đứng TẠI CHỖ tung tuyệt kỹ (chuỗi SEQ.vntCast) -> 5 cây cờ Thái Cực phóng nhanh xuống đội địch, từng cây (chuỗi SEQ.vntFlag)
    // Sau đó: tướng địch có CÔNG cao nhất choáng VNT_STUN_TOP hiệp, VNT_STUN_OTHERS tướng ngẫu nhiên còn lại choáng VNT_STUN_OTHER hiệp
    // Choáng dùng stunEnemy (engine); buff Công dùng addMod(kind 'buff') -> tự trừ lại Công khi hết VNT_ATK_TURNS hiệp, bị Độc Cô khoá tăng phúc thì không nhận
    function vntStun(e, turns) {
      stunEnemy(e, Math.max(turns, e.stun || 0));
      if (e.stun) floatText(e, '💫 CHOÁNG ' + turns + ' HIỆP');
    }
    function vntAtkBuff(a, pct, turns) {
      if (noBuff(a)) { floatText(a, '🚫 KHÓA TĂNG PHÚC'); return; }
      addMod(a, 'atk', Math.round(a.atk * pct), turns, 'buff', 'vnt');
      floatText(a, 'CÔNG +' + Math.round(pct * 100) + '%');
    }
    async function goUlt(u, tok) {
      const f = document.getElementById('battle-arena'), box = document.getElementById('bf-units');
      const W = f.clientWidth, H = f.clientHeight, base = 'translate(-50%,-50%)', made = [], oldZ = u.el.style.zIndex;
      const foes = foesOf(u).filter(e => e.alive);
      if (!foes.length) return;
      const allies = alliesOf(u).filter(h => h.alive);
      const add = (cls, txt, x, y) => { const d = document.createElement('div'); d.className = cls; if (txt) d.textContent = txt; d.style.left = x + '%'; d.style.top = y + '%'; box.appendChild(d); made.push(d); return d; };
      const cast = seqOverlay(u, SEQ.vntCast, 190), timers = [];
      const at = (ms, fn) => timers.push(setTimeout(() => { if (tok === battleToken) fn(); }, seqT(ms)));
      try {
        u.el.style.zIndex = 95;
        // 1. Đứng yên tung chiêu: 15 khung, cờ bay lên rồi tỏa ra
        for (let i = 0; i < 15; i++) at(i * 80, () => cast.show(i));
        await sleep(900); if (tok !== battleToken) return;
        // 2. 5 cây cờ phóng nhanh xuống địch (mỗi cây chọn ngẫu nhiên 1 địch), từng cây cách nhau ~130ms
        const FW = 170, FH = Math.round(FW * SEQ.vntFlag.ch / SEQ.vntFlag.cw), FR = 46;   // FR = ms mỗi khung
        const strikes = Array.from({ length: GO_STONES }, () => ({ t: rand(foes) }));
        await Promise.all(strikes.map(async (st, k) => {
          await sleep(k * 130); if (tok !== battleToken) return;
          const e = st.t, sx = e.x + (Math.random() - 0.5) * 5, sy = e.y + (Math.random() - 0.5) * 3;
          const el = add('bf-seq-fx', '', sx, sy); el.style.top = `calc(${sy}% + 34px)`; el.style.width = FW + 'px'; el.style.height = FH + 'px'; el.style.transform = 'translate(-50%,-90%)';
          const sc = seqEl(SEQ.vntFlag, FW); el.appendChild(sc);
          for (let i = 0; i < 15; i++) setTimeout(() => { if (tok === battleToken) sc.show(i); }, seqT(i * FR));
          sc.animate([{ transform: 'translateY(-300px)', opacity: .2 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 5 * FR, easing: 'cubic-bezier(.5,0,1,.6)', fill: 'both' });   // phóng từ trên xuống trong 5 khung đầu
          await sleep(5 * FR); if (tok !== battleToken) return;
          playGoStone();                                   // cờ cắm xuống -> 1 tiếng
          for (let r = 0, n = tiaOf(u); r < n && e.alive; r++) hit(e, Math.max(1, Math.round(e.hp * GO_STONE_PCT)), false, u, false, undefined, { i: r, wait: rayWait(r) });   // mỗi tia 1 lần trừ 6% HP hiện tại
          await sleep(10 * FR); if (tok !== battleToken) return;
          el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
        }));
        cast.end();
        await sleep(350); if (tok !== battleToken) return;
        // 3. Choáng: tướng địch Công cao nhất 3 hiệp, 2 tướng ngẫu nhiên còn lại 2 hiệp
        const alive = foes.filter(e => e.alive);
        if (alive.length) {
          const top = alive.reduce((b, e) => e.atk > b.atk ? e : b, alive[0]);
          vntStun(top, VNT_STUN_TOP);
          const rest = alive.filter(e => e !== top).sort(() => Math.random() - 0.5).slice(0, VNT_STUN_OTHERS);
          rest.forEach(e => vntStun(e, VNT_STUN_OTHER));
          await sleep(500); if (tok !== battleToken) return;
        }
        await sleep(400); if (tok !== battleToken) return;
        made.forEach(d => d.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, fill: 'forwards' }));   // hiệu ứng mờ dần
        await sleep(300);
      } finally {
        timers.forEach(clearTimeout); cast.end();
        made.forEach(d => d.remove());
        u.el.getAnimations().forEach(x => x.cancel());
        u.el.style.zIndex = oldZ;
      }
    }

/* === doan-du === */
/* ĐOÀN DỰ (id 12): tuyệt kỹ Lăng Ba Vi Bộ
   (tách từ index.html cũ — script) */

    // Đoàn Dự – Lăng Ba Vi Bộ: tung chiêu (SEQ.ddCast) rồi 18 tàn ảnh (SEQ.ddRun) chạy rất nhanh từ đội ta sang đội địch; toàn đội 3 hiệp: +300% Né, +150% Tốc, hồi 300% Máu (của Đoàn Dự)
    function clearLB(u) {
      if (u.lbDodge) { u.dodge -= u.lbDodge; u.lbDodge = 0; }
      if (u.lbSpd) { u.spd -= u.lbSpd; u.lbSpd = 0; }
      u.lb = 0;
      const ic = u.el.querySelector('.bf-lb'); if (ic) ic.remove();
    }
    function tickLB(units) {
      units.forEach(u => {
        if (!(u.lb > 0)) return;
        u.lb--;
        if (!u.alive || u.lb <= 0) { clearLB(u); return; }
        if (u.lbHeal) heal(u, u.lbHeal);                       // mỗi hiệp còn lại hồi máu tiếp
        const b = u.el.querySelector('.bf-lb b'); if (b) b.textContent = '💨' + u.lb;
      });
    }
    async function lingBaUlt(u, tok) {
      const f = document.getElementById('battle-arena'), box = document.getElementById('bf-units');
      const W = f.clientWidth, H = f.clientHeight, base = 'translate(-50%,-50%)', made = [], timers = [], oldZ = u.el.style.zIndex;
      const allies = alliesOf(u).filter(h => h.alive), foes = foesOf(u).filter(e => e.alive);
      const avg = (a, k) => a.reduce((s, x) => s + x[k], 0) / Math.max(1, a.length);
      const sx = avg(allies, 'x'), sy = avg(allies, 'y');
      const dir = foes.length ? (avg(foes, 'x') >= sx ? 1 : -1) : (u.side === 'hero' ? 1 : -1);
      const ex = foes.length ? avg(foes, 'x') + dir * 6 : sx + dir * 40, ey = foes.length ? avg(foes, 'y') : sy;
      // Chỉ số buff tính theo Đoàn Dự (lúc ulti)
      const dodgeB = (u.dodge - (u.lbDodge || 0)) * LB_DODGE_MULT, spdB = (u.spd - (u.lbSpd || 0)) * LB_SPD_MULT, healAmt = Math.round(u.max * LB_HEAL_MULT);
      const CAST_FR = 70, GW = 180, RUN_MS = 460;                                         // ms mỗi khung tung chiêu; rộng 1 tàn ảnh; thời gian 1 đạo chạy
      const castW = Math.round(128 / SEQ.ddIdle.ch * SEQ.ddCast.cw);                      // cùng tỉ lệ người với dáng đứng (h = 128)
      const cast = seqOverlay(u, SEQ.ddCast, castW);
      const at = (ms, fn) => timers.push(setTimeout(() => { if (tok === battleToken) fn(); }, seqT(ms)));
      try {
        u.el.style.zIndex = 95;
        // 1. Đứng tại chỗ vung kiếm, nước xoáy quanh người (16 khung)
        for (let i = 0; i < SEQ.ddCast.n; i++) at(i * CAST_FR, () => cast.show(i));
        at(SEQ.ddCast.n * CAST_FR, () => cast.end());
        await sleep(560); if (tok !== battleToken) return;
        // 2. 18 đạo tàn ảnh (chuỗi SEQ.ddRun, 17 khung) dồn dập chạy từ đội ta sang đội địch; mỗi bóng cách nhau 45ms
        const GH = Math.round(GW * SEQ.ddRun.ch / SEQ.ddRun.cw);
        const runs = [];
        for (let i = 0; i < LB_GHOSTS; i++) {
          runs.push((async () => {
            await sleep(i * 45); if (tok !== battleToken) return;
            const g = document.createElement('div'); g.className = 'bf-lbghost'; g.style.width = GW + 'px'; g.style.height = GH + 'px';
            const sc = seqEl(SEQ.ddRun, GW); if (dir < 0) sc.style.transform = 'scaleX(-1)';   // ảnh gốc nhìn sang phải; địch ulti thì lật lại
            sc.style.setProperty('--end', (-GW * (SEQ.ddRun.n - 1)) + 'px');
            sc.style.animation = 'seqRun ' + RUN_MS + 'ms steps(' + (SEQ.ddRun.n - 1) + ') forwards';
            g.appendChild(sc);
            const oy = (Math.random() - 0.5) * 26;
            g.style.left = sx + '%'; g.style.top = (sy + oy) + '%'; g.style.opacity = 0;
            box.appendChild(g); made.push(g);
            const dx = (ex - sx) * W / 100, dy = (ey - sy) * H / 100;
            const a = g.animate([
              { transform: base + ' scale(.9)', opacity: .0 },
              { transform: base + ' scale(1)', opacity: .9, offset: .15 },
              { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(1.05)`, opacity: .0 }
            ], { duration: RUN_MS + Math.random() * 80, easing: 'ease-in', fill: 'forwards' });
            await a.finished.catch(() => {});
            g.remove();
          })());
        }
        // Buff toàn đội ngay khi những tàn ảnh đầu tiên lướt qua
        await sleep(240); if (tok !== battleToken) return;
        allies.forEach((a, i) => setTimeout(() => {
          if (!a.alive) return;
          if (noBuff(a)) { floatText(a, '🚫 KHÓA TĂNG PHÚC'); return; }
          clearLB(a);                                         // không cộng dồn: làm mới 3 hiệp
          a.lb = LB_TURNS; a.lbDodge = dodgeB; a.lbSpd = spdB; a.lbHeal = healAmt;
          a.dodge += dodgeB; a.spd += spdB;
          const ic = document.createElement('div'); ic.className = 'bf-lb'; ic.innerHTML = '<b>💨' + a.lb + '</b>'; a.el.appendChild(ic);
          floatText(a, '💨 NÉ +' + fmtN(dodgeB) + '%');
          setTimeout(() => floatText(a, '⚡ TỐC +' + fmtN(spdB)), 220);
          heal(a, healAmt);                                   // hiệp 1 hồi ngay
        }, i * 90));
        await Promise.all(runs); if (tok !== battleToken) return;
        await sleep(400);
        refreshPanel();
      } finally {
        timers.forEach(clearTimeout); cast.end();
        made.forEach(d => d.remove());
        u.el.getAnimations().forEach(x => x.cancel());
        u.el.style.zIndex = oldZ;
      }
    }

;
/* === bac-cai (tuyệt kỹ Bắc Cái) === */
    const BC_IMG = 'heros/bac-cai/bac-cai-bamboo.webp';   // ảnh cây tre Bắc Cái (Đả Cẩu Bổng)
    // Chuỗi 13 khung hành động khi tung tuyệt kỹ (lưới 5 cột x 3 hàng, mỗi ô cw x ch px, k = hệ số phóng khi hiển thị)
    //  khung 0-4 chạy đà • 5-7 bật lên, vung gậy • 8-9 đập đất • 10-12 thu thế
    const BC_SEQ = { src: 'heros/bac-cai/bac-cai-ult.webp', cw: 280, ch: 200, cols: 5, k: 0.78 };
GP.add(BC_SEQ.src, 2);
GP.add('heros/bac-cai/bac-cai-bamboo.webp', 2);

    // ---------- BẮC CÁI: bay qua đội hình địch, phóng 18 cây tre từ góc chéo trên xuống ----------
    // Phủ chuỗi khung lên tướng (ẩn ảnh thân thường trong lúc diễn). show(i, lật?) đổi khung; end() trả lại ảnh thân.
    function bcSeq(u) {
      const S = BC_SEQ, d = document.createElement('div'); d.className = 'bc-seq';
      d.style.width = S.cw * S.k + 'px'; d.style.height = S.ch * S.k + 'px';
      d.style.backgroundImage = 'url(' + S.src + ')'; d.style.backgroundSize = (S.cw * S.cols * S.k) + 'px ' + (S.ch * 3 * S.k) + 'px';
      u.el.appendChild(d);
      const bodies = u.el.querySelectorAll('.hero-body, .hero-img, .bf-emo'); bodies.forEach(b => { b.style.visibility = 'hidden'; });
      const api = {
        show(i, flip) {   // ảnh gốc quay mặt sang PHẢI: đội trái giữ nguyên, đội phải lật
          if (flip === undefined) flip = u.side !== 'hero';
          d.style.backgroundPosition = (-(i % S.cols) * S.cw * S.k) + 'px ' + (-Math.floor(i / S.cols) * S.ch * S.k) + 'px';
          d.style.transform = 'translateX(-50%) scaleX(' + (flip ? -1 : 1) + ')';
        },
        end() { d.remove(); bodies.forEach(b => { b.style.visibility = ''; }); }
      };
      api.show(0); return api;
    }
    async function bacCaiUlt(u, tok) {
      const g = nt(u), { f, W, H, base, made } = g, es0 = g.es(); if (!es0.length) return;
      const b = g.box0(es0), landX = u.side === 'hero' ? Math.min(94, b.maxX + 9) : Math.max(6, b.minX - 9), landY = b.cy;
      const dx = (landX - u.x) * W / 100, dy = (landY - u.y) * H / 100, oldZ = u.el.style.zIndex;
      const mid = `translate(calc(-50% + ${dx / 2}px),calc(-50% + ${dy / 2 - 130}px))`, land = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
      const bcN = Math.max(1, Math.min(BC_HITS, Math.floor(BC_DMG_HITS))), bcAt = new Set(Array.from({ length: bcN }, (_, j) => Math.floor((j + 1) * BC_HITS / bcN) - 1));   // 18 cây tre chỉ là hiệu ứng; sát thương rơi vào bcN cây rải đều
      let per = u.atk * BC_MULT * (u.sk || 1) / bcN; const dir = u.side === 'hero' ? 1 : -1;
      const seq = bcSeq(u), timers = [], at = (ms, i, flip) => timers.push(setTimeout(() => { if (tok === battleToken) seq.show(i, flip); }, seqT(ms)));
      try {
        u.el.style.zIndex = 99;
        u.el.animate([{ transform: base }, { transform: mid, offset: .5 }, { transform: land }], { duration: 650, easing: 'ease-in-out', fill: 'forwards' });
        [0, 80, 160, 240, 320, 400, 480, 560].forEach((ms, i) => at(ms, i));   // chạy đà → bật lên → vung gậy
        await sleep(680); if (tok !== battleToken) return;
        seq.show(8);                                                          // chạm đất, bung hào quang vàng
        at(120, 9); at(380, 10); at(640, 11); at(900, 12);                    // đập gậy → thu thế trong lúc tre rơi
        g.ring(landX, landY, '#84cc16');
        // TRƯỚC KHI ULTI: hiệu ứng CỘNG THÊM (+Công đội) rồi hiệu ứng GIẢM (-Thủ địch) — sát thương các cây tre tính sau đó
        g.as().forEach(a => { if (noBuff(a)) { floatText(a, '🚫 KHÓA TĂNG PHÚC'); return; } pctMod(a, 'atk', BC_ATK_UP, BC_TURNS, 'buff', 'bc'); sayLater(a, '⚔️ CÔNG +' + Math.round(BC_ATK_UP * 100) + '%'); });
        g.es().forEach(e => { pctMod(e, 'def', -BC_DEF_DOWN, BC_TURNS, 'debuff', 'bc'); sayLater(e, '🛡️ THỦ -' + Math.round(BC_DEF_DOWN * 100) + '%'); });
        per = u.atk * BC_MULT * (u.sk || 1) / bcN;          // Công đã cộng
        refreshPanel(); await sleep(350); if (tok !== battleToken) return;
        for (let k = 0; k < BC_HITS; k++) {
          const es = g.es(); if (!es.length) break;
          const tx = Math.max(6, Math.min(94, b.cx + (Math.random() - 0.5) * (b.maxX - b.minX + 16))), ty = Math.max(12, Math.min(88, b.cy + (Math.random() - 0.5) * (b.maxY - b.minY + 18)));
          // Tre 3D: đội TRÁI (hero) rơi từ trên-trái xuống địch; đội PHẢI rơi từ trên-phải xuống ta. Trục tre nghiêng ~25° nên rơi đúng theo trục.
          const hh = Math.round(Math.max(140, Math.min(220, H * 0.42))), fall = Math.round(Math.max(280, Math.min(520, H * 0.9)));
          const sx = -dir * Math.round(fall * 0.466), sy = -fall;
          const r = g.mk('bf-bamboo3d' + (dir > 0 ? ' mir' : ''), '<i class="bt-trail"></i><img src="' + BC_IMG + '" alt="">', tx, ty);
          r.style.height = hh + 'px'; r.style.width = Math.round(hh * 0.645) + 'px'; r.style.setProperty('--lean', (-dir * 25) + 'deg');
          const T = (x, y, ry, sc) => `perspective(700px) translate(calc(-50% + ${x}px),calc(-50% + ${y}px)) rotateY(${ry}deg) scale(${sc})`;
          r.animate([{ transform: T(sx, sy, -dir * 70, .65), opacity: 0 }, { opacity: 1, offset: .2 },
                     { transform: T(0, 0, 0, 1.12), opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.35,0,.85,.55)', fill: 'forwards' });
          setTimeout(() => {
            if (tok !== battleToken) return;
            g.ring(tx, ty, '#bef264');
            if (bcAt.has(k)) g.es().forEach(e => skillHit(e, per, u)); if (k % 3 === 0) g.shake();
            if (k % 2 === 0) for (let j = 0; j < 3; j++) {   // lá tre bung ra khi chạm đất
              const lf = g.mk('bf-leaf', '🍃', tx, ty), a = Math.random() * Math.PI * 2, d = 24 + Math.random() * 36;
              lf.animate([{ transform: 'translate(-50%,-50%) scale(.6) rotate(0deg)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px),calc(-50% + ${Math.sin(a) * d - 22}px)) scale(1) rotate(${Math.random() * 360}deg)`, opacity: 0 }], { duration: 520, easing: 'ease-out', fill: 'forwards' });
              setTimeout(() => lf.remove(), 540);
            }
            r.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' }); setTimeout(() => r.remove(), 190);
          }, 380);
          await sleep(75); if (tok !== battleToken) return;
        }
        await sleep(420); if (tok !== battleToken) return;
        refreshPanel(); await sleep(250); if (tok !== battleToken) return;
        u.el.getAnimations().forEach(a => a.cancel());
        u.el.animate([{ transform: land }, { transform: mid, offset: .5 }, { transform: base }], { duration: 450, easing: 'ease-in-out', fill: 'forwards' });
        const back = u.side === 'hero';                                       // quay đầu chạy về: lật ngược hướng nhìn
        [1, 2, 1, 2].forEach((fr, i) => at(i * 110, fr, back));
        await sleep(480);
      } finally { timers.forEach(clearTimeout); seq.end(); made.forEach(d => d.remove()); u.el.getAnimations().forEach(a => a.cancel()); u.el.style.zIndex = oldZ; }
    }

/* === dong-ta (tuyệt kỹ Đông Tà) === */
GP.add('heros/dong-ta/dong-ta-burst.webp', 2);

    // ---------- ĐÔNG TÀ: nhảy lên cao thổi sóng âm 4 lần ----------
    async function dongTaUlt(u, tok) {
      const g = nt(u), { H, base, made } = g, es0 = g.es(); if (!es0.length) return;
      const b = g.box0(es0), oldZ = u.el.style.zIndex, per = u.atk * DT_MULT * (u.sk || 1) / DT_HITS;
      // Chuỗi 12 khung (SEQ.dtCast) phủ lên tướng: khung 0-3 nhảy lên • 4-10 xoáy vàng, thổi sáo • 11 đáp đất bung hào quang
      const cast = seqOverlay(u, SEQ.dtCast, 122), timers = [], fr = (ms, i) => timers.push(setTimeout(() => { if (tok === battleToken) cast.show(i); }, seqT(ms)));
      try {
        u.el.style.zIndex = 99;
        [0, 110, 220, 330].forEach((ms, i) => fr(ms, i));
        [4, 5, 6, 7, 8, 9, 10].forEach((fi, i) => fr(450 + i * 340, fi));
        await sleep(450); if (tok !== battleToken) return;
        // TRƯỚC KHI ULTI: hiệu ứng CỘNG THÊM (+Bạo đội) rồi hiệu ứng GIẢM (-Bạo địch) — 4 sóng âm tính sau đó
        g.as().forEach(a => { if (noBuff(a)) { floatText(a, '🚫 KHÓA TĂNG PHÚC'); return; } pctMod(a, 'crit', DT_CRIT, DT_TURNS, 'buff', 'dt'); sayLater(a, '💥 BẠO +' + Math.round(DT_CRIT * 100) + '%'); });
        g.es().forEach(e => { pctMod(e, 'crit', -DT_CRIT, DT_TURNS, 'debuff', 'dt'); sayLater(e, '💥 BẠO -' + Math.round(DT_CRIT * 100) + '%'); });
        refreshPanel(); await sleep(350); if (tok !== battleToken) return;
        // Mỗi nhịp: nốt nhạc vàng bung ra từ tâm (chữ ♪ lớn ở giữa) lan rộng khắp đội địch rồi tan biến; thêm nốt ♪ bắn tỏa tròn theo mọi hướng
        const BW = Math.round(Math.max(240, Math.min(g.W * 0.62, 520)));
        for (let k = 0; k < DT_HITS; k++) {
          const es = g.es(); if (!es.length) break;
          const tilt = (k % 2 ? -1 : 1) * 14;
          const bu = g.mk('bf-notesburst', '<img src="heros/dong-ta/dong-ta-burst.webp" alt="">', b.cx, b.cy);
          bu.style.width = BW + 'px'; bu.style.height = Math.round(BW / 1.4766) + 'px';
          const T = (sc, rz, rx) => `translate(-50%,-50%) perspective(800px) rotateX(${rx}deg) rotateZ(${rz}deg) scale(${sc})`;
          bu.animate([{ transform: T(.06, -tilt, 35), opacity: 0 }, { transform: T(.5, -tilt / 2, 22), opacity: 1, offset: .25 },
                      { transform: T(1.05, 0, 10), opacity: 1, offset: .6 }, { transform: T(1.3, tilt / 2, 0), opacity: 0 }], { duration: 900, easing: 'ease-out', fill: 'forwards' });
          for (let j = 0; j < 9; j++) {   // nốt nhỏ bắn ra từ tâm
            const n = g.mk('bf-nparticle', ['🎵', '🎶'][(j + k) % 2], b.cx, b.cy), an = (j / 9) * Math.PI * 2 + k * .35, d = BW * (.4 + Math.random() * .25);
            n.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 }, { opacity: 1, offset: .2 },
                       { transform: `translate(calc(-50% + ${Math.cos(an) * d}px),calc(-50% + ${Math.sin(an) * d * .6}px)) scale(1.1) rotate(${(Math.random() - .5) * 60}deg)`, opacity: 0 }], { duration: 800, easing: 'ease-out', fill: 'forwards' });
            setTimeout(() => n.remove(), 820);
          }
          setTimeout(() => bu.remove(), 920);
          await sleep(300); if (tok !== battleToken) return;
          g.ring(b.cx, b.cy, '#fde047'); g.shake(); g.es().forEach(e => { skillHit(e, per, u); g.ring(e.x, e.y, '#bef264'); });
          await sleep(320); if (tok !== battleToken) return;
        }
        refreshPanel(); await sleep(250); if (tok !== battleToken) return;
        cast.show(11);   // đáp đất
        await sleep(350);
      } finally { timers.forEach(clearTimeout); cast.end(); made.forEach(d => d.remove()); u.el.getAnimations().forEach(a => a.cancel()); u.el.style.zIndex = oldZ; }
    }

/* === tay-doc (tuyệt kỹ Tây Độc) === */
GP.add('heros/tay-doc/tay-doc-toad3d.webp', 2);

    // ---------- TÂY ĐỘC: triệu hồi cóc độc phun độc qua đội địch ----------
    async function tayDocUlt(u, tok) {
      const g = nt(u), { W, H, made } = g, es0 = g.es(); if (!es0.length) return;
      const b = g.box0(es0), dir = u.side === 'hero' ? 1 : -1, tx0 = Math.max(6, Math.min(94, u.x + dir * 14)), ty0 = Math.max(18, Math.min(82, u.y - 4));
      const timers = [];
      try {
        // Cóc độc (chuỗi 25 khung, cóc chỉ chiếm ~45% bề rộng khung, quay mặt sang PHẢI): khung 0-4 ngồi yên → 5-9 há miệng → 10-14 há rộng phun độc → 15-19 ngậm miệng lại → 20-24 ngồi yên → mờ dần biến mất.
        // Đội phải thì lật để cóc nhìn về phía ta.
        const FR = 80, SPIT = 9;   // 80ms/khung; phun độc từ khung 9 (miệng đã há)
        const TW = Math.round(Math.max(230, Math.min(W * 0.6, H * 0.9))), sc = seqEl(SEQ.tdToad, TW), TH = parseInt(sc.style.height), hw = TW * 0.25 / W * 100;
        const cx0 = Math.max(hw, Math.min(100 - hw, tx0 + dir * 0.06 * TW / W * 100)), cy0 = Math.max(TH * 0.5 / H * 100 + 1, u.y + 40 / H * 100 - TH * 0.5 / H * 100 + 3 + 0.1 * TH / H * 100);
        const toad = g.mk('bf-seq-fx' + (dir > 0 ? '' : ' mir'), '', cx0, cy0); toad.style.width = TW + 'px'; toad.style.height = TH + 'px'; toad.appendChild(sc);
        const mx0 = cx0 + dir * 0.01 * TW / W * 100, my0 = cy0 + 0.03 * TH / H * 100;   // miệng cóc (giữa khung, hơi thấp hơn tâm): nơi bong bóng độc bắn ra
        toad.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, fill: 'forwards' });
        for (let i = 0; i < SEQ.tdToad.n; i++) timers.push(setTimeout(() => { if (tok === battleToken) sc.show(i); }, seqT(i * FR)));
        g.ring(tx0, ty0, '#84cc16'); await sleep(SPIT * FR); if (tok !== battleToken) return;
        for (let i = 0; i < 26; i++) {   // luồng độc phun qua đội hình địch
          const p = g.mk('bf-venom', '', mx0, my0), ex = b.minX + Math.random() * (b.maxX - b.minX + 8) - 2, ey = b.minY + Math.random() * (b.maxY - b.minY + 10) - 3;
          const dx = (ex - mx0) * W / 100, dy = (ey - my0) * H / 100, s = 0.7 + Math.random() * 1.1;
          p.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 }, { transform: `translate(calc(-50% + ${dx * 0.5}px),calc(-50% + ${dy * 0.5 - 40}px)) scale(${s})`, opacity: 1, offset: .5 },
                     { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(${s * 1.6})`, opacity: 0 }], { duration: 650 + Math.random() * 250, delay: i * 20, easing: 'ease-out', fill: 'forwards' });
        }
        await sleep(900); if (tok !== battleToken) return;
        g.es().forEach(e => {
          g.ring(e.x, e.y, '#a3e635');
          pctMod(e, 'def', -TD_DEF_DOWN, TD_TURNS, 'debuff', 'td'); pctMod(e, 'spd', -TD_SPD_DOWN, TD_TURNS, 'debuff', 'td');
          floatText(e, '☠️ TRÚNG ĐỘC'); sayLater(e, '🛡️ THỦ -' + Math.round(TD_DEF_DOWN * 100) + '%', 260); sayLater(e, '⚡ TỐC -' + Math.round(TD_SPD_DOWN * 100) + '%', 520);
          const cut = Math.max(1, Math.round(e.hp * TD_HP_DOWN)); setTimeout(() => { if (e.alive) { hit(e, cut, true, u, true); floatText(e, '💔 -' + Math.round(TD_HP_DOWN * 100) + '% MÁU'); } }, 360);   // mất 50% máu hiện tại (bỏ qua giáp)
        });
        g.shake(); refreshPanel(); await sleep(450); if (tok !== battleToken) return;   // cóc đã ngậm miệng lại, ngồi yên một chút rồi mờ dần biến mất
        toad.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }); await sleep(870);
      } finally { timers.forEach(clearTimeout); made.forEach(d => d.remove()); }
    }

/* === nam-de (tuyệt kỹ Nam Đế) === */
    // ---------- NAM ĐẾ: 2 chữ Vạn xoáy — 1 từ dưới đất xoáy LÊN, 1 từ trên trời xoáy XUỐNG — cùng đập vào đội địch ----------
    async function namDeUlt(u, tok) {
      const g = nt(u), { H, made } = g, es0 = g.es(); if (!es0.length) return;
      const b = g.box0(es0);
      const upPx = Math.round((100 - b.cy) / 100 * H + 170);   // quãng từ tâm đội địch xuống dưới đáy sân (+ chữ Vạn ló khỏi màn hình)
      try {
        u.el.animate([{ filter: 'drop-shadow(0 0 0 #fde047)' }, { filter: 'drop-shadow(0 0 18px #fde047)' }, { filter: 'drop-shadow(0 0 0 #fde047)' }], { duration: 700 });
        const halo = g.mk('bf-wan-halo', '', b.cx, b.cy); halo.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(.3)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }], { duration: 700, fill: 'forwards' });
        const DUR = 1050;
        // chữ Vạn trên trời: vừa xoáy vừa lao xuống
        const top = g.mk('bf-wan', '<span>卍</span>', b.cx, b.cy);
        top.animate([{ transform: `translate(-50%,calc(-50% - ${H}px)) rotate(0deg) scale(.5)`, opacity: 0 }, { opacity: 1, offset: .2 },
                     { transform: 'translate(-50%,-50%) rotate(540deg) scale(1.5)', opacity: 1, offset: .75 }, { transform: 'translate(-50%,-50%) rotate(600deg) scale(1.25)', opacity: 1 }], { duration: DUR, easing: 'ease-in', fill: 'forwards' });
        // chữ Vạn dưới đất: vừa xoáy ngược vừa trồi lên
        const bot = g.mk('bf-wan', '<span>卐</span>', b.cx, b.cy);
        bot.animate([{ transform: `translate(-50%,calc(-50% + ${upPx}px)) rotate(0deg) scale(.5)`, opacity: 0 }, { opacity: 1, offset: .2 },
                     { transform: 'translate(-50%,-50%) rotate(-540deg) scale(1.5)', opacity: 1, offset: .75 }, { transform: 'translate(-50%,-50%) rotate(-600deg) scale(1.25)', opacity: 1 }], { duration: DUR, easing: 'ease-in', fill: 'forwards' });
        await sleep(900); if (tok !== battleToken) return;   // hai chữ Vạn đập vào nhau giữa đội địch
        g.ring(b.cx, b.cy, '#fde047'); g.shake(); setTimeout(() => g.ring(b.cx, b.cy, '#f59e0b'), 160); setTimeout(() => g.ring(b.cx, b.cy, '#fff7ae'), 320);
        g.es().forEach(e => { MOD_STATS.forEach(k => pctMod(e, k, -ND_ALL_DOWN, ND_TURNS, 'debuff', 'nd:' + k)); floatText(e, '卍 ẤN PHONG'); sayLater(e, '⬇ TẤT CẢ -' + Math.round(ND_ALL_DOWN * 100) + '%', 280); });
        refreshPanel(); await sleep(900); if (tok !== battleToken) return;
        [top, bot, halo].forEach(d => d.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: 'ease-in', fill: 'forwards' })); await sleep(520);
      } finally { made.forEach(d => d.remove()); }
    }

/* === vuong-trung-duong (tuyệt kỹ Vương Trùng Dương) === */
GP.add('heros/vuong-trung-duong/vuong-trung-duong-taiji-vortex.webp', 2);

    // ---------- VƯƠNG TRÙNG DƯƠNG: tung Thái Cực (chuỗi 12 khung), lốc xoáy âm dương mở ra bên ĐỊCH, đội ta tăng 300% mọi thuộc tính ----------
    // Khung tung chiêu phủ lên tướng (hero-seq.js › seqOverlay) • lốc xoáy là chuỗi khung lặp (SEQ.vtdStorm) đặt giữa đội địch • cầu Thái Cực bay từ tướng sang từng đồng đội.
    async function vtdUlt(u, tok) {
      const g = nt(u), { W, H, made } = g, as = g.as(); if (!as.length) return;
      const es0 = g.es(), b = g.box0(es0.length ? es0 : as);
      const SW = Math.round(Math.max(160, Math.min(W * 0.4, H * 0.52))), SH = Math.round(SW * SEQ.vtdStorm.ch / SEQ.vtdStorm.cw), hw = SW * 0.5 / W * 100, hh = SH * 0.5 / H * 100;
      const cx = Math.max(hw + 1, Math.min(99 - hw, b.cx)), cy = Math.max(hh + 2, Math.min(98 - hh, b.cy - 3));
      const cast = seqOverlay(u, SEQ.vtdCast, 130), timers = [], oldZ = u.el.style.zIndex; let storm = null;
      try {
        u.el.style.zIndex = 99;
        for (let i = 0; i < 12; i++) timers.push(setTimeout(() => { if (tok === battleToken) cast.show(i); }, seqT(i * 110)));
        timers.push(setTimeout(() => {   // đĩa Thái Cực đã lên cao → lốc xoáy mở ra bên địch
          if (tok !== battleToken) return;
          storm = g.mk('bf-seq-fx', '', cx, cy); storm.style.width = SW + 'px'; storm.style.height = SH + 'px';
          const sc = seqEl(SEQ.vtdStorm, SW); sc.loop(1250); storm.appendChild(sc);
          storm.animate([{ transform: 'translate(-50%,-50%) scale(.15,.05)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.08,1.12)', opacity: 1, offset: .65 }, { transform: 'translate(-50%,-50%) scale(1,1)', opacity: 1 }], { duration: 700, easing: 'ease-out', fill: 'forwards' });
          g.ring(cx, Math.min(94, cy + hh * 0.8), '#fde047');
        }, seqT(660)));
        await sleep(1350); if (tok !== battleToken) return;
        const ox = u.x, oy = Math.max(6, u.y - 9);   // đĩa Thái Cực trên đầu tướng
        as.forEach((a, i) => setTimeout(() => {
          if (tok !== battleToken || !a.alive) return;
          const orb = g.mk('bf-vtd-orb', '', ox, oy), dx = (a.x - ox) * W / 100, dy = (a.y - oy) * H / 100;
          orb.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 }, { opacity: 1, offset: .2 }, { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(1.2)`, opacity: 1 }], { duration: 420, easing: 'ease-in', fill: 'forwards' });
          setTimeout(() => {
            orb.remove(); if (tok !== battleToken || !a.alive) return;
            if (noBuff(a)) { floatText(a, '🚫 KHÓA TĂNG PHÚC'); return; }
            g.ring(a.x, a.y, '#fde047'); setTimeout(() => g.ring(a.x, a.y, '#60a5fa'), 90);
            MOD_STATS.forEach(k => pctMod(a, k, VTD_ALL_UP, VTD_TURNS, 'buff', 'vtd:' + k));
            floatText(a, '☯ TẤT CẢ +' + Math.round(VTD_ALL_UP * 100) + '%'); refreshPanel();
          }, 420);
        }, i * 140));
        await sleep(as.length * 140 + 1250); if (tok !== battleToken) return;
        if (storm) storm.animate([{ opacity: 1, transform: 'translate(-50%,-50%) scale(1,1)' }, { opacity: 0, transform: 'translate(-50%,-50%) scale(.6,1.25)' }], { duration: 480, fill: 'forwards' });
        await sleep(500);
      } finally { timers.forEach(clearTimeout); cast.end(); u.el.style.zIndex = oldZ; made.forEach(d => d.remove()); }
    }
;

/* === heros/linh-cam.js === */
/* LÍNH PHỤ CỦA ĐỊCH (cờ / kiếm / cung / đao / chuỳ / thương): PVE (Ải/Bàn) và Giang Hồ (Hang Tụ Linh).
   • Trận nào địch chỉ có 2 tướng thì bù 3 lính cho đủ 5, mỗi chỗ trống bốc NGẪU NHIÊN 1 loại, 3 lính khác loại nhau. KHÔNG có ở Tỷ Võ, Luận Kiếm, Danh Tướng Lầu, Boss Bang.
   • Lính đánh thường (lao tới) và dồn đủ nộ thì tung tuyệt kỹ của loại lính đó (chuỗi khung <loại>-atk.webp + tiếng 01-<loại>.mp3).
   • Chỉ số = % của chỉ số địch cùng trận (mặc định 33%). Admin chỉnh được trong GAME_CFG.lcc = { on: 1|0, count: 1..3, pct: % sức mạnh } (áp cho mọi loại lính).
     Tắt riêng 1 loại: GAME_CFG.lck.on = 0 (kiếm), lcg (cung), lcd (đao), lch (chuỳ), lct (thương), lcc (cờ).
   • FILE DUY NHẤT cho cả 6 loại lính (trước đây mỗi loại 1 file .js + 1 file .css riêng, nội dung gần như giống hệt). Mỗi loại chỉ khác vài thông số
     nên khai báo trong bảng LC_DEFS bên dưới; hàm lcMakeType dựng dáng đứng + tuyệt kỹ + đăng ký vào LC_TYPES. Ảnh/tiếng vẫn ở heros/linh-cam-<slug>/.
     Thêm loại lính mới: thả ảnh <slug>-idle.webp, <slug>-atk.webp, 01-linh-cam-<slug>.mp3 vào heros/linh-cam-<slug>/ rồi thêm 1 dòng vào LC_DEFS.
   • Gọi từ: pve/pve-battle.js (loadWave + enemyTurn), giang-ho/giangho.js (ghLoadWave), js/battle/ultimate.js (ultimateOnce). */

window.LC_TYPES = window.LC_TYPES || {};

const LC_H = 94;   // chiều cao hiển thị (px): nhỏ hơn tướng rõ rệt (trước là 120)
// key = tiền tố SEQ + khoá GAME_CFG | slug = thư mục heros/linh-cam-<slug>/ | drop = độ hạ dáng đứng | hit = khung (0..19) bắt đầu gây sát thương
const LC_DEFS = [
  { key: 'lcc', slug: 'co',     name: 'Lính Cầm Cờ',     drop: 0.03, hit: 10 },   // cờ: đứng tại chỗ vung cờ đâm, xoáy lam
  { key: 'lck', slug: 'kiem',   name: 'Lính Cầm Kiếm',   drop: 0.01, hit: 10 },   // kiếm: vung kiếm chém xoáy lam
  { key: 'lcg', slug: 'cung',   name: 'Lính Cầm Cung',   drop: 0.03, hit: 8 },    // cung: giương cung bắn tên ánh lam
  { key: 'lcd', slug: 'dao',    name: 'Lính Cầm Đao',    drop: 0.03, hit: 10 },   // đao: vung đao chém xoáy lam
  { key: 'lch', slug: 'chuy',   name: 'Lính Cầm Chuỳ',   drop: 0.05, hit: 9 },    // chuỳ: vung chuỳ đập xoáy lam
  { key: 'lct', slug: 'thuong', name: 'Lính Cầm Thương', drop: 0.05, hit: 10 }    // thương: đâm thương, xoáy lam
];

const lccCfg = () => ({ on: Number(cfgGet('lcc.on', 1)) !== 0, count: Math.max(1, Math.min(3, Math.floor(cfgNum('lcc.count', 3)))), pct: Math.max(1, cfgNum('lcc.pct', 33)) / 100 });

// Dựng 1 loại lính: 2 chuỗi khung (đứng yên + tuyệt kỹ, 20 khung), dáng đứng, tuyệt kỹ; tự đăng ký vào window.LC_TYPES[key]
function lcMakeType(d) {
  const dir = 'heros/linh-cam-' + d.slug + '/', idleK = d.key + 'Idle', atkK = d.key + 'Atk';
  SEQ[idleK] = { src: dir + 'linh-cam-' + d.slug + '-idle.webp', cw: 306, ch: 256, n: 20, drop: d.drop };   // đứng yên (lặp)
  SEQ[atkK]  = { src: dir + 'linh-cam-' + d.slug + '-atk.webp',  cw: 306, ch: 256, n: 20, drop: d.drop };   // tuyệt kỹ (20 khung)
  GP.add([SEQ[idleK].src, SEQ[atkK].src], 2);

  // Dáng đứng của lính (ảnh gốc nhìn sang PHẢI; lính ở bên địch nên lật để nhìn sang trái về phía đội ta)
  const idleHTML = () => {
    const s = SEQ[idleK], h = LC_H, w = Math.round(h * s.cw / s.ch), lift = h - 76 - Math.round(s.drop * h), ms = 1400;
    return '<div class="hero-seq" style="width:' + w + 'px;height:' + h + 'px;margin:' + (-lift) + 'px 0 0 ' + (-w / 2) + 'px;transform:scaleX(-1);background-image:url(' + s.src + ');background-size:' + (w * s.n) + 'px ' + h + 'px;--end:' + (-w * s.n) + 'px;--ms:' + ms + 'ms;animation:seqRun ' + ms + 'ms steps(' + s.n + ') ' + (-Math.round(Math.random() * ms)) + 'ms infinite"></div>';
  };

  // Tuyệt kỹ (20 khung); sát thương rơi vào các khung d.hit..: ULT_HITS đòn lên 1 mục tiêu
  const ult = async (u, tok) => {
    try { const a = new Audio(dir + '01-linh-cam-' + d.slug + '.mp3'); a.volume = .8; a.play().catch(() => {}); } catch (e) {}
    const s = SEQ[atkK], W = Math.round(LC_H * s.cw / s.ch), FR = 70, oldZ = u.el.style.zIndex;
    const ov = seqOverlay(u, s, W); ov.el.style.transform = 'translateX(-50%) scaleX(-1)';   // lính ở bên địch: lật nhìn sang đội ta
    const hits = Math.max(1, Math.floor(typeof ULT_HITS === 'number' ? ULT_HITS : 1));
    try {
      u.el.style.zIndex = 95;
      for (let i = 0; i < s.n; i++) {
        if (tok !== battleToken || !u.alive) return;
        ov.show(i);
        if (i >= d.hit && i < d.hit + hits) {
          const t = pickTarget(foesOf(u));
          if (t) skillHit(t, u.atk * (typeof ULT_MULT === 'number' ? ULT_MULT : 1) * (u.sk || 1), u);
        }
        await sleep(FR);
      }
      refreshPanel();
    } finally { ov.end(); u.el.style.zIndex = oldZ; try { u.el.getAnimations().forEach(a => a.cancel()); } catch (e) {} }
  };

  window.LC_TYPES[d.key] = { name: d.name, idleHTML, ult };
}
LC_DEFS.forEach(lcMakeType);

// r = kết quả heroFoes(n, k). Đủ điều kiện (đúng 2 tướng địch, không phải PVP) thì bù lính cho đủ 5 vị trí. k = hệ số chỉ số của trận.
// Mỗi chỗ trống bốc NGẪU NHIÊN 1 loại lính trong LC_TYPES (cờ/kiếm/cung/đao/chuỳ/thương), bốc không trả lại nên 3 lính trong 1 trận khác loại nhau
// (hết túi thì xáo lại, nhưng tối đa 3 lính < 6 loại nên thực tế không bao giờ trùng). Mỗi chỗ đúng 1 lính, không đè nhau, tổng luôn = 5.
function lcPool() {
  const T = window.LC_TYPES || {};
  return Object.keys(T).filter(key => Number(cfgGet(key + '.on', 1)) !== 0);   // GAME_CFG.lck.on = 0 ... để loại 1 loại lính khỏi pool
}
function lcShuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

function lccAddSoldiers(r, k) {
  const C = lccCfg();
  if (!C.on || !r || !r.foes || r.foes.length !== 2) return r;      // chỉ bù khi địch đúng 2 tướng
  if (r.foes.some(u => u.isSoldier)) return r;                       // đã bù rồi thì không bù thêm lần nữa
  if ((typeof pvp !== 'undefined' && pvp) || (typeof bossB !== 'undefined' && bossB) || (typeof ghB !== 'undefined' && ghB && ghB.kind === 'lk')) return r;
  const pool = lcPool(); if (!pool.length) return r;
  const S = HERO_POS[5].map(p => [100 - p[0], p[1] + HERO_DY]);   // đội địch: 5 vị trí như đội ta, lấy đối xứng
  const heroSlots = [1, 2], soldSlots = [0, 3, 4].slice(0, C.count);   // 2 tướng đứng hàng trước, lính đứng giữa và hàng sau
  const place = (u, p) => { u.x = p[0]; u.y = p[1]; u.el.style.left = p[0] + '%'; u.el.style.top = p[1] + '%'; u.el.style.zIndex = Math.round(p[1]); };
  r.foes.forEach((u, i) => place(u, S[heroSlots[i]]));
  const spd = Math.min.apply(null, r.picks.map(h => h.spd || 100));
  let bag = [];
  const nextType = () => { if (!bag.length) bag = lcShuffle(pool.slice()); return bag.pop(); };
  soldSlots.forEach(si => {
    const key = nextType(), T = window.LC_TYPES[key];
    const u = makeUnit('enemy', '', S[si][0], S[si][1], foeNum(FOE_CFG.hp, 1000) * k * C.pct, foeNum(FOE_CFG.atk, 200) * k * C.pct, false, T.name);
    u.id = key; u.lcType = key; u.isSoldier = true; u.def = Math.max(0, Number(FOE_CFG.def) || 0) * C.pct; u.spd = spd; u.dodge = 0; u.acc = 300; u.sk = 1; u.rage = 0;
    const sp = u.el.querySelector('.bf-sprite'); if (sp) sp.innerHTML = T.idleHTML();
    r.foes.push(u);
  });
  return r;
}

// Tuyệt kỹ của lính: gọi đúng hiệu ứng theo loại lính (ultimate.js → ultimateOnce → lcUlt)
function lcUlt(u, tok) { const T = window.LC_TYPES || {}; return (T[u.lcType || u.id] || T.lcc).ult(u, tok); }

// Lượt của lính (gọi từ enemyTurn): đủ nộ thì tuyệt kỹ, chưa đủ thì lao tới đánh thường
async function lccAct(e, tok) {
  if (e.rage >= 100 && !ultBlocked(e)) { e.rage = 0; await ultimate(e, tok); }
  else { gainRage(e, RAGE_ATK); await attack(e, waveUnits.heroes, 1, e.atk, tok); }
}

;
/* === js/battle/skill-config.js === */
/* TRẬN ĐẤU: thông số cân bằng của các tuyệt kỹ
   Hằng số riêng của từng tướng nằm trong heros/hero-data.js (mục "skillConfig", ghi chú gốc ở "skillNote").
   File này chỉ còn: hằng số dùng chung + gộp tất cả thành biến toàn cục (MOON_TURNS, DUCO_MULT, ...) + áp cấu hình admin. */

    let busy = false;
    // css = màu chớp sáng/sóng khi bướm chạm đất; ảnh bướm từng màu: SEQ.hmlRed…hmlPurple (hero-seq.js)
    const BFLY_COLORS = [
      { k: 'red',    css: '#ef4444' },   // Đỏ: chảy máu
      { k: 'orange', css: '#f97316' },   // Cam: giảm sát thương
      { k: 'yellow', css: '#facc15' },   // Vàng: giảm Thủ
      { k: 'green',  css: '#22c55e' },   // Lục: giảm hồi máu
      { k: 'blue',   css: '#38bdf8' },   // Lam: giảm nộ
      { k: 'indigo', css: '#6366f1' },   // Chàm: choáng 2 địch ngẫu nhiên 1 hiệp
      { k: 'purple', css: '#a855f7' }    // Tím: trúng độc + câm lặng (không dùng được tuyệt kỹ)
    ];   // Hoa Mãn Lâu: 3 bướm, mỗi con rơi gây 100% Công lên TOÀN địch; +50% Công toàn đội

// Hằng số dùng chung (không thuộc riêng tướng nào):
//  B4_HERO_*: trận 4, 3 tướng ngẫu nhiên của địch dùng chỉ số THEO ẢI • ULT_HITS/ULT_MULT: ulti chung (lao vào đánh) • HEAL_MULT • RAGE_ATK
const SKILL_SHARED = {
  B4_HERO_HP: 1000,
  B4_HERO_ATK: 200,
  B4_HERO_DEF: 30,
  B4_HERO_DODGE: 0,
  ULT_HITS: 3,
  ULT_MULT: 1.2,
  HEAL_MULT: 1.5,
  RAGE_ATK: 25,   // PvE: mỗi lần đánh thường +25 nộ
  RAGE_HIT: 25,   // PvE: mỗi lần chiêu (tuyệt kỹ) gây sát thương trúng +25 nộ (VD Trương Tam Phong 4 lần = +100 nộ)
  TL_BUBBLES: 36,        // Thủy Long: số bong bóng trong cơn mưa (hiệu ứng hình ảnh)
  TL_HITS: 5,            // số lần sát thương lên MỖI địch
  TL_MULT: 3.5,          // tổng hệ số Công lên mỗi địch (chia đều cho các lần)
  TL_RAGE: 50,           // nộ cộng cho cả đội ta
  DUCO_SWORDS: 32,       // Độc Cô Cầu Bại: số kiếm trong cơn mưa (hiệu ứng hình ảnh)
  DUCO_HIT_COUNT: 3,     // số lần sát thương lên MỖI địch
  DUCO_SLOW: 0.20,       // địch giảm Tốc
  DUCO_HASTE: 0.20,      // đội ta tăng Tốc
  DUCO_BUFF_TURNS: 2,    // số hiệp giảm/tăng Tốc
  RAGE_PVP: 50    // PvP (Tỷ Võ/Luận Kiếm): mỗi lượt đánh thường +50 nộ, không nhận nộ theo sát thương
};

/* ===== Admin chỉnh được: skill.<TÊN> (admin.html → tab "Chiêu thức"). Mỗi tên là 1 hằng số; để trống = giữ số mặc định. ===== */
const SKILL_DEF = Object.assign({}, SKILL_SHARED, HERO_T.skill);   // chung + skillConfig của mọi tướng
Object.assign(window, SKILL_DEF);                                     // tạo biến toàn cục cùng tên để code tuyệt kỹ dùng trực tiếp
cfgOnApply(() => {
  Object.keys(SKILL_DEF).forEach(k => { window[k] = cfgNum('skill.' + k, SKILL_DEF[k]); });
  // Khiên Nguyệt Quang (Hằng Nga): nhập nhầm theo % (70, 15…) thì đổi về tỉ lệ; phản tối đa 70%, đồng đội nhận tối đa 30% sát thương địch gây ra
  const _mn = v => { v = Number(v); if (!isFinite(v) || v < 0) return 0; return v > 1 ? v / 100 : v; };
  window.MOON_REFLECT = Math.min(0.7, _mn(window.MOON_REFLECT));
  window.MOON_TAKE = Math.min(0.3, _mn(window.MOON_TAKE));
});

;
/* === js/battle/auto-battle.js === */
/* TRẬN ĐẤU: chế độ TỰ ĐỘNG
   (tách từ index.html cũ — script) */

   // Lạc Long Quân: +50 nộ & +300% Thủ bản thân cho 2 đồng đội ngẫu nhiên trong 1 hiệp   // Kiều Phong: tổng 350% Công / 3 tầng; chảy máu 3 hiệp, 20% HP hiện tại   // Hoa Mãn Lâu: 7 đòn, mỗi đòn 100% Công

    // ===== TỰ ĐỘNG: tất cả tướng tự đánh thường, đủ nộ (hoặc alwaysUlt) thì tự ulti =====
    let autoMode = (() => { try { return localStorage.getItem('auto_battle') !== '0'; } catch (e) { return true; } })();
    function updateAutoBtn() {
      const b = document.getElementById('btn-auto'); if (!b) return;
      b.innerText = 'Tự Động: ' + (autoMode ? 'BẬT' : 'TẮT');
      b.style.filter = autoMode ? '' : 'grayscale(100%)';
    }
    function toggleAuto() {
      autoMode = !autoMode;
      try { localStorage.setItem('auto_battle', autoMode ? '1' : '0'); } catch (e) {}
      updateAutoBtn();
      if (autoMode) autoStep();
    }
    function autoStep() {
      if (!autoMode) return;
      const tok = battleToken;
      setTimeout(() => {
        if (!autoMode || tok !== battleToken || !isPlayerTurn || busy) return;
        const hs = waveUnits.heroes;
        if (hs.some(h => h.alive && !h.acted && h.rage >= 100 && !ultBlocked(h))) { castAll(); return; }   // ulti đồng loạt
        const i = hs.findIndex(h => h.alive && !h.acted);
        if (i >= 0) heroAct(i, 'normal');                                                  // còn lại đánh thường
        else endTurn();
      }, 350);
    }

;
/* === js/battle/battle-panel.js === */
/* TRẬN ĐẤU: bảng đội hình
   (tách từ index.html cũ — script) */

    // Thanh máu địch (PvE / Giang Hồ) đặt ngay trên đỉnh đầu theo kích thước thật của từng sprite
    function placeEnemyBars() {
      if (pvp) return;
      (waveUnits.enemies || []).forEach(u => {
        try {
          const bar = u.el.querySelector('.bf-hp'), sp = u.el.querySelector('.bf-sprite'); if (!bar || !sp) return;
          const c = sp.firstElementChild || sp, r = c.getBoundingClientRect(), ur = u.el.getBoundingClientRect(); if (!r.height) return;
          bar.style.top = Math.round(r.top - ur.top - 12) + 'px';
        } catch (e) {}
      });
    }
    function refreshPanel() {
      if (pvp) { renderPvpPanel(); return; }
      setTimeout(placeEnemyBars, 60); setTimeout(placeEnemyBars, 500);
      if (bossB) bbtBossBar();
      const hs = waveUnits.heroes;
      let orbs = '', readyCount = 0;
      for (let i = 0; i < 5; i++) {
        const u = hs[i];
        if (!u) { orbs += '<div class="bf-orb empty"></div>'; continue; }
        const can = isPlayerTurn && !busy && u.alive && !u.acted;
        const silenced = isSilenced(u), ready = u.rage >= 100 && !ultBlocked(u);
        if (can && ready) readyCount++;
        orbs += `<div class="bf-orb ${ready && can ? 'ready' : ''} ${u.alive ? '' : 'dead'}" onclick="heroAct(${i},'ult')">${ready ? 'ULTI' : silenced ? '🤐' : u.rage >= 100 ? '🪷' : Math.floor(u.rage) + '%'}</div>`;
      }
      // Chỉ hiện đội của mình (địch có thanh máu ngay trên đầu trong sân). Luôn đủ 5 ô; ô trống là khung chìm.
      const prow = arr => { let r = ''; for (let k = 0; k < 5; k++) r += arr[k] ? pvCard(arr[k], false, true, k) : '<div class="pv-c empty"><div class="pv-cb"><div class="pv-p"></div><div class="pv-st"></div><div class="pv-b"></div><div class="pv-b"></div></div></div>'; return r; };
      document.getElementById('pv-panel').innerHTML = `<div class="pv-row mine">${prow(hs)}</div>`;
      document.getElementById('bf-orbs').innerHTML = orbs;
      const myTurn = isPlayerTurn && !busy;
      document.getElementById('bf-hint').innerText = pvp ? 'TỶ VÕ: ra đòn theo TỐC ĐỘ • tối đa 10 lượt, hết lượt bên gây nhiều sát thương hơn thắng' : (isPlayerTurn && autoMode) ? 'TỰ ĐỘNG: tướng tự đánh & tự ulti' : isPlayerTurn
        ? 'Chạm tướng để đánh thường (+nộ) • chạm cầu khi đầy nộ để ulti'
        : 'Địch đang đánh...';
      const all = document.getElementById('btn-all'), end = document.getElementById('btn-end');
      all.disabled = !(myTurn && readyCount > 0);
      all.innerText = readyCount > 0 ? `Ulti Tất Cả (${readyCount})` : 'Ulti Tất Cả';
      end.disabled = !myTurn;
      updateAutoBtn();
    }

;
/* === pve/pve-start.js === */
/* PVE: bắt đầu trận (startBattleSequence)
   (tách từ index.html cũ — script) */

    function startBattleSequence(stage, battle) {
      if (!team.length) { alert('Chưa có tướng ra trận!\nHãy vào Chiêu Mộ để nhận tướng rồi xếp Đội ngũ.'); return; }
      const staCost = STA_WAVES * STA_PER_WAVE;
      if (!staSpend(staCost)) { alert('⚡ Không đủ thể lực! Cần ' + staCost + ' thể lực (có ' + staState.v + ').\nThể lực hồi 1 mỗi phút, hoặc dùng 💊 Viên Thể Lực trong Túi đồ (bấm vào ô Thể Lực).'); return; }
      battleToken++;
      playBattleOpen();
      currentStage = stage; currentBattle = battle; currentWave = 1;
      busy = false;
      document.getElementById('bf-units').innerHTML = '';
      const sel = teamSel();
      const pos = HERO_POS[Math.min(5, Math.max(1, sel.length))].map(p => [p[0], p[1] + HERO_DY]);
      const _tm = ttMine(); ttSetupUI(_tm, ttFake('pve' + stage));
      waveUnits = {
        heroes: sel.map((h, i) => {
          const s = heroBattleStats(h.id, false, ttBonus(_tm && _tm.pt));
          const u = makeUnit('hero', heroIcon(h), pos[i][0], pos[i][1], s.hp, s.atk, false, h.name);
          u.id = h.id; u.emoji = heroIcon(h); u.def = s.def; u.spd = s.spd; u.dodge = s.dodge; u.acc = s.acc; u.crit = s.crit; u.critDmg = s.critDmg; u.tough = s.tough; u.pierce = s.pierce; u.tia = s.tia || 1; u.block = s.block; u.regen = s.heal || 0; u.sk = skillMult(h.id); u.alwaysUlt = !!h.alwaysUlt; u.taunt = !!h.taunt; u.prio2 = !!h.prio2;
          u.rage = h.startRage || 0; grantStart(u); u.acted = false;
          return u;
        }),
        enemies: []
      };
      document.getElementById('battle-overlay').style.display = 'flex';
      loadWave();
    }

;
/* === pvp/pvp-state.js === */
/* TỶ VÕ (PVP): hằng số, hạng, trạng thái, lực chiến
   (tách từ index.html cũ — script) */

    // ================= TỶ VÕ (PVP XẾP HẠNG) =================
    // • Khiêu chiến KHÔNG GIỚI HẠN lượt • Thắng nhận đốm lửa 🔥 (thua bị trừ), dùng đổi vật phẩm — KHÔNG còn cộng lực chiến / HP / Công / Thủ
    // • Hạng = vị trí trong bảng (có 3 người thì hạng 1-2-3), tài khoản mới xếp tiếp xuống cuối; thắng đối thủ hạng cao hơn thì lên đúng hạng của họ • Đối thủ = NGƯỜI CHƠI THẬT (không có NPC / người ảo)
    const PVP_DAILY = 30, PVP_START_RANK = 1, BASE_POWER = 537647;
    // Admin chỉnh ở admin.html → tab Tỷ Võ (pvp.*): số hiệp, đốm lửa, danh sách vật phẩm đổi
    let PVP_MAX_ROUNDS = 10;
    cfgOnApply(() => { PVP_MAX_ROUNDS = Math.max(1, Math.floor(cfgNum('pvp.rounds', 10))); });
    const PVP_TIERS = [
      { max:1,     icon:'👑', name:'Võ Lâm Minh Chủ' }, { max:10,    icon:'🐉', name:'Tông Sư' },
      { max:100,   icon:'⚔️', name:'Đại Hiệp' },        { max:500,   icon:'🗡️', name:'Cao Thủ' },
      { max:2000,  icon:'🥋', name:'Tinh Anh' },        { max:5000,  icon:'🛡️', name:'Môn Đồ' },
      { max:10000, icon:'🌱', name:'Vô Danh' }
    ];
    const pvpTier = r => PVP_TIERS.find(t => r <= t.max) || PVP_TIERS[PVP_TIERS.length - 1];
    let pvpState = (() => {
      const s = loadJSON('pvp_state');
      return { rank: Math.min(1e9, Math.max(1, Math.floor(s.rank) || PVP_START_RANK)), wins: Math.max(0, Math.floor(s.wins) || 0),
               rt: Number(s.rt) || 0, used: Math.max(0, Math.floor(s.used) || 0), winStart: Number(s.winStart) || 0, flame: Math.max(0, Math.floor(s.flame) || 0), log: Array.isArray(s.log) ? s.log.slice(0, 20) : [] };
    })();
    const pvpSave = () => saveJSON('pvp_state', pvpState);
    function pvpBonus() { return { hp:0, atk:0, def:0 }; }   // Tỷ Võ không còn cộng chỉ số (giữ hàm rỗng cho code cũ nào còn gọi)
    function pvpRefreshWindow() { if (pvpState.used > 0 && Date.now() - pvpState.winStart >= 86400000) { pvpState.used = 0; pvpState.winStart = 0; pvpSave(); } }
    const pvpLeft = () => Infinity;   // PvP không giới hạn lượt
    const fmtClock = ms => { const t = Math.max(0, Math.floor(ms / 1000)); return [Math.floor(t / 3600), Math.floor(t % 3600 / 60), t % 60].map(n => String(n).padStart(2, '0')).join(':'); };
    // Lực chiến ở trang chủ (vàng, dưới Thể Lực) = TỔNG CÔNG của toàn đội đang ra trận
    function teamAtkTotal() { try { return team.reduce((a, id) => a + Math.round(heroStats(id).atk || 0), 0); } catch (e) { return 0; } }
    function updatePower() { const el = document.querySelector('.power-total'); if (el) el.innerText = fmtN(teamAtkTotal()); }
    setInterval(updatePower, 1000);   // đổi đội hình / nâng cấp / đổi trang bị đều tự cập nhật
    const unitPower = s => Math.round(s.hp / 5 + s.atk * 2 + s.def * 3 + (s.pierce || 0) * 2 + (s.crit || 0) * (s.critDmg || 0));
    const pvpMyPower = () => team.reduce((a, id) => a + unitPower(heroStats(id, true)), 0);

    let waveRound = 1;   // số hiệp trong ải thường (Tỷ Võ dùng pvpRound)
    const curRound = () => (typeof pvp !== 'undefined' && pvp) ? pvpRound : waveRound;
    var pvpOpps = [], pvp = null, pvpRound = 0, pvpDmg = { hero: 0, enemy: 0 };   // pvpDmg: tổng sát thương mỗi bên đã gây ra trong trận

    // Tỷ Võ CHỈ có người chơi thật (tài khoản khác đăng nhập đám mây) — không có NPC / người ảo
    function pvpGenOpps() { pvpMixReal(); }
    function openPvp() { if (!pvpOpps.length) pvpGenOpps(); else pvpMixReal(); renderPvp(); switchScreen('pvp'); }

;
/* === pvp/pvp-ranking.js === */
/* TỶ VÕ (PVP): đối thủ người thật, xếp hạng đám mây
   (tách từ index.html cũ — script) */

    // ---- Tỷ Võ: đối thủ là người chơi THẬT (tài khoản khác đăng nhập đám mây), không có NPC ----
    // Đội hình đăng ở Firestore pvp_players/{uid}. Mỗi tài khoản có 1 "khóa xếp hạng" (field rank, số thực).
    // HẠNG HIỂN THỊ = vị trí trong bảng sắp theo khóa (1, 2, 3, ...), nên có 3 người thì hạng là 1-2-3.
    // Tài khoản mới vào: khóa = khóa lớn nhất + 1 => xếp tiếp xuống cuối bảng.
    // Thắng người có hạng cao hơn: chèn lên NGAY TRÊN đối thủ (đối thủ và những người ở giữa tụt 1 hạng). Chỉ ghi vào doc của chính mình.
    const PVP_BOARD_MAX = 500;   // đọc tối đa 500 tài khoản đầu bảng
    let pvpRealSeq = 0;
    function pvpRealFromDoc(d, pos) {
      const x = d.data(), num = v => (typeof v === 'number' && isFinite(v) ? v : 0);
      if (x.locked === true) return null;                   // acc bị admin khóa: không hiện / không đấu
      const stats = (Array.isArray(x.team) ? x.team : []).slice(0, 5).map(m => {
        const h = heroById(m && m.id); if (!h || num(m.hp) <= 0) return null;
        return { h, hp: Math.round(num(m.hp)), atk: Math.round(num(m.atk)), def: Math.round(num(m.def)), spd: num(m.spd) || h.spd, dodge: num(m.dodge), acc: num(m.acc), crit: num(m.crit), critDmg: num(m.critDmg), tough: num(m.tough), pierce: num(m.pierce), tia: Math.max(1, Math.floor(num(m.tia)) || h.tia || 1), block: num(m.block), heal: Math.max(0, Math.round(num(m.heal))), sk: Math.max(1, num(m.sk)), star: Math.max(1, num(m.star)) };
      }).filter(Boolean);
      if (!stats.length) return null;
      return { real: true, beast: (TT_SLUG[x.beast] ? x.beast : ''), pt: Array.isArray(x.pt) ? x.pt.slice(0, 20).filter(p => p && TT_PT.includes(p.n)).map(p => ({ n: p.n, v: num(p.v), pts: !!p.pts })) : [], uid: d.id, rank: pos, steps: 0, heroes: stats.map(s => s.h), stats,
               name: pvCleanName(x.name) || 'Người chơi', lvl: Math.max(1, Math.floor(num(x.lvl)) || 1), power: stats.reduce((a, s) => a + unitPower(s), 0) };
    }
    const pvpKeyOf = d => { const v = d.data().rank; return (typeof v === 'number' && isFinite(v)) ? v : 1e9; };
    // Bảng xếp hạng: [{ id, key, doc }] đã sắp (khóa tăng dần; trùng khóa thì theo uid để ổn định)
    async function pvpFetchBoard() {
      const snap = await clDb.collection('pvp_players').orderBy('rank').limit(PVP_BOARD_MAX).get();
      const arr = []; snap.forEach(d => arr.push({ id: d.id, key: pvpKeyOf(d), doc: d }));
      arr.sort((a, b) => a.key - b.key || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      return arr;
    }
    // Khóa cho tài khoản mới: ngay sau người cuối bảng
    async function pvpNewKey() {
      let mx = 0;
      try { const top = await clDb.collection('pvp_players').orderBy('rank', 'desc').limit(1).get(); top.forEach(d => { const v = d.data().rank; if (typeof v === 'number' && isFinite(v)) mx = Math.max(mx, v); }); } catch (e) {}
      return Math.floor(mx) + 1;
    }
    // Tài khoản cũ đang trùng khóa (vd cùng 10.000): thứ tự tạm theo uid. Người đứng ĐẦU hoặc CUỐI cụm trùng tự tách khóa nhích đi
    // 1 chút (vẫn nằm giữa khóa kế bên) => thứ hạng của mọi người KHÔNG đổi, dần dần hết trùng.
    async function pvpUntie(board) {
      const i = board.findIndex(x => x.id === clUser.uid); if (i < 0) return;
      const K = board[i].key, tiedPrev = i > 0 && board[i - 1].key === K, tiedNext = i + 1 < board.length && board[i + 1].key === K;
      let nk = null;
      if (tiedPrev && !tiedNext) { const next = i + 1 < board.length ? board[i + 1].key : Infinity; nk = next === Infinity ? K + 1e-4 : K + (next - K) / 2; if (!(nk > K && nk < next)) return; }   // cuối cụm: nhích lên
      else if (!tiedPrev && tiedNext) { const prev = i > 0 ? board[i - 1].key : -Infinity; nk = prev === -Infinity ? K - 1e-4 : K - (K - prev) / 2; if (!(nk < K && nk > prev)) return; }   // đầu cụm: nhích xuống
      if (nk === null) return;
      board[i].key = nk;
      await clDb.collection('pvp_players').doc(clUser.uid).set({ rank: nk, rt: Date.now() }, { merge: true });
    }
    async function pvpMixReal() {
      if (typeof clUser === 'undefined' || !clUser || !clDb || !team.length) { pvpOpps = []; try { renderPvp(); } catch (e) {} return; }   // chưa đăng nhập: không có người thật nào để đấu
      const seq = ++pvpRealSeq;
      try {
        await clPublishPvp();                                 // đăng đội hình của mình (tài khoản mới tự xếp cuối bảng)
        if (seq !== pvpRealSeq) return;
        const board = await pvpFetchBoard();
        if (seq !== pvpRealSeq) return;
        await pvpUntie(board);
        pvpApplyBoard(board);
        if (!pvpLiveUnsub) pvpLiveStart();                    // bật theo dõi thời gian thực
      } catch (e) {}
    }
    // Dựng danh sách đối thủ + hạng của mình từ bảng (dùng cho cả lần tải đầu và cập nhật thời gian thực)
    function pvpApplyBoard(board) {
      if (typeof pvp !== 'undefined' && pvp) return;          // đang đánh dở: không đổi đối thủ giữa trận
      board.sort((a, b) => a.key - b.key || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      const me = board.findIndex(x => x.id === clUser.uid);
      if (me >= 0 && pvpState.rank !== me + 1) { pvpState.rank = me + 1; pvpSave(); }
      const P = pvpState.rank, cands = [];
      board.forEach((x, i) => { if (x.id !== clUser.uid) { const o = pvpRealFromDoc(x.doc, i + 1); if (o) cands.push(o); } });
      cands.sort((x, y) => Math.abs(x.rank - P) - Math.abs(y.rank - P) || x.rank - y.rank);
      pvpOpps = cands.slice(0, 5);                            // chỉ người thật, tối đa 5 đối thủ (giao diện có 5 ô)
      try { renderPvp(); } catch (e) {}
    }
    // THỜI GIAN THỰC: nghe thay đổi của bảng khi màn Tỷ Võ đang mở; rời màn thì tự ngắt để đỡ tốn lượt đọc
    let pvpLiveUnsub = null, pvpLiveTimer = 0;
    function pvpLiveStop() { if (pvpLiveUnsub) { try { pvpLiveUnsub(); } catch (e) {} pvpLiveUnsub = null; } clearTimeout(pvpLiveTimer); }
    function pvpLiveStart() {
      pvpLiveStop();
      if (typeof clUser === 'undefined' || !clUser || !clDb) return;
      pvpLiveUnsub = clDb.collection('pvp_players').orderBy('rank').limit(PVP_BOARD_MAX).onSnapshot(snap => {
        const scr = document.getElementById('screen-pvp');
        if (scr && !scr.classList.contains('active')) { pvpLiveStop(); return; }   // đã rời màn Tỷ Võ
        clearTimeout(pvpLiveTimer);
        pvpLiveTimer = setTimeout(() => {                     // gom nhiều thay đổi liên tiếp thành 1 lần vẽ
          const board = []; snap.forEach(d => board.push({ id: d.id, key: pvpKeyOf(d), doc: d }));
          pvpApplyBoard(board);
        }, 300);
      }, () => { pvpLiveUnsub = null; });
    }
    // Sau khi thắng đối thủ đang hạng cao hơn: chèn lên ngay trên đối thủ (khóa nằm giữa người đứng trước đối thủ và đối thủ)
    async function pvpRankCloud(opp) {
      if (typeof clUser === 'undefined' || !clUser || !clDb || !opp || !opp.real) return;
      try {
        const board = await pvpFetchBoard();
        const me = board.findIndex(x => x.id === clUser.uid), op = board.findIndex(x => x.id === opp.uid);
        if (me < 0 || op < 0 || op > me) return;              // đối thủ không còn đứng trên bạn
        const o = board[op], pred = op > 0 ? board[op - 1] : null;
        let key;
        if (!pred) key = o.key - 1;
        else if (o.key - pred.key > 1e-9) key = (pred.key + o.key) / 2;
        else key = o.key - 1e-6;                              // trùng khóa (tài khoản cũ chưa tách): vượt cả cụm
        await clDb.collection('pvp_players').doc(clUser.uid).set({ rank: key, rt: Date.now() }, { merge: true });
      } catch (e) {}
    }
    function pvpReroll() { pvpGenOpps(); renderPvp(); }

;
/* === pvp/pvp-flame.js === */
/* TỶ VÕ (PVP): đổi đốm lửa 🔥 lấy vật phẩm (Bảo Vật)
   Admin chỉnh ở tab Tỷ Võ: pvp.flameWin / flameLose / flameCost (giá chung) và pvp.shop = danh sách vật phẩm đổi được:
     pvp.shop = [ { id: <loại Bảo Vật>, cost?: <giá riêng, bỏ trống = giá chung> }, ... ]   (không có = tất cả Bảo Vật) */

    // ---- Đổi đốm lửa 🔥: thắng +2, thua -1 (không âm); đổi 1 vật phẩm GIỐNG HỆT loại đã chọn (cùng tên, cùng thông số, Lv.0 ★0) ----
    let PVP_FLAME_WIN = 2, PVP_FLAME_LOSE = 1, PVP_FLAME_COST = 10, PVP_SHOP_SHARDS = 5;   // PVP_SHOP_SHARDS: số mảnh Bảo Vật nhận mỗi lần đổi (admin: pvp.shopShards)
    cfgOnApply(() => { PVP_FLAME_WIN = Math.max(0, Math.floor(cfgNum('pvp.flameWin', 2))); PVP_FLAME_LOSE = Math.max(0, Math.floor(cfgNum('pvp.flameLose', 1))); PVP_FLAME_COST = Math.max(1, Math.floor(cfgNum('pvp.flameCost', 10))); PVP_SHOP_SHARDS = Math.max(1, Math.floor(cfgNum('pvp.shopShards', 5))); });
    // Danh sách đổi hiện tại: [{ id, cost }] — chỉ giữ loại Bảo Vật có thật; admin chưa chỉnh / danh sách rỗng = tất cả Bảo Vật
    let pvpShopIsDefault = true;   // true = admin chưa chỉnh (hoặc danh sách admin không có món hợp lệ) -> đang hiện mặc định
    function pvpShopList() {
      const raw = cfgGet('pvp.shop', null), seen = new Set(), out = [];
      if (Array.isArray(raw)) raw.forEach(x => {
        const id = Number(x && x.id); if (!(TS_KINDS.includes(id) || (typeof TS_DEFS !== 'undefined' && TS_DEFS[id])) || seen.has(id)) return;   // chấp nhận cả Bảo Vật mới (id 10–21) nếu có trong TS_DEFS
        seen.add(id); const c = Math.floor(Number(x.cost));
        out.push({ id, cost: (isFinite(c) && c >= 0 && x.cost !== '' && x.cost != null) ? c : PVP_FLAME_COST });
      });
      pvpShopIsDefault = !out.length;
      return out.length ? out : TS_KINDS.map(id => ({ id, cost: PVP_FLAME_COST }));
    }
    function pvpExchange() {
      const f = pvpState.flame || 0;
      const rows = pvpShopList().map(it => {
        const k = it.id, ok = f >= it.cost;
        return `<div class="pv-row-log" style="align-items:center;padding:7px 2px"><span style="display:flex;align-items:center;gap:8px"><span style="width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center">${tsIcon(k)}</span><span><b>${tsName(k)}</b><br><small style="color:#fbbf24">🧩 ${tsShardOf(k)}/${TS_MERGE_COST} mảnh • Đang có: ${tsCount(k)}</small></span></span>` +
          `<button class="btn-attack" style="padding:6px 12px;font-size:13px" ${ok ? '' : 'disabled'} onclick="pvpExchangeDo(${k})">${it.cost}🔥 → +${PVP_SHOP_SHARDS} mảnh</button></div>`;
      }).join('');
      pvShow(pvHead('🔥 Đổi Vật Phẩm', `Đốm lửa: ${f}`) +
        `<div class="set-note">${pvpShopIsDefault ? '<b style="color:#fca5a5">⚠ Đang dùng danh sách mặc định (chưa nhận được danh sách từ admin).</b><br>' : ''}Thắng 1 trận: <b>+${PVP_FLAME_WIN} 🔥</b> • Thua 1 trận: <b>-${PVP_FLAME_LOSE} 🔥</b><br>Dùng đốm lửa đổi <b>mảnh Bảo Vật</b> (không đổi nguyên món). Đủ <b>${TS_MERGE_COST} mảnh</b> cùng loại thì vào Bảo Vật → tab <b>Mảnh Bảo Vật</b> để ghép thành Bảo Vật (Lv.0 ★0).<br>Lưu ý: mỗi khung chỉ gắn được 1 Bảo Vật mỗi loại, không được trùng.</div>` + rows);
    }
    function pvpExchangeDo(kind) {
      const it = pvpShopList().find(x => x.id === kind);
      if (!it || (pvpState.flame || 0) < it.cost) return;
      pvpState.flame -= it.cost; tsShardAdd(kind, PVP_SHOP_SHARDS);   // chỉ nhận MẢNH; Bảo Vật mới phải ghép đủ TS_MERGE_COST mảnh
      pvpSave(); try { tsRefreshOthers(); } catch (e) {}
      pvpExchange();
    }

;
/* === js/core/player-name.js === */
/* TÊN NGƯỜI CHƠI
   (tách từ index.html cũ — script) */

    const pvCleanName = s => String(s || '').replace(/[<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);   // bỏ ký tự nguy hiểm (tên hiện bằng innerHTML)
    const pvName = () => {
      let n = ''; try { n = pvCleanName(localStorage.getItem('player_name')); } catch (e) {}
      if (!n && typeof clUser !== 'undefined' && clUser) n = pvCleanName((clUser.email || '').replace(CL_DOMAIN, ''));   // chưa tự đặt: dùng tên tài khoản
      return n || 'Bạn';
    };
    function applyPlayerName() {
      let custom = ''; try { custom = pvCleanName(localStorage.getItem('player_name')); } catch (e) {}
      const el = document.querySelector('.user-name'); if (!el) return;
      if (custom || (typeof clUser !== 'undefined' && clUser)) el.textContent = pvName();   // chưa đăng nhập & chưa đặt tên: giữ tên mặc định
    }
    function renamePlayer() {
      const v = prompt('Đổi tên hiển thị (trang chủ & Tỷ Võ), 2–16 ký tự:', pvName()); if (v === null) return;
      const n = pvCleanName(v);
      if (n.length < 2) { alert('Tên cần từ 2 ký tự trở lên (không dùng các ký tự < > & dấu nháy).'); return; }
      try { localStorage.setItem('player_name', n); } catch (e) {}
      applyPlayerName();
      try { renderPvp(); } catch (e) {}
      try { if (typeof clPublishPvp === 'function') clPublishPvp().catch(() => {}); } catch (e) {}   // cập nhật tên cho người chơi khác
    }
    applyPlayerName();

;
/* === pvp/pvp-view.js === */
/* TỶ VÕ (PVP): màn hình núi mây, chi tiết đối thủ, chiến tích
   (tách từ index.html cũ — script) */

    const SPOTS = [[50, 15], [19, 29], [81, 37], [26, 54], [76, 65]];     // 5 đối thủ, vị trí như cảnh núi mây
    const ME_SPOT = [50, 82];
    const pvSeq = h => { const c = h && SEQ_IDLE[h.id]; if (!c) return ''; const s = SEQ[c.sheet], ph = Math.round(c.h * 1.55);   // cùng tỉ lệ phóng 1.55 như ảnh thân tĩnh
      return seqAvatarHTML(h.id, Math.round(ph * s.cw / s.ch), 'margin:0 auto -' + Math.round((s.drop || 0) * ph) + 'px'); };
    const pvBody = h => !h ? '❔' : pvSeq(h) ? pvSeq(h) : h.body ? `<img class="pv-body" style="height:${Math.round((h.bodyH || 76) * 1.55)}px" src="${h.body}">` : h.img ? `<img class="pv-body" style="height:118px" src="${h.img}">` : h.emoji;   // tướng đứng nguyên hình (không khung tròn)
    const pvMainOf = stats => stats.reduce((b, x) => unitPower(x) > unitPower(b) ? x : b, stats[0]).h;   // tướng mạnh nhất làm đại diện
    function pvClose() { document.getElementById('pv-modal').style.display = 'none'; }
    function pvShow(html, full) { const m = document.getElementById('pv-modal'); m.classList.toggle('pv-full', !!full); document.getElementById('pv-box').innerHTML = html; m.style.display = 'flex'; }
    function pvHead(title, sub) { return `<div class="hd-head"><div class="hd-info"><div class="hd-name">${title}</div><div class="hd-sub">${sub || ''}</div></div><button class="md-x" onclick="pvClose()">✕</button></div>`; }
    const pvCardL = (h, hp, atk, def) => `<div class="pv-lc"><div class="e">${heroIcon(h)}</div><div class="n">${h.name}</div>HP ${fmtN(hp)}<br>Công ${fmtN(atk)}<br>Thủ ${fmtN(def)}</div>`;
    function renderPvp() {
      const el = document.getElementById('pvp-body'); if (!el) return;
      const st = pvpState, my = pvpMyPower();
      // Sắp xếp từ trên xuống: hạng nhỏ (mạnh nhất) ở trên cùng, hạng lớn dần xuống dưới (gồm cả bản thân)
      const SLOTS = [[50, 26], [22, 41], [78, 41], [24, 61], [76, 61], [50, 82]];   // hạng 2 và 3 cùng hàng; hạng 4 và 5 cùng hàng
      const entries = pvpOpps.slice(0, 5).map((o, i) => ({ me: false, o, i, rank: o.rank }));
      entries.push({ me: true, rank: st.rank });
      entries.sort((x, y) => x.rank - y.rank || (x.me ? 1 : -1));
      const pos = SLOTS.slice(0, entries.length);   // đúng thứ hạng: hạng k đứng ô k (kể cả bản thân)
      const mainId = team.length ? team.reduce((b, id) => unitPower(heroStats(id, true)) > unitPower(heroStats(b, true)) ? id : b, team[0]) : null;
      const me = mainId !== null ? heroById(mainId) : null;
      const spots = entries.map((e, k) => {
        const l = pos[k][0], t = pos[k][1];
        if (e.me) return `<div class="pv-spot me" style="left:${l}%;top:${t}%" onclick="pvpOpenSelf()"><img class="pv-buc" src="giao-dien/buc-may.webp" alt=""><div class="pv-hero full">${pvBody(me)}</div><div class="pv-name">Cấp ${accLevel} ${pvName()}<br>Hạng ${fmtN(st.rank)}</div></div>`;
        const o = e.o, main = pvMainOf(o.stats);
        return `<div class="pv-spot" style="left:${l}%;top:${t}%" onclick="pvpOpen(${e.i})"><img class="pv-buc" src="giao-dien/buc-may.webp" alt=""><div class="pv-hero full" style="animation-delay:${-k * 0.6}s">${pvBody(main)}</div><div class="pv-name">Cấp ${o.lvl} ${o.name}<br>Hạng ${fmtN(o.rank)}</div></div>`;
      }).join('');
      const logged = typeof clUser !== 'undefined' && clUser;
      const note = pvpOpps.length ? '' : `<div style="position:absolute;left:8%;right:8%;top:34%;z-index:5;text-align:center;padding:10px 12px;background:rgba(0,0,0,.6);border:1px dashed #fde047;border-radius:10px;color:#fde68a;font-size:12px;line-height:1.5;pointer-events:none">${logged ? '👤 Chưa có tài khoản nào khác vào Tỷ Võ.<br>Hãy rủ thêm bạn bè đăng nhập đám mây nhé!' : '☁️ Tỷ Võ chỉ đấu với người chơi thật.<br>Hãy đăng nhập tài khoản đám mây để thấy đối thủ.'}</div>`;
      el.innerHTML = spots + note +
        `<div class="pv-info">Lực chiến<b>${fmtN(my)}</b>Đã thắng<b>${st.wins} trận</b></div><button class="pv-log-btn" onclick="pvpShowLog()">Chiến Tích</button>`;
    }
    let pvpSelUid = null;
    // ===== Màn "Thông Tin Thi Đấu": đội hình đối thủ (trên) + đội hình bản thân (dưới), ô cố định như nhau dù có 1 hay 5 tướng =====
    const piRole = id => { const rl = HERO_ROLE[id]; return rl ? `<div class="pi-bd" style="--rc:${ROLE_COLOR[rl]}">${BF_ROLE_BADGE[rl]}</div>` : ''; };
    function piHero(h, star, tip) {   // 1 ô tướng
      const rl = HERO_ROLE[h.id];
      return `<div class="pi-c" style="--rc:${ROLE_COLOR[rl] || '#b45309'}" onclick="scToast('${tip}')"><div class="pi-p">${heroIcon(h)}</div><div class="pi-st">${pvStars(star)}</div>${piRole(h.id)}</div>`;
    }
    const piEmpty = add => `<div class="pi-c empty${add ? ' add' : ''}"${add ? ' onclick="pvClose();openTeam()"' : ''}>${add ? '<span>+</span>' : ''}</div>`;
    const piBeast = name => name && TT_SLUG[name] ? `<div class="pi-c beast" style="--rc:#7c3aed" onclick="scToast('Thần thú ${name}')"><div class="pi-p">${ttImg(name)}</div></div>` : piEmpty(false);
    const piSlots = (cells, beast) => { while (cells.length < 5) cells.push(piEmpty(false)); return `<div class="pi-row">${cells.slice(0, 5).join('')}${beast}</div>`; };
    const piTip = (h, hp, atk, def) => `${h.name}: HP ${fmtN(hp)} • Công ${fmtN(atk)} • Thủ ${fmtN(def)}`;
    const piShell = body => `<div class="pi-wrap"><div class="pi-head"><button class="pi-back" onclick="pvClose()">Trở về</button><div class="pi-title">Thông Tin Thi Đấu</div></div>${body}</div>`;
    const piMine = () => {
      const cells = team.map(id => { const s2 = heroStats(id, true), h = heroById(id); return piHero(h, getProg(id).star, piTip(h, s2.hp, s2.atk, s2.def)); });
      while (cells.length < 5) cells.push(piEmpty(true));
      const tm = ttMine(); return `<div class="pi-row">${cells.slice(0, 5).join('')}${piBeast(tm && tm.beast)}</div>`;
    };
    function pvpOpen(i) {
      const o = pvpOpps[i]; if (!o) return; pvpSelUid = o.uid || null;
      const my = pvpMyPower(), ratio = my ? o.power / my : 9, ot = pvpTier(o.rank), st = pvpState;
      const d = ratio < 0.8 ? ['Dễ', '#4ade80'] : ratio < 1.25 ? ['Vừa', '#fde047'] : ratio < 2.5 ? ['Khó', '#fb923c'] : ['Rất khó', '#f87171'];
      const oc = o.stats.map(x => piHero(x.h, x.star || (START_PROG[x.h.id] || {}).star || 5, piTip(x.h, x.hp, x.atk, x.def)));
      const up = o.rank < st.rank;
      pvShow(piShell(
        `<div class="pi-rib red"><span>ĐỘI HÌNH ĐỐI THỦ</span></div>` +
        `<div class="pi-bar"><span>Cấp ${o.lvl}</span><b>${o.name}</b><i>${ot.icon} ${ot.name}</i><em>Lực chiến ${fmtN(o.power)}</em></div>` +
        piSlots(oc, piBeast(o.beast)) +
        `<div class="pi-rib blue"><span>ĐỘI HÌNH BẢN THÂN</span></div>` + piMine() +
        `<div class="pi-note">Hạng hiện tại: <b>${fmtN(st.rank)}</b>. ${up ? `Chiến thắng sẽ tăng lên hạng <b>${fmtN(o.rank)}</b> - ${ot.icon} ${ot.name}` : 'Đối thủ có hạng thấp hơn hoặc bằng bạn nên chiến thắng không đổi hạng'} • Độ khó: <b style="color:${d[1]}">${d[0]}</b>${o.real ? ' • 👤 Người chơi thật' : ' • Cộng dồn ×' + o.steps}</div>` +
        `<button class="pi-go" ${!team.length ? 'disabled' : ''} onclick="pvpGo(${i})">Bắt Đầu</button>`), true);
    }
    function pvpGo(i) {   // danh sách có thể vừa tự làm mới: tìm lại đúng đối thủ theo uid
      if (pvpSelUid) { const j = pvpOpps.findIndex(x => x.uid === pvpSelUid); if (j < 0) { pvClose(); return scToast('Đối thủ này không còn trong danh sách'); } i = j; }
      pvClose(); startPvp(i);
    }
    function pvpOpenSelf() {
      const st = pvpState, t = pvpTier(st.rank);
      pvShow(piShell(
        `<div class="pi-rib blue"><span>ĐỘI HÌNH BẢN THÂN</span></div>` +
        `<div class="pi-bar"><span>Cấp ${accLevel}</span><b>${pvName()}</b><i>${t.icon} ${t.name}</i><em>Lực chiến ${fmtN(pvpMyPower())}</em></div>` + piMine() +
        `<div class="pi-note">Hạng hiện tại: <b>${fmtN(st.rank)}</b> • Đã thắng <b>${st.wins}</b> trận. Bấm ô <b>+</b> hoặc "Đổi Đội Hình" để sắp xếp tướng ra trận.</div>` +
        `<button class="pi-go" onclick="pvClose();openTeam()">Đổi Đội Hình</button><button class="pi-go alt" onclick="pvClose();renamePlayer()">Đổi Tên</button>`), true);
    }
    function pvpShowTiers() {
      let prev = 0;
      const rows = PVP_TIERS.map(t => { const l = `<div class="pv-row-log"><span>${t.icon} ${t.name}</span><b>${prev + 1 === t.max ? 'hạng ' + t.max : 'hạng ' + (prev + 1) + ' – ' + t.max}</b></div>`; prev = t.max; return l; }).join('');
      const cur = pvpTier(pvpState.rank);
      pvShow(pvHead('🏅 Xếp Hạng Tỷ Võ', `Bạn: hạng ${fmtN(pvpState.rank)} • ${cur.icon} ${cur.name}`) + rows +
        `<div class="set-note" style="margin-top:8px">Bắt đầu ở hạng ${fmtN(PVP_START_RANK)} (thấp nhất). Thắng đối thủ hạng cao hơn sẽ lên đúng hạng của đối thủ.</div>`);
    }
    function pvpShowLog() {
      const st = pvpState, w = st.wins, log = st.log || [];
      const fmtT = t => { const d = new Date(t); return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0') + ' ' + d.getDate() + '/' + (d.getMonth() + 1); };
      pvShow(pvHead('📜 Chiến Tích', `Đã thắng ${w} trận • Hạng ${fmtN(st.rank)}`) +
        `<div class="set-note">🏆 Mỗi trận thắng: <b>+${PVP_FLAME_WIN} 🔥</b> • Thua: <b>-${PVP_FLAME_LOSE} 🔥</b> • Đang có: <b>${st.flame || 0} 🔥</b>.<br>Dùng đốm lửa đổi vật phẩm ở nút Đổi Vật Phẩm.</div>` +
        (log.length ? log.map(e => `<div class="pv-row-log"><span>${e.win ? '✅ Thắng' : '❌ Thua'} ${e.opp} (Hạng ${fmtN(e.rank)})</span><span>${fmtT(e.t)}</span></div>`).join('') : '<div class="eq-empty">Chưa có trận nào.</div>'));
    }

;
/* === pvp/pvp-battle.js === */
/* TỶ VÕ (PVP): trận đấu, đồng hồ, kết thúc
   (tách từ index.html cũ — script) */

    // ---- Panel chiến đấu Tỷ Võ: hàng đội địch (trên) + hàng đội ta (dưới), tướng + sao + máu + nộ + Tốc ----
    // Sao hiển thị luôn 5 ô: ★1-5 = số sao sáng (sao mờ là ô còn thiếu) • ★6-10 = sao lớn thay dần sao nhỏ • ★11-15 = 5 sao lớn, đỏ dần (xem heroStarsHTML)
    function pvStars(star) {
      const b = star > 5 ? Math.min(5, star - 5) : 0;   // số sao lớn → thu nhỏ dần cho vừa thẻ
      return heroStarsHTML(star, { off: true, bigPx: b <= 1 ? 20 : b === 2 ? 17 : b === 3 ? 15 : 13 });
    }
    function pvCard(u, opp, pve, idx) {
      const h = heroById(u.id);
      if (!h && !pve) return '<div class="pv-c"></div>';
      const star = !h ? 0 : opp ? (u.star || (START_PROG[u.id] || {}).star || 5) : getProg(u.id).star;
      const stars = h ? pvStars(star) : '<i style="visibility:hidden">★</i>';
      const portrait = h ? heroIcon(h) : ((u.el.querySelector('.bf-sprite') || {}).innerHTML || '');
      const rl = HERO_ROLE[u.id];
      let cls = opp ? 'opp' : '', click = '';
      if (pve && !opp) {   // PVE: giữ điều khiển — chạm thẻ để đánh thường
        const can = isPlayerTurn && !busy && u.alive && !u.acted;
        cls += ' pve-h' + (can ? ' can' : '') + (u.acted ? ' acted' : '');
        click = ` onclick="heroAct(${idx},'normal')"`;
      }
      // PvE / Giang Hồ: dưới ảnh tướng hiện LỰC CHIẾN của tướng (số vàng) thay vì sao; cầu ulti nằm ở hàng riêng bên dưới (xem refreshPanel)
      const info = pve ? `<div class="pv-pw" style="font-size:${pwFs(fmtN(Math.max(0, u.hp)))}px">${fmtN(Math.max(0, u.hp))}</div>` : `<div class="pv-st">${stars}</div>`;
      return `<div class="pv-c ${cls} ${u.alive ? '' : 'dead'}"${click}><div class="pv-cb" style="border-color:${ROLE_COLOR[rl] || '#b45309'}${rl ? ';--rc:' + ROLE_COLOR[rl] : ''}">${rl ? `<div class="bf-cardic">${BF_ROLE_BADGE[rl]}</div>` : ''}<div class="pv-p">${portrait}</div>${info}` +
        `<div class="pv-b h"><i style="width:${Math.max(0, u.hp / u.max * 100)}%"></i></div><div class="pv-b r"><i style="width:${Math.min(100, u.rage || 0)}%"></i></div></div>${pve ? '' : `<div class="pv-sp">Tốc ${Math.round(u.spd || 0)}</div>`}</div>`;
    }
    const pwFs = s => String(s).length > 11 ? 13 : String(s).length > 9 ? 16 : 19;   // số lực chiến dài thì thu nhỏ chữ cho khỏi tràn ô
    // Luôn đủ 5 ô mỗi hàng (ô trống là khung chìm) => 1 hay 5 tướng khung thẻ vẫn y hệt nhau.
    // Hàng đối thủ (trên): 5 thẻ + khung lực chiến bên phải • Hàng của ta (dưới): khung lực chiến bên trái + 5 thẻ.
    const pvSlots = (arr, opp) => { let r = ''; for (let k = 0; k < 5; k++) r += arr[k] ? pvCard(arr[k], opp) : '<div class="pv-c empty"><div class="pv-cb"><div class="pv-p"></div><div class="pv-st"></div><div class="pv-b"></div><div class="pv-b"></div></div></div>'; return r; };
    const pvSide = (power, name, rank) => `<div class="pv-side"><b style="font-size:${pwFs(fmtN(power))}px">${fmtN(power)}</b><div class="pv-sn"><em>${pvpTier(rank).icon}</em><span>${name}</span></div></div>`;
    function renderPvpPanel() {
      const el = document.getElementById('pv-panel'); if (!el || !pvp) return;
      const H = waveUnits.heroes || [], E = waveUnits.enemies || [], o = pvp.opp;
      el.innerHTML =
        `<div class="pv-row top">${pvSlots(E, true)}${pvSide(o.power, o.name, o.rank)}</div>` +
        `<div class="pv-row bot">${pvSide(pvpMyPower(), pvName(), pvpState.rank)}${pvSlots(H, false)}</div>`;
    }
    function pvpSkip() { battleFast = true; }
    function pvpTimerTick() {
      const el = document.getElementById('pvp-timer'); if (!el) return;
      if (pvpState.used > 0) {
        const rest = pvpState.winStart + 86400000 - Date.now();
        if (rest <= 0) { pvpRefreshWindow(); renderPvp(); return; }
        el.innerHTML = '⏳ Hồi phục sau <b>' + fmtClock(rest) + '</b>';
      } else el.innerHTML = '⏳ Lượt đang đầy';
    }
    setInterval(pvpTimerTick, 1000);

    async function startPvp(i, tower) {   // tower = số tầng Danh Tướng Lầu (giang-ho/giangho.js); bỏ trống = Tỷ Võ thường
      let o = pvpOpps[i]; if (!o) return;
      if (o.real && typeof pvpFreshOpp === 'function') {
        const f = await pvpFreshOpp(o);
        if (!f) { scToast('Đối thủ vừa được cập nhật dữ liệu — đã làm mới danh sách'); try { pvpMixReal(true); } catch (e) {} return; }
        o = pvpOpps[i] = f;
      }
      pvpBegin(o, { tower: tower || 0 });
    }
    // Vào trận với 1 đối thủ cho sẵn (Tỷ Võ, Danh Tướng Lầu, Luận Kiếm...). extra: { tower } hoặc { luan: số trận }
    function pvpBegin(o, extra) {
      if (!team.length) { alert('Hãy chọn Đội ngũ ra trận trước!'); return; }
      battleToken++; playBattleOpen(); battleFast = false;
      pvp = Object.assign({ opp: o, tower: 0 }, extra || {}); pvpRound = 0; pvpDmg = { hero: 0, enemy: 0 }; currentWave = 1; busy = false;
      document.getElementById('bf-units').innerHTML = '';
      const sel = teamSel();
      const pos = HERO_POS[Math.min(5, Math.max(1, sel.length))].map(p => [p[0], p[1] + HERO_DY]);
      const _tm = ttMine(); ttSetupUI(_tm, o.beast ? { beast: o.beast, pt: o.pt || [] } : ttFake(o.name));
      waveUnits = {
        heroes: sel.map((h, k) => {
          const s = heroBattleStats(h.id, true, ttBonus(_tm && _tm.pt));   // Tỷ Võ: chỉ chỉ số cơ bản + trang bị/Bảo Vật/cộng dồn, không lấy số chỉnh trong Cài đặt
          const u = makeUnit('hero', heroIcon(h), pos[k][0], pos[k][1], s.hp, s.atk, false, h.name);
          u.id = h.id; u.emoji = heroIcon(h); u.def = s.def; u.spd = s.spd; u.dodge = s.dodge; u.acc = s.acc; u.crit = s.crit; u.critDmg = s.critDmg; u.tough = s.tough; u.pierce = s.pierce; u.tia = s.tia || 1; u.block = s.block; u.regen = s.heal || 0; u.sk = skillMult(h.id); u.alwaysUlt = !!h.alwaysUlt; u.taunt = !!h.taunt; u.prio2 = !!h.prio2;
          u.rage = h.startRage || 0; grantStart(u); u.acted = false;
          return u;
        }),
        enemies: []
      };
      document.getElementById('battle-overlay').style.display = 'flex';
      loadWave();
    }
    function loadPvpWave() {
      const tok = battleToken, o = pvp.opp;
      document.getElementById('ui-stage-title').innerText = pvp.luan ? `Luận Kiếm • Trận ${pvp.luan}` : pvp.tower ? `Danh Tướng Lầu • Tầng ${pvp.tower} • ${o.name}` : `Tỷ Võ • ${o.name} (Hạng ${fmtN(o.rank)})`;
      document.getElementById('ui-wave-title').innerText = 'Hiệp 0/' + PVP_MAX_ROUNDS;
      document.getElementById('ui-enemy-name').innerText = o.heroes.map(h => h.name.toUpperCase()).join(' • ');
      waveUnits.enemies.forEach(e => e.el.remove());
      const S = HERO_POS[pvp.luan ? Math.min(5, Math.max(1, o.stats.length)) : 5].map(p => [100 - p[0], p[1] + HERO_DY]);   // Luận Kiếm: 3–5 Boss đứng theo đội hình đúng số lượng
      waveUnits.enemies = o.stats.map((x, i) => {
        const h = x.h, u = makeUnit('enemy', heroIcon(h), S[i][0], S[i][1], x.hp, x.atk, false, h.name);
        u.id = h.id; u.isHero = true; u.def = x.def; u.spd = x.spd !== undefined ? x.spd : h.spd; u.dodge = x.dodge !== undefined ? x.dodge : h.dodge; u.acc = x.acc !== undefined ? x.acc : (h.acc || 0); u.crit = x.crit || 0; u.critDmg = x.critDmg || 0; u.tough = x.tough || 0; u.pierce = x.pierce || 0; u.tia = Math.max(1, Math.floor(x.tia || h.tia || 1)); u.block = x.block || 0; u.regen = x.heal || 0; u.sk = x.sk || 1; if (x.star) u.star = x.star;
        u.alwaysUlt = !!h.alwaysUlt; u.taunt = !!h.taunt; u.prio2 = !!h.prio2; u.rage = h.startRage || 0; grantStart(u);
        return u;
      });
      waveUnits.heroes.forEach(h => {
        h.acted = false; h.stun = 0; h.bleed = 0; h.bleedPct = 0; clearDebuffs(h); grantStart(h); h.el.classList.remove('stunned');
        h.el.querySelectorAll('.bf-stun, .bf-bleed').forEach(ic => ic.remove());
      });
      clearDefBuff(waveUnits.heroes);
      busy = true; isPlayerTurn = false; pvpRound = 0;
      refreshPanel();
      setTimeout(() => { if (tok === battleToken) pvpBattleLoop(tok); }, 800);
    }

    // Tỷ Võ: mỗi hiệp mọi tướng (cả 2 bên) ra đòn lần lượt từng con theo TỐC ĐỘ giảm dần.
    // Cùng tốc: bên nào tổng lực chiến cao hơn đánh trước (bằng nhau thì bên ta); cùng bên cùng tốc thì theo thứ tự khung.
    function pvpOrder() {
      const myP = pvpMyPower(), opP = pvp.opp.power, heroFirst = myP >= opP;
      const all = [...waveUnits.heroes.map((u, i) => ({ u, side: 0, i })), ...waveUnits.enemies.map((u, i) => ({ u, side: 1, i }))].filter(x => x.u.alive);
      return all.sort((a, b) => (b.u.spd || 0) - (a.u.spd || 0)
        || (a.side !== b.side ? (heroFirst ? a.side - b.side : b.side - a.side) : a.i - b.i)).map(x => x.u);
    }
    async function pvpBattleLoop(tok) {
      const H = waveUnits.heroes, E = waveUnits.enemies, dead = arr => arr.every(u => !u.alive);
      const ended = () => {
        if (dead(H)) { loseBattle(); return true; }
        if (dead(E)) { nextWave(); return true; }
        return false;
      };
      while (tok === battleToken) {
        if (++pvpRound > PVP_MAX_ROUNDS) { pvpTimeout(); return; }
        document.getElementById('ui-wave-title').innerText = `Hiệp ${pvpRound}/${PVP_MAX_ROUNDS}`;
        clearDefBuff(H); clearDefBuff(E); tickMoon(H); tickMoon(E); tickLB(H); tickLB(E); tickDebuffs(H); tickDebuffs(E);
        if (pvpRound > 1) { tickImmortal(H); tickImmortal(E); }
        const bl = (await tickBleed(E)) | (await tickBleed(H));
        if (tok !== battleToken) return;
        if (bl) { await sleep(500); if (tok !== battleToken) return; }
        if (ended()) return;
        for (const u of pvpOrder()) {
          if (tok !== battleToken) return;
          if (!u.alive) continue;
          const mine = H.includes(u), foes = mine ? E : H;
          if (u.stun > 0) {
            u.stun--; floatText(u, 'CHOÁNG');
            if (u.stun === 0) { const ic = u.el.querySelector('.bf-stun'); if (ic) ic.remove(); u.el.classList.remove('stunned'); }
            await sleep(300); continue;
          }
          if ((u.alwaysUlt || u.rage >= 100) && !ultBlocked(u)) { u.rage = u.alwaysUlt ? 100 : 0; await ultimate(u, tok); }
          else { gainRage(u, RAGE_PVP); await normalAttack(u, foes, tok); }   // PvP: +50 nộ mỗi lượt đánh thường (đầu trận 100 → ulti → 0 → hiệp 2: 50 → hiệp 3: 100 → hiệp 4 ulti)
          if (tok !== battleToken) return;
          refreshPanel();
          await sleep(250); if (tok !== battleToken) return;
          if (ended()) return;
        }
        // hết hiệp (2 bên đã ra đòn xong): mọi tướng còn sống hồi máu theo chỉ số hồi máu
        [...H, ...E].forEach(u => { if (u.alive && u.regen) heal(u, u.regen); });
      }
    }
    function pvpTimeout() {          // hết 10 lượt chưa phân thắng bại: bên gây nhiều sát thương hơn thắng
      const f = a => a.reduce((x, u) => x + Math.max(0, u.hp), 0) / a.reduce((x, u) => x + u.max, 0);
      let win;
      if (pvpDmg.hero !== pvpDmg.enemy) win = pvpDmg.hero > pvpDmg.enemy;
      else win = f(waveUnits.heroes) > f(waveUnits.enemies);   // hòa sát thương: xét % máu còn lại, vẫn hòa thì tính thua
      pvpFinish(win, true);
    }
    function pvpFinish(win, timeout) {
      const m = pvp, dmgLine = timeout ? `\nSát thương: bạn ${fmtN(pvpDmg.hero)} • đối thủ ${fmtN(pvpDmg.enemy)}` : '';
      closeBattle();
      if (m.luan) { luanFinish(m, win, timeout); return; }   // Luận Kiếm (giang-ho/luan-kiem.js)
      if (m.tower) { ghTowerFinish(m, win, timeout); return; }   // Danh Tướng Lầu: không đổi hạng / không cộng chiến tích Tỷ Võ
      try { pvpState.log.unshift({ t: Date.now(), win: !!win, opp: m.opp.name, rank: m.opp.rank }); pvpState.log.length = Math.min(pvpState.log.length, 20); pvpSave(); } catch (e) {}
      let msg, rankP = null;
      if (win) {
        const old = pvpState.rank;
        pvpState.wins++; pvpState.flame = (pvpState.flame || 0) + PVP_FLAME_WIN;
        // đối thủ hạng cao hơn: bạn chèn lên ngay trên họ, nhận đúng hạng của họ (họ và người ở giữa tụt 1 hạng)
        const newRank = m.opp.rank < pvpState.rank ? m.opp.rank : (m.opp.rank === pvpState.rank ? Math.max(1, pvpState.rank - 1) : pvpState.rank);
        if (newRank < pvpState.rank) { pvpState.rank = newRank; pvpState.rt = Date.now(); rankP = pvpRankCloud(m.opp); }
        pvpSave(); updatePower();
        msg = `🏆 THẮNG${timeout ? ' (hết ' + PVP_MAX_ROUNDS + ' lượt, gây nhiều sát thương hơn)' : ''}!\n\n` + (pvpState.rank < old ? `Hạng ${fmtN(old)} → ${fmtN(pvpState.rank)} (${pvpTier(pvpState.rank).icon} ${pvpTier(pvpState.rank).name})\n` : `Giữ vững hạng ${fmtN(old)}\n`) +
          `🔥 +${PVP_FLAME_WIN} đốm lửa (có ${pvpState.flame})`;
      } else {
        const had = pvpState.flame || 0; pvpState.flame = Math.max(0, had - PVP_FLAME_LOSE); pvpSave();
        msg = `💀 THUA${timeout ? ' (hết ' + PVP_MAX_ROUNDS + ' lượt, gây ít sát thương hơn)' : ''}!\nKhông mất hạng, cứ khiêu chiến lại (không giới hạn lượt).\n🔥 ${had > 0 ? '-' + PVP_FLAME_LOSE + ' đốm lửa' : 'Chưa có đốm lửa để trừ'} (còn ${pvpState.flame})`;
      }
      renderPvp(); renderHomeTeam();
      Promise.resolve(rankP).then(() => pvpGenOpps());   // đợi ghi hạng xong rồi mới tải lại bảng
      pvpToast(msg + dmgLine, win, { pvp: true, foe: m.opp && m.opp.name });   // Tỷ Võ: báo bên thắng
    }
    // Thông báo tự tắt (không cần bấm OK), kết quả đã được ghi nhận ngay
    function pvpToast(msg, win, opt) {
      if (typeof notifyResult === 'function') { notifyResult(msg, win, opt); return; }   // khung rồng (js/ui/notify.js)
      let t = document.getElementById('pvp-toast');
      if (!t) {
        t = document.createElement('div'); t.id = 'pvp-toast';
        t.style.cssText = 'position:fixed;left:50%;top:14%;transform:translateX(-50%);z-index:99999;max-width:min(92vw,420px);padding:12px 16px;border-radius:12px;font-size:13px;line-height:1.5;color:#fff;white-space:pre-line;text-align:center;pointer-events:none;box-shadow:0 6px 24px rgba(0,0,0,.6);transition:opacity .4s';
        document.body.appendChild(t);
      }
      t.style.background = win ? 'linear-gradient(#14532d,#052e16)' : 'linear-gradient(#7f1d1d,#450a0a)';
      t.style.border = '2px solid ' + (win ? '#fde047' : '#f87171');
      t.innerHTML = String(msg).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/🔮/g, danIcoHTML('Thần Đan', '1.1em')).replace(/🔴/g, danIcoHTML('Tiên Đan', '1.1em')).replace(/🔨/g, icoImg('hammer', '1.2em')); t.style.opacity = '1';
      clearTimeout(t._h); t._h = setTimeout(() => { t.style.opacity = '0'; }, 3500);
    }

;
/* === giang-ho/luan-kiem.js === */
/* GIANG HỒ — LUẬN KIẾM
   Đánh Boss máy KHÔNG giới hạn trận. Mỗi lần khiêu chiến = 1 trận với 3–5 Boss (ngẫu nhiên trong khoảng admin đặt).
   Thắng 1 trận: nhận 3 MẢNH BẢO VẬT ngẫu nhiên (mỗi mảnh 1 loại Bảo Vật bất kỳ, trùng thì cộng dồn), trận sau TẤT CẢ thông số Boss tăng thêm 15% (cộng dồn).
   Độ khó (số trận đã qua) tự làm mới lúc 5:00 sáng hằng ngày.
   Dùng lại bộ máy trận của Tỷ Võ: pvpBegin() trong pvp/pvp-battle.js, kết thúc ở luanFinish() (gọi từ pvpFinish khi pvp.luan > 0).
   Admin chỉnh ở admin.html → tab Luận Kiếm (cấu hình `luan.*`):
     on (1/0) • resetHour (giờ làm mới) • bossMin / bossMax • growth (% tăng mỗi trận) • hp / atk / def (Boss trận 1)
     shardCount (số mảnh Bảo Vật ngẫu nhiên mỗi trận thắng, mặc định 3) • gradeWeights: { bậc A…SSS: trọng số } (trống = mặc định, 0 = không rơi)
   Ảnh nền: giang-ho/luan-kiem-bg.webp • ảnh Bảo Vật: TS_IMG */

    const luanInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(Number(v)) || lo));
    const luanRand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const luanOn = () => cfgNum('luan.on', 1) !== 0;
    const luanResetHour = () => luanInt(cfgNum('luan.resetHour', 5), 0, 23);
    const luanGrowth = () => Math.max(0, cfgNum('luan.growth', 15)) / 100;           // 0.15 = +15% mỗi trận thắng
    const luanMult = lv => Math.pow(1 + luanGrowth(), Math.max(0, lv - 1));
    function luanBossRange() { let a = luanInt(cfgNum('luan.bossMin', 3), 1, 5), b = luanInt(cfgNum('luan.bossMax', 5), 1, 5); if (b < a) [a, b] = [b, a]; return [a, b]; }
    const luanShardCount = () => luanInt(cfgNum('luan.shardCount', 3), 1, 30);   // số mảnh Bảo Vật rơi mỗi trận thắng
    const luanEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const luanIsImg = s => /\.(webp|png|jpe?g|svg|gif)(\?.*)?$/i.test(s || '');
    const luanIco = (s, px) => luanIsImg(s) ? `<img src="${luanEsc(s)}" alt="" style="height:${px || 28}px;width:auto;vertical-align:middle">` : luanEsc(s || '🎁');
    const luanIcoGift = s => luanIsImg(s) ? `<img src="${luanEsc(s)}" alt="" style="height:1.4em;width:auto;vertical-align:middle">` : (s || '🎁');

    // ---- Trạng thái (lưu theo máy): ngày (tính mốc giờ làm mới), trận kế tiếp, đội Boss, kết quả gần nhất ----
    function luanDayKey(t) { const d = new Date((t || Date.now()) - luanResetHour() * 3600000); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
    let luanState = (() => {
      const s = loadJSON('luan_state') || {};
      return { k: s.k || '', lv: Math.max(1, Math.floor(s.lv) || 1), wins: Math.max(0, Math.floor(s.wins) || 0), best: Math.max(0, Math.floor(s.best) || 0),
               boss: Array.isArray(s.boss) ? s.boss.filter(Number.isInteger) : [], last: s.last || null };
    })();
    const luanSave = () => saveJSON('luan_state', luanState);
    // sang ngày mới (qua giờ làm mới) -> độ khó về trận 1. Trả true nếu vừa làm mới.
    function luanSync() {
      const k = luanDayKey();
      if (luanState.k === k) return false;
      luanState = { k, lv: 1, wins: 0, best: 0, boss: [], last: null }; luanSave(); return true;
    }
    function luanEnsureBoss() {
      const ids = HEROES.map(h => h.id);
      if (luanState.boss.length && luanState.boss.every(id => ids.includes(id))) return;
      const [a, b] = luanBossRange(), n = Math.min(luanRand(a, b), ids.length);
      for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
      luanState.boss = ids.slice(0, n); luanSave();
    }
    // Chỉ số Boss ở trận lv: HP/Công/Thủ gốc (admin) × (1+growth)^(lv-1); mọi thông số khác của tướng cũng nhân cùng hệ số
    function luanStats(lv) {
      const m = luanMult(lv), r1 = v => Math.round(v * 10) / 10;
      const hp = Math.max(1, cfgNum('luan.hp', 100000)), atk = Math.max(1, cfgNum('luan.atk', 8000)), def = Math.max(0, cfgNum('luan.def', 3000));
      return luanState.boss.map(id => {
        const h = heroById(id), b = Object.assign({}, h, HERO_DEFAULTS[id]), sc = v => r1((Number(v) || 0) * m);
        return { h, hp: Math.round(hp * m), atk: Math.round(atk * m), def: Math.round(def * m), spd: sc(b.spd), dodge: sc(b.dodge), acc: sc(b.acc), crit: sc(b.crit), critDmg: sc(b.critDmg),
                 tough: sc(b.tough), pierce: sc(b.pierce), block: Math.min(100, sc(b.block)), heal: sc(b.heal), tia: Math.max(1, Math.floor(b.tia || 1)), sk: 1, star: 5 };
      });
    }
    function luanOpp(lv) {
      const stats = luanStats(lv);
      return { name: 'Boss Luận Kiếm', lvl: lv, rank: 1, uid: null, real: false, heroes: stats.map(x => x.h), stats, power: stats.reduce((a, x) => a + unitPower(x), 0), beast: null };
    }

    const LUAN_GRADE_W_DEF = { 'A': 30, 'A+': 25, 'S': 20, 'S+': 12, 'SS': 8, 'SS+': 4, 'SSS': 1 };   // trọng số mặc định từng bậc (bậc cao hiếm hơn)
    // ---- Phần thưởng mỗi trận thắng: luanShardCount() (mặc định 3) MẢNH Bảo Vật, mỗi mảnh rơi ngẫu nhiên 1 loại trong toàn bộ Bảo Vật (trùng loại thì cộng dồn) ----
    function luanRollRewards() {
      const kinds = TS_KINDS.filter(k => TS_DEFS[k]), c = luanShardCount(), got = {};
      if (!kinds.length) return [];
      // Rơi theo BẬC (phẩm chất A…SSS): bốc bậc theo trọng số admin (luan.gradeWeights.<bậc>, trống = mặc định, 0 = không rơi), rồi bốc đều 1 Bảo Vật trong bậc đó. Bậc chưa có Bảo Vật nào thì bỏ qua.
      const W = cfgGet('luan.gradeWeights', {}) || {}, wt = gr => { const v = W[gr] === '' || W[gr] == null ? LUAN_GRADE_W_DEF[gr] : Number(W[gr]); return isFinite(v) && v >= 0 ? v : LUAN_GRADE_W_DEF[gr]; };
      const byGr = {}; kinds.forEach(k => (byGr[tsGradeOf(k)] = byGr[tsGradeOf(k)] || []).push(k));
      let grs = TS_GRADES.filter(gr => byGr[gr] && wt(gr) > 0); if (!grs.length) grs = TS_GRADES.filter(gr => byGr[gr]);   // tất cả = 0 → rơi đều theo bậc
      const total = grs.reduce((s, gr) => s + (wt(gr) > 0 ? wt(gr) : 1), 0);
      for (let i = 0; i < c; i++) {
        let r = Math.random() * total, gr = grs[grs.length - 1];
        for (const x of grs) { r -= (wt(x) > 0 ? wt(x) : 1); if (r < 0) { gr = x; break; } }
        const k = byGr[gr][Math.floor(Math.random() * byGr[gr].length)];
        (got[k] = got[k] || { id: k, name: 'Mảnh ' + TS_DEFS[k].name, ico: (typeof TS_IMG !== 'undefined' && TS_IMG[k]) || '🧩', n: 0 }).n += 1;
      }
      return Object.values(got);
    }

    // ---- Màn hình ----
    function openLuanKiem() {
      if (!luanOn()) { try { scToast('Luận Kiếm đang đóng'); } catch (e) { alert('Luận Kiếm đang đóng'); } return; }
      luanSync(); luanEnsureBoss(); luanRender(); switchScreen('luankiem');
    }
    function luanRender() {
      const el = document.getElementById('luan-body'); if (!el) return;
      luanSync(); luanEnsureBoss();
      const st = luanState, lv = st.lv, pct = Math.round((luanMult(lv) - 1) * 1000) / 10, stats = luanStats(lv), [b1, b2] = luanBossRange();
      const cards = stats.map(x => `<div class="luan-bc"><div class="luan-bp">${heroIcon(x.h)}</div><div class="luan-bn">${luanEsc(x.h.name)}</div><div class="luan-bs">HP ${fmtN(x.hp)}<br>Công ${fmtN(x.atk)}</div></div>`).join('');
      const pool = `<span class="luan-it" title="Mảnh Bảo Vật">🧩<small>Mảnh Bảo Vật (ngẫu nhiên)</small></span>`;
      let last = '';
      if (st.last) {
        last = st.last.win
          ? `<div class="luan-last win">🏆 Thắng trận ${st.last.lv}: ${(st.last.items || []).map(r => `<span class="luan-it">${luanIco(r.ico, 22)}<small>${luanEsc(r.name)} ×${fmtN(r.n)}</small></span>`).join('')}</div>`
          : `<div class="luan-last lose">💀 Thua trận ${st.last.lv} — cứ khiêu chiến lại (không giới hạn lượt).</div>`;
      }
      el.innerHTML =
        `<div class="luan-top"><div class="luan-lv">Trận <b>${lv}</b></div><div class="luan-sub">${stats.length} Boss • Chỉ số Boss <b>+${pct}%</b>${lv > 1 ? ' (đã thắng ' + (lv - 1) + ' trận)' : ''}</div></div>` +
        `<div class="luan-bosses">${cards}</div>` +
        `<div class="luan-bot">${last}<div class="luan-rwt">🧩 Thắng mỗi trận nhận ${luanShardCount()} Mảnh Bảo Vật ngẫu nhiên</div><div class="luan-pool">${pool}</div>` +
        `<button class="luan-go" onclick="luanStart()">⚔️ Khiêu Chiến</button>` +
        `<div class="luan-reset" id="luan-reset"></div><div class="luan-hint">Thắng → Boss mạnh thêm ${Math.round(luanGrowth() * 1000) / 10}% (số Boss ${b1 === b2 ? b1 : b1 + '–' + b2}). Độ khó làm mới lúc ${luanResetHour()}:00 hằng ngày.</div></div>`;
      luanTick();
    }
    function luanTick() {
      const scr = document.getElementById('screen-luankiem'); if (!scr || !scr.classList.contains('active')) return;
      if (luanState.k !== luanDayKey()) { luanRender(); return; }   // vừa qua giờ làm mới -> về trận 1
      const n = new Date(); n.setHours(luanResetHour(), 0, 0, 0); if (n.getTime() <= Date.now()) n.setDate(n.getDate() + 1);
      const e = document.getElementById('luan-reset'); if (e) e.innerHTML = '⏳ Làm mới độ khó sau <b>' + fmtClock(n.getTime() - Date.now()) + '</b>';
    }
    setInterval(luanTick, 1000);

    function luanStart() {
      if (!luanOn()) return;
      luanSync(); luanEnsureBoss();
      pvpBegin(luanOpp(luanState.lv), { luan: luanState.lv });
    }
    // Gọi từ pvpFinish (pvp-battle.js) sau closeBattle()
    function luanFinish(m, win, timeout) {
      const wasLv = m.luan, sameDay = !luanSync() && luanState.lv === wasLv;   // qua giờ làm mới giữa trận -> kết quả không tính
      let msg;
      if (!sameDay) msg = 'Đã qua giờ làm mới (' + luanResetHour() + ':00) — độ khó đã về trận 1.';
      else if (win) {
        const rw = luanRollRewards();
        try { rwGrantAll(rw.map(r => ({ t: 'tsshard', id: r.id, n: r.n }))); } catch (e) { console.warn('luan reward', e); }
        luanState.wins++; luanState.best = Math.max(luanState.best, wasLv); luanState.lv = wasLv + 1; luanState.boss = [];
        luanState.last = { win: true, lv: wasLv, items: rw }; luanSave(); luanEnsureBoss();
        msg = `🏆 THẮNG Trận ${wasLv}${timeout ? ' (hết ' + PVP_MAX_ROUNDS + ' lượt, gây nhiều sát thương hơn)' : ''}!\n` + rw.map(r => '🧩 ' + r.n + ' ' + r.name).join(' • ') + `\nTrận ${wasLv + 1}: Boss mạnh thêm ${Math.round((luanMult(wasLv + 1) - 1) * 1000) / 10}% so với gốc`;
      } else {
        luanState.last = { win: false, lv: wasLv }; luanSave();
        msg = `💀 THUA Trận ${wasLv}${timeout ? ' (hết ' + PVP_MAX_ROUNDS + ' lượt, gây ít sát thương hơn)' : ''}!\nKhông mất gì, cứ khiêu chiến lại (không giới hạn lượt).`;
      }
      try { switchScreen('luankiem'); } catch (e) {}
      luanRender();
      try { pvpToast(msg, win && sameDay, sameDay ? { pvp: true, foe: 'Boss Luận Kiếm' } : undefined); } catch (e) {}   // báo bên thắng (khung rồng); qua giờ làm mới thì chỉ báo thường
    }

;
/* === pve/pve-enemies.js === */
/* PVE: kho địch (khủng long, tướng làm địch), ảnh nền
   (tách từ index.html cũ — script) */

    // Địch = tướng ngẫu nhiên; boss = khủng long ngẫu nhiên
    const DINOS = [['🦖','Khủng Long Bạo Chúa',0],['🦕','Khủng Long Cổ Dài',0],['🦖','Khủng Long Tím',120],['🦕','Khủng Long Lam',200]];
    const dinoIcon = d => d[2] ? `<span style="display:inline-block;filter:hue-rotate(${d[2]}deg)">${d[0]}</span>` : d[0];
    const shuffled = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    // Kho tướng làm địch (PvE trận 1/2/4 & Tỷ Võ): LẤY TỪ HEROES mỗi lần tạo trận nên tướng mới thêm vào tự có mặt.
    // Đặt true nếu muốn loại các tướng gắn noEnemy (chiêu quá mạnh) khỏi PvE.
    const PVE_SKIP_NOENEMY = false;
    const enemyPool = () => HEROES.filter(h => !(PVE_SKIP_NOENEMY && h.noEnemy));
    // ===== ĐỊCH PVE (admin chỉnh ở admin-config.html → tab "Địch PVE" → GAME_CFG.foe) =====
    // hp/atk/def/dodge: chỉ số nền của tướng địch • growth: nhân HP & Công mỗi Bàn (Bàn k nhân growth^(k−1)) • bossMult: nhân thêm cho Trận 4 (boss)
    // counts: số tướng địch ở Trận 1..4 • rules: [{from,to,c:[t1,t2,t3,t4]}] = ghi đè số tướng cho Bàn from..to (đếm liên tục: Ải a Bàn b = (a−1)*10+b; ô trống = giữ mặc định)
    var FOE_CFG = cfgSnap('foe', { hp: 1000, atk: 200, def: 30, dodge: 0, growth: 1.32, bossMult: 1.2, counts: [2, 3, 4, 5], rules: [] });
    Object.assign(FOE_CFG, cfgGet('foe', {}));
    const foeNum = (v, d) => { v = Number(v); return (isFinite(v) && v > 0) ? v : d; };
    // Số tướng địch ở trận `wave` (1..4) của Bàn thứ `B` (đếm liên tục). Tối thiểu 1, tối đa 5 (đội hình chỉ có 5 vị trí).
    function foeCount(B, wave) {
      const dc = [2, 3, 4, 5][wave - 1], base = Array.isArray(FOE_CFG.counts) ? foeNum(FOE_CFG.counts[wave - 1], dc) : dc;
      let n = base;
      (Array.isArray(FOE_CFG.rules) ? FOE_CFG.rules : []).forEach(r => {
        if (!r || !Array.isArray(r.c)) return;
        const from = foeNum(r.from, 1), to = foeNum(r.to, Infinity);
        if (B >= from && B <= to) n = foeNum(r.c[wave - 1], n);
      });
      return Math.max(1, Math.min(5, Math.floor(n), enemyPool().length));
    }
    // n tướng ngẫu nhiên (không trùng) làm địch, chỉ số theo ải
    function heroFoes(n, k) {
      const picks = shuffled(enemyPool()).slice(0, n), S = HERO_POS[n].map(p => [100 - p[0], p[1] + HERO_DY]);
      return { picks, foes: picks.map((h, i) => {
        const u = makeUnit('enemy', heroIcon(h), S[i][0], S[i][1], foeNum(FOE_CFG.hp, 1000) * k, foeNum(FOE_CFG.atk, 200) * k, false, h.name);
        u.id = h.id; u.isHero = true;
        u.def = Math.max(0, Number(FOE_CFG.def) || 0); u.spd = h.spd; u.dodge = Math.max(0, Number(FOE_CFG.dodge) || 0); u.acc = 300; u.crit = h.crit || 0; u.critDmg = h.critDmg || 0; u.tough = h.tough || 0; u.pierce = h.pierce || 0; u.tia = Math.max(1, Math.floor(h.tia || 1)); u.block = h.block || 0; u.sk = 1;     // skill cấp 1, không cộng cấp/sao
        u.alwaysUlt = !!h.alwaysUlt; u.taunt = !!h.taunt; u.prio2 = !!h.prio2; u.rage = h.startRage || 0; grantStart(u);
        return u;
      }) };
    }

    // ===== Ảnh nền trận đấu: random mỗi trận (ải thường & Tỷ Võ), không lặp liền nhau =====
    const BATTLE_BGS = [];   // đã xóa ảnh nền trận đấu
    let lastBgIdx = -1;
    function setBattleBg() {
      try {
        const f = document.getElementById('battle-arena'); if (!f || !BATTLE_BGS.length) return;
        let i; do { i = Math.floor(Math.random() * BATTLE_BGS.length); } while (BATTLE_BGS.length > 1 && i === lastBgIdx);
        lastBgIdx = i;
        f.classList.add('has-bg');
        f.style.backgroundImage = 'linear-gradient(rgba(0,0,0,.18),rgba(0,0,0,.38)), url(' + BATTLE_BGS[i] + ')';
      } catch (e) {}
    }

;
/* === pve/pve-battle.js === */
/* PVE: vòng lặp trận (loadWave, enemyTurn, nextWave, closeBattle)
   (tách từ index.html cũ — script) */

    function loadWave() {
      setBattleBg();
      document.getElementById('battle-overlay').classList.toggle('pvp-mode', !!pvp);
      if (pvp) { loadPvpWave(); return; }
      if (bossB) { loadBossWave(); return; }
      if (ghB) { ghLoadWave(); return; }   // Hang Tụ Linh (giang-ho/giangho.js)
      const tok = battleToken;
      document.getElementById('ui-stage-title').innerText = `Ải ${currentStage} - Bàn ${currentBattle}`;
      document.getElementById('ui-wave-title').innerText = `Trận ${currentWave}/4`;
      waveUnits.enemies.forEach(e => e.el.remove());

      const B = (currentStage - 1) * 10 + currentBattle;
      mult = Math.pow(foeNum(FOE_CFG.growth, 1.32), B - 1);
      const m2 = mult * foeNum(FOE_CFG.bossMult, 1.2);

      {
        // Số tướng địch mỗi trận mặc định 2/3/4/5 (Trận 4 = boss); admin đổi được theo từng Bàn (foeCount trong pve-enemies.js)
        const n = foeCount(B, currentWave);
        const r = heroFoes(n, currentWave === 4 ? m2 : mult); lccAddSoldiers(r, currentWave === 4 ? m2 : mult);   // 2 tướng địch → thêm 3 Lính Cầm Cờ cho đủ 5
        waveUnits.enemies = r.foes;
        document.getElementById('ui-enemy-name').innerText = (currentWave === 4 ? 'BOSS: ' : '') + r.picks.map(h => h.name.toUpperCase()).join(' • ');
      }
      waveRound = 1;
    // Quân ta đánh trước: sang trận mới thì hồi lại lượt cho cả đội, xóa choáng / chảy máu / buff cũ
      waveUnits.heroes.forEach(h => {
        h.acted = false; h.stun = 0; h.bleed = 0; h.bleedPct = 0; clearDebuffs(h); clearMods(h); grantStart(h);
        h.el.classList.remove('stunned');
        h.el.querySelectorAll('.bf-stun, .bf-bleed').forEach(ic => ic.remove());
      });
      clearDefBuff(waveUnits.heroes);
      busy = false; isPlayerTurn = true;
      refreshPanel();
      setTimeout(() => { if (tok === battleToken) autoStep(); }, 600);
    }

    function loseBattle() { if (pvp) { pvpFinish(false); return; } if (ghB) { ghFinish(false); return; } if (bossB) { bossFinish('THẤT BẠI'); return; } pvpToast('Thua rồi!\nĐội ngũ đã gục ngã, hãy mạnh hơn rồi quay lại.', false); closeBattle(); }

    async function enemyTurn() {
      const tok = battleToken;
      if (pvp && ++pvpRound > PVP_MAX_ROUNDS) { pvpTimeout(); return; }   // hết số hiệp tối đa của Tỷ Võ
      isPlayerTurn = false;
      refreshPanel();
      clearDefBuff(waveUnits.enemies);                       // buff Thủ của Lạc Long Quân địch chỉ kéo dài 1 hiệp
      tickMoon(waveUnits.enemies);                           // khiên Trăng Khuyết của địch giảm 1 hiệp
      tickLB(waveUnits.enemies);
      tickDebuffs(waveUnits.heroes);                         // hiệu ứng bướm trên tướng ta giảm 1 hiệp
      // Chảy máu: đầu mỗi hiệp địch, mỗi địch đang chảy máu mất 20% HP hiện tại
      if (await tickBleed(waveUnits.enemies)) { await sleep(500); if (tok !== battleToken) return; }
      const es = waveUnits.enemies.filter(e => e.alive);
      await Promise.all(es.map(async (e, i) => {
        await sleep(i * 200); if (tok !== battleToken) return;
        if (!e.alive) return;
        if (e.stun > 0) {
          e.stun--; floatText(e, 'CHOÁNG');
          if (e.stun === 0) { const ic = e.el.querySelector('.bf-stun'); if (ic) ic.remove(); e.el.classList.remove('stunned'); }
          return;
        }
        if (!waveUnits.heroes.some(h => h.alive)) return;
        if (e.isSoldier) { await lccAct(e, tok); }   // Lính Cầm Cờ (heros/linh-cam.js)
        else if (e.isHero) {
          // Tướng địch: đủ nộ (hoặc alwaysUlt) thì ulti giống hệt tướng của ta, còn lại đánh thường (+nộ)
          if ((e.alwaysUlt || e.rage >= 100) && !ultBlocked(e)) { e.rage = e.alwaysUlt ? 100 : 0; await ultimate(e, tok); }
          else { gainRage(e, RAGE_ATK); await normalAttack(e, waveUnits.heroes, tok); }
        } else if (bossB && e === bossB.unit) {
          await bossAct(e, tok);   // boss bang: đủ nộ thì tung ulti ngẫu nhiên của 1 tướng bất kỳ
        } else {
          await attack(e, waveUnits.heroes, 1, e.atk, tok);
        }
      }));
      if (tok !== battleToken) return;
      tickImmortal(waveUnits.heroes); tickImmortal(waveUnits.enemies);   // hết 1 hiệp: bất tử giảm 1
      waveRound++;
      if (bossB) {   // BOSS BANG: đếm hiệp, hết hiệp tối đa thì kết toán
        document.getElementById('ui-wave-title').innerText = `Hiệp ${Math.min(waveRound, BOSS_CFG.maxRounds)}/${BOSS_CFG.maxRounds}`;
        if (waveRound > BOSS_CFG.maxRounds) { bossFinish('HẾT GIỜ'); return; }
      }
      tickDebuffs(waveUnits.enemies);                        // hiệu ứng bướm trên địch giảm 1 hiệp (sau khi địch đã ra đòn)
      // Hết 1 hiệp: gỡ buff Thủ của Lạc Long Quân bên ta
      clearDefBuff(waveUnits.heroes);
      tickMoon(waveUnits.heroes);                            // khiên Trăng Khuyết bên ta giảm 1 hiệp
      tickLB(waveUnits.heroes);                              // buff Lăng Ba Vi Bộ giảm 1 hiệp (+ hồi máu)
      waveUnits.heroes.forEach(h => { if (h.alive && h.regen) heal(h, h.regen); });   // hồi máu (cơ bản + Bảo Vật + kỹ năng bang): hết hiệp 2 bên
      if (waveUnits.heroes.every(h => !h.alive)) { loseBattle(); return; }
      if (waveUnits.enemies.every(e => !e.alive)) { await sleep(400); if (tok !== battleToken) return; nextWave(); return; }   // địch gục vì sát thương phản
      // Tướng ta dính chảy máu từ chiêu của địch
      if (await tickBleed(waveUnits.heroes)) {
        await sleep(500); if (tok !== battleToken) return;
        if (waveUnits.heroes.every(h => !h.alive)) { loseBattle(); return; }
      }
      if (bossB) {   // Thần thú: tích nộ mỗi hiệp, đủ nộ tung ngẫu nhiên tuyệt kỹ của 1 tướng bất kỳ
        await bossBeastTick(tok); if (tok !== battleToken) return;
        if (waveUnits.heroes.every(h => !h.alive)) { loseBattle(); return; }
        if (waveUnits.enemies.every(e => !e.alive)) { await sleep(400); if (tok !== battleToken) return; nextWave(); return; }
      }
      // Tướng ta dính choáng thì mất lượt
      waveUnits.heroes.forEach(h => {
        if (h.alive && h.stun > 0) {
          h.stun--; h.acted = true; floatText(h, 'CHOÁNG');
          if (h.stun === 0) { const ic = h.el.querySelector('.bf-stun'); if (ic) ic.remove(); h.el.classList.remove('stunned'); }
        } else h.acted = false;
      });
      isPlayerTurn = true;
      refreshPanel();
      if (waveUnits.heroes.filter(h => h.alive).every(h => h.acted)) {   // cả đội bị choáng -> qua lượt
        setTimeout(() => { if (tok === battleToken) endTurn(); }, 800);
        return;
      }
      autoStep();
    }

    // Đánh thường (chạm thẻ tướng) hoặc ulti (chạm cầu nộ) — người chơi tự chọn tướng nào đánh trước
    async function heroAct(i, type) {
      const u = waveUnits.heroes[i];
      if (!u || !isPlayerTurn || busy || !u.alive || u.acted) return;
      if (type === 'ult' && (u.rage < 100 || ultBlocked(u))) return;
      busy = true; u.acted = true;
      const tok = battleToken;
      if (type === 'ult') u.rage = u.alwaysUlt ? 100 : 0; else gainRage(u, RAGE_ATK);
      refreshPanel();
      if (type === 'ult') await ultimate(u, tok);
      else await normalAttack(u, waveUnits.enemies, tok);
      afterAction(tok);
    }

    // Ulti cùng lúc cho mọi tướng đã đầy nộ
    async function castAll() {
      if (!isPlayerTurn || busy) return;
      const rs = waveUnits.heroes.filter(h => h.alive && !h.acted && h.rage >= 100 && !ultBlocked(h)).sort((a, b) => b.spd - a.spd);
      if (!rs.length) return;
      busy = true;
      const tok = battleToken;
      rs.forEach(h => { h.acted = true; h.rage = h.alwaysUlt ? 100 : 0; });
      refreshPanel();
      await Promise.all(rs.map(async (h, i) => {
        await sleep(i * 120); if (tok !== battleToken) return;
        await ultimate(h, tok);
      }));
      afterAction(tok);
    }

    async function afterAction(tok) {
      if (tok !== battleToken) return;
      busy = false;
      await sleep(300); if (tok !== battleToken) return;
      if (waveUnits.heroes.every(h => !h.alive)) { loseBattle(); return; }   // tướng ta gục vì sát thương phản của khiên địch
      if (waveUnits.enemies.every(e => !e.alive)) {
        isPlayerTurn = false; refreshPanel();
        await sleep(400); if (tok !== battleToken) return;
        nextWave();
        return;
      }
      if (waveUnits.heroes.filter(h => h.alive).every(h => h.acted)) { endTurn(); return; }
      refreshPanel();
      autoStep();
    }

    function endTurn() {
      if (!isPlayerTurn || busy) return;
      enemyTurn();
    }

    function nextWave() {
      if (pvp) { pvpFinish(true); return; }
      if (bossB) { bossFinish('CHIẾN THẮNG!'); return; }
      if (ghB) { ghNextWave(); return; }
      if (currentWave < 4) {
        currentWave++;
        loadWave();
      } else {
        const hamMsg = currentBattle === 10 ? claimStageHammer(currentStage) : '';
        const rewardMsg = grantBanReward(currentStage, currentBattle) + grantExtraReward() + grantStageReward(currentStage, currentBattle) + hamMsg + grantPills();
        pvpToast(`Hoàn thành Ải ${currentStage} - Bàn ${currentBattle}!` + rewardMsg, true);   // tự qua bàn, thông báo tự tắt
        const st = currentStage, bt = currentBattle;
        closeBattle();
        unlockNextLevel(st, bt);
        if (bt === 10) {
          if (st < 100) selectStage(st + 1); else backToStages();
        } else {
          selectStage(st);
        }
      }
    }

    function closeBattle() {
      if (bossB && !bossB.fin) { if (confirm('Thoát trận? Sát thương đã gây vẫn được tính và mất 1 lượt.')) bossFinish('ĐÃ THOÁT'); return; }
      battleToken++;
      stopHeroSounds();
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
      stopBgm(); battleFast = false;
      if (pvp) { pvp = null; pvpGenOpps(); renderPvp(); }   // thoát giữa trận Tỷ Võ = bỏ cuộc
      bossB = null; ghB = null;
      busy = false;
      document.getElementById('battle-overlay').style.display = 'none';
      isPlayerTurn = false;
    }

;
/* === pve/pve-rewards.js === */

/* PVE: Thưởng BẠC, GẠO, THẦN ĐAN, TIÊN ĐAN */

// Bàn 1 Ải 1: 3000 bạc + 2500 gạo
// Mỗi Bàn tiếp theo tăng 10%.
// Bàn 1 Ải 2 là Bàn thứ 11.

// Số thực đầy đủ (không rút gọn K, M, B...)
function fmtRewardN(n) { return fmtN(n); }

// Phần thưởng cơ bản
const BAN_SILVER_BASE = 3000;
 BAN_RICE_BASE = 2500;
 BAN_REWARD_GROWTH = 1.005;

const BAN_THAN_BASE = 2;
const BAN_TIEN_BASE = 100;
const BAN_EXP_BASE = 100;   // EXP tài khoản ở Bàn 1
// Admin chỉnh được (admin-config.html → tab Thưởng PVE)
var PVE_CFG = cfgSnap('pve', { silverBase: BAN_SILVER_BASE, riceBase: BAN_RICE_BASE, growth: BAN_REWARD_GROWTH, thanBase: BAN_THAN_BASE, tienBase: BAN_TIEN_BASE, expBase: BAN_EXP_BASE, pillBase: 10, extra: [] });
Object.assign(PVE_CFG, cfgGet('pve', {}));

// Thêm đan vào kho Túi Đồ
function danAdd(name, ico, n) {
  if (!(n > 0)) return;

  try {
    const s = gdSt();
    const k = (s.kho[name] =
      s.kho[name] || { ico, qty: 0 });

    k.qty = Math.max(0, k.qty + n);
    gdSave(s);
  } catch (e) {}
}

// Tính số thứ tự Bàn
const banIndex = (stage, battle) =>
  (stage - 1) * 10 + battle;

// Tính phần thưởng
function banReward(stage, battle) {
  const m = Math.pow(
    Number(PVE_CFG.growth) || 1,
    banIndex(stage, battle) - 1
  );

  return {
    silver: Math.round(PVE_CFG.silverBase * m),
    rice: Math.round(PVE_CFG.riceBase * m),
    than: Math.round(PVE_CFG.thanBase * m),
    tien: Math.round(PVE_CFG.tienBase * m),
    exp: Math.round((Number(PVE_CFG.expBase) || 0) * m)
  };
}

// Nhận thưởng khi thắng PVE
function grantBanReward(stage, battle) {
  const r = banReward(stage, battle);

  silver += r.silver;
  rice += r.rice;
  resSave();

  danAdd('Thần Đan', '🟣', r.than);
  danAdd('Tiên Đan', '🔴', r.tien);
  const up = typeof addAccExp === 'function' ? addAccExp(r.exp) : 0;   // EXP → tự lên cấp acc khi đủ

  return `\n\n🥈 +${fmtRewardN(r.silver)} bạc • 🍚 +${fmtRewardN(r.rice)} gạo\n🟣 +${fmtRewardN(r.than)} Thần Đan • 🔴 +${fmtRewardN(r.tien)} Tiên Đan` + (r.exp > 0 ? `\n✨ +${fmtRewardN(r.exp)} EXP` : '') + (up ? `\n🎉 Lên cấp ${accLevel}! Tướng & Trang bị nâng được tới cấp ${accLevel}.` : '');
}


// ===== Bảo Vật KHÔNG còn rơi ở Ải (PVE / Quét). Mảnh Bảo Vật chỉ rơi ở Luận Kiếm (và đổi ở Tỷ Võ). =====

// ===== THƯỞNG THÊM MỖI TRẬN (admin thêm ở admin-config.html → tab "Thưởng PVE" → "Thưởng thêm mỗi trận") =====
// PVE_CFG.extra = [{ t, n, id?, name?, ico? }] — cùng định dạng loại quà với Gift Code (silver, rice, gold, than, tien, pill, hammer, exp, shard, treasure, item, ...).
// Nhận mỗi lần thắng 1 Bàn; quét ×N thì nhận ×N.
const extraList = () => (Array.isArray(PVE_CFG.extra) ? PVE_CFG.extra : []).filter(r => r && r.t && Number(r.n) > 0);
function grantExtraReward(times) {
  times = Math.max(1, times | 0);
  const got = [];
  extraList().forEach(r => {
    try { const t = gcGrant(Object.assign({}, r, { n: Math.floor(Number(r.n)) * times })); if (t) got.push(t); } catch (e) { console.warn('extra reward', e); }
  });
  try { if (typeof renderBag === 'function' && document.getElementById('bag-modal').style.display === 'flex') renderBag(); } catch (e) {}
  return got.length ? `\n🎁 Thưởng thêm: ${got.join(' • ')}` : '';
}
// Chữ mô tả thưởng thêm (hiện ở danh sách Bàn)
function extraRewardText() {
  const L = extraList().map(r => { const n = fmtRewardN(r.n);
    switch (r.t) {
      case 'silver': return n + ' bạc'; case 'rice': return n + ' gạo'; case 'gold': return n + ' vàng'; case 'pill': return n + ' viên thể lực';
      case 'than': return n + ' Thần Đan'; case 'tien': return n + ' Tiên Đan'; case 'hammer': return n + ' Búa'; case 'exp': return n + ' EXP';
      case 'shard': { const h = typeof heroById === 'function' && heroById(r.id); return n + ' mảnh ' + (h ? h.name : 'tướng'); }
      case 'linhthu': { let nm = 'Linh Thú'; try { nm = LT_DEFS[r.id].name; } catch (e) {} return n + ' ' + nm; } case 'ltshard': { let nm = 'Linh Thú'; try { nm = LT_DEFS[r.id].name; } catch (e) {} return n + ' mảnh ' + nm; } case 'treasure': return n + ' Bảo Vật'; case 'tsshard': { let nm = 'Bảo Vật'; try { nm = TS_DEFS[r.id].name; } catch (e) {} return n + ' mảnh ' + nm; } case 'beast': return 'Thần thú ' + (r.name || ''); case 'tshard': return n + ' mảnh ' + (r.name || 'thần thú');
      default: return n + ' ' + (r.name || 'vật phẩm'); } });
  return L.join(' • ');
}

;
/* === js/core/mail.js === */
/* HỘP THƯ: quà hằng ngày + thư do admin gửi.
   Admin chỉnh ở admin.html → tab "📬 Hộp Thư" (lưu ở game_config/main → mail):
     mail.daily   1 = có quà hằng ngày, 0 = tắt           (mặc định 1)
     mail.days    thư chưa nhận giữ bao nhiêu ngày         (mặc định 7)
     mail.gifts   danh sách quà mỗi ngày                   (mặc định 10.000 vàng)
     mail.letters thư riêng: [{ id, title, body, gifts, from, to }]  (from/to = mốc thời gian ms, 0/trống = không giới hạn)
   Trạng thái người chơi (mail_state, đồng bộ đám mây): first = ngày đầu chơi • claimed = { 'yyyy-mm-dd': true } • letters = { idThư: true } */

const MAIL_DEF_GIFTS = [{ t: 'gold', n: 10000 }];
let MAIL_GIFTS = MAIL_DEF_GIFTS, MAIL_DAYS = 7, MAIL_DAILY_ON = true;
cfgOnApply(() => {
  const g = cfgGet('mail.gifts', null);
  MAIL_GIFTS = Array.isArray(g) ? rwList(g) : MAIL_DEF_GIFTS;
  MAIL_DAYS = Math.max(1, Math.min(60, Math.floor(cfgNum('mail.days', 7))));
  MAIL_DAILY_ON = Number(cfgGet('mail.daily', 1)) !== 0 && MAIL_GIFTS.length > 0;
});
let mailState = (() => { const s = loadJSON('mail_state'); return { first: typeof s.first === 'string' ? s.first : '', claimed: (s.claimed && typeof s.claimed === 'object') ? s.claimed : {}, letters: (s.letters && typeof s.letters === 'object') ? s.letters : {} }; })();
const mailSave = () => saveJSON('mail_state', mailState);
const mailDayKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const mailDayText = k => k.split('-').reverse().join('/');
// Các ngày có thư (mới nhất trước): từ ngày đầu chơi tới hôm nay, tối đa MAIL_DAYS ngày
function mailDays() {
  const today = new Date(); today.setHours(12, 0, 0, 0);
  if (!mailState.first) { mailState.first = mailDayKey(today); mailSave(); }
  if (!MAIL_DAILY_ON) return [];
  const days = [];
  for (let i = 0; i < MAIL_DAYS; i++) { const d = new Date(today); d.setDate(d.getDate() - i); const k = mailDayKey(d); if (k >= mailState.first) days.push(k); }
  return days;
}
// Thư có danh sách uids chỉ hiện cho đúng những tài khoản đó (admin gửi riêng); không có uids = gửi cho tất cả
const mailForMe = l => !Array.isArray(l.uids) || !l.uids.length || (typeof clUser !== 'undefined' && !!clUser && l.uids.includes(clUser.uid));
// Thư admin gửi còn trong thời hạn
function mailLetters() {
  const now = Date.now(), L = cfgGet('mail.letters', []);
  return (Array.isArray(L) ? L : []).filter(l => l && l.id && rwList(l.gifts).length && (!l.from || now >= l.from) && (!l.to || now <= l.to) && mailForMe(l));
}
const mailLetterOpen = () => mailLetters().filter(l => !mailState.letters[l.id]);
const mailUnclaimed = () => mailDays().filter(k => !mailState.claimed[k]);
/* ----- Thư riêng do admin gửi cho TỪNG người chơi: Firestore mail_inbox/{uid}/msgs/{id} = { title, body, gifts, t, exp, claimed } -----
   Nhận = đánh dấu claimed trên máy chủ TRƯỚC (luật Firestore chỉ cho false -> true) rồi mới cộng quà => không nhận trùng dù mở 2 máy. */
let mailInbox = [], mailInboxBusy = false;
async function mailInboxFetch() {
  if (mailInboxBusy || typeof clUser === 'undefined' || !clUser || typeof clDb === 'undefined' || !clDb) return;
  mailInboxBusy = true;
  try {
    const s = await clDb.collection('mail_inbox').doc(clUser.uid).collection('msgs').get(), now = Date.now(), L = [];
    s.forEach(d => { const x = d.data() || {}; if (x.exp && now > x.exp && !x.claimed) return; if (!rwList(x.gifts).length) return; L.push({ id: d.id, title: x.title || '', body: x.body || '', gifts: rwList(x.gifts), t: x.t || 0, claimed: !!x.claimed }); });
    L.sort((a, b) => b.t - a.t); mailInbox = L.slice(0, 40);
  } catch (e) { /* mất mạng / chưa có quyền: giữ danh sách cũ */ }
  mailInboxBusy = false; updateMailBadge();
  const m = document.getElementById('mail-modal'); if (m && m.style.display === 'flex') renderMail();
}
const mailInboxOpen = () => mailInbox.filter(m => !m.claimed);
async function mailClaimInbox(id) {
  const m = mailInbox.find(x => x.id === id); if (!m || m.claimed || mailInboxBusy) return;
  mailInboxBusy = true;
  try { await clDb.collection('mail_inbox').doc(clUser.uid).collection('msgs').doc(id).update({ claimed: true, claimedAt: Date.now() }); }
  catch (e) { mailInboxBusy = false; if (typeof scToast === 'function') scToast('Không nhận được thư (mất mạng hoặc đã nhận rồi)'); mailInboxFetch(); return; }
  mailInboxBusy = false; m.claimed = true; mailDone(rwGrantAll(m.gifts));
}
function updateMailBadge() {
  const el = document.getElementById('mail-badge'); if (!el) return;
  const n = mailUnclaimed().length + mailLetterOpen().length + mailInboxOpen().length; el.innerText = n; el.style.display = n ? 'flex' : 'none';
}
function mailDone(got) { mailSave(); renderMail(); updateMailBadge(); if (got && typeof scToast === 'function') scToast('🎁 Nhận: ' + got); if (typeof clPush === 'function') { try { clPush(); } catch (e) {} } }
function mailClaim(k) {
  if (mailState.claimed[k] || !mailDays().includes(k)) return;
  mailState.claimed[k] = true; mailDone(rwGrantAll(MAIL_GIFTS));
}
function mailClaimAll() {
  const list = mailUnclaimed(); if (!list.length) return;
  const got = []; list.forEach(k => { mailState.claimed[k] = true; got.push(rwGrantAll(MAIL_GIFTS)); });
  mailDone(got[0] ? got.length + ' ngày quà hằng ngày' : '');
}
function mailClaimLetter(id) {
  const l = mailLetters().find(x => x.id === id); if (!l || mailState.letters[id]) return;
  mailState.letters[id] = true; mailDone(rwGrantAll(l.gifts));
}
const mailEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function renderMail() {
  const days = mailDays(), un = days.filter(k => !mailState.claimed[k]), letters = mailLetters(), inbox = mailInbox;
  document.getElementById('mail-note').innerHTML = (MAIL_DAILY_ON ? `Mỗi ngày nhận <b>${rwTextAll(MAIL_GIFTS)}</b> miễn phí. Thư chưa nhận được giữ ${MAIL_DAYS} ngày.` : 'Hiện không có quà hằng ngày.') + (un.length > 1 ? ` <button class="btn-attack" style="padding:4px 12px;font-size:12px;margin-left:6px" onclick="mailClaimAll()">Nhận tất cả</button>` : '');
  const P = inbox.filter(l => !l.claimed).map(l => {
    const got = !!l.claimed;
    return `<div class="bm-row ${got ? 'done' : ''}"><div class="bm-ico">${got ? '📭' : '💌'}</div><div class="bm-info"><b>${mailEsc(l.title || 'Quà từ quản trị viên')}</b><small>${l.body ? mailEsc(l.body) + '<br>' : ''}+ ${rwTextAll(l.gifts)}</small></div>` +
      (got ? '<div class="bm-qty">Đã nhận ✔</div>' : `<button class="btn-attack" onclick="mailClaimInbox('${mailEsc(l.id)}')">Nhận</button>`) + '</div>';
  }).join('');
  const L = letters.filter(l => !mailState.letters[l.id]).map(l => {
    const got = !!mailState.letters[l.id];
    return `<div class="bm-row ${got ? 'done' : ''}"><div class="bm-ico">${got ? '📭' : '📩'}</div><div class="bm-info"><b>${mailEsc(l.title || 'Thư từ hệ thống')}</b><small>${l.body ? mailEsc(l.body) + '<br>' : ''}+ ${rwTextAll(l.gifts)}</small></div>` +
      (got ? '<div class="bm-qty">Đã nhận ✔</div>' : `<button class="btn-attack" onclick="mailClaimLetter('${mailEsc(l.id)}')">Nhận</button>`) + '</div>';
  }).join('');
  const D = days.filter(k => !mailState.claimed[k]).map(k => {
    const got = !!mailState.claimed[k];
    return `<div class="bm-row ${got ? 'done' : ''}"><div class="bm-ico">${got ? '📭' : '🎁'}</div><div class="bm-info"><b>Quà hằng ngày</b><small>Ngày ${mailDayText(k)} • +${rwTextAll(MAIL_GIFTS)}</small></div>` +
      (got ? '<div class="bm-qty">Đã nhận ✔</div>' : `<button class="btn-attack" onclick="mailClaim('${k}')">Nhận</button>`) + '</div>';
  }).join('');
  document.getElementById('mail-list').innerHTML = (P + L + D) || '<div class="set-note" style="text-align:center">Hộp thư trống.</div>';
}
function openMail() { mailInboxFetch(); renderMail(); document.getElementById('mail-modal').style.display = 'flex'; }
function closeMail() { document.getElementById('mail-modal').style.display = 'none'; }
updateMailBadge();
setInterval(updateMailBadge, 60000);
setInterval(() => { if (document.visibilityState === 'visible') mailInboxFetch(); }, 30000);   // thư mới từ admin: kiểm tra 30 giây / lần
setTimeout(mailInboxFetch, 4000); setTimeout(mailInboxFetch, 12000);   // sau khi đăng nhập đám mây xong   // qua nửa đêm: thư mới của ngày mới hiện chấm đỏ

;
/* === js/core/bag.js === */
/* TÚI ĐỒ: lưới ô vật phẩm. Chọn 1 món -> Bán Ra (nhập mật khẩu bán 0000) hoặc Sử Dụng.
   Tiền tệ hiện ở thanh trên; mảnh tướng, trang bị, bảo vật không nằm ở đây. */

    const BAG_SELL_PASS = '0000';
    const BAG_PILL_ICO = icoImg('pill', '1.1em');
    const BAG_SILVER_ICO = icoImg('silver', '1.1em');
    const BAG_PRICE = { 'Viên Thể Lực': 10, 'Thú Noãn': 50, 'Thú Hồn': 100, 'Thú Linh': 500, 'Đá Nữ Oa': 100, 'Dị Linh': 300, 'Đào Tiên': 200, 'Đào Tiên Vương': 1000, 'Tử Linh Thạch': 400, 'Lá Linh': 50, 'Hộp Linh': 200, 'Hộp Tinh': 400, 'Ngọc Tím': 300 };
    const BAG_PRICE_DEF = Object.assign({}, BAG_PRICE);
    cfgOnApply(() => { Object.assign(BAG_PRICE, BAG_PRICE_DEF); const o = cfgGet('misc.bagPrice', {}) || {}; Object.keys(o).forEach(k => { const v = Number(o[k]); if (isFinite(v) && v >= 0) BAG_PRICE[k] = v; }); });   // giá bán Túi Đồ — admin chỉnh: misc.bagPrice
    const BAG_DESC = { 'Thú Noãn': 'Nguyên liệu thần thú, rơi từ Boss bang.', 'Thú Hồn': 'Cho thần thú ăn: +100 EXP.', 'Thú Linh': 'Cho thần thú ăn: +500 EXP.', 'Đá Nữ Oa': 'Dùng tăng sao thần thú.', 'Dị Linh': 'Dùng tăng sao thần thú.', 'Đào Tiên': 'Vật phẩm rơi từ Boss bang.', 'Đào Tiên Vương': 'Vật phẩm rơi từ Boss bang.', 'Tử Linh Thạch': 'Vật phẩm rơi từ Boss bang.' };
    const bagStackOf = x => (x.qty > BAG_STACK * 30 || /Đan$/.test(x.name)) ? 1e300 : BAG_STACK;   // số lượng rất lớn (Thần Đan / Tiên Đan...): gộp 1 ô, tránh tách hàng triệu ô làm treo web
    const BAG_STACK = 999;   // mỗi ô tối đa 999, vượt thì tách ô mới (999 / 999 / 999 ...)
    let bagSel = null, bagQty = 1, bagStack = 0;

    function bagItems() {   // [{k, name, ico, qty, price, desc, use}]
      const it = [{ k: 'pill', name: 'Viên Thể Lực', ico: BAG_PILL_ICO, qty: staState.pills, price: BAG_PRICE['Viên Thể Lực'], desc: `Mỗi viên +${PILL_STA} thể lực (hiện ${staState.v}/${STA_MAX}).`, use: 'pill' },
        { k: 'hammer', name: 'Búa', ico: icoImg('hammer', '1.25em'), qty: hammerCount(), price: 0, desc: 'Dùng để tăng cấp Bảo Vật (1 búa = 300 EXP). Nhận từ Ải PVE và chế độ Trốn.', use: 'hammer' }];
      if (typeof gdSt === 'function') { const kho = gdSt().kho; Object.keys(kho).forEach(n => { if (kho[n].qty > 0) it.push({ k: 'g:' + n, name: n, ico: danIcoHTML(n) || gdIco(n, kho[n].ico), qty: kho[n].qty, price: BAG_PRICE[n] || 100, desc: BAG_DESC[n] || 'Vật phẩm Bang Hội.', use: 'gd' }); }); }
      return it.filter(x => x.qty > 0);
    }
    // Ô đang chọn: món + số thứ tự ô (stack). qty = số lượng trong ô đó, total = tổng cả món.
    function bagCur() {
      const c = bagItems().find(x => x.k === bagSel); if (!c) return null;
      const S = bagStackOf(c), stacks = Math.ceil(c.qty / S); bagStack = Math.max(0, Math.min(bagStack, stacks - 1));
      return Object.assign({}, c, { total: c.qty, stacks, qty: Math.min(S, c.qty - bagStack * S) });
    }
    function renderBag() {
      const items = bagItems(); if (!items.some(x => x.k === bagSel)) { bagSel = items.length ? items[0].k : null; bagStack = 0; bagQty = 1; }
      const cur = bagCur(), list = [];
      items.forEach(x => { for (let i = 0, S = bagStackOf(x), n = Math.ceil(x.qty / S); i < n; i++) list.push({ x, i, q: Math.min(S, x.qty - i * S) }); });
      const cells = list.map(c => `<div class="bg-cell ${c.x.k === bagSel && c.i === bagStack ? 'sel' : ''}" onclick="bagPick('${c.x.k.replace(/'/g, "\\'")}',${c.i})"><span class="bg-i">${c.x.ico}</span><em>x${fmtN(c.q)}</em></div>`).join('');
      const blanks = '<div class="bg-cell empty"></div>'.repeat(Math.max(0, 20 - list.length));
      document.getElementById('bag-list').innerHTML =
        `<div class="bg-top">Túi Đồ <b>${list.length}/90</b></div><div class="bg-grid">${cells}${blanks}</div>` +
        (cur ? `<div class="bg-info"><div class="bg-l"><div>Có <b>${fmtN(cur.qty)}</b>${cur.stacks > 1 ? ` <small>(tổng ${fmtN(cur.total)})</small>` : ''}</div><div>Giá <b>${cur.price ? fmtN(cur.price) + ' ' + BAG_SILVER_ICO : 'Không bán'}</b></div>
          <div class="bg-q"><button onclick="bagStep(-1)">−</button><span>${Math.min(bagQty, cur.qty)}</span><button onclick="bagStep(1)">+</button><button onclick="bagStep(0)">Tất cả</button></div></div>
          <div class="bg-m"><div class="bg-big">${cur.ico}</div><b>${cur.name}</b></div>
          <div class="bg-r"><button class="bg-sell" ${cur.price ? '' : 'disabled'} onclick="bagSellOpen()">Bán Ra</button><button class="bg-use" onclick="bagUse()">Sử Dụng</button></div>
          <div class="bg-d">${cur.desc}</div></div>` : '<div class="bg-info"><div class="bg-d" style="text-align:center">Túi đồ trống</div></div>');
    }
    function bagPick(k, i) { bagSel = k; bagStack = i || 0; bagQty = 1; renderBag(); }
    function bagStep(d) { const c = bagCur(); if (!c) return; bagQty = d === 0 ? c.qty : Math.max(1, Math.min(c.qty, Math.min(bagQty, c.qty) + d)); renderBag(); }
    function bagUse() {
      const c = bagCur(); if (!c) return; const n = Math.min(bagQty, c.qty);
      if (c.use === 'pill') { usePills(n); renderBag(); return; }
      if (c.use === 'hammer') { closeBag(); if (typeof tsOpen === 'function') tsOpen(); return; }
      closeBag(); if (c.name === 'Đá Nữ Oa' || c.name === 'Dị Linh') { if (typeof openThanThu === 'function') { ttTab = 'star'; openThanThu(); } } else if (c.name === 'Thú Hồn' || c.name === 'Thú Linh') { if (typeof openThanThu === 'function') { ttTab = 'lv'; openThanThu(); } } else if (typeof openBangBoss === 'function') openBangBoss();
    }
    function bagSellOpen() {
      const c = bagCur(); if (!c || !c.price) return; const n = Math.min(bagQty, c.qty), m = document.getElementById('bag-sell');
      m.innerHTML = `<div class="md-box" style="max-width:320px"><div class="hd-name" style="text-align:center">Bán ${n} × ${c.name}</div><div class="set-note" style="text-align:center">Nhận <b>${fmtN(c.price * n)}</b> ${BAG_SILVER_ICO} bạc. Nhập mật khẩu bán để xác nhận.</div>
        <input id="bag-pass" type="password" inputmode="numeric" maxlength="8" placeholder="Mật khẩu bán" class="bg-pass" autocomplete="off">
        <div class="gs-act" style="justify-content:center;gap:10px;margin:8px 0 0"><button onclick="document.getElementById('bag-sell').style.display='none'">Hủy</button><button onclick="bagSellDo()">Đồng ý</button></div></div>`;
      m.style.display = 'flex'; setTimeout(() => { const i = document.getElementById('bag-pass'); if (i) i.focus(); }, 50);
    }
    function bagSellDo() {
      const c = bagCur(); if (!c) return;
      if (document.getElementById('bag-pass').value !== BAG_SELL_PASS) return (typeof scToast === 'function' ? scToast('Sai mật khẩu bán') : alert('Sai mật khẩu bán'));
      const n = Math.min(bagQty, c.qty);
      if (c.use === 'pill') { staState.pills -= n; staSave(); }
      else if (c.use === 'gd') { const s = gdSt(); s.kho[c.name].qty -= n; gdSave(s); }
      else return;
      silver += c.price * n; resSave(); document.getElementById('bag-sell').style.display = 'none'; bagQty = 1; renderBag();
      if (typeof scToast === 'function') scToast(`Đã bán ${n} ${c.name}, +${fmtN(c.price * n)} bạc`);
    }
    function openBag() { renderBag(); document.getElementById('bag-modal').style.display = 'flex'; }
    function closeBag() { document.getElementById('bag-modal').style.display = 'none'; }
    (function () { const d = document.createElement('div'); d.id = 'bag-sell'; d.className = 'md-wrap'; d.style.zIndex = 400; d.onclick = e => { if (e.target === d) d.style.display = 'none'; }; document.body.appendChild(d); })();

;
/* === js/core/giftcode.js === */
/* GIFT CODE: nút 🎁 Gift Code dưới Túi Đồ -> nhập mã nhận quà.
   NGUỒN MÃ:
     1) ĐÁM MÂY (chính): mã tạo bằng trang admin-giftcode.html, lưu ở Firestore 'gift_codes/{MÃ}'.
        Có giới hạn lượt dùng, hạn dùng, bật/tắt; mỗi tài khoản chỉ nhập 1 lần (ghi ở 'gift_codes/{MÃ}/redeemed/{uid}').
        Cần đăng nhập tài khoản đám mây mới nhập được.
     2) GIFT_CODES bên dưới (dự phòng, viết cứng trong file): dùng khi chưa đăng nhập / mất mạng.
        Mỗi mã chỉ nhập 1 lần trên mỗi tài khoản (lưu ở 'giftcode_used', nằm trong SV_KEYS nên theo save/cloud).
   Loại quà (t):
     'pill'     Viên Thể Lực          { t: 'pill', n: 10 }
     'silver'   Bạc                   { t: 'silver', n: 100000 }
     'rice'     Gạo                   { t: 'rice', n: 50000 }
     'gold'     Vàng                  { t: 'gold', n: 100 }
     'shard'    Mảnh tướng            { t: 'shard', id: 6, n: 10 }      (id = id tướng trong HEROES)
     'treasure' Bảo Vật (bản mới)     { t: 'treasure', id: 6, n: 1 }    (id = loại trong TS_DEFS)
     'tsshard'  Mảnh Bảo Vật          { t: 'tsshard', id: 6, n: 5 }     (đủ treasure.mergeCost = 25 mảnh ghép 1 Bảo Vật)
     'item'     Vật phẩm Bang Hội     { t: 'item', name: 'Thú Linh', ico: '🔥', n: 5 }   (vào kho bang -> hiện trong Túi)
     'than'     Thần Đan 🟣            { t: 'than', n: 1000 }
     'tien'     Tiên Đan 🔴            { t: 'tien', n: 1000 }
     'hammer'   Búa 🔨                 { t: 'hammer', n: 10 }
     'exp'      EXP tài khoản ✨       { t: 'exp', n: 5000 }   (tự lên cấp acc khi đủ EXP; mã cũ có loại 'key' sẽ bị bỏ qua)
     'beast'    Thần thú (tặng luôn)   { t: 'beast', name: 'Kim Sư', n: 1 }   (đã có thì không cộng thêm)
     'tshard'   Mảnh thần thú (Châu)   { t: 'tshard', name: 'Kim Sư', n: 50 }
   Lưu ý: mã dự phòng nằm trong file JS nên người chơi xem mã nguồn là thấy; mã bí mật thật sự hãy tạo ở trang admin. */

const GIFT_CODES = {
  // Mã mẫu — sửa / xoá / thêm tuỳ ý
  'CHAOBAN':   { rewards: [{ t: 'pill', n: 10 }, { t: 'silver', n: 100000 }] },
  'MONGHUYEN': { rewards: [{ t: 'gold', n: 100 }, { t: 'item', name: 'Thú Linh', ico: '🔥', n: 5 }] }
};

function gcNorm(s) { return String(s || '').replace(/\s+/g, '').toUpperCase(); }
function gcUsed() { const u = loadJSON('giftcode_used'); return (u && typeof u === 'object') ? u : {}; }

function gcGrant(r) {
  const n = Math.max(0, Math.floor(r.n) || 0); if (!n) return '';
  if (r.t === 'pill') { staState.pills += n; staSave(); return `${fmtN(n)} Viên Thể Lực`; }
  if (r.t === 'silver') { silver += n; resSave(); return `${fmtN(n)} bạc`; }
  if (r.t === 'rice') { rice += n; resSave(); return `${fmtN(n)} gạo`; }
  if (r.t === 'gold') { gold += n; goldSave(); return `${fmtN(n)} vàng`; }
  if (r.t === 'shard' && typeof heroById === 'function' && heroById(r.id)) {
    heroShards[r.id] = (heroShards[r.id] || 0) + n; saveJSON('hero_shards', heroShards);
    return `${fmtN(n)} mảnh ${heroById(r.id).name}`;
  }
  if (r.t === 'tsshard' && typeof tsShardAdd === 'function' && TS_DEFS[r.id]) {   // mảnh Bảo Vật (25 mảnh ghép 1 món)
    tsShardAdd(r.id, n); return `${fmtN(n)} mảnh ${TS_DEFS[r.id].name}`;
  }
  if (r.t === 'ltshard' && typeof ltShardAdd === 'function' && LT_DEFS[r.id]) { ltShardAdd(r.id, n); return `${fmtN(n)} mảnh ${LT_DEFS[r.id].name}`; }   // mảnh Linh Thú
  if (r.t === 'linhthu' && typeof ltAdd === 'function' && LT_DEFS[r.id]) { const c = Math.min(n, 50); for (let i = 0; i < c; i++) ltAdd(r.id); return `${c} ${LT_DEFS[r.id].name}`; }
  if (r.t === 'treasure' && typeof tsAdd === 'function' && TS_DEFS[r.id]) {
    const c = Math.min(n, 50); for (let i = 0; i < c; i++) tsAdd(r.id);
    return `${c} ${TS_DEFS[r.id].name}`;
  }
  if (r.t === 'item' && typeof gdSt === 'function') {
    const s = gdSt(); (s.kho[r.name] = s.kho[r.name] || { ico: r.ico || '🎁', qty: 0 }).qty += n; gdSave(s);
    return `${fmtN(n)} ${r.name}`;
  }
  if (r.t === 'than' || r.t === 'tien') {
    const nm = r.t === 'than' ? 'Thần Đan' : 'Tiên Đan', ico = r.t === 'than' ? '🟣' : '🔴';
    const s = gdSt(); (s.kho[nm] = s.kho[nm] || { ico, qty: 0 }).qty += n; gdSave(s);
    return `${fmtN(n)} ${nm}`;
  }
  if (r.t === 'hammer') {   // hamSpent âm = búa cộng thêm (hammerCount đã chặn >= 0)
    hamSpent -= n; try { localStorage.setItem('ham_spent', String(hamSpent)); } catch (e) {}
    return `${fmtN(n)} Búa`;
  }
  if (r.t === 'exp' && typeof addAccExp === 'function') {
    const up = addAccExp(n);
    return `${fmtN(n)} EXP` + (up ? ` (lên cấp ${accLevel})` : '');
  }
  if (r.t === 'beast' && typeof ttSt === 'function' && ttBeast(r.name)) {
    const s = ttSt();
    if (s.tt.own[r.name]) return `${r.name} (đã sở hữu)`;
    s.tt.own[r.name] = { lv: 1, star: 1, exp: 0 }; gdSave(s);
    return `Thần thú ${r.name}`;
  }
  if (r.t === 'tshard' && typeof ttSt === 'function' && ttBeast(r.name)) {
    const s = ttSt(); s.tt.sh[r.name] = (s.tt.sh[r.name] || 0) + n; gdSave(s);
    return `${fmtN(n)} mảnh ${r.name}`;
  }
  return '';
}

// Hỏi máy chủ: kiểm tra + ghi nhận lượt dùng trong CÙNG 1 transaction (không thể vượt lượt hoặc nhập 2 lần dù bấm nhanh)
async function gcRedeemCloud(code) {
  const ref = clDb.collection('gift_codes').doc(code), mine = ref.collection('redeemed').doc(clUser.uid);
  return clDb.runTransaction(async tx => {
    const [s, m] = await Promise.all([tx.get(ref), tx.get(mine)]);
    if (!s.exists) return { err: 'none' };
    const d = s.data();
    if (d.enabled === false) return { err: 'off' };
    if (d.exp && Date.now() > d.exp) return { err: 'expired' };
    if (m.exists) return { err: 'used' };
    if (d.max && (d.used || 0) >= d.max) return { err: 'full' };
    tx.update(ref, { used: (d.used || 0) + 1 });
    tx.set(mine, { t: firebase.firestore.FieldValue.serverTimestamp() });
    return { rewards: d.rewards || [] };
  });
}
const GC_ERR = { none: 'Gift Code không hợp lệ', off: 'Gift Code đã bị khóa', expired: 'Gift Code đã hết hạn', used: 'Bạn đã nhập mã này rồi', full: 'Gift Code đã hết lượt sử dụng' };
let gcBusy = false;

async function gcRedeem() {
  if (gcBusy) return;
  const inp = document.getElementById('gc-input'); if (!inp) return;
  const code = gcNorm(inp.value);
  if (!code) return scToast('Hãy nhập Gift Code');
  if (!/^[A-Z0-9_-]{1,32}$/.test(code)) return scToast('Gift Code không hợp lệ');
  gcBusy = true;
  try {
    let rewards = null;
    if (typeof clUser !== 'undefined' && clUser && clDb) {
      try {
        const r = await gcRedeemCloud(code);
        if (r.rewards) rewards = r.rewards;
        else if (!(r.err === 'none' && GIFT_CODES[code])) return scToast(GC_ERR[r.err] || GC_ERR.none);   // 'none' + có mã dự phòng -> thử mã dự phòng
      } catch (e) {
        if (!GIFT_CODES[code]) return scToast(e && e.code === 'permission-denied' ? 'Chưa cấu hình quy tắc Firestore cho Gift Code' : 'Không kết nối được máy chủ, thử lại sau');
      }
    }
    if (!rewards) {   // mã dự phòng viết cứng
      const def = GIFT_CODES[code];
      if (!def) return scToast(typeof clUser !== 'undefined' && clUser ? GC_ERR.none : 'Hãy đăng nhập tài khoản để nhập Gift Code');
      const used = gcUsed();
      if (used[code]) return scToast(GC_ERR.used);
      used[code] = Date.now(); saveJSON('giftcode_used', used);
      rewards = def.rewards;
    }
    const got = rewards.map(gcGrant).filter(Boolean);
    inp.value = '';
    document.getElementById('gc-modal').style.display = 'none';
    if (document.getElementById('bag-modal').style.display === 'flex') renderBag();
    scToast('🎁 Nhận: ' + got.join(', '));
    if (typeof clPush === 'function') clPush();   // lưu ngay lên đám mây để quà không bị mất
  } finally { gcBusy = false; }
}

function openGiftCode() {
  const m = document.getElementById('gc-modal');
  m.innerHTML = `<div class="md-box" style="max-width:320px"><button class="md-x" onclick="closeGiftCode()">✕</button>
    <div class="hd-name" style="text-align:center;color:#fde047">🎁 Gift Code</div>
    <div class="set-note" style="text-align:center">Nhập mã để nhận quà. Mỗi mã chỉ dùng được 1 lần trên mỗi tài khoản.</div>
    <input id="gc-input" type="text" maxlength="32" placeholder="Nhập Gift Code" class="gc-input" autocomplete="off" autocapitalize="characters" spellcheck="false" onkeydown="if(event.key==='Enter')gcRedeem()">
    <div class="gs-act" style="justify-content:center;gap:10px;margin:8px 0 0"><button onclick="closeGiftCode()">Hủy</button><button onclick="gcRedeem()">Nhận Quà</button></div></div>`;
  m.style.display = 'flex'; setTimeout(() => { const i = document.getElementById('gc-input'); if (i) i.focus(); }, 50);
}
function closeGiftCode() { document.getElementById('gc-modal').style.display = 'none'; }

(function () { const d = document.createElement('div'); d.id = 'gc-modal'; d.className = 'md-wrap'; d.style.zIndex = 400; d.onclick = e => { if (e.target === d) d.style.display = 'none'; }; document.body.appendChild(d); })();

;
/* === js/core/backup.js === */
/* SAO LƯU / CHUYỂN DỮ LIỆU GIỮA CÁC MÁY
   (tách từ index.html cũ — script) */

/* ===== SAO LƯU / CHUYỂN DỮ LIỆU GIỮA CÁC MÁY ===== */
const SV_KEYS = ['pve_progress','team_ids','hero_stat_ov','hero_role','hero_prog','acc_level','acc_exp',
                 'player_name','ts_bag','ts_shards','eq_bag','eq_lv','eq_mount','eq_reward_done','auto_battle','pvp_state','audio_set','sta_state',
                 'gold_val','silver_val','rice_val','mail_state','ham_claimed','ham_spent','hero_shards','rec_state','guild_state','quest_state','giftcode_used','blank_start','hero_owned'];
function svMsg(t, ok) { const e = document.getElementById('sv-msg'); e.style.color = ok === false ? '#f87171' : '#4ade80'; e.innerText = t; }
function svCollect() {
  const d = {};
  SV_KEYS.forEach(k => { try { const v = localStorage.getItem(k); if (v !== null) d[k] = v; } catch (e) {} });
  return { game: 'pve-heroes', v: 1, t: Date.now(), data: d };
}
function svEncode(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))); }
function svDecode(s) {
  s = (s || '').trim();
  if (!s) throw new Error('empty');
  const o = s[0] === '{' ? JSON.parse(s) : JSON.parse(decodeURIComponent(escape(atob(s))));
  if (!o || o.game !== 'pve-heroes' || !o.data) throw new Error('bad');
  return o;
}
function svExportCode() {
  const code = svEncode(svCollect());
  const box = document.getElementById('sv-box'); box.value = code; box.select();
  const done = () => svMsg('✔ Đã tạo mã và copy. Dán mã này vào máy khác (mục Nhập mã).');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, () => svMsg('✔ Đã tạo mã. Hãy copy thủ công trong ô trên.'));
  else { try { document.execCommand('copy'); } catch (e) {} svMsg('✔ Đã tạo mã. Hãy copy thủ công trong ô trên.'); }
}
function svExportFile() {
  const blob = new Blob([JSON.stringify(svCollect())], { type: 'application/json' });
  const a = document.createElement('a');
  const d = new Date(), z = n => String(n).padStart(2, '0');
  a.href = URL.createObjectURL(blob);
  a.download = `save-game-${d.getFullYear()}${z(d.getMonth()+1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  svMsg('✔ Đã tải file lưu. Chép file này sang máy khác rồi chọn "Nhập từ file".');
}
function svApply(o) {
  if (!confirm('Dữ liệu hiện tại trên máy này sẽ bị GHI ĐÈ bằng dữ liệu đã lưu. Tiếp tục?')) return;
  try {
    SV_KEYS.forEach(k => localStorage.removeItem(k));
    Object.keys(o.data).forEach(k => { if (SV_KEYS.includes(k)) localStorage.setItem(k, o.data[k]); });
  } catch (e) { svMsg('Không ghi được dữ liệu (trình duyệt chặn lưu trữ?).', false); return; }
  svMsg('✔ Nhập thành công, đang tải lại game...');
  setTimeout(() => location.reload(), 600);
}
function svImportCode() {
  try { svApply(svDecode(document.getElementById('sv-box').value)); }
  catch (e) { svMsg('Mã không hợp lệ. Hãy dán đúng toàn bộ mã đã xuất.', false); }
}
function svImportFile(inp) {
  const f = inp.files && inp.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { try { svApply(svDecode(String(r.result))); } catch (e) { svMsg('File không hợp lệ.', false); } inp.value = ''; };
  r.readAsText(f);
}

;
/* === js/cloud/cloud.js === */
/* LƯU ĐÁM MÂY (Firebase): đăng ký / đăng nhập, đồng bộ, đăng đội hình PVP
   (tách từ index.html cũ — script) */

/* ===== LƯU ĐÁM MÂY (FIREBASE) - đăng nhập tên + mật khẩu, đồng bộ mọi máy / mọi web ===== */
// >>> DÁN CẤU HÌNH FIREBASE CỦA BẠN VÀO ĐÂY (xem hướng dẫn) <<<
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDOWlrfsWTx0HNWQAYvPHw7fWHlFP3UNu4",
  authDomain: "game-118e8.firebaseapp.com",
  projectId: "game-118e8",
  storageBucket: "game-118e8.firebasestorage.app",
  messagingSenderId: "612432319937",
  appId: "1:612432319937:web:0e2ba2a7ecc032d8150b40"
};
const CL_DOMAIN = '@mhgh-game.app';
const CL_SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
const _lsGet = Storage.prototype.getItem, _lsSet = Storage.prototype.setItem, _lsDel = Storage.prototype.removeItem;
const CL_HIST_HOURS = 72, CL_SNAP_GAP = 10 * 60e3, CL_CTL_POLL = 60e3;   // giữ ảnh chụp tài khoản theo GIỜ trong 72 giờ (admin khôi phục về khung giờ trước)
let clEp = 0, clSnapT = 0, clSnapKey = '', clPruned = false, clCtlTimer = null, clLocked = false;
var clAuth = null, clDb = null, clUser = null, clTimer = null, clDirty = false, clAsk = false, clBusy = false, clInited = false, clFresh = false, clWiping = false, clReady = '';
const clOwner = () => { try { return _lsGet.call(localStorage, 'cloud_owner') || ''; } catch (e) { return ''; } };
const clSetOwner = u => { try { _lsSet.call(localStorage, 'cloud_owner', u); } catch (e) {} };
// Đồng bộ xong -> sau 2,5 giây đăng lại đội hình Tỷ Võ mới (bỏ cờ stale do admin đặt khi reset / khôi phục)
function clReadyOk(uid) { clReady = uid; clSetOwner(uid); clStartCtlPoll(); setTimeout(() => { try { clPublishPvp().catch(() => {}); } catch (e) {} }, 2500); if (clDirty && !clTimer) clTimer = setTimeout(clPush, 3000); }
const clCfgOk = () => !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
const clLocalT = () => Number(_lsGet.call(localStorage, 'cloud_local_t')) || 0;
const clHasLocal = () => SV_KEYS.some(k => _lsGet.call(localStorage, k) !== null);

function clMsg(t, ok) { ['cl-msg', 'lg-msg', 'rg-msg'].forEach(id => { const e = document.getElementById(id); if (!e) return; e.style.color = ok === false ? '#f87171' : '#4ade80'; e.innerText = t || ''; }); }

// Mỗi khi game ghi dữ liệu -> đánh dấu thay đổi và tự đẩy lên đám mây sau 10 giây (không bị dời lại nếu đã hẹn giờ)
function clTouch() {
  try { _lsSet.call(localStorage, 'cloud_local_t', String(Date.now())); } catch (e) {}
  clDirty = true;
  if (clUser && !clTimer) { clTimer = setTimeout(clPush, 10000); }
}
Storage.prototype.setItem = function (k, v) { if (clWiping && this === localStorage && SV_KEYS.indexOf(k) >= 0) return; _lsSet.call(this, k, v); if (this === localStorage && SV_KEYS.indexOf(k) >= 0) clTouch(); };
Storage.prototype.removeItem = function (k) { if (clWiping && this === localStorage && SV_KEYS.indexOf(k) >= 0) return; _lsDel.call(this, k); if (this === localStorage && SV_KEYS.indexOf(k) >= 0) clTouch(); };

function clLoadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load ' + src)); document.head.appendChild(s); });
}
async function clInit() {
  if (clInited) return; clInited = true;
  clRender();
  if (!clCfgOk()) { lgOfflineShow(); return; }
  try {
    await clLoadScript(CL_SDK + 'firebase-app-compat.js');
    await Promise.all([clLoadScript(CL_SDK + 'firebase-auth-compat.js'), clLoadScript(CL_SDK + 'firebase-firestore-compat.js')]);
    firebase.initializeApp(FIREBASE_CONFIG);
    clAuth = firebase.auth(); clDb = firebase.firestore();
    clAuth.onAuthStateChanged(u => { clUser = u; if (!u) clSessStop(); clRender(); lgUpdate(u); try { if (typeof updateMailBadge === 'function') updateMailBadge(); } catch (e) {} if (u) clSync(); });
  } catch (e) { clMsg('Không tải được Firebase (mất mạng hoặc bị chặn). Game vẫn chơi bình thường.', false); lgOfflineShow(); }
}

function clErr(e) {
  const c = (e && e.code) || '';
  if (c === 'auth/email-already-in-use') return 'Tên tài khoản này đã có người dùng.';
  if (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/user-not-found' || c === 'auth/invalid-login-credentials') return 'Sai tên tài khoản hoặc mật khẩu.';
  if (c === 'auth/weak-password') return 'Mật khẩu quá yếu (tối thiểu 6 ký tự).';
  if (c === 'auth/network-request-failed') return 'Mất kết nối mạng.';
  if (c === 'auth/too-many-requests') return 'Thử quá nhiều lần, hãy đợi một lát.';
  if (c === 'auth/operation-not-allowed') return 'Chưa bật đăng nhập Email/Password trong Firebase.';
  if (c === 'permission-denied') return 'Chưa cấu hình quy tắc Firestore (xem hướng dẫn).';
  return 'Lỗi: ' + (c || (e && e.message) || 'không rõ');
}
function clCred(pfx) {
  pfx = pfx || 'cl';
  const u = (document.getElementById(pfx + '-user').value || '').trim().toLowerCase();
  const p = document.getElementById(pfx + '-pass').value || '';
  if (!/^[a-z0-9_]{3,20}$/.test(u)) { clMsg('Tên tài khoản: 3-20 ký tự, chỉ chữ thường không dấu, số, dấu _', false); return null; }
  if (p.length < 6) { clMsg('Mật khẩu tối thiểu 6 ký tự.', false); return null; }
  return { email: u + CL_DOMAIN, pass: p, name: u };
}
async function clRegister(pfx) {
  const c = clCred(pfx); if (!c) return;
  if (!clAuth) { clMsg('Đang kết nối máy chủ, vui lòng thử lại sau giây lát.', false); return; }
  if (clHasLocal() && !confirm('Đăng ký tài khoản mới sẽ CHƠI LẠI TỪ ĐẦU.\nDữ liệu đang có trên máy này sẽ bị xóa (hãy đăng nhập tài khoản cũ để lưu trước nếu cần).\n\nTiếp tục đăng ký?')) return;
  clMsg('Đang tạo tài khoản...'); clFresh = true;
  try { await clAuth.createUserWithEmailAndPassword(c.email, c.pass); clMsg('✔ Đã tạo tài khoản mới, đang bắt đầu lại từ đầu...'); }
  catch (e) { clFresh = false; clMsg(clErr(e), false); }
}
// Tài khoản vừa đăng ký: xóa dữ liệu cũ trên máy rồi tải lại để chơi từ đầu (không đẩy dữ liệu cũ lên tài khoản mới)
function clStartFresh(uid) {
  clWiping = true;
  clearTimeout(clTimer); clTimer = null; clDirty = false;
  try {
    SV_KEYS.forEach(k => _lsDel.call(localStorage, k));
    _lsSet.call(localStorage, 'blank_start', '1');   // tài khoản mới = tài khoản mặc định: mọi thứ về 1, tướng phải Chiêu Mộ mới có
    _lsSet.call(localStorage, 'cloud_local_t', String(Date.now()));
    _lsSet.call(localStorage, 'cloud_ep', String(clEp || 0));
    if (uid) _lsSet.call(localStorage, 'cloud_owner', uid);
  } catch (e) {}
  setTimeout(() => location.reload(), 600);
}
async function clLogin(pfx) {
  const c = clCred(pfx); if (!c) return;
  if (!clAuth) { clMsg('Đang kết nối máy chủ, vui lòng thử lại sau giây lát.', false); return; }
  clMsg('Đang đăng nhập...'); clAsk = true;
  try { await clAuth.signInWithEmailAndPassword(c.email, c.pass); }
  catch (e) { clAsk = false; clMsg(clErr(e), false); }
}
async function clLogout() {
  if (!clAuth) return;
  let ok = true;
  try { ok = await clPush(); } catch (e) { ok = false; }
  if (!ok && !confirm('Không lưu được tiến trình lên đám mây (mất mạng?).\nĐăng xuất bây giờ sẽ MẤT phần chưa lưu của tài khoản này.\n\nVẫn đăng xuất?')) return;
  clWiping = true; clearTimeout(clTimer); clTimer = null; clDirty = false; clSessStop();
  try { await clAuth.signOut(); } catch (e) { clWiping = false; clMsg(clErr(e), false); return; }
  clSidSet('');
  // dữ liệu thuộc về tài khoản đã nằm trên đám mây -> xóa khỏi máy để tài khoản khác không dùng chung
  try { SV_KEYS.forEach(k => _lsDel.call(localStorage, k)); _lsDel.call(localStorage, 'cloud_owner'); _lsDel.call(localStorage, 'cloud_local_t'); } catch (e) {}
  location.reload();
}

async function clPush() {
  if (!clUser || !clDb) return false;
  clearTimeout(clTimer); clTimer = null;
  if (clReady !== clUser.uid) return false;   // chưa đồng bộ xong / dữ liệu trên máy không thuộc tài khoản này
  const t = clLocalT() || Date.now();
  try {
    const data = svCollect().data;
    await clDb.collection('saves').doc(clUser.uid).set({ t: t, data: data, ep: clEp });
    _lsSet.call(localStorage, 'cloud_local_t', String(t)); clDirty = false; clSetOwner(clUser.uid);
    clPublishPvp().catch(() => {});   // cập nhật đội hình Tỷ Võ cho người chơi khác
    clSnap(data, t).catch(() => {});  // ảnh chụp theo giờ (để admin khôi phục)
    clMsg('☁️ Đã lưu lên đám mây ' + new Date().toLocaleTimeString());
    return true;
  } catch (e) { if (e && e.code === 'permission-denied') clCheckCtl(); clMsg(clErr(e), false); return false; }
}
// Đăng "ảnh chụp" đội hình Tỷ Võ (chỉ số đã tính đủ trang bị / Bảo Vật / cộng dồn Tỷ Võ) để tài khoản khác đấu được với mình
async function clPublishPvp() {
  if (!clUser || !clDb) return;
  const ids = (team || []).filter(id => heroById(id)); if (!ids.length) return;
  const _tt = (typeof ttMine === 'function' && ttMine()) || null, _bn = _tt ? ttBonus(_tt.pt) : {};
  const tm = ids.map(id => { const s = heroBattleStats(id, true, _bn); return { id, hp: s.hp, atk: s.atk, def: s.def, spd: s.spd, dodge: s.dodge, acc: s.acc, crit: s.crit, critDmg: s.critDmg, tough: s.tough, pierce: s.pierce, tia: s.tia || 1, block: s.block, heal: s.heal || 0, star: getProg(id).star, sk: skillMult(id) }; });
  const ref = clDb.collection('pvp_players').doc(clUser.uid);
  const data = { name: pvName(), lvl: accLevel, wins: pvpState.wins, stale: false, locked: false,
    power: tm.reduce((a, s) => a + unitPower(s), 0), t: Date.now(), team: tm, beast: _tt ? _tt.beast : '', pt: _tt ? _tt.pt : [] };
  const cur = await ref.get();
  if (!cur.exists || typeof (cur.data() || {}).rank !== 'number') { data.rank = await pvpNewKey(); data.rt = Date.now(); }   // tài khoản mới xếp tiếp xuống cuối bảng; sau đó đổi qua pvpRankCloud
  await ref.set(data, { merge: true });
}

/* ===== ADMIN: KHÓA TÀI KHOẢN / RESET / KHÔI PHỤC VỀ KHUNG GIỜ TRƯỚC =====
   account_ctl/{uid} = { locked, reason, epoch }  (chỉ admin ghi). epoch tăng mỗi lần admin reset / khôi phục / sửa vật phẩm:
   máy nào có epoch cũ sẽ bị BỎ dữ liệu trên máy và tải lại dữ liệu mới từ mây; luật Firestore cũng chặn máy cũ ghi đè (saves.ep phải khớp). */
const clLocalEp = () => Number(_lsGet.call(localStorage, 'cloud_ep')) || 0;
const clSetLocalEp = n => { try { _lsSet.call(localStorage, 'cloud_ep', String(n || 0)); } catch (e) {} };
async function clReadCtl() {
  const d = await clDb.collection('account_ctl').doc(clUser.uid).get();
  return d.exists ? d.data() : {};
}
function clLockOut(reason) {
  if (clLocked) return; clLocked = true;
  clWiping = true; clearTimeout(clTimer); clTimer = null; clDirty = false; clearInterval(clCtlTimer); clCtlTimer = null;
  const done = () => {
    try { SV_KEYS.forEach(k => _lsDel.call(localStorage, k)); _lsDel.call(localStorage, 'cloud_owner'); _lsDel.call(localStorage, 'cloud_local_t'); _lsDel.call(localStorage, 'cloud_ep'); } catch (e) {}
    alert('🔒 Tài khoản này đã bị KHÓA bởi quản trị viên.' + (reason ? '\nLý do: ' + reason : ''));
    location.reload();
  };
  try { clAuth.signOut().then(done, done); } catch (e) { done(); }
}
/* ===== 1 TÀI KHOẢN CHỈ ĐĂNG NHẬP ĐƯỢC 1 MÁY =====
   sessions/{uid} = { sid, t, ua }  (Firestore). Mỗi lần ĐĂNG NHẬP / ĐĂNG KÝ chủ động, máy đó ghi 1 mã phiên (sid) mới -> máy cũ nghe thay đổi (onSnapshot) và bị đăng xuất ngay.
   Máy tự khôi phục phiên cũ khi mở lại trang: sid trên máy phải khớp sid trên mây, không khớp (hoặc máy chưa có sid) thì bị đăng xuất.
   Nếu Firestore chưa cho phép ghi sessions (luật) hoặc mất mạng: bỏ qua, game vẫn chơi bình thường (không chặn người chơi). */
let clSessUnsub = null;
const clSidGet = () => { try { return _lsGet.call(localStorage, 'cloud_sid') || ''; } catch (e) { return ''; } };
const clSidSet = v => { try { if (v) _lsSet.call(localStorage, 'cloud_sid', v); else _lsDel.call(localStorage, 'cloud_sid'); } catch (e) {} };
function clSessStop() { try { if (clSessUnsub) clSessUnsub(); } catch (e) {} clSessUnsub = null; }
function clKick() {
  if (clLocked) return; clLocked = true;
  clWiping = true; clearTimeout(clTimer); clTimer = null; clDirty = false; clearInterval(clCtlTimer); clCtlTimer = null; clSessStop();
  const done = () => {
    try { SV_KEYS.forEach(k => _lsDel.call(localStorage, k)); _lsDel.call(localStorage, 'cloud_owner'); _lsDel.call(localStorage, 'cloud_local_t'); _lsDel.call(localStorage, 'cloud_ep'); clSidSet(''); } catch (e) {}
    alert('⚠️ Tài khoản này vừa được đăng nhập ở thiết bị khác.\nMáy này đã bị đăng xuất.');
    location.reload();
  };
  try { clAuth.signOut().then(done, done); } catch (e) { done(); }
}
function clWatchSession(ref, sid) {
  clSessStop();
  try {
    clSessUnsub = ref.onSnapshot(snap => {
      if (snap.metadata && snap.metadata.fromCache) return;
      const cur = snap.exists ? ((snap.data() || {}).sid || '') : '';
      if (cur && cur !== sid) clKick();
    }, () => {});
  } catch (e) {}
}
// explicit = vừa bấm Đăng nhập / Đăng ký trên máy này (chiếm phiên). Trả về false nếu máy này bị đăng xuất vì máy khác đang giữ phiên.
async function clSession(explicit, uid) {
  if (!clDb || !uid) return true;
  try {
    const ref = clDb.collection('sessions').doc(uid), mine = clSidGet();
    if (!explicit) {
      const d = await ref.get(), cur = d.exists ? ((d.data() || {}).sid || '') : '';
      if (cur && cur !== mine) { clKick(); return false; }   // máy khác đang giữ phiên (hoặc máy này chưa có mã phiên)
      if (cur && cur === mine) { clWatchSession(ref, mine); return true; }
    }
    const sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    await ref.set({ sid, t: Date.now(), ua: String(navigator.userAgent || '').slice(0, 140) });
    clSidSet(sid); clWatchSession(ref, sid);
  } catch (e) { /* luật Firestore chưa mở sessions / mất mạng: bỏ qua */ }
  return true;
}
// Kiểm tra khóa / epoch. Trả về true nếu tài khoản dùng tiếp được ở trạng thái hiện tại.
async function clCheckCtl() {
  if (!clUser || !clDb || clLocked) return false;
  try {
    const c = await clReadCtl();
    if (c.locked) { clLockOut(c.reason || ''); return false; }
    const ep = Number(c.epoch) || 0;
    if (ep !== clEp || ep !== clLocalEp()) {   // admin vừa reset / khôi phục / chỉnh dữ liệu -> bỏ dữ liệu máy, tải bản mới
      if (clBusy) return true;
      clBusy = true;
      try {
        const snap = await clDb.collection('saves').doc(clUser.uid).get();
        clEp = ep; clSetLocalEp(ep);
        if (snap.exists) clApplyCloud(snap.data(), clUser.uid); else clStartFresh(clUser.uid);
      } finally { clBusy = false; }
      return false;
    }
  } catch (e) { /* mất mạng: bỏ qua, lần sau kiểm tra lại */ }
  return true;
}
function clStartCtlPoll() {
  if (clCtlTimer) return;
  clCtlTimer = setInterval(() => { if (document.visibilityState === 'visible') clCheckCtl(); }, CL_CTL_POLL);
}
// Sức mạnh (lực chiến) hiện tại của đội — ghi kèm ảnh chụp để admin chọn đúng mốc
function clPower() {
  try {
    const ids = (team || []).filter(id => heroById(id)); if (!ids.length) return 0;
    const _tt = (typeof ttMine === 'function' && ttMine()) || null, _bn = _tt ? ttBonus(_tt.pt) : {};
    return ids.reduce((a, id) => a + unitPower(heroBattleStats(id, true, _bn)), 0);
  } catch (e) { return 0; }
}
// Ảnh chụp mỗi GIỜ: save_history/{uid}/snaps/{yyyyMMddHH}. Cùng 1 giờ thì ghi đè bằng trạng thái mới nhất (cách nhau >= 10 phút).
async function clSnap(data, t) {
  if (!clUser || !clDb) return;
  const d = new Date(), z = n => String(n).padStart(2, '0');
  const key = '' + d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + z(d.getHours());
  if (key === clSnapKey && Date.now() - clSnapT < CL_SNAP_GAP) return;
  clSnapKey = key; clSnapT = Date.now();
  const col = clDb.collection('save_history').doc(clUser.uid).collection('snaps');
  await col.doc(key).set({ t: Date.now(), st: t, data: data, ep: clEp, pw: Math.round(clPower()), name: (typeof pvName === 'function' ? pvName() : '') });
  if (!clPruned) {   // mỗi phiên dọn 1 lần: xóa ảnh chụp quá CL_HIST_HOURS giờ
    clPruned = true;
    const old = await col.where('t', '<', Date.now() - CL_HIST_HOURS * 3600e3).limit(30).get();
    old.forEach(x => x.ref.delete().catch(() => {}));
  }
}
function clApplyCloud(cloud, uid) {
  try {
    SV_KEYS.forEach(k => _lsDel.call(localStorage, k));
    Object.keys(cloud.data || {}).forEach(k => { if (SV_KEYS.includes(k)) _lsSet.call(localStorage, k, cloud.data[k]); });
    _lsSet.call(localStorage, 'cloud_local_t', String(cloud.t || 0));
    _lsSet.call(localStorage, 'cloud_ep', String(clEp || 0));
    if (uid) _lsSet.call(localStorage, 'cloud_owner', uid);
  } catch (e) { clMsg('Không ghi được dữ liệu vào máy này.', false); return; }
  clMsg('✔ Đã tải dữ liệu từ đám mây, đang tải lại game...');
  setTimeout(() => location.reload(), 500);
}
// Đồng bộ theo TÀI KHOẢN: dữ liệu trên máy có "chủ" (cloud_owner). Khác chủ -> luôn lấy dữ liệu đám mây của tài khoản đang đăng nhập
// (không bao giờ đẩy dữ liệu của tài khoản khác lên). Cùng chủ -> bản nào MỚI HƠN thì thắng.
async function clSync() {
  if (!clUser || !clDb || clBusy) return; clBusy = true;
  const ask = clAsk; clAsk = false;
  const fresh = clFresh; clFresh = false;
  const uid = clUser.uid;
  try {   // admin: tài khoản bị khóa -> đăng xuất; epoch (reset/khôi phục) -> luôn lấy dữ liệu mây
    const c = await clReadCtl();
    if (c.locked) { clBusy = false; clLockOut(c.reason || ''); return; }
    clEp = Number(c.epoch) || 0;
  } catch (e) { clEp = clLocalEp(); }
  if (!(await clSession(ask || fresh, uid))) { clBusy = false; return; }   // 1 tài khoản chỉ 1 máy: đăng nhập máy mới thì máy cũ bị out
  if (fresh) { clStartFresh(uid); clBusy = false; return; }
  try {
    const snap = await clDb.collection('saves').doc(uid).get();
    if (snap.exists && clEp !== clLocalEp()) { clApplyCloud(snap.data(), uid); clBusy = false; return; }
    if (!snap.exists && clEp !== clLocalEp()) { clStartFresh(uid); clBusy = false; return; }
    const cloud = snap.exists ? snap.data() : null, lt = clLocalT(), has = clHasLocal();
    let owner = clOwner();
    if (!owner && !ask && has) owner = uid;   // phiên đăng nhập cũ (trước khi có cơ chế gắn chủ): coi dữ liệu máy là của tài khoản này
    if (owner && owner !== uid) {             // dữ liệu trên máy là của tài khoản khác
      if (cloud) clApplyCloud(cloud, uid); else clStartFresh(uid);
    }
    else if (!cloud) { if (has) { clReadyOk(uid); await clPush(); } else { clStartFresh(uid); } }   // chưa có dữ liệu ở đâu cả = tài khoản mới -> bắt đầu từ mặc định (tất cả về 1)
    else if (owner !== uid) { clApplyCloud(cloud, uid); }   // máy chưa thuộc ai: ưu tiên dữ liệu đã lưu của tài khoản
    else if (cloud.t === lt) { clReadyOk(uid); clMsg('☁️ Dữ liệu đã đồng bộ.'); }
    else if (!has || cloud.t > lt) { clApplyCloud(cloud, uid); }
    else { clReadyOk(uid); await clPush(); }
  } catch (e) { clMsg(clErr(e), false); }
  clBusy = false;
}

function clRender() {
  try { applyPlayerName(); } catch (e) {}
  const box = document.getElementById('cl-box'); if (!box) return;
  if (!clCfgOk()) {
    box.innerHTML = '<div class="cl-status">⚠️ Chưa cấu hình Firebase. Mở file game, tìm <b>FIREBASE_CONFIG</b> và dán thông tin dự án Firebase của bạn vào. Khi chưa cấu hình, game vẫn lưu trên máy như bình thường.</div>';
  } else if (clUser) {
    const n = (clUser.email || '').replace(CL_DOMAIN, '');
    box.innerHTML = '<div class="cl-status">Đang đăng nhập: <b>' + n + '</b><br>Tiến trình tự động lưu lên đám mây sau 10 giây kể từ khi thay đổi.</div>' +
      '<div class="md-acts"><button class="btn-attack" onclick="clPush()">☁️ Lưu ngay</button><button class="btn-close-battle" onclick="clLogout()">Đăng xuất</button></div>';
  } else {
    box.innerHTML = '<div class="cl-status">Tạo tài khoản (hoặc đăng nhập) để chơi tiếp trên mọi máy và mọi web.</div>' +
      '<input class="cl-in" id="cl-user" placeholder="Tên tài khoản (a-z, 0-9, _)" autocapitalize="none" autocomplete="username" maxlength="20">' +
      '<input class="cl-in" id="cl-pass" type="password" placeholder="Mật khẩu (từ 6 ký tự)" autocomplete="current-password">' +
      '<div class="md-acts"><button class="btn-attack" onclick="clLogin()">Đăng nhập</button><button class="btn-close-battle" onclick="clRegister()">Đăng ký</button></div>';
  }
}
// Khi rời trang / chuyển tab: đẩy dữ liệu chưa lưu
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && clDirty && clUser) clPush(); else if (document.visibilityState === 'visible' && clUser) clCheckCtl(); });
window.addEventListener('pagehide', () => { if (clDirty && clUser) clPush(); });

;
/* === js/cloud/login-screen.js === */
/* MÀN HÌNH ĐĂNG NHẬP: hiện khi chưa đăng nhập
   (tách từ index.html cũ — script) */

/* ===== MÀN HÌNH ĐĂNG NHẬP: hiện khi chưa đăng nhập, tự ẩn khi đã đăng nhập ===== */
let lgReady = false;
const lgEl = id => document.getElementById(id);
function lgShow(on) { const e = lgEl('login-screen'); if (e) e.style.display = on ? 'block' : 'none'; }
function lgReg(on) { const e = lgEl('lg-reg'); if (!e) return; e.style.display = on ? 'flex' : 'none'; if (on) { const m = lgEl('rg-msg'); if (m) m.innerText = ''; setTimeout(() => { const i = lgEl('rg-user'); if (i) i.focus(); }, 50); } }
function lgOfflineShow() { const o = lgEl('lg-off'); if (o) o.style.display = 'block'; }
function lgUpdate(u) {
  try { _lsSet.call(localStorage, 'cl_was_in', u ? '1' : '0'); } catch (e) {}
  if (u) {
    try { _lsSet.call(localStorage, 'cl_last_name', (u.email || '').replace(CL_DOMAIN, '')); } catch (e) {}
    lgReg(false); lgShow(false);
    const p = lgEl('lg-pass'); if (p) p.value = '';
    return;
  }
  if (!lgReady) { lgReady = true; clMsg(''); }   // lần đầu kết nối xong: xóa dòng "Đang kết nối..."
  lgShow(true);
  const un = lgEl('lg-user'), pw = lgEl('lg-pass');
  if (pw) pw.value = '';
  try { if (un && !un.value) un.value = _lsGet.call(localStorage, 'cl_last_name') || ''; } catch (e) {}
}
function lgLogin() { clLogin('lg'); }
function lgRegister() {
  const p1 = lgEl('rg-pass').value || '', p2 = lgEl('rg-pass2').value || '';
  if (p1 !== p2) { clMsg('Mật khẩu nhập lại không khớp.', false); return; }
  clRegister('rg');
}
clInit();

;
/* === js/social/chat.js === */
/* KHUNG CHAT GIỮA CÁC TÀI KHOẢN ONLINE (Thẻ Tháng + Bang Hội)
   Firestore: collection chat_messages {uid, name, text, t, expireAt} — cần quy tắc ở README
   • Mỗi tin nhắn chỉ sống tối đa 6 giờ (CH_TTL):
       1) Truy vấn + hiển thị chỉ lấy tin còn trong 6h; khi mở chat đang treo, quá 6h là tin tự biến mất.
       2) Khi mở chat, dọn luôn các tin quá hạn trên Firestore (cần quy tắc cho phép xóa tin quá 6h).
       3) Mỗi tin có trường expireAt (Timestamp) để bật Firestore TTL policy: tự xóa hẳn trên server. */
let chUnsub = null, chMsgs = [], chTimer = null;
const CH_TTL = 6 * 60 * 60 * 1000;   // 6 giờ
function scToast(t) { const d = document.createElement('div'); d.className = 'sc-toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 1800); }
function chEsc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
// Dòng ghi chú: chỉ hiện khi có lỗi/cảnh báo (câu "Kênh chung..." đã vẽ sẵn trong khung ảnh)
function chNote(msg) { const n = document.getElementById('chat-note'); if (!n) return; n.textContent = msg || ''; n.className = msg ? 'err' : ''; }
function chRender() {
  const el = document.getElementById('chat-list'); if (!el) return;
  const me = clUser && clUser.uid, cut = Date.now() - CH_TTL;
  const list = chMsgs.filter(m => (m.t || Date.now()) >= cut);   // bỏ tin quá 6h
  el.innerHTML = list.length ? list.map(m => {
    const d = new Date(m.t || Date.now()), tm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    return `<div class="ch-msg ${m.uid === me ? 'me' : ''}"><b>${chEsc(m.name || '?')}</b>${chEsc(m.text)}<small>${tm}</small></div>`;
  }).join('') : '<div class="ch-empty">Chưa có tin nhắn nào. Hãy là người nói trước!</div>';
  el.scrollTop = el.scrollHeight;
}
// Xóa trên Firestore các tin quá 6h (mỗi lần tối đa 100 tin; lỗi quyền thì bỏ qua, TTL policy sẽ lo)
async function chCleanup() {
  try {
    const s = await clDb.collection('chat_messages').where('t', '<', Date.now() - CH_TTL).limit(100).get();
    if (s.empty) return;
    const b = clDb.batch(); s.docs.forEach(d => b.delete(d.ref)); await b.commit();
  } catch (e) { /* chưa có quyền xóa → bỏ qua */ }
}
function openChat() {
  document.getElementById('chat-modal').style.display = 'flex';
  if (!clDb || !clUser) { chNote('Cần đăng nhập đám mây (và có mạng) để chat.'); chMsgs = []; chRender(); return; }
  chNote('');
  if (chUnsub) chUnsub();
  chUnsub = clDb.collection('chat_messages').where('t', '>=', Date.now() - CH_TTL).orderBy('t', 'desc').limit(50).onSnapshot(s => {
    chMsgs = s.docs.map(d => d.data()).reverse(); chRender();
  }, e => { chNote((e && e.code === 'permission-denied') ? 'Chưa cấu hình quy tắc Firestore cho chat (xem README).' : 'Không tải được tin nhắn.'); });
  clearInterval(chTimer); chTimer = setInterval(chRender, 60000);   // mỗi phút quét lại để tin quá 6h biến mất
  chCleanup();
}
function closeChat() {
  document.getElementById('chat-modal').style.display = 'none';
  if (chUnsub) { chUnsub(); chUnsub = null; }
  clearInterval(chTimer); chTimer = null;
}
let chLast = 0;
async function sendChat() {
  const inp = document.getElementById('chat-input'), text = inp.value.trim().slice(0, 200);
  if (!text) return;
  if (!clDb || !clUser) { scToast('Chưa đăng nhập đám mây'); return; }
  if (Date.now() - chLast < 1500) { scToast('Gửi chậm lại một chút'); return; }
  chLast = Date.now(); inp.value = '';
  const t = Date.now(), msg = { uid: clUser.uid, name: pvName(), text, t };
  try { if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.Timestamp) msg.expireAt = firebase.firestore.Timestamp.fromMillis(t + CH_TTL); } catch (e) {}
  try { await clDb.collection('chat_messages').add(msg); }
  catch (e) { scToast('Gửi thất bại'); }
}

;
/* === js/social/vohiep-hub.js === */
/* HUB "VÕ HIỆP" (thanh dưới) + MÀN CHỌN TƯỚNG TĂNG CẤP (nút Tăng Cấp ở trang chủ) */
function openVhub() { switchScreen('vhub'); }
function vhGo(k) {
  if (k === 'manh') return openVhero();
  if (k === 'sao' || k === 'boiduong' || k === 'kynang' || k === 'phamchat') return openPicker(k);
  scToast('Tính năng sắp ra mắt');
}
let pkMode = 'boiduong';
function openPicker(mode) {
  pkMode = mode || 'boiduong';
  const t = { boiduong: 'Chọn Võ Hiệp thăng cấp', sao: 'Chọn Võ Hiệp tăng sao', kynang: 'Chọn Võ Hiệp nâng kỹ năng', phamchat: 'Chọn Võ Hiệp nâng phẩm chất' }[pkMode];
  document.getElementById('pk-title').textContent = t;
  const order = ownedHeroes().sort((a, b) => (team.includes(b.id) - team.includes(a.id)) || (getProg(b.id).lv - getProg(a.id).lv));
  if (!order.length) { scToast('Chưa có tướng nào — hãy Chiêu Mộ trước'); return; }
  document.getElementById('pk-grid').innerHTML = order.map(h => {
    const p = getProg(h.id), inTeam = team.includes(h.id);
    return `<div class="pk-card ${(HERO_BORDER[h.id] || 'orange') === 'purple' ? 'purple' : ''}" onclick="openUpg(${h.id})">${inTeam ? '<div class="pk-tag">Đội</div>' : ''}<div class="e">${heroIcon(h)}</div><div class="n">${h.name}</div><div class="st">${'★'.repeat(Math.min(p.star, 5)) || '☆'}${p.star > 5 ? '×' + p.star : ''}</div>${pkMode === 'sao' ? `<div class="lv">${shardsOf(h.id)} mảnh</div>` : pkMode === 'kynang' ? `<div class="lv">Kỹ năng ${p.sk}</div>` : pkMode === 'phamchat' ? `<div class="lv" style="color:${QL_COLOR[p.ql]};font-weight:900">Phẩm chất ${QL_NAMES[p.ql]}</div>` : `<div class="lv">Lv${p.lv}</div>`}</div>`;
  }).join('');
  document.querySelector('#screen-picker .pk-sub').textContent = { boiduong: 'Chọn tướng để thăng cấp', sao: 'Chọn tướng để tăng sao (cần mảnh tướng)', kynang: 'Chọn tướng để nâng kỹ năng', phamchat: 'Chọn tướng để nâng phẩm chất' }[pkMode];
  switchScreen('picker');
}

/* DANH SÁCH VÕ HIỆP: chỉ hiện ảnh tướng; bấm vào để xem toàn bộ thông tin tướng */
function openVhero() {
  const order = ownedHeroes().sort((a, b) => (team.includes(b.id) - team.includes(a.id)) || (getProg(b.id).lv - getProg(a.id).lv));
  if (!order.length) { scToast('Chưa có tướng nào — hãy Chiêu Mộ trước'); return; }
  document.getElementById('vg-grid').innerHTML = order.map(h =>
    `<div class="vg-card ${(HERO_BORDER[h.id] || 'orange') === 'purple' ? 'purple' : ''}" onclick="openHeroDetail(${h.id})"><div class="e">${heroIcon(h)}</div></div>`).join('');
  switchScreen('vhero');
}

;
/* === js/heroes/team-screen.js === */
/* ĐỘI NGŨ (màn hình đầy đủ) + DÀN HỖ TRỢ + màn chọn tướng để đổi
   - Bấm vào 1 tướng (ô đội ngũ hoặc ô hỗ trợ) → sang màn "Chọn Võ Hiệp" để đổi; "Gỡ Ra" để bỏ tướng khỏi ô.
   - Chọn tướng đang ở chỗ khác (đội ↔ hỗ trợ) thì 2 tướng ĐỔI CHỖ cho nhau.
   - Dữ liệu: team (roster.js, key 'team_ids') và supIds (hero-stats.js, key 'support_ids'). Công thức cộng chỉ số: supTotal() ở hero-stats.js. */

let tnTarget = null;     // ô đang đổi: { kind:'team'|'sup', idx }
let tnSortMode = 'lv';   // 'lv' = theo sao/cấp, 'id' = mặc định

const tnToast = m => { if (typeof scToast === 'function') scToast(m); else alert(m); };
const tnNum = v => v >= 1e6 ? fmtN(v) : Math.round(v).toLocaleString('vi-VN');
const tnBorder = id => ((typeof HERO_BORDER !== 'undefined' && HERO_BORDER[id]) || 'orange') === 'purple' ? 'purple' : '';
const tnSaveAll = () => { try { localStorage.setItem('team_ids', JSON.stringify(team)); } catch (e) {} supSave(); };
const tnCur = t => t.kind === 'team' ? (team[t.idx] == null ? null : team[t.idx]) : supIds[t.idx];
// tướng đang đứng ở đâu: { kind, idx } hoặc null
function tnLoc(id) {
  const t = team.indexOf(id); if (t >= 0) return { kind: 'team', idx: t };
  const s = supIds.indexOf(id); return s >= 0 ? { kind: 'sup', idx: s } : null;
}

/* Đặt tướng hid vào ô (kind, idx). hid = null → gỡ ra. Trả về false nếu bị chặn. */
function tnPlace(kind, idx, hid) {
  const cur = tnCur({ kind, idx });
  if (hid == null) {
    if (cur == null) return true;
    if (kind === 'team') { if (team.length <= 1) { tnToast('Đội phải có ít nhất 1 tướng ra trận'); return false; } team.splice(idx, 1); }
    else supIds[idx] = null;
    return true;
  }
  if (hid === cur) return true;
  const L = tnLoc(hid);
  // rút khỏi đội mà ô đích trống (hỗ trợ trống) → đội sẽ thiếu 1 tướng
  if (L && L.kind === 'team' && cur == null && team.length <= 1) { tnToast('Đội phải có ít nhất 1 tướng ra trận'); return false; }
  if (L) {   // tướng đang ở ô cũ → nhường chỗ cho tướng cũ của ô đích (hoặc bỏ trống)
    if (L.kind === 'team') { if (cur != null) team[L.idx] = cur; else team.splice(L.idx, 1); }
    else supIds[L.idx] = cur;
  }
  if (kind === 'team') { if (cur != null) team[idx] = hid; else team.push(hid); }
  else supIds[idx] = hid;
  return true;
}

/* ---------- màn Đội Ngũ ---------- */
function tnOpen() { tnRender(); switchScreen('team'); }
function tnBack() { switchScreen('home'); if (typeof renderHomeTeam === 'function') renderHomeTeam(); if (typeof updatePower === 'function') updatePower(); }
function tnPet() { if (typeof openThanThu === 'function') openThanThu(); else tnToast('Tính năng sắp ra mắt'); }

function tnRender() {
  const cards = [];
  for (let i = 0; i < 5; i++) {
    const id = team[i];
    if (id == null) { cards.push(`<div class="tn-card empty" onclick="tnOpenPick('team',${i})"><span>＋</span></div>`); continue; }
    const h = heroById(id), p = getProg(id);
    cards.push(`<div class="tn-card ${tnBorder(id)}" onclick="tnOpenPick('team',${i})">${i === 0 ? '<div class="tn-flag">🚩</div>' : ''}<div class="tn-img">${heroIcon(h)}</div><div class="tn-nm">${h.name}</div><div class="tn-lv">${p.lv}</div><div class="tn-st">${heroStarsHTML(p.star, { bigPx: 9 })}</div></div>`);
  }
  const sups = supIds.map((id, i) => {
    if (id == null) return `<div class="tn-sup empty" onclick="tnOpenPick('sup',${i})"><span>＋</span></div>`;
    const h = heroById(id), p = getProg(id);
    return `<div class="tn-sup ${tnBorder(id)}" onclick="tnOpenPick('sup',${i})"><div class="tn-img">${heroIcon(h)}</div><div class="tn-st">${heroStarsHTML(p.star, { bigPx: 8 })}</div></div>`;
  });
  const t = supTotal(false);
  document.getElementById('tn-main').innerHTML = `
    <div class="tn-row">${cards.join('')}</div>
    <div class="tn-bar"><b>Hỗ Trợ</b><span>Cộng chỉ số cho cả đội theo số sao</span></div>
    <div class="tn-srow">${sups.join('')}</div>
    <div class="tn-panel">
      <div class="tn-ptitle">Hỗ Trợ</div>
      <button class="tn-rule" onclick="tnRules()">📜<span>Quy Tắc</span></button>
      <div class="tn-stats">
        <div><i>HP</i><b>${tnNum(t.hp)}</b></div><div><i>Công</i><b>${tnNum(t.atk)}</b></div>
        <div><i>Thủ</i><b>${tnNum(t.def)}</b></div><div><i>Hồi</i><b>${tnNum(t.heal)}</b></div>
      </div>
    </div>
    <div class="tn-acts"><button class="tn-big green" onclick="tnToast('Tính năng sắp ra mắt')">Duyên</button><button class="tn-big blue" onclick="tnDetail()">Chỉ Số</button></div>`;
}

/* ---------- hộp thoại nhỏ: Quy Tắc / Chỉ Số ---------- */
function tnModal(title, html) {
  const old = document.getElementById('tn-modal'); if (old) old.remove();
  const m = document.createElement('div');
  m.id = 'tn-modal'; m.className = 'tn-modal';
  m.onclick = e => { if (e.target === m) m.remove(); };
  m.innerHTML = `<div class="tn-mbox"><div class="tn-mt">${title}</div>${html}<button class="btn-attack tn-mok" onclick="document.getElementById('tn-modal').remove()">Đóng</button></div>`;
  document.body.appendChild(m);
}
function tnRules() {
  tnModal('📜 Quy Tắc Hỗ Trợ', `<p>Dàn Hỗ Trợ có <b>${SUP_SLOTS} ô</b>. Mỗi tướng đặt vào sẽ cộng cho <b>TOÀN ĐỘI</b> các chỉ số <b>HP, Công, Thủ, Hồi</b>.</p>
    <p>Số cộng = chỉ số bồi dưỡng của chính tướng hỗ trợ × (số sao ÷ ${SUP_STAR_DIV}).</p>
    <p>Ví dụ: tướng có 100 HP — <b>10★</b> cộng <b>+100 HP</b>, <b>15★</b> cộng <b>+150 HP</b>.</p>
    <p>Mỗi tướng chỉ đứng ở 1 chỗ: chọn tướng đang ở đội hoặc ô khác thì hai tướng sẽ đổi chỗ cho nhau.</p>`);
}
function tnDetail() {
  const rows = supIds.map(id => {
    if (id == null) return '';
    const h = heroById(id), p = getProg(id), g = supGive(id);
    return `<div class="tn-drow"><b>${h.name}</b> <i>${p.star}★ · Lv${p.lv}</i><div>HP +${tnNum(g.hp)} · Công +${tnNum(g.atk)} · Thủ +${tnNum(g.def)} · Hồi +${tnNum(g.heal)}</div></div>`;
  }).join('');
  const t = supTotal(false);
  tnModal('Chỉ Số Hỗ Trợ', (rows || '<p>Chưa có tướng nào trong dàn Hỗ Trợ.</p>') +
    `<div class="tn-drow tot"><b>Tổng cộng cho cả đội</b><div>HP +${tnNum(t.hp)} · Công +${tnNum(t.atk)} · Thủ +${tnNum(t.def)} · Hồi +${tnNum(t.heal)}</div></div>`);
}

/* ---------- màn chọn tướng để đổi ---------- */
function tnOpenPick(kind, idx) { tnTarget = { kind, idx }; tnRenderPick(); switchScreen('tpick'); }
function tnPickBack() { switchScreen('team'); }
function tnToggleSort() { tnSortMode = tnSortMode === 'lv' ? 'id' : 'lv'; tnRenderPick(); }
function tnRenderPick() {
  if (!tnTarget) return;
  const cur = tnCur(tnTarget), P = id => getProg(id);
  const list = ownedHeroes();   // chỉ tướng đã Chiêu Mộ ra
  if (tnSortMode === 'lv') list.sort((a, b) => (P(b.id).star - P(a.id).star) || (P(b.id).lv - P(a.id).lv) || (a.id - b.id));
  document.getElementById('tn-sort').textContent = tnSortMode === 'lv' ? 'Cấp Sao' : 'Mặc Định';
  document.getElementById('tn-pgrid').innerHTML =
    `<div class="tn-pc"><div class="tn-pi rm" onclick="tnPick(null)">Gỡ Ra</div></div>` +
    (list.length ? '' : '<div class="tn-pc" style="grid-column:1/-1;width:100%;opacity:.8;text-align:center">Chưa có tướng nào — hãy vào Chiêu Mộ để nhận tướng.</div>') +
    list.map(h => {
      const loc = tnLoc(h.id), p = P(h.id);
      const tag = loc ? (loc.kind === 'team' ? 'Đội' : 'Trợ') : '';
      return `<div class="tn-pc"><div class="tn-pi ${tnBorder(h.id)} ${h.id === cur ? 'sel' : ''}" onclick="tnPick(${h.id})">${heroIcon(h)}${tag ? `<i class="tn-tag">${tag}</i>` : ''}</div><div class="tn-pn">${h.name}</div><div class="tn-pl">${p.star}★ · Lv${p.lv}</div></div>`;
    }).join('');
}
function tnPick(id) {
  if (!tnTarget) return;
  if (!tnPlace(tnTarget.kind, tnTarget.idx, id)) return;
  tnSaveAll(); tnRender(); switchScreen('team');
}

;
/* === js/social/guild.js === */
/* BANG HỘI: cảnh các địa điểm + chat */
function openGuild() { switchScreen('guild'); const e = document.getElementById('gd-name'); if (e) e.style.display = 'none'; try { if (typeof dsLoad === 'function') dsLoad(); } catch (x) {} }   // bỏ dòng "Bang <tên>"; làm mới trạng thái bang (bị mời rời / được duyệt)
function gdGo(n) { scToast(n + ' — sắp ra mắt'); }

;
/* === js/social/guild-sub.js === */
/* BANG HỘI: Thần Thú, Diễn Võ Trường, Bang Chiến (Boss bang)
   Boss thứ 1 = 2.000.000 HP, mỗi boss sau nhân đôi; Chí Tôn = HP & sát thương x2. Kỹ năng boss: chờ mô tả. */
/* Mỗi cấp kỹ năng Lò Luyện Hỏa cộng cho TƯỚNG (theo đúng thứ tự ô: trái→phải, trên→dưới).
   GD_HEAL_PER_LV: máu hồi mỗi cấp, cuối mỗi hiệp (2 bên đánh xong). Chỉnh số ở đây nếu cần. */
const GD_HEAL_PER_LV = 1000;
var GD_PER = cfgSnap('gdper', { hp1: 3000, def1: 500, atk: 1000, hp2: 6000, def2: 1000, pierce: 1000, heal: GD_HEAL_PER_LV, spd: 2, critDmg: 20, boss: 10000 });
Object.assign(GD_PER, cfgGet('guild', {}));   // admin chỉnh (Lò Luyện Hỏa: mỗi cấp cộng bao nhiêu)
/* Thông số boss bang (admin chỉnh): HP boss k = baseHp × hpMult^k (Chí Tôn × ctMult); sát thương 1 đòn = HP/atkDiv (Chí Tôn × ctMult) */
var BOSS_CFG = cfgSnap('boss', { baseHp: 2000000, hpMult: 2, ctMult: 2, atkDiv: 4000, heroDmgMult: 3, maxRounds: 30, ptsPerDmg: 20000, killPts: 100, daily: 2, bossRage: 100, ultMult: 1 });
Object.assign(BOSS_CFG, cfgGet('boss', {}));
const GD_SKILLS = [['Cường Tráng', '🧍', 'Mỗi cấp tăng ' + GD_PER.hp1 + ' điểm HP tối đa'], ['Hộ Thuẫn', '🛡️', 'Mỗi cấp tăng ' + GD_PER.def1 + ' điểm thủ'], ['Lợi Kiếm', '🗡️', 'Mỗi cấp tăng ' + GD_PER.atk + ' điểm công'],
  ['Cường Thân', '💪', 'Mỗi cấp tăng ' + GD_PER.hp2 + ' điểm HP tối đa'], ['Kiên Cố', '🔰', 'Mỗi cấp tăng ' + GD_PER.def2 + ' điểm thủ'], ['Phá Giáp', '🪓', 'Mỗi cấp tăng ' + GD_PER.pierce + ' điểm phá giáp'], ['Hồi Phục', '💚', 'Mỗi cấp hồi ' + GD_PER.heal + ' máu cho tướng sau khi kết thúc lượt đánh của 2 bên'],
  ['Thần Tốc', '⚡', 'Mỗi cấp tăng ' + GD_PER.spd + ' điểm tốc độ'], ['Bạo Kích', '💥', 'Mỗi cấp tăng ' + GD_PER.critDmg + ' điểm bạo sát'], ['Chí Tôn', '👑', 'Mỗi cấp tăng ' + GD_PER.boss + ' sát thương lên boss bang']];
/* ===== Admin chỉnh (admin.html → tab "Bang Hội"): guild2.unlock.<0-9> (bang cấp mở từng kỹ năng), guild2.uyBase/uyGrow/silverBase/silverGrow (chi phí học Lò Luyện Hỏa),
   guild2.ctCost (vàng mở Boss Chí Tôn), guild2.bossLv.<tên boss>, guild2.buyPer/bidMax/dropQ1/dropQ2/lotMin/lotExtra/endHour (đổi vật phẩm boss), guild2.dropsLow/dropsHigh (vật phẩm rơi) ===== */
const G2_DEF = { uyBase: 300, uyGrow: 1.02, silverBase: 50000, silverGrow: 1.05, ctCost: 5000, buyPer: 99999, bidMax: 6, dropQ1: 5, dropQ2: 10, lotMin: 4, lotExtra: 2, endHour: 12, resetHour: 3, expBase: 5000, expMult: 2 };
const G2 = Object.assign({}, G2_DEF);
const GD_UNLOCK_DEF = [1, 1, 1, 1, 1, 7, 8, 9, 10, 10];
const GD_DROPS_LOW_DEF = ['Thú Hồn', 'Thú Linh', 'Thú Noãn', 'Đá Nữ Oa', 'Dị Linh', 'Châu {boss}', 'Đào Tiên', 'Tử Linh Thạch'];
const GD_DROPS_HIGH_DEF = ['Đào Tiên Vương', 'Đá Nữ Oa', 'Châu {boss}', 'Dị Linh', 'Lá Linh', 'Hộp Linh', 'Hộp Tinh', 'Ngọc Tím'];
const GD_DROP_ICO = { 'Thú Hồn': '🟠', 'Thú Linh': '🔥', 'Thú Noãn': '🔶', 'Đá Nữ Oa': '🔻', 'Dị Linh': '🎭', 'Đào Tiên': '🍑', 'Tử Linh Thạch': '🪨', 'Đào Tiên Vương': '🍑', 'Lá Linh': '🍃', 'Hộp Linh': '📦', 'Hộp Tinh': '🎁', 'Ngọc Tím': '🟣' };
let G2_RESET_DAYS = [1, 4];   // ngày boss hồi đầy (0 = Chủ nhật … 6 = thứ 7) — admin chỉnh: guild2.resetDays, giờ: guild2.resetHour
let GD_DROPS_LOW = GD_DROPS_LOW_DEF, GD_DROPS_HIGH = GD_DROPS_HIGH_DEF;
const GD_SKILL_UNLOCK = GD_UNLOCK_DEF.slice(), GD_SKILL_MAX = [Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity];   // Lò Luyện Hỏa: nâng cấp không giới hạn
const GD_ICO = { 'Thú Noãn': 'thu-noan', 'Thú Hồn': 'thu-hon', 'Thú Linh': 'thu-linh', 'Đá Nữ Oa': 'da-nu-oa', 'Dị Linh': 'di-linh', 'Đào Tiên': 'dao-tien', 'Đào Tiên Vương': 'dao-tien', 'Tử Linh Thạch': 'tu-linh-thach' };
const GD_ICO2 = { 'Đá Xanh Lá': 'vat-pham-game/da-linh/da-xanh-la', 'Đá Tím': 'vat-pham-game/da-linh/da-tim', 'Đá Đen': 'vat-pham-game/da-linh/da-den', 'Đá Vàng': 'vat-pham-game/da-linh/da-vang', 'Đá Cam': 'vat-pham-game/da-linh/da-cam', 'Đá Đỏ': 'vat-pham-game/da-linh/da-do', 'Đá Trắng': 'vat-pham-game/da-linh/da-trang',
  'Hỏa Thạch': 'vat-pham-game/trang-bi/hoa-thach', 'Linh Phách': 'vat-pham-game/phach/linh_phach', 'Tiên Phách': 'vat-pham-game/phach/tien_phach', 'Thần Phách': 'vat-pham-game/phach/than_phach', 'Bí Kíp': 'vat-pham-game/ky-nang/bi-kip', 'Yếu Quyết': 'vat-pham-game/ky-nang/yeu-quyet', 'Vô Tự Thiên Thư': 'vat-pham-game/ky-nang/vo-tu-thien-thu' };   // ảnh ngoài thư mục bang-hoi (Hang Tụ Linh, kỹ năng)
function gdIco(name, ico) { if (typeof DAN_IMG !== 'undefined' && DAN_IMG[name]) return DAN_IMG[name]; if (String(name).indexOf('Đào Tiên') === 0) return IC_PEACH; if (GD_ICO2[name]) return `<img class="gi" src="${GD_ICO2[name]}.webp" alt="${name}">`; const f = GD_ICO[name] || (String(name).indexOf('Châu ') === 0 ? 'chau' : ''); return f ? `<img class="gi" src="${f === 'dao-tien' ? 'vat-pham-game/dao-tien' : 'vat-pham-game/bang/' + f}.webp" alt="${name}">` : ico; }
function gdSt() {
  const s = loadJSON('guild_state');
  s.kho = s.kho || {}; [['Quỷ Linh', 'Dị Linh'], ['Hỏa Tinh', 'Thú Noãn']].forEach(p => { if (s.kho[p[0]]) { s.kho[p[1]] = s.kho[p[1]] || { ico: s.kho[p[0]].ico, qty: 0 }; s.kho[p[1]].qty += s.kho[p[0]].qty; delete s.kho[p[0]]; } });
  Object.keys(s.kho).forEach(k => { if (k.indexOf('Thạch ') === 0) { s.kho['Tử Linh Thạch'] = s.kho['Tử Linh Thạch'] || { ico: '🪨', qty: 0 }; s.kho['Tử Linh Thạch'].qty += s.kho[k].qty; delete s.kho[k]; } });
  (s.lots || []).forEach(l => { if (l.name === 'Quỷ Linh') l.name = 'Dị Linh'; if (l.name === 'Hỏa Tinh') l.name = 'Thú Noãn'; if (l.name.indexOf('Thạch ') === 0) l.name = 'Tử Linh Thạch'; });
  s.beast = Object.assign({ lv: 1, star: 1, name: 'Kỳ Lân' }, s.beast || {});
  s.uytin = s.uytin === undefined ? (BLANK_START ? 0 : 3000) : s.uytin; s.bangLv = s.bangLv || (BLANK_START ? 1 : 5); s.dvLv = Math.max(s.dvLv || 0, s.bangLv);   // cấp mở kỹ năng Lò Luyện Hỏa (của người chơi, không mất khi đổi/rời bang)
  s.kho = s.kho || {}; s.tt = s.tt || null; s.pts = s.pts || 0; s.lots = s.lots || []; s.ct = s.ct || {}; s.bossCt = s.bossCt || {}; s.dv = s.dv || GD_SKILLS.map(() => 0); s.boss = s.boss || {}; s.left = s.left === undefined ? bbDaily() : s.left;
  return s;
}
const gdSave = s => saveJSON('guild_state', s);
/* Cộng chỉ số từ kỹ năng Lò Luyện Hỏa cho tướng (đọc trực tiếp guild_state, không bị lỗi nếu chưa học) */
function gdBonus() {
  let dv; try { dv = (loadJSON('guild_state') || {}).dv; } catch (e) {}
  const L = i => Math.max(0, Math.min(GD_SKILL_MAX[i], Math.floor((dv && dv[i]) || 0)));
  return { hp: L(0) * GD_PER.hp1 + L(3) * GD_PER.hp2, def: L(1) * GD_PER.def1 + L(4) * GD_PER.def2, atk: L(2) * GD_PER.atk, pierce: L(5) * GD_PER.pierce,
    heal: L(6) * GD_PER.heal, spd: L(7) * GD_PER.spd, critDmg: L(8) * GD_PER.critDmg, boss: L(9) * GD_PER.boss };
}
(function mk() {
  const mc = document.querySelector('.main-content'), add = (id, html) => { const d = document.createElement('div'); d.className = 'screen'; d.id = 'screen-' + id; d.innerHTML = html; mc.appendChild(d); };
  const hd = (t, back) => `<div class="pve-header"><button class="btn-back" onclick="${back || "openGuild()"}">Trở về</button><h2 class="pve-title">${t}</h2></div>`;
  add('thanthu', hd('Thần Thú') + '<div class="gs-tabs" id="tt-tabs"></div><div id="tt-body"></div>');
  add('dienvo', hd('Lò Luyện Hỏa') + '<div id="dv-body"></div>');
  add('bangboss', hd('Cấm Địa') + '<div class="gs-tabs" id="bb-tabs"></div><div id="bb-body"></div>');
})();
/* ---- Lò Luyện Hỏa (trước là Diễn Võ Trường) ---- */
let dvSel = 0;
function openDienVo() { renderDienVo(); switchScreen('dienvo'); }
function dvPick(i) { dvSel = i; renderDienVo(); }

const dvCost = lv => ({
  uy: Math.ceil(G2.uyBase * Math.pow(G2.uyGrow, lv)),
  silver: Math.ceil(G2.silverBase * Math.pow(G2.silverGrow, lv))
});

function dvLearn() {
  const s = gdSt(), i = dvSel, lv = s.dv[i];
  if (GD_SKILL_UNLOCK[i] > s.dvLv) return scToast('Chưa mở');
  if (lv >= GD_SKILL_MAX[i]) return scToast('Đã tối đa');
  const c = dvCost(lv);
  if (s.uytin < c.uy) return scToast('Không đủ Uy Tín'); if (silver < c.silver) return scToast('Không đủ bạc');
  s.uytin -= c.uy; silver -= c.silver; s.dv[i]++; resSave(); gdSave(s); renderDienVo();
}
function renderDienVo() {
  const s = gdSt(), i = dvSel, lv = s.dv[i], c = dvCost(lv);
  document.getElementById('dv-body').innerHTML = `<div class="dv-uy">🏅 Uy Tín: ${fmtN(s.uytin)}</div>
  <div class="dv-grid">${GD_SKILLS.map((k, j) => { const lock = GD_SKILL_UNLOCK[j] > s.dvLv; return `<div class="dv-sk ${j === i ? 'sel' : ''} ${lock ? 'lock' : ''}" onclick="dvPick(${j})"><i>${lock ? 'Cấp ' + GD_SKILL_UNLOCK[j] + ' mở' : k[1]}</i><span>Lv.${s.dv[j]}</span></div>`; }).join('')}</div>
  
<div class="dv-desc">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
    <b>${GD_SKILLS[i][0]}</b>
    <b style="color:#fde047">
      Đã tăng: ${fmtN(lv * [GD_PER.hp1, GD_PER.def1, GD_PER.atk, GD_PER.hp2, GD_PER.def2, GD_PER.pierce, GD_PER.heal, GD_PER.spd, GD_PER.critDmg, GD_PER.boss][i])}
    </b>
  </div>
  <p>${GD_SKILLS[i][2]}</p>
  <p>Kỹ năng cấp ${lv} → cấp ${lv + 1}</p>
</div>

  <div class="gs-act"><div>Cần 🏅 ${c.uy} &nbsp; ${IC_SILVER} ${fmtN(c.silver)}</div><button onclick="dvLearn()">Học</button></div>`;
}
/* ---- Bang Chiến / Boss ---- */
const GD_BOSS = [   // [tên, bang cấp, icon, cách đánh, đặc điểm, [4 kỹ năng], tên Chí Tôn]
  ['Kỳ Lân', 2, '🦄', 'Đơn công', 'Có kỹ năng choáng và miễn dịch', ['Dẫn Lôi', 'Thiết Mã', 'Mã Đề Tiễn', 'Tất Sát'], 'Thiên Lân'],
  ['Xích Vũ', 3, '🦅', 'Đơn công', 'Có kỹ năng né tránh và miễn dịch', ['Hạc Minh', 'Nhàn Vân', 'Hạc Sí', 'Tất Sát'], 'Xích Tinh'],
  ['Tiên Lộc', 4, '🦌', 'Đơn công', 'Có kỹ năng trị liệu và miễn dịch', ['Tùng Lâm', 'Câu Hồn', 'Trường Xuân', 'Tất Sát'], 'Chí Tôn Tiên Lộc'],
  ['Long Quy', 5, '🐢', 'Đơn công', 'Có kỹ năng thôn phệ và miễn dịch', ['Quy Giáp', 'Phong Vân', 'Thôn Phệ', 'Tất Sát'], 'Kim Quy'],
  ['Báo Tuyết', 7, '🐆', 'Chủ yếu là tấn công đơn', 'Quái vật này có đặc điểm nổi bật là rất xấu và rất mạnh', ['Thiết Mã', 'Hạc Minh', 'Tất Sát', 'Mã Đề Tiễn'], 'Chí Tôn Báo Tuyết'],
  ['Hắc Điêu', 8, '🦅', 'Đơn công', 'Thực lực vượt trội so với BOSS thường', ['Thiết Mã', 'Hạc Minh', 'Tất Sát', 'Mã Đề Tiễn'], 'Chí Tôn Hắc Điêu'],
  ['Cuồng Ngưu', 9, '🐂', 'Đơn công', 'Thực lực vượt trội so với BOSS thường', ['Thiết Mã', 'Hạc Minh', 'Tất Sát', 'Mã Đề Tiễn'], 'Chí Tôn Cuồng Ngưu']];
const GD_BOSS_LV_DEF = GD_BOSS.map(b => b[1]);
cfgOnApply(() => {
  Object.keys(G2_DEF).forEach(k => { G2[k] = cfgNum('guild2.' + k, G2_DEF[k]); });
  G2.dropQ1 = Math.max(1, Math.floor(G2.dropQ1)); G2.dropQ2 = Math.max(1, Math.floor(G2.dropQ2)); G2.lotMin = Math.max(1, Math.floor(G2.lotMin)); G2.lotExtra = Math.max(0, Math.floor(G2.lotExtra)); G2.endHour = Math.max(0, Math.min(23, Math.floor(G2.endHour))); G2.resetHour = Math.max(0, Math.min(23, Math.floor(G2.resetHour)));
  const rd = cfgGet('guild2.resetDays', null); const rdv = Array.isArray(rd) ? rd.map(Number).filter(x => Number.isInteger(x) && x >= 0 && x <= 6) : []; G2_RESET_DAYS = rdv.length ? rdv : [1, 4];
  GD_UNLOCK_DEF.forEach((v, i) => { GD_SKILL_UNLOCK[i] = Math.max(1, Math.floor(cfgNum('guild2.unlock.' + i, v))); });
  GD_BOSS.forEach((b, i) => { b[1] = Math.max(1, Math.floor(cfgNum('guild2.bossLv.' + b[0], GD_BOSS_LV_DEF[i]))); });
  const lo = cfgGet('guild2.dropsLow', null), hi = cfgGet('guild2.dropsHigh', null);
  GD_DROPS_LOW = Array.isArray(lo) && lo.length ? lo.map(String) : GD_DROPS_LOW_DEF; GD_DROPS_HIGH = Array.isArray(hi) && hi.length ? hi.map(String) : GD_DROPS_HIGH_DEF;
});
const gdBossHp = (k, ct) => BOSS_CFG.baseHp * Math.pow(BOSS_CFG.hpMult, k) * (ct ? BOSS_CFG.ctMult : 1);
const gdBossAtk = (k, ct) => Math.round(gdBossHp(k, 0) / BOSS_CFG.atkDiv) * (ct ? BOSS_CFG.ctMult : 1);   // sát thương 1 đòn lên 1 tướng
const gdDrops = k => { const b = GD_BOSS[k][0]; return (k < 4 ? GD_DROPS_LOW : GD_DROPS_HIGH).map(n => n.indexOf('{boss}') >= 0 ? [n.replace('{boss}', b), '🔮'] : [n, GD_DROP_ICO[n] || '🎁']); };
let bbTab = 'thuong', bbCur = null;
const bbDaily = () => { const v = Math.floor(Number(BOSS_CFG.daily)); return isFinite(v) && v >= 0 ? v : 2; };   // số lượt đánh boss/ngày (admin chỉnh)
function gdTick() {   // đổi ngày: +lượt; thứ 2 & thứ 5 3h: boss hồi đầy; 12h: kết thúc đấu giá
  const s = gdSt(), now = new Date(), dk = now.toDateString(); let ch = false;
  const dly = bbDaily();
  if (s.day !== dk) { s.day = dk; s.left = dly; s.cap = dly; ch = true; }
  else if (s.cap !== dly) { s.left = Math.max(0, s.left + dly - (s.cap === undefined ? 2 : s.cap)); s.cap = dly; ch = true; }   // admin đổi số lượt giữa ngày -> cộng/trừ phần chênh
  const r = new Date(now.getTime() - G2.resetHour * 3600e3); for (let g = 0; g < 8 && !G2_RESET_DAYS.includes(r.getDay()); g++) r.setDate(r.getDate() - 1);
  const rid = r.toDateString(); if (s.rid !== rid) { s.rid = rid; s.boss = {}; s.bossCt = {}; ch = true; }
  const keep = [];
  s.lots.forEach(l => { if (l.exp > Date.now()) return keep.push(l);
    if (l.bid > 0 && l.mine) { const k = s.kho[l.name] || (s.kho[l.name] = { ico: l.ico, qty: 0 }); k.qty += l.qty; }   // thắng đấu giá -> Kho
    else if (!(l.bid > 0)) { const e = new Date(); e.setHours(G2.endHour, 0, 0, 0); if (e <= Date.now()) e.setDate(e.getDate() + 1); l.exp = e.getTime(); keep.push(l); }   // chưa ai đấu giá / mua -> vật phẩm vẫn còn nguyên, dồn sang đợt đấu giá kế tiếp
    ch = true; });
  if (keep.length !== s.lots.length) s.lots = keep;
  if (ch) gdSave(s); return s;
}
function bbTabSet(t) { bbTab = t; renderBangBoss(); }
function gdInGuild() { const s = gdSt(); if (s.bangId) return true; scToast('Hãy vào bang trước (Đại Sảnh → tạo bang hoặc ứng tuyển)'); return false; }   // Cấm Địa / Bang Chiến / Tụ Bảo Các chỉ dành cho người đã vào bang
function openBangBoss() { if (!gdInGuild()) return; renderBangBoss(); switchScreen('bangboss'); }
function bbCtUnlock(k) { const s = gdSt(); if (gold < G2.ctCost) return scToast('Cần ' + fmtN(G2.ctCost) + ' Vàng'); if (!confirm('Mở khóa Boss Chí Tôn bằng ' + fmtN(G2.ctCost) + ' Vàng?')) return; gold -= G2.ctCost; resSave(); s.ct[k] = 1; gdSave(s); renderBangBoss(); }
function bbInfo(k, ct) {
  bbCur = [k, ct]; const b = GD_BOSS[k], m = document.getElementById('boss-modal');
  m.innerHTML = `<div class="md-box"><button class="md-x" onclick="document.getElementById('boss-modal').style.display='none'">✕</button><div class="hd-name" style="text-align:center;color:#fde047">BOSS${ct ? ' CHÍ TÔN' : ''}</div>
  <div class="bm-top"><div class="bm-pic">${ttImg(b[0], ct)}</div><div class="bm-desc">Cách đánh: ${b[3]}<br><br>Đặc điểm: ${b[4]}${ct ? '<br>HP & sát thương x' + BOSS_CFG.ctMult : ''}<br><br>HP ${fmtN(gdBossHp(k, ct))}</div></div>
  <div class="bm-sk">${b[5].map((n, i) => `<span>Kỹ Năng ${i + 1}:${n}</span>`).join('')}<span>Kỹ Năng 5:</span></div>
  <div class="gs-bar">Vật Phẩm <span>(Chuyển vào Kho)</span></div><div class="bm-drops">${gdDrops(k).map(d => `<div title="${d[0]}">${gdIco(d[0], d[1])}</div>`).join('')}${'<div class="e">+</div>'.repeat(4)}</div>
  <div class="gs-act"><div>Hôm nay còn: ${gdSt().left}</div><button onclick="bbFight()">Khiêu chiến</button></div></div>`;
  m.style.display = 'flex';
}
function bbFight() {   // trận tự động mô phỏng bằng chỉ số đội hình (kỹ năng boss sẽ cập nhật khi có mô tả)
  const [k, ct] = bbCur, s = gdTick(), key = ct ? 'bossCt' : 'boss', mx = gdBossHp(k, ct), cur = s[key][k] === undefined ? mx : s[key][k];
  if (s.left < 1) return scToast('Hết lượt hôm nay'); if (cur <= 0) return scToast('Boss đã bị hạ');
  const gb = gdBonus(), heroes = team.map(id => { const t = heroBattleStats(id); return { hp: t.hp, max: t.hp, atk: t.atk, def: t.def, heal: gb.heal }; });
  if (!heroes.length) return scToast('Chưa có tướng trong đội');
  let boss = cur, dmgDone = 0, rounds = 0; const bAtk = gdBossAtk(k, ct);
  while (boss > 0 && rounds < BOSS_CFG.maxRounds && heroes.some(h => h.hp > 0)) {
    rounds++;
    heroes.forEach(h => { if (h.hp > 0) { const d = Math.round(h.atk * BOSS_CFG.heroDmgMult * (.9 + Math.random() * .2)) + gb.boss; boss -= d; dmgDone += d; } });
    if (boss <= 0) break;
    const alive = heroes.filter(h => h.hp > 0), tgt = alive[Math.floor(Math.random() * alive.length)];
    tgt.hp -= Math.max(1, bAtk - Math.round(tgt.def * .5));
    heroes.forEach(h => { if (h.hp > 0 && h.heal) h.hp = Math.min(h.max, h.hp + h.heal); });   // Hồi Phục: hết hiệp 2 bên
  }
  const killed = boss <= 0; boss = Math.max(0, boss); dmgDone = Math.min(dmgDone, cur);
  s[key][k] = boss; s.left--; const pts = Math.floor(dmgDone / BOSS_CFG.ptsPerDmg) + (killed ? BOSS_CFG.killPts : 0); s.pts += pts;
  let msg = `Gây ${fmtN(dmgDone)} sát thương • +${pts} Điểm BOSS`;
  if (killed) {   // rơi vật phẩm vào mục Đổi, hết hạn 12h trưa kế tiếp
    const e = new Date(); e.setHours(G2.endHour, 0, 0, 0); if (e <= Date.now()) e.setDate(e.getDate() + 1);
    gdDrops(k).slice(0, G2.lotMin + Math.floor(Math.random() * (G2.lotExtra + 1))).forEach(d => { const q = [G2.dropQ1, G2.dropQ2][Math.floor(Math.random() * 2)]; s.lots.push({ name: d[0], ico: d[1], qty: q, buy: q * G2.buyPer * (ct ? 2 : 1), bid0: Math.max(10, q * Math.ceil(Math.random() * G2.bidMax) * (ct ? 2 : 1)), bid: 0, mine: 0, exp: e.getTime() }); });
    msg += ' • BOSS BỊ HẠ! Vật phẩm đã rơi vào mục Đổi'; if (typeof gdNews === 'function') gdNews(`${pvName()} hạ ${GD_BOSS[k][0]}${ct ? ' Chí Tôn' : ''}`);
  }
  gdSave(s); document.getElementById('boss-modal').style.display = 'none'; renderBangBoss(); alert(msg);
}
function renderBangBoss() {
  const s = gdTick(), tabs = document.getElementById('bb-tabs');
  tabs.innerHTML = [['thuong', 'Thường'], ['chiton', 'Chí Tôn'], ['doi', 'Đổi']].map(([k, n]) => `<button class="${bbTab === k ? 'on' : ''}" onclick="bbTabSet('${k}')">${n}</button>`).join('');
  const body = document.getElementById('bb-body');
  if (bbTab === 'doi') return renderBossShop(s, body);
  const ct = bbTab === 'chiton';
  body.innerHTML = `<div class="bb-top"><span>Hôm nay còn: ${s.left}/${bbDaily()}</span><span>Làm mới vào ${G2.resetHour}h-${G2.resetHour + 1}h ${G2_RESET_DAYS.slice().sort((a, b) => a - b).map(d => d ? 'thứ ' + (d + 1) : 'Chủ nhật').join(', ')}</span></div>` + GD_BOSS.map((b, k) => {
    const open = ct ? !!s.ct[k] : b[1] <= s.bangLv, mx = gdBossHp(k, ct), h = (ct ? s.bossCt : s.boss)[k], cur = h === undefined ? mx : h, pct = Math.ceil(cur / mx * 100);
    const act = open ? `bbInfo(${k},${ct ? 1 : 0})` : ct ? `bbCtUnlock(${k})` : '';
    return `<div class="bb-card ${open ? '' : 'lock'}"><div class="bb-h"><b>${ct ? b[6] : b[0]}</b><span class="${open ? 'ok' : 'no'}">Bang cấp ${ct ? 10 : b[1]}</span><button onclick="scToast('Bảng xếp hạng sắp ra mắt')">Hạng</button></div>
    <div class="bb-pic" onclick="${act}"><div class="bb-ico ${open ? 'img' : ''}">${open ? ttImg(b[0], ct) : '⛓️'}</div>${open ? `<div class="bb-hp"><div style="width:${pct}%"></div></div><div class="bb-t">${cur <= 0 ? 'Đã hạ' : 'HP BOSS: ' + pct + '%'}</div>` : `${ct ? `<div class="bb-mid">Mở cần ${fmtN(G2.ctCost)} Vàng</div>` : ''}<div class="bb-t">Chưa mở</div>`}</div></div>`;
  }).join('');
}
function renderBossShop(s, body) {
  const t = n => { const x = Math.max(0, Math.floor(n / 1000)); return [x / 3600 | 0, x / 60 % 60 | 0, x % 60].map(v => String(v).padStart(2, '0')).join(':'); };
  body.innerHTML = `<div class="dv-uy">Điểm BOSS: ${fmtN(s.pts)}</div><div class="bs-list">${s.lots.length ? s.lots.map((l, i) => `<div class="bs-row"><div class="bs-ico">${gdIco(l.name, l.ico)}<em>${l.qty}</em></div><div class="bs-mid"><b>${l.name}</b>
    <div>Giá cao nhất: ${l.bid ? l.bid + (l.mine ? ' (bạn)' : '') : 'Chưa có'}<br>Mua ${fmtN(l.buy)} 💰 &nbsp; Giá đấu: ${l.bid ? l.bid + 1 : l.bid0}</div></div>
    <div class="bs-t" data-exp="${l.exp}">Còn:${t(l.exp - Date.now())}</div><div class="bs-b"><button class="g" onclick="bsBuy(${i})">Mua</button><button onclick="bsBid(${i})">Đấu Giá</button></div></div>`).join('') : '<div class="ch-empty" style="padding:30px">Chưa có vật phẩm. Hạ Boss để vật phẩm rơi vào đây.</div>'}</div>
    <div class="bs-note">Lưu ý: Vật phẩm trong phó bản Bang Hội sẽ chuyển vào Kho, dùng Điểm BOSS để đấu giá trước 12h00 mỗi ngày. Kho xem trong Túi Đồ.</div>`;
}
function bsBuy(i) {
  const s = gdTick(), l = s.lots[i]; if (!l) return; if (gold < l.buy) return scToast('Không đủ Vàng');
  gold -= l.buy; resSave(); const k = s.kho[l.name] || (s.kho[l.name] = { ico: l.ico, qty: 0 }); k.qty += l.qty;
  if (l.bid && l.mine) s.pts += l.bid; s.lots.splice(i, 1); gdSave(s); renderBangBoss(); scToast('Đã chuyển vào Kho');
}
function bsBid(i) {
  const s = gdTick(), l = s.lots[i]; if (!l) return; const min = l.bid ? l.bid + 1 : l.bid0;
  const v = parseInt(prompt(`Đặt giá (Điểm BOSS, tối thiểu ${min}). Có ${s.pts}:`, min), 10); if (!(v >= min)) return;
  const back = l.mine ? l.bid : 0; if (s.pts + back < v) return scToast('Không đủ Điểm BOSS');
  s.pts = s.pts + back - v; l.bid = v; l.mine = 1; gdSave(s); renderBangBoss();
}
function gdKhoRows(row, sec) { const k = gdSt().kho, n = Object.keys(k).filter(x => k[x].qty > 0); return n.length ? sec('🏯 Kho Bang Hội') + n.map(x => row(gdIco(x, k[x].ico), x, '× ' + fmtN(k[x].qty), '', '')).join('') : ''; }
setInterval(() => { document.querySelectorAll('.bs-t').forEach(e => { const x = Math.max(0, Math.floor((e.dataset.exp - Date.now()) / 1000)); e.textContent = 'Còn:' + [x / 3600 | 0, x / 60 % 60 | 0, x % 60].map(v => String(v).padStart(2, '0')).join(':'); }); }, 1000);
(function () { const d = document.createElement('div'); d.id = 'boss-modal'; d.className = 'md-wrap'; d.onclick = e => { if (e.target === d) d.style.display = 'none'; }; document.body.appendChild(d); })();

;
/* === js/social/boss-battle.js === */
/* BOSS BANG: đánh trên đúng sàn đấu PVE (engine chung: hoạt ảnh skill thật của từng tướng, thẻ đội hình, Tự Động / Ulti Tất Cả / Hết Lượt / Chậm).
   Nạp SAU guild-sub.js. Dùng lại: bbCur, gdTick, gdSave, gdBossHp, gdBossAtk, gdBonus, gdDrops, BOSS_CFG, GD_BOSS, heroStats, team, ttImg, ttSt.
   Các móc vào engine (bossB != null): engine.js (hit / stunEnemy), pve-battle.js (loadWave, enemyTurn, nextWave, loseBattle, closeBattle).
   - Boss = 1 "địch" cỡ lớn bên phải; HP = HP còn lại của boss; sát thương lên boss ×BOSS_CFG.heroDmgMult; boss miễn choáng, mỗi nhát tối đa 3% HP.
   - Thần thú CỦA ĐỘI MÌNH đứng bệ góc trên trái chỉ để trang trí (không thanh nộ, không tung skill), đứng ngoài trận.
   BOSS BANG (chính là 1 thần thú) là bên MIỄN NHIỄM mọi hiệu ứng bất lợi, không có thanh nộ: mỗi lượt ngẫu nhiên đánh thường hoặc tung ulti NGẪU NHIÊN của 1 tướng bất kỳ (tối đa 2 lần giống nhau liên tiếp). */
let BBT_BEAST_RAGE = 20;   // admin chỉnh: misc.bossBeastRage
cfgOnApply(() => { BBT_BEAST_RAGE = Math.max(0, cfgNum('misc.bossBeastRage', 20)); });   // nộ thần thú nhận mỗi hiệp

function bbFight() {
  if (bossB) return;
  const [k, ct] = bbCur, s = gdTick(), key = ct ? 'bossCt' : 'boss', mx = gdBossHp(k, ct), cur = s[key][k] === undefined ? mx : s[key][k];
  if (s.left < 1) return scToast('Hết lượt hôm nay'); if (cur <= 0) return scToast('Boss đã bị hạ');
  if (!team.length) return scToast('Chưa có tướng trong đội');
  battleToken++; playBattleOpen(); battleFast = false; busy = false; currentWave = 1; currentStage = 1; currentBattle = 1;
  bossB = { k, ct, key, mx, cur, gb: gdBonus(), unit: null, tt: (typeof ttSt === 'function') ? ttSt().tt.cur : null, ttRage: 0, fin: false };
  document.getElementById('bf-units').innerHTML = '';
  const sel = teamSel(), pos = HERO_POS[Math.min(5, Math.max(1, sel.length))].map(p => [p[0], p[1] + HERO_DY]);
  const _tm = ttMine(); ttSetupUI(_tm, null);   // chỉ thần thú của mình (bệ trái); không dựng bệ thần thú địch
  bbtBeastBar();
  waveUnits = {
    heroes: sel.map((h, i) => {
      const st = heroBattleStats(h.id, false, ttBonus(_tm && _tm.pt));
      const u = makeUnit('hero', heroIcon(h), pos[i][0], pos[i][1], st.hp, st.atk, false, h.name);
      u.id = h.id; u.emoji = heroIcon(h); u.def = st.def; u.spd = st.spd; u.dodge = st.dodge; u.acc = st.acc; u.crit = st.crit; u.critDmg = st.critDmg; u.tough = st.tough; u.pierce = st.pierce; u.tia = st.tia || 1; u.block = st.block; u.regen = st.heal || 0; u.sk = skillMult(h.id); u.alwaysUlt = !!h.alwaysUlt; u.taunt = !!h.taunt; u.prio2 = !!h.prio2;
      u.rage = h.startRage || 0; grantStart(u); u.acted = false;
      return u;
    }),
    enemies: []
  };
  document.getElementById('battle-overlay').style.display = 'flex';
  loadWave();   // -> loadBossWave() vì bossB != null
}

function loadBossWave() {
  const B = bossB, tok = battleToken, b = GD_BOSS[B.k], nm = B.ct ? b[6] : b[0];
  document.getElementById('ui-stage-title').innerText = `${nm} • Bang cấp ${B.ct ? 10 : b[1]}`;
  document.getElementById('ui-wave-title').innerText = `Hiệp 1/${BOSS_CFG.maxRounds}`;
  document.getElementById('ui-enemy-name').innerText = 'BOSS BANG: ' + String(nm).toUpperCase();
  waveUnits.enemies.forEach(e => e.el.remove());
  const faceL = TT_FACE_LEFT.includes(b[0]);   // ảnh gốc quay trái thì giữ, quay phải thì lật để boss nhìn sang đội ta
  const u = makeUnit('enemy', ttImg(b[0], B.ct), 76, 58, B.cur, gdBossAtk(B.k, B.ct), true, nm);
  u.el.classList.add('bossu'); if (!faceL) u.el.classList.add('flip');
  u.max = B.mx; u.hp = B.cur; u.acc = 99999; u.def = 0; u.spd = 0; u.tia = 1; setHpBar(u);
  bossProof(u);
  u.el.insertAdjacentHTML('beforeend', '<div class="bf-imm">🛡️ MIỄN NHIỄM</div>');
  bbtBossBar();
  B.unit = u; waveUnits.enemies = [u]; waveRound = 1;
  waveUnits.heroes.forEach(h => {
    h.acted = false; h.stun = 0; h.bleed = 0; h.bleedPct = 0; clearDebuffs(h); clearMods(h); grantStart(h);
    h.el.classList.remove('stunned'); h.el.querySelectorAll('.bf-stun, .bf-bleed').forEach(ic => ic.remove());
  });
  clearDefBuff(waveUnits.heroes);
  busy = false; isPlayerTurn = true; refreshPanel();
  setTimeout(() => { if (tok === battleToken) autoStep(); }, 600);
}

// Boss miễn nhiễm TẤT CẢ hiệu ứng bất lợi: choáng, chảy máu, độc, câm lặng, giảm Công/Thủ/hồi máu/nộ, khóa tăng phúc (đọc luôn ra 0, ghi bị bỏ qua)
function bossProof(u) {
  ['stun', 'bleed', 'bleedPct'].forEach(k => Object.defineProperty(u, k, { get: () => 0, set() {}, configurable: true }));
  const dn = new Proxy({}, { get: () => 0, set: () => true });
  Object.defineProperty(u, 'dn', { get: () => dn, set() {}, configurable: true });
}
function bbtBossBar() { }   // đã bỏ thanh nộ của boss (giữ hàm rỗng vì battle-panel.js còn gọi)
// Lượt của boss: NGẪU NHIÊN 1 đòn đánh thường hoặc 1 ulti của 1 tướng bất kỳ (mượn id/skill của tướng đó). Được 2 lần liên tiếp giống nhau, KHÔNG được 3 lần liên tiếp.
async function bossAct(e, tok) {
  const hist = e.acts || (e.acts = []), canUlt = !ultBlocked(e);
  let doUlt = canUlt && Math.random() < 0.5;
  if (hist.length >= 2 && hist[0] === hist[1]) doUlt = hist[1] === 'atk' && canUlt;   // đã 2 lần liền giống nhau -> lần này bắt buộc đổi kiểu
  hist.push(doUlt ? 'ult' : 'atk'); if (hist.length > 2) hist.shift();
  if (doUlt) {
    const id = rand(HEROES.map(h => h.id).filter(i => i !== 1));   // Thanh Y (hồi sinh đồng đội) vô nghĩa với boss đơn
    floatText(e, '💥 ' + ((typeof HERO_ULT_NAME !== 'undefined' && HERO_ULT_NAME[id]) || 'Tuyệt kỹ'));
    refreshPanel();
    // Người tung chiêu là 1 "bóng" VÔ HÌNH đứng đúng chỗ boss: chỉ hiện hoạt ảnh/skill của tướng, KHÔNG hiện hình tướng, boss đứng yên (không nhảy/bay theo chiêu)
    const g = makeUnit('enemy', '', e.x, e.y, 1e15, e.atk, false, '');
    g.el.classList.add('bb-cast');
    Object.assign(g, { id, isHero: true, star: 5, def: e.def || 0, spd: e.spd || 0, acc: 99999, crit: e.crit || 0, critDmg: e.critDmg || 0, pierce: e.pierce || 0, tia: 1, rage: 0, sk: skillMult(id) * (Number(BOSS_CFG.ultMult) || 1) });
    try { await ultimate(g, tok); } catch (err) { console.warn('boss ult', err); }
    finally { g.alive = false; try { g.el.remove(); } catch (x) {} }
  } else { await attack(e, waveUnits.heroes, 1, e.atk, tok); }
  refreshPanel();
}

function bbtBeastBar() { }   // đã bỏ thanh nộ của thần thú
// Thần thú của mình không còn tích nộ và không triệu hồi tuyệt kỹ của tướng khác nữa (chỉ boss bang mới có kiểu ra đòn ngẫu nhiên). Giữ hàm rỗng vì pve-battle.js còn gọi.
async function bossBeastTick(tok) { }

// Kết toán (giữ nguyên luật thưởng của bản cũ): ghi HP boss còn lại, trừ 1 lượt, điểm BOSS, rơi đồ khi hạ boss.
function bossFinish(title) {
  const B = bossB; if (!B || B.fin) return; B.fin = true;
  const left = Math.max(0, Math.round(B.unit ? B.unit.hp : B.cur)), killed = left <= 0, dmgDone = Math.max(0, Math.min(B.cur, B.cur - left));
  const s = gdTick(), k = B.k, ct = B.ct, key = B.key;
  s[key][k] = left; s.left--; const pts = Math.floor(dmgDone / BOSS_CFG.ptsPerDmg) + (killed ? BOSS_CFG.killPts : 0); s.pts += pts;
  let msg = `Gây ${fmtN(dmgDone)} sát thương\n+${pts} Điểm BOSS`;
  if (killed) {
    const e = new Date(); e.setHours(12, 0, 0, 0); if (e <= Date.now()) e.setDate(e.getDate() + 1);
    gdDrops(k).slice(0, 4 + Math.floor(Math.random() * 3)).forEach(d => { const q = [5, 10][Math.floor(Math.random() * 2)]; s.lots.push({ name: d[0], ico: d[1], qty: q, buy: q * 99999 * (ct ? 2 : 1), bid0: Math.max(10, q * Math.ceil(Math.random() * 6) * (ct ? 2 : 1)), bid: 0, mine: 0, exp: e.getTime() }); });
    msg += '\nBOSS BỊ HẠ! Vật phẩm đã rơi vào mục Đổi'; if (typeof gdNews === 'function') gdNews(`${pvName()} hạ ${GD_BOSS[k][0]}${ct ? ' Chí Tôn' : ''}`);
  }
  gdSave(s); const m = document.getElementById('boss-modal'); if (m) m.style.display = 'none';
  closeBattle();   // bossB.fin = true -> đóng bình thường (đặt bossB = null)
  if (typeof renderBangBoss === 'function') renderBangBoss();
  pvpToast(`${title}\n\n${msg}`, killed || title === 'CHIẾN THẮNG!');
}

;
/* === js/social/thanthu.js === */
/* THẦN THÚ (Bang Hội): 18 thần thú, cấp / sao / phụ thể (Lĩnh Ngộ), Cấm Địa (nhận mảnh) */
const TT_BEASTS = [   // [tên, hạng, mảnh cần, icon, [hiệu quả phụ thể: tên, giá trị, là điểm?]]
  ['Kỳ Lân', 'A+', 0, '🦄', [['Bạo Tức', 10], ['Cường Công', 5]]], ['Xích Vũ', 'A+', 30, '🦅', [['Kích Phá', 2000, 1], ['Cường Công', 8], ['Đẩy Lui', 10]]],
  ['Tiên Lộc', 'A+', 40, '🦌', [['Kích Sát', 10], ['Bạo Tức', 10], ['Cấp Tốc', 5]]], ['Long Quy', 'A+', 50, '🐢', [['Chiến Thuẫn', 15], ['Thần Thuẫn', 15], ['Kích Phá', 3000, 1]]],
  ['Báo Tuyết', 'A+', 100, '🐆', [['Thần Tốc', 4], ['Cấp Tốc', 8], ['Bạo Tức', 12], ['Tinh Chuẩn', 15]]], ['Hắc Điêu', 'A+', 150, '🦅', [['Thần Tốc', 8], ['Sát Lục', 12], ['Ẩn Thân', 12], ['Tàn Ảnh', 10]]],
  ['Cuồng Ngưu', 'A+', 150, '🐂', [['Trợ Tốc', 8], ['Cường Công', 12], ['Thần Thuẫn', 10], ['Kích Phá', 5000, 1]]], ['Lân Sư', 'A+', 200, '🦁', [['Thần Tốc', 11], ['Trợ Tốc', 11], ['Cấp Tốc', 11], ['Gia Tốc', 11]]],
  ['Thiên Lân', 'S', 250, '🦄', [['Tàn Ảnh', 25], ['Cường Công', 10], ['Bạo Tức', 15], ['Trợ Tốc', 5]]], ['Xích Tinh', 'S', 250, '🦩', [['Kích Phá', 10000, 1], ['Cường Công', 12], ['Đẩy Lui', 20], ['Trợ Tốc', 5]]],
  ['Kim Quy', 'S', 250, '🐢', [['Thần Thuẫn', 25], ['Chiến Thuẫn', 25], ['Tàn Ảnh', 25], ['Ngự Thuẫn', 20]]], ['Thiên Lộc', 'S', 250, '🦌', [['Kích Sát', 20], ['Bạo Tức', 30], ['Kích Phá', 20000, 1], ['Cấp Tốc', 10]]],
  ['Mai Hoa Báo', 'S', 250, '🐆', [['Thần Tốc', 10], ['Cấp Tốc', 12], ['Bạo Tức', 22], ['Tinh Chuẩn', 30]]], ['Tử Sắc Điêu', 'S', 250, '🦅', [['Cấp Tốc', 14], ['Kích Phá', 40000, 1], ['Bạo Tức', 24], ['Tàn Ảnh', 30]]],
  ['Nham Ngưu', 'S', 250, '🐂', [['Chiến Thuẫn', 30], ['Thần Tốc', 12], ['Bạo Tức', 25], ['Kích Sát', 25]]], ['Thiên Niên Thú', 'S', 250, '🦁', [['Thần Tốc', 13], ['Cấp Tốc', 13], ['Bạo Tức', 20], ['Cường Công', 25]]],
  ['Địa Niên Thú', 'S', 250, '👹', [['Trợ Tốc', 13], ['Gia Tốc', 13], ['Kích Phá', 20000, 1], ['Tàn Ảnh', 22]]], ['Kim Sư', 'S', 250, '🦁', [['Trợ Tốc', 12], ['Tàn Ảnh', 25], ['Kích Phá', 40000, 1], ['Cường Công', 20]]], ['Tản Viên Thần', 'S', 250, '🗿', [['Thần Thuẫn', 20], ['Thần Tốc', 11], ['Ngự Thuẫn', 25], ['Kỳ Thuẫn', 25]]], ['Giáp Thìn', 'S', 250, '🐉', [['Cấp Tốc', 12], ['Kích Sát', 25], ['Bạo Tức', 23], ['Cường Công', 23]]],
  ['Cửu Vỹ Hồ', 'S', 250, '🦊', [['Thần Tốc', 12], ['Tàn Ảnh', 24], ['Kỳ Thuẫn', 25], ['Cường Công', 20]]], ['Hỏa Kỳ Lân', 'S', 250, '🔥', []], ['Khổng Tước', 'S', 250, '🦚', [['Thần Tốc', 17], ['Cấp Tốc', 17], ['Trợ Tốc', 14], ['Cường Công', 30]]]];
/* ===== Admin chỉnh được (admin.html → tab "Thần Thú"): tt.beasts.<tên> = { rank, shards, fx: [{n,v,p}] } và tt.<tham số công thức> ===== */
const TT_BEASTS_DEF = JSON.parse(JSON.stringify(TT_BEASTS));
const TT_P_DEF = { capBase: 20, capPer: 20, needMul: 2.7, needAdd: 100, hpPer: 963.5, starGrow: 0.15, sMul: 1.5, ptsMul: 0.4008, healDiv: 5, phaPer: 800, dodgePer: 10, maxStar: 5, sSlots: 5, starLinh: 10, starDa: 400, freeMin: 2, rerollCost: 500, histMax: 30, pct1: 5, pct2: 10, pct3: 15, pct4: 20, pct5: 25, pct6: 30, pct7: 35, rate7: 1, rate6: 3, rate5: 5, rate4: 10, rate3: 50, rate2: 90, rate1: 100, hpct1: 30, hpct2: 50, hpct3: 100, hpct4: 150, hpct5: 200, hpct6: 250, hpct7: 300 };
const TT_P = Object.assign({}, TT_P_DEF);
cfgOnApply(() => {
  Object.keys(TT_P_DEF).forEach(k => { TT_P[k] = cfgNum('tt.' + k, TT_P_DEF[k]); });
  TT_P.maxStar = Math.max(1, Math.floor(TT_P.maxStar)); TT_P.histMax = Math.max(1, Math.floor(TT_P.histMax));
  const ov = cfgGet('tt.beasts', {}) || {};
  TT_BEASTS.forEach((b, i) => {
    const d = TT_BEASTS_DEF[i], o = ov[b[0]] || {};
    b[1] = (o.rank === 'S' || o.rank === 'A+') ? o.rank : d[1];
    b[2] = isFinite(Number(o.shards)) && o.shards !== '' && o.shards !== null && o.shards !== undefined ? Math.max(0, Math.floor(Number(o.shards))) : d[2];
    b[4] = Array.isArray(o.fx) ? o.fx.filter(f => f && f.n).map(f => f.p ? [f.n, Number(f.v) || 0, 1] : [f.n, Number(f.v) || 0]) : d[4];
  });
});
const TT_QPCT = () => [TT_P.pct1, TT_P.pct2, TT_P.pct3, TT_P.pct4, TT_P.pct5, TT_P.pct6, TT_P.pct7];   // % Tốc của bậc 1..7
const TT_PT = ['Huyết Bạo', 'Ngự Thuẫn', 'Hoạt Khí', 'Cường Công', 'Sát Lục', 'Thần Huyết', 'Tái Sinh', 'Thần Thuẫn', 'Chiến Thuẫn', 'Bá Thuẫn', 'Bạo Nộ', 'Bạo Tức', 'Tinh Chuẩn', 'Cấp Tốc', 'Ẩn Thân', 'Kích Sát', 'Kích Phá', 'Đẩy Lui', 'Trợ Thuẫn', 'Tàn Ảnh', 'Kỳ Thuẫn', 'Thần Tốc', 'Trợ Tốc', 'Hộ Tốc', 'Gia Tốc', 'Hộ Thuẫn'];
const TT_PT_ICO = ['🩸', '🛡️', '💠', '⚔️', '🗡️', '❤️‍🔥', '💚', '🔰', '🧱', '🐯', '💪', '⚡', '🎯', '🏃', '🌫️', '🔪', '👹', '💨', '🛡️', '👤', '☯️', '👢', '👟', '👞', '🥾', '🛡️'];
const TT_QC = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#cbd5e1', '#facc15'], TT_FEED = { 'Thú Hồn': 100, 'Thú Linh': 500 };
/* ===== PHỤ THỂ MỚI: 8 loại × 7 bậc = 56 phụ thể (ảnh: giao-dien/icon-phuthe/<slug>-<bậc>.png) =====
   Bậc 1..7 = viền xanh lá, xanh dương, tím, cam, đỏ, bạc, vàng.
   • 5 loại TỐC (+5%…+35% Tốc, admin: pct1..pct7): Thần Tốc → Kỹ năng • Hộ Tốc → Thủ • Cấp Tốc → Công kích • Trợ Tốc → Hỗ trợ • Gia Tốc → Trị liệu.
   • 3 loại THUẪN (+30%…+300% HP, admin: hpct1..hpct7): Thần Thuẫn → TẤT CẢ • Hộ Thuẫn → Thủ • Trợ Thuẫn → Hỗ trợ.
   Muốn thêm loại mới: thêm 1 dòng vào TT_SLOT_PT + thêm tên vào TT_PT (+ icon) + TT_ROLE_FX (thanthu-battle.js) + bỏ đủ 7 ảnh vào icon-phuthe. */
const TT_SLOT_PT = [
  { n: 'Thần Tốc', slug: 'than-toc', role: 'skill', stat: 'spd' }, { n: 'Hộ Tốc', slug: 'ho-toc', role: 'tank', stat: 'spd' }, { n: 'Cấp Tốc', slug: 'cap-toc', role: 'atk', stat: 'spd' },
  { n: 'Trợ Tốc', slug: 'tro-toc', role: 'sup', stat: 'spd' }, { n: 'Gia Tốc', slug: 'gia-toc', role: 'heal', stat: 'spd' },
  { n: 'Thần Thuẫn', slug: 'than-thuan', role: 'all', stat: 'hp' }, { n: 'Hộ Thuẫn', slug: 'ho-thuan', role: 'tank', stat: 'hp' }, { n: 'Trợ Thuẫn', slug: 'tro-thuan', role: 'sup', stat: 'hp' }
];
const TT_QNAME = ['Xanh lá', 'Xanh dương', 'Tím', 'Cam', 'Đỏ', 'Bạc', 'Vàng'];
const TT_PT_META = {}; TT_SLOT_PT.forEach(x => { TT_PT_META[x.n] = x; });
const TT_QPCT_HP = () => [TT_P.hpct1, TT_P.hpct2, TT_P.hpct3, TT_P.hpct4, TT_P.hpct5, TT_P.hpct6, TT_P.hpct7];   // % HP của bậc 1..7 (loại Thuẫn)
const ttPct = (n, q) => { const m = TT_PT_META[n], a = (m && m.stat === 'hp') ? TT_QPCT_HP() : TT_QPCT(); return a[Math.min(7, Math.max(1, Math.round(Number(q)) || 1)) - 1]; };   // % của 1 phụ thể theo loại + bậc
const ttQOf = (n, v) => { const m = TT_PT_META[n], a = (m && m.stat === 'hp') ? TT_QPCT_HP() : TT_QPCT(); let bi = 0; a.forEach((x, i) => { if (Math.abs(x - v) < Math.abs(a[bi] - v)) bi = i; }); return bi + 1; };   // đoán bậc từ % (cho hiệu quả có sẵn của thần thú)
const ttRoleLabel = r => r === 'all' ? 'tất cả' : ((typeof ROLE_NAME !== 'undefined' && ROLE_NAME[r]) || r);
const ttStatLabel = n => (TT_PT_META[n] && TT_PT_META[n].stat === 'hp') ? 'HP' : 'Tốc';
// Ảnh phụ thể (loại có ảnh mới) hoặc emoji (các hiệu quả cũ của thần thú). em = cỡ theo chữ
function ttPtImg(n, q, em) {
  const m = TT_PT_META[n];
  if (!m) return TT_PT_ICO[TT_PT.indexOf(n)] || '✨';
  const b = Math.min(7, Math.max(1, Math.round(Number(q)) || 1)), z = (em || 1.5) + 'em';
  return `<img src="giao-dien/icon-phuthe/${m.slug}-${b}.png" alt="${n}" style="width:${z};height:${z};object-fit:contain;vertical-align:middle;pointer-events:none">`;
}
const TT_FEED_DEF = Object.assign({}, TT_FEED);
cfgOnApply(() => { Object.assign(TT_FEED, TT_FEED_DEF); const o = cfgGet('misc.ttFeed', {}) || {}; Object.keys(TT_FEED_DEF).forEach(k => { const v = Number(o[k]); if (isFinite(v) && v >= 0) TT_FEED[k] = v; }); });   // EXP mỗi món cho thần thú ăn — admin chỉnh: misc.ttFeed
const TT_SLUG = { 'Kỳ Lân': 'ky-lan', 'Xích Vũ': 'xich-vu', 'Tiên Lộc': 'tien-loc', 'Long Quy': 'long-quy', 'Báo Tuyết': 'bao-tuyet', 'Hắc Điêu': 'hac-dieu', 'Cuồng Ngưu': 'cuong-nguu', 'Lân Sư': 'lan-su', 'Khổng Tước': 'khong-tuoc', 'Cửu Vỹ Hồ': 'cuu-vi-ho', 'Hỏa Kỳ Lân': 'hoa-ky-lan', 'Kim Sư': 'kim-su', 'Thiên Lân': 'thien-lan' };
// Thần thú có chuỗi 16 khung (giao-dien/bang-hoi/thanthu/seq/<slug>-00..15.webp, ảnh gốc đều quay mặt sang PHẢI). Muốn thêm: bỏ đủ 16 khung vào thư mục seq rồi thêm slug vào TT_SEQ.
const TT_SEQ = ['ky-lan', 'hac-dieu', 'long-quy', 'bao-tuyet', 'tien-loc', 'xich-vu', 'thien-lan', 'cuu-vi-ho'], TT_SEQ_N = 16, TT_SEQ_MS = 110;
// Khung bị thiếu trong thư mục seq (thiếu file ảnh): lấy khung liền trước. Lân Sư chưa có khung nào → không nằm trong TT_SEQ, hiện ảnh tĩnh lan-su.webp.
const TT_GAP = {};
const TT_SEQ_NS = { 'thien-lan': 25, 'xich-vu': 25 }, ttN = sl => TT_SEQ_NS[sl] || TT_SEQ_N;   // số khung riêng từng loài (mặc định 16); Thiên Lân & Xích Vũ 25 khung
const ttFrame = (sl, i) => { i %= ttN(sl); const g = TT_GAP[sl]; while (g && i > 0 && g.includes(i)) i--; return `giao-dien/bang-hoi/thanthu/seq/${sl}-${String(i).padStart(2, '0')}.webp?v=27`; };
const ttWarm = sl => { if (ttWarm.d[sl]) return; ttWarm.d[sl] = 1; const a = []; for (let i = 0; i < ttN(sl); i++) a.push(ttFrame(sl, i)); GP.add(a, 0); };   // nạp 16 khung của loài đang hiển thị
ttWarm.d = {};
TT_SEQ.forEach(sl => GP.add((() => { const a = []; for (let i = 0; i < ttN(sl); i++) a.push(ttFrame(sl, i)); return a; })(), 2));   // nạp ngầm; loài đang xem được nâng lên prio 0 qua ttWarm
let ttSeqI = 0;
setInterval(() => { const l = document.querySelectorAll('img[data-seq]'); if (!l.length) return; ttSeqI = (ttSeqI + 1) % 400; l.forEach(im => { im.src = ttFrame(im.dataset.seq, ttSeqI); }); }, TT_SEQ_MS);
function ttImgFail(el) { el.onerror = null; const b = TT_BEASTS.find(x => x[0] === el.alt), sp = document.createElement('span'); sp.className = 'tt-emo'; sp.textContent = b ? b[3] : '❔'; (el.parentNode.classList.contains('ct-wrap') ? el.parentNode.replaceChild(sp, el) : el.replaceWith(sp)); }   // thiếu ảnh thần thú → hiện icon thay vì ảnh vỡ
function ttImg(n, ct) { const sl = TT_SLUG[n], b = TT_BEASTS.find(x => x[0] === n); if (sl && TT_SEQ.includes(sl)) ttWarm(sl); const sq = sl && TT_SEQ.includes(sl) ? ` data-seq="${sl}" data-f="0"` : ''; const src0 = sq ? ttFrame(sl, ttSeqI) : `giao-dien/bang-hoi/thanthu/${sl}.webp`; return sl ? (ct ? `<span class="ct-wrap"><img class="tt-img ct"${sq} alt="${n}" src="${src0}" onerror="ttImgFail(this)"><i class="ct-crown">👑</i></span>` : `<img class="tt-img"${sq} alt="${n}" src="${src0}" onerror="ttImgFail(this)">`) : `<span class="tt-emo">${b ? b[3] : '❔'}</span>`; }
const ttBeast = n => TT_BEASTS.find(b => b[0] === n);
function ttSt() {
  const s = gdSt();
  if (!s.tt) { s.tt = { cur: 'Kỳ Lân', own: { 'Kỳ Lân': { lv: 1, star: 1, exp: 0 } }, sh: {}, slots: {}, sel: 0, prev: null, freeAt: 0, cc: { day: '', left: 3 } };
    s.kho['Thú Hồn'] = { ico: '🟠', qty: 100 }; s.kho['Thú Linh'] = { ico: '🔥', qty: 10 }; s.kho['Dị Linh'] = { ico: '🎭', qty: 10 }; s.kho['Đá Nữ Oa'] = { ico: '🔻', qty: 400 }; gdSave(s); }   // quà khởi đầu
  const t = s.tt; t.hist = Array.isArray(t.hist) ? t.hist : []; if (t.pick === undefined) t.pick = -1; t.newN = t.newN | 0;
  if (t.ptv !== 2) { t.slots = {}; t.hist = []; t.pick = -1; t.newN = 0; t.prev = null; t.ptv = 2; gdSave(s); }   // hệ Phụ Thể mới: xoá toàn bộ phụ thể cũ (ô đã lắp + kết quả tẩy + hoàn tác)   // hist: tối đa 30 Phụ Thể vừa tẩy
  Object.keys(s.kho).forEach(k => { if (k.indexOf('Châu ') === 0 && s.kho[k].qty > 0 && ttBeast(k.slice(5))) { t.sh[k.slice(5)] = (t.sh[k.slice(5)] || 0) + s.kho[k].qty; s.kho[k].qty = 0; } });   // Châu = mảnh thần thú
  return s;
}
const ttCur = s => s.tt.own[s.tt.cur];
// Cấp thú tối đa = cấp acc. Sao thú tối đa theo cấp acc (cùng quy tắc với tướng: starCapByLv).
const ttCap = o => Math.max(1, Math.floor(Number(typeof accLevel !== 'undefined' ? accLevel : 1)) || 1);
const ttStarCap = () => Math.min(TT_P.maxStar, starCapByLv(Math.max(1, Math.floor(Number(typeof accLevel !== 'undefined' ? accLevel : 1)) || 1)));
const ttStarLocked = o => o.star >= TT_P.maxStar ? false : o.star >= ttStarCap();
function ttStarNeedAcc(n) { for (let lv = 1; lv <= 1000; lv++) if (starCapByLv(lv) >= n) return lv; return '?'; }   // cấp acc nhỏ nhất để có sao n
const ttNeed = lv => Math.round(TT_P.needMul * lv * lv * lv) + TT_P.needAdd;
const ttStat = (b, o) => { const hp = Math.round(TT_P.hpPer * o.lv * (1 + TT_P.starGrow * (o.star - 4)) * (b[1] === 'S' ? TT_P.sMul : 1)); return { pts: Math.round(hp * TT_P.ptsMul), hp, heal: Math.round(hp / Math.max(1, TT_P.healDiv)), pha: TT_P.phaPer * o.star, dodge: TT_P.dodgePer * o.star }; };
const ttSlotsOpen = (b, o) => Math.min(o.star, 5) + (b[1] === 'S' ? Math.max(0, Math.min(5, Math.floor(TT_P.sSlots))) : 0);
const ttItem = (s, n) => (s.kho[n] && s.kho[n].qty) || 0;
const ttTake = (s, n, q) => { s.kho[n].qty -= q; };
let ttTab = 'thu', ttTimerOn = false;
const ttHome = () => { const d = document.getElementById('tt-body'); return d; };
function openThanThu() { ttSt(); renderThanThu(); switchScreen('thanthu'); }
function ttTabSet(t) { ttTab = t; renderThanThu(); }
function ttSlotDesc(sl) { if (!sl) return 'Trống'; const m = TT_PT_META[sl.n]; return `Hiệu quả ${sl.n} +${ttPct(sl.n, sl.q)}% ${ttStatLabel(sl.n)}` + (m ? ` cho ${ttRoleLabel(m.role)}` : ''); }
function ttRoll(max) {   // Tẩy ngẫu nhiên: xét từ bậc 7 xuống bậc 1, mỗi bậc có tỉ lệ % riêng (rate7..rate1, bậc 1 = 100 là mức chốt); loại ngẫu nhiên trong 8 loại
  let q = 1;
  for (let k = 7; k >= 1; k--) if (Math.random() * 100 < (Number(TT_P['rate' + k]) || 0)) { q = k; break; }
  return { n: TT_SLOT_PT[Math.floor(Math.random() * TT_SLOT_PT.length)].n, q: Math.min(q, max || 7) };
}
function ttFeed() {
  const s = ttSt(), o = ttCur(s), cap = ttCap(o); let gain = 0;
  Object.keys(TT_FEED).forEach(k => { const q = ttItem(s, k); if (q > 0) { gain += q * TT_FEED[k]; s.kho[k].qty = 0; } });
  if (!gain) return scToast('Không có vật liệu (Thú Hồn / Thú Linh)');
  o.exp += gain; while (o.lv < cap && o.exp >= ttNeed(o.lv)) { o.exp -= ttNeed(o.lv); o.lv++; } if (o.lv >= cap) o.exp = Math.min(o.exp, ttNeed(o.lv));
  gdSave(s); renderThanThu(); scToast('+' + fmtN(gain) + ' kinh nghiệm');
}
function ttStarUp() {
  const s = ttSt(), o = ttCur(s); if (o.star >= TT_P.maxStar) return scToast('Đã tối đa sao');
  if (ttStarLocked(o)) return scToast('Cần cấp acc ' + ttStarNeedAcc(o.star + 1) + ' để lên ' + (o.star + 1) + ' sao (acc hiện tại ' + accLevel + ')');
  const ql = TT_P.starLinh * o.star, da = TT_P.starDa * o.star; if (ttItem(s, 'Dị Linh') < ql || ttItem(s, 'Đá Nữ Oa') < da) return scToast('Không đủ vật liệu');
  ttTake(s, 'Dị Linh', ql); ttTake(s, 'Đá Nữ Oa', da); o.star++; gdSave(s); renderThanThu(); scToast('Lên ' + o.star + ' sao!');
}
function ttSel(i) { const s = ttSt(); s.tt.sel = i; gdSave(s); renderThanThu(); }
/* TT_P.histMax = TT_P.histMax */
function ttReroll(n) {   // Tẩy: n=1 (miễn phí, 2 phút/lần) hoặc n=10 (500 vàng). Kết quả vào danh sách (tối đa 30 gần nhất); chọn 1 cái rồi bấm Lưu
  const s = ttSt(), t = s.tt;
  if (n === 1) { if (Date.now() < t.freeAt) return scToast('Chưa hết thời gian miễn phí'); t.freeAt = Date.now() + TT_P.freeMin * 60000; }
  else { if (gold < TT_P.rerollCost) return scToast('Cần ' + fmtN(TT_P.rerollCost) + ' Vàng'); gold -= TT_P.rerollCost; resSave(); }
  const res = []; for (let i = 0; i < n; i++) res.push(ttRoll());
  t.hist = res.concat(t.hist).slice(0, TT_P.histMax); t.newN = res.length; t.pick = -1; gdSave(s); renderThanThu();
}
function ttPick(i) { const s = ttSt(), t = s.tt; t.pick = t.pick === i ? -1 : i; gdSave(s); renderThanThu(); }
function ttSave() {   // Lưu Phụ Thể đã chọn vào ô đang chọn
  const s = ttSt(), t = s.tt, o = ttCur(s), b = ttBeast(t.cur), arr = t.slots[t.cur] = t.slots[t.cur] || [];
  const it = t.hist[t.pick]; if (!it) return scToast('Chưa chọn Phụ Thể nào');
  if (t.sel >= ttSlotsOpen(b, o)) return scToast('Ô này chưa mở');
  t.hist.splice(t.pick, 1); if (t.pick < t.newN) t.newN--;
  t.prev = { i: t.sel, v: arr[t.sel] || null, saved: it }; arr[t.sel] = it; t.pick = -1; gdSave(s); renderThanThu(); scToast('Đã lưu ' + it.n + ' vào ô ' + (t.sel + 1));
}
function ttRevert() {   // hoàn tác lần Lưu gần nhất: ô trở lại như cũ, Phụ Thể đã lưu quay về danh sách
  const s = ttSt(), t = s.tt, arr = t.slots[t.cur] = t.slots[t.cur] || []; if (!t.prev) return scToast('Chưa có lần lưu trước');
  arr[t.prev.i] = t.prev.v; if (t.prev.saved) { t.hist.unshift(t.prev.saved); t.hist = t.hist.slice(0, TT_P.histMax); t.newN++; } t.prev = null; t.pick = -1; gdSave(s); renderThanThu();
}
function ttList() {   // Danh sách Phụ Thể: 8 loại × 7 bậc
  const cell = (x, i) => `<div style="flex:1 1 0;min-width:0;text-align:center;border:2px solid ${TT_QC[i]};border-radius:8px;padding:3px 1px;background:rgba(0,0,0,.35)"><div>${ttPtImg(x.n, i + 1, 2.2)}</div><small style="display:block;font-size:10px;line-height:1.2;color:${TT_QC[i]}">Bậc ${i + 1}<br>+${ttPct(x.n, i + 1)}%</small></div>`;
  const rows = TT_SLOT_PT.map(x => `<div style="margin:6px 0"><div style="text-align:left;font-weight:900;color:#fde68a;margin-bottom:3px">${x.n} <small style="color:#cbd5e1;font-weight:700">• Tăng ${ttStatLabel(x.n)} cho ${ttRoleLabel(x.role)}</small></div><div style="display:flex;gap:3px">${TT_QC.map((_, i) => cell(x, i)).join('')}</div></div>`).join('');
  document.getElementById('tt-modal').innerHTML = `<div class="md-box"><button class="md-x" onclick="ttClose()">✕</button><div class="hd-name" style="text-align:center">Phụ Thể (${TT_SLOT_PT.length} loại × 7 bậc)</div><div style="max-height:70vh;overflow-y:auto;padding:0 2px">${rows}</div></div>`; document.getElementById('tt-modal').style.display = 'flex';
}
function ttClose() { document.getElementById('tt-modal').style.display = 'none'; }
function ttChange() {
  const s = ttSt(), t = s.tt, bx = b => { const own = t.own[b[0]], sh = t.sh[b[0]] || 0, cur = t.cur === b[0];
    return `<div class="tt-bc"><div class="tt-bp"><span class="rk ${b[1] === 'S' ? 's' : ''}">${b[1]}</span>${own ? '' : `<span class="ct">${sh}/${b[2]}</span>`}<div class="pic">${ttImg(b[0])}</div><b>${b[0]}</b></div><div class="fx">${(b[4].length ? b[4] : [0, 0, 0, 0]).map(f => !f ? '<div><u>Coming soon...</u>Coming soon...</div>' : `<div><u>${f[0]}</u>Hiệu quả phụ thể ${f[0]} tăng ${f[1]}${f[2] ? ' điểm' : '%'}</div>`).join('')}</div>
    ${own ? `<button ${cur ? 'disabled' : ''} onclick="ttUse('${b[0]}')">${cur ? 'Đang dùng' : 'Dùng'}</button>` : `<button class="g" ${sh < b[2] ? 'disabled' : ''} onclick="ttGet('${b[0]}')">Nhận</button>`}</div>`; };
  document.getElementById('tt-modal').innerHTML = `<div class="md-box"><button class="md-x" onclick="ttClose()">✕</button><div class="hd-name" style="text-align:center;color:#fde047">Thần Thú</div><div class="tt-bgrid">${TT_BEASTS.map(bx).join('')}</div><div style="text-align:center;color:#4ade80;margin-top:6px;font-weight:700">Mảnh Thần Thú nhận từ Cấm Địa</div></div>`; document.getElementById('tt-modal').style.display = 'flex';
}
function ttUse(n) { const s = ttSt(); s.tt.cur = n; s.tt.sel = 0; s.tt.prev = null; gdSave(s); ttClose(); renderThanThu(); }
function ttGet(n) { const s = ttSt(), b = ttBeast(n); if ((s.tt.sh[n] || 0) < b[2]) return; s.tt.sh[n] -= b[2]; s.tt.own[n] = { lv: 1, star: 1, exp: 0 }; gdSave(s); ttChange(); scToast('Đã nhận ' + n); }
function renderThanThu() {
  const s = ttSt(), t = s.tt, o = ttCur(s), b = ttBeast(t.cur), st = ttStat(b, o), nx = o.star < TT_P.maxStar ? ttStat(b, Object.assign({}, o, { star: o.star + 1 })) : null;
  document.getElementById('tt-tabs').innerHTML = [['thu', 'Thần Thú'], ['lv', 'Cấp'], ['star', 'Sao'], ['phu', 'Phụ Thể']].map(([k, n]) => `<button class="${ttTab === k ? 'on' : ''}" onclick="ttTabSet('${k}')">${n}</button>`).join('');
  const stars = `<span class="gold">${'★'.repeat(o.star)}${'☆'.repeat(Math.max(0, TT_P.maxStar - o.star))}</span>`, open = ttSlotsOpen(b, o), arr = t.slots[t.cur] || [];
  const slotRow = (cnt, offs) => Array.from({ length: cnt }, (_, k) => { const i = k + offs, sl = arr[i], on = i < open;
    return `<div class="tt-sk ${t.sel === i && on ? 'use' : ''}" onclick="${on ? `ttSel(${i})` : ''}"><i style="${on && sl ? 'border-color:' + TT_QC[sl.q - 1] : ''}">${!on ? '🔒' : sl ? ttPtImg(sl.n, sl.q) : '＋'}</i>${!on ? (i < 5 ? (i + 1) + ' Sao mở' : 'Cấp S mở') : sl ? sl.n : 'Trống'}</div>`; }).join('');
  let body = '';
  if (ttTab === 'thu') body = `<div class="tt-card"><div class="tt-pic">${ttImg(b[0])}<button onclick="ttChange()">Đổi</button></div><div class="tt-info"><div class="tt-nm">${b[0]} <small>${b[1]}</small></div><div>Điểm: <b class="gold">${fmtN(st.pts)}</b></div><div>Sao: ${stars} &nbsp; Cấp: ${o.lv}</div><div>HP: ${fmtN(st.hp)} &nbsp; Hồi: ${fmtN(st.heal)}</div><div>Phá Giáp: ${fmtN(st.pha)} &nbsp; Đỡ Đòn: ${st.dodge}%</div></div></div>`;
  if (ttTab === 'lv') { const need = ttNeed(o.lv), have = Object.keys(TT_FEED).map(k => ttItem(s, k));
    body = `<div class="tt-lv"><div class="tt-pic big">${ttImg(b[0])}</div><div class="tt-info box">Cấp: ${o.lv}<br>Sao: ${stars}<br>Phá Giáp: ${fmtN(st.pha)}<br>Đỡ Đòn: ${st.dodge}%<br>HP: ${fmtN(st.hp)}<br>Hồi: ${fmtN(st.heal)}</div></div><div class="tt-exp">${fmtN(o.exp)}/${fmtN(need)}<i style="width:${Math.min(100, o.exp / need * 100)}%"></i></div>
    <div class="gs-bar">Vật Liệu <span>Giới hạn cấp ${ttCap(o)} (theo cấp acc)</span></div><div class="tt-row">${['Thú Hồn', 'Thú Linh'].map((k, i) => `<div class="tt-sk"><i>${gdIco(k, ['🟠', '🔥'][i])}</i>${k}<br>×${fmtN(have[i])}<br><small>+${TT_FEED[k]} EXP</small></div>`).join('')}</div><div class="gs-act"><div>Tự động dùng toàn bộ Thú Hồn & Thú Linh</div><button onclick="ttFeed()">Cho Ăn</button></div>`; }
  if (ttTab === 'star') { const ql = TT_P.starLinh * o.star, da = TT_P.starDa * o.star, hq = ttItem(s, 'Dị Linh'), hd = ttItem(s, 'Đá Nữ Oa');
    body = o.star >= TT_P.maxStar ? `<div class="ch-empty" style="padding:40px">Thần thú đã đạt ${TT_P.maxStar} sao</div>` : `<div class="tt-lv"><div class="tt-pic big">${ttImg(b[0])}</div><div class="tt-info box"><div>HP:</div><div class="cmp">${fmtN(st.hp)} → ${fmtN(nx.hp)}</div><div>Hồi:</div><div class="cmp">${fmtN(st.heal)} → ${fmtN(nx.heal)}</div><div>Phá Giáp:</div><div class="cmp">${st.pha} → ${nx.pha}</div><div>Đỡ Đòn:</div><div class="cmp">${st.dodge}% → ${nx.dodge}%</div><small class="gr">Thăng sao sẽ mở thêm 1 ô Phụ Thể</small></div></div>
    <div class="gs-bar">Tăng Sao</div><div class="tt-row cost"><div class="tt-sk"><small>Dị Linh</small><i>${gdIco('Dị Linh', '🎭')}</i>${hq}/${ql}</div><div class="tt-sk"><small>Đá Nữ Oa</small><i>${gdIco('Đá Nữ Oa', '🔻')}</i>${hd}/${da}</div></div><div class="gs-act"><div>${ttStarLocked(o) ? '🔒 Cần cấp acc ' + ttStarNeedAcc(o.star + 1) + ' để lên ' + (o.star + 1) + ' sao (acc hiện tại ' + accLevel + ')' : 'Cần Dị Linh & Đá Nữ Oa (rơi từ Boss bang)'}</div><button ${ttStarLocked(o) ? 'disabled' : ''} onclick="ttStarUp()">Tăng</button></div>`; }
  if (ttTab === 'phu') { const sl = arr[t.sel] || null, left = Math.max(0, Math.ceil((t.freeAt - Date.now()) / 1000)), pk = t.hist[t.pick] || null;
    body = `<div class="tt-row">${slotRow(10, 0)}</div><div class="gs-bar">Lĩnh Ngộ <button class="tt-ngo" onclick="ttList()">Danh Sách</button></div>
    <div class="tt-ngo2"><div class="c"><h4>Hiện Tại (ô ${t.sel + 1})</h4><div class="cb" style="${sl ? 'border-color:' + TT_QC[sl.q - 1] : ''}"><i>${sl ? ttPtImg(sl.n, sl.q, 2.4) : '＋'}</i><b>${sl ? sl.n : 'Trống'}</b><p>${ttSlotDesc(sl)}</p></div></div>
    <div class="c"><h4>Tẩy phụ thể</h4><div class="cb dark"><p>Tẩy để có Phụ Thể mới.</p><div>Miễn phí 💰</div><button ${left ? 'disabled' : ''} onclick="ttReroll(1)">Tẩy</button><div style="margin-top:6px">${fmtN(TT_P.rerollCost)} 💰 <em>Siêu</em></div><button onclick="ttReroll(10)">Tẩy 10 lần</button></div></div></div>
    <div class="gs-bar">Kết quả tẩy <span>${t.hist.length}/${TT_P.histMax} gần nhất • chọn 1 rồi bấm Lưu</span></div>
    <div class="tt-hist">${t.hist.length ? t.hist.map((p, i) => `<div class="${t.pick === i ? 'sel' : ''} ${i < t.newN ? 'new' : ''}" style="border-color:${TT_QC[p.q - 1]}" onclick="ttPick(${i})"><i>${ttPtImg(p.n, p.q)}</i>${p.n}<small>+${ttPct(p.n, p.q)}%</small></div>`).join('') : '<div class="tt-hist-empty">Chưa có kết quả. Bấm Tẩy hoặc Tẩy 10 lần.</div>'}</div>
    <div class="gs-act"><div>${pk ? `Đã chọn: <b>${pk.n}</b> ${ttSlotDesc(pk).replace('Hiệu quả ', '')} → ô ${t.sel + 1}` : 'Chưa chọn Phụ Thể'}</div><button class="tt-save" ${pk ? '' : 'disabled'} onclick="ttSave()">Lưu</button></div>
    <div class="gs-act"><button class="red" onclick="ttRevert()">Hoàn tác lần lưu</button><div id="tt-free">Miễn phí: ${[left / 3600 | 0, left / 60 % 60 | 0, left % 60].map(v => String(v).padStart(2, '0')).join(':')}</div></div>`; }
  document.getElementById('tt-body').innerHTML = body;
}
setInterval(() => { const e = document.getElementById('tt-free'); if (e && gdSt().tt) { const l = Math.max(0, Math.ceil((gdSt().tt.freeAt - Date.now()) / 1000)); e.textContent = 'Miễn phí: ' + [l / 3600 | 0, l / 60 % 60 | 0, l % 60].map(v => String(v).padStart(2, '0')).join(':'); } }, 1000);
function openCamDia() { openBangBoss(); }   // Cấm Địa = Boss bang (mảnh Thần Thú rơi từ Châu của boss)
(function () { const d = document.createElement('div'); d.id = 'tt-modal'; d.className = 'md-wrap'; d.onclick = e => { if (e.target === d) ttClose(); }; document.body.appendChild(d); })();

;
/* === js/social/thanthu-battle.js === */
/* Thần Thú ra trận: bệ đứng 2 góc trên + Phụ Thể cộng % chỉ số theo từng tướng */
// tên phụ thể -> chỉ số tăng (mapping tạm, có thể chỉnh)
const TT_FXMAP = { 'Cường Công': 'atk', 'Sát Lục': 'atk', 'Bá Thuẫn': 'hp', 'Thần Huyết': 'hp', 'Hoạt Khí': 'hp', 'Tái Sinh': 'hp',
  'Chiến Thuẫn': 'def', 'Ngự Thuẫn': 'def', 'Kỳ Thuẫn': 'block', 'Huyết Bạo': 'crit', 'Kích Sát': 'crit', 'Bạo Tức': 'critDmg', 'Bạo Nộ': 'critDmg',
  'Kích Phá': 'pierce', 'Tinh Chuẩn': 'acc', 'Ẩn Thân': 'dodge', 'Tàn Ảnh': 'dodge' };
// Phụ thể theo CHẤT TƯỚNG (hero-roles.js: skill = Kỹ năng, tank = Thủ, atk = Công kích, sup = Hỗ trợ, heal = Trị liệu; 'all' = mọi tướng)
//  • TỐC: Thần Tốc → Kỹ năng • Hộ Tốc → Thủ • Cấp Tốc → Công kích • Trợ Tốc → Hỗ trợ • Gia Tốc → Trị liệu
//  • THUẪN (tăng HP): Thần Thuẫn → tất cả • Hộ Thuẫn → Thủ • Trợ Thuẫn → Hỗ trợ
const TT_ROLE_FX = { 'Thần Tốc': { k: 'spd', r: 'skill' }, 'Hộ Tốc': { k: 'spd', r: 'tank' }, 'Cấp Tốc': { k: 'spd', r: 'atk' }, 'Trợ Tốc': { k: 'spd', r: 'sup' }, 'Gia Tốc': { k: 'spd', r: 'heal' },
  'Thần Thuẫn': { k: 'hp', r: 'all' }, 'Hộ Thuẫn': { k: 'hp', r: 'tank' }, 'Trợ Thuẫn': { k: 'hp', r: 'sup' } };
// danh sách phụ thể đang có: hiệu quả của thần thú + các ô đã lắp  -> [{n, v, pt?}]
function ttPtList(cur, slotsArr, star) {
  const b = TT_BEASTS.find(x => x[0] === cur); if (!b) return [];
  const out = (b[4] || []).map(e => ({ n: e[0], v: e[1], pts: !!e[2], inn: true }));
  const open = ttSlotsOpen(b, { star: star || 1 });
  (slotsArr || []).slice(0, open).forEach(sl => { if (sl && sl.n) out.push({ n: sl.n, v: ttPct(sl.n, sl.q), pts: false, q: sl.q }); });
  return out;
}
function ttMine() {
  try { const s = ttSt(), c = ttCur(s); if (!c) return null; return { beast: s.tt.cur, pt: ttPtList(s.tt.cur, s.tt.slots[s.tt.cur], c.star) }; } catch (e) { return null; }
}
// cộng dồn theo chỉ số: % hoặc điểm (Kích Phá). Phụ thể theo chất tướng gom riêng: bonus.<chỉ số>.role = { skill, tank, atk, sup, heal }
function ttBonus(pt) {
  const b = {};
  (pt || []).forEach(p => {
    const rf = TT_ROLE_FX[p.n];
    if (rf) { const o = b[rf.k] = b[rf.k] || { pct: 0, pts: 0 }; if (rf.r === 'all') o.pct += p.v; else { o.role = o.role || {}; o.role[rf.r] = (o.role[rf.r] || 0) + p.v; } return; }
    const k = TT_FXMAP[p.n]; if (!k) return; const o = b[k] = b[k] || { pct: 0, pts: 0 }; if (p.pts) o.pts += p.v; else o.pct += p.v;
  });
  return b;
}
// chất tướng của 1 đơn vị trong trận / snapshot (null nếu không nhận ra được tướng)
function ttUnitRole(u) {
  try {
    const c = [u.hero && u.hero.id, u.h && u.h.id, u.heroId, u.hid, typeof u.h === 'number' ? u.h : undefined, u.id];
    for (const v of c) if (Number.isInteger(v) && typeof HERO_ROLE !== 'undefined' && HERO_ROLE[v]) return HERO_ROLE[v];
  } catch (e) {}
  return null;
}
// áp lên 1 bộ chỉ số (unit hoặc snapshot): % của chính chỉ số tướng đó. heroId (tuỳ chọn) = id tướng nếu unit không tự chứa
function ttApply(u, bonus, heroId) {
  Object.keys(bonus || {}).forEach(k => {
    const o = bonus[k], v = Number(u[k]) || 0; let pct = o.pct || 0;
    if (o.role) { const r = (Number.isInteger(heroId) && HERO_ROLE[heroId]) || ttUnitRole(u); if (r) pct += o.role[r] || 0; }
    u[k] = k === 'spd' ? +(v * (1 + pct / 100)).toFixed(2) : Math.round(v * (1 + pct / 100) + (o.pts || 0));
  });
  return u;
}
const ttPtIco = (n, q, v) => (TT_ROLE_FX[n] && typeof ttPtImg === 'function') ? ttPtImg(n, q || ttQOf(n, Number(v) || 0), 1.5) : (TT_PT_ICO[TT_PT.indexOf(n)] || '✨');   // loại Tốc / Thuẫn dùng ảnh icon-phuthe, còn lại emoji
const TT_FACE_LEFT = ['Kim Sư', 'Cửu Vỹ Hồ'];   // thần thú có ảnh gốc quay mặt sang TRÁI (các con khác quay sang phải)
// Vị trí đám mây MẶC ĐỊNH cho mọi trình duyệt / mọi tài khoản: khóa 'l.<tên thần thú>' (phe trái) hoặc 'r.<tên thần thú>' (phe phải), x/y là px lệch so với chỗ gốc.
// Chỉnh xong bằng F2 thì bấm nút "📋 Sao chép" trên đầu màn hình, dán đè cả khối const này vào đây, lưu file rồi đẩy lên host.
const TT_CLOUD_DEF = {
  'l.Kỳ Lân': { x: 29, y: -12 },
  'r.Lân Sư': { x: -22, y: -6 },
  'l.Hắc Điêu': { x: 27, y: -4 },
  'l.Tiên Lộc': { x: 34, y: 0 },
  'r.Tiên Lộc': { x: -30, y: 4 },
};
// Vị trí/cỡ THẦN THÚ mặc định: khóa 'l.<tên>' / 'r.<tên>', x/y = px lệch, s = tỉ lệ cỡ (1 = gốc). Chỉnh bằng chế độ kéo rồi bấm "Sao chép" như đám mây.
const TT_BEAST_DEF = {
  'r.Tiên Lộc': { x: 24, y: 2, s: 1 },
  'l.Tiên Lộc': { x: -13, y: -1, s: 1 },
};
function ttBeastAll() {
  const all = {}; Object.keys(TT_BEAST_DEF).forEach(k => all[k] = { x: +TT_BEAST_DEF[k].x || 0, y: +TT_BEAST_DEF[k].y || 0, s: +TT_BEAST_DEF[k].s || 1 });
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('ttbeast.') === 0) { const v = JSON.parse(localStorage.getItem(k)); if (v && isFinite(v.x) && isFinite(v.y)) all[k.slice(8)] = { x: +v.x, y: +v.y, s: +v.s || 1 }; } } } catch (e) {}
  return all;
}
function ttCloudAll() {   // mặc định + phần đã chỉnh trên máy này (phần chỉnh đè mặc định)
  const all = {}; Object.keys(TT_CLOUD_DEF).forEach(k => all[k] = { x: TT_CLOUD_DEF[k].x, y: TT_CLOUD_DEF[k].y });
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('ttcloud.') === 0) { const v = JSON.parse(localStorage.getItem(k)); if (v && isFinite(v.x) && isFinite(v.y)) all[k.slice(8)] = { x: +v.x, y: +v.y }; } } } catch (e) {}
  return all;
}
function ttCloudCopy() {
  const all = ttCloudAll(), ks = Object.keys(all).filter(k => all[k].x || all[k].y);
  const ba = ttBeastAll(), bk = Object.keys(ba).filter(k => ba[k].x || ba[k].y || ba[k].s !== 1);
  const txt = 'const TT_CLOUD_DEF = {\n' + ks.map(k => "  '" + k.replace(/'/g, "\\'") + "': { x: " + all[k].x + ', y: ' + all[k].y + ' },').join('\n') + '\n};\n'
    + 'const TT_BEAST_DEF = {\n' + bk.map(k => "  '" + k.replace(/'/g, "\\'") + "': { x: " + ba[k].x + ', y: ' + ba[k].y + ', s: ' + (+ba[k].s.toFixed(3)) + ' },').join('\n') + '\n};';
  const done = () => { const b = document.getElementById('tt-edit-copy'); if (b) { b.textContent = '✔ Đã sao chép'; setTimeout(() => { b.textContent = '📋 Sao chép'; }, 1500); } };
  try { navigator.clipboard.writeText(txt).then(done, () => prompt('Sao chép đoạn này (Ctrl+C):', txt)); } catch (e) { prompt('Sao chép đoạn này (Ctrl+C):', txt); }
}
// Chỉ máy của admin mới chỉnh được: gõ 1 lần trong Console của trình duyệt  localStorage.setItem('tt_edit','1')  (tắt: localStorage.removeItem('tt_edit')). Người chơi thường: đám mây cố định theo TT_CLOUD_DEF.
const ttCanEdit = () => { try { if (/[?&]tt_edit(=1)?(&|$)/.test(location.search)) return true; return localStorage.getItem('tt_edit') === '1'; } catch (e) { return false; } };   // mở game bằng đuôi ?tt_edit=1 cũng bật quyền chỉnh (không cần F12)
function ttEditToggle() {   // dùng chung cho phím F2 và nút trên màn hình
  const clouds = document.querySelectorAll('.bf-bst-cloud');
  if (!clouds.length && !ttEditOn) return;
  ttEditOn = !ttEditOn;
  document.querySelectorAll('.bf-bst-cloud, .bf-bst-sp').forEach(c => c._ttEdit && c._ttEdit(ttEditOn));
  ttEditTip(ttEditOn);
  const b = document.getElementById('tt-edit-btn'); if (b) b.textContent = ttEditOn ? '✔ Xong' : '✏️ Chỉnh mây';
}
setInterval(() => {   // nút nổi "Chỉnh mây": chỉ hiện khi có quyền chỉnh và đang trong trận có thần thú
  let b = document.getElementById('tt-edit-btn');
  const show = ttCanEdit() && (document.querySelector('.bf-bst-cloud') || ttEditOn);
  if (!show) { if (b) b.remove(); return; }
  if (!b) {
    b = document.createElement('button'); b.id = 'tt-edit-btn'; b.textContent = ttEditOn ? '✔ Xong' : '✏️ Chỉnh mây';
    b.style.cssText = 'position:fixed;left:8px;top:50px;z-index:100001;padding:6px 10px;border-radius:10px;border:1px solid #fde047;background:#422006;color:#fde047;font:800 12px sans-serif;cursor:pointer';
    b.onclick = ttEditToggle; document.body.appendChild(b);
  }
}, 700);
let ttEditOn = false;
function ttEditTip(on) {
  let t = document.getElementById('tt-edit-tip');
  if (!on) { if (t) t.remove(); return; }
  if (!t) { t = document.createElement('div'); t.id = 'tt-edit-tip'; document.body.appendChild(t); }
  t.style.cssText = 'position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:100000;padding:6px 12px;border-radius:10px;background:#000c;border:1px solid #fde047;color:#fde047;font:800 12px/1.3 sans-serif;text-align:center;white-space:nowrap';
  t.innerHTML = '✏️ CHỈNH: kéo thần thú / kéo mây • lăn chuột trên thần thú = đổi cỡ • nhấp đúp = đặt lại • F2 = xong <button id="tt-edit-copy" style="margin-left:8px;padding:3px 8px;border-radius:6px;border:1px solid #fde047;background:#422006;color:#fde047;font:800 12px sans-serif;cursor:pointer">📋 Sao chép</button>';
  document.getElementById('tt-edit-copy').onclick = ttCloudCopy;
}
if (typeof window !== 'undefined' && !window.__ttF2) {
  window.__ttF2 = 1;
  window.addEventListener('keydown', e => {
    if (e.key !== 'F2' || !ttCanEdit()) return;
    const tg = e.target, tag = tg && tg.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (tg && tg.isContentEditable)) return;
    if (!document.querySelectorAll('.bf-bst-cloud').length && !ttEditOn) return;      // không ở trong trận thần thú thì không chặn phím F2
    e.preventDefault();
    ttEditToggle();
  });
  setInterval(() => { if (ttEditOn && !document.querySelector('.bf-bst-cloud')) { ttEditOn = false; ttEditTip(false); } }, 1000);   // thoát trận thì tự tắt chế độ chỉnh
}
// Kéo thả đám mây dưới chân thần thú: trong trận bấm F2 để vào chế độ chỉnh (mây có viền nét đứt), nắm đám mây kéo tới chỗ muốn đặt, bấm F2 lần nữa để khóa lại.
// Nhấp đúp (hoặc chạm 2 lần) lên đám mây để đặt lại chỗ cũ. Ngoài chế độ chỉnh, đám mây không bắt chuột.
// Chỉ đám mây di chuyển, thần thú đứng yên. Vị trí nhớ riêng cho từng phe + từng thần thú (localStorage 'ttcloud.<l|r>.<tên thần thú>').
function ttCloudDrag(st, side, beast) {
  const cl = st.querySelector('.bf-bst-cloud'); if (!cl) return;
  const key = 'ttcloud.' + side + '.' + beast, LIM = 600;
  const def = TT_CLOUD_DEF[side + '.' + beast] || { x: 0, y: 0 };   // mặc định chung cho mọi máy
  let o = { x: +def.x || 0, y: +def.y || 0 };
  if (ttCanEdit()) try { const s = JSON.parse(localStorage.getItem(key) || 'null'); if (s && isFinite(s.x) && isFinite(s.y)) o = { x: +s.x, y: +s.y }; } catch (e) {}   // chỉnh riêng trên máy này đè mặc định
  let ad = { x: 0, y: 0, s: 1 };   // admin → Vị trí Thần Thú & Đám Mây: cdx/cdy = lệch ngang/dọc (% khung thần thú), cs = cỡ %
  try { const P = null; if (P && typeof P === 'object') ad = { x: (Number(P.cdx) || 0) * st.offsetWidth / 100, y: (Number(P.cdy) || 0) * st.offsetHeight / 100, s: (Number(P.cs) || 100) / 100 }; } catch (e) {}
  const apply = () => { cl.style.transform = 'translate(calc(-50% + ' + (o.x + ad.x) + 'px), ' + (o.y + ad.y) + 'px)' + (ad.s !== 1 ? ' scale(' + ad.s + ')' : ''); };
  const save = () => { try { if (o.x === (+def.x || 0) && o.y === (+def.y || 0)) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(o)); } catch (e) {} };
  const clamp = v => Math.max(-LIM, Math.min(LIM, Math.round(v)));
  apply();
  cl.draggable = false;
  let drag = null, lastTap = 0;
  cl.style.touchAction = 'none'; cl.style.userSelect = 'none'; cl.style.webkitUserDrag = 'none';
  cl._ttEdit = on => {   // F2: bật/tắt chế độ chỉnh
    cl.style.pointerEvents = on ? 'auto' : 'none'; cl.style.cursor = on ? 'grab' : '';
    cl.style.outline = on ? '2px dashed #fde047' : ''; cl.style.outlineOffset = on ? '-2px' : '';
    if (!on && drag) { drag = null; save(); }
  };
  cl.addEventListener('pointerdown', e => {
    if (!ttEditOn || !ttCanEdit()) return;
    e.preventDefault(); e.stopPropagation();
    const r = st.getBoundingClientRect(), k = st.offsetWidth ? r.width / st.offsetWidth : 1;   // tỉ lệ thu phóng thật của màn hình/thần thú
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: o.x, oy: o.y, k: k || 1, moved: false };
    try { cl.setPointerCapture(e.pointerId); } catch (_) {}
    cl.style.cursor = 'grabbing';
  });
  cl.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    o.x = clamp(drag.ox + dx / drag.k); o.y = clamp(drag.oy + dy / drag.k); apply();
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const moved = drag.moved; drag = null; cl.style.cursor = 'grab';
    if (!moved) { const t = Date.now(); if (t - lastTap < 350) { o = { x: +def.x || 0, y: +def.y || 0 }; apply(); lastTap = 0; } else lastTap = t; }   // nhấp/chạm đúp = đặt lại
    save();
  };
  cl.addEventListener('pointerup', end); cl.addEventListener('pointercancel', end);
  cl.addEventListener('contextmenu', e => { if (ttEditOn) e.preventDefault(); });
  cl._ttEdit(ttEditOn);   // trận mới (sang đợt khác) mà đang ở chế độ chỉnh thì giữ nguyên
}
// Kéo thả + đổi cỡ THẦN THÚ (không đụng đám mây). Dùng thuộc tính CSS translate/scale riêng nên không xung đột với lật hình (scaleX(-1)) hay chỉnh admin.
// Kéo vào thân thần thú = dời thần thú; kéo phần mây lòi ra bên dưới = dời mây. Lăn chuột trên thần thú = to/nhỏ. Nhấp đúp = đặt lại.
function ttBeastDrag(st, side, beast) {
  const sp = st.querySelector('.bf-bst-sp'); if (!sp) return;
  const key = 'ttbeast.' + side + '.' + beast, LIM = 600;
  const d0 = TT_BEAST_DEF[side + '.' + beast] || {}, def = { x: +d0.x || 0, y: +d0.y || 0, s: +d0.s || 1 };
  let o = { x: def.x, y: def.y, s: def.s };
  if (ttCanEdit()) try { const v = JSON.parse(localStorage.getItem(key) || 'null'); if (v && isFinite(v.x) && isFinite(v.y)) o = { x: +v.x, y: +v.y, s: +v.s || 1 }; } catch (e) {}
  const apply = () => { sp.style.transformOrigin = '50% 100%'; sp.style.translate = o.x + 'px ' + o.y + 'px'; sp.style.scale = String(o.s); };
  const same = () => o.x === def.x && o.y === def.y && Math.abs(o.s - def.s) < 0.001;
  const save = () => { try { if (same()) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(o)); } catch (e) {} };
  const clamp = v => Math.max(-LIM, Math.min(LIM, Math.round(v)));
  apply();
  let drag = null, lastTap = 0;
  sp.style.touchAction = 'none';
  sp._ttEdit = on => {
    sp.style.pointerEvents = on ? 'auto' : ''; sp.style.cursor = on ? 'grab' : '';
    sp.style.outline = on ? '2px dashed #38bdf8' : ''; sp.style.outlineOffset = on ? '-2px' : '';
    if (!on && drag) { drag = null; save(); }
  };
  sp.addEventListener('pointerdown', e => {
    if (!ttEditOn || !ttCanEdit()) return;
    e.preventDefault(); e.stopPropagation();
    const r = st.getBoundingClientRect(), k = st.offsetWidth ? r.width / st.offsetWidth : 1;
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: o.x, oy: o.y, k: k || 1, moved: false };
    try { sp.setPointerCapture(e.pointerId); } catch (_) {}
    sp.style.cursor = 'grabbing';
  });
  sp.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    o.x = clamp(drag.ox + dx / drag.k); o.y = clamp(drag.oy + dy / drag.k); apply();
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const moved = drag.moved; drag = null; sp.style.cursor = 'grab';
    if (!moved) { const t = Date.now(); if (t - lastTap < 350) { o = { x: def.x, y: def.y, s: def.s }; apply(); lastTap = 0; } else lastTap = t; }
    save();
  };
  sp.addEventListener('pointerup', end); sp.addEventListener('pointercancel', end);
  sp.addEventListener('wheel', e => {   // lăn chuột = đổi cỡ thần thú
    if (!ttEditOn || !ttCanEdit()) return;
    e.preventDefault();
    o.s = Math.max(0.3, Math.min(3, +(o.s * (e.deltaY < 0 ? 1.05 : 1 / 1.05)).toFixed(3))); apply(); save();
  }, { passive: false });
  sp.addEventListener('contextmenu', e => { if (ttEditOn) e.preventDefault(); });
  sp._ttEdit(ttEditOn);
}
function ttSetupUI(my, foe) {
  const ar = document.getElementById('battle-arena'); if (!ar) return;
  ar.querySelectorAll('.bf-bst, .bf-ptrow').forEach(e => e.remove());
  [[my, 'l'], [foe, 'r']].forEach(([x, side]) => {
    if (!x) return;
    const faceL = TT_FACE_LEFT.includes(x.beast), flip = side === 'l' ? faceL : !faceL;   // trái phải nhìn sang phải, phe địch nhìn sang trái
    const st = document.createElement('div'); st.className = 'bf-bst ' + side + (flip ? ' flip' : '');
    st.innerHTML = `<div class="bf-bst-sp">${ttImg(x.beast)}</div><img class="bf-bst-cloud" src="giao-dien/buc-may.webp" alt="">`;
    try {   // vị trí thần thú do admin chỉnh (admin → Vị trí thần thú): dx = ra/vào (% bề ngang sân, + = vào giữa), dy = lên/xuống (% chiều cao sân, + = xuống), s = cỡ %
      const P = null;   // vị trí thần thú cố định theo TT_BEAST_DEF / TT_CLOUD_DEF trong code (admin không còn chỉnh)
      if (P && typeof P === 'object') {
        const dx = Number(P.dx) || 0, dy = Number(P.dy) || 0, sc = Number(P.s) || 100;
        if (dx) st.style[side === 'l' ? 'left' : 'right'] = dx + '%';
        if (dy) st.style.top = 'calc(34px + ' + dy + '%)';
        if (sc !== 100) { st.style.transformOrigin = '50% 100%'; st.style.transform = 'scale(' + (sc / 100) + ')'; }
      }
    } catch (e) {}
    ar.appendChild(st); ttCloudDrag(st, side, x.beast); ttBeastDrag(st, side, x.beast);   // kéo thả đám mây dưới chân
    if (x.pt && x.pt.length) { const r = document.createElement('div'); r.className = 'bf-ptrow ' + side;
      r.innerHTML = x.pt.filter(p => !p.inn).map(p => `<span title="${p.n} +${p.v}${p.pts ? '' : '%'}">${ttPtIco(p.n, p.q, p.v)}</span>`).join(''); ar.appendChild(r); }
  });
}
// đối thủ giả (bot / PVE): thần thú ngẫu nhiên cố định theo tên, chỉ để trang trí
function ttFake(seed) { let h = 0; String(seed || '').split('').forEach(c => h = (h * 31 + c.charCodeAt(0)) | 0); const b = TT_BEASTS[Math.abs(h) % 8]; return { beast: b[0], pt: [], deco: true }; }

;
/* === js/social/daisanh.js === */
/* ĐẠI SẢNH — BANG CHUNG NHIỀU NGƯỜI (Firestore: guilds/{id}) + TỤ BẢO BỒN
   guilds/{id} = { name, notice, lv, exp, basin, minLv, leader, t, mem: { uid: { n, lv, pw, r:'chu'|'pho'|'tv', t } }, apps: { uid: { n, lv, t } }, news: [{ t, x }] }
   Cần đăng nhập đám mây. Quy tắc Firestore: xem firestore-admin.rules.txt (khối guilds). */
function gdBang() {
  const s = gdSt(); s.bang = Object.assign({ name: 'Văn Lang', notice: 'Chạm vào đây để sửa công cáo bang.', exp: 0, news: [], basin: 0 }, s.bang || {}); s.bangId = s.bangId || ''; s.bangApply = s.bangApply || ''; return s;
}
const gdExpMax = lv => G2.expBase * Math.pow(G2.expMult, Math.max(0, lv - 1));   // cấp 1 = 5.000 EXP, mỗi cấp sau nhân 2, không giới hạn cấp
const DS_MAXMEM = 45, DS_ROLE = { chu: 'Bang Chủ', pho: 'Phó Bang', tv: 'Thành Viên' };
const dsOn = () => !!(typeof clDb !== 'undefined' && clDb && typeof clUser !== 'undefined' && clUser);
const dsRef = id => clDb.collection('guilds').doc(id);
const dsUid = () => clUser.uid;
const dsMemN = g => Object.keys(g.mem || {}).length;
const dsRoleRank = r => r === 'chu' ? 0 : r === 'pho' ? 1 : 2;
let DS_CREATE = 300, DS_CD_H = 6;   // phí tạo bang (vàng) và số giờ chờ sau khi rời bang (admin: guild2.createCost, guild2.leaveCdH)
cfgOnApply(() => { DS_CREATE = Math.max(0, Math.floor(cfgNum('guild2.createCost', 300))); DS_CD_H = Math.max(0, cfgNum('guild2.leaveCdH', 6)); });
const dsCdLeft = () => Math.max(0, (Number(gdBang().bangLeaveAt) || 0) + DS_CD_H * 3600e3 - Date.now());
const dsCdText = ms => { const m = Math.ceil(ms / 60000); return (m >= 60 ? Math.floor(m / 60) + ' giờ ' : '') + (m % 60) + ' phút'; };
function dsBadge() {   // chữ trên thanh trên cùng = tên bang (chưa vào bang thì để trống)
  try { const nm = dsG ? dsG.name : '', s = gdBang(); if ((s.bangName || '') !== nm) { s.bangName = nm; gdSave(s); } const e = document.querySelector('.server-badge'); if (e) { e.textContent = nm; e.style.display = nm ? '' : 'none'; } } catch (x) {}
}
let dsTab = 'bang', dsG = null, dsList = null, dsBusy = false;
const dsMe = () => dsG && dsG.mem && dsG.mem[dsUid()];
const dsMgr = () => { const m = dsMe(); return !!m && (m.r === 'chu' || m.r === 'pho'); };
const dsErr = e => (e && e.code === 'permission-denied') ? 'Chưa cập nhật quy tắc Firestore cho Bang Hội (xem firestore-admin.rules.txt)' : ((e && e.message) || 'Lỗi mạng');
const dsPushNews = (d, x) => { d.news = d.news || []; d.news.unshift({ t: Date.now(), x }); d.news.length = Math.min(d.news.length, 30); };
async function dsTx(fn) {   // đọc → sửa → ghi nguyên tử trên bang hiện tại
  const ref = dsRef(dsG.id);
  return clDb.runTransaction(async tx => { const sn = await tx.get(ref); if (!sn.exists) throw new Error('Bang không còn tồn tại'); const d = sn.data(); d.mem = d.mem || {}; d.apps = d.apps || {}; const r = fn(d); tx.set(ref, d); return r; });
}
function gdNews(text) {   // tin tức bang (boss, quyên góp...) — ghi lên bang chung nếu đang ở trong bang
  try { const s = gdBang(); s.bang.news.unshift({ t: Date.now(), x: text }); s.bang.news.length = Math.min(s.bang.news.length, 30); gdSave(s); } catch (e) {}
  try { if (dsOn() && dsG) dsTx(d => dsPushNews(d, text)).catch(() => {}); } catch (e) {}
}
function dsModal(title, html) { const m = document.getElementById('qs-modal'); m.innerHTML = `<div class="md-box"><button class="md-x" onclick="document.getElementById('qs-modal').style.display='none'">✕</button><div class="hd-name" style="text-align:center;color:#fde047">${title}</div>${html}</div>`; m.style.display = 'flex'; }
const dsClose = () => { document.getElementById('qs-modal').style.display = 'none'; };
const dsTime = t => { const d = new Date(t); return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

// ---- Tải dữ liệu bang của mình (hoặc danh sách bang nếu chưa có bang) ----
async function dsLoad() { await dsLoad0(); dsBadge(); }
async function dsLoad0() {
  dsG = null; dsList = null;
  if (!dsOn()) return;
  const s = gdBang(), uid = dsUid();
  try {
    if (s.bangId) {
      const sn = await dsRef(s.bangId).get();
      if (sn.exists && sn.data().mem && sn.data().mem[uid]) {
        dsG = Object.assign({ id: sn.id }, sn.data()); dsG.apps = dsG.apps || {}; dsG.news = dsG.news || [];
        const me = dsG.mem[uid], lv = accLevel, pw = Math.round(typeof clPower === 'function' ? clPower() : 0);
        if (me.lv !== lv || me.pw !== pw || me.n !== pvName()) { me.lv = lv; me.pw = pw; me.n = pvName(); dsRef(s.bangId).update({ ['mem.' + uid + '.lv']: lv, ['mem.' + uid + '.pw']: pw, ['mem.' + uid + '.n']: me.n }).catch(() => {}); }
        if (s.bangLv !== dsG.lv) { s.bangLv = dsG.lv; gdSave(s); }
        return;
      }
      s.bangId = ''; s.uytin = 0; s.bangLv = 1; gdSave(s); scToast('Bạn không còn trong bang (đã rời hoặc bị mời rời) — Uy Tín về 0');
    }
    if (s.bangApply) {   // đang chờ duyệt: xem đã được nhận / bị từ chối chưa
      const sn = await dsRef(s.bangApply).get();
      if (sn.exists && sn.data().mem && sn.data().mem[uid]) { s.bangId = s.bangApply; s.bangApply = ''; gdSave(s); scToast('Đơn xin vào bang đã được duyệt! 🎉'); return dsLoad(); }
      if (!sn.exists || !(sn.data().apps && sn.data().apps[uid])) { s.bangApply = ''; gdSave(s); scToast('Đơn xin vào bang đã bị từ chối'); }
    }
    dsList = await dsFetchList();
  } catch (e) { scToast(dsErr(e)); }
}
async function dsFetchList() {
  const q = await clDb.collection('guilds').orderBy('lv', 'desc').limit(50).get();
  return q.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => (b.lv - a.lv) || ((b.exp || 0) - (a.exp || 0)));
}

function openDaiSanh() { dsTab = 'bang'; document.getElementById('ds-tabs').innerHTML = ''; document.getElementById('ds-body').innerHTML = '<div class="ch-empty">Đang tải...</div>'; switchScreen('daisanh'); renderDaiSanh(); }
function dsTabSet(t) { dsTab = t; dsDraw(); }
async function renderDaiSanh() { await dsLoad(); dsDraw(); }
function dsNotice() {
  if (!dsMgr()) return scToast('Chỉ Bang Chủ / Phó Bang sửa được công cáo');
  const v = prompt('Công cáo bang (tối đa 80 ký tự):', dsG.notice || ''); if (v === null) return;
  const t = String(v).replace(/[<>&"'`]/g, '').slice(0, 80);
  dsTx(d => { d.notice = t || d.notice; }).then(renderDaiSanh).catch(e => scToast(dsErr(e)));
}

// ---- Chưa có bang: chọn bang ứng tuyển hoặc tạo bang mới ----
function dsDrawNoGuild() {
  const s = gdBang(), cd = dsCdLeft(); document.getElementById('ds-tabs').innerHTML = '';
  if (!dsOn()) { document.getElementById('ds-body').innerHTML = '<div class="ch-empty">Cần đăng nhập tài khoản đám mây (và có mạng) để vào Bang Hội.</div>'; return; }
  const rows = (dsList || []).map(g => { const n = dsMemN(g), mine = s.bangApply === g.id, low = accLevel < (g.minLv || 1), full = n >= DS_MAXMEM;
    return `<div class="bm-row"><div class="bm-ico">🔥</div><div class="bm-info"><b><i class="lvb">${g.lv}</i> ${chEsc(g.name)}</b><small>Nhân số ${n}/${DS_MAXMEM} • Cần cấp ${g.minLv || 1}</small></div>${mine ? `<button class="btn-attack" onclick="dsCancelApply()">Hủy đơn</button>` : `<button class="btn-attack" ${low || full || s.bangApply || cd ? 'disabled' : ''} onclick="dsApply('${g.id}')">${full ? 'Đầy' : low ? 'Thiếu cấp' : 'Ứng tuyển'}</button>`}</div>`; }).join('');
  document.getElementById('ds-body').innerHTML = `<div class="dv-uy">Bạn chưa có bang</div><div style="text-align:center;margin:6px 0 10px"><button class="btn-attack" ${cd ? 'disabled' : ''} onclick="dsCreate()">➕ Tạo Bang Mới (${fmtN(DS_CREATE)} 💰)</button></div>${cd ? `<div class="set-note" style="color:#fca5a5">Bạn vừa rời bang: còn ${dsCdText(cd)} mới được tạo bang hoặc vào bang mới.</div>` : ''}${s.bangApply ? '<div class="set-note">Bạn đang chờ Bang Chủ / Phó Bang duyệt đơn. Có thể hủy đơn để nộp bang khác.</div>' : ''}<div style="padding:0 8px">${rows || '<div class="ch-empty">Chưa có bang nào. Hãy tạo bang đầu tiên!</div>'}</div>`;
}
async function dsApply(id) {
  if (dsBusy) return; const cd = dsCdLeft(); if (cd > 0) return scToast('Vừa rời bang: còn ' + dsCdText(cd) + ' mới được vào bang mới'); dsBusy = true;
  try {
    const ref = dsRef(id), uid = dsUid(), s = gdBang();
    await clDb.runTransaction(async tx => { const sn = await tx.get(ref); if (!sn.exists) throw new Error('Bang không còn tồn tại'); const d = sn.data(); d.mem = d.mem || {}; d.apps = d.apps || {};
      if (d.mem[uid]) throw new Error('Bạn đã ở trong bang này'); if (Object.keys(d.mem).length >= DS_MAXMEM) throw new Error('Bang đã đầy'); if (accLevel < (d.minLv || 1)) throw new Error('Cần cấp ' + (d.minLv || 1) + ' để vào bang này');
      d.apps[uid] = { n: pvName(), lv: accLevel, t: Date.now() }; tx.set(ref, d); });
    s.bangApply = id; gdSave(s); scToast('Đã gửi đơn xin vào bang');
  } catch (e) { scToast(dsErr(e)); }
  dsBusy = false; renderDaiSanh();
}
async function dsCancelApply() {
  const s = gdBang(); if (!s.bangApply) return;
  try { await dsRef(s.bangApply).update({ ['apps.' + dsUid()]: firebase.firestore.FieldValue.delete() }); } catch (e) {}
  s.bangApply = ''; gdSave(s); renderDaiSanh();
}
async function dsCreate() {
  if (dsBusy) return; const s = gdBang(), cd = dsCdLeft(); if (cd > 0) return scToast('Vừa rời bang: còn ' + dsCdText(cd) + ' mới được tạo bang mới');
  if (gold < DS_CREATE) return scToast('Tạo bang cần ' + fmtN(DS_CREATE) + ' Vàng');
  let name = prompt('Tên bang mới (2-16 ký tự):', s.bang.name || ''); if (name === null) return;
  name = String(name).replace(/[<>&"'`]/g, '').trim().slice(0, 16); if (name.length < 2) return scToast('Tên bang quá ngắn');
  dsBusy = true;
  try {
    const dup = await clDb.collection('guilds').where('name', '==', name).limit(1).get(); if (!dup.empty) throw new Error('Tên bang đã có người dùng');
    if (s.bangApply) { try { await dsRef(s.bangApply).update({ ['apps.' + dsUid()]: firebase.firestore.FieldValue.delete() }); } catch (e) {} s.bangApply = ''; }
    const uid = dsUid(), ref = clDb.collection('guilds').doc();
    // bang mới luôn bắt đầu từ cấp 1
    await ref.set({ name, notice: 'Chào mừng đến với bang ' + name + '!', lv: 1, exp: 0, basin: 0, minLv: 1, leader: uid, t: Date.now(),
      mem: { [uid]: { n: pvName(), lv: accLevel, pw: Math.round(typeof clPower === 'function' ? clPower() : 0), r: 'chu', t: Date.now() } }, apps: {}, news: [{ t: Date.now(), x: pvName() + ' lập bang ' + name }] });
    gold -= DS_CREATE; resSave(); s.bangId = ref.id; s.bangLv = 1; gdSave(s); scToast('Đã tạo bang ' + name + ' (-' + fmtN(DS_CREATE) + ' Vàng)');
  } catch (e) { scToast(dsErr(e)); }
  dsBusy = false; renderDaiSanh();
}

// ---- Đã có bang ----
function dsDraw() {
  if (!dsG) return dsDrawNoGuild();
  const s = gdBang(), g = dsG, me = dsMe(), max = gdExpMax(g.lv), mgr = dsMgr(), nApp = Object.keys(g.apps || {}).length;
  document.getElementById('ds-tabs').innerHTML = [['bang', 'Bang Hội'], ['tv', 'Thành Viên'], ['tin', 'Tin Tức']].map(([k, n]) => `<button class="${dsTab === k ? 'on' : ''}" onclick="dsTabSet('${k}')">${n}</button>`).join('');
  let body = '';
  if (dsTab === 'bang') body = `<div class="ds-head"><div class="ds-logo">🔥</div><div class="ds-nm"><b><i class="lvb">${g.lv}</i> ${chEsc(g.name)}</b><div>Nhân Số ${dsMemN(g)}/${DS_MAXMEM} <small>(Cần cấp ${g.minLv || 1})</small></div></div><button class="ds-leave" onclick="dsLeave()">Rời Bang</button></div>
    <div class="ds-body"><div class="ds-paper"><div onclick="dsNotice()" style="cursor:${mgr ? 'pointer' : 'default'}"><span class="k">Công Cáo :</span> ${chEsc(g.notice || '')}${mgr ? '' : ''}</div><div><span class="k">Chức Vụ :</span> ${DS_ROLE[me.r]}</div><div><span class="k">Uy Tín :</span> ${fmtN(s.uytin)}</div><div><span class="k">EXP Bang :</span> ${fmtN(g.exp || 0)}/${fmtN(max)}</div>
      <div><span class="k">Kỹ Năng :</span></div><div class="ds-sk">${GD_SKILLS.slice(0, 6).map((k, i) => { const lock = GD_SKILL_UNLOCK[i] > (s.dvLv || g.lv); return `<i class="${lock ? 'lock' : ''}">${lock ? GD_SKILL_UNLOCK[i] + ' Cấp Mở' : k[1]}</i>`; }).join('')}</div></div>
      <div class="ds-side"><button onclick="dsShop()">Xin Vào${mgr && nApp ? ` <span style="background:#dc2626;border-radius:9px;padding:0 6px;font-size:11px">${nApp}</span>` : ''}</button><button onclick="dsReq()">Yêu Cầu</button><button onclick="dsKick()">Mời Rời Bang</button><button onclick="dsRank()">Xếp Hạng</button></div></div>
    <div class="ds-foot"><button onclick="dsDonate()">🏅 Quyên Góp</button><button onclick="openDienVo()">💪 Cường Thân</button></div>`;
  if (dsTab === 'tv') {
    const ms = Object.keys(g.mem).map(u => Object.assign({ u }, g.mem[u])).sort((a, b) => dsRoleRank(a.r) - dsRoleRank(b.r) || (b.lv - a.lv));
    body = `<div class="dv-uy">Nhân số ${ms.length}/${DS_MAXMEM}</div>` + ms.map(m => `<div class="bm-row"><div class="bm-ico">${m.r === 'chu' ? '👑' : m.r === 'pho' ? '🛡️' : '🧙'}</div><div class="bm-info"><b>${chEsc(m.n)}</b><small>${DS_ROLE[m.r]} • Cấp ${m.lv}</small></div>${me.r === 'chu' && m.u !== dsUid() ? `<button class="btn-attack" onclick="dsPromote('${m.u}')">${m.r === 'pho' ? 'Hạ' : 'Thăng Phó'}</button>` : `<div class="bm-qty">${fmtN(m.pw || 0)}</div>`}</div>`).join('');
  }
  if (dsTab === 'tin') body = `<div class="ds-news">${(g.news || []).length ? g.news.map(n => `<div><small>${dsTime(n.t)}</small> ${chEsc(n.x)}</div>`).join('') : '<div class="ch-empty">Chưa có tin tức.</div>'}</div>`;
  document.getElementById('ds-body').innerHTML = body;
}
function dsPromote(u) {
  if (!dsG || dsMe().r !== 'chu') return;
  dsTx(d => { const m = d.mem[u]; if (!m || m.r === 'chu') return; m.r = m.r === 'pho' ? 'tv' : 'pho'; dsPushNews(d, `${m.n} ${m.r === 'pho' ? 'được thăng Phó Bang' : 'bị hạ xuống Thành Viên'}`); }).then(renderDaiSanh).catch(e => scToast(dsErr(e)));
}
function dsLeave() {
  if (!dsG) return;
  if (!confirm('Rời bang ' + dsG.name + '?' + (dsMe().r === 'chu' ? '\nBạn là Bang Chủ: chức Bang Chủ sẽ chuyển cho Phó Bang / thành viên lâu năm nhất.' : ''))) return;
  const uid = dsUid(), ref = dsRef(dsG.id), s = gdBang();
  clDb.runTransaction(async tx => {
    const sn = await tx.get(ref); if (!sn.exists) return; const d = sn.data(); d.mem = d.mem || {}; const was = d.mem[uid]; delete d.mem[uid];
    const rest = Object.keys(d.mem); if (!rest.length) { tx.delete(ref); return; }
    if (was && was.r === 'chu') { rest.sort((a, b) => dsRoleRank(d.mem[a].r) - dsRoleRank(d.mem[b].r) || (d.mem[a].t - d.mem[b].t)); d.mem[rest[0]].r = 'chu'; d.leader = rest[0]; dsPushNews(d, `${d.mem[rest[0]].n} trở thành Bang Chủ mới`); }
    dsPushNews(d, `${(was && was.n) || pvName()} đã rời bang`); tx.set(ref, d);
  }).then(() => { s.bangId = ''; s.uytin = 0; s.bangLv = 1; s.bangLeaveAt = Date.now(); gdSave(s); scToast('Đã rời bang • Uy Tín về 0 • ' + DS_CD_H + ' giờ nữa mới được tạo / vào bang mới'); renderDaiSanh(); }).catch(e => scToast(dsErr(e)));
}

// ---- Tiệm Bang: danh sách đơn xin vào, Bang Chủ / Phó duyệt ----
function dsShop() {
  if (!dsG) return; const mgr = dsMgr(), ap = Object.keys(dsG.apps || {}).map(u => Object.assign({ u }, dsG.apps[u])).sort((a, b) => a.t - b.t);
  dsModal('📨 Xin Vào', `<div class="set-note">Người chơi xin vào bang • Cần cấp ${dsG.minLv || 1} • ${mgr ? 'Bạn duyệt được đơn.' : 'Chỉ Bang Chủ / Phó Bang được duyệt.'}</div>` + (ap.length ? ap.map(a => `<div class="bm-row"><div class="bm-ico">🧙</div><div class="bm-info"><b>${chEsc(a.n)}</b><small>Cấp ${a.lv} • ${dsTime(a.t)}</small></div>${mgr ? `<button class="btn-attack" onclick="dsDecide('${a.u}',1)">Duyệt</button><button class="btn-attack" style="filter:grayscale(.6)" onclick="dsDecide('${a.u}',0)">Từ chối</button>` : ''}</div>`).join('') : '<div class="ch-empty">Chưa có ai xin vào bang.</div>'));
}
function dsDecide(u, ok) {
  if (!dsMgr()) return;
  dsTx(d => { const a = d.apps[u]; if (!a) return; delete d.apps[u];
    if (!ok) return;
    if (Object.keys(d.mem).length >= DS_MAXMEM) throw new Error('Bang đã đầy');
    d.mem[u] = { n: a.n, lv: a.lv, pw: 0, r: 'tv', t: Date.now() }; dsPushNews(d, `${a.n} gia nhập bang`);
  }).then(async () => { await dsLoad(); dsDraw(); dsShop(); }).catch(e => scToast(dsErr(e)));
}

// ---- Yêu Cầu: cấp tài khoản tối thiểu để vào bang ----
function dsReq() {
  if (!dsG) return; const mgr = dsMgr();
  dsModal('📋 Yêu Cầu Vào Bang', `<div class="dv-uy">Cần cấp tài khoản tối thiểu: <b style="color:#fde047">${dsG.minLv || 1}</b></div>${mgr ? `<div class="gs-act"><div>Đổi yêu cầu cấp</div><input type="number" id="ds-minlv" min="1" step="1" value="${dsG.minLv || 1}" style="width:80px;text-align:center"><button onclick="dsSaveReq()">Lưu</button></div>` : '<div class="set-note">Chỉ Bang Chủ / Phó Bang đổi được yêu cầu.</div>'}`);
}
function dsSaveReq() {
  if (!dsMgr()) return; let v = Math.floor(Number(document.getElementById('ds-minlv').value)); if (!Number.isFinite(v) || v < 1) v = 1;
  dsTx(d => { d.minLv = v; dsPushNews(d, `Yêu cầu vào bang: cấp ${v}`); }).then(() => { scToast('Đã lưu yêu cầu cấp ' + v); dsClose(); renderDaiSanh(); }).catch(e => scToast(dsErr(e)));
}

// ---- Mời Rời Bang: Bang Chủ mời được tất cả, Phó chỉ mời được Thành Viên ----
function dsKick() {
  if (!dsG) return; const me = dsMe(), mgr = dsMgr();
  if (!mgr) return dsModal('🚪 Mời Rời Bang', '<div class="set-note">Chỉ Bang Chủ / Phó Bang được mời thành viên rời bang.</div>');
  const ms = Object.keys(dsG.mem).filter(u => u !== dsUid() && (me.r === 'chu' || dsG.mem[u].r === 'tv')).map(u => Object.assign({ u }, dsG.mem[u]));
  dsModal('🚪 Mời Rời Bang', ms.length ? ms.map(m => `<div class="bm-row"><div class="bm-ico">${m.r === 'pho' ? '🛡️' : '🧙'}</div><div class="bm-info"><b>${chEsc(m.n)}</b><small>${DS_ROLE[m.r]} • Cấp ${m.lv}</small></div><button class="btn-attack" onclick="dsDoKick('${m.u}')">Mời rời</button></div>`).join('') : '<div class="ch-empty">Không có thành viên nào để mời rời.</div>');
}
function dsDoKick(u) {
  const m = dsG && dsG.mem[u]; if (!m || !dsMgr() || !confirm('Mời ' + m.n + ' rời bang?')) return;
  dsTx(d => { const t = d.mem[u]; if (!t) return; if (t.r === 'chu') throw new Error('Không mời được Bang Chủ'); delete d.mem[u]; dsPushNews(d, `${t.n} bị mời rời bang`); }).then(async () => { await dsLoad(); dsDraw(); dsKick(); }).catch(e => scToast(dsErr(e)));
}

// ---- Xếp Hạng bang theo cấp ----
async function dsRank() {
  dsModal('🏆 Xếp Hạng Bang', '<div class="ch-empty">Đang tải...</div>');
  try {
    const l = await dsFetchList(), mine = dsG ? dsG.id : '', pos = l.findIndex(g => g.id === mine);
    dsModal('🏆 Xếp Hạng Bang', (pos >= 0 ? `<div class="dv-uy">Bang bạn: hạng ${pos + 1}/${l.length}</div>` : '') + (l.length ? l.map((g, i) => `<div class="bm-row" style="${g.id === mine ? 'border-color:#4ade80' : ''}"><div class="bm-ico">${i < 3 ? ['🥇', '🥈', '🥉'][i] : '#' + (i + 1)}</div><div class="bm-info"><b>${chEsc(g.name)}</b><small>Nhân số ${dsMemN(g)}/${DS_MAXMEM} • Cần cấp ${g.minLv || 1}</small></div><div class="bm-qty">Cấp ${g.lv}</div></div>`).join('') : '<div class="ch-empty">Chưa có bang nào.</div>'));
  } catch (e) { dsModal('🏆 Xếp Hạng Bang', `<div class="ch-empty">${chEsc(dsErr(e))}</div>`); }
}
// [nhãn, tài nguyên đang có, số lượng / 1 lần góp, trừ tài nguyên(n), Uy Tín / lần, EXP Bang / lần]
const DS_DONATE = [[IC_SILVER + ' bạc', () => silver, 100000, n => { silver -= n; }, 40, 10000], [IC_RICE + ' gạo', () => rice, 100000, n => { rice -= n; }, 40, 10000], ['💰 vàng', () => gold, 100, n => { gold -= n; }, 150, 50000]];
const DS_DEF = DS_DONATE.map(d => [d[2], d[4], d[5]]);
cfgOnApply(() => DS_DONATE.forEach((d, i) => { const g = k => cfgNum('guild2.donate.' + i + '.' + k, null); const n = Math.floor(cfgNum('guild2.donate.' + i + '.n', DS_DEF[i][0])), uy = cfgNum('guild2.donate.' + i + '.uy', DS_DEF[i][1]), ex = cfgNum('guild2.donate.' + i + '.exp', DS_DEF[i][2]); d[2] = Math.max(1, n); d[4] = Math.max(0, uy); d[5] = Math.max(0, ex); }));   // admin chỉnh: guild2.donate.<0 bạc|1 gạo|2 vàng>.{n,uy,exp}
let dsQty = [1, 1, 1];   // số lần góp người chơi đã nhập cho từng dòng (1 lần = DS_DONATE[i][2] tài nguyên)
const dsMax = i => Math.floor(DS_DONATE[i][1]() / DS_DONATE[i][2]);
function dsQtyGet(i) { const el = document.getElementById('ds-q' + i); let q = Math.floor(Number(el ? el.value : dsQty[i])); if (!Number.isFinite(q) || q < 1) q = 1; return q; }
function dsQtyRefresh(i) {   // cập nhật số tiền & phần thưởng khi gõ số lượng
  const d = DS_DONATE[i], q = dsQtyGet(i); dsQty[i] = q;
  const t = document.getElementById('ds-t' + i); if (t) t.innerHTML = `${fmtN(d[2] * q)} ${d[0]}`;
  const r = document.getElementById('ds-r' + i); if (r) r.textContent = `+${fmtN(d[4] * q)} Uy Tín • +${fmtN(d[5] * q)} EXP Bang`;
}
function dsQtyMax(i) { const el = document.getElementById('ds-q' + i); el.value = Math.max(1, dsMax(i)); dsQtyRefresh(i); }
function dsDonate() {
  if (!dsG) return scToast('Hãy vào bang trước khi quyên góp');
  const m = document.getElementById('qs-modal');
  m.innerHTML = `<div class="md-box"><button class="md-x" onclick="document.getElementById('qs-modal').style.display='none'">✕</button><div class="hd-name" style="text-align:center;color:#fde047">Quyên Góp</div>${DS_DONATE.map((d, i) => `<div class="bm-row" style="flex-wrap:wrap"><div class="bm-info"><b id="ds-t${i}">${fmtN(d[2] * dsQty[i])} ${d[0]}</b><small id="ds-r${i}">+${fmtN(d[4] * dsQty[i])} Uy Tín • +${fmtN(d[5] * dsQty[i])} EXP Bang</small><small>Có: ${fmtN(d[1]())} • góp tối đa ${fmtN(dsMax(i))} lần (mỗi lần ${fmtN(d[2])})</small></div><div class="ds-qbox"><input type="number" class="ds-q" id="ds-q${i}" min="1" step="1" inputmode="numeric" value="${dsQty[i]}" oninput="dsQtyRefresh(${i})" aria-label="Số lần góp"><button class="ds-qmax" onclick="dsQtyMax(${i})">Tối đa</button><button class="btn-attack" onclick="dsGive(${i})">Góp</button></div></div>`).join('')}</div>`; m.style.display = 'flex';
}
async function dsGive(i) {
  if (!dsG) return scToast('Hãy vào bang trước khi quyên góp');
  const d = DS_DONATE[i], q = dsQtyGet(i), cost = d[2] * q; if (d[1]() < cost) return scToast('Không đủ tài nguyên');
  const uy = d[4] * q, ex = d[5] * q, nm = d[0].replace(/<[^>]+>/g, "").replace(/^\S+\s/, "");
  try {
    const lv = await dsTx(g => { g.exp = (g.exp || 0) + ex; while (g.exp >= gdExpMax(g.lv)) { g.exp -= gdExpMax(g.lv); g.lv++; dsPushNews(g, 'Bang lên cấp ' + g.lv + '!'); } dsPushNews(g, `${pvName()} quyên góp ${fmtN(cost)} ${nm}`); return g.lv; });
    d[3](cost); resSave(); const s = gdBang(); s.uytin = s.uytin + uy; s.bangLv = lv; gdSave(s); scToast(`+${uy} Uy Tín`);
  } catch (e) { return scToast(dsErr(e)); }
  await dsLoad(); dsDonate(); dsDraw();
}
/* ---- Tụ Bảo Bồn ---- */
const BASIN_REW_DEF = [['Thú Hồn', '🟠', 20], ['Thú Linh', '🔥', 5], ['Dị Linh', '🎭', 1], ['Đá Nữ Oa', '🔻', 20]];
const BASIN_DEF = { full: 1000, silverCost: 100000, silverAdd: 50, goldCost: 50, goldAdd: 300 };
const BASIN = Object.assign({}, BASIN_DEF), BASIN_FULL_DEF = [{ t: 'item', name: 'Thú Linh', ico: '🔥', n: 50 }, { t: 'gold', n: 100 }];
let BASIN_REW = BASIN_REW_DEF, BASIN_FULL = BASIN_FULL_DEF;
cfgOnApply(() => {   // admin chỉnh: guild2.basin.{full,silverCost,silverAdd,goldCost,goldAdd,rewards:[{name,ico,n}],fullGifts:[quà]}
  Object.keys(BASIN_DEF).forEach(k => { BASIN[k] = Math.max(1, Math.floor(cfgNum('guild2.basin.' + k, BASIN_DEF[k]))); });
  const r = cfgGet('guild2.basin.rewards', null); BASIN_REW = Array.isArray(r) && r.filter(x => x && x.name && Number(x.n) > 0).length ? r.filter(x => x && x.name && Number(x.n) > 0).map(x => [String(x.name), x.ico || '🎁', Math.floor(Number(x.n))]) : BASIN_REW_DEF;
  const f = cfgGet('guild2.basin.fullGifts', null); BASIN_FULL = Array.isArray(f) && rwList(f).length ? rwList(f) : BASIN_FULL_DEF;
});
function openBasin() { renderBasin(); document.getElementById('qs-modal').style.display = 'flex'; }
function renderBasin() {
  const v = (dsG && dsG.basin) || 0, m = document.getElementById('qs-modal');
  m.innerHTML = `<div class="md-box"><button class="md-x" onclick="document.getElementById('qs-modal').style.display='none'">✕</button><div class="hd-name" style="text-align:center;color:#fde047">💰 Tụ Bảo Bồn</div><div class="gd-img bz-pic" style="--a:1.475;width:72%;margin:6px auto"><img src="giao-dien/bang-hoi/tu-bao-bon.webp?v=28" alt="Tụ Bảo Bồn"></div><div class="set-note">Góp bảo vật vào bồn: mỗi lần góp nhận ngay 1 phần thưởng ngẫu nhiên, đầy bồn nhận thêm quà lớn.</div>
  <div class="qs-bar" style="position:relative;left:0;right:0;top:0;margin:10px 0"><i style="width:${Math.min(100, v / BASIN.full * 100)}%"></i></div><div class="dv-uy">${v}/${fmtN(BASIN.full)}</div>
  <div class="gs-act"><div>${IC_SILVER} ${fmtN(BASIN.silverCost)} bạc → +${fmtN(BASIN.silverAdd)} bồn</div><button onclick="basinPut(0)">Góp</button></div><div class="gs-act"><div>💰 ${fmtN(BASIN.goldCost)} vàng → +${fmtN(BASIN.goldAdd)} bồn</div><button onclick="basinPut(1)">Góp</button></div></div>`;
}
async function basinPut(k) {   // bồn là của BANG (chung); phần thưởng nhận về kho của người chơi
  const cost = k ? BASIN.goldCost : BASIN.silverCost, add = k ? BASIN.goldAdd : BASIN.silverAdd; if ((k ? gold : silver) < cost) return scToast('Không đủ tài nguyên');
  if (!dsG) return scToast('Hãy vào bang trước');
  let full = false;
  try { await dsTx(g => { g.basin = (g.basin || 0) + add; if (g.basin >= BASIN.full) { g.basin -= BASIN.full; full = true; dsPushNews(g, pvName() + ' làm đầy Tụ Bảo Bồn'); } }); } catch (e) { return scToast(dsErr(e)); }
  if (k) gold -= cost; else silver -= cost; resSave();
  const s = gdBang(), r = BASIN_REW[Math.floor(Math.random() * BASIN_REW.length)]; (s.kho[r[0]] = s.kho[r[0]] || { ico: r[1], qty: 0 }).qty += r[2]; let msg = `Nhận ${r[2]} ${r[0]}`;
  gdSave(s); if (full) msg += ' • BỒN ĐẦY: ' + rwGrantAll(BASIN_FULL); await dsLoad(); renderBasin(); scToast(msg);
}
(function () { const sc = document.createElement('div'); sc.className = 'screen'; sc.id = 'screen-daisanh'; sc.innerHTML = `<div class="pve-header"><button class="btn-back" onclick="openGuild()">Trở về</button><h2 class="pve-title">Đại Sảnh</h2></div><div class="gs-tabs" id="ds-tabs"></div><div id="ds-body"></div>`; document.querySelector('.main-content').appendChild(sc); })();

/* ---- Địa điểm của BANG (Cấm Địa, Bang Chiến, Tụ Bảo Các) bắt buộc phải ở trong bang. Thần Thú & Lò Luyện Hỏa là của người chơi, không cần bang. Phần thưởng nhận được vẫn về tài khoản người chơi. ---- */
async function dsGate() {
  if (!gdBang().bangId) { scToast('Hãy vào bang trước (Đại Sảnh → tạo bang hoặc ứng tuyển)'); return false; }
  if (!dsOn()) { scToast('Cần đăng nhập đám mây (và có mạng) để dùng tính năng của bang'); return false; }
  await dsLoad();
  if (!dsG) { scToast('Hãy vào bang trước (Đại Sảnh → tạo bang hoặc ứng tuyển)'); return false; }
  return true;
}
['openBangBoss', 'openBasin', 'gdGo'].forEach(n => { const f = window[n]; if (typeof f !== 'function') return; window[n] = async function () { const a = arguments; if (await dsGate()) return f.apply(this, a); }; });
setTimeout(() => { try { const s = gdBang(), e = document.querySelector('.server-badge'); if (e) { e.textContent = s.bangId ? (s.bangName || '') : ''; e.style.display = e.textContent ? '' : 'none'; } if (dsOn()) dsLoad(); } catch (x) {} }, 3500);   // thanh trên: hiện tên bang (trống nếu chưa vào bang)

;
/* === js/social/quests.js === */
/* NHIỆM VỤ (Tích Cực hằng ngày) + SỰ KIỆN
   Đếm tiến độ bằng cách bọc các hàm có sẵn (không sửa logic cũ). */
/* Admin chỉnh ở admin.html → tab "🎯 Nhiệm Vụ" / "🎪 Sự Kiện" (game_config/main):
     quest.tasks  = { "<id nhiệm vụ>": { name, n (mục tiêu), pts (điểm Tích Cực), off (1 = ẩn nhiệm vụ) } }
     quest.chests = [ { pts: mốc điểm, gifts: [quà...] } ]   (có thì thay hoàn toàn rương mặc định)
     event.list   = [ { id, name, ico, kind: 'daily' | 'once' | 'soon', gifts: [quà...], from, to, off } ]   (có thì thay hoàn toàn danh sách mặc định)
   Quà dùng chung định dạng Gift Code (xem remote-config.js). */
const QS_TASKS_DEF = [   // [id, tên, mục tiêu, điểm, nhãn]
  ['gh', 'Vượt 10 phó bản Giang Hồ', 10, 10], ['rec', 'Chiêu mộ võ hiệp 1 lần', 1, 10], ['rec2', 'Chiêu Mộ Cao Cấp 1 lần', 1, 15], ['eq', 'Cường hóa trang bị 2 lần', 2, 10],
  ['pvp', 'Tỷ võ 3 lần', 3, 15], ['dtl', 'Vượt ải Danh Tướng Lầu 1 lần', 1, 10, 1], ['bd', 'Bồi dưỡng 10 lần', 10, 10], ['bd2', 'Bồi dưỡng cao cấp 1 lần', 1, 10], ['lk', 'Tham gia Luận Kiếm 1 lần', 1, 10, 1]];
const QS_CHESTS_DEF = [[25, [{ t: 'item', name: 'Vải Xanh', ico: '🧵', n: 2 }, { t: 'item', name: 'Túi Xanh', ico: '👝', n: 2 }, { t: 'item', name: 'Thú Hồn', ico: '🟠', n: 100 }]],
  [50, [{ t: 'item', name: 'Vải Xanh', ico: '🧵', n: 2 }, { t: 'item', name: 'Túi Xanh', ico: '👝', n: 2 }, { t: 'item', name: 'Ngọc Tím', ico: '🟣', n: 5 }]],
  [75, [{ t: 'gold', n: 200 }, { t: 'item', name: 'Vải Xanh', ico: '🧵', n: 2 }, { t: 'item', name: 'Túi Lam', ico: '👜', n: 1 }]],
  [100, [{ t: 'gold', n: 1000 }, { t: 'item', name: 'Vải Xanh', ico: '🧵', n: 2 }, { t: 'item', name: 'Túi Lam', ico: '👜', n: 1 }]]];
/* Nhiệm vụ tự thêm (quest.custom = [{ id, name, n, pts, trigger }]): trigger là hành động trong game sẽ được tính (xem QS_TRIGGERS) */
const QS_TRIGGERS = ['pve', 'pvp', 'rec', 'eq', 'bd', 'boss', 'tt', 'mail', 'donate', 'basin', 'skill', 'login'];
function qsTrig(tr, n) { try { QS_TASKS.filter(t => t[5] === tr).forEach(t => qsAdd(t[0], n || 1)); } catch (e) {} }
let QS_TASKS = QS_TASKS_DEF, QS_CHESTS = QS_CHESTS_DEF, QS_MAX = 100;
cfgOnApply(() => {
  const ov = cfgGet('quest.tasks', {}) || {};
  QS_TASKS = QS_TASKS_DEF.map(t => {
    const o = ov[t[0]]; if (!o) return t; if (Number(o.off) === 1) return null;
    const n = Math.floor(Number(o.n)), pts = Number(o.pts);
    return [t[0], o.name || t[1], n >= 1 ? n : t[2], isFinite(pts) && pts >= 0 ? pts : t[3], t[4]];
  }).filter(Boolean);
  const cu = cfgGet('quest.custom', []); (Array.isArray(cu) ? cu : []).forEach(x => {
    if (!x || !x.id || !x.name || !QS_TRIGGERS.includes(x.trigger) || Number(x.off) === 1) return;
    QS_TASKS.push(['c_' + String(x.id).replace(/[^A-Za-z0-9_]/g, ''), String(x.name), Math.max(1, Math.floor(Number(x.n)) || 1), Math.max(0, Number(x.pts) || 0), undefined, x.trigger]);
  });
  const c = cfgGet('quest.chests', null);
  QS_CHESTS = Array.isArray(c) && c.length ? c.filter(x => x && Number(x.pts) > 0).map(x => [Math.floor(Number(x.pts)), rwList(x.gifts)]).sort((a, b) => a[0] - b[0]) : QS_CHESTS_DEF;
  if (!QS_CHESTS.length) QS_CHESTS = QS_CHESTS_DEF;
  QS_MAX = Math.max(1, ...QS_CHESTS.map(x => x[0]));
});
function qsSt() {
  const s = loadJSON('quest_state'), dk = new Date().toDateString();
  if (s.day !== dk) { s.day = dk; s.p = {}; s.claimed = {}; s.free = 0; s.ev = {}; saveJSON('quest_state', s); }
  s.p = s.p || {}; s.claimed = s.claimed || {}; s.ev = s.ev || {}; s.evOnce = s.evOnce || {}; return s;
}
const qsPts = s => QS_TASKS.reduce((a, t) => a + ((s.p[t[0]] || 0) >= t[2] ? t[3] : 0), 0);
function qsAdd(id, n) { try { const s = qsSt(), t = QS_TASKS.find(x => x[0] === id); s.p[id] = Math.min(t[2], (s.p[id] || 0) + (n || 1)); saveJSON('quest_state', s); } catch (e) {} }
function qsKho(name, ico, qty) { if (name === '@gold') { gold += qty; resSave(); return; } const k = gdSt(); const s = gdSt(); (s.kho[name] = s.kho[name] || { ico, qty: 0 }).qty += qty; gdSave(s); }
function openQuest() { renderQuest(); switchScreen('quest'); }
function renderQuest() {
  const s = qsSt(), pts = qsPts(s);
  document.getElementById('qs-chests').innerHTML = `<div class="qs-bar"><i style="width:${Math.min(100, pts / QS_MAX * 100)}%"></i></div>` + QS_CHESTS.map(([th]) => { const st = s.claimed[th] ? 'done' : pts >= th ? 'ready' : '';
    return `<div class="qs-ch ${st}" style="left:${th / QS_MAX * 100 * .86 + 3}%" onclick="qsChest(${th})"><span>🎁</span><small>${th}Điểm</small></div>`; }).join('');
  document.getElementById('qs-list').innerHTML = `<div class="dv-uy">Điểm Tích Cực: ${pts}/${QS_MAX}</div>` + QS_TASKS.map(t => { const v = s.p[t[0]] || 0, ok = v >= t[2];
    return `<div class="qs-row ${ok ? 'ok' : ''}" onclick="qsGo('${t[0]}')"><div><b>${t[1]}</b><div>${v}/${t[2]}lần</div></div><div class="qs-pt">🎯 +${t[3]}<small>${ok ? 'Đã xong' : 'Tích Cực'}</small></div></div>`; }).join('');
}
/* Bấm vào thanh nhiệm vụ -> chuyển tới đúng màn để làm */
const QS_GO = {
  gh: () => { window.pveFrom = 'home'; switchScreen('pve'); }, rec: () => openRecruit(), rec2: () => openRecruit(), eq: () => openEquip(),
  pvp: () => openPvp(), dtl: () => openTower(), bd: () => vhGo('boiduong'), bd2: () => vhGo('boiduong'), lk: () => openLuanKiem()
};
const QS_GO_TRIG = {
  pve: () => { window.pveFrom = 'home'; switchScreen('pve'); }, pvp: () => openPvp(), rec: () => openRecruit(), eq: () => openEquip(), bd: () => vhGo('boiduong'),
  boss: () => openBangBoss(), tt: () => openThanThu(), mail: () => openMail(), donate: () => openGuild(), basin: () => openBasin(), skill: () => openPicker('kynang')
};
function qsGo(id) {
  const t = QS_TASKS.find(x => x[0] === id); if (!t) return;
  const f = QS_GO[id] || (t[5] && QS_GO_TRIG[t[5]]);
  if (!f) return scToast('Nhiệm vụ này tự động tính, không cần chuyển trang');
  try { f(); } catch (e) { scToast('Chưa mở được màn này'); }
}
function qsManual(id) { if (confirm('Chế độ này chưa mở trong game. Tạm tính hoàn thành nhiệm vụ?')) { qsAdd(id, 99); renderQuest(); } }
function qsChest(th) {
  const s = qsSt(), c = QS_CHESTS.find(x => x[0] === th); if (!c) return; if (s.claimed[th]) return scToast('Đã nhận rồi');
  const m = document.getElementById('qs-modal'), ok = qsPts(s) >= th;
  m.innerHTML = `<div class="md-box"><div class="hd-name" style="text-align:center;color:#fde047">Quà Tích Cực (${th} điểm)</div><div class="qs-gifts">${c[1].map(g => { const i = rwInfo(g); return `<div>${i.ico}<em>${fmtN(i.n)}</em><small>${i.name}</small></div>`; }).join('')}</div>
    <div class="gs-act"><button style="margin:auto" ${ok ? '' : 'disabled'} onclick="qsClaim(${th})">${ok ? 'Nhận' : 'Chưa đủ điểm'}</button></div></div>`; m.style.display = 'flex';
}
function qsClaim(th) {
  const s = qsSt(), c = QS_CHESTS.find(x => x[0] === th); if (!c || s.claimed[th] || qsPts(s) < th) return;
  rwGrantAll(c[1]); const s2 = qsSt(); s2.claimed[th] = 1; saveJSON('quest_state', s2);
  document.getElementById('qs-modal').style.display = 'none'; renderQuest(); scToast('Đã nhận quà, xem trong Túi Đồ');
  if (typeof clPush === 'function') { try { clPush(); } catch (e) {} }
}
/* ---- Sự Kiện (đã bỏ toàn bộ mục nạp / tiêu phí) ---- */
const QS_EVENTS_DEF = [{ id: 'free', name: 'Quà Free', ico: '🎁', kind: 'login', rows: [{ gifts: [] }, { gifts: [] }, { gifts: [] }, { gifts: [] }, { gifts: [] }, { gifts: [] }, { gifts: [] }] }, { id: 'e2', name: 'Đổi', ico: '🔁', kind: 'soon' }, { id: 'e3', name: 'Đập Rượu', ico: '🏺', kind: 'soon' },
  { id: 'e4', name: 'Rút Thẻ', ico: '🎴', kind: 'soon' }, { id: 'e5', name: 'Quà Online', ico: '🎀', kind: 'soon' }, { id: 'e6', name: 'Dã Tẩu', ico: '📜', kind: 'soon' }, { id: 'e7', name: 'Tụ Linh Đàn', ico: '🏅', kind: 'soon' },
  { id: 'e8', name: 'Kỳ Cuộc', ico: '🪷', kind: 'soon' }, { id: 'e9', name: 'Thiên Cơ', ico: '🔮', kind: 'soon' }];
function evList() {
  const L = cfgGet('event.list', null), src = (Array.isArray(L) && L.length) ? L : QS_EVENTS_DEF;
  return src.filter(e => e && e.id && e.name && Number(e.off) !== 1);
}
const evClaimed = (s, e) => e.kind === 'once' ? !!s.evOnce[e.id] : !!(s.ev[e.id] || (e.id === 'free' && s.free));
function evWindow(e) { const n = Date.now(); return e.from && n < e.from ? 'wait' : (e.to && n > e.to ? 'end' : 'ok'); }
/* Loại 'login' (Quà Free): bảng TÍCH LŨY NGÀY ĐĂNG NHẬP, mỗi mốc có 5 ô quà (admin bỏ quà vào ô nào thì hiện ô đó, không bỏ thì ô trống).
   Cấu hình: e.rows = [ { gifts: [quà...] }, ... ] — mốc thứ i cần i ngày đăng nhập, mỗi mốc nhận 1 lần; chỉ 5 quà đầu hiện vào 5 ô. Đổi 'Bắt đầu' (from) của sự kiện = chạy lại từ đầu.
   Quà Free (id 'free') luôn dùng loại này (trừ khi admin để 'sắp ra mắt'). */
const EV_SLOTS = 5;
const evKind = e => (e.id === 'free' && e.kind !== 'soon') ? 'login' : e.kind;
const evRows = e => { const R = Array.isArray(e.rows) && e.rows.length ? e.rows : [{}, {}, {}, {}, {}, {}, {}]; return R.map(r => rwList((r || {}).gifts).slice(0, EV_SLOTS)); };
function evLoginSt(e) {   // đếm số ngày đăng nhập (mỗi ngày +1 khi trong thời gian sự kiện)
  const all = loadJSON('ev_login') || {}, sk = String(e.from || 0);
  let o = all[e.id]; if (!o || o.sk !== sk) o = { sk, days: 0, last: '', claimed: {} };
  const today = new Date().toDateString();
  if (o.last !== today && evWindow(e) === 'ok') { o.last = today; o.days++; }
  o.claimed = o.claimed || {}; all[e.id] = o; saveJSON('ev_login', all); return o;
}
const evLoginReady = e => { const o = evLoginSt(e); return evRows(e).some((g, i) => g.length && o.days >= i + 1 && !o.claimed[i]); };
const evReady = (s, e) => { if (evWindow(e) !== 'ok') return false; const k = evKind(e); if (k === 'login') return evLoginReady(e); return (k === 'daily' || k === 'once') && rwList(e.gifts).length && !evClaimed(s, e); };
const evRange = e => { const f = t => { const d = new Date(t); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); }; return e.from && e.to ? f(e.from) + ' - ' + f(e.to) : e.from ? 'Từ ' + f(e.from) : e.to ? 'Đến ' + f(e.to) : ''; };
function openEvLogin(e) {
  const o = evLoginSt(e), rows = evRows(e), m = document.getElementById('qs-modal'), esc = x => String(x).replace(/[<>&"]/g, '');
  if (!document.getElementById('ev-login-css')) { const st = document.createElement('style'); st.id = 'ev-login-css'; st.textContent = '.evl-box{max-width:460px;width:94%}.evl-list{max-height:70vh;overflow-y:auto;padding:2px 2px 6px}.evl-row{background:rgba(0,0,0,.35);border:2px solid #8b6b2e;border-radius:10px;padding:6px 8px;margin:8px 0}.evl-t{font-weight:900;color:#fde68a;font-size:13px;margin-bottom:5px}.evl-t b.ok{color:#4ade80}.evl-t b.no{color:#f87171}.evl-line{display:flex;gap:5px;align-items:stretch}.evl-slot{flex:1 1 0;min-width:0;aspect-ratio:1/1;background:rgba(0,0,0,.45);border:1px solid #6b5a3a;border-radius:7px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;color:#fff;font-weight:800;overflow:hidden}.evl-slot.empty{opacity:.55}.evl-slot .ic{font-size:22px;line-height:1.1}.evl-slot .ic img{height:26px;width:auto}.evl-slot .ic .hero-img{width:28px;height:28px}.evl-slot .ic .eq-img{height:28px;width:auto;max-width:100%}.evl-slot small{font-size:8px;font-weight:600;opacity:.85;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.evl-btn{flex:0 0 74px;border:2px solid #14532d;border-radius:9px;background:linear-gradient(#16a34a,#14532d);color:#fff;font-weight:900;font-size:13px;cursor:pointer}.evl-btn:disabled{background:#1f2937;border-color:#374151;color:#9ca3af;cursor:default}'; document.head.appendChild(st); }
  const slot = r => { if (!r) return '<div class="evl-slot empty"></div>'; const i = rwInfo(r); return `<div class="evl-slot" title="${esc(i.name)}"><span>x${fmtN(i.n)}</span><span class="ic">${i.ico}</span><small>${esc(i.name)}</small></div>`; };
  const list = rows.map((g, i) => {
    const need = i + 1, can = o.days >= need, done = !!o.claimed[i];
    const btn = done ? '<button class="evl-btn" disabled>Đã nhận</button>' : (!g.length ? '<button class="evl-btn" disabled>Chưa có quà</button>' : (can ? `<button class="evl-btn" onclick="evLoginClaim('${esc(e.id)}',${i})">Nhận</button>` : '<button class="evl-btn" disabled>Nhận</button>'));
    return `<div class="evl-row"><div class="evl-t">Tích lũy ${need} ngày nhận : <b class="${can ? 'ok' : 'no'}">${Math.min(o.days, need)}</b> / ${need}</div><div class="evl-line">${Array.from({ length: EV_SLOTS }, (_, k) => slot(g[k])).join('')}${btn}</div></div>`;
  }).join('');
  m.innerHTML = `<div class="md-box evl-box"><button class="md-x" onclick="document.getElementById('qs-modal').style.display='none'">✕</button><div class="hd-name" style="text-align:center;color:#fde047">${esc(e.name)}</div><div style="text-align:center;color:#a7f3d0;font-weight:800;margin:2px 0 4px">Đăng nhập nhận quà${evRange(e) ? ' • ' + evRange(e) : ''} • Đã đăng nhập ${o.days} ngày</div><div class="evl-list">${list}</div></div>`;
  m.style.display = 'flex';
}
function evLoginClaim(id, i) {
  const e = evList().find(x => String(x.id).replace(/'/g, '') === id); if (!e || evWindow(e) !== 'ok') return;
  const o = evLoginSt(e), g = evRows(e)[i]; if (!g || !g.length || o.days < i + 1 || o.claimed[i]) return;
  o.claimed[i] = 1; const all = loadJSON('ev_login') || {}; all[e.id] = o; saveJSON('ev_login', all);
  const got = rwGrantAll(g); openEvLogin(e); evBadgeUpdate(); scToast('Nhận: ' + got);
  if (typeof clPush === 'function') { try { clPush(); } catch (er) {} }
}
function openEvents() {
  const s = qsSt(), m = document.getElementById('qs-modal'), L = evList().filter(e => evWindow(e) !== 'end' || e.kind === 'soon');
  m.innerHTML = `<div class="md-box"><button class="md-x" onclick="document.getElementById('qs-modal').style.display='none'">✕</button><div class="hd-name" style="text-align:center;color:#fde047">Sự kiện</div><div class="qs-ev">${L.map(e => `<div onclick="evGo('${String(e.id).replace(/'/g, '')}')"><i>${e.ico || '🎁'}${evReady(s, e) ? '<b>1</b>' : ''}</i>${String(e.name).replace(/[<>&]/g, '')}</div>`).join('')}</div></div>`; m.style.display = 'flex';
}
/* Chấm đỏ ở nút Sự Kiện (trang chủ): số sự kiện đang có quà chưa nhận */
function evBadgeUpdate() {
  try { const s = qsSt(), n = evList().filter(e => evReady(s, e)).length, b = document.getElementById('nb-sukien'); if (!b) return; b.innerText = n; b.style.display = n ? '' : 'none'; } catch (er) {}
}
function evGo(id) {
  const e = evList().find(x => String(x.id).replace(/'/g, '') === id); if (!e) return;
  const ek = evKind(e);
  if (ek !== 'daily' && ek !== 'once' && ek !== 'login') return scToast(e.name + ' — sắp ra mắt');
  const w = evWindow(e); if (w === 'wait') return scToast(e.name + ' — chưa mở (bắt đầu ' + new Date(e.from).toLocaleString('vi-VN') + ')'); if (w === 'end') return scToast(e.name + ' — đã kết thúc');
  if (ek === 'login') return openEvLogin(e);
  const s = qsSt(); if (evClaimed(s, e)) return scToast(e.kind === 'once' ? 'Bạn đã nhận ' + e.name + ' rồi' : 'Hôm nay đã nhận ' + e.name);
  if (!rwList(e.gifts).length) return scToast(e.name + ' — chưa có quà');
  if (e.kind === 'once') s.evOnce[e.id] = 1; else { s.ev[e.id] = 1; if (e.id === 'free') s.free = 1; }
  saveJSON('quest_state', s);
  const got = rwGrantAll(e.gifts); openEvents(); evBadgeUpdate(); scToast('Nhận: ' + got);
  if (typeof clPush === 'function') { try { clPush(); } catch (er) {} }
}
/* ---- bọc hàm có sẵn để đếm tiến độ ---- */
(function () {
  const wrap = (name, fn) => { const o = window[name]; if (typeof o !== 'function') return; window[name] = function () { return fn(o, arguments); }; };
  wrap('grantBanReward', (o, a) => { qsAdd('gh'); qsTrig('pve'); return o.apply(null, a); });
  wrap('pvpFinish', (o, a) => { qsAdd('pvp'); qsTrig('pvp'); return o.apply(null, a); });
  wrap('eqUpgrade', (o, a) => { const it = eqBag.find(i => i.id === a[0]), b = it ? it.lv : 0; const r = o.apply(null, a); if (it && it.lv > b) { qsAdd('eq'); qsTrig('eq'); } return r; });
  wrap('doRecruit', (o, a) => { const tot = () => Object.values(heroShards).reduce((x, y) => x + y, 0), b = tot(); const r = o.apply(null, a); if (tot() > b) { qsAdd('rec'); qsTrig('rec'); if (a[0] !== 'lam') qsAdd('rec2'); } return r; });
  /* 'Bồi dưỡng' / 'Bồi dưỡng cao cấp' được tính trong dotpha.js (dpTrain), không tính theo Thăng Cấp tướng nữa */
})();
/* thêm các hành động mới cho nhiệm vụ tự tạo */
(function () {
  const wrap = (name, tr) => { const o = window[name]; if (typeof o !== 'function') return; window[name] = function () { const r = o.apply(this, arguments); qsTrig(tr); return r; }; };
  wrap('bbFight', 'boss'); wrap('ttFeed', 'tt'); wrap('mailClaim', 'mail'); wrap('mailClaimAll', 'mail'); wrap('mailClaimLetter', 'mail'); wrap('dsGive', 'donate'); wrap('basinPut', 'basin'); wrap('dvLearn', 'skill');
  document.addEventListener('DOMContentLoaded', () => qsTrig('login'));
})();
(function () { const d = document.createElement('div'); d.id = 'qs-modal'; d.className = 'md-wrap'; d.onclick = e => { if (e.target === d) d.style.display = 'none'; }; document.body.appendChild(d);
  const sc = document.createElement('div'); sc.className = 'screen'; sc.id = 'screen-quest'; sc.innerHTML = `<div class="pve-header"><button class="btn-back" onclick="switchScreen('home')">Trở về</button><h2 class="pve-title">Nhiệm Vụ</h2></div><div class="qs-chests" id="qs-chests"></div><div id="qs-list"></div>`; document.querySelector('.main-content').appendChild(sc); })();
/* cập nhật chấm đỏ Sự Kiện: lúc mở game, khi cấu hình admin áp dụng, và định kỳ (qua ngày mới / tới giờ mở sự kiện) */
cfgOnApply(evBadgeUpdate); document.addEventListener('DOMContentLoaded', evBadgeUpdate); setTimeout(evBadgeUpdate, 1500); setInterval(evBadgeUpdate, 30000);

;
/* === js/heroes/skill-text.js === */
/* MÔ TẢ CHIÊU DO ADMIN CHỈNH (rút gọn chữ, cấu trúc chiêu vẫn nằm trong code)
   - Admin: mục "📖 Mô tả chiêu" -> lưu cfg.skillText.<idTướng>.<thứ tự thẻ chiêu> = chữ.
   - Ô để trống = giữ nguyên mô tả gốc do code tạo (heroSkills).
   - Chỉ thay trường `desc`; tên chiêu, thẻ, cấp chiêu và số liệu trận đấu KHÔNG đổi.
   - Nạp SAU hero-detail.js và SAU file định nghĩa heroSkills (đặt ngay trước js/core/boot.js). Không sửa file cũ. */
(function () {
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var html = function (t) { return esc(t.trim()).replace(/\r?\n/g, '<br>'); };
  function override(id) {            // { "0": "chữ", ... } hoặc null
    try { var o = cfgGet('skillText.' + id, null); return (o && typeof o === 'object') ? o : null; } catch (e) { return null; }
  }
  var wrapped = false;
  try {                               // Cách 1: bọc heroSkills -> mọi màn dùng mô tả chiêu đều nhận chữ mới
    var orig = heroSkills;
    heroSkills = function (id) {
      var list = orig.apply(this, arguments), ov = override(id);
      if (!ov || !Array.isArray(list)) return list;
      return list.map(function (k, i) { var t = ov[i]; return (typeof t === 'string' && t.trim()) ? Object.assign({}, k, { desc: html(t) }) : k; });
    };
    wrapped = true;
  } catch (e) { /* heroSkills khai báo kiểu const hoặc chưa nạp -> dùng cách 2 */ }
  if (wrapped || typeof openHeroDetail !== 'function') return;
  var od = openHeroDetail;            // Cách 2: sau khi bảng chi tiết vẽ xong, thay chữ trong từng thẻ chiêu
  openHeroDetail = function (id) {
    od.apply(this, arguments);
    try {
      var ov = override(id); if (!ov) return;
      document.querySelectorAll('#hd-skills .sk-card .sk-desc').forEach(function (el, i) { var t = ov[i]; if (typeof t === 'string' && t.trim()) el.innerHTML = html(t); });
    } catch (e) {}
  };
})();

;
/* === js/core/notify-badges.js === */
/* HUY HIỆU THÔNG BÁO (chấm đỏ / số) — chỉ hiện khi THỰC SỰ có việc mới, hết việc thì tự ẩn.
   - Các huy hiệu giả (số cố định 2 / 4 / 65 / 21) đã bị ẩn trong index.html; file này bật/tắt chúng theo điều kiện thật.
   - Thêm 1 huy hiệu: đặt <span class="badge-nav" id="nb-xxx" style="display:none">0</span> vào nút, rồi thêm 1 dòng vào NB_CHECKS:
       NB_CHECKS['nb-xxx'] = () => <số việc cần làm, 0 = ẩn>;
   - Hộp Thư (#mail-badge) vẫn do mail.js (updateMailBadge) quản lý như cũ. */
(function () {
  function set(id, n) {
    var el = document.getElementById(id); if (!el) return;
    n = Math.floor(Number(n)) || 0;
    if (n > 0) { el.textContent = n > 99 ? '99+' : n; el.style.display = ''; } else el.style.display = 'none';
  }
  window.nbSet = set;
  window.NB_CHECKS = window.NB_CHECKS || {};
  // Võ Hiệp: lấy đúng số đang báo ở nút "Ghép Mảnh" (#ghep-bd) — có tướng đủ mảnh để ghép thì mới hiện
  NB_CHECKS['nb-vohiep'] = function () {
    var g = document.getElementById('ghep-bd');
    return (g && g.style.display !== 'none') ? (parseInt(g.textContent) || 0) : 0;
  };
  // Chiêu Mộ: số gói đang có lượt MIỄN PHÍ (đã hết thời gian chờ) — 0 thì ẩn (recLeft/REC trong js/heroes/recruit.js)
  NB_CHECKS['nb-chieumo'] = function () {
    return Object.keys(REC).filter(function (k) { return recLeft(k) <= 0; }).length;
  };
  // Còn lại (Luyện Hóa, Kỳ Ngộ, Sự Kiện, Thẻ Tháng): chưa nối điều kiện -> luôn ẩn cho tới khi có điều kiện thật
  function tick() { Object.keys(NB_CHECKS).forEach(function (id) { try { set(id, NB_CHECKS[id]()); } catch (e) { set(id, 0); } }); }
  setInterval(tick, 1500);
  window.addEventListener('DOMContentLoaded', tick);
})();

;
/* === js/core/boot.js === */
/* KHỞI ĐỘNG: vẽ lại giao diện khi trang tải xong (nạp CUỐI CÙNG)
   (tách từ index.html cũ — script) */

    cfgApply();   // áp cấu hình admin (bản cache) lên dữ liệu game, rồi tải bản mới nhất
    cfgFetch();
    document.addEventListener('DOMContentLoaded', () => {
      renderHomeTeam();
      renderStages();
      updateAccExp();
      updatePower();
      updateRes();
      updateMailBadge();
    });

;
/* === js/heroes/kinhmach.js === */
/* KINH MẠCH — file lẻ, tự chứa cả giao diện + CSS + logic.
   Cách gắn: chép file này vào js/heroes/kinhmach.js, thêm 1 dòng vào index.html (ngay TRƯỚC boot.js):
       <script src="js/heroes/kinhmach.js?v=1"></script>
   Vào game: Võ Hiệp (thanh dưới) -> Kinh Mạch -> chọn tướng -> bản đồ 9 chấm mạch -> bấm chấm để tăng cấp. */
(function () {

  /* ================= CẤU HÌNH (sửa số ở đây) ================= */
  const KM_BASE   = 5000;      // điểm mạch của chấm đầu; mỗi chấm sau GẤP ĐÔI chấm trước
  const KM_PTS    = 100;       // mỗi lần "Tăng cấp" cộng bao nhiêu điểm mạch
  const KM_SHARD  = 5;         // mỗi lần tốn bao nhiêu mảnh của CHÍNH tướng đó
  const KM_SILVER = 200000;    // mỗi lần tốn bao nhiêu bạc
  // Thuộc tính cộng khi chấm mạch ĐỦ điểm. spd/def/dodge: nhân (1 + %). tough/block: gốc = 0 nên cộng thẳng điểm.
  const KM_NODES = [
    { name: 'Xích Viêm',   b: { spd: 10 } },
    { name: 'Thiết Bích',  b: { def: 75 } },
    { name: 'Phong Hành',  b: { spd: 10 } },
    { name: 'Vân Ảnh',     b: { dodge: 35, spd: 10 } },
    { name: 'Kim Cang',    b: { def: 75, spd: 15 } },
    { name: 'Linh Phong',  b: { spd: 10, dodge: 35 } },
    { name: 'Địa Căn',     b: { spd: 15, tough: 40 } },
    { name: 'Thiên Căn',   b: { spd: 20, tough: 40 } },
    { name: 'Hỗn Nguyên',  b: { spd: 20, block: 10 } }
  ];
  // Vị trí từng chấm trên bản đồ (% theo chiều ngang, % theo chiều dọc) — đúng hình mẫu
  const KM_POS = [[7.3, 82.3], [20.5, 57.3], [34.2, 38.8], [57.7, 50.9], [31.6, 66.8], [48.7, 81], [78.2, 65.5], [90.6, 44.4], [61.1, 28.9]];
  const KM_STAT = { spd: 'Tốc', def: 'Thủ', dodge: 'Né', tough: 'Bền', block: 'Đỡ đòn' };
  /* ============================================================ */

  const N = KM_NODES.length;
  const kmReq = i => KM_BASE * Math.pow(2, i);                 // điểm cần của chấm i (i từ 0)
  let kmProg = loadJSON('km_prog');                             // { heroId: [điểm chấm 1..9] }
  let kmHero = 0, kmNode = 0;

  const kmPts   = (id, i) => Math.min(kmReq(i), Math.max(0, ((kmProg[id] || [])[i]) | 0));
  const kmDone  = (id, i) => kmPts(id, i) >= kmReq(i);
  const kmOpenN = (id, i) => i === 0 || kmDone(id, i - 1);      // chấm trước đủ điểm mới mở chấm sau
  const kmCur   = id => { for (let i = 0; i < N; i++) if (!kmDone(id, i)) return i; return N; };
  const kmCount = id => { let c = 0; for (let i = 0; i < N; i++) if (kmDone(id, i)) c++; return c; };
  const kmSave  = () => saveJSON('km_prog', kmProg);
  const fmtB = (k, v) => `${KM_STAT[k]} +${v}%`;

  // Tổng thuộc tính cộng từ các chấm ĐÃ ĐỦ điểm
  function kmBonus(id) {
    const t = { spd: 0, def: 0, dodge: 0, tough: 0, block: 0 }; let any = false;
    for (let i = 0; i < N; i++) if (kmDone(id, i)) { any = true; for (const k in KM_NODES[i].b) t[k] += KM_NODES[i].b[k]; }
    return any ? t : null;
  }

  /* Chỉ số Kinh Mạch KHÔNG còn nhân lên tổng cuối: heroStats (hero-stats.js) gọi window.kmBonus và cộng vào chỉ số CƠ BẢN của tướng. */
  window.kmBonus = kmBonus;
  if (typeof SV_KEYS !== 'undefined' && SV_KEYS.indexOf('km_prog') < 0) SV_KEYS.push('km_prog');   // sao lưu + đồng bộ mây

  /* ---- Nối nút "Kinh Mạch" ở Hub Võ Hiệp ---- */
  const _vhGo = vhGo;
  vhGo = function (k) { if (k === 'kinhmach') return kmOpenPicker(); return _vhGo(k); };

  /* ---- Giữ thanh trên + thanh dưới khi ở màn Kinh Mạch ---- */
  const _sw = switchScreen;
  switchScreen = function (id) {
    _sw(id);
    if (id === 'kmpick' || id === 'km' || id === 'kmnode') {
      document.getElementById('app-header').style.display = 'block';
      document.getElementById('app-nav').style.display = 'flex';
      const b = document.getElementById('nav-btn-vhub'); if (b) b.classList.add('active');
    }
  };

  /* ================= CSS ================= */
  const css = document.createElement('style');
  css.textContent = `
.km-body{flex:1;overflow-y:auto;padding:0}
.km-bar{display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(0,0,0,.4);border-bottom:2px solid #fde047}
.km-bar h2{flex:1;margin:0;font-size:18px;color:#fff;text-shadow:0 2px 3px #000}
.km-btn{background:linear-gradient(180deg,#38bdf8,#1d4ed8);border:1px solid #bae6fd;border-radius:8px;color:#fff;font-weight:900;font-size:12px;padding:6px 12px;cursor:pointer}
.km-sky{position:relative;background:
 radial-gradient(1.2px 1.2px at 12% 18%,#fff,transparent),radial-gradient(1px 1px at 28% 72%,#fff,transparent),radial-gradient(1.4px 1.4px at 44% 10%,#fff,transparent),
 radial-gradient(1px 1px at 63% 38%,#fff,transparent),radial-gradient(1.3px 1.3px at 80% 20%,#fff,transparent),radial-gradient(1px 1px at 90% 78%,#fff,transparent),
 radial-gradient(1px 1px at 8% 50%,#fff,transparent),radial-gradient(1.2px 1.2px at 72% 88%,#fff,transparent),radial-gradient(1px 1px at 52% 60%,#fff,transparent),
 radial-gradient(ellipse at 50% 45%,#7a4a6b55 0,transparent 55%),radial-gradient(ellipse at 50% 50%,#2b3a8c 0,#0b1030 70%,#05071a 100%)}
.km-map{aspect-ratio:1/1;width:100%;max-height:calc(100vh - 230px);margin:0 auto}
.km-sil{position:absolute;inset:0;width:100%;height:100%;opacity:.55;pointer-events:none}
.km-lines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.km-lines line{stroke:#38bdf8;stroke-width:3.5;stroke-linecap:round;vector-effect:non-scaling-stroke;opacity:.35}
.km-lines line.on{opacity:.95;filter:drop-shadow(0 0 3px #38bdf8)}
.km-n{position:absolute;width:15%;aspect-ratio:1;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;cursor:pointer;-webkit-tap-highlight-color:transparent}
.km-n .o{width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center}
.km-n.sw .o{background:conic-gradient(from 0deg,#fff,#8a8a8a,#fff,#6f6f6f,#fff,#9a9a9a,#fff);-webkit-mask:radial-gradient(circle,#000 38%,transparent 71%);mask:radial-gradient(circle,#000 38%,transparent 71%)}
.km-n.fl .o{font-size:min(9vw,52px);filter:grayscale(1) brightness(1.7) drop-shadow(0 0 4px #fff)}
.km-n.lock{filter:brightness(.8)}
.km-n.cur.sw .o{background:conic-gradient(from 0deg,#d1fae5,#10b981,#d1fae5,#059669,#d1fae5,#34d399,#d1fae5);animation:kmspin 5s linear infinite}
.km-n.cur.fl .o{filter:hue-rotate(95deg) drop-shadow(0 0 6px #4ade80);animation:kmpulse 1.4s ease-in-out infinite}
.km-n.done.sw .o{background:conic-gradient(from 0deg,#fff7c2,#f59e0b,#fff7c2,#d97706,#fff7c2,#fbbf24,#fff7c2)}
.km-n.done.fl .o{filter:drop-shadow(0 0 7px #f97316)}
.km-n.cur{filter:drop-shadow(0 0 8px #4ade80)}
.km-n.done{filter:drop-shadow(0 0 8px #fbbf24)}
.km-n small{position:absolute;bottom:-13px;left:50%;transform:translateX(-50%);font-size:9px;font-weight:800;color:#e2e8f0;text-shadow:0 1px 2px #000;white-space:nowrap}
@keyframes kmspin{to{transform:rotate(360deg)}}
@keyframes kmpulse{50%{transform:scale(1.12)}}
.km-sum{padding:6px 10px;display:flex;flex-wrap:wrap;gap:5px;justify-content:center;background:rgba(0,0,0,.35)}
.km-sum span{font-size:11px;font-weight:800;color:#fde047;background:#0007;border:1px solid #fde04788;border-radius:10px;padding:2px 8px}
.km-sum em{font-style:normal;color:#cbd5e1;font-size:11px}
.km-nm{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#fff;font-size:16px;padding:6px 8px;background:rgba(0,0,0,.25)}
.km-nm b{flex:1;min-width:0;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.km-nm button{flex:none;background:#0006;border:2px solid #fde047;color:#fde047;border-radius:50%;width:28px;height:28px;font-weight:900}
.kd{padding:6px 10px 20px;display:flex;flex-direction:column;align-items:center}
.kd h3{margin:4px 0 6px;font-size:22px;color:#fff;text-shadow:0 2px 4px #000;text-align:center}
.kd-ring{width:min(62vw,300px);aspect-ratio:1;border-radius:50%;padding:7px;background:conic-gradient(var(--c) calc(var(--p)*1%),rgba(255,255,255,.14) 0)}
.kd-orb{width:100%;height:100%;border-radius:50%;background:radial-gradient(circle,#0b1030cc 0,#05071a 100%);display:flex;align-items:center;justify-content:center;position:relative}
.kd-orb .sp{position:absolute;inset:8%;border-radius:50%;background:conic-gradient(from 0deg,#fff,#8a8a8a,#fff,#6f6f6f,#fff,#9a9a9a,#fff);-webkit-mask:radial-gradient(circle,#000 30%,transparent 70%);mask:radial-gradient(circle,#000 30%,transparent 70%);opacity:.9}
.kd-orb.fl .sp{background:none;-webkit-mask:none;mask:none;display:flex;align-items:center;justify-content:center;font-size:min(30vw,140px);filter:grayscale(1) brightness(1.7)}
.kd-orb.done .sp{background:conic-gradient(from 0deg,#fff7c2,#f59e0b,#fff7c2,#d97706,#fff7c2,#fbbf24,#fff7c2)}
.kd-orb.fl.done .sp{background:none;filter:drop-shadow(0 0 8px #f97316)}
.kd-orb.cur .sp{animation:kmspin 7s linear infinite}
.kd-orb b{position:relative;z-index:2;font-size:24px;color:#fff;text-shadow:0 0 5px #000,0 0 5px #000}
.kd-bn{margin:10px 0 4px;min-width:60%;text-align:center;background:#0007;border:1px solid #38bdf866;border-radius:10px;padding:8px 14px}
.kd-bn div{font-size:18px;font-weight:900;color:#7dd3fc;text-shadow:0 1px 3px #000}
.kd-bn.off div{color:#64748b}
.kd-bn small{display:block;font-size:11px;color:#cbd5e1;margin-top:2px}
.kd-mat{width:100%;margin-top:8px;background:#2a1f1a;border-top:2px solid #6b4a2a;border-bottom:2px solid #6b4a2a;padding:8px 10px;display:flex;align-items:center;gap:12px}
.kd-mat .tag{align-self:flex-start;background:linear-gradient(180deg,#d4a24c,#8a5a1c);color:#fff;font-weight:900;font-size:13px;padding:3px 14px 3px 8px;clip-path:polygon(0 0,88% 0,100% 50%,88% 100%,0 100%)}
.kd-it{width:62px;text-align:center;color:#fff;font-size:13px;font-weight:800}
.kd-it .e{height:62px;border:2px solid #d4a24c;border-radius:8px;background:#3b2a1a;display:flex;align-items:center;justify-content:center;font-size:34px;overflow:hidden}
.kd-it .e img{width:100%;height:100%;object-fit:cover}.kd-it .bad{color:#f87171}
.kd-rt{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;color:#fff;font-size:15px;font-weight:800}
.kd-go{width:100%;max-width:190px;padding:9px 0;font-size:19px;font-weight:900;color:#fff;border-radius:10px;border:2px solid #bbf7d0;background:linear-gradient(180deg,#22c55e,#15803d);text-shadow:0 1px 2px #000}
.kd-go.alt{background:linear-gradient(180deg,#f59e0b,#b45309);border-color:#fde68a;font-size:15px;padding:6px 0}
.kd-go:disabled{filter:grayscale(1) brightness(.7)}
.kd-cost{font-size:16px}.kd-cost.bad{color:#f87171}
.kd-msg{color:#fca5a5;font-size:12px;font-weight:700;text-align:center;margin-top:6px}
#km-rules .md-box{max-width:420px}
#km-rules li{font-size:13px;color:#f1e4c8;margin:5px 0;line-height:1.35}
`;
  document.head.appendChild(css);

  /* ================= KHUNG MÀN HÌNH ================= */
  const host = document.getElementById('screen-picker').parentNode;
  const mk = (id, html) => { const d = document.createElement('div'); d.className = 'screen'; d.id = 'screen-' + id; d.innerHTML = html; host.appendChild(d); };
  mk('kmpick', `<div class="km-bar"><button class="btn-back" onclick="switchScreen('vhub')">Trở về</button><h2>Kinh Mạch</h2><button class="km-btn" onclick="kmRules()">Quy tắc</button></div>
    <div class="pk-sub" style="text-align:center;color:#cbd5e1;font-size:12px;padding:6px">Chọn tướng để mở Kinh Mạch</div><div class="km-body"><div class="pk-grid" id="km-grid"></div></div>`);
  mk('km', `<div class="km-bar"><button class="btn-back" onclick="kmOpenPicker()">Trở về</button><h2>Kinh Mạch</h2><button class="km-btn" onclick="kmRules()">Quy tắc</button></div>
    <div class="km-body" id="km-body"></div>`);
  mk('kmnode', `<div class="km-bar"><button class="btn-back" onclick="kmBackMap()">Trở về</button><h2>Kinh Mạch</h2><button class="km-btn" onclick="kmRules()">Quy tắc</button></div>
    <div class="km-body km-sky" id="kn-body"></div>`);
  const rules = document.createElement('div');
  rules.id = 'km-rules'; rules.className = 'md-wrap'; rules.setAttribute('onclick', 'if(event.target===this)kmRulesClose()');
  rules.innerHTML = `<div class="md-box"><div class="hd-head"><div class="hd-info"><div class="hd-name">🌀 Quy tắc Kinh Mạch</div></div><button class="md-x" onclick="kmRulesClose()">✕</button></div><ul id="km-rules-list" style="padding-left:18px;margin:8px 0"></ul></div>`;
  document.body.appendChild(rules);

  /* ================= MÀN 1: CHỌN TƯỚNG ================= */
  window.kmOpenPicker = function () {
    const order = ownedHeroes().sort((a, b) => (team.includes(b.id) - team.includes(a.id)) || (getProg(b.id).lv - getProg(a.id).lv));
    if (!order.length) { if (typeof scToast === 'function') scToast('Chưa có tướng nào — hãy Chiêu Mộ trước'); return; }
    document.getElementById('km-grid').innerHTML = order.map(h => {
      const p = getProg(h.id), inTeam = team.includes(h.id);
      return `<div class="pk-card ${(HERO_BORDER[h.id] || 'orange') === 'purple' ? 'purple' : ''}" onclick="kmOpen(${h.id})">${inTeam ? '<div class="pk-tag">Đội</div>' : ''}<div class="e">${heroIcon(h)}</div><div class="n">${h.name}</div><div class="st">${'★'.repeat(Math.min(p.star, 5)) || '☆'}</div><div class="lv">${kmCount(h.id)}/${N} mạch</div></div>`;
    }).join('');
    switchScreen('kmpick');
  };

  /* ================= MÀN 2: BẢN ĐỒ 9 CHẤM MẠCH ================= */
  window.kmOpen = function (id) { kmHero = id; renderMap(); switchScreen('km'); };
  window.kmNav = function (d) { const ids = ownedHeroes().map(h => h.id), i = ids.indexOf(kmHero); if (!ids.length) return; kmHero = ids[(i + d + ids.length) % ids.length]; renderMap(); };
  window.kmBackMap = function () { renderMap(); switchScreen('km'); };

  function renderMap() {
    const id = kmHero, h = heroById(id), cur = kmCur(id), b = kmBonus(id);
    let lines = '', nodes = '';
    for (let i = 0; i < N - 1; i++) lines += `<line x1="${KM_POS[i][0]}" y1="${KM_POS[i][1]}" x2="${KM_POS[i + 1][0]}" y2="${KM_POS[i + 1][1]}" class="${kmDone(id, i) ? 'on' : ''}"/>`;
    for (let i = 0; i < N; i++) {
      const st = kmDone(id, i) ? 'done' : (i === cur ? 'cur' : 'lock'), fl = i >= 6;
      nodes += `<div class="km-n ${fl ? 'fl' : 'sw'} ${st}" style="left:${KM_POS[i][0]}%;top:${KM_POS[i][1]}%" onclick="kmOpenNode(${i})"><div class="o">${fl ? '🔥' : ''}</div><small>${Math.floor(kmPts(id, i) / kmReq(i) * 100)}%</small></div>`;
    }
    const sil = `<svg class="km-sil" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><g fill="#1b2a7a"><circle cx="50" cy="12" r="7"/><path d="M38 24 Q50 19 62 24 L70 52 Q76 62 84 72 Q92 80 86 88 L14 88 Q8 80 16 72 Q24 62 30 52 Z"/></g></svg>`;
    const sum = b ? Object.keys(b).filter(k => b[k]).map(k => `<span>${fmtB(k, b[k])}</span>`).join('') : '<em>Chưa mở chấm mạch nào</em>';
    document.getElementById('km-body').innerHTML = `
      <div class="km-nm"><button onclick="kmNav(-1)">◀</button><b>${h.name} · ${kmCount(id)}/${N}</b><button onclick="kmNav(1)">▶</button></div>
      <div class="km-sum">${sum}</div>
      <div class="km-sky"><div class="km-map" style="position:relative">${sil}<svg class="km-lines" viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg>${nodes}</div></div>`;
  }

  /* ================= MÀN 3: CHI TIẾT 1 CHẤM MẠCH ================= */
  window.kmOpenNode = function (i) { kmNode = i; renderNode(''); switchScreen('kmnode'); };

  function renderNode(msg) {
    const id = kmHero, i = kmNode, h = heroById(id), n = KM_NODES[i], req = kmReq(i), pts = kmPts(id, i);
    const done = kmDone(id, i), open = kmOpenN(id, i), cur = open && !done, fl = i >= 6;
    const have = shardsOf(id), okS = have >= KM_SHARD, okG = silver >= KM_SILVER;
    const pct = Math.min(100, pts / req * 100), per = Math.min(100, KM_PTS / req * 100);
    const col = done ? '#fbbf24' : '#4ade80';
    const bonus = Object.keys(n.b).map(k => `<div>${fmtB(k, n.b[k])}</div>`).join('');
    const state = done ? '✔ Đã kích hoạt' : (open ? 'Đủ ' + fmtN(req) + ' điểm mạch để kích hoạt' : '🔒 Cần kích hoạt chấm mạch ' + i + ' trước');
    const can = open && !done;
    document.getElementById('kn-body').innerHTML = `<div class="kd">
      <h3>${n.name}</h3>
      <div class="kd-ring" style="--p:${pct.toFixed(2)};--c:${col}"><div class="kd-orb ${fl ? 'fl' : ''} ${done ? 'done' : ''} ${cur ? 'cur' : ''}"><div class="sp">${fl ? '🔥' : ''}</div><b>${fmtN(pts)}/${fmtN(req)}</b></div></div>
      <div class="kd-bn ${done ? '' : 'off'}">${bonus}<small>${state}</small></div>
      <div class="kd-mat"><div style="display:flex;flex-direction:column;gap:6px;align-self:stretch"><span class="tag">Vật Liệu</span>
        <div class="kd-it"><div class="e">${heroIcon(h)}</div><span class="${okS ? '' : 'bad'}">${fmtN(have)}/${KM_SHARD}</span></div></div>
        <div class="kd-rt"><div>Tỉ lệ: ${per < 1 ? per.toFixed(2) : Math.round(per * 10) / 10}%</div>
          <button class="kd-go" ${can ? '' : 'disabled'} onclick="kmUpgrade(1)">Tăng cấp</button>
          <button class="kd-go alt" ${can ? '' : 'disabled'} onclick="kmUpgrade(10)">Tăng 10 lần</button>
          <div class="kd-cost ${okG ? '' : 'bad'}">${IC_SILVER} ${fmtN(KM_SILVER)}</div></div></div>
      <div class="kd-msg">${msg || ''}</div></div>`;
  }

  window.kmUpgrade = function (times) {
    const id = kmHero, i = kmNode, req = kmReq(i);
    if (!kmOpenN(id, i)) return renderNode('Cần kích hoạt chấm mạch trước.');
    const left = req - kmPts(id, i); if (left <= 0) return renderNode('Chấm mạch này đã đủ điểm.');
    const byNeed = Math.ceil(left / KM_PTS), byShard = Math.floor(shardsOf(id) / KM_SHARD), bySilver = Math.floor(silver / KM_SILVER);
    const k = Math.min(times, byNeed, byShard, bySilver);
    if (k < 1) return renderNode(byShard < 1 ? `Thiếu mảnh ${heroById(id).name} (cần ${KM_SHARD} mảnh mỗi lần).` : `Không đủ bạc (cần ${fmtN(KM_SILVER)} bạc mỗi lần).`);
    const arr = (kmProg[id] || []).slice(); while (arr.length < N) arr.push(0);
    const was = kmDone(id, i);
    arr[i] = Math.min(req, kmPts(id, i) + k * KM_PTS); kmProg[id] = arr; kmSave();
    heroShards[id] = shardsOf(id) - k * KM_SHARD; saveJSON('hero_shards', heroShards);
    silver -= k * KM_SILVER; resSave();
    try { renderHomeTeam(); } catch (e) {}
    const now = kmDone(id, i);
    if (!was && now) { scToast('Mở chấm mạch ' + KM_NODES[i].name + '!'); return renderNode('+' + fmtN(k * KM_PTS) + ' điểm mạch — ĐÃ KÍCH HOẠT'); }
    renderNode('+' + fmtN(k * KM_PTS) + ' điểm mạch');
  };

  /* ================= QUY TẮC ================= */
  window.kmRules = function () {
    document.getElementById('km-rules-list').innerHTML = [
      `Mỗi tướng có ${N} chấm mạch, mở lần lượt từ chấm 1. Chấm trước đủ điểm mới mở được chấm sau.`,
      `Chấm 1 cần ${fmtN(KM_BASE)} điểm mạch; mỗi chấm sau cần GẤP ĐÔI chấm trước.`,
      `Mỗi lần Tăng cấp: tốn ${KM_SHARD} mảnh của chính tướng đó + ${fmtN(KM_SILVER)} bạc, được +${KM_PTS} điểm mạch.`,
      `Chấm mạch ĐỦ điểm mới cộng thuộc tính. Tốc / Thủ / Né: cộng thêm % trên chỉ số hiện có. Bền / Đỡ đòn: cộng thẳng điểm.`,
      ...KM_NODES.map((n, i) => `<b>${i + 1}. ${n.name}</b> (${fmtN(kmReq(i))}): ` + Object.keys(n.b).map(k => fmtB(k, n.b[k])).join(', '))
    ].map(t => `<li>${t}</li>`).join('');
    document.getElementById('km-rules').style.display = 'flex';
  };
  window.kmRulesClose = function () { document.getElementById('km-rules').style.display = 'none'; };

})();

;
/* === js/heroes/dotpha.js === */

/* ĐỘT PHÁ + BỒI DƯỠNG — file lẻ, tự chứa giao diện + CSS + logic.
   Chép vào game/js/heroes/dotpha.js.
   Nếu file đã được nạp trong index.html thì không thêm script lần nữa. */
(function () {

  /* ================= CẤU HÌNH ================= */
  const DP_MAX      = Infinity;
  const DP_EXP_BASE = 10000;
  const DP_EXP_UP   = 10000;
  const DP_ATTR_PCT = 5;
  const DP_PER_PILL = 1;     // exp mỗi viên Tiên Đan (Bồi Dưỡng thường)
  const DP_ADV_MUL  = 2;     // Bồi Dưỡng Cao Cấp: exp gấp đôi thường
  const DP_ADV_GOLD = 1;     // Bồi Dưỡng Cao Cấp: mỗi viên Tiên Đan tốn thêm 1 vàng
  const DP_RATIO    = { hp: 0.5, atk: 0.3, def: 0.1, heal: 0.1 };
  const DP_GOD = 'Thần Đan', DP_PILL = 'Tiên Đan';

  const dpCost = lv => Math.pow(2, lv);
  const dpCap  = lv => DP_EXP_BASE + DP_EXP_UP * lv;

  let dpProg = loadJSON('dp_prog');
  let dpHero = 0, dpMode = 'dp', dpAdv = false;   // dpAdv: đang chọn Bồi Dưỡng Cao Cấp

  const dpGet = id => {
    const p = dpProg[id] || {};
    return {
      bp: Math.max(0, Math.min(DP_MAX, p.bp | 0)),
      exp: Math.max(0, p.exp | 0)
    };
  };

  const dpSet = (id, p) => {
    dpProg[id] = { bp: p.bp, exp: p.exp };
    saveJSON('dp_prog', dpProg);
  };

  /* Chỉ số BỒI DƯỠNG của 1 tướng (đúng các thanh trong màn Bồi Dưỡng: HP/Công/Thủ/Hồi = exp × tỉ lệ).
     Dùng cho dàn Hỗ Trợ (hero-stats.js → supBase). Không gồm Đột Phá, trang bị, Bảo Vật, Bang. */
  window.dpBonusOf = id => {
    const p = dpGet(id);
    return { hp: Math.round(p.exp * DP_RATIO.hp), atk: Math.round(p.exp * DP_RATIO.atk), def: Math.round(p.exp * DP_RATIO.def), heal: Math.round(p.exp * DP_RATIO.heal) };
  };

  /* Vật phẩm trong Túi Đồ */
  const hasKho = () =>
    typeof gdSt === 'function' && typeof gdSave === 'function';

  const itemQty = n => {
    try {
      const k = gdSt().kho[n];
      return k ? Math.max(0, Math.floor(k.qty)) : 0;
    } catch (e) {
      return 0;
    }
  };

  function itemAdd(n, d, ico) {
    const s = gdSt();
    const k = s.kho[n] =
      s.kho[n] || { ico: ico || '🎁', qty: 0 };
    k.qty = Math.max(0, k.qty + d);
    gdSave(s);
  }

  window.dpAddItem = (name, n) =>
    itemAdd(name, n, name === DP_GOD ? '🟣' : '🔴');

  try {
    if (typeof BAG_PRICE !== 'undefined') {
      BAG_PRICE[DP_GOD] = 500;
      BAG_PRICE[DP_PILL] = 10;
    }

    if (typeof BAG_DESC !== 'undefined') {
      BAG_DESC[DP_GOD] = 'Dùng để Đột Phá tướng (Võ Hiệp → Đột Phá).';
      BAG_DESC[DP_PILL] =
        'Dùng để Bồi Dưỡng tướng: mỗi viên +' + DP_PER_PILL + ' exp.';
    }

    if (typeof GIFT_CODES !== 'undefined') {
      GIFT_CODES['DOTPHA'] = {
        rewards: [
          { t: 'item', name: DP_GOD, ico: '🟣', n: 100 },
          { t: 'item', name: DP_PILL, ico: '🔴', n: 5000 }
        ]
      };
    }
  } catch (e) {}

  /* Đột Phá + Bồi Dưỡng KHÔNG còn nhân lên tổng cuối: heroStats (hero-stats.js) đọc dpStatsOf (Đột Phá = +DP_ATTR_PCT% chỉ số cơ bản mỗi cấp)
     và dpBonusOf (Bồi Dưỡng = exp × tỉ lệ) rồi cộng vào đúng nguồn của chúng. */
  window.dpStatsOf = id => { const p = dpGet(id); return { bp: p.bp, exp: p.exp, pct: DP_ATTR_PCT * p.bp }; };

  function statsWith(id, patch) {
    const old = dpProg[id];
    const had = Object.prototype.hasOwnProperty.call(dpProg, id);

    dpProg[id] = Object.assign({}, dpGet(id), patch);

    try {
      return heroStats(id);
    } finally {
      if (had) dpProg[id] = old;
      else delete dpProg[id];
    }
  }

  if (typeof SV_KEYS !== 'undefined' &&
      SV_KEYS.indexOf('dp_prog') < 0) {
    SV_KEYS.push('dp_prog');
  }

  /* Nối nút ở Hub Võ Hiệp */
  const _vhGo = vhGo;

  vhGo = function (k) {
    if (k === 'dotpha') return dpOpenPicker('dp');
    if (k === 'boiduong') return dpOpenPicker('bd');
    return _vhGo(k);
  };

  /* Giữ thanh trên và thanh dưới */
  const _sw = switchScreen;

  switchScreen = function (id) {
    _sw(id);

    if (id === 'dppick' || id === 'dp' || id === 'bd') {
      document.getElementById('app-header').style.display = 'block';
      document.getElementById('app-nav').style.display = 'flex';

      const b = document.getElementById('nav-btn-vhub');
      if (b) b.classList.add('active');
    }
  };

  /* ================= CSS ================= */
  const css = document.createElement('style');

  css.textContent = `
.dp-bar{display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(0,0,0,.4);border-bottom:2px solid #fde047}
.dp-bar h2{flex:1;margin:0;font-size:19px;color:#fff;text-shadow:0 2px 3px #000}
.dp-sw{background:linear-gradient(180deg,#38bdf8,#1d4ed8);border:2px solid #bae6fd;border-radius:10px;color:#fff;font-weight:900;font-size:15px;padding:7px 14px;cursor:pointer;text-shadow:0 1px 2px #000}
.dp-body{flex:1;overflow-y:auto;padding:10px 10px 24px}
.dp-card{background:linear-gradient(#aeaeaa,#8f8f8a);border:3px solid #6b6b66;border-radius:8px;padding:10px 8px;color:#fff;box-shadow:0 3px 8px #0006}
.dp-t{text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,0 2px 3px #000;font-weight:800}
.dp-top{display:grid;grid-template-columns:1fr 96px 1fr;gap:2px;align-items:start}
.dp-col{text-align:center;font-size:14px;line-height:1.55}
.dp-col .nm{font-size:15px;line-height:1.15;margin:3px 0}
.dp-pt{width:62px;height:62px;margin:0 auto;border:3px solid #d4a24c;border-radius:9px;overflow:hidden;background:#3b2a1a}
.dp-pt.purple{border-color:#a855f7}
.dp-pt .hero-img,.dp-pt img{width:100%;height:100%;object-fit:cover}
.dp-mid{text-align:center;font-size:12px;line-height:1.25}
.dp-arrow{font-size:34px;color:#e5e5e0;line-height:1;margin-top:10px;text-shadow:0 2px 2px #000}
.dp-pct{color:#86efac;font-size:12px;margin:2px 0 8px;white-space:nowrap}
.dp-vl{color:#fde047;font-size:14px;margin-bottom:3px}
.dp-orb{width:54px;height:54px;margin:0 auto 2px;background:#3b2a1a;border:2px solid #6b4a2a;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:32px}
.dp-bad{color:#f87171}
.dp-ghd{margin-top:10px;background:linear-gradient(#92d94f,#3f7d1d);border:2px solid #c6f59a;border-radius:4px;text-align:center;font-size:15px;padding:2px 4px;color:#fff}
.dp-gbd{background:#34402b;border:2px solid #1f2918;border-radius:0 0 6px 6px;padding:8px 10px}
.dp-cap{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:13px}
.dp-cap div{display:flex;align-items:center;justify-content:space-between;gap:3px;color:#fff}
.dp-cap i{font-style:normal;color:#4ade80;font-weight:900}
.dp-cap b{color:#86efac}
.dp-go{display:block;margin:14px auto 0;min-width:190px;padding:10px 26px;font-size:22px;font-weight:900;color:#fff;border-radius:14px;border:3px solid #bbf7d0;background:linear-gradient(180deg,#34d058,#15803d);text-shadow:0 2px 2px #000;box-shadow:0 3px 0 #14532d,0 5px 8px #0008;cursor:pointer}
.dp-go:disabled{filter:grayscale(1) brightness(.7)}
.dp-msg{min-height:18px;text-align:center;margin-top:8px;font-size:13px;font-weight:800;color:#fde047;text-shadow:0 1px 3px #000}
.bd-hd{display:flex;gap:12px;align-items:center}
.bd-hd .dp-pt{margin:0;width:70px;height:70px}
.bd-st{display:grid;grid-template-columns:1fr 1fr;gap:0 10px;flex:1;font-size:15px;line-height:1.5}
.bd-st .nm{grid-column:1/3;font-size:17px}
.bd-row{display:flex;align-items:center;gap:8px;margin:7px 0;font-size:15px;color:#fff}
.bd-row>span:first-child{width:74px}
.bd-track{flex:1;height:14px;background:#4a3322;border:2px solid #2b1c10;border-radius:4px;overflow:hidden}
.bd-fill{height:100%;background:linear-gradient(#bef264,#4d9a1d);transition:width .25s}
.bd-row>span:last-child{width:84px;text-align:right;font-size:14px}
.bd-note{color:#fde047;font-size:14px;text-align:center;margin-top:4px}
.bd-types{display:flex;justify-content:space-around;gap:6px;color:#fff;padding:6px 4px}
.bd-ty{display:flex;align-items:flex-start;gap:6px;font-size:15px}
.bd-ck{width:34px;height:34px;border:3px solid #4b3a2a;border-radius:5px;background:#6b5a48;display:flex;align-items:center;justify-content:center;color:#4ade80;font-size:26px;font-weight:900;flex:none}
.bd-ty small{display:block;font-size:12px;color:#e5e7eb}
.bd-left{text-align:center;color:#fff;font-size:15px;padding-bottom:2px}
.bd-btns{display:flex;justify-content:center;gap:8px;margin-top:12px}
.bd-btns .dp-go{margin:0;min-width:0;flex:1;max-width:120px;padding:9px 0;font-size:19px}
@media(max-width:380px){.bd-btns{gap:5px}.bd-btns .dp-go{font-size:16px;padding:9px 2px}}
`;

  document.head.appendChild(css);

  /* ================= KHUNG MÀN HÌNH ================= */
  const host = document.getElementById('screen-picker').parentNode;

  const mk = (id, html) => {
    const d = document.createElement('div');
    d.className = 'screen';
    d.id = 'screen-' + id;
    d.innerHTML = html;
    host.appendChild(d);
  };

  mk('dppick', `
    <div class="dp-bar">
      <button class="btn-back" onclick="switchScreen('vhub')">Trở về</button>
      <h2 id="dpk-title"></h2>
    </div>
    <div class="dp-body" style="padding:0">
      <div class="pk-grid" id="dpk-grid"></div>
    </div>
  `);

  mk('dp', `
    <div class="dp-bar">
      <button class="btn-back" onclick="dpOpenPicker('dp')">Trở về</button>
      <h2>Đột Phá</h2>
      <button class="dp-sw" onclick="dpGo('bd')">Bồi Dưỡng</button>
    </div>
    <div class="dp-body" id="dp-body"></div>
  `);

  mk('bd', `
    <div class="dp-bar">
      <button class="btn-back" onclick="dpOpenPicker('bd')">Trở về</button>
      <h2>Bồi Dưỡng</h2>
      <button class="dp-sw" onclick="dpGo('dp')">Đột Phá</button>
    </div>
    <div class="dp-body" id="bd-body"></div>
  `);

  /* ================= CHỌN TƯỚNG ================= */
  window.dpOpenPicker = function (mode) {
    dpMode = mode;

    document.getElementById('dpk-title').textContent =
      mode === 'dp' ? 'Chọn Võ Hiệp đột phá' : 'Chọn Võ Hiệp bồi dưỡng';

    const order = ownedHeroes().sort((a, b) =>
      (team.includes(b.id) - team.includes(a.id)) ||
      (getProg(b.id).lv - getProg(a.id).lv)
    );

    document.getElementById('dpk-grid').innerHTML = order.map(h => {
      const p = getProg(h.id), d = dpGet(h.id);
      const inTeam = team.includes(h.id);

      return `<div class="pk-card ${(HERO_BORDER[h.id] || 'orange') === 'purple' ? 'purple' : ''}" onclick="dpOpen(${h.id})">
        ${inTeam ? '<div class="pk-tag">Đội</div>' : ''}
        <div class="e">${heroIcon(h)}</div>
        <div class="n">${h.name}${d.bp ? '+' + d.bp : ''}</div>
        <div class="st">${'★'.repeat(Math.min(p.star, 5)) || '☆'}</div>
      </div>`;
    }).join('');

    switchScreen('dppick');
  };

  window.dpOpen = function (id) {
    dpHero = id;
    dpGo(dpMode);
  };

  window.dpGo = function (m) {
    dpMode = m;
    if (m === 'dp') renderDP('');
    else renderBD('');
    switchScreen(m);
  };

  const portrait = h =>
    `<div class="dp-pt ${(HERO_BORDER[h.id] || 'orange') === 'purple' ? 'purple' : ''}">${heroIcon(h)}</div>`;

  const statCol = s =>
    `<div>HP ${fmtN(s.hp)}</div><div>Công ${fmtN(s.atk)}</div><div>Thủ ${fmtN(s.def)}</div><div>Hồi ${fmtN(s.heal || 0)}</div>`;

  const nameOf = (h, bp) => h.name + (bp ? '+' + bp : '');
  const refresh = () => { try { renderHomeTeam(); } catch (e) {} };

  /* ================= MÀN ĐỘT PHÁ ================= */
  function renderDP(msg) {
    const id = dpHero, h = heroById(id), p = dpGet(id);
    const maxed = p.bp >= DP_MAX;
    const cur = heroStats(id);
    const nxt = maxed ? cur : statsWith(id, { bp: p.bp + 1 });
    const need = dpCost(p.bp), have = itemQty(DP_GOD);
    const ok = have >= need;
    const c0 = dpCap(p.bp), c1 = maxed ? c0 : dpCap(p.bp + 1);

    const cr = (l, k) =>
      `<div><span>${l} ${fmtN(c0 * DP_RATIO[k])}</span><i>➜</i><b>${fmtN(c1 * DP_RATIO[k])}</b></div>`;

    document.getElementById('dp-body').innerHTML = `
      <div class="dp-card dp-t">
        <div class="dp-top">
          <div class="dp-col">
            ${portrait(h)}
            <div class="nm">${nameOf(h, p.bp)}</div>
            <div>Cấp: ${getProg(id).lv}</div>
            ${statCol(cur)}
          </div>
          <div class="dp-mid">
            <div class="dp-arrow">➡</div>
            <div class="dp-pct">${maxed ? 'Đã tối đa' : 'Thuộc tính +' + DP_ATTR_PCT + '%'}</div>
            <div class="dp-vl">Vật Liệu</div>
            <div class="dp-orb"><span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;font-size:44px;line-height:1">🟣</span></div>
            <div>${DP_GOD}</div>
            <div class="${ok || maxed ? '' : 'dp-bad'}">${fmtN(have)} / ${maxed ? '-' : fmtN(need)}</div>
          </div>
          <div class="dp-col">
            ${portrait(h)}
            <div class="nm">${nameOf(h, maxed ? p.bp : p.bp + 1)}</div>
            <div>Cấp: ${getProg(id).lv}</div>
            ${statCol(nxt)}
          </div>
        </div>
        <div class="dp-ghd">Đột Phá giúp tăng giới hạn Bồi Dưỡng</div>
        <div class="dp-gbd"><div class="dp-cap">${cr('HP', 'hp')}${cr('Công', 'atk')}${cr('Thủ', 'def')}${cr('Hồi', 'heal')}</div></div>
      </div>
      <button class="dp-go" ${maxed ? 'disabled' : ''} onclick="dpBreak()">${maxed ? 'Đã tối đa' : 'Đột Phá'}</button>
      <div class="dp-msg">${msg || ''}</div>`;
  }

  window.dpBreak = function () {
    const id = dpHero, p = dpGet(id);

    if (p.bp >= DP_MAX) return renderDP('Đã đột phá tối đa.');
    if (!hasKho()) return renderDP('Chưa nạp kho vật phẩm.');

    const need = dpCost(p.bp), have = itemQty(DP_GOD);
    if (have < need) {
      return renderDP(`Thiếu ${DP_GOD}: cần ${fmtN(need)}, đang có ${fmtN(have)}.`);
    }

    itemAdd(DP_GOD, -need);
    dpSet(id, { bp: p.bp + 1, exp: p.exp });

    refresh();
    scToast('Đột phá thành công! ' + nameOf(heroById(id), p.bp + 1));
    renderDP('Đột phá thành công: giới hạn bồi dưỡng tăng ' + fmtN(DP_EXP_UP) + ' exp.');
  };

  /* ================= MÀN BỒI DƯỠNG ================= */
  function renderBD(msg) {
    const id = dpHero, h = heroById(id), p = dpGet(id);
    const cap = dpCap(p.bp), st = heroStats(id);
    const have = itemQty(DP_PILL), full = p.exp >= cap;

    const row = (l, k) => {
      const v = p.exp * DP_RATIO[k], c = cap * DP_RATIO[k];

      return `<div class="bd-row dp-t">
        <span>${l}</span>
        <div class="bd-track"><div class="bd-fill" style="width:${Math.min(100, v / c * 100)}%"></div></div>
        <span>${fmtN(v)}/${fmtN(c)}</span>
      </div>`;
    };

    document.getElementById('bd-body').innerHTML = `
      <div class="dp-card dp-t">
        <div class="bd-hd">
          ${portrait(h)}
          <div class="bd-st">
            <div class="nm">${nameOf(h, p.bp)}</div>
            <div>HP:${fmtN(st.hp)}</div>
            <div>Công:${fmtN(st.atk)}</div>
            <div>Thủ:${fmtN(st.def)}</div>
            <div>Hồi:${fmtN(st.heal || 0)}</div>
          </div>
        </div>

        <div class="dp-ghd" style="text-align:left;padding-left:10px">Tăng Bồi Dưỡng</div>
        <div class="dp-gbd">
          ${row('Tăng HP', 'hp')}
          ${row('Tăng Công', 'atk')}
          ${row('Tăng Thủ', 'def')}
          ${row('Tăng Hồi', 'heal')}
          <div class="bd-note dp-t">${full
            ? 'Đã đầy! Hãy Đột Phá để mở thêm giới hạn'
            : 'Đột phá để tăng giới hạn (exp ' + fmtN(p.exp) + '/' + fmtN(cap) + ')'}</div>
        </div>

        <div class="dp-ghd" style="text-align:left;padding-left:10px">Loại Bồi Dưỡng</div>
        <div class="bd-types">
          <div class="bd-ty" onclick="dpBdMode('n')">
            <div class="bd-ck">${dpAdv ? '' : '✔'}</div>
            <div>Thường<small>${danIcoHTML(DP_PILL, '1.1em')} x1 = +${DP_PER_PILL} exp</small></div>
          </div>
          <div class="bd-ty" onclick="dpBdMode('a')">
            <div class="bd-ck">${dpAdv ? '✔' : ''}</div>
            <div>Cao Cấp (Đề Cử)<small>${danIcoHTML(DP_PILL, '1.1em')} x1 + ${DP_ADV_GOLD} vàng = +${DP_PER_PILL * DP_ADV_MUL} exp</small></div>
          </div>
        </div>

        <div class="bd-left">Còn ${DP_PILL} ${danIcoHTML(DP_PILL, '1.1em')} : ${fmtN(have)}</div>
      </div>

      <div class="bd-btns">
        <button class="dp-go" ${full ? 'disabled' : ''} onclick="dpTrain(10)">10 lần</button>
        <button class="dp-go" ${full ? 'disabled' : ''} onclick="dpTrain(100)">100 lần</button>
        <button class="dp-go" ${full ? 'disabled' : ''} onclick="dpTrain(1000)">1000 lần</button>
      </div>
      <div class="dp-msg">${msg || ''}</div>`;
  }

  window.dpBdMode = function (m) { dpAdv = (m === 'a'); renderBD(); };

  window.dpTrain = function (times) {
    const id = dpHero, p = dpGet(id), cap = dpCap(p.bp);

    if (!hasKho()) return renderBD('Chưa nạp kho vật phẩm.');

    const per = DP_PER_PILL * (dpAdv ? DP_ADV_MUL : 1);   // exp mỗi viên theo loại đang chọn
    const left = cap - p.exp;
    if (left < 1) return renderBD('Đã đầy exp, cần Đột Phá để tăng thêm.');

    const have = itemQty(DP_PILL);
    if (have < 1) return renderBD(`Hết ${DP_PILL}.`);

    const goldHave = Math.max(0, Math.floor(Number(gold) || 0));
    if (dpAdv && goldHave < DP_ADV_GOLD) return renderBD('Không đủ vàng để Bồi Dưỡng Cao Cấp.');

    let k = Math.min(times, Math.ceil(left / per), have);
    if (dpAdv) k = Math.min(k, Math.floor(goldHave / DP_ADV_GOLD));
    const e = Math.min(k * per, left);

    itemAdd(DP_PILL, -k);
    if (dpAdv) { gold -= k * DP_ADV_GOLD; try { resSave(); } catch (er) {} }
    dpSet(id, { bp: p.bp, exp: p.exp + e });

    refresh();

    try {   // tính nhiệm vụ: Bồi dưỡng (mọi loại) và Bồi dưỡng cao cấp
      if (typeof qsAdd === 'function') { qsAdd('bd', k); if (typeof qsTrig === 'function') qsTrig('bd', k); if (dpAdv) qsAdd('bd2', k); }
    } catch (er) {}

    renderBD(`Dùng ${fmtN(k)} ${DP_PILL}${dpAdv ? ' + ' + fmtN(k * DP_ADV_GOLD) + ' vàng' : ''}: +${fmtN(e)} exp (HP +${fmtN(e * DP_RATIO.hp)}, Công +${fmtN(e * DP_RATIO.atk)}, Thủ +${fmtN(e * DP_RATIO.def)}, Hồi +${fmtN(e * DP_RATIO.heal)})`);
  };

})();

;
/* === js/heroes/ghep-manh.js === */
/* GHÉP MẢNH: đủ 10 mảnh của 1 tướng thì ghép thành tướng đó (cấp 1 ★1). Mở từ Võ Hiệp → Ghép Mảnh. */
(function () {
  const mc = document.querySelector('.main-content'); if (!mc) return;
  const sc = document.createElement('div'); sc.className = 'screen'; sc.id = 'screen-ghep';
  sc.innerHTML = '<div class="pve-header"><button class="btn-back" onclick="openVhub()">Trở về</button><h2 class="pve-title">Ghép Mảnh</h2></div><div class="pk-sub" id="gh-sub"></div><div class="pk-grid" id="gh-grid"></div>';
  mc.appendChild(sc);
  const canMerge = id => OWN_ON && !heroIsOwned(id) && shardsOf(id) >= MERGE_COST;
  window.ghepBadge = function () {
    const n = OWN_ON ? HEROES.filter(h => canMerge(h.id)).length : 0, b = document.getElementById('ghep-bd');
    if (b) { b.textContent = n; b.style.display = n ? '' : 'none'; }
  };
  window.ghepRender = function () {
    document.getElementById('gh-sub').textContent = OWN_ON ? `Đủ ${MERGE_COST} mảnh của một tướng để ghép thành tướng đó` : 'Tài khoản này đã có đủ tướng';
    const order = HEROES.slice().sort((a, b) => (heroIsOwned(a.id) - heroIsOwned(b.id)) || (canMerge(b.id) - canMerge(a.id)) || (shardsOf(b.id) - shardsOf(a.id)) || (a.id - b.id));
    document.getElementById('gh-grid').innerHTML = order.map(h => {
      const own = heroIsOwned(h.id), n = shardsOf(h.id), ok = canMerge(h.id);
      return `<div class="pk-card ${(HERO_BORDER[h.id] || 'orange') === 'purple' ? 'purple' : ''}" style="${own ? 'opacity:.55;' : ''}cursor:default"><div class="e">${heroIcon(h)}</div><div class="n">${h.name}</div>` +
        (own ? '<div class="lv">✔ Đã có</div>' : `<div class="lv">🧩 ${n}/${MERGE_COST}</div><button class="rc-btn" style="margin-top:4px;padding:3px 10px;font-size:12px" ${ok ? '' : 'disabled'} onclick="ghepDo(${h.id})">Ghép</button>`) + '</div>';
    }).join('');
    ghepBadge();
  };
  window.ghepDo = function (id) {
    if (!heroGain(id)) { if (typeof scToast === 'function') scToast(`Chưa đủ ${MERGE_COST} mảnh`); return; }
    try { renderHomeTeam(); updatePower(); renderPvp(); } catch (e) {}
    if (typeof scToast === 'function') scToast('🎉 Đã ghép thành tướng ' + heroById(id).name + '!');
    ghepRender();
  };
  const _go = vhGo;
  vhGo = function (k) { if (k === 'ghep') { ghepRender(); return switchScreen('ghep'); } return _go(k); };
  const _ov = window.openVhub; window.openVhub = function () { ghepBadge(); return _ov.apply(this, arguments); };
  setInterval(ghepBadge, 3000); ghepBadge();
})();

;
/* === js/ui/notify.js === */
/* THÔNG BÁO bằng khung rồng (ảnh trong vat-pham-game/):
   • notifyBanner(msg)  — khung xanh vàng nền trong suốt, vùng chữ đen ở giữa (khung-thong-bao.webp) cho thông báo thường: hết thể lực, hết lượt, sai mật khẩu, thất bại...
   • notifyResult(msg, win, opt) — pvpToast gọi vào đây:
        PVE / Giang Hồ thắng: khung "Thắng" (khung-thang.webp), vật phẩm nhận được xếp trong nền đen
        PvP (opt.pvp): khung "Thắng" kèm chữ BẠN THẮNG / ĐỐI THỦ THẮNG
        thua / không thắng ở PVE: khung thông báo thường
   • alert() của trình duyệt được đổi sang khung thông báo (không chặn game); scToast / toast cũng đổi nếu là hàm toàn cục.
   Nạp CUỐI CÙNG trong index.html. */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const rich = s => { let h = esc(s); if (typeof danIcoHTML === 'function') h = h.replace(/🔮/g, danIcoHTML('Thần Đan', '1.15em')).replace(/🔴/g, danIcoHTML('Tiên Đan', '1.15em')); return h; };
  const CHIP = /^(<img[^>]*>|\p{Extended_Pictographic}\uFE0F?)\s*([\s\S]*)$/u, LEAD = /^(?:\p{Extended_Pictographic}\uFE0F?\s*)+/u;

  function notifyBanner(msg, ms) {
    let t = document.getElementById('nf-banner');
    if (!t) { t = document.createElement('div'); t.id = 'nf-banner'; t.innerHTML = '<img class="nf-bg" src="giao-dien/thong-bao/khung-thong-bao.webp?v=4" alt=""><div class="nf-tx"><div class="nf-in"></div></div>'; document.body.appendChild(t); }
    const txt = String(msg == null ? '' : msg).trim(), L = txt.length, inn = t.querySelector('.nf-in');
    inn.innerHTML = rich(txt).replace(/\n/g, '<br>');
    inn.style.fontSize = (L > 140 ? 11.5 : L > 100 ? 13 : L > 60 ? 14.5 : 16.5) + 'px';
    t.classList.add('on'); t._at = Date.now(); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), ms || Math.min(6000, 2600 + L * 20));
  }

  const chipHTML = s => { const m = s.match(CHIP); return m ? '<div class="nf-chip"><span class="nf-ico">' + m[1] + '</span><span>' + m[2] + '</span></div>' : '<div class="nf-chip"><span>' + s + '</span></div>'; };
  function showWin(msg, opt) {
    let t = document.getElementById('nf-win');
    if (!t) { t = document.createElement('div'); t.id = 'nf-win'; t.innerHTML = '<img class="nf-wbg" alt=""><div class="nf-wb"></div>'; document.body.appendChild(t); }
    const lose = !!(opt && (opt.lose || (opt.pvp && !opt.win)));   // thua → khung "Thua" (khung-thua.webp), thắng → khung "Thắng"
    t.classList.toggle('lose', lose); t.querySelector('.nf-wbg').src = lose ? 'giao-dien/thong-bao/khung-thua.webp' : 'giao-dien/thong-bao/khung-thang.webp';
    const lines = String(msg == null ? '' : msg).split('\n').map(s => s.trim()).filter(Boolean).map(rich);
    let head = '', headCls = 'nf-head', sub = '', note = '', rest = lines;
    if (opt && opt.pvp) {   // PvP: báo rõ bên nào thắng; dòng đầu (kết quả) chỉ giữ phần ghi chú trong ngoặc
      const me = !!opt.win;
      head = me ? 'BẠN THẮNG' : 'ĐỐI THỦ THẮNG'; headCls += ' big'; sub = me ? '' : (opt.foe ? esc(opt.foe) : '');
      const m = lines[0] && lines[0].match(/\(([^)]*)\)/); note = m ? m[1] : ''; rest = lines.slice(1);
    } else if (lines.length) { head = lines[0].replace(LEAD, ''); rest = lines.slice(1); }
    const items = rest.map(l => { const segs = l.split(' • '); return (segs.length > 1 || (CHIP.test(l) && l.length < 52)) ? segs.map(chipHTML).join('') : '<div class="nf-line">' + l + '</div>'; }).join('');
    t.querySelector('.nf-wb').innerHTML = (head ? '<div class="' + headCls + '">' + head + '</div>' : '') + (sub ? '<div class="nf-sub">' + sub + '</div>' : '') + (note ? '<div class="nf-note">' + note + '</div>' : '') + (items ? '<div class="nf-items">' + items + '</div>' : '');
    t.classList.add('on'); t._at = Date.now(); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), (opt && opt.pvp) ? 4500 : 4200);
  }
  function notifyResult(msg, win, opt) {
    if (opt && opt.pvp) return showWin(msg, Object.assign({}, opt, { win: !!win }));
    if (win) return showWin(msg, opt);
    showWin(msg, Object.assign({}, opt, { lose: true }));   // PVE / Giang Hồ thua: khung "Thua", dòng đầu là tiêu đề
  }
  // Chạm vào khung (hoặc chạm bất cứ đâu) là tắt ngay, không phải chờ hết giờ.
  // Dùng pointerdown (xảy ra TRƯỚC click) nên thông báo vừa bật từ một cú bấm sẽ không bị tắt nhầm.
  const NF_IDS = ['nf-banner', 'nf-win'];
  function nfHideAll() { NF_IDS.forEach(id => { const t = document.getElementById(id); if (t && t.classList.contains('on')) { clearTimeout(t._h); t.classList.remove('on'); } }); }
  document.addEventListener('pointerdown', e => {
    const now = Date.now();
    NF_IDS.forEach(id => {
      const t = document.getElementById(id);
      if (t && t.classList.contains('on') && now - (t._at || 0) > 200) { clearTimeout(t._h); t.classList.remove('on'); }
    });
  }, true);
  window.notifyHide = nfHideAll;
  window.notifyBanner = notifyBanner; window.notifyResult = notifyResult;
  /* ===== HỘP THOẠI CÓ NÚT (khung-thong-bao.webp đã vẽ sẵn nút Hủy + OK) =====
     • alert(msg)  → hộp thoại, bấm OK (hoặc Hủy / chạm ngoài khung / Enter / Esc) để đóng. Vẫn KHÔNG chặn code đang chạy.
     • notifyConfirm(msg) → Promise<true|false>: OK = true, Hủy = false.  Dùng:  if (!(await notifyConfirm('Bạn chắc chứ?'))) return;
       (confirm() của trình duyệt chạy ĐỒNG BỘ nên không thể đổi sang khung này mà không sửa chỗ gọi — mỗi chỗ gọi phải đổi sang await notifyConfirm.)
     Vùng bấm là 2 ô trong suốt đặt đè lên 2 nút vẽ trong ảnh: chỉnh NF_BTN nếu ảnh đổi bố cục (đơn vị % của khung). */
  const NF_BTN = { cancel: { l: 15, t: 73, w: 33, h: 16 }, ok: { l: 52, t: 73, w: 38, h: 16 }, text: { l: 10, t: 31, r: 10, b: 29 } };
  (function () {
    const b = NF_BTN, pos = o => `left:${o.l}%;top:${o.t}%;width:${o.w}%;height:${o.h}%`;
    const st = document.createElement('style');
    st.textContent = `#nf-dlg{position:fixed;inset:0;z-index:100001;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);-webkit-tap-highlight-color:transparent}
#nf-dlg.on{display:flex}
#nf-dlg .nf-box{position:relative;width:min(92vw,440px);user-select:none}
#nf-dlg .nf-img{display:block;width:100%;height:auto;pointer-events:none}
#nf-dlg .nf-dt{position:absolute;left:${b.text.l}%;right:${b.text.r}%;top:${b.text.t}%;bottom:${b.text.b}%;display:flex;overflow-y:auto;color:#fff;text-align:center;font-weight:700;line-height:1.35;text-shadow:0 1px 2px #000;word-break:break-word}
#nf-dlg .nf-dt>div{margin:auto;max-width:100%}
#nf-dlg .nf-b{position:absolute;background:transparent;border:0;padding:0;cursor:pointer;border-radius:12px;outline:none}
#nf-dlg .nf-b:active{background:rgba(255,255,255,.18)}
#nf-dlg .nf-bc{${pos(b.cancel)}}
#nf-dlg .nf-bo{${pos(b.ok)}}`;
    document.head.appendChild(st);
  })();
  let nfQ = [], nfCur = null;
  function nfEl() {
    let d = document.getElementById('nf-dlg');
    if (!d) {
      d = document.createElement('div'); d.id = 'nf-dlg';
      d.innerHTML = '<div class="nf-box"><img class="nf-img" src="giao-dien/thong-bao/khung-thong-bao.webp?v=4" alt=""><div class="nf-dt"><div></div></div><button class="nf-b nf-bc" aria-label="Hủy"></button><button class="nf-b nf-bo" aria-label="OK"></button></div>';
      document.body.appendChild(d);
      d.querySelector('.nf-bo').onclick = () => nfClose(true);
      d.querySelector('.nf-bc').onclick = () => nfClose(false);
      d.addEventListener('pointerdown', e => { if (e.target === d && nfCur && !nfCur.confirm) nfClose(true); });   // alert: chạm ngoài khung = đóng; confirm: phải bấm OK / Hủy
      window.addEventListener('keydown', e => { if (!nfCur) return; if (e.key === 'Enter') { e.preventDefault(); nfClose(true); } else if (e.key === 'Escape') { e.preventDefault(); nfClose(false); } }, true);
    }
    return d;
  }
  function nfShowNext() {
    if (nfCur || !nfQ.length) return;
    nfCur = nfQ.shift(); const d = nfEl(), txt = String(nfCur.msg == null ? '' : nfCur.msg).trim(), L = txt.length;
    const tx = d.querySelector('.nf-dt'); tx.firstChild.innerHTML = rich(txt).replace(/\n/g, '<br>');
    tx.style.fontSize = (L > 160 ? 11.5 : L > 110 ? 13 : L > 60 ? 14.5 : 16.5) + 'px'; tx.scrollTop = 0;
    d.classList.add('on');
  }
  function nfClose(ok) {
    const d = document.getElementById('nf-dlg'), c = nfCur; if (!c) return;
    nfCur = null; if (d) d.classList.remove('on');
    try { c.res(!!ok); } catch (e) {}
    setTimeout(nfShowNext, 0);
  }
  function nfDialog(msg, isConfirm) {
    return new Promise(res => {
      const last = nfQ.length ? nfQ[nfQ.length - 1] : nfCur;
      if (!isConfirm && last && !last.confirm && String(last.msg) === String(msg)) return res(true);   // alert trùng liên tiếp (vd bấm dồn) chỉ hiện 1 lần
      nfQ.push({ msg, confirm: !!isConfirm, res }); nfShowNext();
    });
  }
  window.notifyConfirm = msg => nfDialog(msg, true);
  window.notifyAlert = msg => nfDialog(msg, false);
  window.alert = function (m) { nfDialog(m, false); };   // alert() → hộp thoại có nút OK, vẫn không chặn code đang chạy
  try { if (typeof scToast === 'function') window.scToast = function (m) { notifyBanner(m); }; } catch (e) {}
  try { if (typeof toast === 'function') window.toast = function (m) { notifyBanner(m); }; } catch (e) {}
})();

;
/* === nạp trước ảnh giao diện === */
/* === NẠP TRƯỚC ẢNH GIAO DIỆN ===
   Trước đây icon/khung chỉ tải khi mở màn → mạng chậm thì chỗ hiện chỗ trống, ảnh nhảy vị trí. Giờ sau khi trang hiện xong, game tải ngầm icon/khung/ảnh tướng
   (tối đa 4 ảnh cùng lúc, lúc rảnh, không chặn trò chơi) để lúc mở màn đã có sẵn trong cache. Ảnh nặng (bản đồ Ải, sprite chiêu) vẫn tải khi cần. === */
(function () {
  const LIST = ["giao-dien/icon-home/thoi-bac.webp","giao-dien/icon-home/bang-hoi.webp","giao-dien/icon-home/bao-li-xi.webp","giao-dien/icon-home/bao-vat.webp","giao-dien/icon-home/cai-dat.webp","giao-dien/icon-home/chieu-mo.webp","giao-dien/icon-home/de-mo.webp","giao-dien/icon-home/cua-tiem.webp","giao-dien/icon-home/doi-ngu.webp","giao-dien/icon-home/gao.webp","giao-dien/icon-home/giang-ho.webp","giao-dien/icon-home/gift-code.webp","giao-dien/icon-home/hop-thu.webp","giao-dien/icon-home/ky-ngo.webp","giao-dien/icon-home/luyen-hoa.webp","giao-dien/icon-home/nhiem-vu.webp","giao-dien/icon-home/pve.webp","giao-dien/icon-home/pvp.webp","giao-dien/icon-home/su-kien.webp","giao-dien/icon-home/tang-cap.webp","giao-dien/icon-home/the-thang.webp","giao-dien/icon-home/thoi-vang.webp","giao-dien/icon-home/trang-bi.webp","giao-dien/icon-home/trang-chu.webp","giao-dien/icon-home/tui-do.webp","giao-dien/icon-home/vo-hiep.webp","giao-dien/icon-kihieu/bat_tu.png","giao-dien/icon-kihieu/cam_lang.png","giao-dien/icon-kihieu/chay_mau.png","giao-dien/icon-kihieu/chay_nhanh.png","giao-dien/icon-kihieu/choang.png","giao-dien/icon-kihieu/do_don.png","giao-dien/icon-kihieu/giam_bao.png","giao-dien/icon-kihieu/giam_bao_sat.png","giao-dien/icon-kihieu/giam_chinh_xac.png","giao-dien/icon-kihieu/giam_cong.png","giao-dien/icon-kihieu/giam_hoi.png","giao-dien/icon-kihieu/giam_hp.png","giao-dien/icon-kihieu/giam_ne.png","giao-dien/icon-kihieu/giam_no.png","giao-dien/icon-kihieu/giam_pha_giap.png","giao-dien/icon-kihieu/giam_thu.png","giao-dien/icon-kihieu/giam_toc.png","giao-dien/icon-kihieu/khang.png","giao-dien/icon-kihieu/khoa_tang_phuc.png","giao-dien/icon-kihieu/me_hoac.png","giao-dien/icon-kihieu/phong_an.png","giao-dien/icon-kihieu/tang_bao.png","giao-dien/icon-kihieu/tang_bao_sat.png","giao-dien/icon-kihieu/tang_chinh_xac.png","giao-dien/icon-kihieu/tang_cong.png","giao-dien/icon-kihieu/tang_hoi.png","giao-dien/icon-kihieu/tang_hp.png","giao-dien/icon-kihieu/tang_ne.png","giao-dien/icon-kihieu/tang_no.png","giao-dien/icon-kihieu/tang_pha_giap.png","giao-dien/icon-kihieu/tang_thu.png","giao-dien/icon-kihieu/tang_toc.png","giao-dien/icon-kihieu/thieu_dot.png","giao-dien/icon-kihieu/trung_doc.png","giao-dien/icon-home/linh-thu.webp","giao-dien/linh-thu/linh-thu.webp","giao-dien/linh-thu/manh-thu.webp","giao-dien/bao-vat/bao-vat.webp","giao-dien/bao-vat/manh-bao-vat.webp","giao-dien/tuong/boi_duong.webp","giao-dien/tuong/dot_pha.webp","giao-dien/tuong/ghep_manh.webp","giao-dien/tuong/giang_ho_ky.webp","giao-dien/tuong/kinh_mach.webp","giao-dien/tuong/ky_nang.webp","giao-dien/tuong/manh_vo_hiep.webp","giao-dien/tuong/tang_sao.webp","vat-pham-game/trang-bi/equipment-hat.webp?v=24","vat-pham-game/trang-bi/equipment-armor.webp?v=24","vat-pham-game/trang-bi/equipment-sword.webp?v=24","vat-pham-game/trang-bi/equipment-boots.webp?v=24","vat-pham-game/thoi-vang.webp","vat-pham-game/than-dan.webp","vat-pham-game/tien-dan.webp","vat-pham-game/vien-the-luc.webp","giao-dien/buc-may.webp","giao-dien/thong-bao/khung-thong-bao.webp?v=4","giao-dien/thong-bao/khung-thua.webp","giao-dien/thong-bao/khung-thang.webp","giao-dien/thong-bao/khung-chat.webp?v=1","giao-dien/icon-phuthe/cap-toc-1.png","giao-dien/icon-phuthe/cap-toc-2.png","giao-dien/icon-phuthe/cap-toc-3.png","giao-dien/icon-phuthe/cap-toc-4.png","giao-dien/icon-phuthe/cap-toc-5.png","giao-dien/icon-phuthe/cap-toc-6.png","giao-dien/icon-phuthe/cap-toc-7.png","giao-dien/icon-phuthe/gia-toc-1.png","giao-dien/icon-phuthe/gia-toc-2.png","giao-dien/icon-phuthe/gia-toc-3.png","giao-dien/icon-phuthe/gia-toc-4.png","giao-dien/icon-phuthe/gia-toc-5.png","giao-dien/icon-phuthe/gia-toc-6.png","giao-dien/icon-phuthe/gia-toc-7.png","giao-dien/icon-phuthe/ho-thuan-1.png","giao-dien/icon-phuthe/ho-thuan-2.png","giao-dien/icon-phuthe/ho-thuan-3.png","giao-dien/icon-phuthe/ho-thuan-4.png","giao-dien/icon-phuthe/ho-thuan-5.png","giao-dien/icon-phuthe/ho-thuan-6.png","giao-dien/icon-phuthe/ho-thuan-7.png","giao-dien/icon-phuthe/ho-toc-1.png","giao-dien/icon-phuthe/ho-toc-2.png","giao-dien/icon-phuthe/ho-toc-3.png","giao-dien/icon-phuthe/ho-toc-4.png","giao-dien/icon-phuthe/ho-toc-5.png","giao-dien/icon-phuthe/ho-toc-6.png","giao-dien/icon-phuthe/ho-toc-7.png","giao-dien/icon-phuthe/than-thuan-1.png","giao-dien/icon-phuthe/than-thuan-2.png","giao-dien/icon-phuthe/than-thuan-3.png","giao-dien/icon-phuthe/than-thuan-4.png","giao-dien/icon-phuthe/than-thuan-5.png","giao-dien/icon-phuthe/than-thuan-6.png","giao-dien/icon-phuthe/than-thuan-7.png","giao-dien/icon-phuthe/than-toc-1.png","giao-dien/icon-phuthe/than-toc-2.png","giao-dien/icon-phuthe/than-toc-3.png","giao-dien/icon-phuthe/than-toc-4.png","giao-dien/icon-phuthe/than-toc-5.png","giao-dien/icon-phuthe/than-toc-6.png","giao-dien/icon-phuthe/than-toc-7.png","giao-dien/icon-phuthe/tro-thuan-1.png","giao-dien/icon-phuthe/tro-thuan-2.png","giao-dien/icon-phuthe/tro-thuan-3.png","giao-dien/icon-phuthe/tro-thuan-4.png","giao-dien/icon-phuthe/tro-thuan-5.png","giao-dien/icon-phuthe/tro-thuan-6.png","giao-dien/icon-phuthe/tro-thuan-7.png","giao-dien/icon-phuthe/tro-toc-1.png","giao-dien/icon-phuthe/tro-toc-2.png","giao-dien/icon-phuthe/tro-toc-3.png","giao-dien/icon-phuthe/tro-toc-4.png","giao-dien/icon-phuthe/tro-toc-5.png","giao-dien/icon-phuthe/tro-toc-6.png","giao-dien/icon-phuthe/tro-toc-7.png","vat-pham-game/bao-vat/ton-su-ki.webp?v=25","vat-pham-game/bao-vat/ba-vuong-kiem.webp?v=25","vat-pham-game/bao-vat/treasure-09.webp","vat-pham-game/bao-vat/treasure-10.webp","vat-pham-game/bao-vat/treasure-11.webp","vat-pham-game/bao-vat/treasure-12.webp","vat-pham-game/bao-vat/treasure-13.webp","vat-pham-game/bao-vat/treasure-14.webp","vat-pham-game/bao-vat/treasure-15.webp","vat-pham-game/bao-vat/treasure-16.webp","vat-pham-game/bao-vat/treasure-17.webp","vat-pham-game/bao-vat/treasure-18.webp","vat-pham-game/bao-vat/treasure-19.webp","vat-pham-game/bao-vat/treasure-20.webp","vat-pham-game/bao-vat/treasure-21.webp","vat-pham-game/ky-nang/bi-kip.webp","vat-pham-game/ky-nang/vo-tu-thien-thu.webp","vat-pham-game/ky-nang/yeu-quyet.webp"];
  try { (window.HEROES || []).forEach(h => { if (h.img) LIST.unshift(h.img); if (h.body) LIST.push(h.body); }); } catch (e) {}
  // Phân ưu tiên theo thư mục: giao diện màn chính + ảnh đại diện tướng nạp ngay (prio 0); nhóm nặng của màn khác (phụ thể 5,9 MB, bảo vật 2 MB, thân tướng) chạy ngầm sau cùng (prio 2)
  const NOW = /^(icon-home|icon-kihieu|icons|trang-bi|vat-pham-game|ky-nang)\//;
  const heroImg = new Set((window.HEROES || []).map(h => h.img));
  GP.add(LIST.filter(u => NOW.test(u) || heroImg.has(u)), 0);
  GP.add(LIST.filter(u => !(NOW.test(u) || heroImg.has(u))), 2);
  GP.onStart(() => GP.add([].map.call(document.querySelectorAll('img[loading="lazy"]'), i => i.src), 2));   // ảnh của màn Giang Hồ / Bang Hội / Võ Hiệp... (đã đặt loading=lazy trong index.html): chạy ngầm sau cùng
})();
