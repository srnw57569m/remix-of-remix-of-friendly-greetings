import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { partialWizardData } from "@/lib/wizard-schema";

type Form = typeof partialWizardData;

export function Step2Owner({
  form,
  update,
}: {
  form: Form;
  update: <K extends keyof Form>(key: K, value: Form[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="ownerUsername">Room Owner Username *</Label>
        <Input
          id="ownerUsername"
          value={form.ownerUsername}
          onChange={(e) => update("ownerUsername", e.target.value)}
          placeholder="Username of the room owner"
          className="glass mt-2"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          The bot will recognise this user as the owner and grant elevated permissions.
        </p>
      </div>
    </div>
  );
}
