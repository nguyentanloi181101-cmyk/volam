/* DEMO.JS — Chế độ DEMO tướng: chọn 1 tướng bất kỳ rồi xem Đứng yên (idle), Đánh thường, Ulti.
   Dùng đúng engine trận đấu thật (attack / ultimate / heroUltFn...) nên hiệu ứng, âm thanh giống hệt khi đánh thật.
   Gắn: thêm <script src="demo.js?v=1"></script> ngay SAU game.js trong index.html, và 1 nút gọi openDemo() ở trang chủ.
   Cảnh demo: tướng đứng phía trước + 2 đồng đội giả phía sau, đối diện 5 cọc gỗ (HP cực lớn, không bao giờ chết).
   Sau mỗi lần đánh / ulti cảnh tự dựng lại sạch (xóa buff / debuff) để xem lại nhiều lần.
   Riêng Thanh Y Tiên Tử: trước khi ulti, 2 đồng đội giả tự "gục" để thấy hiệu ứng hồi sinh. */
(function () {
  const D = { idx: 0, enemySide: false, hero: null, allies: [], foes: [], busy: false, open: false };
  const $ = id => document.getElementById(id);

  /* ================= CSS ================= */
  const css = document.createElement('style');
  css.textContent = `
#screen-demo{background:radial-gradient(circle at 50% 20%,#2b1d5a 0%,#0b1030 100%)}
.dm-sub{text-align:center;color:#fde68a;font-size:12px;padding:6px 10px 0}
.dm-grid{flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:10px 12px 28px;align-content:start}
.dm-card{border:2px solid #fde047;border-radius:10px;background:linear-gradient(180deg,#5a3a1f,#2a170a);padding:6px 4px;text-align:center;cursor:pointer;min-width:0}
.dm-card.p{border-color:#a855f7}
.dm-card:active{transform:scale(.96)}
.dm-card .e{aspect-ratio:1;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:40px}
.dm-card .e .hero-img{width:100%;height:100%;border:0;border-radius:0}
.dm-card .n{font-size:11px;font-weight:900;color:#fff;margin-top:4px;line-height:1.15}
.dm-card .u{font-size:9px;color:#fde68a;line-height:1.15;margin-top:2px}
/* trận demo: ẩn thanh nút + bảng đội hình + thanh máu của trận thường, dùng bảng điều khiển riêng */
#battle-overlay.demo-mode .bf-acts,#battle-overlay.demo-mode .bf-fit,#battle-overlay.demo-mode #pv-skip{display:none !important}
#battle-overlay.demo-mode .bf-unit .bf-hp,#battle-overlay.demo-mode .bf-unit.enemy .bf-hp{display:none !important}
#dm-ctl{display:none;position:absolute;left:0;right:0;bottom:0;height:25%;z-index:200;box-sizing:border-box;padding:6px 8px 8px;background:linear-gradient(180deg,#1b2a52,#0d1530);border-top:3px solid #7c8fd6;flex-direction:column;gap:5px}
#battle-overlay.demo-mode #dm-ctl{display:flex}
#dm-ctl .dm-info{flex:1;min-height:0;overflow-y:auto;line-height:1.3}
#dm-ctl .dm-info b{color:#fde047;font-size:15px}
#dm-ctl .dm-info em{font-style:normal;color:#93c5fd;font-size:11px;margin-left:6px}
#dm-ctl .dm-info .u{display:block;color:#fca5a5;font-size:12px;font-weight:800}
#dm-ctl .dm-info small{display:block;color:#cbd5e1;font-size:10.5px}
#dm-ctl .dm-row{display:flex;gap:5px}
#dm-ctl .dm-row button{flex:1 1 0;min-width:0;padding:8px 2px;font-size:13px;font-weight:900;border-radius:10px;border:2px solid #fde047;background:linear-gradient(180deg,#ea580c,#9a3412);color:#fff;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#dm-ctl .dm-row.sm button{padding:5px 2px;font-size:12px;background:linear-gradient(180deg,#3b82f6,#1e3a8a);border-color:#bfdbfe}
#dm-ctl .dm-row button.u{background:linear-gradient(180deg,#a855f7,#6b21a8);border-color:#e9d5ff}
#dm-ctl .dm-row button.x{background:linear-gradient(180deg,#4b5563,#1f2937);border-color:#9ca3af}
#dm-ctl .dm-row button:disabled{filter:grayscale(1) brightness(.7);cursor:default}
`;
  document.head.appendChild(css);

  /* ================= MÀN CHỌN TƯỚNG ================= */
  const sc = document.createElement('div');
  sc.className = 'screen'; sc.id = 'screen-demo';
  sc.innerHTML = '<div class="pve-header"><button class="btn-back" onclick="switchScreen(\'home\')">Trở về</button><h2 class="pve-title">Demo Tướng</h2></div>' +
    '<div class="dm-sub">Chọn tướng để xem Đứng yên • Đánh thường • Ulti</div><div class="dm-grid" id="dm-grid"></div>';
  document.querySelector('.main-content').appendChild(sc);

  window.openDemo = function () {
    $('dm-grid').innerHTML = HEROES.map((h, i) =>
      `<div class="dm-card ${(HERO_BORDER[h.id] || 'orange') === 'purple' ? 'p' : ''}" onclick="demoOpen(${i})"><div class="e">${heroIcon(h)}</div><div class="n">${h.name}</div><div class="u">${HERO_ULT_NAME[h.id] || ''}</div></div>`).join('');
    switchScreen('demo');
  };

  /* ================= BẢNG ĐIỀU KHIỂN TRONG TRẬN ================= */
  const ctl = document.createElement('div');
  ctl.id = 'dm-ctl';
  ctl.innerHTML = '<div class="dm-info"><b id="dm-name"></b><em id="dm-idx"></em><span class="u" id="dm-ult"></span><small id="dm-desc"></small></div>' +
    '<div class="dm-row sm"><button id="dm-prev">◀ Trước</button><button id="dm-next">Sau ▶</button><button id="dm-side"></button><button id="dm-slow"></button></div>' +
    '<div class="dm-row"><button data-a="idle">Đứng Yên</button><button data-a="atk">Đánh Thường</button><button data-a="ult" class="u">Ulti</button><button id="dm-exit" class="x">Thoát</button></div>';
  $('battle-overlay').appendChild(ctl);

  const setBtns = on => ctl.querySelectorAll('button').forEach(b => { if (b.id !== 'dm-exit') b.disabled = !on; });
  const updateSlow = () => { $('dm-slow').textContent = 'Chậm: ' + (battleSlow === 2 ? 'BẬT' : 'TẮT'); };
  const updateSide = () => { $('dm-side').textContent = 'Phe: ' + (D.enemySide ? 'Địch' : 'Ta'); };

  /* ================= DỰNG CẢNH ================= */
  function build() {
    $('bf-units').innerHTML = '';
    try { ttSetupUI(null, null); } catch (e) {}
    const h = HEROES[D.idx], s = heroBattleStats(h.id, true, {});
    const es = D.enemySide, hs = es ? 'enemy' : 'hero', fs = es ? 'hero' : 'enemy', mx = x => es ? 100 - x : x;
    const T = HERO_POS[3].map(p => [mx(p[0]), p[1] + HERO_DY]);            // tướng đứng trước, 2 đồng đội giả phía sau
    const F = HERO_POS[5].map(p => [mx(100 - p[0]), p[1] + HERO_DY]);      // 5 cọc gỗ phía đối diện

    const u = makeUnit(hs, heroIcon(h), T[0][0], T[0][1], s.hp, s.atk, false, h.name);
    Object.assign(u, { id: h.id, emoji: heroIcon(h), def: s.def, spd: s.spd, dodge: s.dodge, acc: s.acc, crit: s.crit, critDmg: s.critDmg, tough: s.tough, pierce: s.pierce, tia: s.tia || 1, block: s.block, regen: 0,
      sk: skillMult(h.id), alwaysUlt: !!h.alwaysUlt, taunt: !!h.taunt, prio2: !!h.prio2, rage: h.startRage || 0, acted: false });
    if (es) u.isHero = true;
    grantStart(u);

    const allies = [1, 2].map(i => { const a = makeUnit(hs, '🧍', T[i][0], T[i][1], 1e6, 0, false, 'Đồng đội'); a.spd = 0; return a; });
    const foes = F.map(p => { const d = makeUnit(fs, '🪵', p[0], p[1], 1e9, 0, false, 'Cọc gỗ'); d.spd = 0; d.acc = 0; return d; });

    waveUnits = es ? { heroes: foes, enemies: [u, ...allies] } : { heroes: [u, ...allies], enemies: foes };
    D.hero = u; D.allies = allies; D.foes = foes;

    $('dm-name').textContent = h.name;
    $('dm-idx').textContent = (D.idx + 1) + '/' + HEROES.length + ' • ' + (ROLE_NAME[roleOf(h.id)] || '');
    $('dm-ult').textContent = '💥 ' + (HERO_ULT_NAME[h.id] || 'Tuyệt kỹ');
    let d = ''; try { d = heroUltShort(h.id) || ''; } catch (e) {}
    $('dm-desc').textContent = d;
    updateSide();
    try { refreshPanel(); } catch (e) {}
  }

  window.demoOpen = function (i) {
    D.idx = i; D.open = true; D.busy = false;
    battleToken++;
    pvp = null; bossB = null; ghB = null; busy = false; isPlayerTurn = false; battleFast = false; ultTimeScale = 1;
    const o = $('battle-overlay');
    o.classList.remove('pvp-mode'); o.classList.add('demo-mode'); o.style.display = 'flex';
    $('ui-stage-title').innerText = 'DEMO'; $('ui-wave-title').innerText = ''; $('ui-enemy-name').innerText = '';
    build(); setBtns(true); updateSlow();
  };

  function close() {
    D.open = false; D.busy = false; battleToken++; battleFast = false; ultTimeScale = 1;
    try { stopHeroSounds(); } catch (e) {}
    try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {}
    $('bf-units').innerHTML = ''; waveUnits = { heroes: [], enemies: [] };
    const o = $('battle-overlay'); o.classList.remove('demo-mode'); o.style.display = 'none';
    switchScreen('demo');
  }

  /* ================= HÀNH ĐỘNG ================= */
  async function act(kind) {
    if (!D.open || D.busy) return;
    if (kind === 'idle') { build(); return; }
    D.busy = true; setBtns(false);
    const tok = battleToken, u = D.hero;
    try {
      if (kind === 'ult') {
        if (u.id === 1) D.allies.forEach(a => { a.alive = false; a.hp = 0; a.el.classList.add('dead'); setHpBar(a); });   // Thanh Y: cần đồng đội gục để hồi sinh
        u.rage = 100; u.stun = 0;
        await ultimate(u, tok);
        await sleep(1200);
      } else {
        await normalAttack(u, foesOf(u), tok);
        await sleep(600);
      }
    } catch (e) { console.warn('demo', e); }
    finally {
      if (tok === battleToken && D.open) { D.busy = false; build(); setBtns(true); }   // dựng lại cảnh sạch để xem tiếp
    }
  }

  ctl.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => act(b.dataset.a)));
  $('dm-exit').addEventListener('click', close);
  const nav = d => { if (D.busy) return; D.idx = (D.idx + d + HEROES.length) % HEROES.length; build(); };
  $('dm-prev').addEventListener('click', () => nav(-1));
  $('dm-next').addEventListener('click', () => nav(1));
  $('dm-side').addEventListener('click', () => { if (D.busy) return; D.enemySide = !D.enemySide; build(); });
  $('dm-slow').addEventListener('click', () => { toggleSlow(); updateSlow(); });
})();
