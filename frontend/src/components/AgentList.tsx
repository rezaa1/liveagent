import { Play, Square, Trash2, Activity } from 'lucide-react';
import { useAgentStore } from '../store/agentStore';

export function AgentList() {
  const { agents, startAgent, stopAgent, removeAgent } = useAgentStore();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Agent List</h2>
        <div className="space-y-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-3 h-3 rounded-full ${getStatusColor(
                      agent.status
                    )}`}
                  />
                  <h3 className="font-semibold">{agent.name}</h3>
                </div>
                <div className="flex items-center space-x-2">
                  {agent.status === 'offline' ? (
                    <button
                      onClick={() => startAgent(agent.id)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-full"
                      title="Start Agent"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => stopAgent(agent.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                      title="Stop Agent"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => removeAgent(agent.id)}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-full"
                    title="Remove Agent"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {agent.status === 'online' && agent.metrics && (
                <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <span>Quality: {agent.metrics.connectionQuality}</span>
                  </div>
                  <div>Latency: {agent.metrics.latency}ms</div>
                  <div>Packets Lost: {agent.metrics.packetsLost}</div>
                </div>
              )}

              {agent.status === 'error' && agent.error && (
                <div className="mt-2 text-sm text-red-600">{agent.error}</div>
              )}
            </div>
          ))}

          {agents.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No agents created yet. Use the form above to create one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}