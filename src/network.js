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
    this.id = null;
    this.roomCode = null;
    this.refs = {}; // Store firebase refs to turn off later
    
    // Auto sign-in
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.id = user.uid;
        this.emit('connect');
        console.log('Connected to Firebase as:', this.id);
      } else {
        signInAnonymously(auth).catch((error) => {
          console.error("Auth error", error);
          this.emit('error', "Authentication Failed");
        });
      }
    });

    // Handle visibility logging (optional, simpler to rely on onDisconnect)
  }

  // Generate random 4 digit code
  generateCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  createRoom() {
    if (!this.id) return;
    const code = this.generateCode();
    const roomRef = ref(db, `rooms/${code}`);
    
    get(roomRef).then((snapshot) => {
      if (snapshot.exists()) {
        this.createRoom(); // Retry if collision
      } else {
        // Create Room
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

        // Add self
        const updates = {};
        updates[`rooms/${code}/players/${this.id}`] = { status: 'joined' };
        
        update(ref(db), updates).then(() => {
          this.roomCode = code;
          this.emit('room_joined', code);
          this.setupRoomListeners(code);
          this.setupDisconnectHandler(code);
          
          // Trigger game start for everyone if we are the second player
          // Wait, logic in socket.io was: server checks count -> emits player_joined -> then game_start
          // We can just set 'gameStarted' to true here
          set(ref(db, `rooms/${code}/gameStarted`), true);
        });

      } else {
        this.emit('error', 'Room not found');
      }
    });
  }

  setupRoomListeners(code) {
    // Listen for players joining/leaving
    const playersRef = ref(db, `rooms/${code}/players`);
    const unsubPlayers = onValue(playersRef, (snapshot) => {
      const players = snapshot.val() || {};
      const count = Object.keys(players).length;
      
      // Check if opponent joined
      if (count === 2) {
         this.emit('player_joined');
      }
    });

    // Listen for Game Start (synced via `gameStarted` flag)
    const gameStartRef = ref(db, `rooms/${code}/gameStarted`);
    const unsubStart = onValue(gameStartRef, (snapshot) => {
      if (snapshot.val() === true) {
        this.emit('game_start');
      }
    });
    
    // Listen for State Updates
    // We only care about the OTHER player's state
    const unsubState = onValue(playersRef, (snapshot) => {
      const players = snapshot.val();
      if (!players) return;
      
      Object.keys(players).forEach(pid => {
        if (pid !== this.id) {
          // This is the opponent
          if (players[pid].state) {
            this.emit('opponent_state', players[pid].state);
          }
           // Check if they are gone? (onValue handles updates, but if key removed...)
        }
      });
    });

    // Listen for REMOVAL (Disconnect)
    // onValue above handles modifications. We need to detect if a key was removed.
    // Actually simpler: if players count drops < 2 AND we had 2 before.
    // Let's use child_removed event if we wanted precision, but onValue is fine.
    
    // Simplified Disconnect Detection logic inside the onValue above is tricky because
    // snapshot only has CURRENT data.
    // We can use child_removed on playersRef
    // But honestly, for this specific use case, let's just use `onDisconnect` logic to remove ourselves,
    // and rely on `onValue` of players to see if opponent is missing.
    
    this.refs['players'] = playersRef; // save for cleanup? (Actually standard Firebase returns unsubscribe function)
    this.roomUnsubscribes = [unsubPlayers, unsubStart, unsubState];
  }

  setupDisconnectHandler(code) {
    // If I disconnect, remove me from players
    const myPlayerRef = ref(db, `rooms/${code}/players/${this.id}`);
    onDisconnect(myPlayerRef).remove();
  }

  // Send my game state
  updateState(data) {
    if (!this.roomCode || !this.id) return;
    // Debounce or just set? for 60fps game, 'set' every frame is too much.
    // Tetris is slower, maybe every move.
    
    // We write to rooms/CODE/players/MY_ID/state
    const stateRef = ref(db, `rooms/${this.roomCode}/players/${this.id}/state`);
    set(stateRef, data); // set is fine for tetris frequency
  }

  // Cleanup
  disconnect() {
    if (this.roomUnsubscribes) {
      this.roomUnsubscribes.forEach(unsub => unsub());
    }
    // Remove self from room explicitly if quitting
    if (this.roomCode && this.id) {
       remove(ref(db, `rooms/${this.roomCode}/players/${this.id}`));
    }
  }
}
