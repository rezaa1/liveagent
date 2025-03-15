import { Room, RoomEvent, ConnectionState } from 'livekit-client';
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
        console.log('Local participant:', this.room.localParticipant?.identity);
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
      })
      .on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log('Connection state changed:', state);
        if (state === ConnectionState.Failed) {
          console.error('Connection failed, attempting to reconnect...');
          this.reconnect();
        }
      })
      .on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        console.log('Connection quality changed:', quality, 'for participant:', participant.identity);
      })
      .on(RoomEvent.MediaDevicesError, (error) => {
        console.error('Media devices error:', error);
      });
  }

  async connect(roomName) {
    try {
      console.log('Generating token for room:', roomName);
      const token = await this.generateToken(roomName);
      
      console.log('Connecting to LiveKit server:', LIVEKIT_URL);
      await this.room.connect(LIVEKIT_URL, token, {
        autoSubscribe: true,
      });
      
      console.log('Successfully connected to room:', roomName);
      console.log('Room state:', {
        name: this.room.name,
        sid: this.room.sid,
        participants: this.room.participants.size,
      });
    } catch (error) {
      console.error('Failed to connect:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
      });
      throw error;
    }
  }

  async generateToken(roomName) {
    try {
      const identity = `agent-${uuidv4()}`;
      console.log('Generating token for identity:', identity);
      
      const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity,
        ttl: '24h',
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

  async reconnect() {
    const maxRetries = 5;
    let retryCount = 0;
    const backoff = (retryCount) => Math.min(1000 * Math.pow(2, retryCount), 10000);

    const attemptReconnect = async () => {
      try {
        console.log(`Reconnection attempt ${retryCount + 1}/${maxRetries}`);
        await this.connect(this.room.name);
        console.log('Successfully reconnected');
      } catch (error) {
        retryCount++;
        console.error(`Reconnection attempt ${retryCount} failed:`, error);
        
        if (retryCount < maxRetries) {
          const delay = backoff(retryCount);
          console.log(`Retrying in ${delay}ms...`);
          setTimeout(attemptReconnect, delay);
        } else {
          console.error('Max reconnection attempts reached');
          process.exit(1);
        }
      }
    };

    await attemptReconnect();
  }

  disconnect() {
    console.log('Disconnecting from room:', this.room.name);
    this.room.disconnect();
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

// Connect to a default room or wait for room assignment
const defaultRoom = 'agent-pool';
console.log('Connecting to default room:', defaultRoom);
worker.connect(defaultRoom).catch((error) => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});