import { BLOCK_SIZE, COLS, ROWS, COLORS } from './constants.js';

export class Renderer {
  constructor(canvasId, holdCanvasId, nextCanvasId, opponentCanvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    this.holdCanvas = document.getElementById(holdCanvasId);
    this.holdCtx = this.holdCanvas.getContext('2d');

    this.nextCanvas = document.getElementById(nextCanvasId);
    this.nextCtx = this.nextCanvas.getContext('2d');

    this.opponentCanvas = document.getElementById(opponentCanvasId);
    if (this.opponentCanvas) {
      this.opponentCtx = this.opponentCanvas.getContext('2d');
      // Scale opponent canvas (half size of main board)
      this.scaleCanvas(this.opponentCanvas, this.opponentCtx, (COLS * BLOCK_SIZE) / 2, (ROWS * BLOCK_SIZE) / 2);
    }

    this.scaleCanvas(this.canvas, this.ctx, COLS * BLOCK_SIZE, ROWS * BLOCK_SIZE);
    
    // Preview canvases are smaller (4x4 blocks approx)
    this.scaleCanvas(this.holdCanvas, this.holdCtx, 120, 100);
    this.scaleCanvas(this.nextCanvas, this.nextCtx, 120, 100);
  }

  scaleCanvas(canvas, ctx, width, height) {
    canvas.width = width;
    canvas.height = height;
    ctx.scale(1, 1);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.holdCtx.clearRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
    this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
  }

  drawBoard(board) {
    board.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value > 0) {
          this.drawBlock(this.ctx, x, y, value);
        }
      });
    });
  }

  drawPiece(piece) {
    piece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value > 0) {
          this.drawBlock(this.ctx, piece.x + x, piece.y + y, value);
        }
      });
    });
  }

  drawGhostPiece(piece, ghostY) {
    this.ctx.globalAlpha = 0.2;
    piece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value > 0) {
          this.drawBlock(this.ctx, piece.x + x, ghostY + y, value);
        }
      });
    });
    this.ctx.globalAlpha = 1.0;
  }

  drawBlock(ctx, x, y, colorId, scale = BLOCK_SIZE) {
    const color = COLORS[colorId];
    ctx.fillStyle = color;
    
    // Glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    
    // Main block
    ctx.fillRect(x * scale, y * scale, scale, scale);
    
    // Inner bevel/highlight for premium look
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(x * scale, y * scale, scale, scale * 0.1); // Top highlight
    ctx.fillRect(x * scale, y * scale, scale * 0.1, scale); // Left highlight
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(x * scale, (y + 1) * scale - scale * 0.1, scale, scale * 0.1); // Bottom shadow
    ctx.fillRect((x + 1) * scale - scale * 0.1, y * scale, scale * 0.1, scale); // Right shadow

    // Reset stroke
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.strokeRect(x * scale, y * scale, scale, scale);
  }

  drawNext(piece) {
    if (!piece) return;
    this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
    this.drawPreviewPiece(this.nextCtx, piece);
  }

  drawHold(piece) {
    if (!piece) return;
    this.holdCtx.clearRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
    this.drawPreviewPiece(this.holdCtx, piece);
  }

  drawPreviewPiece(ctx, piece) {
    // Center the piece in the preview canvas
    // Assuming 4x4 max size, roughly centered
    const offsetX = (4 - piece.shape[0].length) / 2;
    const offsetY = (4 - piece.shape.length) / 2;

    piece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value > 0) {
          this.drawBlock(ctx, x + offsetX, y + offsetY, value, 25); // Smaller blocks for preview
        }
      });
    });
  }

  drawOpponentBoard(grid) {
    if (!this.opponentCtx || !grid) return;
    this.opponentCtx.clearRect(0, 0, this.opponentCanvas.width, this.opponentCanvas.height);
    
    // Calculate scale factor (0.5 to fit)
    const scale = (BLOCK_SIZE / 2);

    grid.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value > 0) {
          this.drawBlock(this.opponentCtx, x, y, value, scale);
        }
      });
    });
  }
}
