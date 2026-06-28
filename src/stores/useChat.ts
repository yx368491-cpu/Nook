import { create } from 'zustand';

interface ChatState {
  composingMessage: string;
  replyingTo: string | null;
  setComposingMessage: (msg: string) => void;
  setReplyingTo: (id: string | null) => void;
  clearComposer: () => void;
}

export const useChat = create<ChatState>((set) => ({
  composingMessage: '',
  replyingTo: null,
  setComposingMessage: (msg) => set({ composingMessage: msg }),
  setReplyingTo: (id) => set({ replyingTo: id }),
  clearComposer: () => set({ composingMessage: '', replyingTo: null }),
}));
