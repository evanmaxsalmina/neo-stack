import { COLS, ROWS, BLOCK_SIZE, SHAPES, KEY, MOVES, POINTS, LEVELS } from './constants.js';
import { Board } from './board.js';
import { Renderer } from './renderer.js';
import { InputHandler } from './input.js';
import { AudioController } from './audio.js';

export class Game {
  constructor(network = null, roomCode = null) {
    this.board = new Board();
    // Pass 'opponent-canvas' as 4th argument
    this.renderer = new Renderer('game-canvas', 'hold-canvas', 'next-canvas', 'opponent-canvas');
    this.input = new InputHandler(this);
    this.audio = new AudioController();
    
    this.requestId = null;
    this.time = { start: 0, elapsed: 0, level: 1000 };

    // Multiplayer properties
    this.network = network;
    this.roomCode = roomCode;
    this.isMultiplayer = !!network;
    
    this.setupState();
    this.setupMultiplayer();
  }

  setupMultiplayer() {
    if (!this.isMultiplayer) return;

    this.network.on('opponent_state', (data) => {
      // data: { grid, score, isGameOver }
      if (data.grid) {
        this.renderer.drawOpponentBoard(data.grid);
      }
      if (data.isGameOver) {
        document.getElementById('opponent-status').innerText = "GAME OVER";
        document.getElementById('opponent-status').style.color = "red";
      } else {
        document.getElementById('opponent-status').innerText = `Score: ${data.score}`;
        document.getElementById('opponent-status').style.color = "#aaa";
      }
    });

    this.network.on('opponent_left', () => {
      this.showDisconnect("Opponent Left!");
      document.getElementById('opponent-status').innerText = "Left";
    });
    
    // Initial status
    document.getElementById('opponent-status').innerText = "Connected";
  }

  // Helper to send state
  emitState() {
    if (!this.isMultiplayer || !this.isPlaying) return;
    
    // We send the grid matrix. 
    this.network.updateState({
      grid: this.board.grid, 
      score: this.score,
      isGameOver: this.isGameOver
    });
  }

  setupState() {
    this.score = 0;
    this.lines = 0;
    this.level = 0;
    this.grid = this.board.grid;
    this.piece = null;
    this.nextPiece = null;
    this.holdPiece = null;
    this.canHold = true;
    this.isPlaying = false;
    this.isPaused = false;
    this.isGameOver = false;
  }

  start() {
    if (this.isPlaying) return;
    this.setupState();
    this.board.reset();
    this.piece = this.getNewPiece();
    this.nextPiece = this.getNewPiece();
    this.isPlaying = true;
    this.isPaused = false;
    this.isGameOver = false;
    
    document.getElementById('overlay').classList.add('hidden');
    document.getElementById('score').innerText = this.score;
    document.getElementById('lines').innerText = this.lines;
    document.getElementById('level').innerText = this.level;

    this.animate();
  }

  reset() {
    this.setupState();
    this.board.reset();
    this.renderer.clear();
    
    // UI Reset
    const overlay = document.getElementById('overlay');
    overlay.classList.remove('hidden');
    document.getElementById('overlay-title').innerHTML = 'NEO-STACK';
    document.getElementById('overlay-msg').innerText = 'Press ENTER to Start';
    document.getElementById('overlay-buttons').classList.add('hidden');
  }

  // ... (rest of methods)

  togglePause() {
    if (!this.isPlaying || this.isGameOver) return;
    this.isPaused = !this.isPaused;
    
    const overlay = document.getElementById('overlay');
    
    if (this.isPaused) {
      overlay.classList.remove('hidden');
      document.getElementById('overlay-title').innerHTML = 'PAUSED';
      document.getElementById('overlay-msg').innerText = 'Press P to Resume';
      document.getElementById('overlay-buttons').classList.add('hidden');
    } else {
      overlay.classList.add('hidden');
      this.animate();
    }
  }

  gameOver() {
    this.isPlaying = false;
    this.isGameOver = true;
    this.audio.gameOver();
    
    const overlay = document.getElementById('overlay');
    overlay.classList.remove('hidden');
    document.getElementById('overlay-title').innerHTML = 'GAME OVER';
    document.getElementById('overlay-msg').innerText = `Final Score: ${this.score}`;
    
    // Show buttons
    document.getElementById('overlay-buttons').classList.remove('hidden');
    
    if (this.isMultiplayer) {
      this.emitState(); // Send final game over state
    }
  }

  showDisconnect(msg = "Opponent Disconnected") {
    this.isPlaying = false;
    this.isGameOver = true; // Stop game logic
    
    const overlay = document.getElementById('overlay');
    overlay.classList.remove('hidden');
    document.getElementById('overlay-title').innerHTML = 'DISCONNECTED';
    document.getElementById('overlay-msg').innerText = msg;
    document.getElementById('overlay-buttons').classList.remove('hidden');
    
    // Hide Play Again for disconnect if desired, or keep it to restart looking for room
    // For simplicity, we keep buttons but maybe change text contextually or main.js handles it
  }

  createNewPiece() {
    const types = 'IJLOSTZ';
    const type = types[Math.floor(Math.random() * types.length)];
    const shape = SHAPES[type];
    const colorId = types.indexOf(type) + 1;
    
    return {
      type,
      shape,
      colorId,
      x: 3,
      y: 0
    };
  }

  getNewPiece() {
    return this.createNewPiece();
  }

  animate(now = 0) {
    if (!this.isPlaying || this.isPaused) return;

    this.time.elapsed = now - this.time.start;
    if (this.time.elapsed > (LEVELS[this.level] || 100)) {
      this.time.start = now;
      this.moveDown(true); // Auto drop
    }
    
    this.draw();
    this.requestId = requestAnimationFrame(this.animate.bind(this));
  }

  draw() {
    this.renderer.clear();
    this.renderer.drawBoard(this.board.grid);
    this.renderer.drawGhostPiece(this.piece, this.getGhostY());
    this.renderer.drawPiece(this.piece);
    this.renderer.drawNext(this.nextPiece);
    this.renderer.drawHold(this.holdPiece);
    
    // Throttle network updates (every 500ms) to prevent flooding
    const now = Date.now();
    if (!this.lastEmitTime || now - this.lastEmitTime > 500) {
       this.emitState();
       this.lastEmitTime = now;
    }
  }

  getGhostY() {
    let p = { ...this.piece };
    while (this.board.isValid(p)) {
      p.y++;
    }
    return p.y - 1;
  }

  moveDown(auto = false) {
    if (!this.isPlaying) return;
    
    let p = MOVES[KEY.DOWN](this.piece);
    if (this.board.isValid(p)) {
      this.piece.move(p);
      if (!auto) {
        this.score += POINTS.SOFT_DROP;
        this.audio.move(); // Optional: subtle sound for soft drop
      }
    } else {
      this.freeze();
    }
  }

  freeze() {
    this.board.freeze(this.piece);
    if (this.piece.y === 0) {
      this.gameOver();
      return;
    }
    
    this.audio.drop();
    
    // Clear lines
    const linesCleared = this.board.clearLines();
    if (linesCleared > 0) {
      this.updateScore(linesCleared);
      this.audio.lineClear();
    }
    
    // Check level up
    if (this.lines >= (this.level + 1) * 10) {
      this.level++;
      document.getElementById('level').innerText = this.level;
    }

    this.piece = this.nextPiece;
    this.nextPiece = this.getNewPiece();
    this.canHold = true;
    this.draw(); // Force draw to show locked piece immediately
  }

  updateScore(lines) {
    const linePoints = [0, POINTS.SINGLE, POINTS.DOUBLE, POINTS.TRIPLE, POINTS.TETRIS];
    this.score += linePoints[lines] * (this.level + 1);
    this.lines += lines;
    
    document.getElementById('score').innerText = this.score;
    document.getElementById('lines').innerText = this.lines;
  }

  moveLeft() {
    let p = MOVES[KEY.LEFT](this.piece);
    if (this.board.isValid(p)) {
      this.piece.move(p);
      this.audio.move();
      this.draw();
    }
  }

  moveRight() {
    let p = MOVES[KEY.RIGHT](this.piece);
    if (this.board.isValid(p)) {
      this.piece.move(p);
      this.audio.move();
      this.draw();
    }
  }

  rotate() {
    // Clone piece and rotate shape
    let p = JSON.parse(JSON.stringify(this.piece));
    // Transpose + Reverse = Rotate 90 deg clockwise
    for (let y = 0; y < p.shape.length; ++y) {
      for (let x = 0; x < y; ++x) {
        [p.shape[x][y], p.shape[y][x]] = [p.shape[y][x], p.shape[x][y]];
      }
    }
    p.shape.forEach(row => row.reverse());
    
    // Wall kick (basic)
    if (this.board.isValid(p)) {
      this.piece.shape = p.shape;
      this.audio.rotate();
      this.draw();
    } else {
      // Lazy Wall Kick attempt (try moving left/right)
      // Implementation omitted for brevity to keep it simple, but we could add offset inputs
    }
  }

  hardDrop() {
    while (this.board.isValid(MOVES[KEY.DOWN](this.piece))) {
      this.score += POINTS.HARD_DROP;
      this.piece.move(MOVES[KEY.DOWN](this.piece));
    }
    this.freeze();
  }

  // Methods moved up to group UI logic


  destroy() {
    this.isPlaying = false;
    cancelAnimationFrame(this.requestId);
    this.input.removeListeners();
    // Also remove mobile controls if we added them (simplification: we didn't store refs for mobile buttons, 
    // but they are less critical or we can rely on replacing the DOM/buttons or just ignore for now)
  }
}

// Helper to make piece movement easier in logic
Object.prototype.move = function(p) {
  this.x = p.x;
  this.y = p.y;
  this.shape = p.shape;
};
