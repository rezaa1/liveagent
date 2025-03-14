import {
  Room,
  RoomEvent,
  ConnectionState,
  ConnectionQuality,
  RemoteParticipant,
  Participant,
  DisconnectReason,
  RemoteTrack,
  RemoteTrackPublication,
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
    private readonly roomName: string, 
    token: string, 
    maxRetries: number = 3,
    onMetricsUpdate?: (metrics: RoomMetrics) => void
  ) {
    if (!token) {
      throw new Error('Token is required');
    }
    
    this.token = token;
    this.room = new Room({
      dynacast: true,
      adaptiveStream: true,
      publishDefaults: {
        simulcast: true,
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
          connectionQuality: this.room.localParticipant?.connectionQuality ?? ConnectionQuality.Unknown,
          latency: 0,
          packetsLost: 0,
          participantCount: this.room.participants.size,
        };
        this.onMetricsUpdate(metrics);
      }
    }, 1000);
  }

  private handleConnected = () => {
    toast.success(`Connected to room: ${this.roomName}`);
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
      case ConnectionState.Reconnecting:
        toast.error('Room connection failed');
        break;
    }
  };

  private handleParticipantConnected = (participant: RemoteParticipant) => {
    toast.success(`${participant.identity} joined the room`);
  };

  private handleParticipantDisconnected = (participant: RemoteParticipant) => {
    toast.success(`${participant.identity} left the room`);
  };

  private handleMediaDevicesError = (e: Error) => {
    toast.error(`Media device error: ${e.message}`);
  };

  private handleTrackSubscribed = (
    track: RemoteTrack,
    _publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => {
    toast.success(`Subscribed to ${track.kind} track from ${participant.identity}`);
  };

  private handleTrackUnsubscribed = (
    track: RemoteTrack,
    _publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => {
    toast.success(`Unsubscribed from ${track.kind} track from ${participant.identity}`);
  };

  private handleActiveSpeakersChanged = (speakers: Participant[]) => {
    if (speakers.length > 0) {
      const speakerNames = speakers.map(s => s.identity).join(', ');
      toast.success(`Active speakers: ${speakerNames}`);
    }
  };

  private async reconnect() {
    try {
      const liveKitUrl = "wss://callninja-9rs9nskz.livekit.cloud"
      if (!liveKitUrl) {
        throw new Error('LiveKit URL is not defined in environment variables');
      }
      await this.connect(liveKitUrl);
    } catch (error) {
      toast.error('Reconnection failed');
    }
  }

  private isValidUrl(urlString: string): boolean {
    try {
      new URL(urlString);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkMediaDevices(): Promise<boolean> {
    try {
      if (typeof navigator === 'undefined' || 
          !navigator.mediaDevices || 
          typeof navigator.mediaDevices.getUserMedia !== 'function') {
        console.warn('MediaDevices API or getUserMedia not available');
        return false;
      }
      return true;
    } catch (error) {
      console.warn('Error checking media devices:', error);
      return false;
    }
  }
  
  public async connect(url: string) {
    try {
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid LiveKit URL provided');
      }

      await this.room.connect(url, this.token, {
        autoSubscribe: true,
        rtcConfig: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
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
    if (!this.room.localParticipant) return;
    
    try {
      if (enabled) {
        const hasDevices = await this.checkMediaDevices();
        if (!hasDevices) {
          throw new Error('Media devices not available');
        }
        await this.room.localParticipant.setMicrophoneEnabled(enabled);
      }
    } catch (error) {
      console.error('Error enabling audio:', error);
      toast.error('Failed to enable audio: Media devices not available');
    }
  }

  public async enableVideo(enabled: boolean) {
    if (!this.room.localParticipant) return;
    
    try {
      if (enabled) {
        const hasDevices = await this.checkMediaDevices();
        if (!hasDevices) {
          throw new Error('Media devices not available');
        }
        await this.room.localParticipant.setCameraEnabled(enabled);
      }
    } catch (error) {
      console.error('Error enabling video:', error);
      toast.error('Failed to enable video: Media devices not available');
    }
  }

  public getConnectionQuality(): ConnectionQuality {
    return this.room.localParticipant?.connectionQuality ?? ConnectionQuality.Unknown;
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

  // Add the missing getRoom method to fix the TypeScript error
  public getRoom(): Room {
    return this.room;
  }
}