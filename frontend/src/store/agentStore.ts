import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Agent, AgentFormData } from '../types/agent';
import { LiveKitManager, RoomMetrics } from '../lib/livekit';
import { generateToken } from '../lib/token';
import { toast } from 'react-hot-toast';
import { ConnectionQuality } from 'livekit-client';

interface AgentStore {
  agents: Agent[];
  livekitManagers: Map<string, LiveKitManager>;
  addAgent: (data: AgentFormData) => void;
  removeAgent: (id: string) => void;
  updateAgentStatus: (id: string, status: Agent['status'], error?: string) => void;
  updateAgentMetrics: (id: string, metrics: Agent['metrics']) => void;
  startAgent: (id: string) => Promise<void>;
  stopAgent: (id: string) => void;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [],
  livekitManagers: new Map(),

  addAgent: (data: AgentFormData) => {
    const newAgent: Agent = {
      id: uuidv4(),
      status: 'offline',
      ...data,
    };
    set((state) => ({ agents: [...state.agents, newAgent] }));
    toast.success(`Agent "${data.name}" created`);
  },

  removeAgent: (id: string) => {
    const manager = get().livekitManagers.get(id);
    if (manager) {
      manager.cleanup();
      get().livekitManagers.delete(id);
    }
    set((state) => ({
      agents: state.agents.filter((agent) => agent.id !== id),
    }));
    toast.success('Agent removed');
  },

  updateAgentStatus: (id: string, status: Agent['status'], error?: string) => {
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === id ? { ...agent, status, error } : agent
      ),
    }));
  },

  updateAgentMetrics: (id: string, metrics: Agent['metrics']) => {
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === id ? { ...agent, metrics } : agent
      ),
    }));
  },

  startAgent: async (id: string) => {
    const agent = get().agents.find((a) => a.id === id);
    if (!agent) {
      toast.error('Agent not found');
      return;
    }

    try {
      get().updateAgentStatus(id, 'connecting');
      
      const token = await generateToken(agent.roomName, agent.name);
      
      const manager = new LiveKitManager(
        agent.roomName,
        token,
        agent.configuration.maxRetries,
        (metrics: RoomMetrics) => {
          get().updateAgentMetrics(id, {
            connectionQuality: metrics.connectionQuality === ConnectionQuality.Excellent ? 'excellent' :
                             metrics.connectionQuality === ConnectionQuality.Good ? 'good' : 'poor',
            latency: metrics.latency,
            packetsLost: metrics.packetsLost,
          });
        }
      );

      get().livekitManagers.set(id, manager);
      
      await manager.connect(agent.roomName);
      await manager.enableAudio(agent.configuration.audioEnabled);
      await manager.enableVideo(agent.configuration.videoEnabled);
      
      get().updateAgentStatus(id, 'online');
      toast.success(`Agent "${agent.name}" started successfully`);
    } catch (error) {
      console.error('Failed to start agent:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      get().updateAgentStatus(id, 'error', errorMessage);
      toast.error(`Failed to start agent: ${errorMessage}`);
    }
  },

  stopAgent: (id: string) => {
    const agent = get().agents.find((a) => a.id === id);
    const manager = get().livekitManagers.get(id);
    
    if (manager) {
      manager.cleanup();
      get().livekitManagers.delete(id);
      get().updateAgentStatus(id, 'offline');
      if (agent) {
        toast.success(`Agent "${agent.name}" stopped`);
      }
    }
  },
}));