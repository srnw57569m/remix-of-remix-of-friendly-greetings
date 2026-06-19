import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert } from "lucide-react";
import { BeatlyLogo } from "@/components/BeatlyLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

const publicLinks = [
  { to: "/", label: "Home" },
  { to: "/#features", label: "Features" },
  { to: "/#pricing", label: "Pricing" },
] as const;

export function Navbar() {
  const { user, signOut, isAdmin } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hide on auth page for cleaner focus
  if (pathname.startsWith("/auth") || pathname.startsWith("/reset-password")) return null;

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav
        className={`glass-strong flex w-full max-w-5xl items-center justify-between rounded-full px-3 py-2.5 transition-all duration-300 ${
          scrolled ? "shadow-[0_10px_40px_-10px_oklch(0_0_0/0.6)]" : ""
        }`}
      >
        <Link to="/" className="flex items-center gap-2 pl-2">
          <BeatlyLogo size={32} />
          <span className="font-display text-lg font-semibold tracking-tight">
            Beatl<span className="text-gradient">Y</span>
          </span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {user ? (
            <>
              <li>
                <Link
                  to="/dashboard"
                  className="rounded-full px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                  activeProps={{ className: "text-foreground bg-white/5" }}
                  activeOptions={{ exact: true }}
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard/create"
                  className="rounded-full px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                  activeProps={{ className: "text-foreground bg-white/5" }}
                >
                  Create Bot
                </Link>
              </li>
              <li>
                <Link
                  to="/profile"
                  className="rounded-full px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                  activeProps={{ className: "text-foreground bg-white/5" }}
                >
                  Profile
                </Link>
              </li>
              {isAdmin && (
                <li>
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm text-rose-300 transition-colors hover:bg-rose-500/10"
                    activeProps={{ className: "bg-rose-500/10" }}
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Admin
                  </Link>
                </li>
              )}
            </>
          ) : (
            publicLinks.map((l) => (
              <li key={l.to}>
                <a
                  href={l.to}
                  className="rounded-full px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                >
                  {l.label}
                </a>
              </li>
            ))
          )}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {user ? (
            <button
              onClick={signOut}
              className="rounded-full px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          ) : (
            <Link to="/auth" search={{ mode: "login" }} className="hidden rounded-full px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground sm:inline-flex">
              Login
            </Link>
          )}
          {user ? (
            <Link
              to="/dashboard"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-full px-5 py-2 text-sm font-medium text-primary-foreground"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-primary to-accent" />
              <span className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-r from-accent to-primary" />
              <span className="absolute -inset-1 rounded-full bg-primary/50 blur-lg opacity-50 group-hover:opacity-90 transition-opacity" />
              <span className="relative">Dashboard</span>
            </Link>
          ) : (
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-full px-5 py-2 text-sm font-medium text-primary-foreground"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-primary to-accent" />
              <span className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-r from-accent to-primary" />
              <span className="absolute -inset-1 rounded-full bg-primary/50 blur-lg opacity-50 group-hover:opacity-90 transition-opacity" />
              <span className="relative">Sign Up</span>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
