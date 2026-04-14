/**
 * Alias entry for browser-side Supabase — same as `@/lib/supabase/browser`.
 * Prefer this import from legacy `pages/` or shared client utilities to avoid confusion with `server.ts`.
 */
export { createSupabaseBrowserClient, createSupabaseBrowserClientNoStore } from './browser'
