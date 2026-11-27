/* hero-data.js — dữ liệu tướng, nạp NGAY TRƯỚC game.js (bộ nạp ở đầu game.js đọc window.HERO_DATA).
   Khối dưới đây là bản sao NGUYÊN VĂN "SƠ ĐỒ BẮT BUỘC" ở đầu game.js. Nếu hai bản lệch nhau thì game.js là bản đúng. */

/* ████████████████████████████████████████████████████████████████████████████████████████████████████████████
   ██  SƠ ĐỒ BẮT BUỘC — AI/NGƯỜI NÀO SỬA game.js HOẶC LÀM TƯỚNG MỚI PHẢI ĐỌC HẾT KHỐI NÀY TRƯỚC KHI GÕ DÒNG ĐẦU TIÊN  ██
   ████████████████████████████████████████████████████████████████████████████████████████████████████████████

   ▌A. HIỆU LỰC TUYỆT KỸ (HL) — LUẬT CỦA CHỦ GAME, KHÔNG ĐƯỢC TỰ Ý ĐỔI
   ────────────────────────────────────────────────────────────────────────────────────────────────────────────
   1) HL GỐC (cấp kỹ năng 1, phẩm chất A) THEO CHẤT TƯỚNG:
        Công kích (atk) 150%  •  Kỹ năng (skill) 75%  •  Hỗ trợ (sup) 100%  •  Trị liệu (heal) 180%  •  Thủ (tank) 250%
   2) NÂNG CẤP KỸ NĂNG: có 9 lần nâng (Lv1 → Lv10), MỖI LẦN NÂNG CỘNG THÊM +7% vào HL.
   3) NÂNG PHẨM CHẤT TƯỚNG (A → SSS, 6 bậc): MỖI BẬC CỘNG THÊM +15% vào HL.
   4) CÔNG THỨC:  HL = HL gốc theo chất  +  7% × (cấp kỹ năng − 1)  +  15% × bậc phẩm chất       ← CHỈ CỘNG.
      KHÔNG CÓ KHÁI NIỆM "NHÂN" Ở ĐÂY: không nhân hệ số riêng của tướng, không nhân chồng giữa cấp kỹ năng / phẩm chất / sao.
      VD tướng Công kích Lv10 phẩm chất A: 150 + 7×9 = 213%.  Cùng tướng đó phẩm chất SSS: 213 + 15×6 = 303%.
      (Cấp tướng +3%/cấp và sao +10%/sao là tăng CHỈ SỐ HP/Công/Thủ, cũng CỘNG DỒN không nhân chồng.)
   5) SÁT THƯƠNG TUYỆT KỸ: TỔNG sát thương "Công − Thủ" của 1 lần ulti = Công × HL. Đánh bao nhiêu lần thì CHIA ĐỀU ra đủ tổng đó.
        VD Công 100, HL 150%, đánh 7 lần → 7 lần cộng lại chỉ = 150 (mỗi lần ≈ 21,4).
      RIÊNG BẠO (critDmg) và PHÁ GIÁP (pierce) KHÔNG chia: MỖI LẦN ĐÁNH tính đủ một lần.
        VD Phá giáp 100, đánh 7 lần → 700 (Bạo cũng vậy).  Engine đã làm đúng việc này trong strike() / calcDmg(): đừng chia pierce/crit.
      Mọi con số "× Công" khác của chiêu (hồi máu…) cũng lấy từ HL (chưa có xác nhận riêng của chủ game — hỏi lại nếu làm chiêu hồi máu mới).
   6) KHÔNG ĐƯỢC đặt hệ số nhân riêng từng tướng kiểu X_MULT = 3 rồi nhân với HL. Số đánh (X_HITS) thì được.

   ▌B. TRẠNG THÁI HIỆN TẠI CỦA CODE SO VỚI LUẬT A  (đọc kỹ — code ĐANG LỆCH luật, CHƯA được chuyển đổi)
   ────────────────────────────────────────────────────────────────────────────────────────────────────────────
     • skillBaseOf / PROG_CFG đang dùng gốc Kỹ năng 60 • Công kích 150 • Hỗ trợ/Trị liệu/Thủ 100  → luật A.1 cần: 75 • 150 • 100 • 180 • 250.
     • skillStepOf đang cộng 5/10/15% theo loại sách (Bí Kíp/Yếu Quyết/Vô Tự Thiên Thư) → luật A.2 cần cố định +7% mỗi lần nâng.
     • QL_TABLE (phẩm chất) đang là bảng tay, bậc nhảy không đều → luật A.3 cần +15%/bậc.
     • Mọi chiêu đang tính  Công × X_MULT × u.sk  (X_MULT nằm trong skillConfig từng tướng, vd DY_MULT = 3) → vi phạm A.5/A.6.
       Màn Nâng Kỹ Năng vì thế hiển thị "Hiệu lực 2095%" nhưng mô tả chiêu ghi "tổng 6285% Công" (= HL × DY_MULT).
     • Tướng mới (Ngộ Không NK_MULT / NK_STAFF_MULT) làm theo kiểu cũ này cho đồng bộ; khi chuyển đổi phải đổi cùng lúc với mọi tướng.
     → Khi được chủ game giao việc "chuyển đổi theo luật A": sửa skillBaseOf, skillStepOf, QL_TABLE, ĐỒNG THỜI bỏ X_MULT khỏi MỌI chiêu
       (tổng sát thương = u.atk × u.sk, chia đều số đánh) và đổi mô tả ở khối "Cần đầy 100 nộ…" (id === N) cho khớp. Không sửa nửa vời từng chỗ.
     ✔ ĐÃ CHUYỂN ĐỔI theo luật A (17/11/2026): skillBaseOf/skillStepOf/phẩm chất đã CỘNG đúng luật; mọi chiêu tính tổng = u.atk × u.sk chia đều số đánh;
       ulti chung + lính phụ đã bỏ ULT_MULT. Các khóa X_MULT còn trong skillConfig/SKILL_SHARED chỉ là cấu hình CŨ không còn tác dụng (giữ lại, KHÔNG xóa).

   ▌C. CHECKLIST LÀM TƯỚNG MỚI (thiếu mục nào là lỗi)
   ────────────────────────────────────────────────────────────────────────────────────────────────────────────
     1. Khai báo tướng trong bộ nạp ở ĐẦU file (khối "if (!window.HERO_DATA.heroes.some(h => h.id === N))"): id DUY NHẤT (hiện dùng tới 34 = Diêm La Vương; tướng muốn Nộ khởi đầu riêng thì thêm startRage: N vào khai báo),
        slug (thư mục heros/<slug>/), img/body/audio, stats, combat, role (skill|atk|sup|heal|tank), idle {sheet,h,ms}, ultFn, sprites, skillConfig.
        id/ảnh/sprite phải kiểm tra file thật; cw/ch/n của sprite = kích thước ảnh ÷ số khung (đo thật, đừng đoán).
     1b. ID TƯỚNG MỚI — BẮT BUỘC CẢ HAI: id = số 5 chữ số NGẪU NHIÊN không trùng (10000-99999, không dùng 0-34 cũ) + trường key = tên tướng viết liền không dấu (Diêm La Vương → 'diemlavuong') phải = joinName(name).
         Sai 1 trong 2 hoặc trùng → bộ nạp BỎ tướng + báo lỗi Console. Tướng cũ 0-34 khai cặp ở bảng HERO_UID (bộ nạp). Nhớ thêm tướng vào admin.html (DEF.heroes: uid + key) và bảng HERO_UID phải y hệt.
     2. Viết hàm tuyệt kỹ  async function <ultFn>(u, tok)  (khai báo toàn cục, tên trùng ultFn). Mẫu: thietPhienUlt / duongTienUlt / ngoKhongUlt.
     3. Thêm mô tả chiêu Ở HAI CHỖ:  nhánh  else if (id === N) ult = `...`  (đặt TRƯỚC nhánh "else ult" cuối)  và  case N:  trong switch rút gọn (trước default).
     4. Vai trò (role) quyết định Nộ khởi đầu / alwaysUlt / ưu tiên bị đánh (ROLE_RULE): skill = lượt nào cũng ulti; không tự đặt lại.
     5. Chạy node --check game.js trước khi giao. Sửa xong nhắc chủ game tăng ?v= của game.js trong index.html.

   ▌D. LỖI ĐÃ GẶP — CẤM LẶP LẠI
   ────────────────────────────────────────────────────────────────────────────────────────────────────────────
     • ĐỠ ĐÒN là % có sẵn (0–100): tăng/giảm bằng blockMod(t, phân_số, hiệp, 'buff'|'debuff', tag) (+100% = +100 điểm). CẤM pctMod cho Đỡ đòn
       (pctMod nhân với giá trị hiện có, mà đa số tướng = 0 → +0: không buff, không hiện icon). Đỡ đòn 100% = miễn hẳn sát thương Công & Bạo, chỉ Phá giáp còn xuyên.
     • "Bỏ qua Thủ": gọi skillHit(t, raw + t.def, u) (cộng lại phần Thủ sẽ bị trừ); Đỡ đòn vẫn giảm bình thường. Không tự viết công thức hit() riêng.
     • Mọi chiêu ĐÁNH ĐÚNG mục tiêu đã chọn: mục tiêu chết giữa chừng thì BỎ QUA, KHÔNG chuyển sang địch khác (sẽ chết lan thêm người).
     • Đồng bộ thời gian: trong 1 chiêu chỉ dùng MỘT đồng hồ. Hiệu ứng/sát thương dùng at(ms, fn) (= setTimeout theo seqT); chờ giữa các pha dùng
       wait(ms) cùng đồng hồ đó. KHÔNG trộn sleep(seqT(..)) với at() — lệch nhịp (gậy rơi trước phân thân).
     • Mọi thứ tạm (phần tử, timer, animation, visibility đã ẩn) phải dọn trong finally; kiểm tra tok !== battleToken sau mỗi lần await.
     • Chỉ số khai báo trong skillConfig tự thành biến toàn cục (SKILL_DEF); admin chỉnh được ở tab Chiêu thức. Đặt tên theo tiền tố tướng (NK_, DY_…).
   ============================================================================================================== */

window.HERO_DATA = {
  heroes: [
  // ===== 0 · Tà Đế =====
  {
    "slug": "ta-de",
    "id": 0,
    "name": "Tà Đế",
    "emoji": "👑",
    "role": "atk",
    "img": "ta-de.webp?v=1",
    "body": "ta-de-body.webp?v=1",
    "bodyH": 82,
    "stats": { "hp": 2800, "atk": 340, "spd": 60 },
    "combat": { "def": 30, "dodge": 10, "acc": 300, "crit": 40, "critDmg": 4, "tough": 5, "pierce": 30, "block": 0 },
    "tia": 1,
    "constants": { "lv": 70, "star": 5, "border": "purple", "ultName": "Tà Đế Ngũ Trảm" },
    "audio": "00-ta-de.mp3?v=1",
    "sprites": {
      "tdeIdle": { "src": "ta-de-idle.webp?v=2", "cw": 298, "ch": 280, "n": 16, "face": "R" },
      "tdeTele": { "src": "ta-de-tele.webp?v=1", "cw": 296, "ch": 296, "n": 18, "drop": 0.05 },
      "tdeSlash1": { "src": "ta-de-slash1.webp?v=1", "cw": 264, "ch": 150, "n": 7 },
      "tdeSlash2": { "src": "ta-de-slash2.webp?v=1", "cw": 256, "ch": 230, "n": 7 },
      "tdeSlash3": { "src": "ta-de-slash3.webp?v=1", "cw": 238, "ch": 148, "n": 7 },
      "tdeSlash4": { "src": "ta-de-slash4.webp?v=1", "cw": 248, "ch": 146, "n": 7 },
      "tdeSlash5": { "src": "ta-de-slash5.webp?v=1", "cw": 244, "ch": 160, "n": 7 },
      "tdeSlash6": { "src": "ta-de-slash6.webp?v=1", "cw": 240, "ch": 190, "n": 7 }
    },
    "idle": { "sheet": "tdeIdle", "h": 120, "ms": 3300 },
    "ultFn": "taDeUlt",
    "skillConfig": { "TADE_HITS": 5, "TADE_MULT": 1, "TADE_SLOW": 0.3, "TADE_SLOW_TURNS": 2, "TADE_PIERCE": 5000, "TADE_PIERCE_TURNS": 2 },
    "skillNote": "Tà Đế: dịch chuyển sang địch rồi chém 5 nhát từ nhiều hướng, tổng 100% Công lên toàn địch (mỗi nhát 20%); mỗi nhát giảm 30% Tốc toàn địch 2 hiệp (không cộng dồn); BỎ QUA bất tử (giết được cả tướng bất tử); toàn đội ta +5000 Phá giáp 2 hiệp"
  },

  // ===== 1 · Thanh Y Tiên Tử =====
  {
    "slug": "thanh-y",
    "id": 1,
    "name": "Thanh Y Tiên Tử",
    "emoji": "🌿",
    "role": "heal",
    "img": "thanh-y-tien-tu.webp",
    "body": "thanh-y-tien-tu-body.webp",
    "bodyH": 80,
    "stats": { "hp": 3200, "atk": 280, "spd": 45 },
    "combat": { "def": 45, "dodge": 5, "acc": 300, "crit": 10, "critDmg": 2, "tough": 10, "pierce": 10, "block": 5 },
    "tia": 1,
    "constants": { "lv": 73, "star": 5, "border": "orange", "ultName": "Thanh Liên Hoàn Sinh" },
    "audio": "01-thanh-y-tien-tu.mp3?v=2",
    "sprites": {
      "thyIdle": { "src": "thanh-y-tien-tu-idle.webp?v=71", "cw": 214, "ch": 250, "n": 44, "face": "R" },
      "thyLeaf": { "src": "thanh-y-leaf.webp", "cw": 334, "ch": 235, "n": 20 },
      "thyLotus": { "src": "thanh-y-lotus.webp", "cw": 307, "ch": 256, "n": 20 }
    },
    "idle": { "sheet": "thyIdle", "h": 120, "ms": 3300 },
    "ultFn": "reviveUlt",
    "skillConfig": { "REVIVE_COUNT": 2, "REVIVE_HP_PCT": 0.5, "IMMORTAL_TURNS": 3 },
    "skillNote": "Thanh Y Tiên Tử: hồi sinh 2 đồng đội với 50% HP; bất tử 3 hiệp đầu mỗi trận"
  },

  // ===== 2 · Hằng Nga =====
  {
    "slug": "hang-nga",
    "id": 2,
    "name": "Hằng Nga",
    "emoji": "🌙",
    "role": "sup",
    "img": "hang-nga.webp?v=1",
    "body": "hang-nga-body.webp?v=1",
    "bodyH": 82,
    "stats": { "hp": 3000, "atk": 300, "spd": 55, "startRage": 100, "alwaysUlt": true },
    "combat": { "def": 40, "dodge": 8, "acc": 300, "crit": 15, "critDmg": 3, "tough": 15, "pierce": 15, "block": 10 },
    "tia": 1,
    "constants": { "lv": 70, "star": 5, "border": "purple", "ultName": "Nguyệt Quang Hộ Thể" },
    "sprites": {
      "hnIdle": { "src": "hang-nga-idle.webp?v=1", "cw": 302, "ch": 280, "n": 20, "face": "R" },
      "hnCast": { "src": "hang-nga-ult.webp?v=1", "cw": 302, "ch": 280, "n": 24 }
    },
    "idle": { "sheet": "hnIdle", "h": 129, "ms": 1600 },
    "ultFn": "hangNgaUlt",
    "skillConfig": { "MOON_TURNS": 2, "MOON_REFLECT": 0.4, "MOON_TAKE": 0.5 },
    "skillNote": "Hằng Nga: giải mọi hiệu ứng xấu cả đội, khiên 2 hiệp, phản 40% sát thương cho địch, đồng đội chỉ nhận 50%"
  },

  // ===== 3 · Độc Cô Cầu Bại =====
  {
    "slug": "doc-co-cau-bai",
    "id": 3,
    "name": "Độc Cô Cầu Bại",
    "emoji": "🧔🏻‍♂️",
    "role": "atk",
    "img": "doc-co-cau-bai.webp",
    "body": "doc-co-cau-bai-body.webp",
    "bodyH": 80,
    "stats": { "hp": 2900, "atk": 360, "spd": 50 },
    "combat": { "def": 35, "dodge": 10, "acc": 300, "crit": 50, "critDmg": 5, "tough": 5, "pierce": 40, "block": 0 },
    "tia": 1,
    "constants": { "lv": 70, "star": 4, "border": "orange", "ultName": "Độc Cô Cửu Kiếm" },
    "audio": "03-doc-co-cau-bai.mp3?v=2",
    "sprites": {
      "dcIdle": { "src": "doc-co-idle.webp?v=60", "cw": 335, "ch": 284, "n": 20, "drop": 0.03, "face": "R" },
      "dcCast": { "src": "doc-co-ult.webp?v=60", "cw": 366, "ch": 305, "n": 15, "drop": -0.05 },
      "dcSword": { "src": "doc-co-sword.webp?v=60", "cw": 307, "ch": 256, "n": 20 }
    },
    "idle": { "sheet": "dcIdle", "h": 120, "ms": 1500 },
    "ultFn": "duCoUlt",
    "skillConfig": { "DUCO_TWISTERS": 3, "DUCO_HITS": 7, "DUCO_MULT": 1, "DUCO_SPD_DOWN": 0.3, "DUCO_SPD_UP": 0.3, "DUCO_TURNS": 3 },
    "skillNote": "Độc Cô Cầu Bại — Độc Cô Cửu Kiếm: 3 thanh kiếm (DUCO_TWISTERS) mỗi thanh cắm 1 địch, 7 lần sát thương chia đều, tổng 100% Công; địch trúng -30% Tốc, cả đội ta +30% Tốc trong 3 hiệp"
  },

  // ===== 4 · Trương Tam Phong =====
  {
    "slug": "truong-tam-phong",
    "id": 4,
    "name": "Trương Tam Phong",
    "emoji": "🧙🏻‍♂️",
    "role": "skill",
    "img": "truong-tam-phong.webp",
    "body": "truong-tam-phong-body.webp",
    "bodyH": 80,
    "stats": { "hp": 3500, "atk": 290, "spd": 40, "startRage": 100, "alwaysUlt": true },
    "combat": { "def": 60, "dodge": 5, "acc": 300, "crit": 10, "critDmg": 2, "tough": 20, "pierce": 20, "block": 15 },
    "tia": 1,
    "constants": { "lv": 73, "star": 3, "border": "orange", "ultName": "Thái Cực Quyền" },
    "audio": "04-truong-tam-phong.mp3?v=2",
    "sprites": {
      "ttpIdle": { "src": "truong-tam-phong-idle.webp?v=28", "cw": 317, "ch": 256, "n": 16 },
      "ttpCast": { "src": "truong-tam-phong-ult.webp?v=28", "cw": 354, "ch": 256, "n": 16 },
      "ttpStorm": { "src": "truong-tam-phong-storm.webp?v=28", "cw": 283, "ch": 256, "n": 17 }
    },
    "idle": { "sheet": "ttpIdle", "h": 120, "ms": 1500 },
    "ultFn": "taichiUlt",
    "skillConfig": { "TAICHI_MULT": 1, "TAICHI_HITS": 4, "TAICHI_BLEED_TURNS": 2, "TAICHI_BLEED_PCT": 0.4 }
  },

  // ===== 5 · Âu Cơ =====
  {
    "slug": "au-co",
    "id": 5,
    "name": "Âu Cơ",
    "emoji": "🪷",
    "role": "heal",
    "img": "au-co.webp",
    "body": "au-co-body.webp",
    "bodyH": 74,
    "stats": { "hp": 3000, "atk": 300, "spd": 50, "startRage": 50 },
    "combat": { "def": 50, "dodge": 10, "acc": 300, "crit": 10, "critDmg": 2, "tough": 10, "pierce": 10, "block": 5 },
    "tia": 1,
    "constants": { "lv": 70, "star": 5, "border": "orange", "ultName": "Liên Hoa Hồi Xuân" },
    "audio": "05-au-co.mp3?v=2",
    "sprites": {
      "acCast": { "src": "au-co-ult.webp", "cw": 304, "ch": 201, "n": 16 },
      "acIdle": { "src": "au-co-idle.webp?v=23", "cw": 227, "ch": 201, "n": 12 }
    },
    "idle": { "sheet": "acIdle", "h": 104, "ms": 1300 },
    "ultFn": "lotusUlt"
  },

  // ===== 6 · Hoa Mãn Lâu =====
  {
    "slug": "hoa-man-lau",
    "id": 6,
    "name": "Hoa Mãn Lâu",
    "emoji": "🌸",
    "role": "skill",
    "img": "hoa-man-lau.webp",
    "body": "hoa-man-lau-body.webp",
    "bodyH": 80,
    "stats": { "hp": 2000, "atk": 500, "spd": 77, "startRage": 100, "alwaysUlt": true },
    "combat": { "def": 60, "dodge": 50, "acc": 300, "crit": 40, "critDmg": 4, "tough": 10, "pierce": 30, "block": 0 },
    "tia": 1,
    "constants": { "lv": 70, "star": 5, "border": "purple", "ultName": "Tam Phiến Lạc Thiên" },
    "audio": "06-hoa-man-lau.mp3?v=2",
    "sprites": {
      "hmlIdle": { "src": "hoa-man-lau-idle.webp?v=40", "cw": 320, "ch": 250, "n": 20, "drop": 0.04,"face":"R" },
      "hmlCast": { "src": "hoa-man-lau-ult.webp?v=40", "cw": 560, "ch": 300, "n": 20, "drop": 0.033,"face":"R" },
      "hmlFan": { "src": "hoa-man-lau-quat.webp?v=1", "cw": 512, "ch": 288, "n": 1 }
    },
    "idle": { "sheet": "hmlIdle", "h": 140, "ms": 1600 },
    "ultFn": "fanUlt",
    "skillConfig": { "HML_FAN_HITS": 3, "HML_FAN_CRIT": 0.3, "HML_FAN_SLOW": 0.2, "HML_FAN_TURNS": 2, "BF_PCT": 0.25, "BF_TURNS": 2, "BF_POISON_PCT": 0.25 }
  },

  // ===== 7 · Phạm Dao =====
  {
    "slug": "pham-dao",
    "id": 7,
    "name": "Phạm Dao",
    "emoji": "⚔️",
    "role": "atk",
    "img": "pham-dao.webp",
    "body": "pham-dao-body.webp",
    "bodyH": 84,
    "stats": { "hp": 1000, "atk": 2500, "spd": 65, "startRage": 0 },
    "combat": { "def": 100, "dodge": 2, "acc": 300, "crit": 30, "critDmg": 3, "tough": 5, "pierce": 100, "block": 0 },
    "tia": 1,
    "constants": { "lv": 70, "star": 5, "border": "orange", "ultName": "Huyết Kiếm Toàn Phong" },
    "audio": "07-pham-dao.mp3?v=2",
    "ultFn": "phamDaoUlt",
    "skillConfig": { "DRAGON_MULT": 1, "DRAGON_TIERS": 4, "BLEED_TURNS": 3, "BLEED_PCT": 0.2 },
    "skillNote": "Phạm Dao: 4 lần sát thương toàn địch, tổng 100% Công (mỗi lần 25%); giảm 30% máu hiện tại của địch trong 2 hiệp"
  },

  // ===== 8 · Thủy Long =====
  {
    "slug": "thuy-long",
    "id": 8,
    "name": "Thủy Long",
    "emoji": "🐲",
    "role": "tank",
    "img": "thuy-long.webp",
    "body": "thuy-long-body.webp",
    "bodyH": 80,
    "stats": { "hp": 5000, "atk": 300, "spd": 1000, "startRage": 100, "alwaysUlt": true, "taunt": true },
    "combat": { "def": 120, "dodge": 70, "acc": 300, "crit": 10, "critDmg": 2, "tough": 30, "pierce": 10, "block": 30 },
    "tia": 1,
    "constants": { "lv": 70, "star": 5, "border": "orange", "ultName": "Thủy Thần Hộ Thể" },
    "audio": "08-thuy-long.mp3?v=3",
    "ultFn": "waterUlt",
    "skillConfig": { "TL_BUBBLES": 36, "TL_HITS": 5, "TL_MULT": 1, "TL_RAGE": 50 }
  },

  // ===== 9 · Đông Phương Cô Nương =====
  {
    "slug": "dong-phuong-co-nuong",
    "id": 9,
    "name": "Đông Phương Cô Nương",
    "emoji": "🔥",
    "role": "atk",
    "img": "dong-phuong-co-nuong.webp",
    "body": "dong-phuong-co-nuong-body.webp",
    "bodyH": 80,
    "stats": { "hp": 3000, "atk": 300, "spd": 50, "startRage": 100, "alwaysUlt": true, "noEnemy": true },
    "combat": { "def": 80, "dodge": 20, "acc": 300, "crit": 30, "critDmg": 3, "tough": 10, "pierce": 50, "block": 5 },
    "tia": 1,
    "constants": { "lv": 70, "star": 5, "border": "orange", "ultName": "Thiên Hỏa Chu Võng" },
    "audio": "09-dong-phuong-co-nuong.mp3?v=2",
    "sprites": {
      "dpIdle": { "src": "dong-phuong-idle.webp?v=51", "cw": 334, "ch": 225, "n": 20, "drop": 0.03, "face": "R" },
      "dpCast": { "src": "dong-phuong-ult.webp?v=51", "cw": 334, "ch": 225, "n": 16, "drop": 0.03 },
      "dpClone": { "src": "dong-phuong-clone.webp?v=51", "cw": 366, "ch": 217, "n": 18 },
      "dpFire": { "src": "dong-phuong-fire.webp?v=51", "cw": 260, "ch": 206, "n": 20 }
    },
    "idle": { "sheet": "dpIdle", "h": 138, "ms": 1800 },
    "ultFn": "fireWebUlt",
    "skillConfig": { "HTT_MULT": 1, "HTT_HITS": 4, "HTT_DEF_DOWN": 0.3, "HTT_DEF_TURNS": 2, "HTT_LINES": 18, "HTT_HP_PCT": 0.15 },
    "skillNote": "Đông Phương: lốc lửa 1 lần nhưng gây 4 lần sát thương, tổng 100% Công (mỗi lần 25%); giảm 30% Thủ địch và rút thêm 15% máu hiện tại"
  },

  // ===== 10 · Tiểu Yêu =====
  {
    "slug": "tieu-yeu",
    "id": 10,
    "name": "Tiểu Yêu",
    "emoji": "🎭",
    "role": "skill",
    "img": "tieu-yeu.webp",
    "body": "tieu-yeu-body.webp",
    "stats": { "hp": 3600, "atk": 320, "spd": 58, "startRage": 100, "alwaysUlt": true, "noEnemy": true },
    "combat": { "def": 50, "dodge": 8, "acc": 300, "crit": 30, "critDmg": 3, "tough": 10, "pierce": 25, "block": 5 },
    "tia": 1,
    "constants": { "lv": 70, "star": 5, "border": "purple", "ultName": "Bạch Cốt Đoạt Mệnh" },
    "audio": "10-tieu-yeu.mp3?v=2",
    "sprites": {
      "tyCast": { "src": "tieu-yeu-ult.webp?v=50", "cw": 269, "ch": 202, "n": 20, "drop": 0.03 },
      "tyIdle": { "src": "tieu-yeu-idle.webp?v=51", "cw": 269, "ch": 202, "n": 10, "drop": 0.03, "face": "R" },
      "tyOrb": { "src": "tieu-yeu-orb.webp?v=52", "cw": 342, "ch": 300, "n": 20 }
    },
    "idle": { "sheet": "tyIdle", "h": 124, "ms": 1800 },
    "ultFn": "tieuYeuUlt",
    "skillConfig": { "SKEL_PCT": 0.3, "EXEC_PCT": 0.1, "SKEL_MULT": 1, "SKEL_HITS": 3 },
    "skillNote": "Tiểu Yêu: đầu lâu lửa đánh TOÀN địch 3 lần, tổng 100% Công; giảm 30% máu hiện tại của địch trong 2 hiệp (né được thì không dính); sau đòn còn ≤10% HP tối đa -> TẤT SÁT kết liễu"
  },

  // ===== 11 · Vô Nhai Tử =====
  {
    "slug": "vo-nhai-tu",
    "id": 11,
    "name": "Vô Nhai Tử",
    "emoji": "♟️",
    "role": "sup",
    "img": "vo-nhai-tu.webp",
    "body": "vo-nhai-tu-body.webp",
    "bodyH": 80,
    "stats": { "hp": 3200, "atk": 260, "spd": 62, "startRage": 100, "alwaysUlt": true, "noEnemy": true },
    "combat": { "def": 45, "dodge": 12, "acc": 300, "crit": 15, "critDmg": 2, "tough": 10, "pierce": 15, "block": 5 },
    "tia": 1,
    "constants": { "lv": 70, "star": 5, "border": "orange", "ultName": "Hổ Khẩu Thôn Thiên" },
    "audio": "11-vo-nhai-tu.mp3?v=2",
    "sprites": {
      "vntIdle": { "src": "vo-nhai-tu-idle.webp?v=33", "cw": 288, "ch": 300, "n": 32, "drop": 0.137 },
      "vntCast": { "src": "vo-nhai-tu-ult.webp?v=29", "cw": 398, "ch": 355, "n": 15, "drop": 0.15 },
      "vntFlag": { "src": "vo-nhai-tu-flag.webp?v=29", "cw": 339, "ch": 361, "n": 15 }
    },
    "idle": { "sheet": "vntIdle", "h": 132, "ms": 3200 },
    "ultFn": "goUlt",
    "skillConfig": { "GO_STONES": 5, "GO_STONE_PCT": 0.06, "VNT_STUN_TOP": 3, "VNT_STUN_OTHER": 2, "VNT_STUN_OTHERS": 2, "VNT_ATK_UP": 0.5, "VNT_ATK_TURNS": 2 },
    "skillNote": "Vô Nhai Tử: 5 quân cờ, mỗi quân trúng gây 6% HP hiện tại của địch bị rơi trúng | Vô Nhai Tử: địch Công cao nhất choáng 3 hiệp, 2 địch ngẫu nhiên choáng 2 hiệp; đội ta +50% Công 2 hiệp"
  },

  // ===== 12 · Đoàn Dự =====
  {
    "slug": "doan-du",
    "id": 12,
    "name": "Đoàn Dự",
    "emoji": "🪭",
    "role": "sup",
    "img": "doan-du.webp",
    "body": "doan-du-body.webp",
    "bodyH": 80,
    "stats": { "hp": 3000, "atk": 300, "spd": 70, "startRage": 100, "noEnemy": true },
    "combat": { "def": 40, "dodge": 30, "acc": 300, "crit": 20, "critDmg": 3, "tough": 10, "pierce": 20, "block": 5 },
    "tia": 1,
    "constants": { "lv": 70, "star": 5, "border": "purple", "ultName": "Lăng Ba Vi Bộ" },
    "audio": "12-doan-du.mp3?v=2",
    "sprites": {
      "ddIdle": { "src": "doan-du-idle.webp?v=51", "cw": 204, "ch": 225, "n": 21, "drop": 0.03, "face": "R" },
      "ddCast": { "src": "doan-du-ult.webp?v=50", "cw": 335, "ch": 221, "n": 16, "drop": 0.03 },
      "ddRun": { "src": "doan-du-run.webp?v=50", "cw": 236, "ch": 181, "n": 17 }
    },
    "idle": { "sheet": "ddIdle", "h": 128, "ms": 1500 },
    "ultFn": "lingBaUlt",
    "skillConfig": { "LB_TURNS": 3, "LB_DODGE_MULT": 0.5, "LB_SPD_MULT": 0.45, "LB_HEAL_MULT": 0.5, "LB_GHOSTS": 18 },
    "skillNote": "Đoàn Dự: 3 hiệp, +50% Né, +45% Tốc, hồi 50% Máu (theo chỉ số của Đoàn Dự), 18 tàn ảnh"
  },

  // ===== 13 · Bắc Cái =====
  {
    "slug": "bac-cai",
    "id": 13,
    "name": "Bắc Cái",
    "emoji": "🍶",
    "role": "skill",
    "img": "bac-cai.webp",
    "body": "bac-cai-body.webp",
    "bodyH": 82,
    "stats": { "hp": 3000, "atk": 330, "spd": 56 },
    "combat": { "def": 40, "dodge": 15, "acc": 300, "crit": 30, "critDmg": 3, "tough": 10, "pierce": 30, "block": 5 },
    "tia": 1,
    "constants": { "lv": 70, "star": 5, "border": "orange", "ultName": "Thiên Địa Trúc Vũ" },
    "audio": "13-bac-cai.mp3?v=2",
    "sprites": {
      "bcIdle": { "src": "bac-cai-idle.webp", "cw": 301, "ch": 201, "n": 16 }
    },
    "idle": { "sheet": "bcIdle", "h": 104, "ms": 1300 },
    "ultFn": "bacCaiUlt",
    "skillConfig": { "BC_HITS": 18, "BC_DMG_HITS": 3, "BC_MULT": 1, "BC_DEF_DOWN": 0.3, "BC_ATK_UP": 0.3, "BC_TURNS": 1 },
    "skillNote": "Bắc Cái: 18 cây tre (chỉ là hiệu ứng) nhưng chỉ gây sát thương 3 lần lên toàn địch, tổng 100% Công (chia 3 lần); -30% Thủ địch, +30% Công đội 1 hiệp"
  },

  // ===== 14 · Đông Tà =====
  {
    "slug": "dong-ta",
    "id": 14,
    "name": "Đông Tà",
    "emoji": "🎋",
    "role": "skill",
    "img": "dong-ta.webp",
    "body": "dong-ta-body.webp",
    "bodyH": 82,
    "stats": { "hp": 2800, "atk": 350, "spd": 60 },
    "combat": { "def": 35, "dodge": 20, "acc": 300, "crit": 40, "critDmg": 4, "tough": 10, "pierce": 30, "block": 0 },
    "tia": 1,
    "constants": { "lv": 70, "star": 5, "border": "orange", "ultName": "Bích Hải Triều Sinh" },
    "audio": "14-dong-ta.mp3?v=2",
    "sprites": {
      "dtIdle": { "src": "dong-ta-idle.webp?v=23", "cw": 227, "ch": 201, "n": 12 },
      "dtCast": { "src": "dong-ta-ult.webp?v=23", "cw": 227, "ch": 201, "n": 12 }
    },
    "idle": { "sheet": "dtIdle", "h": 104, "ms": 1300 },
    "ultFn": "dongTaUlt",
    "skillConfig": { "DT_HITS": 3, "DT_MULT": 1, "DT_CRIT": 0.3, "DT_TURNS": 2 },
    "skillNote": "Đông Tà: 3 sóng âm, tổng 100% Công; -30% Bạo địch, +30% Bạo đội 2 hiệp"
  },

  // ===== 15 · Tây Độc =====
  {
    "slug": "tay-doc",
    "id": 15,
    "name": "Tây Độc",
    "emoji": "🐍",
    "role": "tank",
    "img": "tay-doc.webp",
    "body": "tay-doc-body.webp",
    "bodyH": 84,
    "stats": { "hp": 4200, "atk": 280, "spd": 48 },
    "combat": { "def": 80, "dodge": 10, "acc": 300, "crit": 15, "critDmg": 2, "tough": 25, "pierce": 20, "block": 25 },
    "tia": 1,
    "constants": { "lv": 70, "star": 5, "border": "purple", "ultName": "Hà Mô Công" },
    "audio": "15-tay-doc.mp3?v=2",
    "sprites": {
      "tdIdle": { "src": "tay-doc-idle.webp?v=23", "cw": 227, "ch": 201, "n": 12 },
      "tdToad": { "src": "tay-doc-ult.webp?v=2", "cw": 307, "ch": 204, "n": 25 }
    },
    "idle": { "sheet": "tdIdle", "h": 104, "ms": 1300 },
    "ultFn": "tayDocUlt",
    "skillConfig": { "TD_DEF_DOWN": 0.7, "TD_HP_DOWN": 0.5, "TD_SPD_DOWN": 0.2, "TD_TURNS": 3 },
    "skillNote": "Tây Độc: cóc độc phun độc: -70% Thủ, -50% máu hiện tại, -20% Tốc trong 3 hiệp"
  },

  // ===== 16 · Nam Đế =====
  {
    "slug": "nam-de",
    "id": 16,
    "name": "Nam Đế",
    "emoji": "🙏",
    "role": "sup",
    "img": "nam-de.webp",
    "body": "nam-de-body.webp",
    "bodyH": 82,
    "stats": { "hp": 3300, "atk": 270, "spd": 52 },
    "combat": { "def": 50, "dodge": 15, "acc": 300, "crit": 15, "critDmg": 2, "tough": 15, "pierce": 15, "block": 10 },
    "tia": 1,
    "constants": { "lv": 70, "star": 5, "border": "purple", "ultName": "Nhất Dương Vạn Ấn" },
    "audio": "16-nam-de.mp3?v=2",
    "sprites": {
      "ndIdle": { "src": "nam-de-idle.webp?v=23", "cw": 227, "ch": 201, "n": 12 }
    },
    "idle": { "sheet": "ndIdle", "h": 104, "ms": 1300 },
    "ultFn": "namDeUlt",
    "skillConfig": { "ND_ALL_DOWN": 0.25, "ND_TURNS": 2 },
    "skillNote": "Nam Đế: chưởng ấn chữ Vạn: địch giảm 25% tất cả thuộc tính 2 hiệp"
  },

  // ===== 17 · Vương Trùng Dương =====
  {
    "slug": "vuong-trung-duong",
    "id": 17,
    "name": "Vương Trùng Dương",
    "emoji": "☯️",
    "role": "sup",
    "img": "vuong-trung-duong.webp",
    "body": "vuong-trung-duong-body.webp",
    "bodyH": 82,
    "stats": { "hp": 3200, "atk": 280, "spd": 54 },
    "combat": { "def": 45, "dodge": 12, "acc": 300, "crit": 20, "critDmg": 3, "tough": 10, "pierce": 20, "block": 10 },
    "tia": 1,
    "constants": { "lv": 70, "star": 5, "border": "purple", "ultName": "Cửu Chuyển Thái Cực" },
    "audio": "17-vuong-trung-duong.mp3?v=2",
    "sprites": {
      "vtdIdle": { "src": "vuong-trung-duong-idle.webp?v=23", "cw": 227, "ch": 201, "n": 12 },
      "vtdCast": { "src": "vuong-trung-duong-ult.webp?v=24", "cw": 181, "ch": 230, "n": 12 },
      "vtdStorm": { "src": "vuong-trung-duong-storm.webp?v=24", "cw": 181, "ch": 250, "n": 12 }
    },
    "idle": { "sheet": "vtdIdle", "h": 92, "ms": 1300 },
    "ultFn": "vtdUlt",
    "skillConfig": { "VTD_ALL_UP": 0.35, "VTD_TURNS": 2 },
    "skillNote": "Vương Trùng Dương: đội tăng 35% tất cả thuộc tính (theo thuộc tính của từng người) 2 hiệp"
  },

  // ===== 18 · Ma Tôn =====
  {
    "slug": "ma-ton",
    "id": 18,
    "name": "Ma Tôn",
    "emoji": "😈",
    "role": "atk",
    "img": "ma-ton.webp?v=1",
    "body": "ma-ton-body.webp?v=1",
    "bodyH": 84,
    "stats": { "hp": 3000, "atk": 330, "spd": 58 },
    "combat": { "def": 35, "dodge": 10, "acc": 300, "crit": 25, "critDmg": 3, "tough": 8, "pierce": 25, "block": 0 },
    "tia": 1,
    "constants": { "lv": 70, "star": 5, "border": "purple", "ultName": "Cửu U Ma Thủ" },
    "sprites": {
      "maIdle": { "src": "ma-ton-idle.webp?v=1", "cw": 307, "ch": 256, "n": 20, "face": "R" },
      "maHand": { "src": "ma-ton-ult.webp?v=1", "cw": 219, "ch": 256, "n": 28 },
      "maPortal": { "src": "cong-chieu-mo-idle.webp?v=1", "cw": 256, "ch": 256, "n": 24 }
    },
    "idle": { "sheet": "maIdle", "h": 125, "ms": 1700 },
    "ultFn": "maTonUlt",
    "skillConfig": { "MT_HANDS": 15, "MT_HITS": 3, "MT_MULT": 1, "MT_ACC_UP": 3, "MT_ACC_DOWN": 0.5, "MT_TURNS": 2 },
    "skillNote": "Ma Tôn (tướng công kích): cổng triệu hồi hiện ra che đội ta, 15 bàn tay ma (hiệu ứng) bay dồn dập từ cổng sang đội địch rồi cổng biến mất; gây 3 lần sát thương lên toàn địch (tổng 100% Công); toàn đội ta +300% Chuẩn, toàn địch -50% Chuẩn 2 hiệp"
  },

  // ===== 19 · Triệu Mẫn =====
  {
    "slug": "trieu-man",
    "id": 19,
    "name": "Triệu Mẫn",
    "emoji": "🗡️",
    "role": "atk",
    "img": "trieu-man.webp?v=1",
    "body": "trieu-man-body.webp?v=1",
    "bodyH": 80,
    "stats": { "hp": 3000, "atk": 340, "spd": 60 },
    "combat": { "def": 35, "dodge": 15, "acc": 300, "crit": 30, "critDmg": 3, "tough": 8, "pierce": 25, "block": 10 },
    "tia": 1,
    "constants": { "lv": 70, "star": 5, "border": "purple", "ultName": "Tử Kiếm Quy Tông" },
    "audio": "19-trieu-man.mp3?v=1",
    "sprites": {
      "tmIdle": { "src": "trieu-man-idle.webp?v=1", "cw": 363, "ch": 242, "n": 20 },
      "tmCast": { "src": "trieu-man-ult.webp?v=1", "cw": 307, "ch": 220, "n": 25 }
    },
    "idle": { "sheet": "tmIdle", "h": 120, "ms": 1700 },
    "ultFn": "trieuManUlt",
    "skillConfig": { "TM_SWORDS": 32, "TM_ROWS": 4, "TM_HITS": 3, "TM_MULT": 1, "TM_BLOCK_DOWN": 0.3, "TM_BLOCK_UP": 0.5, "TM_TURNS": 2 },
    "skillNote": "Triệu Mẫn (tướng công kích): lao qua đội địch kéo theo 32 thanh kiếm bay hàng ngang từ phía sau đội ta; gây 3 lần sát thương lên toàn địch (tổng 100% Công); toàn địch giảm 30% Đỡ đòn, toàn đội ta tăng 50% Đỡ đòn 2 hiệp"
  },

  // ===== 20 · Mộc Quế Anh =====
  {
    "slug": "moc-que-anh",
    "id": 20,
    "name": "Mộc Quế Anh",
    "emoji": "🔱",
    "role": "sup",
    "img": "moc-que-anh.webp?v=1",
    "body": "moc-que-anh-body.webp?v=1",
    "bodyH": 80,
    "stats": { "hp": 3200, "atk": 300, "spd": 62 },
    "combat": { "def": 40, "dodge": 50, "acc": 300, "crit": 20, "critDmg": 3, "tough": 10, "pierce": 7500, "block": 10 },
    "tia": 1,
    "constants": { "lv": 70, "star": 5, "border": "purple", "ultName": "Hồng Anh Phá Trận" },
    "audio": "20-moc-que-anh.mp3?v=1",
    "sprites": {
      "qaIdle": { "src": "moc-que-anh-idle.webp?v=1", "cw": 354, "ch": 221, "n": 20 },
      "qaCast": { "src": "moc-que-anh-ult.webp?v=1", "cw": 307, "ch": 256, "n": 20 }
    },
    "idle": { "sheet": "qaIdle", "h": 120, "ms": 1700 },
    "ultFn": "mocQueAnhUlt",
    "skillConfig": { "QA_HITS_UP": 4, "QA_HITS_DOWN": 4, "QA_MULT": 1, "QA_DODGE_UP": 0.5, "QA_DODGE_DOWN": 0.3, "QA_TURNS": 2 },
    "skillNote": "Mộc Quế Anh (tướng hỗ trợ): chạy xuyên đội địch, đưa thương từ dưới lên 4 lần rồi bổ từ trên xuống 4 lần (8 lần sát thương toàn địch, tổng 100% Công); toàn đội ta +50% Né, toàn địch -30% Né 2 hiệp; Phá giáp gốc 7500"
  },

  // ===== 21 · Thần Hộ Rừng =====
  {
    "slug": "than-ho-rung",
    "id": 21,
    "name": "Thần Hộ Rừng",
    "emoji": "🏹",
    "role": "atk",
    "img": "than-ho-rung.webp?v=1",
    "body": "than-ho-rung-body.webp?v=1",
    "bodyH": 84,
    "stats": { "hp": 2800, "atk": 350, "spd": 64 },
    "combat": { "def": 30, "dodge": 20, "acc": 300, "crit": 25, "critDmg": 3, "tough": 6, "pierce": 25, "block": 0 },
    "tia": 1,
    "constants": { "lv": 70, "star": 5, "border": "purple", "ultName": "Mưa Tên Thần Rừng" },
    "audio": "21-than-ho-rung.mp3?v=1",
    "sprites": {
      "hrIdle": { "src": "than-ho-rung-idle.webp?v=1", "cw": 307, "ch": 256, "n": 20 },
      "hrCast": { "src": "than-ho-rung-ult.webp?v=1", "cw": 307, "ch": 256, "n": 20 }
    },
    "idle": { "sheet": "hrIdle", "h": 124, "ms": 1700 },
    "ultFn": "thanHoRungUlt",
    "skillConfig": { "HR_ARROWS": 36, "HR_HITS": 4, "HR_TARGETS": 3, "HR_MULT": 1, "HR_CRIT_UP": 3, "HR_CDMG_UP": 3, "HR_ACC_UP": 3, "HR_TURNS": 2 },
    "skillNote": "Thần Hộ Rừng (tướng công kích): TRƯỚC khi bắn, bản thân +300% Bạo, +300% Bạo Sát, +300% Chuẩn trong 2 hiệp; bắn lên trời, mưa 36 mũi tên lớn từ trời bên ta ập xuống bên địch, gây 4 lần sát thương lên 3 tướng địch ngẫu nhiên (tổng 100% Công)"
  },

  // ===== 22 · Bạch Cầm =====
  {
    "slug": "bach-cam",
    "id": 22,
    "name": "Bạch Cầm",
    "emoji": "🪕",
    "role": "skill",
    "img": "bach-cam.webp?v=1",
    "body": "bach-cam-body.webp?v=1",
    "bodyH": 84,
    "stats": { "hp": 2700, "atk": 330, "spd": 66 },
    "combat": { "def": 30, "dodge": 20, "acc": 300, "crit": 25, "critDmg": 3, "tough": 6, "pierce": 25, "block": 0 },
    "tia": 1,
    "constants": { "lv": 70, "star": 5, "border": "purple", "ultName": "Phân Thân Đập Đàn" },
    "audio": "22-bach-cam.mp3?v=1",
    "sprites": {
      "bqIdle": { "src": "bach-cam-idle.webp?v=1", "cw": 307, "ch": 256, "n": 20 },
      "bqCast": { "src": "bach-cam-ult.webp?v=1", "cw": 307, "ch": 256, "n": 20 }
    },
    "idle": { "sheet": "bqIdle", "h": 124, "ms": 1700 },
    "ultFn": "bachCamUlt",
    "skillConfig": { "BQ_CLONES": 2, "BQ_HITS": 3, "BQ_MULT": 1, "BQ_CRIT_UP": 3, "BQ_TURNS": 2, "BQ_STUN": 1 },
    "skillNote": "Bạch Cầm (tướng kỹ năng): TRƯỚC khi ra đòn, bản thân +300% Bạo 2 hiệp; phân thân làm 2 người chạy sang đập đàn vào đầu 2 địch ngẫu nhiên, mỗi địch bị đánh 3 lần (tổng 100% Công); 2 địch bị đánh bị choáng 1 hiệp và cấm hồi máu 2 hiệp"
  },
{
  "id": 90770,
  "key": "luctieuphung",
  "slug": "luc-tieu-phung",
  "name": "Lục Tiểu Phụng",
  "emoji": "🪭",
  "role": "skill",
  "img": "luc-tieu-phung.webp",
  "body": "luc-tieu-phung-body.webp",
  "bodyH": 96,
  "stats": {
    "hp": 6000,
    "atk": 700,
    "spd": 120
  },
  "combat": {
    "dodge": 60,
    "acc": 300,
    "crit": 0,
    "critDmg": 0,
    "tough": 0,
    "pierce": 0,
    "block": 0,
    "def": 300
  },
  "tia": 1,
  "constants": {
    "lv": 1,
    "star": 1,
    "border": "orange",
    "ultName": "Phụng Vĩ Cữu Thiên"
  },
  "audio": "luc-tieu-phung-ult.mp3",
  "sprites": {
    "LTPIdle": {
      "src": "luc-tieu-phung-idle.webp",
      "cw": 320,
      "ch": 320,
      "n": 16,
      "face": "R"
    },
    "LTPCast": {
      "src": "luc-tieu-phung-ult.webp",
      "cw": 320,
      "ch": 320,
      "n": 16,
      "face": "R"
    },
    "LTPFx": {
      "src": "luc-tieu-phung-fx.webp",
      "cw": 320,
      "ch": 320,
      "n": 16
    }
  },
  "idle": {
    "sheet": "LTPIdle",
    "h": 120,
    "ms": 1600
  },
  "ultFn": "luctieuphungUlt",
  "skillConfig": {
    "LTP_HITS": 4,
    "LTP_DODGE": 0.7,
    "LTP_TURNS": 2,
    "LTP_ATK": 0.5
  }
},
{
  "id": 97950,
  "key": "taymonxuytuyet",
  "slug": "tay-mon-xuy-tuyet",
  "name": "Tây Môn Xuy Tuyết",
  "emoji": "⚔️",
  "role": "skill",
  "img": "tay-mon-xuy-tuyet.webp",
  "body": "tay-mon-xuy-tuyet-body.webp",
  "bodyH": 96,
  "stats": {
    "hp": 6000,
    "atk": 700,
    "spd": 120
  },
  "combat": {
    "dodge": 60,
    "acc": 300,
    "crit": 0,
    "critDmg": 0,
    "tough": 0,
    "pierce": 0,
    "block": 0,
    "def": 300
  },
  "tia": 1,
  "constants": {
    "lv": 1,
    "star": 1,
    "border": "orange",
    "ultName": "Nhất Kiếm Tây Lai"
  },
  "audio": "tay-mon-xuy-tuyet-ult.mp3",
  "sprites": {
    "TMXTIdle": {
      "src": "tay-mon-xuy-tuyet-idle.webp",
      "cw": 320,
      "ch": 320,
      "n": 16,
      "face": "R"
    },
    "TMXTCast": {
      "src": "tay-mon-xuy-tuyet-ult.webp",
      "cw": 320,
      "ch": 320,
      "n": 16,
      "face": "R"
    },
    "TMXTFx": {
      "src": "tay-mon-xuy-tuyet-fx.webp",
      "cw": 320,
      "ch": 320,
      "n": 16
    }
  },
  "idle": {
    "sheet": "TMXTIdle",
    "h": 120,
    "ms": 1600
  },
  "ultFn": "taymonxuytuyetUlt",
  "skillConfig": {
    "TMXT_HITS": 4,
    "TMXT_DODGE": 0.7,
    "TMXT_TURNS": 2,
    "TMXT_TARGETS": 3,
    "TMXT_STUN": 1
  }
},
{
  "id": 86427,
  "key": "phongthanhduong",
  "slug": "phong-thanh-duong",
  "name": "Phong Thanh Dương",
  "emoji": "⚔️",
  "role": "skill",
  "img": "phong-thanh-duong.webp",
  "body": "phong-thanh-duong-body.webp",
  "bodyH": 96,
  "stats": {
    "hp": 6000,
    "atk": 700,
    "spd": 120
  },
  "combat": {
    "dodge": 60,
    "acc": 1000,
    "crit": 0,
    "critDmg": 0,
    "tough": 0,
    "pierce": 0,
    "block": 0,
    "def": 300
  },
  "tia": 1,
  "constants": {
    "lv": 1,
    "star": 1,
    "border": "orange",
    "ultName": "Vạn Kiếm Quy Tông"
  },
  "audio": "phong-thanh-duong-ult.mp3",
  "sprites": {
    "PTDIdle": {
      "src": "phong-thanh-duong-idle.webp",
      "cw": 320,
      "ch": 320,
      "n": 16,
      "face": "R"
    },
    "PTDCast": {
      "src": "phong-thanh-duong-ult.webp",
      "cw": 320,
      "ch": 320,
      "n": 16,
      "face": "R"
    }
  },
  "idle": {
    "sheet": "PTDIdle",
    "h": 120,
    "ms": 1600
  },
  "ultFn": "phongThanhDuongUlt",
  "skillConfig": {
    "PTD_HITS": 3,
    "PTD_TARGETS": 2,
    "PTD_CRIT": 300,
    "PTD_CDMG": 300,
    "PTD_TURNS": 2
  }
}
  ]
};
