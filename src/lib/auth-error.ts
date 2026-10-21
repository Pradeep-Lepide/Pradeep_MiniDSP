interface AuthErrorDetails {
  code?: string;
  message?: string;
  status?: number;
}

const signUpMessages: Record<string, string> = {
  email_address_invalid: "Enter a valid email address.",
  email_exists: "An account already exists for this email. Use Sign in.",
  over_email_send_rate_limit: "Email rate limit reached. Wait briefly, then try again.",
  over_request_rate_limit: "Too many account attempts. Wait briefly, then try again.",
  signup_disabled: "New account creation is disabled in Supabase.",
  user_already_exists: "An account already exists for this email. Use Sign in.",
  weak_password: "Choose a stronger password with at least 8 characters.",
};

const signInMessages: Record<string, string> = {
  email_not_confirmed: "Confirm the account email before signing in.",
  invalid_credentials: "The email or password is incorrect.",
  over_request_rate_limit: "Too many sign-in attempts. Wait briefly, then try again.",
  user_banned: "This account is unavailable.",
};

export function safeAuthErrorMessage(
  operation: "signIn" | "signUp",
  error: AuthErrorDetails,
): string {
  const code = error.code;
  const knownMessage = code
    ? (operation === "signUp" ? signUpMessages[code] : signInMessages[code])
    : undefined;

  if (knownMessage) {
    return knownMessage;
  }

  const normalizedMessage = error.message?.toLowerCase() ?? "";
  if (normalizedMessage.includes("fetch failed")) {
    return "Supabase Auth could not be reached securely. Check the local certificate configuration.";
  }

  if (operation === "signUp") {
    if (normalizedMessage.includes("already registered")
      || normalizedMessage.includes("already exists")) {
      return "An account already exists for this email. Use Sign in.";
    }
    if (normalizedMessage.includes("password")) {
      return "The password does not meet the Supabase password policy.";
    }
    if (normalizedMessage.includes("email") && normalizedMessage.includes("invalid")) {
      return "Enter a valid email address.";
    }
  } else {
    if (normalizedMessage.includes("invalid login credentials")
      || normalizedMessage.includes("invalid credentials")) {
      return "The email or password is incorrect.";
    }
    if (normalizedMessage.includes("email not confirmed")) {
      return "Confirm the account email before signing in.";
    }
  }

  const reference = code ?? (error.status ? `http_${error.status}` : "unknown");
  return `${operation === "signUp" ? "Account creation" : "Sign-in"} failed. Reference: ${reference}.`;
}
