import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

/**
 * Mobile-first app shell.
 *
 * Centers content in a max-w-md column (phone-width), gives the page room
 * to scroll, and pins the BottomNav to the viewport bottom. The bottom
 * padding clears the nav so page content never hides behind it.
 */
export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-6 sm:pt-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
