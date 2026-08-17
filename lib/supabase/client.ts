import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

let browserClient:
  SupabaseClient | undefined;

export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  browserClient =
    createSupabaseClient(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage:
            typeof window !== "undefined"
              ? window.localStorage
              : undefined,
        },
      }
    );

  return browserClient;
}