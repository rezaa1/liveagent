import React from 'react';
import { Plus } from 'lucide-react';
import { AgentFormData } from '../types/agent';
import { useAgentStore } from '../store/agentStore';

export function AgentForm() {
  const addAgent = useAgentStore((state) => state.addAgent);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const agentData: AgentFormData = {
      name: formData.get('name') as string,
      roomName: formData.get('roomName') as string,
      configuration: {
        audioEnabled: formData.get('audioEnabled') === 'on',
        videoEnabled: formData.get('videoEnabled') === 'on',
        simulcast: formData.get('simulcast') === 'on',
        maxRetries: parseInt(formData.get('maxRetries') as string, 10),
        isAIAgent: formData.get('isAIAgent') === 'on',
        aiResponseDelay: formData.get('isAIAgent') === 'on' ? 
          parseInt(formData.get('aiResponseDelay') as string, 10) : undefined,
      },
    };
    
    addAgent(agentData);
    e.currentTarget.reset();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Create New Agent</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Agent Name
            <input
              type="text"
              name="name"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter agent name"
            />
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Room Name
            <input
              type="text"
              name="roomName"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter room name"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center space-x-2">
            <input type="checkbox" name="audioEnabled" className="rounded" />
            <span className="text-sm font-medium text-gray-700">Enable Audio</span>
          </label>

          <label className="flex items-center space-x-2">
            <input type="checkbox" name="videoEnabled" className="rounded" />
            <span className="text-sm font-medium text-gray-700">Enable Video</span>
          </label>

          <label className="flex items-center space-x-2">
            <input type="checkbox" name="simulcast" className="rounded" />
            <span className="text-sm font-medium text-gray-700">Simulcast</span>
          </label>

          <label className="flex items-center space-x-2">
            <input type="checkbox" name="isAIAgent" className="rounded" />
            <span className="text-sm font-medium text-gray-700">AI Agent</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Max Retries
            <input
              type="number"
              name="maxRetries"
              min="1"
              max="10"
              defaultValue="3"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            AI Response Delay (ms)
            <input
              type="number"
              name="aiResponseDelay"
              min="500"
              max="5000"
              defaultValue="1000"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      <button
        type="submit"
        className="mt-6 flex items-center justify-center w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Agent
      </button>
    </form>
  );
}