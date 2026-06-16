import { create } from 'zustand';

interface AppState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  activeTimer: {
    isRunning: boolean;
    clientId: string | null;
    caseId: string | null;
    categorie: string;
    startTime: Date | null;
    elapsed: number;
  };
  startTimer: (clientId?: string, caseId?: string, categorie?: string) => void;
  stopTimer: () => void;
  updateElapsed: (elapsed: number) => void;

  unreadEmails: number;
  unreadMessages: number;
  setUnreadEmails: (count: number) => void;
  setUnreadMessages: (count: number) => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  activeTimer: {
    isRunning: false,
    clientId: null,
    caseId: null,
    categorie: 'studiere',
    startTime: null,
    elapsed: 0,
  },
  startTimer: (clientId, caseId, categorie) =>
    set({
      activeTimer: {
        isRunning: true,
        clientId: clientId || null,
        caseId: caseId || null,
        categorie: categorie || 'studiere',
        startTime: new Date(),
        elapsed: 0,
      },
    }),
  stopTimer: () =>
    set({
      activeTimer: {
        isRunning: false,
        clientId: null,
        caseId: null,
        categorie: 'studiere',
        startTime: null,
        elapsed: 0,
      },
    }),
  updateElapsed: (elapsed) =>
    set((state) => ({
      activeTimer: { ...state.activeTimer, elapsed },
    })),

  unreadEmails: 0,
  unreadMessages: 0,
  setUnreadEmails: (count) => set({ unreadEmails: count }),
  setUnreadMessages: (count) => set({ unreadMessages: count }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
}));
