import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { partialModerationWizardData } from "@/lib/moderation-wizard-schema";

type Form = typeof partialModerationWizardData;

export function ModStep1Basic({
  form,
  update,
}: {
  form: Form;
  update: <K extends keyof Form>(key: K, value: Form[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-semibold">Bot credentials</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Token and Room ID come from your Highrise developer dashboard.
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Bot token</Label>
        <Input
          value={form.botToken}
          onChange={(e) => update("botToken", e.target.value)}
          placeholder="hrise-XXXXXXXXXXXX"
          className="rounded-xl border-white/10 bg-white/5 font-mono"
        />
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Room ID</Label>
        <Input
          value={form.roomId}
          onChange={(e) => update("roomId", e.target.value)}
          placeholder="6512..."
          className="rounded-xl border-white/10 bg-white/5 font-mono"
        />
      </div>
    </div>
  );
}
