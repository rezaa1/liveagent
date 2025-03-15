import { WebSocket } from 'ws';
import { AccessToken } from 'livekit-server-sdk';
import { v4 as uuidv4 } from 'uuid';
import { PromptAgent } from './lib/promptAgent.js';

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
    this.connected = false;
    this.reconnectTimeout = null;
    this.promptAgent = new PromptAgent();
    this.metrics = {
      quality: 'good',
      latency: 0,
      packetLoss: 0
    };
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
    if (this.ws) {
      console.log('Cleaning up existing WebSocket connection');
      this.cleanup();
    }

    console.log('Setting up WebSocket connection to:', url);
    
    this.ws = new WebSocket(url, {
      rejectUnauthorized: false,
      headers: {
        'User-Agent': 'LiveKit-Agent-Worker',
      },
      perMessageDeflate: false,
      handshakeTimeout: 10000,
      maxPayload: 1024 * 1024
    });

    const connectionTimeout = setTimeout(() => {
      if (!this.connected) {
        console.error('WebSocket connection timeout');
        this.ws?.close();
      }
    }, 15000);

    this.ws.on('open', () => {
      clearTimeout(connectionTimeout);
      this.connected = true;
      console.log('WebSocket connection established');
      this.startHeartbeat();
      
      // Send initial greeting
      setTimeout(async () => {
        const greeting = await this.promptAgent.processMessage(
          "Hello! I'm your AI assistant for this call. How can I help you today?",
          this.metrics
        );
        this.sendMessage(greeting);
      }, 1000);
    });

    this.ws.on('ping', () => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.pong();
      }
    });

    this.ws.on('message', async (data, isBinary) => {
      try {
        if (isBinary) {
          console.log('Received binary message of length:', data.length);
          return;
        }

        const textData = data.toString('utf8');
        if (!textData.trim()) {
          return;
        }

        if (textData.startsWith('{') || textData.startsWith('[')) {
          const message = JSON.parse(textData);
          console.log('Received JSON message:', message);
          
          switch (message.type) {
            case 'connected':
              console.log('Successfully joined room:', message.room);
              this.reconnectAttempts = 0;
              break;
            case 'participant_joined':
              console.log('Participant joined:', message.participant);
              const welcome = await this.promptAgent.processMessage(
                `Welcome ${message.participant}! How can I assist you today?`,
                this.metrics
              );
              this.sendMessage(welcome);
              break;
            case 'participant_left':
              console.log('Participant left:', message.participant);
              break;
            case 'chat':
              if (message.from !== this.identity) {
                const response = await this.promptAgent.processMessage(message.text, this.metrics);
                this.sendMessage(response);
              }
              break;
            case 'error':
              console.error('Received error:', message.error);
              if (message.error.includes('token expired')) {
                this.reconnect(true);
              }
              break;
          }
        }
      } catch (error) {
        console.log('Message processing error:', error.message);
      }
    });

    this.ws.on('close', (code, reason) => {
      clearTimeout(connectionTimeout);
      const reasonText = reason.toString() || 'No reason provided';
      console.log('WebSocket connection closed:', { code, reason: reasonText });
      
      this.connected = false;
      this.cleanup();

      if (code !== 1000 || this.reconnectAttempts > 0) {
        this.reconnect();
      }
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.connected = false;
      this.cleanup();
      this.reconnect();
    });
  }

  sendMessage(text) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'chat',
        from: this.identity,
        text: text
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'heartbeat' }));
        } catch (error) {
          console.error('Failed to send heartbeat:', error);
          this.cleanup();
          this.reconnect();
        }
      } else {
        this.cleanup();
        this.reconnect();
      }
    }, 30000);
  }

  cleanup() {
    this.connected = false;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      try {
        this.ws.removeAllListeners();
        this.ws.close();
      } catch (error) {
        console.error('Error during WebSocket cleanup:', error);
      }
      this.ws = null;
    }
  }

  async connect(roomName) {
    try {
      this.roomName = roomName;
      console.log('Connecting to room:', roomName);
      
      const token = await this.generateToken(roomName);
      const wsUrl = `${LIVEKIT_URL}/rtc?access_token=${encodeURIComponent(token)}`;
      
      this.setupWebSocket(wsUrl);
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }

  async reconnect(immediate = false) {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      process.exit(1);
      return;
    }

    this.reconnectAttempts++;
    const delay = immediate ? 0 : Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    
    console.log(`Reconnecting attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);
    
    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect(this.roomName);
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