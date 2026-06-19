import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  CircleCheck,
  CircleOff,
  ClipboardCopy,
  CpuIcon,
  Download,
  Loader2,
  MemoryStick,
  Play,
  Power,
  RotateCcw,
  Save,
  Shield,
  Timer,
  Trash2,
  TriangleAlert,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  addBotAdmin,
  deleteBot,
  downloadRequirements,
  getBot,
  getBotRuntime,
  listActivity,
  removeBotAdmin,
  setBotStatus,
  setSubscription,
  updateBotConfig,
} from "@/lib/bots.functions";
import { getWallet, purchaseBotPlan, listPlans, type PlanDuration } from "@/lib/wallet.functions";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/dashboard/bot/$botId")({
  head: ({ params }) => ({
    meta: [
      { title: `Bot ${params.botId.slice(0, 8)} — BeatlY` },
      { name: "description", content: "Music Bot control panel." },
    ],
  }),
  component: BotControlPanel,
});

function BotControlPanel() {
  const { botId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin } = useAuth();

  const getBotFn = useServerFn(getBot);
  const setStatusFn = useServerFn(setBotStatus);
  const updateConfigFn = useServerFn(updateBotConfig);
  const addAdminFn = useServerFn(addBotAdmin);
  const removeAdminFn = useServerFn(removeBotAdmin);
  const setSubFn = useServerFn(setSubscription);
  const deleteBotFn = useServerFn(deleteBot);
  const listActivityFn = useServerFn(listActivity);
  const getRuntimeFn = useServerFn(getBotRuntime);
  const downloadReqFn = useServerFn(downloadRequirements);

  const { data: bot, isLoading, isError, error } = useQuery({
    queryKey: ["bot", botId],
    queryFn: () => getBotFn({ data: { botId } }),
  });

  const { data: activity = [] } = useQuery({
    queryKey: ["bot-activity", botId],
    queryFn: () => listActivityFn({ data: { botId, limit: 30 } }),
  });

  // Live runtime stats + logs from the VPS agent (polled).
  const { data: runtime } = useQuery({
    queryKey: ["bot-runtime", botId],
    queryFn: () => getRuntimeFn({ data: { botId, logLines: 200 } }),
    refetchInterval: 4000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["bot", botId] });
    qc.invalidateQueries({ queryKey: ["bot-activity", botId] });
    qc.invalidateQueries({ queryKey: ["bots"] });
  };

  const statusMutation = useMutation({
    mutationFn: (action: "start" | "stop" | "restart") => setStatusFn({ data: { botId, action } }),
    onSuccess: (_d, action) => {
      toast.success(`Bot ${action}ed`);
      invalidate();
      qc.invalidateQueries({ queryKey: ["bot-runtime", botId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBotFn({ data: { botId } }),
    onSuccess: () => {
      toast.success("Bot deleted");
      qc.invalidateQueries({ queryKey: ["bots"] });
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadReqMutation = useMutation({
    mutationFn: () => downloadReqFn(),
    onSuccess: (data) => {
      const blob = new Blob([data.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "requirements.txt";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("requirements.txt downloaded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <main className="relative min-h-screen overflow-hidden pt-28">
        <AnimatedBackground />
        <div className="container relative z-10 mx-auto max-w-6xl px-6">
          <div className="glass h-40 animate-pulse rounded-3xl" />
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass h-72 animate-pulse rounded-3xl" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (isError || !bot) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <div className="glass-strong max-w-md rounded-3xl p-10 text-center">
          <TriangleAlert className="mx-auto size-8 text-orange-300" />
          <h1 className="mt-3 text-xl font-semibold">Bot not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {(error as Error)?.message ?? "It may have been deleted."}
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </main>
    );
  }

  const created = new Date(bot.created_at).toLocaleString();
  const lastRestart = bot.last_restart_at ? new Date(bot.last_restart_at).toLocaleString() : "—";
  const expires = bot.subscription_expires_at
    ? new Date(bot.subscription_expires_at).toLocaleDateString()
    : "—";
  const admins: string[] = Array.isArray(bot.admins) ? (bot.admins as string[]) : [];

  const adminSuspended = Boolean((bot as any).admin_suspended);
  const adminSuspendReason: string | null = (bot as any).admin_suspended_reason ?? null;
  const rentExpired = Boolean(
    !adminSuspended &&
      (bot.status === "Expired" ||
        bot.status === "Suspended" ||
        bot.subscription_status === "Expired" ||
        (bot.subscription_expires_at && new Date(bot.subscription_expires_at).getTime() < Date.now())),
  );
  const controlsDisabled = adminSuspended || rentExpired;

  return (
    <main className="relative min-h-screen overflow-hidden pt-28 pb-24">
      <AnimatedBackground />

      <div className="container relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong relative overflow-hidden rounded-3xl p-6 sm:p-8"
        >
          <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3" /> Dashboard
              </Link>
              <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{bot.bot_name}</h1>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{bot.id}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={bot.status} />
                <span className="rounded-full border border-border/60 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
                  Owner · {bot.owner_username}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <PrimaryAction
                onClick={() => statusMutation.mutate("start")}
                loading={statusMutation.isPending && statusMutation.variables === "start"}
                disabled={controlsDisabled}
                icon={<Play className="size-4" />}
                label="Start"
                tone="success"
              />
              <PrimaryAction
                onClick={() => statusMutation.mutate("stop")}
                loading={statusMutation.isPending && statusMutation.variables === "stop"}
                disabled={controlsDisabled}
                icon={<Power className="size-4" />}
                label="Stop"
                tone="danger"
              />
              <PrimaryAction
                onClick={() => statusMutation.mutate("restart")}
                loading={statusMutation.isPending && statusMutation.variables === "restart"}
                disabled={controlsDisabled}
                icon={<RotateCcw className="size-4" />}
                label="Restart"
                tone="default"
              />
              <Button
                size="sm"
                variant="secondary"
                className="h-10 gap-2 rounded-full border-white/10 bg-white/5 hover:bg-white/10"
                onClick={() => downloadReqMutation.mutate()}
                disabled={downloadReqMutation.isPending}
              >
                {downloadReqMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                requirements.txt
              </Button>
            </div>
          </div>

          <dl className="relative mt-6 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <Info label="Created" value={created} />
            <Info label="Last restart" value={lastRestart} />
            <Info label="Subscription" value={bot.subscription_status} />
            <Info label="Expires" value={expires} />
          </dl>
        </motion.div>

        {adminSuspended && (
          <div className="glass-strong mt-6 rounded-3xl border border-rose-500/40 p-6">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 size-5 text-rose-300" />
              <div>
                <h3 className="font-display text-lg font-semibold text-rose-300">
                  Bot suspended by administrator
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  You cannot start, stop, or renew this bot until an admin lifts the suspension.
                </p>
                {adminSuspendReason && (
                  <p className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-3 text-sm">
                    <span className="font-semibold text-rose-200">Reason: </span>
                    <span className="text-foreground">{adminSuspendReason}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {rentExpired && (
          <div className="glass-strong mt-6 rounded-3xl border border-amber-500/40 p-6">
            <div className="flex items-start gap-3">
              <Timer className="mt-0.5 size-5 text-amber-300" />
              <div>
                <h3 className="font-display text-lg font-semibold text-amber-200">
                  Rent time finished
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your bot has been suspended because the subscription expired. Pick a plan below
                  with your gold to renew and bring it back online — your configuration is kept.
                </p>
              </div>
            </div>
          </div>
        )}



        {/* Monitoring + Console */}
        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <MetricCard
            icon={<CpuIcon className="size-4" />}
            label="CPU usage"
            value={Math.round(runtime?.cpu ?? 0)}
            unit="%"
          />
          <MetricCard
            icon={<MemoryStick className="size-4" />}
            label="RAM usage"
            value={Math.round(runtime?.memoryMB ?? 0)}
            unit="MB"
          />
          <UptimeCard
            since={
              runtime?.uptime
                ? new Date(runtime.uptime).toISOString()
                : (bot.last_restart_at ?? bot.created_at)
            }
            live={runtime?.status === "Online"}
          />
        </section>

        <LiveConsole
          botId={botId}
          status={runtime?.status ?? bot.status}
          logs={runtime?.logs ?? ""}
          configured={runtime?.configured ?? false}
        />

        {/* Configuration grids */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <ConfigCard
            botId={botId}
            initial={{ ownerUsername: bot.owner_username }}
            title="Owner"
            description="Change the in-game owner username for this bot."
            updateConfigFn={updateConfigFn}
            onSuccess={invalidate}
            locked={controlsDisabled}
            lockReason={adminSuspended ? "Editing locked while bot is admin-suspended." : "Renew your plan to edit this bot."}
            fields={[{ key: "ownerUsername", label: "Owner username", placeholder: "OwnerName" }]}
          />

          <ConfigCard
            botId={botId}
            initial={{
              icecastServer: bot.icecast_server,
              icecastPort: String(bot.icecast_port),
              mountPoint: bot.mount_point,
              icecastUsername: bot.icecast_username,
              icecastPassword: "",
            }}
            title="Stream configuration"
            description="Icecast credentials embedded in config.json."
            updateConfigFn={updateConfigFn}
            onSuccess={invalidate}
            locked={controlsDisabled}
            lockReason={adminSuspended ? "Editing locked while bot is admin-suspended." : "Renew your plan to edit this bot."}
            fields={[
              { key: "icecastServer", label: "Icecast server" },
              { key: "icecastPort", label: "Port", type: "number" },
              { key: "mountPoint", label: "Mount point" },
              { key: "icecastUsername", label: "Username" },
              { key: "icecastPassword", label: "Password", type: "password", placeholder: "Leave blank to keep current" },
            ]}
          />

          <AdminsCard
            botId={botId}
            admins={admins}
            addAdminFn={addAdminFn}
            removeAdminFn={removeAdminFn}
            onChange={invalidate}
            locked={controlsDisabled}
            lockReason={adminSuspended ? "Editing locked while bot is admin-suspended." : "Renew your plan to manage admins."}
          />

          <SubscriptionCard
            botId={botId}
            status={bot.subscription_status}
            expiresAt={bot.subscription_expires_at ?? null}
            setSubFn={setSubFn}
            onChange={invalidate}
            canManage={isAdmin}
          />

          <PlansCard botId={botId} onChange={invalidate} locked={adminSuspended} highlight={rentExpired} />
        </div>

        {/* Activity */}
        <section className="glass-strong mt-8 rounded-3xl p-6">
          <h3 className="font-display text-lg font-semibold">Activity log</h3>
          <ul className="mt-4 divide-y divide-white/5">
            {activity.length === 0 && (
              <li className="py-3 text-sm text-muted-foreground">No activity yet.</li>
            )}
            {activity.map((a: any) => (
              <li key={a.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <span className="font-mono text-xs text-accent">{a.action}</span>
                  {a.detail && <span className="ml-2 text-muted-foreground">{a.detail}</span>}
                </div>
                <time className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        </section>

        {/* Danger zone */}
        <section className="glass mt-8 flex flex-col items-start justify-between gap-3 rounded-3xl border border-rose-500/30 p-6 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-display text-lg font-semibold text-rose-300">Delete bot</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Permanently removes all generated files and database records. This cannot be undone.
            </p>
          </div>
          <DeleteBotDialog
            onConfirm={() => deleteMutation.mutate()}
            loading={deleteMutation.isPending}
            name={bot.bot_name}
          />
        </section>
      </div>
    </main>
  );
}

// ----------------------------- pieces -----------------------------

function PrimaryAction({
  onClick,
  loading,
  disabled,
  icon,
  label,
  tone,
}: {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  tone: "default" | "success" | "danger";
}) {
  const cls = {
    default: "from-primary/80 to-accent/70",
    success: "from-emerald-500/80 to-emerald-400/70",
    danger: "from-rose-500/80 to-rose-400/70",
  }[tone];
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`group inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-gradient-to-br ${cls} px-4 text-sm font-medium text-foreground transition-all hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium">{value}</dd>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="glass-strong rounded-3xl p-5">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          {icon}
          {label}
        </span>
        <span>{unit}</span>
      </div>
      <p className="mt-3 font-display text-4xl font-bold">{value}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-700"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function UptimeCard({ since, live }: { since: string; live: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [live]);
  const ms = live ? Math.max(0, now - new Date(since).getTime()) : 0;
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return (
    <div className="glass-strong rounded-3xl p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Timer className="size-4" /> Uptime
      </div>
      <p className="mt-3 font-display text-3xl font-bold">
        {live ? `${d}d ${h}h ${m}m ${s}s` : "—"}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {live ? "Counting from last restart" : "Bot is offline"}
      </p>
    </div>
  );
}

function LiveConsole({
  botId,
  status,
  logs,
  configured,
}: {
  botId: string;
  status: string;
  logs: string;
  configured: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const lines = logs ? logs.split("\n") : [];

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  return (
    <section className="glass-strong mt-6 rounded-3xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-semibold">Live console</h3>
          <p className="text-xs text-muted-foreground">
            {configured
              ? `Live pm2 output · bot-${botId.slice(0, 8)} · ${status}`
              : "VPS agent not configured — set VPS_AGENT_URL and VPS_AGENT_SECRET to see live logs."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full border-white/10 bg-white/5"
            onClick={() => {
              navigator.clipboard.writeText(logs);
              toast.success("Logs copied");
            }}
          >
            <ClipboardCopy className="mr-1.5 size-3.5" /> Copy
          </Button>
        </div>
      </div>
      <div
        ref={boxRef}
        className="mt-4 h-64 overflow-y-auto rounded-2xl border border-white/10 bg-black/60 p-4 font-mono text-xs leading-relaxed text-emerald-200/90"
      >
        {lines.length === 0 ? (
          <div className="text-muted-foreground">
            {configured ? "No output yet." : "Waiting for VPS agent…"}
          </div>
        ) : (
          lines.map((l, i) => <div key={i}>{l}</div>)
        )}
      </div>
    </section>
  );
}

type ConfigField = {
  key: string;
  label: string;
  placeholder?: string;
  type?: string;
};

function ConfigCard({
  botId,
  title,
  description,
  fields,
  initial,
  updateConfigFn,
  onSuccess,
  locked = false,
  lockReason,
}: {
  botId: string;
  title: string;
  description: string;
  fields: ConfigField[];
  initial: Record<string, string>;
  updateConfigFn: (args: any) => Promise<any>;
  onSuccess: () => void;
  locked?: boolean;
  lockReason?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      updateConfigFn({ data: { botId, ...data } as never }),
    onSuccess: () => {
      toast.success(`${title} saved`);
      onSuccess();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSave = () => {
    const data: Record<string, unknown> = {};
    for (const f of fields) {
      const v = values[f.key];
      if (v === undefined || v === "") continue;
      if (f.type === "number") data[f.key] = Number(v);
      else data[f.key] = v;
    }
    if (Object.keys(data).length === 0) {
      toast.info("Nothing to save");
      return;
    }
    mutation.mutate(data);
  };

  return (
    <div className="glass-strong rounded-3xl p-6">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {locked && lockReason && (
        <p className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-200">
          {lockReason}
        </p>
      )}
      <div className="mt-4 grid gap-3">
        {fields.map((f) => (
          <div key={f.key} className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {f.label}
            </Label>
            <Input
              value={values[f.key] ?? ""}
              type={f.type ?? "text"}
              placeholder={f.placeholder}
              disabled={locked}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              className="rounded-xl border-white/10 bg-white/5 disabled:opacity-50"
            />
          </div>
        ))}
      </div>
      <Button
        onClick={handleSave}
        disabled={mutation.isPending || locked}
        className="mt-5 w-full gap-2 rounded-xl glow-primary"
      >
        {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Save changes
      </Button>
    </div>
  );
}

function AdminsCard({
  botId,
  admins,
  addAdminFn,
  removeAdminFn,
  onChange,
  locked = false,
  lockReason,
}: {
  botId: string;
  admins: string[];
  addAdminFn: (args: any) => Promise<any>;
  removeAdminFn: (args: any) => Promise<any>;
  onChange: () => void;
  locked?: boolean;
  lockReason?: string;
}) {
  const [username, setUsername] = useState("");
  const addM = useMutation({
    mutationFn: (u: string) => addAdminFn({ data: { botId, username: u } }),
    onSuccess: () => {
      toast.success("Admin added");
      setUsername("");
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeM = useMutation({
    mutationFn: (u: string) => removeAdminFn({ data: { botId, username: u } }),
    onSuccess: () => {
      toast.success("Admin removed");
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass-strong rounded-3xl p-6">
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
        <Shield className="size-4 text-accent" /> Admins
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Usernames that can issue admin commands inside the bot.
      </p>
      {locked && lockReason && (
        <p className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-200">
          {lockReason}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <Input
          value={username}
          disabled={locked}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="rounded-xl border-white/10 bg-white/5 disabled:opacity-50"
        />
        <Button
          onClick={() => username.trim() && addM.mutate(username.trim())}
          disabled={locked || addM.isPending || !username.trim()}
          className="rounded-xl"
        >
          {addM.isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
        </Button>
      </div>
      <ul className="mt-4 flex flex-wrap gap-2">
        {admins.length === 0 && (
          <li className="text-sm text-muted-foreground">No admins yet.</li>
        )}
        {admins.map((u) => (
          <li
            key={u}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-3 pr-1 text-sm"
          >
            {u}
            <button
              onClick={() => removeM.mutate(u)}
              disabled={locked || removeM.isPending}
              className="grid size-6 place-items-center rounded-full bg-rose-500/20 text-rose-200 transition hover:bg-rose-500/40 disabled:opacity-50"
              aria-label={`Remove ${u}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SubscriptionCard({
  botId,
  status,
  expiresAt,
  setSubFn,
  onChange,
  canManage,
}: {
  botId: string;
  status: string;
  expiresAt: string | null;
  setSubFn: (args: any) => Promise<any>;
  onChange: () => void;
  canManage: boolean;
}) {
  const mutation = useMutation({
    mutationFn: (action: "activate" | "disable") => setSubFn({ data: { botId, action } }),
    onSuccess: (_d, action) => {
      toast.success(action === "activate" ? "Subscription activated" : "Subscription disabled");
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const active = status === "Active";
  return (
    <div className="glass-strong rounded-3xl p-6">
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
        <Calendar className="size-4 text-accent" /> Subscription
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {canManage
          ? "Toggle premium features and renewal for this bot."
          : "View your current subscription status."}
      </p>
      <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Status</p>
          <p className={`mt-1 font-display text-2xl ${active ? "text-emerald-300" : "text-muted-foreground"}`}>
            {status}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Expires {expiresAt ? new Date(expiresAt).toLocaleDateString() : "—"}
          </p>
        </div>
        {canManage && (
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              disabled={active || mutation.isPending}
              onClick={() => mutation.mutate("activate")}
              className="rounded-full bg-emerald-500/80 hover:bg-emerald-500"
            >
              <CircleCheck className="mr-1.5 size-4" /> Activate
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!active || mutation.isPending}
              onClick={() => mutation.mutate("disable")}
              className="rounded-full border-white/10 bg-white/5"
            >
              <CircleOff className="mr-1.5 size-4" /> Disable
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function PlansCard({
  botId,
  onChange,
  locked = false,
  highlight = false,
}: {
  botId: string;
  onChange: () => void;
  locked?: boolean;
  highlight?: boolean;
}) {
  const qc = useQueryClient();
  const getWalletFn = useServerFn(getWallet);
  const purchaseFn = useServerFn(purchaseBotPlan);
  const listPlansFn = useServerFn(listPlans);
  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => getWalletFn(),
  });
  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: () => listPlansFn(),
  });
  const mutation = useMutation({
    mutationFn: (duration: PlanDuration) => purchaseFn({ data: { botId, duration } }),
    onSuccess: (res) => {
      toast.success(`Plan activated · ${res.balanceAfter}g left`);
      qc.invalidateQueries({ queryKey: ["wallet"] });
      onChange();
      setPending(null);
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setPending(null);
    },
  });
  const balance = wallet?.balance ?? 0;
  const [pending, setPending] = useState<{ duration: PlanDuration; label: string; price: number } | null>(null);

  return (
    <div className={`glass-strong rounded-3xl p-6 ${highlight ? "border border-amber-500/40" : ""}`}>
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
        <Timer className="size-4 text-accent" /> {highlight ? "Renew to resume bot" : "Rent this bot"}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Pay with in-game gold. Wallet balance: <span className="font-mono text-foreground">{balance}g</span>
      </p>
      {locked && (
        <p className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-200">
          Renewals are disabled while the bot is suspended by an administrator.
        </p>
      )}
      <div className="mt-4 grid gap-2">
        {(plans ?? []).map((p) => {
          const canAfford = balance >= p.price;
          return (
            <button
              key={p.duration}
              disabled={locked || !canAfford || mutation.isPending}
              onClick={() => setPending({ duration: p.duration as PlanDuration, label: p.label, price: p.price })}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="font-medium">{p.label}</span>
              <span className="font-mono text-xs text-accent">{p.price}g</span>
            </button>
          );
        })}
      </div>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && !mutation.isPending && setPending(null)}>
        <AlertDialogContent className="glass-strong border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm renewal</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  Are you sure you want to spend{" "}
                  <span className="font-mono font-semibold text-amber-300">{pending?.price}g</span> for{" "}
                  <span className="font-semibold text-foreground">{pending?.label}</span> of bot rent?
                </p>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current balance</span>
                    <span className="font-mono">{balance}g</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span className="text-muted-foreground">After purchase</span>
                    <span className="font-mono text-emerald-300">{balance - (pending?.price ?? 0)}g</span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" disabled={mutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={mutation.isPending}
              onClick={() => pending && mutation.mutate(pending.duration)}
              className="rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
            >
              {mutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Confirm — Pay {pending?.price}g
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </div>
  );
}

function DeleteBotDialog({
  onConfirm,
  loading,
  name,
}: {
  onConfirm: () => void;
  loading: boolean;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        variant="destructive"
        onClick={() => setOpen(true)}
        className="gap-2 rounded-full"
      >
        <Trash2 className="size-4" /> Delete bot
      </Button>
      <AlertDialogContent className="glass-strong border-rose-500/30">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes every generated file and the database record. There's no recovery.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Yes, delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Deterministic mock per bot id so values feel stable across rerenders
function simulate(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const minute = Math.floor(Date.now() / 5000);
  h = (h ^ minute) >>> 0;
  return min + (h % (max - min));
}
