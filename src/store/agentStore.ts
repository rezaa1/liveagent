import { create } from 'zustand';
import { Agent, AgentFormData } from '../types/agent';
import { LiveKitManager, RoomMetrics } from '../lib/livekit';
import { toast } from 'react-hot-toast';
import { saveAgent, getAgents, deleteAgent, updateAgentStatus as dbUpdateAgentStatus, updateAgentMetrics as dbUpdateAgentMetrics } from '../lib/db';

interface AgentStore {
  agents: Agent[];
  livekitManagers: Map<string, LiveKitManager>;
  addAgent: (data: AgentFormData) => void;
  removeAgent: (id: string) => void;
  updateAgentStatus: (id: string, status: Agent['status'], error?: string) => void;
  updateAgentMetrics: (id: string, metrics: Agent['metrics']) => void;
  startAgent: (id: string) => Promise<void>;
  stopAgent: (id: string) => void;
  loadAgents: () => void;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [],
  livekitManagers: new Map(),

  loadAgents: () => {
    const agents = getAgents();
    set({ agents });
  },

  addAgent: (data: AgentFormData) => {
    const newAgent: Agent = {
      id: crypto.randomUUID(),
      status: 'offline',
      ...data,
    };
    saveAgent(newAgent);
    set((state) => ({ agents: [...state.agents, newAgent] }));
    toast.success(`Agent "${data.name}" created`);
  },

  removeAgent: (id: string) => {
    const manager = get().livekitManagers.get(id);
    if (manager) {
      manager.cleanup();
      get().livekitManagers.delete(id);
    }
    deleteAgent(id);
    set((state) => ({
      agents: state.agents.filter((agent) => agent.id !== id),
    }));
    toast.success('Agent removed');
  },

  updateAgentStatus: (id: string, status: Agent['status'], error?: string) => {
    dbUpdateAgentStatus(id, status, error);
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === id ? { ...agent, status, error } : agent
      ),
    }));
  },

  updateAgentMetrics: (id: string, metrics: Agent['metrics']) => {
    dbUpdateAgentMetrics(id, metrics);
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
      
      // Create LiveKit manager with metrics update callback
      const manager = new LiveKitManager(
        agent.roomName,
        'demo-token', // Replace with your LiveKit token generation logic
        agent.configuration.maxRetries,
        (metrics: RoomMetrics) => {
          get().updateAgentMetrics(id, {
            connectionQuality: metrics.connectionQuality === 100 ? 'excellent' :
                             metrics.connectionQuality >= 50 ? 'good' : 'poor',
            latency: metrics.latency,
            packetsLost: metrics.packetsLost,
          });
        }
      );

      get().livekitManagers.set(id, manager);
      
      // Connect and configure the agent
      await manager.connect();
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