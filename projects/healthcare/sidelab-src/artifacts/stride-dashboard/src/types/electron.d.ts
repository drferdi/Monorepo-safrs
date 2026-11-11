interface Window {
  electronCDSS?: {
    version: string;
    isElectron: boolean;
    saveSessionToFile: (
      content: string,
    ) => Promise<{ success: boolean; path?: string; error?: string }>;
    openSessionFolder: () => Promise<void>;
  };
}
