/*
Simple presence server:
- HTTP + WebSocket (ws)
- Persists active player counts per "room" into MongoDB (using the provided snippet)
- Tracks connected clients, increments/decrements active count and broadcasts updated counts
*/

const http = require('http');
const WebSocket = require('ws');
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://admin:<db_password>@cluster0.4mtgvw1.mongodb.net/?appName=Cluster0';
const MONGO_DB = process.env.MONGO_DB || 'chirpless';
const PRESENCE_COLLECTION = process.env.PRESENCE_COLLECTION || 'presence';

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.get('/', (req, res) => res.send('PeytoToria presence server running (works offline in local mode)'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Mongo client (stable API)
const client = new MongoClient(MONGO_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let mongoColl = null;
async function initMongo() {
  try {
    await client.connect();
    const db = client.db(MONGO_DB);
    mongoColl = db.collection(PRESENCE_COLLECTION);
    // Ensure index for room
    await mongoColl.createIndex({ room: 1 }, { unique: true });
    console.log('MongoDB connected for presence.');
  } catch (e) {
    console.error('MongoDB init failed', e);
    mongoColl = null;
  }
}
initMongo().catch(console.error);

// In-memory map of room -> Set of clientIds
const rooms = new Map();

function ensureRoom(room) {
  if (!rooms.has(room)) rooms.set(room, new Set());
  return rooms.get(room);
}

async function persistCount(room) {
  if (!mongoColl) return;
  try {
    const count = (rooms.get(room) || new Set()).size;
    await mongoColl.updateOne(
      { room },
      { $set: { room, count, updatedAt: new Date() } },
      { upsert: true }
    );
  } catch (e) {
    console.warn('Failed to persist presence count', e);
  }
}

function broadcastRoomCount(room) {
  const count = (rooms.get(room) || new Set()).size;
  const payload = JSON.stringify({ type: 'presence_count', room, count });
  wss.clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN) {
      c.send(payload);
    }
  });
}

// WebSocket protocol: client sends {"type":"join","room":"<name>","clientId":"<id>"} and {"type":"leave","room":"<name>","clientId":"<id>"}
// Server will broadcast presence_count updates.
wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => ws.isAlive = true);

  ws.on('message', async (msg) => {
    let data = null;
    try { data = JSON.parse(msg); } catch (e) { return; }
    if (!data || !data.type) return;

    if (data.type === 'join' && data.room && data.clientId) {
      const set = ensureRoom(data.room);
      set.add(data.clientId);
      await persistCount(data.room);
      broadcastRoomCount(data.room);
      ws._room = data.room;
      ws._clientId = data.clientId;
    } else if (data.type === 'leave' && data.room && data.clientId) {
      const set = ensureRoom(data.room);
      set.delete(data.clientId);
      await persistCount(data.room);
      broadcastRoomCount(data.room);
    } else if (data.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }));
    } else if (data.type === 'presence_update' && data.clientId) {
      // Relay presence updates only to clients in the same room so players in the same game see each other.
      const roomName = ws._room || data.room || 'global';
      const payload = JSON.stringify({
        type: 'presence_update',
        clientId: data.clientId,
        presence: data.presence || {},
        room: roomName
      });
      wss.clients.forEach((c) => {
        if (c.readyState === WebSocket.OPEN && c._room === roomName) {
          try { c.send(payload); } catch (e) { /* ignore per-client send errors */ }
        }
      });
    } else if (data.type === 'chat' && data.clientId) {
      // Relay chat messages to only clients in the same room.
      const roomName = ws._room || data.room || 'global';
      const payload = JSON.stringify({
        type: 'chat',
        clientId: data.clientId,
        username: data.username || 'Player',
        message: data.message || '',
        room: roomName
      });
      wss.clients.forEach((c) => {
        if (c.readyState === WebSocket.OPEN && c._room === roomName) {
          try { c.send(payload); } catch (e) { /* ignore per-client send errors */ }
        }
      });
    }
  });

  ws.on('close', async () => {
    // Remove from any tracked room for this socket
    const room = ws._room;
    const cid = ws._clientId;
    if (room && cid) {
      const set = ensureRoom(room);
      set.delete(cid);
      await persistCount(room);
      broadcastRoomCount(room);
    }
  });
});

// Health ping to close dead sockets
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

server.listen(PORT, () => {
  console.log(`Presence server listening on :${PORT}`);
});