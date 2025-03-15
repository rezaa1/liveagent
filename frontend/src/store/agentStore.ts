import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Agent, AgentFormData } from '../types/agent';
import { LiveKitManager, RoomMetrics } from '../lib/livekit';
import { AIAgent } from '../lib/aiAgent';
import { generateToken } from '../lib/token';
import { toast } from 'react-hot-toast';
import { ConnectionQuality } from 'livekit-client';

interface AgentStore {
  agents: Agent[];
  livekitManagers: Map<string, LiveKitManager>;
  aiAgents: Map<string, AIAgent>;
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
  aiAgents: new Map(),

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
    const aiAgent = get().aiAgents.get(id);
    
    if (manager) {
      manager.cleanup();
      get().livekitManagers.delete(id);
    }
    
    if (aiAgent) {
      aiAgent.stop();
      get().aiAgents.delete(id);
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
      const liveKitUrl = "wss://callninja-9rs9nskz.livekit.cloud"
      
      if (!liveKitUrl) {
        throw new Error('LiveKit URL is not defined in environment variables');
      }

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
      
      // First connect without tracks
      await manager.connect(liveKitUrl);
      
      // Then enable media if configured
      if (agent.configuration.audioEnabled) {
        await manager.enableAudio(true);
      }
      if (agent.configuration.videoEnabled) {
        await manager.enableVideo(true);
      }

      // If this is an AI agent, start its behavior
      if (agent.configuration.isAIAgent) {
        const aiAgent = new AIAgent(
          manager.getRoom(),
          agent.configuration.aiResponseDelay
        );
        aiAgent.start();
        get().aiAgents.set(id, aiAgent);
      }
      
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
    const aiAgent = get().aiAgents.get(id);
    
    if (aiAgent) {
      aiAgent.stop();
      get().aiAgents.delete(id);
    }
    
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