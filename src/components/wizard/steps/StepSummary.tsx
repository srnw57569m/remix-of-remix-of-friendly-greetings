import type { partialWizardData } from "@/lib/wizard-schema";

type Form = typeof partialWizardData;

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium text-foreground">{value}</span>
    </div>
  );
}

export function StepSummary({ form }: { form: Form }) {
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="mb-3 font-display text-lg font-semibold">Review configuration</h3>
      <Row label="Bot Token" value={"••••" + form.botToken.slice(-4)} />
      <Row label="Room ID" value={form.roomId} />
      <Row label="Owner Username" value={form.ownerUsername} />
      <Row label="Icecast Server" value={form.icecastServer} />
      <Row label="Icecast Port" value={form.icecastPort} />
      <Row label="Mount Point" value={form.mountPoint} />
      <Row label="Icecast Username" value={form.icecastUsername} />
      <Row label="Icecast Password" value={"•".repeat(Math.min(form.icecastPassword.length, 10))} />
      <Row label="Plan" value={form.plan === "trial" ? "Free Trial (24h)" : (form.plan || "—")} />
    </div>
  );
}

