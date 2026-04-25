// Stage data — logical units (reference height: 270)
const STAGES = {
  stage_001: {
    id: 'stage_001',
    name: 'はじまりの丘',
    type: 'normal',
    difficulty: 1,
    limitedUntil: null,
    hasWire: true,
    bgColor: '#1a1a2e',
    width: 1260,
    //
    // Platform layout (y = top edge; floor ~y=242)
    //
    platforms: [
      { x: 0,    y: 242, w: 160, h: 18, color: '#D4537E' }, // 0: 開始地点
      { x: 230,  y: 218, w: 90,  h: 18, color: '#D4537E' }, // 1
      { x: 390,  y: 195, w: 80,  h: 18, color: '#D4537E' }, // 2
      { x: 540,  y: 222, w: 100, h: 18, color: '#D4537E' }, // 3
      { x: 710,  y: 190, w: 85,  h: 18, color: '#D4537E' }, // 4
      { x: 870,  y: 212, w: 90,  h: 18, color: '#D4537E' }, // 5
      { x: 1040, y: 175, w: 150, h: 18, color: '#1D9E75' }, // 6: GOAL
    ],
    enemies: [
      // Walker on platform 1 (x:230-320, center:275) — range keeps it on platform
      { type: 'walker',  x: 265, y: 198, speed: 1,   range: 30 },
      // Floater between platforms 2-3 (air)
      { type: 'floater', x: 462, y: 168, floatAmp: 22, floatSpeed: 0.03 },
      // Walker on platform 3 (x:540-640, center:590)
      { type: 'walker',  x: 578, y: 202, speed: 1.3, range: 32 },
      // Floater near platform 4 (air)
      { type: 'floater', x: 738, y: 155, floatAmp: 18, floatSpeed: 0.036 },
      // Walker on platform 5 (x:870-960, center:915)
      { type: 'walker',  x: 903, y: 192, speed: 1.5, range: 28 },
    ],
    spawnX: 30,
    spawnY: 220,
    goalPlatformIndex: 6,
  },
  stage_002: {
    id: 'stage_002',
    name: '空の回廊',
    type: 'normal',
    difficulty: 2,
    limitedUntil: null,
    hasWire: true,
    bgColor: '#0d1020',
    width: 1500,
    //
    // ワイヤー必須ステージ
    // 歩行プラットフォーム間のギャップは 165〜185 px (最大ジャンプ距離~152 を超えるため跳べない)
    // 天井アンカーブロック（紫）にワイヤーを撃って振り子で渡る
    // Space / W でロープを手繰って高度を上げられる
    //
    platforms: [
      // ── 歩行プラットフォーム ──────────────────────────────────────
      { x: 0,    y: 238, w: 110, h: 18, color: '#D4537E' }, // 0 start
      { x: 275,  y: 232, w: 80,  h: 18, color: '#D4537E' }, // 1  gap 165
      { x: 530,  y: 225, w: 80,  h: 18, color: '#D4537E' }, // 2  gap 175
      { x: 790,  y: 230, w: 80,  h: 18, color: '#D4537E' }, // 3  gap 180
      { x: 1055, y: 222, w: 80,  h: 18, color: '#D4537E' }, // 4  gap 185
      { x: 1320, y: 215, w: 140, h: 18, color: '#1D9E75' }, // 5 GOAL  gap 185
      // ── 天井アンカーブロック（ワイヤーを刺す的）──────────────────
      // プラットフォーム右端の 40〜60px 先、y=95〜108 に配置
      { x: 148,  y: 98,  w: 42, h: 14, color: '#5B4FA8' }, // A0  P0→P1
      { x: 403,  y: 92,  w: 42, h: 14, color: '#5B4FA8' }, // A1  P1→P2
      { x: 660,  y: 96,  w: 42, h: 14, color: '#5B4FA8' }, // A2  P2→P3
      { x: 920,  y: 90,  w: 42, h: 14, color: '#5B4FA8' }, // A3  P3→P4
      { x: 1183, y: 94,  w: 42, h: 14, color: '#5B4FA8' }, // A4  P4→GOAL
    ],
    enemies: [
      // Platform 1 — walker
      { type: 'walker',  x: 290,  y: 212, speed: 1.3, range: 25 },
      // Air near A1
      { type: 'floater', x: 428,  y: 148, floatAmp: 26, floatSpeed: 0.03 },
      // Platform 3 — walker (faster)
      { type: 'walker',  x: 808,  y: 210, speed: 1.7, range: 25 },
      // Air near A3
      { type: 'floater', x: 946,  y: 145, floatAmp: 22, floatSpeed: 0.038 },
      // Platform 4 — walker (fast)
      { type: 'walker',  x: 1073, y: 202, speed: 2.0, range: 25 },
      // Air before GOAL — double floater gauntlet
      { type: 'floater', x: 1210, y: 135, floatAmp: 20, floatSpeed: 0.042 },
      { type: 'floater', x: 1265, y: 155, floatAmp: 16, floatSpeed: 0.05  },
    ],
    spawnX: 30,
    spawnY: 216,
    goalPlatformIndex: 5,
  },
};
