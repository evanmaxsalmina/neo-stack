export const COLS = 10;
export const ROWS = 20;
export const BLOCK_SIZE = 30;

export const KEY = {
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  DOWN: 'ArrowDown',
  UP: 'ArrowUp',
  SPACE: ' ',
  ENTER: 'Enter',
  ESC: 'Escape',
  P: 'p'
};

export const MOVES = {
  [KEY.LEFT]: (p) => ({ ...p, x: p.x - 1 }),
  [KEY.RIGHT]: (p) => ({ ...p, x: p.x + 1 }),
  [KEY.DOWN]: (p) => ({ ...p, y: p.y + 1 }),
  [KEY.SPACE]: (p) => ({ ...p, y: p.y + 1 }),
  [KEY.UP]: (p) => p 
};

export const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  J: [
    [2, 0, 0],
    [2, 2, 2],
    [0, 0, 0]
  ],
  L: [
    [0, 0, 3],
    [3, 3, 3],
    [0, 0, 0]
  ],
  O: [
    [4, 4],
    [4, 4]
  ],
  S: [
    [0, 5, 5],
    [5, 5, 0],
    [0, 0, 0]
  ],
  Z: [
    [6, 6, 0],
    [0, 6, 6],
    [0, 0, 0]
  ],
  T: [
    [0, 7, 0],
    [7, 7, 7],
    [0, 0, 0]
  ]
};

export const COLORS = [
  'none',
  '#00f0f0', // I - Cyan
  '#0000f0', // J - Blue
  '#f0a000', // L - Orange
  '#f0f000', // O - Yellow
  '#00f000', // S - Green
  '#f00000', // Z - Red
  '#a000f0'  // T - Purple
];

export const POINTS = {
  SINGLE: 100,
  DOUBLE: 300,
  TRIPLE: 500,
  TETRIS: 800,
  SOFT_DROP: 1,
  HARD_DROP: 2
};

export const LEVELS = {
  0: 800,
  1: 720,
  2: 630,
  3: 550,
  4: 470,
  5: 380,
  6: 300,
  7: 220,
  8: 130,
  9: 100,
  10: 80
};
