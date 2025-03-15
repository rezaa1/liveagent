import { Toaster } from 'react-hot-toast';
import { AgentForm } from './components/AgentForm';
import { AgentList } from './components/AgentList';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            LiveKit Agent Management
          </h1>
          <p className="text-lg text-gray-600">
            Create and manage your LiveKit agents with ease
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <AgentForm />
          </div>
          <div className="lg:col-span-2">
            <AgentList />
          </div>
        </div>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;