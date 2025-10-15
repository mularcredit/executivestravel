/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEEPSEEK_API_KEY: string
  // add other env variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}