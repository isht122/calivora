/**
 * Convenience re-export of the auth hook.
 *
 * Components import `useAuth` from here so the auth context module
 * (`lib/auth.tsx`) stays the single source of truth for the provider.
 */
export { useAuth } from "@/lib/auth";
export type { AuthContextValue, AuthStatus } from "@/lib/auth";
