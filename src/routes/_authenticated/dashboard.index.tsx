import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  Bot,
  CircleCheck,
  CircleOff,
  CreditCard,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { listBots, setBotStatus } from "@/lib/bots.functions";
import { BotCard, type DashboardBot } from "@/components/dashboard/BotCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { CreateBotWizard } from "@/components/wizard/CreateBotWizard";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "Dashboard — SonicForge" },
      {
        name: "description",
        content: "Manage all your Music Bots from one premium control center.",
      },
    ],
  }),
  component: DashboardHome,
});

type Sort = "newest" | "oldest" | "online" | "offline";

function DashboardHome() {
  const { user } = useAuth();
  const username =
    (user?.user_metadata?.username as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Operator";

  const listBotsFn = useServerFn(listBots);
  const setStatusFn = useServerFn(setBotStatus);
  const qc = useQueryClient();

  const { data: bots = [], isLoading } = useQuery({
    queryKey: ["bots"],
    queryFn: () => listBotsFn(),
  });

  const [wizardOpen, setWizardOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [busy, setBusy] = useState<{ id: string; action: string } | null>(null);

  const stats = useMemo(() => {
    const total = bots.length;
    const online = bots.filter((b: any) => b.status === "Online").length;
    const offline = bots.filter((b: any) => b.status === "Offline").length;
    const active = bots.filter((b: any) => b.subscription_status === "Active").length;
    return { total, online, offline, active };
  }, [bots]);

  const filtered = useMemo(() => {
    let out = bots as DashboardBot[];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (b) =>
          b.bot_name.toLowerCase().includes(q) ||
          b.owner_username.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") out = out.filter((b: any) => b.status === statusFilter);
    out = [...out].sort((a: any, b: any) => {
      if (sort === "newest") return b.created_at.localeCompare(a.created_at);
      if (sort === "oldest") return a.created_at.localeCompare(b.created_at);
      if (sort === "online") return (b.status === "Online" ? 1 : 0) - (a.status === "Online" ? 1 : 0);
      return (b.status === "Offline" ? 1 : 0) - (a.status === "Offline" ? 1 : 0);
    });
    return out;
  }, [bots, search, statusFilter, sort]);

  const statusMutation = useMutation({
    mutationFn: (vars: { botId: string; action: "start" | "stop" | "restart" }) =>
      setStatusFn({ data: vars }),
    onMutate: (v) => setBusy({ id: v.botId, action: v.action }),
    onSuccess: (_d, v) => {
      const label = { start: "started", stop: "stopped", restart: "restarted" }[v.action];
      toast.success(`Bot ${label}`, {
        description: "Live runtime hosting comes with Part 4. Status updated.",
      });
      qc.invalidateQueries({ queryKey: ["bots"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setBusy(null),
  });

  return (
    <main className="relative min-h-screen overflow-hidden pt-28 pb-24">
      <AnimatedBackground />

      <div className="container relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Dashboard</p>
            <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
              Welcome back, <span className="text-gradient">{username}</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Spin up, monitor, and tune every Music Bot in your fleet from one cockpit.
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => setWizardOpen(true)}
            className="group h-12 gap-2 rounded-full px-6 font-semibold glow-primary"
          >
            <Plus className="size-4 transition-transform group-hover:rotate-90" />
            Create Bot
          </Button>
        </motion.div>

        {/* Stats */}
        <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total bots" value={stats.total} icon={Bot} delay={0} />
          <StatCard label="Online" value={stats.online} icon={CircleCheck} accent="emerald" delay={0.05} />
          <StatCard label="Offline" value={stats.offline} icon={CircleOff} accent="rose" delay={0.1} />
          <StatCard
            label="Active subs"
            value={stats.active}
            icon={CreditCard}
            accent="amber"
            delay={0.15}
          />
        </section>

        {/* Filters */}
        <section className="glass mt-10 flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, owner, or ID"
              className="h-10 rounded-xl border-white/10 bg-white/5 pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-[150px] rounded-xl border-white/10 bg-white/5">
                <SlidersHorizontal className="size-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Online">Online</SelectItem>
                <SelectItem value="Offline">Offline</SelectItem>
                <SelectItem value="Starting">Starting</SelectItem>
                <SelectItem value="Error">Error</SelectItem>
                <SelectItem value="Created">Created</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger className="h-10 w-[160px] rounded-xl border-white/10 bg-white/5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="online">Online first</SelectItem>
                <SelectItem value="offline">Offline first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Bots */}
        <section className="mt-8">
          <h2 className="mb-4 font-display text-xl font-semibold">My bots</h2>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass h-48 animate-pulse rounded-3xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState onCreate={() => setWizardOpen(true)} hasBots={bots.length > 0} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((bot, idx) => (
                <BotCard
                  key={bot.id}
                  bot={bot as DashboardBot}
                  busyAction={busy?.id === bot.id ? busy.action : null}
                  onAction={(action) => statusMutation.mutate({ botId: bot.id, action })}
                  delay={idx * 0.04}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <CreateBotWizard
        open={wizardOpen}
        onOpenChange={(o) => {
          setWizardOpen(o);
          if (!o) qc.invalidateQueries({ queryKey: ["bots"] });
        }}
      />
    </main>
  );
}

function EmptyState({ onCreate, hasBots }: { onCreate: () => void; hasBots: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong relative overflow-hidden rounded-3xl p-12 text-center"
    >
      <div className="pointer-events-none absolute inset-0 bg-hero opacity-30" />
      <div className="relative">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/5">
          <Sparkles className="size-6 text-accent" />
        </div>
        <h3 className="mt-4 font-display text-2xl font-semibold">
          {hasBots ? "No bots match your filters" : "Your fleet is empty"}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {hasBots
            ? "Try clearing the search or status filter."
            : "Spin up your first Music Bot with the setup wizard — it takes less than 2 minutes."}
        </p>
        {!hasBots && (
          <Button onClick={onCreate} size="lg" className="mt-6 h-12 gap-2 rounded-full px-6 glow-primary">
            <Plus className="size-4" />
            Create your first bot
          </Button>
        )}
      </div>
    </motion.div>
  );
}
