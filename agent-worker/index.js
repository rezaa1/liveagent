import { Room, RoomEvent } from 'livekit-client';
import { AccessToken } from 'livekit-server-sdk';
import { v4 as uuidv4 } from 'uuid';

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  throw new Error('LiveKit configuration is missing');
}

class AgentWorker {
  constructor() {
    this.room = new Room({
      dynacast: true,
      adaptiveStream: true,
      publishDefaults: {
        simulcast: true,
      },
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.room
      .on(RoomEvent.Connected, () => {
        console.log('Connected to room:', this.room.name);
      })
      .on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from room:', this.room.name);
        this.reconnect();
      })
      .on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('Participant connected:', participant.identity);
      })
      .on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('Participant disconnected:', participant.identity);
      });
  }

  async connect(roomName) {
    try {
      const token = await this.generateToken(roomName);
      await this.room.connect(LIVEKIT_URL, token);
      console.log('Successfully connected to room:', roomName);
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }

  async generateToken(roomName) {
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: `agent-${uuidv4()}`,
      ttl: '24h',
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    return at.toJwt();
  }

  async reconnect() {
    const maxRetries = 5;
    let retryCount = 0;
    const backoff = (retryCount) => Math.min(1000 * Math.pow(2, retryCount), 10000);

    const attemptReconnect = async () => {
      try {
        await this.connect(this.room.name);
        console.log('Successfully reconnected');
      } catch (error) {
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`Reconnection attempt ${retryCount} failed, retrying in ${backoff(retryCount)}ms`);
          setTimeout(attemptReconnect, backoff(retryCount));
        } else {
          console.error('Max reconnection attempts reached');
        }
      }
    };

    await attemptReconnect();
  }

  disconnect() {
    this.room.disconnect();
  }
}

// Start the worker
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

// Connect to a default room or wait for room assignment
const defaultRoom = 'agent-pool';
worker.connect(defaultRoom).catch((error) => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});