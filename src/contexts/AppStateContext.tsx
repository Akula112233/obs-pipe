'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AppState {
  isOnline: boolean;
  isSystemEnabled: boolean;
  isLoading: boolean;
}

interface AppStateContextType extends AppState {
  setAppState: (state: Partial<AppState>) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    isOnline: false,        // Start offline
    isSystemEnabled: false, // Start disabled
    isLoading: true        // Start loading
  });

  const setAppState = (newState: Partial<AppState>) => {
    setState(current => ({ ...current, ...newState }));
  };

  return (
    <AppStateContext.Provider value={{ ...state, setAppState }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
} 