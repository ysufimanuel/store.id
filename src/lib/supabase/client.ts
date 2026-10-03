import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isSupabaseConfigured =
  url.startsWith("https://") && key.length > 10;

let browserClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(
      isSupabaseConfigured ? url : "https://placeholder.supabase.co",
      isSupabaseConfigured ? key : "placeholder-key"
    );
  }
  return browserClient;
}
