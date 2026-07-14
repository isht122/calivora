import { createActor } from "@/backend";
import type { Backend } from "@/backend";
import { api } from "@/lib/api";
import type { AuthError } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
/**
 * Email-OTP auth context for Calivora.
 *
 * Flow:
 *   1. User enters email → `requestCode(email)` → backend sends a 6-digit code.
 *   2. User enters code → `verifyCode(email, code, remember)` → backend returns
 *      a session token, which we persist in localStorage (when `remember` is
 *      true) or sessionStorage (when `remember` is false, so the session is
 *      cleared when the browser closes).
 *   3. On app load, if a token exists in either storage we call
 *      `validateSession(token)` to confirm it is still valid and resolve the
 *      user's email. localStorage is checked first, then sessionStorage.
 *   4. `isOnboarded(email)` decides whether we land on `/onboarding` or `/`.
 *
 * The backend actor itself is created unauthenticated (no Internet Identity).
 * The session token is passed implicitly — the backend correlates the
 * caller's session by the email used during `verifyCode`. (See backend auth
 * methods in `@/backend`.)
 */
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const TOKEN_KEY = "calivora.sessionToken";
const EMAIL_KEY = "calivora.sessionEmail";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

/**
 * Read the persisted session token/email from whichever storage currently
 * holds it. localStorage (the "remember me" store) is checked first, then
 * sessionStorage (the per-session store).
 */
function readStoredSession(): {
  token: string | null;
  email: string | null;
} {
  const lsToken = localStorage.getItem(TOKEN_KEY);
  const lsEmail = localStorage.getItem(EMAIL_KEY);
  if (lsToken && lsEmail) return { token: lsToken, email: lsEmail };
  const ssToken = sessionStorage.getItem(TOKEN_KEY);
  const ssEmail = sessionStorage.getItem(EMAIL_KEY);
  if (ssToken && ssEmail) return { token: ssToken, email: ssEmail };
  return { token: null, email: null };
}

/** Remove the token/email from both localStorage and sessionStorage. */
function clearStoredSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EMAIL_KEY);
}

export interface AuthContextValue {
  /** The backend actor (unauthenticated II; session handled via email OTP). */
  actor: Backend | null;
  status: AuthStatus;
  email: string | null;
  /** Session token for backend data calls. Null when unauthenticated. */
  sessionToken: string | null;
  /** True once we've confirmed the user has completed onboarding. */
  onboarded: boolean | null;
  /** Request a 6-digit code be sent to the given email. */
  requestCode: (
    email: string,
  ) => Promise<{ ok: true } | { ok: false; error: AuthError }>;
  /**
   * Verify the code and, on success, persist the session.
   * When `remember` is true (default) the token/email are stored in
   * localStorage so the session survives browser restarts; when false they
   * are stored in sessionStorage and cleared when the browser closes.
   */
  verifyCode: (
    email: string,
    code: string,
    remember?: boolean,
  ) => Promise<{ ok: true } | { ok: false; error: AuthError }>;
  /** Clear the local session and tell the backend to invalidate the token. */
  logout: () => Promise<void>;
  /** Mark the current session as onboarded (call after saveProfile). */
  markOnboarded: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { actor, isFetching } = useActor(createActor);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(
    () => readStoredSession().token,
  );
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  /* ----- Restore session on mount / when actor becomes available ------- */
  useEffect(() => {
    if (isFetching || !actor) return;
    const { token, email: storedEmail } = readStoredSession();
    if (!token || !storedEmail) {
      setStatus("unauthenticated");
      setEmail(null);
      setSessionToken(null);
      setOnboarded(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const validEmail = await api.validateSession(actor, token);
        if (cancelled) return;
        if (!validEmail) {
          clearStoredSession();
          setStatus("unauthenticated");
          setEmail(null);
          setSessionToken(null);
          setOnboarded(null);
          return;
        }
        const isOnboard = await api.isOnboarded(actor, token, validEmail);
        if (cancelled) return;
        setEmail(validEmail);
        setSessionToken(token);
        setOnboarded(isOnboard);
        setStatus("authenticated");
      } catch {
        if (cancelled) return;
        setStatus("unauthenticated");
        setEmail(null);
        setSessionToken(null);
        setOnboarded(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actor, isFetching]);

  const requestCode = useCallback(
    async (inputEmail: string) => {
      if (!actor)
        return {
          ok: false as const,
          error: {
            code: "unknown" as const,
            message: "Connecting to the network…",
          },
        };
      return api.requestCode(actor, inputEmail);
    },
    [actor],
  );

  const verifyCode = useCallback(
    async (inputEmail: string, code: string, remember = true) => {
      if (!actor)
        return {
          ok: false as const,
          error: {
            code: "unknown" as const,
            message: "Connecting to the network…",
          },
        };
      const res = await api.verifyCode(actor, inputEmail, code);
      if (res.ok) {
        // Persist to the storage matching the user's "remember me" choice.
        // Clear any stale copy in the *other* storage so a single source of
        // truth holds the active session.
        clearStoredSession();
        const store = remember ? localStorage : sessionStorage;
        store.setItem(TOKEN_KEY, res.token);
        store.setItem(EMAIL_KEY, inputEmail);
        try {
          const isOnboard = await api.isOnboarded(actor, res.token, inputEmail);
          setEmail(inputEmail);
          setSessionToken(res.token);
          setOnboarded(isOnboard);
          setStatus("authenticated");
        } catch {
          setEmail(inputEmail);
          setSessionToken(res.token);
          setOnboarded(null);
          setStatus("authenticated");
        }
      }
      return res;
    },
    [actor],
  );

  const logout = useCallback(async () => {
    const { token } = readStoredSession();
    if (actor && token) {
      try {
        await api.logout(actor, token);
      } catch {
        // best-effort; clear locally regardless
      }
    }
    clearStoredSession();
    setEmail(null);
    setSessionToken(null);
    setOnboarded(null);
    setStatus("unauthenticated");
  }, [actor]);

  const markOnboarded = useCallback(() => setOnboarded(true), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      actor,
      status,
      email,
      sessionToken,
      onboarded,
      requestCode,
      verifyCode,
      logout,
      markOnboarded,
    }),
    [
      actor,
      status,
      email,
      sessionToken,
      onboarded,
      requestCode,
      verifyCode,
      logout,
      markOnboarded,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
