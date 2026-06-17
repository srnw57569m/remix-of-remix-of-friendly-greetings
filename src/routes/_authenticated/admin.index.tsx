import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Users, Bot, Activity, CircleOff, CreditCard, DollarSign, Cpu, MemoryStick, HardDrive } from "lucide-react";
import { getPlatformStats } from "@/lib/admin.functions";
import { StatCard } from "@/components/dashboard/StatCard";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin Overview — SonicForge" }] }),
  component: AdminOverview,
});

function AdminOverview() {
  const fetchStats = useServerFn(getPlatformStats);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => fetchStats(),
    refetchInterval: 15000,
  });

  const cards = [
    { label: "Total Users", value: data?.totalUsers ?? "—", icon: Users, accent: "primary" as const },
    { label: "Total Bots", value: data?.totalBots ?? "—", icon: Bot, accent: "primary" as const },
    { label: "Running Bots", value: data?.runningBots ?? "—", icon: Activity, accent: "emerald" as const },
    { label: "Offline Bots", value: data?.offlineBots ?? "—", icon: CircleOff, accent: "rose" as const },
    { label: "Active Subs", value: data?.activeSubscriptions ?? "—", icon: CreditCard, accent: "amber" as const },
    { label: "Monthly Revenue", value: `$${data?.monthlyRevenue ?? 0}`, icon: DollarSign, accent: "emerald" as const },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <StatCard key={c.label} label={c.label} value={String(c.value)} icon={c.icon} accent={c.accent} delay={i * 0.05} />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-6"
      >
        <h2 className="mb-6 font-display text-xl font-semibold">Server Health</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <HealthBar label="CPU" value={data?.server.cpu ?? 0} icon={Cpu} color="from-cyan-400 to-blue-500" />
          <HealthBar label="RAM" value={data?.server.ram ?? 0} icon={MemoryStick} color="from-violet-400 to-purple-500" />
          <HealthBar label="Disk" value={data?.server.disk ?? 0} icon={HardDrive} color="from-amber-400 to-orange-500" />
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Active processes: <span className="text-foreground">{data?.server.processes ?? 0}</span>
          {isLoading && " · refreshing…"}
        </p>
      </motion.div>
    </div>
  );
}

function HealthBar({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" /> {label}
        </span>
        <span className="font-mono">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}