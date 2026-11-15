/* WORKER.JS — Nhận webhook SePay, tự gửi quà + vàng vào HỘP THƯ người chơi.
   Chạy MIỄN PHÍ trên Cloudflare Workers (không cần gói Blaze / Cloud Functions của Firebase).
   Luồng: nap.html tạo orders/{NAPxxxxxxxx} → CK QR kèm mã → SePay POST về đây →
          cộng điểm vào topup/{uid} + tạo thư mail_inbox/{uid}/msgs/* (vàng + quà các mốc vừa đạt).
   Secrets cần đặt (wrangler secret put ...):
     SEPAY_KEY    chuỗi bí mật bạn tự đặt (dán cùng vào ô API Key khi tạo webhook ở SePay)
     FIREBASE_SA  toàn bộ nội dung file JSON service account (Firebase Console → Project settings → Service accounts → Generate new private key)
   Biến thường (wrangler.toml [vars]):  PROJECT_ID = "game-118e8"                                                        */

const DEF_NEEDS = [150, 500, 1000, 2000, 5000, 10000, 20000];
const fmt = n => Number(n || 0).toLocaleString('vi-VN');

/* ---------- Firestore REST ---------- */
const dec = v => { if ('stringValue' in v) return v.stringValue; if ('integerValue' in v) return Number(v.integerValue); if ('doubleValue' in v) return v.doubleValue; if ('booleanValue' in v) return v.booleanValue; if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec); if ('mapValue' in v) return decF(v.mapValue.fields || {}); return null; };
const decF = f => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, dec(v)]));
const enc = v => typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) : v == null ? { nullValue: null } : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : { mapValue: { fields: encF(v) } };
const encF = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, enc(v)]));

const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uS = s => b64u(new TextEncoder().encode(s));
let tok = { v: '', exp: 0 };
async function token(env) {
  if (tok.v && Date.now() < tok.exp) return tok.v;
  const sa = JSON.parse(env.FIREBASE_SA), now = Math.floor(Date.now() / 1000);
  const head = b64uS(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64uS(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const der = Uint8Array.from(atob(sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = b64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(head + '.' + claim)));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + head + '.' + claim + '.' + sig });
  const j = await r.json(); if (!j.access_token) throw new Error('token: ' + JSON.stringify(j));
  tok = { v: j.access_token, exp: Date.now() + 3300e3 }; return tok.v;
}
async function fs(env, path, body) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${env.PROJECT_ID}/databases/(default)/documents${path}`, { method: 'POST', headers: { authorization: 'Bearer ' + await token(env), 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json(); if (!r.ok) { const e = new Error('firestore ' + r.status + ' ' + JSON.stringify(j)); e.status = r.status; throw e; } return j;
}
async function getDocs(env, txn, paths) {   // đọc trong transaction → { path: data | null }
  const base = `projects/${env.PROJECT_ID}/databases/(default)/documents/`;
  const res = await fs(env, ':batchGet', { documents: paths.map(p => base + p), transaction: txn }), out = {};
  paths.forEach(p => { out[p] = null; });
  res.forEach(x => { if (x.found) out[x.found.name.slice(base.length)] = decF(x.found.fields || {}); });
  return out;
}

/* ---------- xử lý 1 giao dịch ---------- */
async function process(env, b) {
  const amount = Number(b.transferAmount), txId = String(b.id || '').replace(/[^\w-]/g, '');
  const m = (String(b.code || '') + ' ' + String(b.content || '')).toUpperCase().match(/NAP[0-9A-F]{8}/);
  const doc = p => `projects/${env.PROJECT_ID}/databases/(default)/documents/${p}`;
  const txn = (await fs(env, ':beginTransaction', { options: { readWrite: {} } })).transaction;
  const d1 = await getDocs(env, txn, ['txns/' + txId, 'topup_cfg/main', ...(m ? ['orders/' + m[0]] : [])]);
  if (d1['txns/' + txId]) return;                                                       // SePay gọi lặp → bỏ qua
  const t = Date.now(), order = m ? d1['orders/' + m[0]] : null, cfg = d1['topup_cfg/main'] || {};
  const writes = [];
  if (!order || !order.uid) {                                                           // không khớp đơn → lưu để admin đối soát tay
    writes.push({ update: { name: doc('txns/' + txId), fields: encF({ amount, content: String(b.content || ''), status: 'no_order', t }) }, currentDocument: { exists: false } });
  } else {
    const uid = order.uid, per1000 = Number(cfg.per1000) || 3, goldPt = Number(cfg.goldPt) || 10;
    const pts = Math.floor(amount * per1000 / 1000), gold = pts * goldPt;
    const cur = (await getDocs(env, txn, ['topup/' + uid]))['topup/' + uid] || {};
    const oldPts = Number(cur.points) || 0, newPts = oldPts + pts;
    const needs = Array.isArray(cfg.needs) && cfg.needs.length ? cfg.needs.map(Number) : DEF_NEEDS;
    const mail = (id, title, body, gifts) => writes.push({ update: { name: doc(`mail_inbox/${uid}/msgs/${id}`), fields: encF({ title, body, gifts, t, exp: 0, claimed: false }) }, currentDocument: { exists: false } });
    if (gold > 0) mail('nap_' + txId, `💰 Nạp ${fmt(amount)}đ`, `Bạn vừa nạp ${fmt(amount)}đ = ${fmt(pts)} điểm. Nhận ${fmt(gold)} vàng.`, [{ t: 'gold', n: gold }]);
    needs.forEach((need, i) => {                                                         // mốc vừa vượt qua trong lần nạp này
      const gifts = (((cfg.rows || [])[i]) || {}).gifts;
      if (need > oldPts && need <= newPts && Array.isArray(gifts) && gifts.length) mail(`moc${i}_${txId}`, `🎁 Quà mốc tích điểm ${fmt(need)}`, `Chúc mừng! Điểm nạp của bạn đạt ${fmt(newPts)}, nhận quà mốc ${fmt(need)} điểm.`, gifts);
    });
    writes.push({ update: { name: doc('txns/' + txId), fields: encF({ uid, order: m[0], amount, pts, gold, status: 'paid', t }) }, currentDocument: { exists: false } });
    writes.push({ update: { name: doc('orders/' + m[0]), fields: encF({ status: 'paid', paidAt: t }) }, updateMask: { fieldPaths: ['status', 'paidAt'] } });
    writes.push({ update: { name: doc('topup/' + uid), fields: encF({ points: newPts, totalVnd: (Number(cur.totalVnd) || 0) + amount }) }, updateMask: { fieldPaths: ['points', 'totalVnd'] } });
  }
  await fs(env, ':commit', { writes, transaction: txn });
}

export default {
  async fetch(req, env) {
    const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
    if (req.method !== 'POST') return J({ success: false }, 405);
    if ((req.headers.get('authorization') || '') !== 'Apikey ' + env.SEPAY_KEY) return J({ success: false }, 401);
    let b; try { b = await req.json(); } catch (e) { return J({ success: false }, 400); }
    if (b.transferType !== 'in') return J({ success: true });                            // bỏ qua tiền ra
    if (!b.id || !(Number(b.transferAmount) >= 1000)) return J({ success: true });
    for (let k = 0; k < 3; k++) {                                                        // transaction xung đột (409) → thử lại
      try { await process(env, b); return J({ success: true }); }
      catch (e) { console.error(e.message); if (e.status !== 409 && e.status !== 400) break; }
    }
    return J({ success: false }, 500);                                                   // SePay sẽ tự gọi lại
  }
};
