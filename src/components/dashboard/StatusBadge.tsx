import { cn } from "@/lib/utils";

export type BotStatus = "Online" | "Offline" | "Starting" | "Error" | "Created" | string;

const styles: Record<string, { dot: string; ring: string; text: string }> = {
  Online: {
    dot: "bg-emerald-400",
    ring: "shadow-[0_0_18px_-2px_oklch(0.78_0.18_150)]",
    text: "text-emerald-300",
  },
  Offline: {
    dot: "bg-rose-400",
    ring: "shadow-[0_0_18px_-2px_oklch(0.65_0.24_25)]",
    text: "text-rose-300",
  },
  Starting: {
    dot: "bg-sky-400 animate-pulse",
    ring: "shadow-[0_0_18px_-2px_oklch(0.7_0.2_240)]",
    text: "text-sky-300",
  },
  Error: {
    dot: "bg-orange-400",
    ring: "shadow-[0_0_18px_-2px_oklch(0.75_0.18_55)]",
    text: "text-orange-300",
  },
  Created: {
    dot: "bg-slate-400",
    ring: "shadow-[0_0_14px_-4px_oklch(0.8_0_0)]",
    text: "text-slate-300",
  },
};

export function StatusBadge({ status, className }: { status: BotStatus; className?: string }) {
  const s = styles[status] ?? styles.Created;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider",
        s.text,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot, s.ring)} />
      {status}
    </span>
  );
}
