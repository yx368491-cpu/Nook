import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  selectedConversationId: string | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSelectedConversation: (id: string | null) => void;
}

export const useUI = create<UIState>((set) => ({
  sidebarOpen: true,
  selectedConversationId: null,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSelectedConversation: (id) => set({ selectedConversationId: id }),
}));
