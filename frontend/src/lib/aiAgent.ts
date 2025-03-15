import { Room, Participant, DataPacket_Kind } from 'livekit-client';

export class AIAgent {
  private messageInterval?: NodeJS.Timeout;
  private responses = [
    "Hello! I'm an AI agent.",
    "I'm here to help test the room.",
    "How is the connection quality?",
    "Testing audio and video streams.",
    "Checking latency and packet loss.",
  ];

  constructor(
    private room: Room,
    private responseDelay: number = 1000
  ) {}

  public start() {
    this.messageInterval = setInterval(() => {
      this.sendRandomMessage();
    }, this.responseDelay);

    // Listen for messages from other participants
    this.room.on('dataReceived', (payload: Uint8Array, participant?: Participant) => {
      if (participant) {
        const message = new TextDecoder().decode(payload);
        console.log(`Received message from ${participant.identity}:`, message);
        this.respondToMessage(message, participant);
      }
    });
  }

  public stop() {
    if (this.messageInterval) {
      clearInterval(this.messageInterval);
    }
  }

  private sendRandomMessage() {
    const message = this.responses[Math.floor(Math.random() * this.responses.length)];
    const data = new TextEncoder().encode(message);
    
    this.room.localParticipant?.publishData(data, {
      reliable: true,
      kind: DataPacket_Kind.RELIABLE,
    });
  }

  private respondToMessage(message: string, sender: Participant) {
    const response = `Received your message: "${message}"`;
    const data = new TextEncoder().encode(response);
    
    setTimeout(() => {
      this.room.localParticipant?.publishData(data, {
        reliable: true,
        kind: DataPacket_Kind.RELIABLE,
      });
    }, Math.random() * 1000); // Random delay up to 1 second
  }
}