import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { LayoutDashboard, Users, Bot, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth", search: { mode: "login" } });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .in("role", ["admin", "super_admin"]);
    if (!roles || roles.length === 0) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
    { to: "/admin/users", label: "Users", icon: Users, exact: false },
    { to: "/admin/bots", label: "Bots", icon: Bot, exact: false },
  ];
  return (
    <div className="relative min-h-screen pt-28 pb-24">
      <AnimatedBackground />
      <div className="mx-auto w-full max-w-7xl px-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-red-500/80 to-orange-500/80 shadow-lg shadow-red-500/30">
            <ShieldAlert className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Admin Control</h1>
            <p className="text-sm text-muted-foreground">Platform-wide management and oversight</p>
          </div>
        </div>
        <nav className="glass mb-8 inline-flex rounded-full p-1">
          {tabs.map((t) => {
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to) && t.to !== "/admin";
            const isOverview = t.exact && pathname === "/admin";
            const on = isOverview || active;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm transition-colors ${
                  on ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </Link>
            );
          })}
        </nav>
        <Outlet />
      </div>
    </div>
  );
}