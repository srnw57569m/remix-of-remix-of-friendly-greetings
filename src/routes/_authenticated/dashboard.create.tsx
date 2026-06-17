import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { CreateBotWizard } from "@/components/wizard/CreateBotWizard";

export const Route = createFileRoute("/_authenticated/dashboard/create")({
  head: () => ({
    meta: [
      { title: "Create Your Music Bot — SonicForge" },
      {
        name: "description",
        content: "Use the setup wizard to generate and deploy your personalized Music Bot.",
      },
    ],
  }),
  component: CreateBotPage,
});

function CreateBotPage() {
  const [open, setOpen] = useState(false);
  return (
    <main className="relative min-h-screen overflow-hidden pt-32">
      <AnimatedBackground />
      <div className="container relative z-10 mx-auto max-w-3xl px-6 pb-24 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-display text-4xl font-bold tracking-tight sm:text-5xl"
        >
          Create Your <span className="text-gradient">Music Bot</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg"
        >
          Use the setup wizard below to generate and deploy your personalized Music Bot.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-12"
        >
          <Button
            size="lg"
            onClick={() => setOpen(true)}
            className="group h-14 gap-2 rounded-full px-10 text-base font-semibold glow-primary"
          >
            <Sparkles className="size-5 transition-transform group-hover:rotate-12" />
            CREATE BOT
          </Button>
        </motion.div>

        <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">
          A short 5-step wizard · Less than 2 minutes
        </p>
      </div>

      <CreateBotWizard open={open} onOpenChange={setOpen} />
    </main>
  );
}
