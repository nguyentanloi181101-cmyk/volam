/* Cloud Function nhận webhook SePay (https://sepay.vn) — Node 18+, firebase-functions v2, gói Blaze.
   Luồng: người chơi tạo orders/{NAPxxxxxxxx} (client) → chuyển khoản QR kèm mã đó → SePay báo về đây
          → cộng ĐIỂM + VÀNG (cộng dồn) vào topup/{uid}; game tự cộng vàng vào tài khoản.
   Cài:  firebase functions:secrets:set SEPAY_KEY     (chuỗi bí mật bạn tự đặt, cũng dán vào ô API Key khi tạo webhook ở SePay)
   SePay: Webhooks → Thêm → URL = địa chỉ hàm payWebhook, kiểu chứng thực API Key, Content-Type JSON. */
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin'); admin.initializeApp();
const crypto = require('crypto');
const db = admin.firestore(), FV = admin.firestore.FieldValue;
const SEPAY_KEY = defineSecret('SEPAY_KEY');

const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

exports.payWebhook = onRequest({ secrets: [SEPAY_KEY] }, async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ success: false });
    if (!safeEq(req.get('authorization') || '', 'Apikey ' + SEPAY_KEY.value())) return res.status(401).json({ success: false });
    const b = req.body || {};
    if (b.transferType !== 'in') return res.status(200).json({ success: true });          // bỏ qua tiền ra
    const amount = Number(b.transferAmount), txId = String(b.id || '');
    if (!txId || !(amount >= 1000)) return res.status(200).json({ success: true });
    const m = (String(b.code || '') + ' ' + String(b.content || '')).toUpperCase().match(/NAP[0-9A-F]{8}/);   // mã đơn trong nội dung CK
    const cfgSnap = await db.collection('topup_cfg').doc('main').get(), cfg = cfgSnap.exists ? cfgSnap.data() : {};
    const per1000 = Number(cfg.per1000) || 3, goldPt = Number(cfg.goldPt) || 10;
    const txRef = db.collection('txns').doc(txId);
    await db.runTransaction(async tx => {
      if ((await tx.get(txRef)).exists) return;                                            // SePay gọi lặp → bỏ qua, không cộng 2 lần
      const t = Date.now();
      const oref = m ? db.collection('orders').doc(m[0]) : null, o = oref ? await tx.get(oref) : null;
      if (!o || !o.exists) { tx.set(txRef, { amount, content: String(b.content || ''), status: 'no_order', t }); return; }   // lưu lại để admin đối soát tay
      const uid = o.data().uid, pts = Math.floor(amount * per1000 / 1000), gold = pts * goldPt;
      tx.set(txRef, { uid, order: oref.id, amount, pts, gold, status: 'paid', t });
      tx.update(oref, { status: 'paid', paidAt: t });
      tx.set(db.collection('topup').doc(uid), { points: FV.increment(pts), gold: FV.increment(gold), totalVnd: FV.increment(amount) }, { merge: true });   // vàng tự cộng vào game khi người chơi mở game (xem nap.js)
    });
    res.status(200).json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ success: false }); }
});
