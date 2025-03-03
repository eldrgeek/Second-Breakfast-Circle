import { supabase } from './supabase';
import { ROOM_CONFIG } from '../config';

export const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('sessionId');
  
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('sessionId', sessionId);
  }
  
  return sessionId;
};

export const createSession = async (userId: string, roomId: string = ROOM_CONFIG.DEFAULT_ROOM_ID): Promise<string> => {
  const sessionId = getSessionId();
  
  try {
    // First ensure the room exists
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('id', roomId)
      .single();
      
    if (roomError) {
      console.error('Error checking room existence:', roomError);
      
      // If room doesn't exist, create it
      const { error: insertError } = await supabase
        .from('rooms')
        .insert({
          id: roomId,
          name: ROOM_CONFIG.ROOM_NAME
        });
        
      if (insertError) {
        console.error('Error creating default room:', insertError);
        return sessionId;
      }
    }
    
    // Now create the session
    const { error } = await supabase
      .from('sessions')
      .upsert({
        id: sessionId,
        user_id: userId,
        room_id: roomId,
        last_active: new Date().toISOString()
      }, {
        onConflict: 'id'
      });
      
    if (error) {
      console.error('Error creating session:', error);
    }
    
    // Update user with session ID
    await supabase
      .from('users')
      .update({ session_id: sessionId })
      .eq('id', userId);
      
  } catch (error) {
    console.error('Error in createSession:', error);
  }
  
  return sessionId;
};

export const updateSessionActivity = async (sessionId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('sessions')
      .update({ last_active: new Date().toISOString() })
      .eq('id', sessionId);
      
    if (error) {
      console.error('Error updating session activity:', error);
    }
  } catch (error) {
    console.error('Error in updateSessionActivity:', error);
  }
};

export const endSession = async (userId: string): Promise<void> => {
  const sessionId = sessionStorage.getItem('sessionId');
  
  if (!sessionId) return;
  
  try {
    // Update user to remove session ID
    await supabase
      .from('users')
      .update({ session_id: null })
      .eq('id', userId);
      
    // Remove from session storage
    sessionStorage.removeItem('sessionId');
  } catch (error) {
    console.error('Error in endSession:', error);
  }
};