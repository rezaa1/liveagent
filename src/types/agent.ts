export interface Agent {
  id: string;
  name: string;
  status: 'offline' | 'connecting' | 'online' | 'error';
  roomName: string;
  configuration: {
    audioEnabled: boolean;
    videoEnabled: boolean;
    simulcast: boolean;
    maxRetries: number;
  };
  metrics?: {
    connectionQuality: 'excellent' | 'good' | 'poor';
    latency: number;
    packetsLost: number;
  };
  error?: string;
}

export interface AgentFormData {
  name: string;
  roomName: string;
  configuration: {
    audioEnabled: boolean;
    videoEnabled: boolean;
    simulcast: boolean;
    maxRetries: number;
  };
}

export interface RoomConfiguration {
  name: string;
  maxParticipants?: number;
  duration?: number;
  recordingEnabled?: boolean;
  metadata?: Record<string, unknown>;
}