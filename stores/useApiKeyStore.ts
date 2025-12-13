import { create } from 'zustand';

interface ApiKeyState {
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
}

export const useApiKeyStore = create<ApiKeyState>()(
    (set) => ({
      apiKey: null,
      setApiKey: (key) => {
        // This is a temporary solution for the web playground.
        // In a real app, this would be handled server-side.
        (process.env as any).API_KEY = key;
        set({ apiKey: key });
      },
    })
);