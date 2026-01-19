import './style.css';
import { Game } from './game.js';
import { Network } from './network.js';

// Init game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Prevent default key scrolling
    window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'SPACE'].includes(e.code)) {
            e.preventDefault();
        }
    }, false);

    const menuView = document.getElementById('menu-view');
    const gameView = document.getElementById('game-view');
    const multiMenu = document.getElementById('multi-menu');
    const opponentPanel = document.getElementById('opponent-panel');
    const roomInfoBox = document.querySelector('.room-info');
    const roomDisplay = document.getElementById('room-display');

    let network = null;
    let game = null;

    // Helper for robust touch/click handling
    function addTapListener(id, callback) {
        const el = document.getElementById(id);
        if (!el) return;
        
        let handled = false;
        const handler = (e) => {
            if (handled) return;
            handled = true;
            setTimeout(() => { handled = false; }, 300); // Debounce
            if (e.type === 'touchstart') e.preventDefault(); 
            callback(e);
        };

        el.addEventListener('touchstart', handler, { passive: false });
        el.addEventListener('click', handler);
    }

    // View Switching
    function showGame(isMulti = false) {
        menuView.classList.add('hidden');
        gameView.classList.remove('hidden');
        if (isMulti) {
            opponentPanel.classList.remove('hidden');
            roomInfoBox.classList.remove('hidden');
        } else {
            opponentPanel.classList.add('hidden');
            roomInfoBox.classList.add('hidden');
        }
    }

    function showMenu() {
        gameView.classList.add('hidden');
        menuView.classList.remove('hidden');
    }

    // Button Listeners
    // Game Over / Overlay Buttons
    addTapListener('btn-restart', (e) => {
        e.stopPropagation(); 
        if (game) {
            if (game.isMultiplayer) {
                 game.destroy();
                 showMenu(); 
                 document.querySelector('.menu-buttons').classList.add('hidden');
                 multiMenu.classList.remove('hidden');
            } else {
                game.reset(); 
            }
        }
    });

    addTapListener('btn-home', (e) => {
        e.stopPropagation();
        if (game) game.destroy();
        if (network) network.leaveRoom(); // Cleanly leave the room
        showMenu();
        // Reset multiplayer menu state
        multiMenu.classList.add('hidden');
        document.querySelector('.menu-buttons').classList.remove('hidden');
        document.getElementById('room-status').innerText = "";
        document.getElementById('room-code-input').value = "";
    });

    addTapListener('btn-single', () => {
        if (game) game.destroy();
        showGame(false);
        game = new Game();
        game.reset(); 
    });

    addTapListener('btn-multi', () => {
        document.querySelector('.menu-buttons').classList.add('hidden'); 
        multiMenu.classList.remove('hidden'); 
        
        // Connect to Firebase Network if not already
        if (!network) {
            network = new Network();
            
            network.on('connect', () => {
                console.log('Connected to Network');
            });

            network.on('room_created', (code) => {
                document.getElementById('room-status').innerText = `Room Created! Code: ${code}`;
                roomDisplay.innerText = code;
                document.getElementById('room-status').innerText += "\nWaiting for player...";
            });

            network.on('room_joined', (code) => {
                document.getElementById('room-status').innerText = `Joined Room ${code}!`;
                roomDisplay.innerText = code;
            });

            network.on('player_joined', () => {
                 document.getElementById('room-status').innerText = "Player Joined! Starting...";
            });

            network.on('game_start', () => {
                startGameMulti();
            });

            network.on('error', (msg) => {
                alert(msg);
                document.getElementById('room-status').innerText = msg;
            });
        }
    });

    addTapListener('btn-create', () => {
        if(network) network.createRoom();
    });

    addTapListener('btn-join', () => {
        const code = document.getElementById('room-code-input').value;
        if(code && network) network.joinRoom(code);
    });

    addTapListener('btn-back', () => {
        multiMenu.classList.add('hidden');
        document.querySelector('.menu-buttons').classList.remove('hidden');
        document.getElementById('room-status').innerText = '';
    });

    function startGameMulti() {
        if (game) game.destroy();
        showGame(true);
        game = new Game(network, roomDisplay.innerText);
        game.start(); 
    }

});
