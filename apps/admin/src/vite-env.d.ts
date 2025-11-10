/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly REACT_APP_API_URL: string
  readonly REACT_APP_WS_URL: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
