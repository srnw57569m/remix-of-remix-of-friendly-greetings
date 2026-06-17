import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Loader2, Play, Power, RotateCcw, Settings2 } from "lucide-react";
import { StatusBadge, type BotStatus } from "./StatusBadge";
import { Button } from "@/components/ui/button";

export type DashboardBot = {
  id: string;
  bot_name: string;
  status: BotStatus;
  owner_username: string;
  created_at: string;
  subscription_status?: string | null;
};

export function BotCard({
  bot,
  busyAction,
  onAction,
  delay = 0,
}: {
  bot: DashboardBot;
  busyAction: string | null;
  onAction: (action: "start" | "stop" | "restart") => void;
  delay?: number;
}) {
  const created = new Date(bot.created_at).toLocaleString();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4 }}
      className="glass-strong group relative overflow-hidden rounded-3xl p-6"
    >
      <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold">{bot.bot_name}</h3>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            ID {bot.id.slice(0, 8)}…{bot.id.slice(-4)}
          </p>
        </div>
        <StatusBadge status={bot.status} />
      </div>

      <dl className="relative mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Owner</dt>
          <dd className="mt-1 truncate font-medium">{bot.owner_username}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Created</dt>
          <dd className="mt-1 truncate">{created}</dd>
        </div>
      </dl>

      <div className="relative mt-6 grid grid-cols-4 gap-2">
        <ActionButton
          label="Start"
          icon={<Play className="size-4" />}
          loading={busyAction === "start"}
          disabled={!!busyAction}
          onClick={() => onAction("start")}
          variant="success"
        />
        <ActionButton
          label="Stop"
          icon={<Power className="size-4" />}
          loading={busyAction === "stop"}
          disabled={!!busyAction}
          onClick={() => onAction("stop")}
          variant="danger"
        />
        <ActionButton
          label="Restart"
          icon={<RotateCcw className="size-4" />}
          loading={busyAction === "restart"}
          disabled={!!busyAction}
          onClick={() => onAction("restart")}
          variant="default"
        />
        <Button
          asChild
          size="sm"
          variant="secondary"
          className="h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
        >
          <Link to="/dashboard/bot/$botId" params={{ botId: bot.id }} aria-label="Open control panel">
            <Settings2 className="size-4" />
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}

function ActionButton({
  label,
  icon,
  loading,
  disabled,
  onClick,
  variant,
}: {
  label: string;
  icon: React.ReactNode;
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
  variant: "default" | "success" | "danger";
}) {
  const variantClass = {
    default: "from-primary/80 to-accent/70 shadow-[0_0_22px_-6px_oklch(0.62_0.22_250_/_0.7)]",
    success: "from-emerald-500/80 to-emerald-400/70 shadow-[0_0_22px_-6px_oklch(0.7_0.18_150_/_0.7)]",
    danger: "from-rose-500/80 to-rose-400/70 shadow-[0_0_22px_-6px_oklch(0.65_0.24_25_/_0.6)]",
  }[variant];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      className={`group/btn relative grid h-10 place-items-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${variantClass} text-foreground transition-all hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      <span className="sr-only">{label}</span>
    </button>
  );
}
