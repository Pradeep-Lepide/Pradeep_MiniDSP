import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnvironment } from "./environment";

export async function createServerSupabaseReadClient() {
  const cookieStore = await cookies();
  const environment = getSupabaseEnvironment();

  return createServerClient(environment.url, environment.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
    },
  });
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const environment = getSupabaseEnvironment();

  return createServerClient(
    environment.url,
    environment.anonKey,
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
