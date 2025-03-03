export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          avatar_url: string | null
          seat_number: number | null
          is_active: boolean
          is_speaking: boolean
          has_stick: boolean
          audio_enabled: boolean
          video_enabled: boolean
          color: string | null
          created_at: string
          last_seen: string
          number_of_sessions: number | null
          presence_state: Json | null
          has_taken_tour: boolean | null
          last_tour_date: string | null
          session_id: string | null
        }
        Insert: {
          id?: string
          name: string
          avatar_url?: string | null
          seat_number?: number | null
          is_active?: boolean
          is_speaking?: boolean
          has_stick?: boolean
          audio_enabled?: boolean
          video_enabled?: boolean
          color?: string | null
          created_at?: string
          last_seen?: string
          number_of_sessions?: number | null
          presence_state?: Json | null
          has_taken_tour?: boolean | null
          last_tour_date?: string | null
          session_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          avatar_url?: string | null
          seat_number?: number | null
          is_active?: boolean
          is_speaking?: boolean
          has_stick?: boolean
          audio_enabled?: boolean
          video_enabled?: boolean
          color?: string | null
          created_at?: string
          last_seen?: string
          number_of_sessions?: number | null
          presence_state?: Json | null
          has_taken_tour?: boolean | null
          last_tour_date?: string | null
          session_id?: string | null
        }
      }
      user_updates: {
        Row: {
          id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_reactions: {
        Row: {
          id: string
          update_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          update_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          update_id?: string
          user_id?: string
          emoji?: string
          created_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          room_id: string
          created_at: string
          last_active: string
        }
        Insert: {
          id: string
          user_id: string
          room_id: string
          created_at?: string
          last_active?: string
        }
        Update: {
          id?: string
          user_id?: string
          room_id?: string
          created_at?: string
          last_active?: string
        }
      }
    }
  }
}