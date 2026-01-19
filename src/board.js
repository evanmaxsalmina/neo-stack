import { ROWS, COLS } from './constants.js';

export class Board {
  constructor() {
    this.grid = this.getEmptyBoard();
  }

  getEmptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }

  reset() {
    this.grid = this.getEmptyBoard();
  }

  // Check if a move is valid
  isValid(p) {
    return p.shape.every((row, dy) => {
      return row.every((value, dx) => {
        let x = p.x + dx;
        let y = p.y + dy;
        return (
          value === 0 ||
          (this.isInside(x, y) && this.grid[y][x] === 0)
        );
      });
    });
  }

  isInside(x, y) {
    return x >= 0 && x < COLS && y >= 0 && y < ROWS;
  }

  freeze(piece) {
    piece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value > 0) {
          this.grid[piece.y + y][piece.x + x] = value;
        }
      });
    });
  }

  // Returns number of lines cleared
  clearLines() {
    let lines = 0;
    this.grid.forEach((row, y) => {
      if (row.every(value => value > 0)) {
        lines++;
        this.grid.splice(y, 1);
        this.grid.unshift(Array(COLS).fill(0));
      }
    });
    return lines;
  }
}
