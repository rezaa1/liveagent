import {
  Room,
  RoomEvent,
  ConnectionState,
  ConnectionQuality,
  LocalParticipant,
  RemoteParticipant,
  Participant,
  DisconnectReason,
  RoomOptions,
  Track,
} from 'livekit-client';
import { toast } from 'react-hot-toast';

export interface RoomMetrics {
  connectionQuality: ConnectionQuality;
  latency: number;
  packetsLost: number;
  participantCount: number;
}

export class LiveKitManager {
  private room: Room;
  private retryCount: number = 0;
  private maxRetries: number;
  private metricsInterval?: NodeJS.Timeout;
  private onMetricsUpdate?: (metrics: RoomMetrics) => void;
  private token: string;

  constructor(
    roomName: string, 
    token: string, 
    maxRetries: number = 3,
    onMetricsUpdate?: (metrics: RoomMetrics) => void
  ) {
    if (!token) {
      throw new Error('Token is required');
    }
    
    this.token = token;
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      publishDefaults: {
        simulcast: true,
        videoSimulcastLayers: [
          { width: 1280, height: 720, fps: 30 },
          { width: 640, height: 360, fps: 20 },
          { width: 320, height: 180, fps: 15 },
        ],
      },
    });
    this.maxRetries = maxRetries;
    this.onMetricsUpdate = onMetricsUpdate;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.room
      .on(RoomEvent.Connected, this.handleConnected)
      .on(RoomEvent.Disconnected, this.handleDisconnected)
      .on(RoomEvent.ConnectionStateChanged, this.handleConnectionStateChange)
      .on(RoomEvent.ParticipantConnected, this.handleParticipantConnected)
      .on(RoomEvent.ParticipantDisconnected, this.handleParticipantDisconnected)
      .on(RoomEvent.MediaDevicesError, this.handleMediaDevicesError)
      .on(RoomEvent.TrackSubscribed, this.handleTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed, this.handleTrackUnsubscribed)
      .on(RoomEvent.ActiveSpeakersChanged, this.handleActiveSpeakersChanged);
  }

  private startMetricsCollection() {
    this.metricsInterval = setInterval(() => {
      if (this.onMetricsUpdate && this.room.state === ConnectionState.Connected) {
        const metrics: RoomMetrics = {
          connectionQuality: this.room.connectionQuality,
          latency: this.room.localParticipant?.getConnectionQuality()?.score ?? 0,
          packetsLost: this.room.localParticipant?.getConnectionQuality()?.score ?? 0,
          participantCount: this.room.participants.size,
        };
        this.onMetricsUpdate(metrics);
      }
    }, 1000);
  }

  private handleConnected = () => {
    toast.success('Connected to room');
    this.retryCount = 0;
    this.startMetricsCollection();
  };

  private handleDisconnected = (reason?: DisconnectReason) => {
    toast.error(`Disconnected: ${reason}`);
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      setTimeout(() => this.reconnect(), 1000 * Math.pow(2, this.retryCount));
    }
  };

  private handleConnectionStateChange = (state: ConnectionState) => {
    switch (state) {
      case ConnectionState.Connecting:
        toast.loading('Connecting to room...');
        break;
      case ConnectionState.Connected:
        toast.success('Connected to room');
        break;
      case ConnectionState.Disconnected:
        toast.error('Disconnected from room');
        break;
      case ConnectionState.Failed:
        toast.error('Room connection failed');
        break;
    }
  };

  private handleParticipantConnected = (participant: RemoteParticipant) => {
    toast.success(`${participant.identity} joined the room`);
  };

  private handleParticipantDisconnected = (participant: RemoteParticipant) => {
    toast.info(`${participant.identity} left the room`);
  };

  private handleMediaDevicesError = (e: Error) => {
    toast.error(`Media device error: ${e.message}`);
  };

  private handleTrackSubscribed = (
    track: Track,
    publication: Track,
    participant: Participant
  ) => {
    toast.success(`Subscribed to ${track.kind} track from ${participant.identity}`);
  };

  private handleTrackUnsubscribed = (
    track: Track,
    publication: Track,
    participant: Participant
  ) => {
    toast.info(`Unsubscribed from ${track.kind} track from ${participant.identity}`);
  };

  private handleActiveSpeakersChanged = (speakers: Participant[]) => {
    if (speakers.length > 0) {
      const speakerNames = speakers.map(s => s.identity).join(', ');
      toast.info(`Active speakers: ${speakerNames}`);
    }
  };

  private async reconnect() {
    try {
      await this.connect();
    } catch (error) {
      toast.error('Reconnection failed');
    }
  }

  public async connect() {
    try {
      // For demo purposes, using a static LiveKit server URL
      // In production, this should be configured properly
      const url = 'wss://demo.livekit.cloud';
      
      await this.room.connect(url, this.token, {
        autoSubscribe: true,
        adaptiveStream: true,
        dynacast: true,
      });
    } catch (error) {
      console.error('Connection error:', error);
      toast.error(`Failed to connect to room: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  public disconnect() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    this.room.disconnect();
  }

  public async enableAudio(enabled: boolean) {
    if (this.room.localParticipant) {
      await this.room.localParticipant.setMicrophoneEnabled(enabled);
    }
  }

  public async enableVideo(enabled: boolean) {
    if (this.room.localParticipant) {
      await this.room.localParticipant.setCameraEnabled(enabled);
    }
  }

  public getConnectionQuality(): ConnectionQuality {
    return this.room.connectionQuality;
  }

  public cleanup() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    this.room.removeAllListeners();
    this.disconnect();
  }

  public getRoomState() {
    return {
      connectionState: this.room.state,
      participantCount: this.room.participants.size,
      localParticipant: this.room.localParticipant?.identity,
    };
  }
}