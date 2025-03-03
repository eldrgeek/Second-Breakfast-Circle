import { create } from 'zustand';
import { User, Recording, UserUpdate, Session } from '../types';
import { supabase } from '../lib/supabase';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { ROOM_CONFIG } from '../config';
import { getSessionId, createSession, updateSessionActivity, endSession } from '../lib/session';

interface StoreState {
  users: User[];
  currentUser: User | null;
  talkingStickHolder: string | null;
  recordings: Recording[];
  ambientVolume: number;
  numChairs: number;
  isResettingSession: boolean;
  isPresencePanelVisible: boolean;
  setUsers: (users: User[]) => void;
  setCurrentUser: (user: User | null) => Promise<void>;
  setTalkingStickHolder: (userId: string | null) => void;
  addRecording: (recording: Recording) => void;
  setAmbientVolume: (volume: number) => void;
  passStick: (fromUserId: string, toUserId: string) => void;
  resetRoom: () => Promise<void>;
  handleRealtimeUpdate: (payload: RealtimePostgresChangesPayload<any>) => void;
  setUserSpeakingLevel: (userId: string, level: number) => void;
  cleanup: () => Promise<void>;
  leaveRoom: () => Promise<void>;
  markUpdateAsRead: (userId: string) => void;
  loadInitialUsers: () => Promise<void>;
  markTourCompleted: (userId: string) => Promise<void>;
  checkTourStatus: (userId: string) => Promise<boolean>;
  togglePresencePanel: () => void;
}

const dbUserToAppUser = (dbUser: any, existingUser?: User): User => ({
  id: dbUser.id,
  name: dbUser.name,
  avatarUrl: dbUser.avatar_url,
  seatNumber: dbUser.seat_number,
  isActive: dbUser.is_active,
  isSpeaking: dbUser.is_speaking,
  hasStick: dbUser.has_stick,
  audioEnabled: dbUser.audio_enabled,
  videoEnabled: dbUser.video_enabled,
  color: dbUser.color,
  joinedAt: dbUser.created_at || new Date().toISOString(),
  hasUnreadUpdates: existingUser?.hasUnreadUpdates ?? false,
  speakingLevel: existingUser?.speakingLevel ?? 0,
  numberOfSessions: dbUser.number_of_sessions || 1,
  presenceState: dbUser.presence_state || {},
  hasTakenTour: dbUser.has_taken_tour ?? false,
  lastTourDate: dbUser.last_tour_date ?? null,
  sessionId: dbUser.session_id || existingUser?.sessionId
});

export const useStore = create<StoreState>((set, get) => {
  // Load initial users
  const loadInitialUsers = async () => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('is_active', { ascending: false })
        .order('last_seen', { ascending: false });

      if (error) {
        console.error('Error loading initial users:', error);
        return;
      }

      if (users) {
        const appUsers = users.map(user => dbUserToAppUser(user));
        get().setUsers(appUsers);
      }
    } catch (error) {
      console.error('Error in loadInitialUsers:', error);
    }
  };

  // Set up realtime subscriptions to users + user_updates
  const channel = supabase
    .channel('room-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'users' },
      (payload: RealtimePostgresChangesPayload<any>) => {
        get().handleRealtimeUpdate(payload);
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'user_updates' },
      (payload) => {
        const { new: newUpdate } = payload;
        const currentUser = get().currentUser;
        if (currentUser && newUpdate.user_id !== currentUser.id) {
          set(state => ({
            users: state.users.map(user =>
              user.id === newUpdate.user_id
                ? { ...user, hasUnreadUpdates: true }
                : user
            )
          }));
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sessions' },
      (payload) => {
        // Refresh users when sessions change
        loadInitialUsers().catch(error => {
          console.error('Error refreshing users after session change:', error);
        });
      }
    )
    .subscribe();

  // Presence channel setup
  const presenceChannel = supabase.channel('online-users');

  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      const currentUser = get().currentUser;
      if (currentUser) {
        try {
          supabase
            .from('users')
            .update({
              last_seen: new Date().toISOString(),
              presence_state: state
            })
            .eq('id', currentUser.id)
            .then(() => {
              console.log('Updated presence state');
            })
            .catch(error => {
              console.error('Error updating presence state:', error);
            });
        } catch (error) {
          console.error('Error in presence sync:', error);
        }
      }
    })
    .subscribe();

  // Load users on store creation
  loadInitialUsers().catch(error => {
    console.error('Error loading initial users on store creation:', error);
  });

  // Set up session activity tracking
  const sessionActivityInterval = setInterval(() => {
    const sessionId = sessionStorage.getItem('sessionId');
    const currentUser = get().currentUser;
    
    if (sessionId && currentUser) {
      updateSessionActivity(sessionId).catch(error => {
        console.error('Error updating session activity:', error);
      });
    }
  }, 60000); // Update every minute

  // Window event listeners for presence + cleanup
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => {
      const currentUser = get().currentUser;
      if (currentUser) {
        try {
          presenceChannel.track({ user_id: currentUser.id, online: true });
        } catch (error) {
          console.error('Error tracking presence on focus:', error);
        }
      }
    });

    window.addEventListener('blur', () => {
      const currentUser = get().currentUser;
      if (currentUser) {
        try {
          presenceChannel.track({ user_id: currentUser.id, online: false });
        } catch (error) {
          console.error('Error tracking presence on blur:', error);
        }
      }
    });

    window.addEventListener('beforeunload', async () => {
      const currentUser = get().currentUser;
      if (currentUser) {
        const data = JSON.stringify({
          is_active: false,
          presence_state: { online: false },
          last_seen: new Date().toISOString()
        });
        try {
          navigator.sendBeacon(
            `${supabase.supabaseUrl}/rest/v1/users?id=eq.${currentUser.id}`,
            data
          );
        } catch (error) {
          console.error('Error in beforeunload:', error);
        }
      }
    });

    window.addEventListener('pagehide', async () => {
      try {
        await get().cleanup();
      } catch (error) {
        console.error('Error in pagehide cleanup:', error);
      }
    });
  }

  return {
    users: [],
    currentUser: null,
    talkingStickHolder: null,
    recordings: [],
    ambientVolume: 0.5,
    numChairs: ROOM_CONFIG.NUM_CHAIRS,
    isResettingSession: sessionStorage.getItem('isResettingSession') === 'true',
    isPresencePanelVisible: true,

    loadInitialUsers,

    togglePresencePanel: () => {
      set(state => ({
        isPresencePanelVisible: !state.isPresencePanelVisible
      }));
    },

    markUpdateAsRead: (userId: string) => {
      localStorage.setItem(`lastRead_${userId}`, new Date().toISOString());
      set(state => ({
        users: state.users.map(user =>
          user.id === userId ? { ...user, hasUnreadUpdates: false } : user
        )
      }));
    },

    markTourCompleted: async (userId: string) => {
      try {
        // Fallback to localStorage first
        const onboardingKey = `onboarding_${userId}`;
        localStorage.setItem(onboardingKey, 'true');
        
        // Update local state immediately for better UX
        set(state => ({
          currentUser: state.currentUser
            ? { ...state.currentUser, hasTakenTour: true, lastTourDate: new Date().toISOString() }
            : null,
          users: state.users.map(user =>
            user.id === userId
              ? { ...user, hasTakenTour: true, lastTourDate: new Date().toISOString() }
              : user
          )
        }));

        // Try to update the database if possible
        const { error } = await supabase
          .from('users')
          .update({
            has_taken_tour: true,
            last_tour_date: new Date().toISOString()
          })
          .eq('id', userId);

        if (error) {
          console.error('Error marking tour as completed:', error);
        }
      } catch (error) {
        console.error('Error in markTourCompleted:', error);
      }
    },

    checkTourStatus: async (userId: string) => {
      try {
        // First check local storage as fallback
        const onboardingKey = `onboarding_${userId}`;
        const localStorageStatus = localStorage.getItem(onboardingKey);
        if (localStorageStatus === 'true') {
          return true;
        }

        // Try to check in the database
        try {
          const { data, error } = await supabase
            .from('users')
            .select('has_taken_tour')
            .eq('id', userId)
            .single();

          if (error) {
            console.error('Error checking tour status:', error);
            return localStorageStatus === 'true';
          }

          return data?.has_taken_tour || false;
        } catch (dbError) {
          console.error('Database error in checkTourStatus:', dbError);
          return localStorageStatus === 'true';
        }
      } catch (error) {
        console.error('Error in checkTourStatus:', error);
        // Fallback to local storage
        const onboardingKey = `onboarding_${userId}`;
        return localStorage.getItem(onboardingKey) === 'true';
      }
    },

    setUsers: (users) => {
      // Get current session ID
      const sessionId = sessionStorage.getItem('sessionId');
      
      // Keep both active users and recent visitors (inactive within 24h)
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const relevantUsers = users.filter(
        user => user.isActive || new Date(user.joinedAt) > twentyFourHoursAgo
      );

      // Sort: active first, then seat number, then visitors
      const sortedUsers = [...relevantUsers].sort((a, b) => {
        // First, check if user is in current session
        if (sessionId) {
          if (a.sessionId === sessionId && b.sessionId !== sessionId) return -1;
          if (a.sessionId !== sessionId && b.sessionId === sessionId) return 1;
        }
        
        // Then check active status
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        
        // Then sort by seat number for active users
        if (a.isActive && b.isActive) {
          return (a.seatNumber ?? Infinity) - (b.seatNumber ?? Infinity);
        }
        
        // Finally sort by join time for inactive users
        return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
      });

      set({ users: sortedUsers });
    },

    setCurrentUser: async (user) => {
      if (user) {
        try {
          // Get or create session ID
          const sessionId = getSessionId();
          user.sessionId = sessionId;
          
          // Check for existing user with same name
          const { data: existingUsers, error: queryError } = await supabase
            .from('users')
            .select('*')
            .eq('name', user.name)
            .limit(1);

          if (queryError) {
            console.error('Error querying existing users:', queryError);
            return;
          }

          let userData;

          if (existingUsers && existingUsers.length > 0) {
            const existingUser = existingUsers[0];
            userData = {
              ...existingUser,
              is_active: true,
              last_seen: new Date().toISOString(),
              presence_state: { online: true },
              seat_number: existingUser.seat_number,
              color: existingUser.color,
              session_id: sessionId
            };
          } else {
            // Find next available seat
            const { data: activeUsers, error: seatError } = await supabase
              .from('users')
              .select('seat_number')
              .eq('is_active', true)
              .order('seat_number');

            if (seatError) {
              console.error('Error querying active seats:', seatError);
              return;
            }

            const takenSeats = new Set(activeUsers?.map(u => u.seat_number) || []);
            let seatNumber = 0;
            while (takenSeats.has(seatNumber)) {
              seatNumber++;
            }

            userData = {
              id: user.id,
              name: user.name,
              avatar_url: user.avatarUrl,
              seat_number: seatNumber,
              is_active: true,
              is_speaking: user.isSpeaking,
              has_stick: user.hasStick,
              audio_enabled: true,
              video_enabled: user.videoEnabled,
              color: user.color,
              last_seen: new Date().toISOString(),
              presence_state: { online: true },
              session_id: sessionId
            };
          }

          const { error: upsertError } = await supabase
            .from('users')
            .upsert(userData, { onConflict: 'id' });

          if (upsertError) {
            console.error('Error updating user:', upsertError);
            return;
          }
          
          // Create or update session
          await createSession(user.id, ROOM_CONFIG.DEFAULT_ROOM_ID);
          
          const hasTakenTour = userData.has_taken_tour || false;
          const lastTourDate = userData.last_tour_date || null;

          set({
            currentUser: {
              ...user,
              seatNumber: userData.seat_number,
              audioEnabled: true,
              hasTakenTour,
              lastTourDate,
              sessionId
            }
          });

          try {
            presenceChannel.track({ user_id: user.id, online: true });
          } catch (presenceError) {
            console.error('Error tracking presence:', presenceError);
          }

          // Reload users
          await get().loadInitialUsers();

          if (sessionStorage.getItem('isResettingSession') === 'true') {
            sessionStorage.removeItem('isResettingSession');
            set({ isResettingSession: false });
          }
        } catch (error) {
          console.error('Error in setCurrentUser:', error);
        }
      } else {
        const current = get().currentUser;
        if (current) {
          await get().cleanup();
        }
        set({ currentUser: null });
      }
    },

    cleanup: async () => {
      const currentUser = get().currentUser;
      if (currentUser) {
        try {
          set(state => ({
            users: state.users.map(u =>
              u.id === currentUser.id ? { ...u, isActive: false } : u
            ),
            currentUser: null,
            talkingStickHolder: currentUser.hasStick ? null : state.talkingStickHolder
          }));

          // Untrack presence
          try {
            presenceChannel.untrack();
          } catch (error) {
            console.error('Error untracking presence:', error);
          }

          // End session
          await endSession(currentUser.id);

          const { error: updateError } = await supabase
            .from('users')
            .update({
              is_active: false,
              presence_state: { online: false },
              last_seen: new Date().toISOString(),
              session_id: null
            })
            .eq('id', currentUser.id);

          if (updateError) {
            console.error('Error updating user during cleanup:', updateError);
          }
        } catch (error) {
          console.error('Error during cleanup:', error);
          set(state => ({
            users: state.users.map(u =>
              u.id === currentUser.id ? { ...u, isActive: false } : u
            ),
            currentUser: null,
            talkingStickHolder: currentUser.hasStick ? null : state.talkingStickHolder
          }));
        }
      }
    },

    leaveRoom: async () => {
      const currentUser = get().currentUser;
      if (currentUser) {
        try {
          set(state => ({
            users: state.users.map(u =>
              u.id === currentUser.id ? { ...u, isActive: false } : u
            ),
            currentUser: null,
            talkingStickHolder: currentUser.hasStick ? null : state.talkingStickHolder
          }));

          // Untrack presence
          try {
            presenceChannel.untrack();
          } catch (error) {
            console.error('Error untracking presence:', error);
          }

          // End session
          await endSession(currentUser.id);

          const { error: updateError } = await supabase
            .from('users')
            .update({
              is_active: false,
              presence_state: { online: false },
              last_seen: new Date().toISOString(),
              session_id: null
            })
            .eq('id', currentUser.id);

          if (updateError) {
            console.error('Error updating user during leave:', updateError);
          }

          // Reload users
          try {
            await get().loadInitialUsers();
          } catch (error) {
            console.error('Error reloading users after leave:', error);
          }
        } catch (error) {
          console.error('Error leaving room:', error);
          set(state => ({
            users: state.users.map(u =>
              u.id === currentUser.id ? { ...u, isActive: false } : u
            ),
            currentUser: null,
            talkingStickHolder: currentUser.hasStick ? null : state.talkingStickHolder
          }));
        }
      }
    },

    setTalkingStickHolder: (userId) => {
      set({ talkingStickHolder: userId });
    },

    addRecording: (recording) =>
      set((state) => ({ recordings: [...state.recordings, recording] })),

    setAmbientVolume: (volume) => set({ ambientVolume: volume }),

    passStick: async (fromUserId, toUserId) => {
      try {
        const { error } = await supabase
          .from('users')
          .update({ has_stick: false })
          .eq('id', fromUserId);

        if (error) {
          console.error('Error updating from user:', error);
          return;
        }

        const { error: error2 } = await supabase
          .from('users')
          .update({ has_stick: true })
          .eq('id', toUserId);

        if (error2) {
          console.error('Error updating to user:', error2);
          return;
        }

        set({ talkingStickHolder: toUserId });
      } catch (error) {
        console.error('Error in passStick:', error);
      }
    },

    resetRoom: async () => {
      try {
        sessionStorage.setItem('isResettingSession', 'true');
        set({ isResettingSession: true });

        // Clear session storage
        sessionStorage.removeItem('sessionId');

        const { error } = await supabase
          .from('users')
          .update({
            is_active: false,
            has_stick: false,
            presence_state: { online: false },
            last_seen: new Date().toISOString(),
            session_id: null
          })
          .neq('id', '00000000-0000-0000-0000-000000000000');

        if (error) {
          console.error('Error resetting room:', error);
          return;
        }

        set({
          users: [],
          currentUser: null,
          talkingStickHolder: null
        });

        window.location.reload();
      } catch (error) {
        console.error('Error in resetRoom:', error);
        sessionStorage.removeItem('isResettingSession');
      }
    },

    setUserSpeakingLevel: (userId: string, level: number) => {
      set(state => ({
        users: state.users.map(user =>
          user.id === userId ? { ...user, speakingLevel: level } : user
        ),
        currentUser:
          state.currentUser?.id === userId
            ? { ...state.currentUser, speakingLevel: level }
            : state.currentUser
      }));
    },

    handleRealtimeUpdate: (payload: RealtimePostgresChangesPayload<any>) => {
      try {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        const { users, currentUser } = get();

        switch (eventType) {
          case 'INSERT': {
            const newUser = dbUserToAppUser(newRecord);
            if (!users.some(u => u.id === newUser.id)) {
              const updatedUsers = [...users, newUser];
              set({ users: updatedUsers });
            }
            break;
          }
          case 'UPDATE': {
            const existingUser = users.find(u => u.id === newRecord.id);
            const updatedUser = dbUserToAppUser(newRecord, existingUser);

            const updatedUsers = users.map(u =>
              u.id === newRecord.id ? updatedUser : u
            );
            set({ users: updatedUsers });

            if (currentUser?.id === newRecord.id) {
              set({ currentUser: updatedUser });
            }

            if (newRecord.has_stick) {
              set({ talkingStickHolder: newRecord.id });
            }
            break;
          }
          case 'DELETE': {
            const updatedUsers = users.filter(u => u.id !== oldRecord.id);
            set({ users: updatedUsers });

            if (currentUser?.id === oldRecord.id) {
              set({ currentUser: null });
            }

            if (oldRecord.has_stick) {
              set({ talkingStickHolder: null });
            }
            break;
          }
        }
      } catch (error) {
        console.error('Error in handleRealtimeUpdate:', error);
      }
    }
  };
});