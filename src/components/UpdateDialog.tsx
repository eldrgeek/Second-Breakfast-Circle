import React, { useState, useEffect, useRef } from 'react';
import { X, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserUpdate, UserReaction } from '../types';
import { useStore } from '../store/useStore';

interface UpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentUserId: string;
  userName: string;
  isOwnProfile: boolean;
  newUpdates: any[];
}

const EMOJI_OPTIONS = ['👍', '❤️', '🎉', '👏', '🚀', '💡'];

export function UpdateDialog({ isOpen, onClose, userId, currentUserId, userName, isOwnProfile, newUpdates }: UpdateDialogProps) {
  const [updates, setUpdates] = useState<UserUpdate[]>([]);
  const [newUpdate, setNewUpdate] = useState('');
  const [isFirstUpdate, setIsFirstUpdate] = useState(true);
  const [showAllUpdates, setShowAllUpdates] = useState(false);
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const markUpdateAsRead = useStore(state => state.markUpdateAsRead);

  useEffect(() => {
    if (isOpen) {
      loadUpdates();
      if (!isOwnProfile) {
        markUpdateAsRead(userId);
      }
    }
  }, [isOpen, userId, isOwnProfile, markUpdateAsRead]);

  // Scroll to appropriate position when updates change
  useEffect(() => {
    if (contentRef.current) {
      if (isOwnProfile) {
        // For own profile, scroll to bottom to see latest update and input
        contentRef.current.scrollTop = contentRef.current.scrollHeight;
      } else {
        // For others' profiles, scroll to first unread message
        const unreadMessages = contentRef.current.querySelectorAll('[data-unread="true"]');
        if (unreadMessages.length > 0) {
          unreadMessages[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [updates, isOwnProfile]);

  const loadUpdates = async () => {
    try {
      const { data: updatesData, error } = await supabase
        .from('user_updates')
        .select(`
          *,
          reactions:user_reactions(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading updates:', error);
        return;
      }

      if (updatesData) {
        setUpdates(updatesData.map(update => ({
          id: update.id,
          userId: update.user_id,
          content: update.content,
          createdAt: update.created_at,
          updatedAt: update.updated_at,
          reactions: update.reactions.map((reaction: any) => ({
            id: reaction.id,
            updateId: reaction.update_id,
            userId: reaction.user_id,
            emoji: reaction.emoji,
            createdAt: reaction.created_at
          }))
        })));
        setIsFirstUpdate(updatesData.length === 0);
      }
    } catch (error) {
      console.error('Error in loadUpdates:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdate.trim()) return;

    try {
      const { error } = await supabase
        .from('user_updates')
        .insert({
          user_id: userId,
          content: newUpdate.trim()
        });

      if (error) {
        console.error('Error submitting update:', error);
        return;
      }

      setNewUpdate('');
      await loadUpdates();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    }
  };

  const handleReaction = async (updateId: string, emoji: string) => {
    try {
      const { error } = await supabase
        .from('user_reactions')
        .upsert({
          update_id: updateId,
          user_id: currentUserId,
          emoji
        }, {
          onConflict: 'update_id,user_id,emoji'
        });

      if (error) {
        console.error('Error adding reaction:', error);
        return;
      }

      loadUpdates();
    } catch (error) {
      console.error('Error in handleReaction:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  const displayedUpdates = showAllUpdates ? updates : newUpdates;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={dialogRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">
              {isOwnProfile ? 'Your Updates' : `${userName}'s Updates`}
            </h2>
            <button
              onClick={() => setShowHelpTooltip(!showHelpTooltip)}
              className="text-gray-400 hover:text-gray-600"
              type="button"
            >
              <Info className="w-5 h-5" />
            </button>
            {showHelpTooltip && (
              <div className="absolute top-14 left-4 bg-blue-50 p-3 rounded-md shadow-md text-sm text-blue-800 max-w-xs">
                <p>
                  {isOwnProfile 
                    ? "Share what you're working on. Others will see your updates and can react with emojis."
                    : "View updates from this user and react with emojis to show support or acknowledgment."}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            type="button"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div ref={contentRef} className="p-4 overflow-y-auto max-h-[calc(80vh-8rem)]">
          {newUpdates.length > 0 && !showAllUpdates && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-blue-600">New Activity</h3>
                <button
                  onClick={() => setShowAllUpdates(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  type="button"
                >
                  Show All Updates
                </button>
              </div>
              <div className="space-y-4">
                {displayedUpdates.map(update => (
                  <div 
                    key={update.id} 
                    className="border rounded-lg p-4 bg-blue-50"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="whitespace-pre-wrap flex-1">{update.content}</div>
                      <div className="text-sm text-gray-500 whitespace-nowrap">
                        {formatDate(update.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showAllUpdates && (
            <div className="space-y-4">
              {updates.map(update => (
                <div 
                  key={update.id} 
                  className="border rounded-lg p-4"
                  data-unread={!isOwnProfile && update.createdAt > (localStorage.getItem(`lastRead_${userId}`) || '0')}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="whitespace-pre-wrap flex-1">{update.content}</div>
                    <div className="text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(update.createdAt)}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-3">
                    {EMOJI_OPTIONS.map(emoji => {
                      const reactionCount = update.reactions.filter(r => r.emoji === emoji).length;
                      const hasReacted = update.reactions.some(r => r.emoji === emoji && r.userId === currentUserId);
                      
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(update.id, emoji)}
                          className={`px-2 py-1 rounded-full text-sm ${
                            hasReacted ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          } hover:bg-blue-200`}
                          type="button"
                        >
                          {emoji} {reactionCount > 0 && reactionCount}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isOwnProfile && (
            <form onSubmit={handleSubmit} className="sticky bottom-0 bg-white pt-4 border-t">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isFirstUpdate ? 'What are you working on?' : 'Give an update'}
              </label>
              <textarea
                value={newUpdate}
                onChange={e => setNewUpdate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Share your progress..."
              />
              <button
                type="submit"
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Post Update
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}