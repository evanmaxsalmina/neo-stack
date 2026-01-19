import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // In production, replace with your frontend URL
    methods: ["GET", "POST"]
  }
});

// Store room state: { [roomCode]: { players: [socketId], gameStarted: false } }
const rooms = {};

// Helper to generate 4-digit code
function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Create Room
  socket.on('create_room', () => {
    const code = generateRoomCode();
    rooms[code] = {
      players: [socket.id],
      gameStarted: false
    };
    socket.join(code);
    socket.emit('room_created', code);
    console.log(`Room ${code} created by ${socket.id}`);
  });

  // Join Room
  socket.on('join_room', (code) => {
    const room = rooms[code];
    if (room && room.players.length < 2) {
      room.players.push(socket.id);
      socket.join(code);
      socket.emit('room_joined', code);
      
      // Notify host that player 2 joined
      io.to(code).emit('player_joined', room.players.length);
      
      // If full, start game (or let host start)
      if (room.players.length === 2) {
        // Simple auto-start for now
        io.to(code).emit('game_start'); 
        room.gameStarted = true;
      }
      console.log(`Player ${socket.id} joined room ${code}`);
    } else {
      socket.emit('error', 'Room not found or full');
    }
  });

  // Relay Game State (Board, Score, etc.)
  // data = { grid, piece, score, ... }
  socket.on('update_state', (data) => {
    // Broadcast to others in the room (excluding sender)
    const roomsArr = Array.from(socket.rooms);
    // socket.rooms is a Set containing socket.id and room codes.
    // We typically just broadcast to the room code.
    roomsArr.forEach(roomCode => {
      if (roomCode !== socket.id) {
        socket.to(roomCode).emit('opponent_state', data);
      }
    });
  });

  // Handle Disconnect
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    // Cleanup empty rooms or notify opponent
    for (const code in rooms) {
      if (rooms[code].players.includes(socket.id)) {
        rooms[code].players = rooms[code].players.filter(id => id !== socket.id);
        io.to(code).emit('opponent_left');
        if (rooms[code].players.length === 0) {
          delete rooms[code];
        }
      }
    }
  });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO Server running on port ${PORT}`);
});
