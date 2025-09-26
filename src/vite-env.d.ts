/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_SUPABASE_SERVICE_ROLE_KEY: string
  readonly VITE_JWNET_GATEWAY_BASEURL: string
  readonly VITE_JWNET_GATEWAY_TOKEN: string
  readonly VITE_DATA_BACKEND_MODE: string
  readonly VITE_DATA_BACKEND_OVERRIDES: string
  readonly VITE_DEBUG: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

