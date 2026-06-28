import { create } from 'zustand';

interface PresenceState {
  onlineUsers: Set<string>;
  typingUsers: Map<string, string[]>;  // conversationId -> userId[]
  setOnlineUsers: (ids: string[]) => void;
  setTypingUsers: (conversationId: string, userIds: string[]) => void;
  clear: () => void;
}

export const usePresence = create<PresenceState>((set) => ({
  onlineUsers: new Set(),
  typingUsers: new Map(),
  setOnlineUsers: (ids) => set({ onlineUsers: new Set(ids) }),
  setTypingUsers: (conversationId, userIds) =>
    set((s) => {
      const newMap = new Map(s.typingUsers);
      newMap.set(conversationId, userIds);
      return { typingUsers: newMap };
    }),
  clear: () => set({ onlineUsers: new Set(), typingUsers: new Map() }),
}));
