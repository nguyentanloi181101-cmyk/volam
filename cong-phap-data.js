/* Công Pháp: 47 tướng × 4 giai; thông số tuyệt kỹ thay thế theo giai, không cộng dồn. */
window.CP_SKILL_DATA = {
  "0": {
    "name": "Tà Đế",
    "fn": "taDeUlt",
    "fields": [
      [
        "TADE_SLOW",
        "Giảm Tốc địch",
        "%"
      ],
      [
        "TADE_PIERCE",
        "Tăng Phá giáp toàn đội",
        "#"
      ]
    ],
    "tiers": [
      {
        "TADE_SLOW": 0.35,
        "TADE_PIERCE": 10000
      },
      {
        "TADE_SLOW": 0.4,
        "TADE_PIERCE": 15000
      },
      {
        "TADE_SLOW": 0.45,
        "TADE_PIERCE": 20000
      },
      {
        "TADE_SLOW": 0.5,
        "TADE_PIERCE": 25000
      }
    ],
    "keep": "5 hit toàn địch, xuyên bất tử; buff và giảm Tốc 2 hiệp."
  },
  "2": {
    "name": "Hằng Nga",
    "fn": "hangNgaUlt",
    "fields": [
      [
        "MOON_REFLECT",
        "Phản sát thương",
        "%"
      ],
      [
        "MOON_TAKE",
        "Tỷ lệ sát thương còn nhận",
        "%"
      ]
    ],
    "tiers": [
      {
        "MOON_REFLECT": 0.45,
        "MOON_TAKE": 0.45
      },
      {
        "MOON_REFLECT": 0.5,
        "MOON_TAKE": 0.4
      },
      {
        "MOON_REFLECT": 0.55,
        "MOON_TAKE": 0.35
      },
      {
        "MOON_REFLECT": 0.6,
        "MOON_TAKE": 0.3
      }
    ],
    "keep": "Giải hiệu ứng bất lợi toàn đội, khiên 2 hiệp."
  },
  "3": {
    "name": "Độc Cô Cầu Bại",
    "fn": "duCoUlt",
    "fields": [
      [
        "DUCO_SLOW",
        "Giảm Tốc toàn địch",
        "%"
      ],
      [
        "DUCO_HASTE",
        "Tăng Tốc toàn đội",
        "%"
      ]
    ],
    "tiers": [
      {
        "DUCO_SLOW": 0.25,
        "DUCO_HASTE": 0.25
      },
      {
        "DUCO_SLOW": 0.3,
        "DUCO_HASTE": 0.3
      },
      {
        "DUCO_SLOW": 0.35,
        "DUCO_HASTE": 0.35
      },
      {
        "DUCO_SLOW": 0.4,
        "DUCO_HASTE": 0.4
      }
    ],
    "keep": "3 hit toàn địch, 2 hiệp."
  },
  "4": {
    "name": "Trương Tam Phong",
    "fn": "taichiUlt",
    "fields": [
      [
        "CP_TAICHI_COUNT",
        "Số địch choáng",
        "#"
      ],
      [
        "TAICHI_BLEED_PCT",
        "Chảy máu theo HP hiện tại mỗi hiệp",
        "%"
      ],
      [
        "TAICHI_BLEED_TURNS",
        "Hiệp choáng và chảy máu",
        "#"
      ]
    ],
    "tiers": [
      {
        "CP_TAICHI_COUNT": 2,
        "TAICHI_BLEED_PCT": 0.4,
        "TAICHI_BLEED_TURNS": 2
      },
      {
        "CP_TAICHI_COUNT": 2,
        "TAICHI_BLEED_PCT": 0.45,
        "TAICHI_BLEED_TURNS": 2
      },
      {
        "CP_TAICHI_COUNT": 3,
        "TAICHI_BLEED_PCT": 0.45,
        "TAICHI_BLEED_TURNS": 2
      },
      {
        "CP_TAICHI_COUNT": 3,
        "TAICHI_BLEED_PCT": 0.45,
        "TAICHI_BLEED_TURNS": 3
      }
    ],
    "keep": "Sát thương toàn địch giữ nguyên; Công Pháp áp dụng hiệu ứng nâng giai thay cho mốc sao."
  },
  "5": {
    "name": "Âu Cơ",
    "fn": "lotusUlt",
    "fields": [
      [
        "CP_HL",
        "Hiệu lực hồi máu gốc",
        "%"
      ]
    ],
    "tiers": [
      {
        "CP_HL": 2.8
      },
      {
        "CP_HL": 3.8
      },
      {
        "CP_HL": 4.8
      },
      {
        "CP_HL": 5.8
      }
    ],
    "keep": "Hồi máu toàn đội còn sống theo Công; cộng thêm hiệu lực cấp kỹ năng và phẩm chất."
  },
  "6": {
    "name": "Hoa Mãn Lâu",
    "fn": "fanUlt",
    "fields": [
      [
        "HML_FAN_CRIT",
        "Tăng Bạo toàn đội",
        "%"
      ],
      [
        "HML_FAN_SLOW",
        "Giảm Tốc toàn địch",
        "%"
      ],
      [
        "HML_FAN_TURNS",
        "Số hiệp",
        "#"
      ]
    ],
    "tiers": [
      {
        "HML_FAN_CRIT": 0.35,
        "HML_FAN_SLOW": 0.25,
        "HML_FAN_TURNS": 2
      },
      {
        "HML_FAN_CRIT": 0.4,
        "HML_FAN_SLOW": 0.3,
        "HML_FAN_TURNS": 2
      },
      {
        "HML_FAN_CRIT": 0.45,
        "HML_FAN_SLOW": 0.35,
        "HML_FAN_TURNS": 2
      },
      {
        "HML_FAN_CRIT": 0.5,
        "HML_FAN_SLOW": 0.4,
        "HML_FAN_TURNS": 3
      }
    ],
    "keep": "3 hit toàn địch."
  },
  "7": {
    "name": "Phạm Dao",
    "fn": "phamDaoUlt",
    "fields": [
      [
        "PD_HP_PCT",
        "Giảm HP hiện tại địch",
        "%"
      ],
      [
        "PD_ATK_BUFF",
        "Tăng Công bản thân",
        "%"
      ]
    ],
    "tiers": [
      {
        "PD_HP_PCT": 0.35,
        "PD_ATK_BUFF": 0.75
      },
      {
        "PD_HP_PCT": 0.4,
        "PD_ATK_BUFF": 1
      },
      {
        "PD_HP_PCT": 0.45,
        "PD_ATK_BUFF": 1.25
      },
      {
        "PD_HP_PCT": 0.5,
        "PD_ATK_BUFF": 1.5
      }
    ],
    "keep": "4 hit toàn địch; giảm HP 2 hiệp, buff Công 1 hiệp."
  },
  "8": {
    "name": "Thủy Long",
    "fn": "waterUlt",
    "fields": [
      [
        "CP_HL",
        "Hiệu lực sát thương gốc",
        "%"
      ]
    ],
    "tiers": [
      {
        "CP_HL": 3
      },
      {
        "CP_HL": 3.5
      },
      {
        "CP_HL": 4
      },
      {
        "CP_HL": 4.5
      }
    ],
    "keep": "5 hit toàn địch, đội ta +50 Nộ; cộng thêm hiệu lực cấp kỹ năng và phẩm chất."
  },
  "9": {
    "name": "Đông Phương Cô Nương",
    "fn": "fireWebUlt",
    "fields": [
      [
        "HTT_DEF_DOWN",
        "Giảm Thủ toàn địch",
        "%"
      ],
      [
        "HTT_HP_PCT",
        "Rút HP hiện tại",
        "%"
      ]
    ],
    "tiers": [
      {
        "HTT_DEF_DOWN": 0.35,
        "HTT_HP_PCT": 0.25
      },
      {
        "HTT_DEF_DOWN": 0.4,
        "HTT_HP_PCT": 0.3
      },
      {
        "HTT_DEF_DOWN": 0.45,
        "HTT_HP_PCT": 0.35
      },
      {
        "HTT_DEF_DOWN": 0.5,
        "HTT_HP_PCT": 0.4
      }
    ],
    "keep": "Giữ nguyên hit toàn địch, giảm Thủ 2 hiệp."
  },
  "10": {
    "name": "Tiểu Yêu",
    "fn": "tieuYeuUlt",
    "fields": [
      [
        "SKEL_PCT",
        "Giảm HP hiện tại",
        "%"
      ],
      [
        "EXEC_PCT",
        "Ngưỡng tất sát HP tối đa",
        "%"
      ]
    ],
    "tiers": [
      {
        "SKEL_PCT": 0.25,
        "EXEC_PCT": 0.1
      },
      {
        "SKEL_PCT": 0.3,
        "EXEC_PCT": 0.1
      },
      {
        "SKEL_PCT": 0.35,
        "EXEC_PCT": 0.1
      },
      {
        "SKEL_PCT": 0.4,
        "EXEC_PCT": 0.1
      }
    ],
    "keep": "3 hit toàn địch; giảm HP 2 hiệp, hết hạn cộng lại."
  },
  "11": {
    "name": "Vô Nhai Tử",
    "fn": "goUlt",
    "fields": [
      [
        "VNT_STUN_TOP",
        "Hiệp choáng địch Công cao nhất",
        "#"
      ],
      [
        "VNT_STUN_OTHERS",
        "Số địch phụ",
        "#"
      ],
      [
        "VNT_STUN_OTHER",
        "Hiệp choáng địch phụ",
        "#"
      ]
    ],
    "tiers": [
      {
        "VNT_STUN_TOP": 3,
        "VNT_STUN_OTHERS": 2,
        "VNT_STUN_OTHER": 3
      },
      {
        "VNT_STUN_TOP": 3,
        "VNT_STUN_OTHERS": 4,
        "VNT_STUN_OTHER": 2
      },
      {
        "VNT_STUN_TOP": 3,
        "VNT_STUN_OTHERS": 4,
        "VNT_STUN_OTHER": 3
      },
      {
        "VNT_STUN_TOP": 4,
        "VNT_STUN_OTHERS": 4,
        "VNT_STUN_OTHER": 3
      }
    ],
    "keep": "Giữ nguyên sát thương cờ và chọn mục tiêu phụ không trùng."
  },
  "12": {
    "name": "Đoàn Dự",
    "fn": "lingBaUlt",
    "fields": [
      [
        "LB_DODGE_MULT",
        "Tăng Né theo Đoàn Dự",
        "%"
      ],
      [
        "LB_SPD_MULT",
        "Tăng Tốc theo Đoàn Dự",
        "%"
      ],
      [
        "LB_HEAL_MULT",
        "Hồi máu mỗi hiệp theo HP Đoàn Dự",
        "%"
      ]
    ],
    "tiers": [
      {
        "LB_DODGE_MULT": 0.6,
        "LB_SPD_MULT": 0.5,
        "LB_HEAL_MULT": 0.6
      },
      {
        "LB_DODGE_MULT": 0.65,
        "LB_SPD_MULT": 0.55,
        "LB_HEAL_MULT": 0.7
      },
      {
        "LB_DODGE_MULT": 0.7,
        "LB_SPD_MULT": 0.6,
        "LB_HEAL_MULT": 0.8
      },
      {
        "LB_DODGE_MULT": 0.75,
        "LB_SPD_MULT": 0.65,
        "LB_HEAL_MULT": 0.9
      }
    ],
    "keep": "Buff toàn đội 3 hiệp."
  },
  "13": {
    "name": "Bắc Cái",
    "fn": "bacCaiUlt",
    "fields": [
      [
        "BC_ATK_UP",
        "Tăng Công toàn đội",
        "%"
      ],
      [
        "BC_DEF_DOWN",
        "Giảm Thủ toàn địch",
        "%"
      ],
      [
        "BC_TURNS",
        "Số hiệp",
        "#"
      ]
    ],
    "tiers": [
      {
        "BC_ATK_UP": 0.4,
        "BC_DEF_DOWN": 0.4,
        "BC_TURNS": 2
      },
      {
        "BC_ATK_UP": 0.5,
        "BC_DEF_DOWN": 0.5,
        "BC_TURNS": 2
      },
      {
        "BC_ATK_UP": 0.6,
        "BC_DEF_DOWN": 0.6,
        "BC_TURNS": 2
      },
      {
        "BC_ATK_UP": 0.7,
        "BC_DEF_DOWN": 0.7,
        "BC_TURNS": 2
      }
    ],
    "keep": "Giữ nguyên sát thương toàn địch."
  },
  "14": {
    "name": "Đông Tà",
    "fn": "dongTaUlt",
    "fields": [
      [
        "DT_CRIT",
        "Tăng Bạo đội ta và giảm Bạo địch",
        "%"
      ]
    ],
    "tiers": [
      {
        "DT_CRIT": 0.4
      },
      {
        "DT_CRIT": 0.5
      },
      {
        "DT_CRIT": 0.6
      },
      {
        "DT_CRIT": 0.7
      }
    ],
    "keep": "Sát thương toàn địch, 2 hiệp."
  },
  "15": {
    "name": "Tây Độc",
    "fn": "tayDocUlt",
    "fields": [
      [
        "TD_DEF_DOWN",
        "Giảm Thủ",
        "%"
      ],
      [
        "TD_SPD_DOWN",
        "Giảm Tốc",
        "%"
      ],
      [
        "TD_HP_DOWN",
        "Độc rút HP hiện tại",
        "%"
      ]
    ],
    "tiers": [
      {
        "TD_DEF_DOWN": 0.55,
        "TD_SPD_DOWN": 0.25,
        "TD_HP_DOWN": 0.45
      },
      {
        "TD_DEF_DOWN": 0.6,
        "TD_SPD_DOWN": 0.3,
        "TD_HP_DOWN": 0.5
      },
      {
        "TD_DEF_DOWN": 0.65,
        "TD_SPD_DOWN": 0.35,
        "TD_HP_DOWN": 0.55
      },
      {
        "TD_DEF_DOWN": 0.7,
        "TD_SPD_DOWN": 0.4,
        "TD_HP_DOWN": 0.6
      }
    ],
    "keep": "Toàn địch; giảm chỉ số 3 hiệp, rút HP một lần theo cơ chế gốc."
  },
  "16": {
    "name": "Nam Đế",
    "fn": "namDeUlt",
    "fields": [
      [
        "ND_ALL_DOWN",
        "Giảm mọi thuộc tính chiến đấu",
        "%"
      ]
    ],
    "tiers": [
      {
        "ND_ALL_DOWN": 0.3
      },
      {
        "ND_ALL_DOWN": 0.35
      },
      {
        "ND_ALL_DOWN": 0.4
      },
      {
        "ND_ALL_DOWN": 0.45
      }
    ],
    "keep": "Toàn địch 2 hiệp."
  },
  "17": {
    "name": "Vương Trùng Dương",
    "fn": "vtdUlt",
    "fields": [
      [
        "VTD_ALL_UP",
        "Tăng mọi thuộc tính chiến đấu",
        "%"
      ]
    ],
    "tiers": [
      {
        "VTD_ALL_UP": 0.37
      },
      {
        "VTD_ALL_UP": 0.4
      },
      {
        "VTD_ALL_UP": 0.45
      },
      {
        "VTD_ALL_UP": 0.5
      }
    ],
    "keep": "Toàn đội 2 hiệp."
  },
  "18": {
    "name": "Ma Tôn",
    "fn": "maTonUlt",
    "fields": [
      [
        "MT_ACC_UP",
        "Tăng Chuẩn đội ta",
        "%"
      ],
      [
        "MT_ACC_DOWN",
        "Giảm Chuẩn địch",
        "%"
      ]
    ],
    "tiers": [
      {
        "MT_ACC_UP": 3.5,
        "MT_ACC_DOWN": 0.55
      },
      {
        "MT_ACC_UP": 4,
        "MT_ACC_DOWN": 0.6
      },
      {
        "MT_ACC_UP": 4.5,
        "MT_ACC_DOWN": 0.7
      },
      {
        "MT_ACC_UP": 5,
        "MT_ACC_DOWN": 0.8
      }
    ],
    "keep": "3 hit toàn địch, 2 hiệp."
  },
  "19": {
    "name": "Triệu Mẫn",
    "fn": "trieuManUlt",
    "fields": [
      [
        "TM_BLOCK_DOWN",
        "Giảm Đỡ đòn địch",
        "%"
      ],
      [
        "TM_BLOCK_UP",
        "Tăng Đỡ đòn đội ta",
        "%"
      ]
    ],
    "tiers": [
      {
        "TM_BLOCK_DOWN": 0.35,
        "TM_BLOCK_UP": 0.55
      },
      {
        "TM_BLOCK_DOWN": 0.4,
        "TM_BLOCK_UP": 0.6
      },
      {
        "TM_BLOCK_DOWN": 0.45,
        "TM_BLOCK_UP": 0.65
      },
      {
        "TM_BLOCK_DOWN": 0.5,
        "TM_BLOCK_UP": 0.7
      }
    ],
    "keep": "3 hit toàn địch, 2 hiệp; Đỡ đòn tính theo điểm phần trăm."
  },
  "20": {
    "name": "Mộc Quế Anh",
    "fn": "mocQueAnhUlt",
    "fields": [
      [
        "QA_DODGE_UP",
        "Tăng Né đội ta",
        "%"
      ],
      [
        "QA_DODGE_DOWN",
        "Giảm Né địch",
        "%"
      ]
    ],
    "tiers": [
      {
        "QA_DODGE_UP": 0.6,
        "QA_DODGE_DOWN": 0.35
      },
      {
        "QA_DODGE_UP": 0.7,
        "QA_DODGE_DOWN": 0.4
      },
      {
        "QA_DODGE_UP": 0.8,
        "QA_DODGE_DOWN": 0.45
      },
      {
        "QA_DODGE_UP": 0.9,
        "QA_DODGE_DOWN": 0.5
      }
    ],
    "keep": "8 hit toàn địch, 2 hiệp."
  },
  "21": {
    "name": "Thần Hộ Rừng",
    "fn": "thanHoRungUlt",
    "fields": [
      [
        "HR_CRIT_UP",
        "Tăng Bạo bản thân",
        "%"
      ],
      [
        "HR_CDMG_UP",
        "Tăng Bạo Sát bản thân",
        "%"
      ],
      [
        "HR_ACC_UP",
        "Tăng Chuẩn bản thân",
        "%"
      ]
    ],
    "tiers": [
      {
        "HR_CRIT_UP": 3.5,
        "HR_CDMG_UP": 3.5,
        "HR_ACC_UP": 3.5
      },
      {
        "HR_CRIT_UP": 4.5,
        "HR_CDMG_UP": 4.5,
        "HR_ACC_UP": 4.5
      },
      {
        "HR_CRIT_UP": 5.5,
        "HR_CDMG_UP": 5.5,
        "HR_ACC_UP": 5.5
      },
      {
        "HR_CRIT_UP": 6,
        "HR_CDMG_UP": 6,
        "HR_ACC_UP": 6
      }
    ],
    "keep": "3 địch ngẫu nhiên, 4 hit mỗi địch; buff 2 hiệp."
  },
  "22": {
    "name": "Bạch Cầm",
    "fn": "bachCamUlt",
    "fields": [
      [
        "BQ_CLONES",
        "Số địch ngẫu nhiên",
        "#"
      ],
      [
        "BQ_CRIT_UP",
        "Tăng Bạo bản thân",
        "%"
      ],
      [
        "BQ_STUN",
        "Hiệp choáng",
        "#"
      ],
      [
        "CP_BQ_NOHEAL",
        "Hiệp cấm hồi máu",
        "#"
      ]
    ],
    "tiers": [
      {
        "BQ_CLONES": 2,
        "BQ_CRIT_UP": 3.5,
        "BQ_STUN": 1,
        "CP_BQ_NOHEAL": 2
      },
      {
        "BQ_CLONES": 2,
        "BQ_CRIT_UP": 4,
        "BQ_STUN": 1,
        "CP_BQ_NOHEAL": 2
      },
      {
        "BQ_CLONES": 3,
        "BQ_CRIT_UP": 4.5,
        "BQ_STUN": 2,
        "CP_BQ_NOHEAL": 2
      },
      {
        "BQ_CLONES": 3,
        "BQ_CRIT_UP": 5,
        "BQ_STUN": 2,
        "CP_BQ_NOHEAL": 3
      }
    ],
    "keep": "3 hit mỗi địch, buff Bạo 2 hiệp."
  },
  "23": {
    "name": "Thiết Phiến",
    "fn": "thietPhienUlt",
    "fields": [
      [
        "TP_SLOW",
        "Giảm Tốc toàn địch",
        "%"
      ],
      [
        "TP_SILENCE_TARGETS",
        "Số địch câm lặng",
        "#"
      ],
      [
        "TP_SILENCE_TURNS",
        "Hiệp câm lặng",
        "#"
      ]
    ],
    "tiers": [
      {
        "TP_SLOW": 0.2,
        "TP_SILENCE_TARGETS": 3,
        "TP_SILENCE_TURNS": 1
      },
      {
        "TP_SLOW": 0.3,
        "TP_SILENCE_TARGETS": 3,
        "TP_SILENCE_TURNS": 1
      },
      {
        "TP_SLOW": 0.4,
        "TP_SILENCE_TARGETS": 3,
        "TP_SILENCE_TURNS": 2
      },
      {
        "TP_SLOW": 0.5,
        "TP_SILENCE_TARGETS": 4,
        "TP_SILENCE_TURNS": 2
      }
    ],
    "keep": "4 hit toàn địch, giảm Tốc 3 hiệp."
  },
  "24": {
    "name": "Dương Tiễn",
    "fn": "duongTienUlt",
    "fields": [
      [
        "DY_PIERCE",
        "Tăng Phá giáp bản thân",
        "#"
      ],
      [
        "DY_BLOCK_DOWN",
        "Giảm Đỡ đòn toàn địch",
        "%"
      ],
      [
        "DY_TURNS",
        "Số hiệp",
        "#"
      ]
    ],
    "tiers": [
      {
        "DY_PIERCE": 20000,
        "DY_BLOCK_DOWN": 0.3,
        "DY_TURNS": 2
      },
      {
        "DY_PIERCE": 30000,
        "DY_BLOCK_DOWN": 0.35,
        "DY_TURNS": 2
      },
      {
        "DY_PIERCE": 40000,
        "DY_BLOCK_DOWN": 0.4,
        "DY_TURNS": 2
      },
      {
        "DY_PIERCE": 50000,
        "DY_BLOCK_DOWN": 0.45,
        "DY_TURNS": 2
      }
    ],
    "keep": "7 hit địch Công cao nhất."
  },
  "25": {
    "name": "Quan Âm",
    "fn": "quanAmUlt",
    "fields": [
      [
        "QA_BLOCK_UP",
        "Tăng Đỡ đòn toàn đội",
        "%"
      ],
      [
        "QA_HEAL",
        "Hồi máu theo Công mỗi hiệp",
        "%"
      ],
      [
        "QA_PIERCE_DOWN",
        "Giảm Phá giáp địch",
        "%"
      ]
    ],
    "tiers": [
      {
        "QA_BLOCK_UP": 1,
        "QA_HEAL": 1.5,
        "QA_PIERCE_DOWN": 0.55
      },
      {
        "QA_BLOCK_UP": 1,
        "QA_HEAL": 2,
        "QA_PIERCE_DOWN": 0.6
      },
      {
        "QA_BLOCK_UP": 1,
        "QA_HEAL": 2.5,
        "QA_PIERCE_DOWN": 0.7
      },
      {
        "QA_BLOCK_UP": 1,
        "QA_HEAL": 3,
        "QA_PIERCE_DOWN": 0.8
      }
    ],
    "keep": "2 hiệp; Đỡ đòn tính theo điểm phần trăm."
  },
  "26": {
    "name": "Đường Tăng",
    "fn": "duongTangUlt",
    "fields": [
      [
        "DTA_ACC_DOWN",
        "Giảm Chuẩn địch",
        "%"
      ],
      [
        "DTA_DODGE_DOWN",
        "Giảm Né địch",
        "%"
      ]
    ],
    "tiers": [
      {
        "DTA_ACC_DOWN": 0.6,
        "DTA_DODGE_DOWN": 0.4
      },
      {
        "DTA_ACC_DOWN": 0.7,
        "DTA_DODGE_DOWN": 0.5
      },
      {
        "DTA_ACC_DOWN": 0.8,
        "DTA_DODGE_DOWN": 0.6
      },
      {
        "DTA_ACC_DOWN": 0.9,
        "DTA_DODGE_DOWN": 0.7
      }
    ],
    "keep": "3 hit toàn địch, 2 hiệp."
  },
  "27": {
    "name": "Linh Lung",
    "fn": "linhLungUlt",
    "fields": [
      [
        "LLG_HITS",
        "Hit toàn địch",
        "#"
      ],
      [
        "LLG_TURNS",
        "Hiệp cầm chân Tốc về 0",
        "#"
      ]
    ],
    "tiers": [
      {
        "LLG_HITS": 3,
        "LLG_TURNS": 2
      },
      {
        "LLG_HITS": 5,
        "LLG_TURNS": 3
      },
      {
        "LLG_HITS": 5,
        "LLG_TURNS": 4
      },
      {
        "LLG_HITS": 5,
        "LLG_TURNS": 5
      }
    ],
    "keep": "Giữ nguyên tổng hiệu lực sát thương."
  },
  "28": {
    "name": "Tôn Ngộ Không",
    "fn": "ngoKhongUlt",
    "fields": [
      [
        "NK_ATK_UP",
        "Tăng Công bản thân",
        "%"
      ]
    ],
    "tiers": [
      {
        "NK_ATK_UP": 3.5
      },
      {
        "NK_ATK_UP": 4
      },
      {
        "NK_ATK_UP": 4.5
      },
      {
        "NK_ATK_UP": 5
      }
    ],
    "keep": "Buff 1 hiệp, phân thân tối đa 3 địch, mỗi địch 2 hit và thêm 1 gậy; bỏ qua Thủ."
  },
  "29": {
    "name": "Na Tra",
    "fn": "naTraUlt",
    "fields": [
      [
        "NT_ATK_UP",
        "Tăng Công toàn đội",
        "%"
      ],
      [
        "NT_DODGE_DOWN",
        "Giảm Né toàn địch",
        "%"
      ],
      [
        "NT_BURN_PCT",
        "Thiêu đốt HP hiện tại mỗi hiệp",
        "%"
      ]
    ],
    "tiers": [
      {
        "NT_ATK_UP": 0.3,
        "NT_DODGE_DOWN": 0.4,
        "NT_BURN_PCT": 0.25
      },
      {
        "NT_ATK_UP": 0.4,
        "NT_DODGE_DOWN": 0.5,
        "NT_BURN_PCT": 0.3
      },
      {
        "NT_ATK_UP": 0.5,
        "NT_DODGE_DOWN": 0.6,
        "NT_BURN_PCT": 0.35
      },
      {
        "NT_ATK_UP": 0.6,
        "NT_DODGE_DOWN": 0.7,
        "NT_BURN_PCT": 0.4
      }
    ],
    "keep": "3 hit toàn địch, 2 hiệp."
  },
  "30": {
    "name": "Sa Tăng",
    "fn": "saTangUlt",
    "fields": [
      [
        "SB_TOUGH_UP",
        "Tăng Bền toàn đội",
        "#"
      ],
      [
        "SB_TOUGH_DOWN",
        "Giảm Bền toàn địch",
        "#"
      ]
    ],
    "tiers": [
      {
        "SB_TOUGH_UP": 40,
        "SB_TOUGH_DOWN": 40
      },
      {
        "SB_TOUGH_UP": 50,
        "SB_TOUGH_DOWN": 50
      },
      {
        "SB_TOUGH_UP": 60,
        "SB_TOUGH_DOWN": 60
      },
      {
        "SB_TOUGH_UP": 70,
        "SB_TOUGH_DOWN": 70
      }
    ],
    "keep": "3 hit toàn địch, 2 hiệp."
  },
  "31": {
    "name": "Bát Giới",
    "fn": "batGioiUlt",
    "fields": [
      [
        "BG_DEF_UP",
        "Tăng Thủ bản thân",
        "%"
      ],
      [
        "BG_HEAL",
        "Hồi HP tối đa",
        "%"
      ]
    ],
    "tiers": [
      {
        "BG_DEF_UP": 2,
        "BG_HEAL": 2
      },
      {
        "BG_DEF_UP": 3,
        "BG_HEAL": 3
      },
      {
        "BG_DEF_UP": 4,
        "BG_HEAL": 4
      },
      {
        "BG_DEF_UP": 5,
        "BG_HEAL": 5
      }
    ],
    "keep": "Buff 3 hiệp, lượt nào cũng Ulti; HP không vượt HP tối đa."
  },
  "32": {
    "name": "Bạch Cốt Tinh",
    "fn": "bachCotUlt",
    "fields": [
      [
        "BCT_HITS",
        "Hit toàn địch",
        "#"
      ],
      [
        "CP_BCT_CHARM",
        "Số địch thôi miên",
        "#"
      ]
    ],
    "tiers": [
      {
        "BCT_HITS": 3,
        "CP_BCT_CHARM": 2
      },
      {
        "BCT_HITS": 4,
        "CP_BCT_CHARM": 2
      },
      {
        "BCT_HITS": 5,
        "CP_BCT_CHARM": 3
      },
      {
        "BCT_HITS": 6,
        "CP_BCT_CHARM": 4
      }
    ],
    "keep": "Ưu tiên Công kích/Kỹ năng, ép địch tung Ulti đánh đồng đội của nó."
  },
  "33": {
    "name": "Thái Thượng Lão Quân",
    "fn": "thaiThuongUlt",
    "fields": [
      [
        "LQ_HITS",
        "Hit toàn địch",
        "#"
      ],
      [
        "LQ_HEAL_UP",
        "Tăng hiệu quả hồi máu",
        "%"
      ],
      [
        "LQ_HEAL_TURNS",
        "Hiệp tăng hồi máu",
        "#"
      ],
      [
        "LQ_NOHEAL_TURNS",
        "Hiệp cấm hồi máu",
        "#"
      ]
    ],
    "tiers": [
      {
        "LQ_HITS": 5,
        "LQ_HEAL_UP": 2,
        "LQ_HEAL_TURNS": 3,
        "LQ_NOHEAL_TURNS": 3
      },
      {
        "LQ_HITS": 5,
        "LQ_HEAL_UP": 3,
        "LQ_HEAL_TURNS": 3,
        "LQ_NOHEAL_TURNS": 3
      },
      {
        "LQ_HITS": 6,
        "LQ_HEAL_UP": 4,
        "LQ_HEAL_TURNS": 4,
        "LQ_NOHEAL_TURNS": 4
      },
      {
        "LQ_HITS": 6,
        "LQ_HEAL_UP": 5,
        "LQ_HEAL_TURNS": 5,
        "LQ_NOHEAL_TURNS": 5
      }
    ],
    "keep": "Hệ số hồi máu = 1 + mức tăng, toàn đội; cấm hồi máu toàn địch."
  },
  "34": {
    "name": "Diêm La Vương",
    "fn": "diemLaVuongUlt",
    "fields": [
      [
        "DL_CRIT_UP",
        "Tăng Bạo toàn đội",
        "%"
      ],
      [
        "DL_CDMG_UP",
        "Tăng Bạo Sát toàn đội",
        "%"
      ],
      [
        "DL_TURNS",
        "Số hiệp",
        "#"
      ]
    ],
    "tiers": [
      {
        "DL_CRIT_UP": 3.5,
        "DL_CDMG_UP": 3,
        "DL_TURNS": 2
      },
      {
        "DL_CRIT_UP": 4,
        "DL_CDMG_UP": 3.5,
        "DL_TURNS": 2
      },
      {
        "DL_CRIT_UP": 4.5,
        "DL_CDMG_UP": 4,
        "DL_TURNS": 3
      },
      {
        "DL_CRIT_UP": 5,
        "DL_CDMG_UP": 4.5,
        "DL_TURNS": 3
      }
    ],
    "keep": "4 hit toàn địch; vào trận đầy Nộ."
  },
  "58271": {
    "name": "Hỏa Đế",
    "fn": "hoaDeUlt",
    "fields": [
      [
        "HDE_HITS",
        "Số hit hàng trước",
        "#"
      ],
      [
        "HDE_BURN_PCT",
        "Thiêu đốt HP hiện tại mỗi hiệp",
        "%"
      ],
      [
        "HDE_BURN_TURNS",
        "Số hiệp",
        "#"
      ]
    ],
    "tiers": [
      {
        "HDE_HITS": 4,
        "HDE_BURN_PCT": 0.25,
        "HDE_BURN_TURNS": 2
      },
      {
        "HDE_HITS": 5,
        "HDE_BURN_PCT": 0.35,
        "HDE_BURN_TURNS": 2
      },
      {
        "HDE_HITS": 6,
        "HDE_BURN_PCT": 0.4,
        "HDE_BURN_TURNS": 3
      },
      {
        "HDE_HITS": 7,
        "HDE_BURN_PCT": 0.45,
        "HDE_BURN_TURNS": 4
      }
    ],
    "keep": "Đánh hàng trước; giữ nguyên tổng hiệu lực."
  },
  "58316": {
    "name": "Linda",
    "fn": "lindaUlt",
    "fields": [
      [
        "LD_CRIT_UP",
        "Tăng Bạo bản thân",
        "%"
      ],
      [
        "LD_CDMG_UP",
        "Tăng Bạo Sát bản thân",
        "%"
      ],
      [
        "LD_TOUGH_DOWN",
        "Giảm Bền toàn địch",
        "P"
      ]
    ],
    "tiers": [
      {
        "LD_CRIT_UP": 3.5,
        "LD_CDMG_UP": 3.5,
        "LD_TOUGH_DOWN": 60
      },
      {
        "LD_CRIT_UP": 4,
        "LD_CDMG_UP": 4,
        "LD_TOUGH_DOWN": 70
      },
      {
        "LD_CRIT_UP": 5,
        "LD_CDMG_UP": 5,
        "LD_TOUGH_DOWN": 80
      },
      {
        "LD_CRIT_UP": 6,
        "LD_CDMG_UP": 6,
        "LD_TOUGH_DOWN": 90
      }
    ],
    "keep": "4 hit toàn địch, 2 hiệp; giảm Bền theo tỷ lệ % khi có Công Pháp."
  },
  "58372": {
    "name": "Đông Phương Bất Bại",
    "fn": "dongPhuongUlt",
    "fields": [
      [
        "DPBB_PIERCE",
        "Tăng Phá giáp bản thân",
        "#"
      ],
      [
        "DPBB_DOWN",
        "Giảm Phá giáp mục tiêu",
        "%"
      ],
      [
        "DPBB_TURNS",
        "Số hiệp",
        "#"
      ]
    ],
    "tiers": [
      {
        "DPBB_PIERCE": 25000,
        "DPBB_DOWN": 0.6,
        "DPBB_TURNS": 2
      },
      {
        "DPBB_PIERCE": 35000,
        "DPBB_DOWN": 0.7,
        "DPBB_TURNS": 2
      },
      {
        "DPBB_PIERCE": 45000,
        "DPBB_DOWN": 0.7,
        "DPBB_TURNS": 3
      },
      {
        "DPBB_PIERCE": 55000,
        "DPBB_DOWN": 0.8,
        "DPBB_TURNS": 3
      }
    ],
    "keep": "3 địch ngẫu nhiên, mỗi địch 5 hit."
  },
  "59787": {
    "name": "Thủy Tinh",
    "fn": "thuyTinhUlt",
    "fields": [
      [
        "TTINH_HITS",
        "Hit toàn địch",
        "#"
      ],
      [
        "TTINH_STUN",
        "Hiệp choáng toàn địch",
        "#"
      ]
    ],
    "tiers": [
      {
        "TTINH_HITS": 4,
        "TTINH_STUN": 1
      },
      {
        "TTINH_HITS": 4,
        "TTINH_STUN": 2
      },
      {
        "TTINH_HITS": 5,
        "TTINH_STUN": 2
      },
      {
        "TTINH_HITS": 6,
        "TTINH_STUN": 2
      }
    ],
    "keep": "Xóa Nộ toàn địch, hồi đầy Nộ đồng đội trừ bản thân."
  },
  "61813": {
    "name": "Hải Công Chúa",
    "fn": "haiCongChuaUlt",
    "fields": [
      [
        "HCC_HITS",
        "Hit địch HP thấp nhất",
        "#"
      ],
      [
        "HCC_SILENCE",
        "Hiệp câm lặng toàn địch",
        "#"
      ],
      [
        "HCC_NOBUFF",
        "Hiệp khóa buff toàn địch",
        "#"
      ],
      [
        "HCC_BLAST",
        "Sát thương chuẩn tự bạo",
        "#"
      ]
    ],
    "tiers": [
      {
        "HCC_HITS": 7,
        "HCC_SILENCE": 1,
        "HCC_NOBUFF": 2,
        "HCC_BLAST": 60000
      },
      {
        "HCC_HITS": 7,
        "HCC_SILENCE": 1,
        "HCC_NOBUFF": 2,
        "HCC_BLAST": 70000
      },
      {
        "HCC_HITS": 8,
        "HCC_SILENCE": 2,
        "HCC_NOBUFF": 2,
        "HCC_BLAST": 80000
      },
      {
        "HCC_HITS": 8,
        "HCC_SILENCE": 2,
        "HCC_NOBUFF": 3,
        "HCC_BLAST": 90000
      }
    ],
    "keep": "Xóa buff; tự bạo dưới 10% HP, trừ Boss, không hồi sinh."
  },
  "63917": {
    "name": "Lính Đánh Thuê",
    "fn": "linhDanhThueUlt",
    "fields": [
      [
        "LDT_PIERCE_UP",
        "Tăng Phá giáp bản thân",
        "#"
      ],
      [
        "LDT_DEF_DOWN",
        "Giảm Thủ địch",
        "%"
      ],
      [
        "LDT_BLOCK_DOWN",
        "Giảm Đỡ đòn địch",
        "%"
      ]
    ],
    "tiers": [
      {
        "LDT_PIERCE_UP": 50000,
        "LDT_DEF_DOWN": 0.6,
        "LDT_BLOCK_DOWN": 0.6
      },
      {
        "LDT_PIERCE_UP": 60000,
        "LDT_DEF_DOWN": 0.65,
        "LDT_BLOCK_DOWN": 0.65
      },
      {
        "LDT_PIERCE_UP": 65000,
        "LDT_DEF_DOWN": 0.7,
        "LDT_BLOCK_DOWN": 0.7
      },
      {
        "LDT_PIERCE_UP": 70000,
        "LDT_DEF_DOWN": 0.75,
        "LDT_BLOCK_DOWN": 0.75
      }
    ],
    "keep": "5 hit toàn địch, 2 hiệp."
  },
  "67926": {
    "name": "Tuyết Đế",
    "fn": "tuyetDeUlt",
    "fields": [
      [
        "TDE_HITS",
        "Hit toàn địch",
        "#"
      ],
      [
        "TDE_FREEZE",
        "Hiệp đóng băng",
        "#"
      ]
    ],
    "tiers": [
      {
        "TDE_HITS": 5,
        "TDE_FREEZE": 2
      },
      {
        "TDE_HITS": 6,
        "TDE_FREEZE": 2
      },
      {
        "TDE_HITS": 7,
        "TDE_FREEZE": 3
      },
      {
        "TDE_HITS": 7,
        "TDE_FREEZE": 3
      }
    ],
    "keep": "Đóng băng gây mất lượt."
  },
  "73649": {
    "name": "Dương Quá",
    "fn": "duongQuaUlt",
    "fields": [
      [
        "DQ_ACC",
        "Tăng Chuẩn đội ta và giảm Chuẩn mục tiêu",
        "#"
      ],
      [
        "DQ_DODGE",
        "Tăng Né đội ta và giảm Né mục tiêu",
        "#"
      ]
    ],
    "tiers": [
      {
        "DQ_ACC": 350,
        "DQ_DODGE": 350
      },
      {
        "DQ_ACC": 400,
        "DQ_DODGE": 400
      },
      {
        "DQ_ACC": 500,
        "DQ_DODGE": 500
      },
      {
        "DQ_ACC": 600,
        "DQ_DODGE": 600
      }
    ],
    "keep": "3 địch ngẫu nhiên, 5 hit mỗi địch, 2 hiệp."
  },
  "84621": {
    "name": "Sơn Tinh",
    "fn": "sonTinhUlt",
    "fields": [
      [
        "STINH_DEF",
        "Tăng Thủ toàn đội",
        "%"
      ],
      [
        "STINH_ATK",
        "Giảm Công toàn địch",
        "%"
      ],
      [
        "STINH_BLOCK",
        "Đỡ đòn nội tại",
        "%"
      ],
      [
        "STINH_TURNS",
        "Số hiệp",
        "#"
      ]
    ],
    "tiers": [
      {
        "STINH_DEF": 0.35,
        "STINH_ATK": 0.35,
        "STINH_BLOCK": 0.35,
        "STINH_TURNS": 2
      },
      {
        "STINH_DEF": 0.4,
        "STINH_ATK": 0.4,
        "STINH_BLOCK": 0.4,
        "STINH_TURNS": 2
      },
      {
        "STINH_DEF": 0.45,
        "STINH_ATK": 0.45,
        "STINH_BLOCK": 0.45,
        "STINH_TURNS": 2
      },
      {
        "STINH_DEF": 0.5,
        "STINH_ATK": 0.5,
        "STINH_BLOCK": 0.5,
        "STINH_TURNS": 2
      }
    ],
    "keep": "3 hit địch Công cao nhất; miễn khống chế toàn đội; nội tại đồng đội dưới 10% HP."
  },
  "86427": {
    "name": "Phong Thanh Dương",
    "fn": "phongThanhDuongUlt",
    "fields": [
      [
        "PTD_TARGETS",
        "Số địch ngẫu nhiên",
        "#"
      ],
      [
        "PTD_HITS",
        "Hit mỗi địch",
        "#"
      ],
      [
        "PTD_CRIT",
        "Tăng Bạo bản thân",
        "#"
      ],
      [
        "PTD_CDMG",
        "Tăng Bạo Sát bản thân",
        "#"
      ]
    ],
    "tiers": [
      {
        "PTD_TARGETS": 2,
        "PTD_HITS": 3,
        "PTD_CRIT": 400,
        "PTD_CDMG": 400
      },
      {
        "PTD_TARGETS": 3,
        "PTD_HITS": 3,
        "PTD_CRIT": 450,
        "PTD_CDMG": 450
      },
      {
        "PTD_TARGETS": 3,
        "PTD_HITS": 4,
        "PTD_CRIT": 550,
        "PTD_CDMG": 550
      },
      {
        "PTD_TARGETS": 3,
        "PTD_HITS": 5,
        "PTD_CRIT": 600,
        "PTD_CDMG": 600
      }
    ],
    "keep": "Buff 2 hiệp, một lần hiệu ứng Vạn Kiếm."
  },
  "90770": {
    "name": "Lục Tiểu Phụng",
    "fn": "luctieuphungUlt",
    "fields": [
      [
        "LTP_DODGE",
        "Tăng Né toàn đội",
        "%"
      ],
      [
        "LTP_ATK",
        "Tăng Công toàn đội",
        "%"
      ]
    ],
    "tiers": [
      {
        "LTP_DODGE": 0.8,
        "LTP_ATK": 0.6
      },
      {
        "LTP_DODGE": 0.9,
        "LTP_ATK": 0.7
      },
      {
        "LTP_DODGE": 1,
        "LTP_ATK": 0.8
      },
      {
        "LTP_DODGE": 1.1,
        "LTP_ATK": 0.9
      }
    ],
    "keep": "4 hit toàn địch, 2 hiệp."
  },
  "97950": {
    "name": "Tây Môn Xuy Tuyết",
    "fn": "taymonxuytuyetUlt",
    "fields": [
      [
        "TMXT_HITS",
        "Hit mỗi địch",
        "#"
      ],
      [
        "TMXT_DODGE",
        "Tăng Né toàn đội",
        "%"
      ]
    ],
    "tiers": [
      {
        "TMXT_HITS": 5,
        "TMXT_DODGE": 0.8
      },
      {
        "TMXT_HITS": 6,
        "TMXT_DODGE": 0.9
      },
      {
        "TMXT_HITS": 7,
        "TMXT_DODGE": 1
      },
      {
        "TMXT_HITS": 8,
        "TMXT_DODGE": 1.1
      }
    ],
    "keep": "3 địch ngẫu nhiên, choáng 1 hiệp, buff Né 2 hiệp."
  },
  "91763": {
    "name": "Tiểu Long Nữ",
    "fn": "tieuLongNuUlt",
    "fields": [
      [
        "TLN_HITS",
        "Hit địch Công cao nhất",
        "#"
      ],
      [
        "TLN_ATK_UP",
        "Tăng Công bản thân",
        "%"
      ],
      [
        "TLN_DODGE",
        "Tăng Né bản thân",
        "#"
      ],
      [
        "TLN_ATK_TURNS",
        "Hiệp buff Công",
        "#"
      ]
    ],
    "tiers": [
      {
        "TLN_HITS": 4,
        "TLN_ATK_UP": 6,
        "TLN_DODGE": 550,
        "TLN_ATK_TURNS": 3
      },
      {
        "TLN_HITS": 5,
        "TLN_ATK_UP": 7,
        "TLN_DODGE": 600,
        "TLN_ATK_TURNS": 3
      },
      {
        "TLN_HITS": 6,
        "TLN_ATK_UP": 8,
        "TLN_DODGE": 650,
        "TLN_ATK_TURNS": 3
      },
      {
        "TLN_HITS": 7,
        "TLN_ATK_UP": 9,
        "TLN_DODGE": 700,
        "TLN_ATK_TURNS": 3
      }
    ],
    "keep": "Buff Công trước Ulti; Né 2 hiệp; bỏ qua Thủ."
  }
};
window.CP_STAGE_NAMES = ["Chưa nâng", "Hoàng Giai", "Huyền Giai", "Địa Giai", "Thiên Giai"];

// Sách Công Pháp: mỗi giai dùng đúng loại sách, giá mặc định gấp đôi.
window.CP_BOOKS = [null,
  {name:'Công Pháp Hoàng Giai', file:'hoang-giai.png', n:100},
  {name:'Công Pháp Huyền Giai', file:'huyen-giai.png', n:200},
  {name:'Công Pháp Địa Giai', file:'dia-giai.png', n:400},
  {name:'Công Pháp Thiên Giai', file:'thien-giai.png', n:800}
];
window.CP_BOOK_COST = tier => { const b=window.CP_BOOKS[tier]; return b ? [{k:b.name,n:b.n}] : null; };
