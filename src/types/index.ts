export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  seatNumber: number | null;
  isActive: boolean;
  isSpeaking: boolean;
  hasStick: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  color: string;
  speakingLevel?: number;
  joinedAt: string;
  hasUnreadUpdates?: boolean;
  numberOfSessions?: number;
  presenceState?: Record<string, any>;
  hasTakenTour?: boolean;
  lastTourDate?: string | null;
  sessionId?: string;
}

export interface UserUpdate {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  reactions: UserReaction[];
}

export interface UserReaction {
  id: string;
  updateId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface Recording {
  id: string;
  userId: string;
  date: string;
  url: string;
  duration: number;
}

export interface Session {
  id: string;
  userId: string;
  roomId: string;
  createdAt: string;
  lastActive: string;
}