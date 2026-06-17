import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Coins, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listPlans, updatePlanPrice, type PlanDuration } from "@/lib/wallet.functions";

export const Route = createFileRoute("/_authenticated/admin/plans")({
  component: AdminPlansPage,
  head: () => ({
    meta: [
      { title: "Plan Pricing — BeatlY Admin" },
      { name: "description", content: "Manage BeatlY subscription plan prices." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function AdminPlansPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPlans);
  const updateFn = useServerFn(updatePlanPrice);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: () => listFn(),
  });

  const [draft, setDraft] = useState<Record<string, number>>({});

  useEffect(() => {
    if (plans) {
      const init: Record<string, number> = {};
      for (const p of plans) init[p.duration] = p.price;
      setDraft(init);
    }
  }, [plans]);

  const mutation = useMutation({
    mutationFn: (vars: { duration: PlanDuration; price: number }) =>
      updateFn({ data: vars }),
    onSuccess: (_d, vars) => {
      toast.success(`${vars.duration} updated to ${vars.price}g`);
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4">
      <div className="glass-strong rounded-3xl p-6">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-amber-300" />
          <h2 className="font-display text-xl font-semibold">Plan prices</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit how much gold each rental duration costs. Changes apply instantly to every user.
        </p>
      </div>

      <div className="glass-strong rounded-3xl p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid gap-3">
            {(plans ?? []).map((p) => {
              const value = draft[p.duration] ?? p.price;
              const changed = value !== p.price;
              return (
                <div
                  key={p.duration}
                  className="flex flex-wrap items-end gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="min-w-[140px]">
                    <p className="font-display text-base capitalize">{p.duration}</p>
                    <p className="text-xs text-muted-foreground">{p.label} · {p.interval_sql}</p>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor={`price-${p.duration}`} className="text-xs uppercase tracking-wider text-muted-foreground">
                      Price (gold)
                    </Label>
                    <Input
                      id={`price-${p.duration}`}
                      type="number"
                      min={0}
                      value={value}
                      onChange={(e) => setDraft((d) => ({ ...d, [p.duration]: Number(e.target.value) }))}
                      className="font-mono"
                    />
                  </div>
                  <Button
                    disabled={!changed || mutation.isPending}
                    onClick={() =>
                      mutation.mutate({
                        duration: p.duration as PlanDuration,
                        price: Math.max(0, Math.floor(value)),
                      })
                    }
                    className="gap-2 rounded-full"
                  >
                    <Save className="h-4 w-4" /> Save
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
