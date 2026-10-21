"use server";

import { redirect } from "next/navigation";

import { safeAuthErrorMessage } from "../src/lib/auth-error.ts";
import {
  persistScanAtomically,
  ScanPersistenceError,
  type AtomicScanRpcArguments,
} from "../src/lib/scan-persistence.ts";
import { createServerSupabaseClient } from "../src/lib/supabase/server.ts";
import { prepareUploadForPersistence } from "../src/lib/upload-service.ts";
import {
  UploadValidationError,
  type UploadFile,
} from "../src/lib/upload-validation.ts";

function pathWithMessage(path: string, message: string): string {
  return `${path}?message=${encodeURIComponent(message)}`;
}

export async function signIn(formData: FormData): Promise<never> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    redirect(pathWithMessage("/", "Email and password are required."));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(pathWithMessage("/", safeAuthErrorMessage("signIn", error)));
  }

  redirect(pathWithMessage("/", "Signed in."));
}

export async function signUp(formData: FormData): Promise<never> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    redirect(pathWithMessage("/", "Email and password are required."));
  }

  if (password.length < 8) {
    redirect(pathWithMessage("/", "Use a password with at least 8 characters."));
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(pathWithMessage("/", safeAuthErrorMessage("signUp", error)));
  }

  if (!data.session) {
    redirect(pathWithMessage("/", "Account created. Complete any email verification, then sign in."));
  }

  redirect(pathWithMessage("/", "Account created and signed in."));
}

export async function signOut(): Promise<never> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    redirect(pathWithMessage("/", "Sign-out failed."));
  }

  redirect(pathWithMessage("/", "Signed out."));
}

export async function uploadAndScan(formData: FormData): Promise<never> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect(pathWithMessage("/", "You must sign in before scanning a file."));
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    redirect(pathWithMessage("/scan", "Select a CSV or TXT file."));
  }

  let payload;
  try {
    payload = await prepareUploadForPersistence(file as UploadFile);
  } catch (validationError) {
    if (validationError instanceof UploadValidationError) {
      redirect(pathWithMessage("/scan", validationError.message));
    }
    throw validationError;
  }

  try {
    await persistScanAtomically(
      async (arguments_: AtomicScanRpcArguments) => {
        const { data: scanId, error: rpcError } = await supabase.rpc(
          "create_scan_with_findings",
          arguments_,
        );
        return { data: scanId as string | null, error: rpcError };
      },
      payload,
    );
  } catch (persistenceError) {
    if (persistenceError instanceof ScanPersistenceError) {
      redirect(pathWithMessage("/scan",
        "Scan could not be saved. Confirm that the database migration is applied.",
      ));
    }
    throw persistenceError;
  }

  redirect(pathWithMessage("/scan",
    `Scan saved: ${payload.classification}, ${payload.totalFindings} findings.`,
  ));
}
