/**
 * Env helpers that tolerate common copy-paste mistakes.
 *
 * Supabase must be given the bare project origin (https://xxxx.supabase.co).
 * If the URL carries a path such as /rest/v1/ or a trailing slash, auth calls
 * go to e.g. /rest/v1/auth/v1/otp and Supabase answers
 * "Invalid path specified in request URL".
 */
export function supabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing. Set it in .env.local.");
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL is not a valid URL: "${raw}". Expected https://YOUR-PROJECT.supabase.co`,
    );
  }
  if (url.pathname !== "/" && url.pathname !== "") {
    console.warn(
      `[env] NEXT_PUBLIC_SUPABASE_URL had an extra path "${url.pathname}". Using ${url.origin} instead; please fix .env.local.`,
    );
  }
  return url.origin;
}

export function supabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Set it in .env.local.");
  }
  return key;
}

/**
 * Absolute URL the magic link returns to, e.g. http://localhost:3000/auth/confirm.
 * Uses NEXT_PUBLIC_SITE_URL when set (origin only; stray paths/slashes dropped),
 * otherwise the origin of the current request.
 */
export function authConfirmUrl(requestOrigin: string | null): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim() || requestOrigin || "http://localhost:3000";
  return new URL("/auth/confirm", new URL(base).origin).toString();
}
