import assert from "node:assert/strict";
import test from "node:test";

import { safeAuthErrorMessage } from "../src/lib/auth-error.ts";

test("maps common sign-up errors to actionable messages", () => {
  assert.equal(
    safeAuthErrorMessage("signUp", { code: "user_already_exists", status: 422 }),
    "An account already exists for this email. Use Sign in.",
  );
  assert.equal(
    safeAuthErrorMessage("signUp", { code: "weak_password", status: 422 }),
    "Choose a stronger password with at least 8 characters.",
  );
});

test("maps common sign-in errors without exposing provider details", () => {
  assert.equal(
    safeAuthErrorMessage("signIn", { code: "invalid_credentials", status: 400 }),
    "The email or password is incorrect.",
  );
  assert.equal(
    safeAuthErrorMessage("signIn", { code: "email_not_confirmed", status: 400 }),
    "Confirm the account email before signing in.",
  );
});

test("returns only a safe code reference for unknown auth failures", () => {
  assert.equal(
    safeAuthErrorMessage("signUp", { code: "synthetic_unknown", status: 400 }),
    "Account creation failed. Reference: synthetic_unknown.",
  );
});

test("classifies provider messages when the SDK omits code and status", () => {
  assert.equal(
    safeAuthErrorMessage("signUp", { message: "User already registered" }),
    "An account already exists for this email. Use Sign in.",
  );
  assert.equal(
    safeAuthErrorMessage("signIn", { message: "Invalid login credentials" }),
    "The email or password is incorrect.",
  );
  assert.equal(
    safeAuthErrorMessage("signIn", { message: "fetch failed" }),
    "Supabase Auth could not be reached securely. Check the local certificate configuration.",
  );
});
