import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, push, remove, onDisconnect, get, child, update } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Event Emitter Shim to match Socket.io interface
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
  }

  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
  }

  off(event, listener) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }
}

export class Network extends EventEmitter {
  constructor() {
    super();
    // Generate a unique ID for this session to allow same-browser testing
    this.id = 'player_' + Math.random().toString(36).substr(2, 9);
    this.roomCode = null;
    this.refs = {}; 
    
    // We still auth anonymously to access DB, but we won't use uid as player key
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // Connected to Firebase
        this.emit('connect');
        console.log('Connected with Session ID:', this.id);
      } else {
        signInAnonymously(auth).catch((error) => {
          console.error("Auth error", error);
        });
      }
    });
  }

  // Generate random 4 digit code
  generateCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  cleanupRoom() {
    if (this.roomUnsubscribes) {
      this.roomUnsubscribes.forEach(unsub => unsub());
      this.roomUnsubscribes = [];
    }
    // Remove self from DB if we were in a room
    if (this.roomCode && this.id) {
       remove(ref(db, `rooms/${this.roomCode}/players/${this.id}`));
    }
    this.roomCode = null;
    this.hasOpponent = false;
  }

  createRoom() {
    this.cleanupRoom(); // Clean previous session
    if (!this.id) return;
    const code = this.generateCode();
    const roomRef = ref(db, `rooms/${code}`);
    
    get(roomRef).then((snapshot) => {
      if (snapshot.exists()) {
        this.createRoom(); // Retry
      } else {
        const roomData = {
          players: {
            [this.id]: { status: 'host' }
          },
          gameStarted: false,
          created: Date.now()
        };
        
        set(roomRef, roomData).then(() => {
          this.roomCode = code;
          this.emit('room_created', code);
          this.setupRoomListeners(code);
          this.setupDisconnectHandler(code);
        });
      }
    });
  }

  joinRoom(code) {
    this.cleanupRoom(); // Clean previous session
    if (!this.id) return;
    
    const roomRef = ref(db, `rooms/${code}`);
    get(roomRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const players = data.players || {};
        const playerIds = Object.keys(players);
        
        if (playerIds.length >= 2) {
          this.emit('error', 'Room is full');
          return;
        }

        const updates = {};
        updates[`rooms/${code}/players/${this.id}`] = { status: 'joined' };
        
        update(ref(db), updates).then(() => {
          this.roomCode = code;
          this.emit('room_joined', code);
          this.setupRoomListeners(code);
          this.setupDisconnectHandler(code);
          
          // Trigger game start
          set(ref(db, `rooms/${code}/gameStarted`), true);
        });

      } else {
        this.emit('error', 'Room not found');
      }
    });
  }

  setupRoomListeners(code) {
    this.hasOpponent = false;
    const playersRef = ref(db, `rooms/${code}/players`);
    
    // 1. Monitor Players (Join/Leave/State)
    const unsubPlayers = onValue(playersRef, (snapshot) => {
      const players = snapshot.val() || {};
      const count = Object.keys(players).length;
      
      // Check for Opponent State 
      // (Combined loop to handle state updates + presence)
      let opponentFound = false;
      Object.keys(players).forEach(pid => {
        if (pid !== this.id) {
          opponentFound = true;
          if (players[pid].state) {
            this.emit('opponent_state', players[pid].state);
          }
        }
      });

      // Status Logic
      if (count === 2 && !this.hasOpponent) {
         this.hasOpponent = true;
         this.emit('player_joined');
      } else if (count < 2 && this.hasOpponent) {
         // Opponent left
         this.hasOpponent = false;
         this.emit('opponent_left');
         // Reset gameStarted so re-joining doesn't auto-start mid-air
         set(ref(db, `rooms/${code}/gameStarted`), false);
      }
    });

    // 2. Monitor Game Start
    const gameStartRef = ref(db, `rooms/${code}/gameStarted`);
    const unsubStart = onValue(gameStartRef, (snapshot) => {
      if (snapshot.val() === true) {
        this.emit('game_start');
      }
    });
    
    this.roomUnsubscribes = [unsubPlayers, unsubStart];
  }

  setupDisconnectHandler(code) {
    const myPlayerRef = ref(db, `rooms/${code}/players/${this.id}`);
    onDisconnect(myPlayerRef).remove(); // Auto remove on connection loss
    
    // Also remove me if I manually disconnect (handled in cleanupRoom)
  }

  updateState(data) {
    if (!this.roomCode || !this.id) return;
    const stateRef = ref(db, `rooms/${this.roomCode}/players/${this.id}/state`);
    set(stateRef, data);
  }
  
  // Explicit "Home" action
  leaveRoom() {
    this.cleanupRoom();
  }
}
