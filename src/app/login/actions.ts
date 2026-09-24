"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authConfirmUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email || !email.includes("@")) {
    redirect("/login?error=" + encodeURIComponent("Enter a valid email address."));
  }

  const h = await headers();
  const origin = h.get("origin") ?? (h.get("host") ? `http://${h.get("host")}` : null);

  // Exactly http://localhost:3000/auth/confirm locally (no query string), so it
  // matches the Supabase Redirect URL allowlist entry verbatim.
  const emailRedirectTo = authConfirmUrl(origin);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo, shouldCreateUser: true },
  });

  if (error) {
    console.error("[login] signInWithOtp failed:", error.message, { emailRedirectTo });
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  redirect("/login?sent=" + encodeURIComponent(email));
}
