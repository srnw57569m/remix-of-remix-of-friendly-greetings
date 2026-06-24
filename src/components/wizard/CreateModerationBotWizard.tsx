import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Loader2, ShieldCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  moderationWizardSchema,
  partialModerationWizardData,
  type ModerationWizardData,
} from "@/lib/moderation-wizard-schema";
import { createModerationBot, deleteBot } from "@/lib/bots.functions";
import {
  purchaseBotPlan,
  startFreeTrial,
  listPlans,
  getWallet,
  getTrialStatus,
} from "@/lib/wallet.functions";
import { ModStep1Basic } from "./steps/ModStep1Basic";
import { ModStep2Owner } from "./steps/ModStep2Owner";
import { ModStep3Messages } from "./steps/ModStep3Messages";
import { Step4Terms } from "./steps/Step4Terms";
import { StepPlan } from "./steps/StepPlan";
import { ModStepSummary } from "./steps/ModStepSummary";
import { SuccessScreen } from "./SuccessScreen";

const STEPS = ["Basics", "Owner", "Messages", "Terms", "Plan", "Review"] as const;

type CreatedBot = {
  id: string;
  bot_name: string;
  status: string;
  created_at: string;
  storage_path: string;
};

export function CreateModerationBotWizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<typeof partialModerationWizardData>({ ...partialModerationWizardData });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<CreatedBot | null>(null);
  const createFn = useServerFn(createModerationBot);
  const deleteBotFn = useServerFn(deleteBot);
  const purchaseFn = useServerFn(purchaseBotPlan);
  const trialFn = useServerFn(startFreeTrial);
  const listPlansFn = useServerFn(listPlans);
  const walletFn = useServerFn(getWallet);
  const trialStatusFn = useServerFn(getTrialStatus);
  const qc = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ["plans", "moderation"],
    queryFn: () => listPlansFn({ data: { botType: "moderation" } }),
  });
  const { data: wallet } = useQuery({ queryKey: ["wallet-summary"], queryFn: () => walletFn() });
  const { data: trial } = useQuery({ queryKey: ["trial-status"], queryFn: () => trialStatusFn() });

  const balance = wallet?.balance ?? 0;
  const trialUsed = trial?.freeTrialUsed ?? false;
  const selectedPlanPrice =
    form.plan && form.plan !== "trial"
      ? (plans as any[]).find((p) => p.duration === form.plan)?.price ?? 0
      : 0;
  const canAfford =
    form.plan === "trial" ? !trialUsed : form.plan !== "" && balance >= selectedPlanPrice;

  const reset = () => {
    setStep(0);
    setForm({ ...partialModerationWizardData });
    setSubmitting(false);
    setSuccess(null);
  };

  const update = <K extends keyof typeof partialModerationWizardData>(
    key: K,
    value: (typeof partialModerationWizardData)[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const validateStep = (s: number): boolean => {
    switch (s) {
      case 0: return form.botToken.trim().length > 0 && form.roomId.trim().length > 0;
      case 1: return form.ownerUsername.trim().length > 0;
      case 2: return true; // messages optional
      case 3: return form.agreedToTerms === true;
      case 4: return form.plan !== "";
      case 5: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (!validateStep(step)) {
      toast.error("Please complete all required fields.");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    const parsed = moderationWizardSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Invalid input");
      return;
    }
    if (!form.plan) {
      toast.error("Please choose a plan");
      setStep(4);
      return;
    }
    setSubmitting(true);
    let bot: CreatedBot | null = null;
    try {
      bot = (await createFn({ data: parsed.data as ModerationWizardData })) as CreatedBot;
      try {
        if (form.plan === "trial") {
          await trialFn({ data: { botId: bot.id } });
          toast.success("Free 24-hour trial activated");
        } else {
          await purchaseFn({ data: { botId: bot.id, duration: form.plan } });
          toast.success(`Plan activated: ${form.plan}`);
        }
      } catch (planErr) {
        try { await deleteBotFn({ data: { botId: bot.id } }); } catch { /* */ }
        bot = null;
        throw new Error(`Bot creation cancelled: ${(planErr as Error).message}`);
      }
      qc.invalidateQueries({ queryKey: ["trial-status"] });
      qc.invalidateQueries({ queryKey: ["wallet-summary"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["bots"] });
      setSuccess(bot);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create bot");
    } finally {
      setSubmitting(false);
    }
  };

  const close = (next: boolean) => {
    if (submitting) return;
    onOpenChange(next);
    if (!next) reset();
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="glass-strong max-w-2xl border-white/10 p-0 sm:rounded-3xl">
        {success ? (
          <SuccessScreen bot={success} onAnother={reset} onClose={() => close(false)} />
        ) : (
          <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
                  <ShieldCheck className="size-5 text-accent" /> Moderation Bot Wizard
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Step {step + 1} of {STEPS.length} — {STEPS[step]}
                </p>
              </div>
              <button
                onClick={() => close(false)}
                className="rounded-full p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                aria-label="Close wizard"
              >
                <X className="size-4" />
              </button>
            </div>

            <Progress value={((step + 1) / STEPS.length) * 100} className="mb-2 h-1.5" />
            <div className="mb-6 flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
              {STEPS.map((label, i) => (
                <span
                  key={label}
                  className={cn("transition-colors", i <= step ? "text-primary" : "text-muted-foreground/60")}
                >
                  {label}
                </span>
              ))}
            </div>

            <div className="min-h-[280px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.25 }}
                >
                  {step === 0 && <ModStep1Basic form={form} update={update} />}
                  {step === 1 && <ModStep2Owner form={form} update={update} />}
                  {step === 2 && <ModStep3Messages form={form} update={update} />}
                  {step === 3 && <Step4Terms form={form as any} update={update as any} />}
                  {step === 4 && <StepPlan form={form as any} update={update as any} />}
                  {step === 5 && <ModStepSummary form={form} />}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-8 flex justify-between gap-3">
              <Button type="button" variant="ghost" onClick={handleBack} disabled={step === 0 || submitting} className="gap-2">
                <ChevronLeft className="size-4" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={handleNext} disabled={!validateStep(step)} className="gap-2 glow-primary">
                  Next <ChevronRight className="size-4" />
                </Button>
              ) : (
                <div className="flex flex-col items-end gap-2">
                  {!canAfford && form.plan && (
                    <p className="text-xs text-rose-300">Insufficient gold credits for the selected plan.</p>
                  )}
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || !validateStep(3) || !validateStep(4) || !canAfford}
                    className="gap-2 glow-primary"
                  >
                    {submitting ? (
                      <><Loader2 className="size-4 animate-spin" /> Creating…</>
                    ) : ("Create Bot")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
