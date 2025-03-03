import React from 'react';
import { Room } from './components/Room';
import { Login } from './components/Login';
import { useStore } from './store/useStore';

function App() {
  const currentUser = useStore((state) => state.currentUser);

  return (
    <div className="w-full h-screen bg-gray-900">
      {currentUser ? <Room /> : <Login />}
    </div>
  );
}

export default App;