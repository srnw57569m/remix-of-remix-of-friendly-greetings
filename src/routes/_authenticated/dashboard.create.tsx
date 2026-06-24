import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Music2, ShieldCheck, Sparkles } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { CreateBotWizard } from "@/components/wizard/CreateBotWizard";
import { CreateModerationBotWizard } from "@/components/wizard/CreateModerationBotWizard";

export const Route = createFileRoute("/_authenticated/dashboard/create")({
  head: () => ({
    meta: [
      { title: "Create a Bot — BeatlY" },
      {
        name: "description",
        content: "Pick a bot type and run the setup wizard to deploy your bot.",
      },
    ],
  }),
  component: CreateBotPage,
});

type BotType = "music" | "moderation" | null;

function CreateBotPage() {
  const [opened, setOpened] = useState<BotType>(null);

  return (
    <main className="relative min-h-screen overflow-hidden pt-32">
      <AnimatedBackground />
      <div className="container relative z-10 mx-auto max-w-5xl px-6 pb-24 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-display text-4xl font-bold tracking-tight sm:text-5xl"
        >
          Create a <span className="text-gradient">Bot</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg"
        >
          Choose the type of bot to deploy. Each one runs the same lifecycle —
          create, rent with gold, renew anytime.
        </motion.p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <TypeCard
            tone="primary"
            icon={<Music2 className="size-7 text-primary-foreground" />}
            badge="Music"
            title="Music Bot"
            desc="Plays a live Icecast stream inside your room with a full DJ queue, tips, and admin controls."
            cta="Create music bot"
            onClick={() => setOpened("music")}
          />
          <TypeCard
            tone="accent"
            icon={<ShieldCheck className="size-7 text-primary-foreground" />}
            badge="Moderation"
            title="Moderation Bot"
            desc="Keeps your room tidy with welcome and leave messages, admin commands, kicks, mutes, and warnings."
            cta="Create moderation bot"
            onClick={() => setOpened("moderation")}
          />
        </div>

        <p className="mt-8 text-xs uppercase tracking-widest text-muted-foreground">
          <Sparkles className="mr-1 inline size-3" />
          Short guided wizard · Less than 2 minutes
        </p>
      </div>

      <CreateBotWizard open={opened === "music"} onOpenChange={(o) => setOpened(o ? "music" : null)} />
      <CreateModerationBotWizard open={opened === "moderation"} onOpenChange={(o) => setOpened(o ? "moderation" : null)} />
    </main>
  );
}

function TypeCard({
  tone,
  icon,
  badge,
  title,
  desc,
  cta,
  onClick,
}: {
  tone: "primary" | "accent";
  icon: React.ReactNode;
  badge: string;
  title: string;
  desc: string;
  cta: string;
  onClick: () => void;
}) {
  const grad = tone === "primary"
    ? "from-primary to-accent"
    : "from-accent to-primary";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.99 }}
      className="glass-strong group relative overflow-hidden rounded-3xl border border-white/10 p-8 text-left transition-all"
    >
      <div className={`pointer-events-none absolute -top-20 -right-20 size-56 rounded-full bg-gradient-to-br ${grad} opacity-30 blur-3xl`} />
      <div className="relative flex items-start gap-4">
        <div className={`grid size-14 place-items-center rounded-2xl bg-gradient-to-br ${grad}`}>
          {icon}
        </div>
        <div className="flex-1">
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {badge}
          </span>
          <h3 className="mt-2 font-display text-2xl font-bold">{title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
          <p className="mt-5 inline-flex items-center gap-2 font-semibold text-primary group-hover:text-accent">
            {cta} →
          </p>
        </div>
      </div>
    </motion.button>
  );
}
