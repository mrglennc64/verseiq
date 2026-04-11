// VerseIQ login — STUB. Accepts any input and redirects to the `next`
// query parameter (or /verseiq if absent). Replace the submit handler
// with real auth (NextAuth, Clerk, etc.) when it lands. The rest of the
// layout can stay exactly as-is.

"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";

// Whitelist of paths the login page is allowed to redirect to. Prevents
// an open redirect through ?next=https://evil.example. Only internal app
// routes.
const ALLOWED_NEXT_PREFIXES = ["/verseiq", "/admin"];

function safeNextParam(raw: string | null): string {
  if (!raw) return "/verseiq";
  if (!raw.startsWith("/")) return "/verseiq";
  if (raw.startsWith("//")) return "/verseiq";
  if (!ALLOWED_NEXT_PREFIXES.some((p) => raw === p || raw.startsWith(`${p}/`) || raw.startsWith(`${p}?`))) {
    return "/verseiq";
  }
  return raw;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextParam(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // No real auth yet — just route to the requested destination.
    router.push(next);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <svg className={styles.headerLogo} viewBox="0 0 40 40" fill="none" aria-label="VerseIQ">
          <circle cx="20" cy="20" r="10" stroke="#74bca9" strokeWidth="2" />
          <circle cx="20" cy="20" r="4" fill="#74bca9" />
        </svg>
        <div className={styles.headerName}>
          VERSE<span className={styles.headerAccent}>IQ</span>
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.brand}>
          <svg className={styles.brandLogo} viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <circle cx="20" cy="20" r="10" stroke="#74bca9" strokeWidth="2" />
            <circle cx="20" cy="20" r="4" fill="#74bca9" />
          </svg>
          <div className={styles.brandName}>
            VERSE<span className={styles.headerAccent}>IQ</span>
          </div>
          <div className={styles.brandSub}>Sign in to VerseIQ</div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            type="email"
            placeholder="Email address"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className={styles.input}
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className={styles.forgot}>
          Forgot your password? <Link href="#">Reset it here</Link>
        </div>

        <p className={styles.note}>
          Authentication is coming soon. For now, any email and password will let you through to
          your dashboard.
        </p>
      </div>

      <div className={styles.footer}>© 2026 VerseIQ. All rights reserved.</div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <div className={styles.main}>
            <p className={styles.brandSub}>Loading…</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
