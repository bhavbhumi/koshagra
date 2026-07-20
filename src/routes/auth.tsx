import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Koshagra" },
      { name: "description", content: "Sign in to your Koshagra continuity workspace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Redirect if already signed in.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setNotice(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        setNotice("Check your inbox to confirm your email, then sign in.");
        setMode("signin");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setNotice("If that email exists, a reset link is on its way.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something needs attention. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-vault-ivory flex flex-col">
      <header className="px-xl py-lg">
        <Link to="/">
          <img src="/brand/lockup-horizontal-primary.svg" alt="Koshagra" className="h-8 w-auto" />
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-xl py-2xl">
        <div className="w-full max-w-[28rem] rounded-md bg-pure-white p-2xl shadow-[var(--shadow-2)] ring-1 ring-[color:var(--color-border-default)]">
          <h1 className="text-[28px] leading-[36px] text-kosha-navy">
            {mode === "signup" ? "Create your workspace" : mode === "forgot" ? "Reset your password" : "Welcome back"}
          </h1>
          <p className="mt-xs text-sm text-slate-grey">
            {mode === "signup"
              ? "You'll join as a Participant, in the capacity of Principal."
              : mode === "forgot"
              ? "We'll email you a link to set a new password."
              : "Sign in to your continuity workspace."}
          </p>

          <form onSubmit={handleSubmit} className="mt-xl flex flex-col gap-md" noValidate>
            {mode === "signup" && (
              <label className="flex flex-col gap-xs">
                <span className="text-xs uppercase tracking-widest text-slate-grey">Display name</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm"
                  required
                />
              </label>
            )}
            <label className="flex flex-col gap-xs">
              <span className="text-xs uppercase tracking-widest text-slate-grey">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm"
                required
              />
            </label>
            {mode !== "forgot" && (
              <label className="flex flex-col gap-xs">
                <span className="text-xs uppercase tracking-widest text-slate-grey">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  minLength={8}
                  className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm"
                  required
                />
              </label>
            )}

            {message && <p className="text-sm text-slate-grey">Needs attention · {message}</p>}
            {notice && <p className="text-sm text-slate-grey">{notice}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-sm rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory disabled:opacity-40"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-xs">
                  <span className="h-2 w-2 rounded-full bg-bindu-gold" aria-hidden />
                  Working
                </span>
              ) : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
            </button>
          </form>

          <div className="mt-lg flex flex-col gap-2 text-sm text-slate-grey">
            {mode === "signin" && (
              <>
                <button type="button" className="text-left hover:text-kosha-navy" onClick={() => setMode("forgot")}>
                  Forgot your password?
                </button>
                <button type="button" className="text-left hover:text-kosha-navy" onClick={() => setMode("signup")}>
                  New to Koshagra? Create an account
                </button>
              </>
            )}
            {mode !== "signin" && (
              <button type="button" className="text-left hover:text-kosha-navy" onClick={() => setMode("signin")}>
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}