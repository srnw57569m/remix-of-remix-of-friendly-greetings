import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { partialWizardData } from "@/lib/wizard-schema";

type Form = typeof partialWizardData;

export function Step3Radio({
  form,
  update,
}: {
  form: Form;
  update: <K extends keyof Form>(key: K, value: Form[K]) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="icecastServer">Icecast Server</Label>
        <Input
          id="icecastServer"
          value={form.icecastServer}
          onChange={(e) => update("icecastServer", e.target.value)}
          className="glass mt-2"
        />
      </div>
      <div>
        <Label htmlFor="icecastPort">Icecast Port</Label>
        <Input
          id="icecastPort"
          type="number"
          value={form.icecastPort}
          onChange={(e) => update("icecastPort", Number(e.target.value))}
          className="glass mt-2"
        />
      </div>
      <div>
        <Label htmlFor="mountPoint">Mount Point</Label>
        <Input
          id="mountPoint"
          value={form.mountPoint}
          onChange={(e) => update("mountPoint", e.target.value)}
          className="glass mt-2"
        />
      </div>
      <div>
        <Label htmlFor="icecastUsername">Username</Label>
        <Input
          id="icecastUsername"
          value={form.icecastUsername}
          onChange={(e) => update("icecastUsername", e.target.value)}
          className="glass mt-2"
        />
      </div>
      <div>
        <Label htmlFor="icecastPassword">Password *</Label>
        <Input
          id="icecastPassword"
          type="password"
          value={form.icecastPassword}
          onChange={(e) => update("icecastPassword", e.target.value)}
          placeholder="••••••••"
          className="glass mt-2"
        />
      </div>
    </div>
  );
}
