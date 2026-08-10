/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SUBTITLE_WS_URL?: string;
  readonly VITE_LIVEKIT_URL?: string;
  readonly VITE_ENABLE_WEBRTC_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
