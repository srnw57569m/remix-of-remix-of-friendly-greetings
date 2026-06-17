import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Bot = {
  id: string;
  bot_name: string;
  status: string;
  created_at: string;
};

export function SuccessScreen({
  bot,
  onAnother,
  onClose,
}: {
  bot: Bot;
  onAnother: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="p-10 text-center"
    >
      <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-primary/15 glow-primary">
        <CheckCircle2 className="size-10 text-primary" />
      </div>
      <h2 className="font-display text-2xl font-semibold">
        Your Music Bot has been created successfully
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {bot.bot_name} is ready. You can manage it from your dashboard.
      </p>

      <div className="glass mx-auto mt-6 max-w-md rounded-2xl p-5 text-left text-sm">
        <div className="flex justify-between border-b border-white/5 py-1.5">
          <span className="text-muted-foreground">Bot ID</span>
          <span className="truncate font-mono text-xs">{bot.id}</span>
        </div>
        <div className="flex justify-between border-b border-white/5 py-1.5">
          <span className="text-muted-foreground">Created</span>
          <span>{new Date(bot.created_at).toLocaleString()}</span>
        </div>
        <div className="flex justify-between py-1.5">
          <span className="text-muted-foreground">Status</span>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
            {bot.status}
          </span>
        </div>
      </div>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button onClick={onClose} variant="ghost">
          Open Dashboard
        </Button>
        <Button onClick={onAnother} className="glow-primary">
          Create Another Bot
        </Button>
      </div>
    </motion.div>
  );
}
