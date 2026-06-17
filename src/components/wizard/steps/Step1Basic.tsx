import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { partialWizardData } from "@/lib/wizard-schema";

type Form = typeof partialWizardData;

export function Step1Basic({
  form,
  update,
}: {
  form: Form;
  update: <K extends keyof Form>(key: K, value: Form[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="botToken">Bot Token *</Label>
        <Input
          id="botToken"
          value={form.botToken}
          onChange={(e) => update("botToken", e.target.value)}
          placeholder="Paste your bot token"
          className="glass mt-2"
        />
      </div>
      <div>
        <Label htmlFor="roomId">Room ID *</Label>
        <Input
          id="roomId"
          value={form.roomId}
          onChange={(e) => update("roomId", e.target.value)}
          placeholder="The room where the bot will live"
          className="glass mt-2"
        />
      </div>
    </div>
  );
}
