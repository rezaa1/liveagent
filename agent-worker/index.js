import { WebSocket } from 'ws';
import { AccessToken } from 'livekit-server-sdk';
import { v4 as uuidv4 } from 'uuid';

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

console.log('Starting agent worker with configuration:');
console.log('LiveKit URL:', LIVEKIT_URL);
console.log('API Key exists:', !!LIVEKIT_API_KEY);
console.log('API Secret exists:', !!LIVEKIT_API_SECRET);

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  throw new Error('LiveKit configuration is missing');
}

class AgentWorker {
  constructor() {
    this.ws = null;
    this.heartbeatInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.roomName = '';
    this.identity = '';
  }

  async generateToken(roomName) {
    try {
      this.identity = `agent-${uuidv4()}`;
      console.log('Generating token for identity:', this.identity);
      
      const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: this.identity,
        ttl: 24 * 60 * 60, // 24 hours
      });

      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
      });

      const token = at.toJwt();
      console.log('Token generated successfully');
      return token;
    } catch (error) {
      console.error('Failed to generate token:', error);
      throw error;
    }
  }

  setupWebSocket(url) {
    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.log('WebSocket connection established');
      this.startHeartbeat();
      
      // Join room message
      const joinMessage = {
        type: 'join',
        room: this.roomName,
        identity: this.identity,
      };
      this.ws.send(JSON.stringify(joinMessage));
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log('Received message:', message);
        
        switch (message.type) {
          case 'connected':
            console.log('Successfully joined room:', message.room);
            break;
          case 'participant_joined':
            console.log('Participant joined:', message.participant);
            break;
          case 'participant_left':
            console.log('Participant left:', message.participant);
            break;
          case 'error':
            console.error('Received error:', message.error);
            break;
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });

    this.ws.on('close', () => {
      console.log('WebSocket connection closed');
      this.cleanup();
      this.reconnect();
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.cleanup();
      this.reconnect();
    });
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  async connect(roomName) {
    try {
      this.roomName = roomName;
      console.log('Connecting to room:', roomName);
      
      const token = await this.generateToken(roomName);
      const wsUrl = LIVEKIT_URL.replace('http', 'ws') + '/ws?access_token=' + token;
      
      this.setupWebSocket(wsUrl);
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }

  async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      process.exit(1);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    
    console.log(`Reconnecting attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);
    
    setTimeout(async () => {
      try {
        await this.connect(this.roomName);
        this.reconnectAttempts = 0;
        console.log('Successfully reconnected');
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.reconnect();
      }
    }, delay);
  }

  disconnect() {
    console.log('Disconnecting from room:', this.roomName);
    this.cleanup();
  }
}

// Start the worker
console.log('Initializing agent worker...');
const worker = new AgentWorker();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down...');
  worker.disconnect();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down...');
  worker.disconnect();
  process.exit(0);
});

// Connect to a default room
const defaultRoom = 'agent-pool';
console.log('Connecting to default room:', defaultRoom);
worker.connect(defaultRoom).catch((error) => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});