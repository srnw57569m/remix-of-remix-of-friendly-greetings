import type { partialModerationWizardData } from "@/lib/moderation-wizard-schema";

type Form = typeof partialModerationWizardData;

export function ModStepSummary({ form }: { form: Form }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-semibold">Review</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Double-check the config before creating your moderation bot.
        </p>
      </div>
      <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
        <Row k="Type" v="Moderation bot" />
        <Row k="Room ID" v={form.roomId} mono />
        <Row k="Owner" v={form.ownerUsername} />
        <Row k="Welcome messages" v={`${form.welcomeMessages.length} entries`} />
        <Row k="Bye messages" v={`${form.byeMessages.length} entries`} />
        <Row k="Plan" v={form.plan || "—"} />
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{k}</span>
      <span className={mono ? "font-mono text-xs" : "text-sm"}>{v}</span>
    </div>
  );
}
