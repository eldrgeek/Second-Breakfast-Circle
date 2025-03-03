import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { User } from '../types';
import { Clock, Bell, MessageSquare, ChevronRight, ChevronLeft, Move } from 'lucide-react';
import { UpdateDialog } from './UpdateDialog';
import { supabase } from '../lib/supabase';

function formatTimeInRoom(joinedAt: string): string {
  const joined = new Date(joinedAt);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - joined.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m`;
  } else {
    const hours = Math.floor(diffInSeconds / 3600);
    const minutes = Math.floor((diffInSeconds % 3600) / 60);
    if (isNaN(hours) || isNaN(minutes)) {
      return 'unknown';
    }
    return `${hours}h ${minutes}m`;
  }
}

export function RosterPanel() {
  const users = useStore(state => state.users);
  const currentUser = useStore(state => state.currentUser);
  const isPresencePanelVisible = useStore(state => state.isPresencePanelVisible);
  const togglePresencePanel = useStore(state => state.togglePresencePanel);
  const [, forceUpdate] = useState({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showNewActivity, setShowNewActivity] = useState(false);
  const [newUpdates, setNewUpdates] = useState<any[]>([]);
  const [lastCheckTime, setLastCheckTime] = useState(() => 
    localStorage.getItem('lastActivityCheck') || new Date().toISOString()
  );
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Force update every minute to refresh time displays
  useEffect(() => {
    const timer = setInterval(() => forceUpdate({}), 60000);
    return () => clearInterval(timer);
  }, []);

  // Check for new updates periodically
  useEffect(() => {
    const checkNewActivity = async () => {
      try {
        const { data: updates, error } = await supabase
          .from('user_updates')
          .select(`
            *,
            users:users(name)
          `)
          .gt('created_at', lastCheckTime)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error checking for new activity:', error);
          return;
        }

        if (updates && updates.length > 0) {
          setNewUpdates(updates);
          setShowNewActivity(true);
        }
      } catch (error) {
        console.error('Error in checkNewActivity:', error);
      }
    };

    const timer = setInterval(checkNewActivity, 30000);
    return () => clearInterval(timer);
  }, [lastCheckTime]);

  // Set up drag handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && panelRef.current) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        
        setPosition(prev => ({
          x: prev.x + dx,
          y: prev.y + dy
        }));
        
        dragStartRef.current = { x: e.clientX, y: e.clientY };
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  };

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
  };

  const handleNewActivityClick = () => {
    setShowNewActivity(false);
    setLastCheckTime(new Date().toISOString());
    localStorage.setItem('lastActivityCheck', new Date().toISOString());
  };

  const UserRow = ({ user }: { user: User }) => {
    const hasMessages = user.hasUnreadUpdates || user.hasUpdates;
    const isCurrentUser = currentUser?.id === user.id;
    const isInCurrentSession = user.sessionId === sessionStorage.getItem('sessionId');
    
    return (
      <div 
        className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-100 transition-colors ${
          user.isActive ? 'bg-white/5' : 'bg-gray-800/20'
        }`}
        onClick={() => handleUserClick(user.id)}
      >
        <div className="flex items-center gap-3">
          <div 
            className={`w-3 h-3 rounded-full ${
              user.isActive ? '' : 'opacity-50'
            }`}
            style={{ backgroundColor: user.color }}
          />
          <div className="flex items-center gap-2">
            <span className={`text-gray-700 ${!user.isActive && 'text-opacity-60'}`}>
              {user.name}
              {isCurrentUser && " (you)"}
              {isInCurrentSession && !isCurrentUser && " (same session)"}
              {user.hasStick && " 🎤"}
            </span>
            {hasMessages && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {isCurrentUser && (
            <MessageSquare className="w-3 h-3 text-blue-500" title="Click to share an update" />
          )}
          <Clock className="w-3 h-3" />
          <span>{formatTimeInRoom(user.joinedAt)}</span>
        </div>
      </div>
    );
  };

  // Separate active users and recent visitors
  const activeUsers = users.filter(u => u.isActive);
  const recentVisitors = users.filter(u => !u.isActive);

  const selectedUser = users.find(u => u.id === selectedUserId);

  if (!isPresencePanelVisible) {
    return (
      <button
        onClick={togglePresencePanel}
        className="fixed top-8 right-8 bg-white/90 p-3 rounded-lg shadow-lg z-10"
        type="button"
      >
        <ChevronLeft className="w-5 h-5 text-gray-700" />
      </button>
    );
  }

  return (
    <>
      <div 
        ref={panelRef}
        className="fixed bg-white/90 p-4 rounded-lg shadow-lg backdrop-blur-sm w-72 z-10"
        style={{ 
          top: `${8 + position.y}px`, 
          right: `${8 - position.x}px`,
          cursor: isDragging ? 'grabbing' : 'auto'
        }}
      >
        <div className="flex justify-between items-center mb-3">
          <div 
            className="cursor-grab p-1 drag-handle"
            onMouseDown={handleDragStart}
          >
            <Move className="w-5 h-5 text-gray-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800">People in Room</h2>
          <div className="flex items-center gap-2">
            {showNewActivity && (
              <button
                onClick={handleNewActivityClick}
                className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                type="button"
              >
                <Bell className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={togglePresencePanel}
              className="text-gray-500 hover:text-gray-700 minimize-button"
              type="button"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Active Users */}
        <div className="space-y-2 mb-4 max-h-[50vh] overflow-y-auto">
          {activeUsers.map((user: User) => (
            <UserRow key={user.id} user={user} />
          ))}
        </div>

        {/* Recent Visitors */}
        {recentVisitors.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Recent Visitors</h3>
            <div className="space-y-2 max-h-[20vh] overflow-y-auto">
              {recentVisitors.map((user: User) => (
                <UserRow key={user.id} user={user} />
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedUser && currentUser && (
        <UpdateDialog
          isOpen={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
          userId={selectedUser.id}
          currentUserId={currentUser.id}
          userName={selectedUser.name}
          isOwnProfile={selectedUser.id === currentUser.id}
          newUpdates={selectedUser.id === currentUser.id ? newUpdates : []}
        />
      )}
    </>
  );
}