import type { SupabaseClient } from '@supabase/supabase-js';

/** Points the mocked `@/lib/supabase/server#createClient()` at a specific user's client. */
export function setActiveClient(client: SupabaseClient) {
  (globalThis as unknown as { __activeSupabaseClient: unknown }).__activeSupabaseClient = client;
}
