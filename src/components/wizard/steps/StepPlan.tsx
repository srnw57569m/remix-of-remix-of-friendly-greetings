import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Sparkles, Coins, Check, Link2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { listPlans, getTrialStatus, getWallet } from "@/lib/wallet.functions";
import { getMyProfile } from "@/lib/profile.functions";
import type { partialWizardData, PlanChoice } from "@/lib/wizard-schema";

type Form = typeof partialWizardData;

export function StepPlan({
  form,
  update,
}: {
  form: Form;
  update: <K extends keyof Form>(key: K, value: Form[K]) => void;
}) {
  const listFn = useServerFn(listPlans);
  const trialFn = useServerFn(getTrialStatus);
  const walletFn = useServerFn(getWallet);
  const profileFn = useServerFn(getMyProfile);

  const { data: plans = [] } = useQuery({ queryKey: ["plans", "music"], queryFn: () => listFn({ data: { botType: "music" } }) });
  const { data: trial } = useQuery({ queryKey: ["trial-status"], queryFn: () => trialFn() });
  const { data: wallet } = useQuery({ queryKey: ["wallet-summary"], queryFn: () => walletFn() });
  const { data: profile } = useQuery({ queryKey: ["my-profile"], queryFn: () => profileFn() });

  const trialUsed = trial?.freeTrialUsed ?? false;
  const balance = wallet?.balance ?? 0;
  const highriseLinked = Boolean(profile?.highrise_id);
  const selected = form.plan as PlanChoice | "";

  const pick = (p: PlanChoice) => update("plan", p);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-semibold">Choose a plan</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Your bot is activated immediately after creation. Balance: <span className="text-amber-300 font-mono">{balance}g</span>
        </p>
      </div>

      {balance === 0 && !highriseLinked && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-400/20">
              <Coins className="size-4 text-amber-300" />
            </div>
            <div className="flex-1">
              <p className="font-display text-sm font-semibold text-amber-100">No gold yet?</p>
              <p className="mt-1 text-xs text-amber-100/80">
                Link your Highrise account first, then tip the bot in Highrise with gold —
                the same amount is credited to your wallet here automatically.
              </p>
              <Link
                to="/profile"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1.5 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-400/30"
              >
                <Link2 className="size-3.5" /> Go to profile to link Highrise
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {balance === 0 && highriseLinked && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-xs text-amber-100/90">
          Your Highrise account is linked. Tip the bot in Highrise with gold and the same
          amount will be credited to your wallet here automatically.
        </div>
      )}



      {!trialUsed && (
        <button
          type="button"
          onClick={() => pick("trial")}
          className={cn(
            "relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-all",
            selected === "trial"
              ? "border-accent bg-accent/10 shadow-[0_0_0_3px_oklch(0.62_0.22_250/0.2)]"
              : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
          )}
        >
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent">
              <Sparkles className="size-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-display text-base font-semibold">Free Trial</p>
                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                  One-time
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                24 hours free · auto-deletes when it expires
              </p>
            </div>
            {selected === "trial" && <Check className="size-5 text-accent" />}
          </div>
        </button>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {plans.map((p: any) => {
          const isSelected = selected === p.duration;
          const canAfford = balance >= p.price;
          return (
            <button
              key={p.duration}
              type="button"
              onClick={() => pick(p.duration as PlanChoice)}
              className={cn(
                "flex items-center justify-between rounded-2xl border p-4 text-left transition-all",
                isSelected
                  ? "border-primary bg-primary/10 shadow-[0_0_0_3px_oklch(0.62_0.22_250/0.2)]"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
              )}
            >
              <div>
                <p className="font-display text-sm font-semibold capitalize">{p.label || p.duration}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{p.interval_sql}</p>
                {!canAfford && (
                  <p className="mt-1 text-[10px] text-rose-300">Insufficient balance — top up to activate</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Coins className="size-3.5 text-amber-300" />
                <span className="font-mono text-sm">{p.price}g</span>
                {isSelected && <Check className="size-4 text-primary" />}
              </div>
            </button>
          );
        })}
      </div>

      {trialUsed && (
        <p className="text-xs text-muted-foreground">
          You've already used your free trial. Pick a paid plan above.
        </p>
      )}
      {plans.length === 0 && (
        <p className="text-xs text-muted-foreground">No paid plans available right now.</p>
      )}
    </div>
  );
}
