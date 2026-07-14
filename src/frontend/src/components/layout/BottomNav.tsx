import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { History, Home, Settings } from "lucide-react";

interface NavItem {
  label: string;
  to: string;
  icon: typeof Home;
  marker: string;
}

const ITEMS: NavItem[] = [
  { label: "Home", to: "/", icon: Home, marker: "nav.home" },
  { label: "History", to: "/history", icon: History, marker: "nav.history" },
  {
    label: "Settings",
    to: "/settings",
    icon: Settings,
    marker: "nav.settings",
  },
];

/**
 * Mobile-first bottom navigation. Fixed to the viewport bottom, centered
 * within the same max-w-md container as the page content. Active tab uses
 * the Solar Citrus coral primary.
 */
export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const current = location.pathname;

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-md border-t border-border bg-card/95 px-4 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-4px_20px_-8px_oklch(0.62_0.22_260/0.18)] backdrop-blur-md">
        <ul className="flex items-stretch justify-around gap-1">
          {ITEMS.map((item) => {
            const active = current === item.to;
            const Icon = item.icon;
            return (
              <li key={item.to} className="flex-1">
                <button
                  type="button"
                  data-ocid={item.marker}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  onClick={() => navigate({ to: item.to })}
                  className={cn(
                    "flex w-full flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-smooth",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full transition-smooth",
                      active ? "bg-primary/12 shadow-warm" : "bg-transparent",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
                  </span>
                  <span
                    className={cn(
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
