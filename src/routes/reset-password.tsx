import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Koshagra" },
      { name: "description", content: "Set a new password for your Koshagra workspace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Needs attention.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-vault-ivory flex items-center justify-center px-xl">
      <form onSubmit={handleSubmit} className="w-full max-w-[28rem] rounded-md bg-pure-white p-2xl shadow-[var(--shadow-2)] ring-1 ring-[color:var(--color-border-default)] flex flex-col gap-md">
        <h1 className="text-[28px] leading-[36px] text-kosha-navy">Set a new password</h1>
        <label className="flex flex-col gap-xs">
          <span className="text-xs uppercase tracking-widest text-slate-grey">New password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm"
          />
        </label>
        {message && <p className="text-sm text-slate-grey">Needs attention · {message}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory disabled:opacity-40"
        >
          {submitting ? "Working…" : "Update password"}
        </button>
      </form>
    </div>
  );
}