import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { partialModerationWizardData } from "@/lib/moderation-wizard-schema";

type Form = typeof partialModerationWizardData;

export function ModStep2Owner({
  form,
  update,
}: {
  form: Form;
  update: <K extends keyof Form>(key: K, value: Form[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-semibold">Owner username</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          The Highrise username that owns this bot. They get full control inside the room.
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Owner username</Label>
        <Input
          value={form.ownerUsername}
          onChange={(e) => update("ownerUsername", e.target.value)}
          placeholder="YourUsername"
          className="rounded-xl border-white/10 bg-white/5"
        />
      </div>
    </div>
  );
}
