import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config.js';

let serviceClient: SupabaseClient | null = null;

/**
 * Service-role Supabase client. Used for privileged server-side writes (orders,
 * payments, loyalty awards). NEVER expose this to clients.
 */
export function getServiceClient(): SupabaseClient {
  if (!serviceClient) {
    serviceClient = createClient(config.supabase.url, config.supabase.serviceRoleKey || config.supabase.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return serviceClient;
}
