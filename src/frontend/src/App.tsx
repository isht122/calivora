import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { HistoryPage } from "@/pages/HistoryPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { QueryClient } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";

/* -------------------------------------------------------------------------- */
/*  Auth-aware route guards                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Pure function: given auth state + the current pathname, decide where the user
 * should be. Returns `null` when the current route is fine as-is.
 *
 * Kept free of hooks so it can be unit-tested and called from a `useEffect`.
 */
function guardRoute(
  pathname: string,
  status: "loading" | "authenticated" | "unauthenticated",
  onboarded: boolean | null,
): string | null {
  if (status === "loading") return null;

  const isAuthRoute = pathname === "/login" || pathname === "/onboarding";

  if (status === "unauthenticated") {
    return isAuthRoute ? null : "/login";
  }
  // authenticated
  if (onboarded === false) {
    return pathname === "/onboarding" ? null : "/onboarding";
  }
  // authenticated + onboarded
  if (isAuthRoute) return "/";
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Router                                                                    */
/* -------------------------------------------------------------------------- */

interface RouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  // AuthGate wraps the Outlet so the auth/onboarding guard runs before any
  // child route renders. A bare <Outlet/> here would bypass the guard entirely.
  component: () => (
    <AuthGate>
      <Outlet />
    </AuthGate>
  ),
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  component: OnboardingPage,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <AppLayout>
      <HomePage />
    </AppLayout>
  ),
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  component: () => (
    <AppLayout>
      <HistoryPage />
    </AppLayout>
  ),
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: () => (
    <AppLayout>
      <SettingsPage />
    </AppLayout>
  ),
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  onboardingRoute,
  homeRoute,
  historyRoute,
  settingsRoute,
]);

/* -------------------------------------------------------------------------- */
/*  Auth gate — runs inside React so hooks are valid                          */
/*                                                                            */
/*  Navigation is performed imperatively via useNavigate() inside a useEffect */
/*  that watches auth status. Calling redirect() during render is a TanStack  */
/*  Router anti-pattern that does not reliably navigate; an effect-driven     */
/*  navigate() is the supported pattern for client-side guards.               */
/* -------------------------------------------------------------------------- */

function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, onboarded } = useAuth();
  const navigate = useNavigate();
  // useRouterState gives us the router-managed pathname (kept in sync with
  // the router's internal location, unlike window.location.pathname which can
  // lag behind client-side navigation).
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (status === "loading") return;
    const target = guardRoute(pathname, status, onboarded);
    if (target && target !== pathname) {
      navigate({ to: target, replace: true });
    }
  }, [status, onboarded, pathname, navigate]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div
          className="size-10 animate-pulse rounded-full bg-gradient-primary"
          aria-hidden
        />
        <span className="sr-only">Loading Calivora…</span>
      </div>
    );
  }

  return <>{children}</>;
}

/* -------------------------------------------------------------------------- */
/*  App                                                                       */
/* -------------------------------------------------------------------------- */

let queryClient: QueryClient | null = null;
function getQueryClient(): QueryClient {
  if (!queryClient) {
    queryClient = new QueryClient();
  }
  return queryClient;
}

const router = createRouter({
  routeTree,
  context: { queryClient: getQueryClient() },
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}

export { AuthGate };
