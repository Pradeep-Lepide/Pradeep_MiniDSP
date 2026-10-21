import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    requiredEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnvironmentVariable("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          }
        },
      },
    },
  );
}
