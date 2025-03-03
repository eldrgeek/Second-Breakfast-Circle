import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { HelpDialog } from './HelpDialog';
import { HelpCircle } from 'lucide-react';
import { getSessionId } from '../lib/session';

const generateUserColor = () => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
    '#D4A5A5', '#9B59B6', '#3498DB', '#E67E22', '#2ECC71'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export function Login() {
  const [name, setName] = useState(() => sessionStorage.getItem('userName') || '');
  const [showHelp, setShowHelp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setCurrentUser = useStore(state => state.setCurrentUser);
  const setUsers = useStore(state => state.setUsers);
  const isResettingSession = useStore(state => state.isResettingSession);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      sessionStorage.setItem('userName', name.trim());
      
      // Get session ID from storage or generate a new one
      const sessionId = getSessionId();

      const newUser: User = {
        id: crypto.randomUUID(),
        name: name.trim(),
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        seatNumber: null,
        isActive: true,
        isSpeaking: false,
        hasStick: false,
        audioEnabled: false,
        videoEnabled: false,
        color: generateUserColor(),
        joinedAt: new Date().toISOString(),
        sessionId: sessionId
      };

      await setCurrentUser(newUser);
    } catch (err) {
      console.error('Error logging in:', err);
      setError('Failed to join the room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full login-form">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Second Breakfast Circle
          </h1>
          <button
            onClick={() => setShowHelp(true)}
            className="text-gray-500 hover:text-gray-700"
            type="button"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              htmlFor="name" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Your Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your name"
              required
              disabled={isLoading}
            />
          </div>
          
          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}
          
          <button
            type="submit"
            className={`w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={isLoading}
          >
            {isLoading ? 'Joining...' : 'Enter Room'}
          </button>
        </form>
      </div>

      <HelpDialog
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </div>
  );
}