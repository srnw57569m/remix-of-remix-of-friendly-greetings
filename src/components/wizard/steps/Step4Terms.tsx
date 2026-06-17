import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { partialWizardData } from "@/lib/wizard-schema";

type Form = typeof partialWizardData;

export function Step4Terms({
  form,
  update,
}: {
  form: Form;
  update: <K extends keyof Form>(key: K, value: Form[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="glass max-h-56 space-y-3 overflow-y-auto rounded-2xl p-5 text-sm text-muted-foreground">
        <div>
          <h4 className="font-semibold text-foreground">Service Terms</h4>
          <p>
            The platform provides hosting and tooling for your personal music bot. Service is offered
            as-is, without uptime guarantees. We may suspend bots that violate platform rules.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-foreground">User Responsibilities</h4>
          <p>
            You are responsible for the content streamed through your bot, including any music
            licensing requirements in your jurisdiction. Credentials you provide are stored encrypted
            at rest.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-foreground">Hosting Policy</h4>
          <p>
            Each account receives a dedicated workspace. Generated bots may be redeployed,
            restarted, or removed at any time from your dashboard.
          </p>
        </div>
      </div>
      <Label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 p-4 hover:bg-white/[0.03]">
        <Checkbox
          checked={form.agreedToTerms}
          onCheckedChange={(v) => update("agreedToTerms", v === true)}
          className="mt-0.5"
        />
        <span className="text-sm">I agree to the Terms and Conditions.</span>
      </Label>
    </div>
  );
}
