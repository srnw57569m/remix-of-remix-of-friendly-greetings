import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "primary",
  delay = 0,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "primary" | "emerald" | "rose" | "amber";
  delay?: number;
}) {
  const ring: Record<string, string> = {
    primary: "from-primary/40 to-accent/30",
    emerald: "from-emerald-500/40 to-emerald-300/20",
    rose: "from-rose-500/40 to-rose-300/20",
    amber: "from-amber-500/40 to-amber-300/20",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -3 }}
      className="glass-strong relative overflow-hidden rounded-3xl p-5"
    >
      <div
        className={`pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-gradient-to-br ${ring[accent]} blur-2xl`}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold">{value}</p>
        </div>
        <div className="grid size-10 place-items-center rounded-2xl border border-white/10 bg-white/5">
          <Icon className="size-5 text-foreground/80" />
        </div>
      </div>
    </motion.div>
  );
}
