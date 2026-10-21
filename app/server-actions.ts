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

function homeWithMessage(message: string): string {
  return `/?message=${encodeURIComponent(message)}`;
}

export async function signIn(formData: FormData): Promise<never> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    redirect(homeWithMessage("Email and password are required."));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(homeWithMessage(safeAuthErrorMessage("signIn", error)));
  }

  redirect(homeWithMessage("Signed in."));
}

export async function signUp(formData: FormData): Promise<never> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    redirect(homeWithMessage("Email and password are required."));
  }

  if (password.length < 8) {
    redirect(homeWithMessage("Use a password with at least 8 characters."));
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(homeWithMessage(safeAuthErrorMessage("signUp", error)));
  }

  if (!data.session) {
    redirect(homeWithMessage("Account created. Complete any email verification, then sign in."));
  }

  redirect(homeWithMessage("Account created and signed in."));
}

export async function signOut(): Promise<never> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    redirect(homeWithMessage("Sign-out failed."));
  }

  redirect(homeWithMessage("Signed out."));
}

export async function uploadAndScan(formData: FormData): Promise<never> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect(homeWithMessage("You must sign in before scanning a file."));
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    redirect(homeWithMessage("Select a CSV or TXT file."));
  }

  let payload;
  try {
    payload = await prepareUploadForPersistence(file as UploadFile);
  } catch (validationError) {
    if (validationError instanceof UploadValidationError) {
      redirect(homeWithMessage(validationError.message));
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
      redirect(homeWithMessage(
        "Scan could not be saved. Confirm that the database migration is applied.",
      ));
    }
    throw persistenceError;
  }

  redirect(homeWithMessage(
    `Scan saved: ${payload.classification}, ${payload.totalFindings} findings.`,
  ));
}
