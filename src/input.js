import { KEY } from './constants.js';

export class InputHandler {
  constructor(game) {
    this.game = game;
    this.boundHandleInput = this.handleInput.bind(this);
    this.addListeners();
    this.addMobileControls();
  }

  addListeners() {
    window.addEventListener('keydown', this.boundHandleInput);
    
    // Bind overlay handlers
    this.boundTouchStart = (e) => {
      e.preventDefault();
      this.handleOverlayInput();
    };
    
    this.boundClick = () => {
      this.handleOverlayInput();
    };

    const overlay = document.getElementById('overlay');
    overlay.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    overlay.addEventListener('click', this.boundClick);
  }

  removeListeners() {
    window.removeEventListener('keydown', this.boundHandleInput);
    const overlay = document.getElementById('overlay');
    if (overlay) {
      overlay.removeEventListener('touchstart', this.boundTouchStart);
      overlay.removeEventListener('click', this.boundClick);
    }
  }

  handleOverlayInput() {
    // If Game Over (and not just initial state), do nothing (buttons handle it)
    if (this.game.isGameOver) {
      return; 
    }

    if (!this.game.isPlaying) {
      this.game.start();
    } else if (this.game.isPaused) {
      this.game.togglePause();
    }
  }

  handleInput(event) {
    if (this.game.isGameOver) {
      if (event.key === KEY.ENTER) {
        this.game.reset();
      }
      return;
    }

    if (this.game.isPaused) {
      if (event.key === KEY.P || event.key === KEY.ESC) {
        this.game.togglePause();
      }
      return;
    }

    // Game starting
    if (!this.game.isPlaying) {
      if (event.key === KEY.ENTER) {
        this.game.start();
      }
      return;
    }

    // In-game controls
    switch (event.key) {
      case KEY.LEFT:
        this.game.moveLeft();
        break;
      case KEY.RIGHT:
        this.game.moveRight();
        break;
      case KEY.DOWN:
        this.game.moveDown();
        break;
      case KEY.UP:
        this.game.rotate();
        break;
      case KEY.SPACE:
        this.game.hardDrop();
        break;
      case KEY.P:
      case KEY.ESC:
        this.game.togglePause();
        break;
    }
  }

  addMobileControls() {
    const bindBtn = (id, action) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      
      // Prevent double firing on some devices
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Stop mouse emulation
        action();
      }, { passive: false });

      btn.addEventListener('mousedown', (e) => {
        action();
      });
    };

    bindBtn('btn-left', () => {
      if (!this.game.isPlaying && !this.game.isGameOver) {
         // Maybe allow start on any button press?
      } else {
        this.game.moveLeft();
      }
    });

    bindBtn('btn-right', () => this.game.moveRight());
    bindBtn('btn-down', () => this.game.moveDown());
    bindBtn('btn-rotate', () => {
      if (this.game.isGameOver || !this.game.isPlaying) {
        this.game.start();
      } // If waiting, start
      else {
        this.game.rotate();
      }
    });
    bindBtn('btn-drop', () => {
       if (this.game.isGameOver || !this.game.isPlaying) {
          this.game.start();
       } else {
          this.game.hardDrop();
       }
    });
  }
}

