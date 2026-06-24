import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { partialModerationWizardData } from "@/lib/moderation-wizard-schema";

type Form = typeof partialModerationWizardData;

export function ModStep3Messages({
  form,
  update,
}: {
  form: Form;
  update: <K extends keyof Form>(key: K, value: Form[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-lg font-semibold">Welcome & leave messages</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Each entry will be sent randomly when a player joins or leaves the room.
          Use <code className="rounded bg-white/10 px-1">@{`{user}`}</code> to mention them.
        </p>
      </div>
      <MessageList
        title="Welcome messages"
        placeholder="Welcome @{user} to our room!"
        values={form.welcomeMessages}
        onChange={(v) => update("welcomeMessages", v)}
      />
      <MessageList
        title="Leave messages"
        placeholder="Goodbye @{user}, see you soon!"
        values={form.byeMessages}
        onChange={(v) => update("byeMessages", v)}
      />
    </div>
  );
}

function MessageList({
  title,
  placeholder,
  values,
  onChange,
}: {
  title: string;
  placeholder: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...values, v]);
    setDraft("");
  };
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="font-display text-sm font-semibold">{title}</p>
      <div className="mt-3 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="rounded-xl border-white/10 bg-white/5"
        />
        <Button type="button" onClick={add} className="rounded-xl">
          <Plus className="size-4" />
        </Button>
      </div>
      <ul className="mt-3 flex flex-col gap-1.5">
        {values.length === 0 && (
          <li className="text-xs text-muted-foreground">No messages yet — add at least one.</li>
        )}
        {values.map((m, i) => (
          <li
            key={`${i}-${m}`}
            className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
          >
            <span className="truncate">{m}</span>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Remove"
              className="grid size-6 place-items-center rounded-full bg-rose-500/20 text-rose-200 hover:bg-rose-500/40"
            >
              <X className="size-3" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
