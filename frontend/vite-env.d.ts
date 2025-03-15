interface ImportMetaEnv {
    readonly VITE_LIVEKIT_URL: string;
    // Add other environment variables here as needed
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  