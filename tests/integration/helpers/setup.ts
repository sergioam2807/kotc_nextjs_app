import { vi } from 'vitest';

// Lets integration tests call Next.js route handlers (app/api/**/route.ts)
// directly as plain functions, without a running Next.js server. The route
// modules only ever call `createClient()` from this module — swapping it for
// a real supabase-js client scoped to a specific test user (see
// `setActiveClient` in ./routeClient) exercises the exact same RLS-guarded
// queries the app makes in production, just without the cookie/next-headers
// plumbing that only works inside an actual request.
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => (globalThis as unknown as { __activeSupabaseClient: unknown }).__activeSupabaseClient,
}));
