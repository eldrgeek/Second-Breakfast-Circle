import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Trash2 } from 'lucide-react';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserStats {
  id: string;
  name: string;
  lastSeen: string;
  firstSeen: string;
  totalDays: number;
  totalTime: number;
}

export function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');
      if (error) throw error;
      if (data) {
        const userStats = data.map(user => ({
          id: user.id,
          name: user.name,
          lastSeen: user.last_seen,
          firstSeen: user.created_at,
          totalDays: calculateDays(user.created_at),
          totalTime: calculateTotalTime(user.created_at, user.last_seen)
        }));
        setUsers(userStats);
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDays = (firstSeen: string): number => {
    const start = new Date(firstSeen);
    const now = new Date();
    return Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const calculateTotalTime = (firstSeen: string, lastSeen: string): number => {
    return Math.ceil(
      (new Date(lastSeen).getTime() - new Date(firstSeen).getTime()) / 
      (1000 * 60 * 60)
    );
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (!error) {
        setUsers(users.filter(u => u.id !== userId));
        setSelectedUser(null);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? 'Unknown date'
      : date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Admin Panel</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-4 text-center">Loading users...</div>
        ) : error ? (
          <div className="p-4 text-center text-red-600">{error}</div>
        ) : (
          <div className="grid grid-cols-2 h-[calc(80vh-4rem)]">
            {/* User List */}
            <div className="border-r overflow-y-auto p-4">
              <div className="space-y-2">
                {users.map(user => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedUser?.id === user.id
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-gray-500">
                      Last seen: {formatDate(user.lastSeen)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* User Details */}
            <div className="p-4 overflow-y-auto">
              {selectedUser ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                    <button
                      onClick={() => handleDeleteUser(selectedUser.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-700">First Seen</h4>
                      <p className="text-gray-600">{formatDate(selectedUser.firstSeen)}</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-700">Last Seen</h4>
                      <p className="text-gray-600">{formatDate(selectedUser.lastSeen)}</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-700">Days Since Joining</h4>
                      <p className="text-gray-600">{selectedUser.totalDays} days</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-700">Total Time</h4>
                      <p className="text-gray-600">{selectedUser.totalTime} hours</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 mt-8">
                  Select a user to view details
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}