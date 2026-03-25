export type SupabaseServerConfig = {
  url: string;
  serviceRoleKey: string;
};

export function getSupabaseServerConfig(): SupabaseServerConfig {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("=== Supabase Config Debug ===");
  console.log("URL:", url);
  console.log("Service Role Key:", serviceRoleKey ? `${serviceRoleKey.substring(0, 20)}...` : "MISSING");
  console.log("All env vars:", {
    SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "PRESENT" : "MISSING"
  });

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase server configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return {
    url,
    serviceRoleKey,
  };
}
