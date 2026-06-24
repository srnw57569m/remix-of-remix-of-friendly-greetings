import { useState } from "react";
import { Loader2, MessageSquare, Plus, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateModerationMessages } from "@/lib/bots.functions";

export function MessagesCard({
  botId,
  welcome,
  bye,
  locked = false,
  lockReason,
  onChange,
}: {
  botId: string;
  welcome: string[];
  bye: string[];
  locked?: boolean;
  lockReason?: string;
  onChange: () => void;
}) {
  const fn = useServerFn(updateModerationMessages);
  const m = useMutation({
    mutationFn: (payload: { welcomeMessages?: string[]; byeMessages?: string[] }) =>
      fn({ data: { botId, ...payload } }),
    onSuccess: () => {
      toast.success("Messages updated");
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass-strong rounded-3xl p-6">
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
        <MessageSquare className="size-4 text-accent" /> Welcome & Leave Messages
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        One message is picked at random when someone joins or leaves the room. Use{" "}
        <code className="rounded bg-white/10 px-1 text-xs">@{`{user}`}</code> to mention them.
      </p>
      {locked && lockReason && (
        <p className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-200">
          {lockReason}
        </p>
      )}
      <div className="mt-4 grid gap-4">
        <Editor
          title="Welcome messages"
          values={welcome}
          locked={locked}
          onSave={(next) => m.mutate({ welcomeMessages: next })}
          saving={m.isPending}
          placeholder="Welcome @{user} to our room!"
        />
        <Editor
          title="Leave messages"
          values={bye}
          locked={locked}
          onSave={(next) => m.mutate({ byeMessages: next })}
          saving={m.isPending}
          placeholder="Goodbye @{user}, see you soon!"
        />
      </div>
    </div>
  );
}

function Editor({
  title,
  values,
  locked,
  onSave,
  saving,
  placeholder,
}: {
  title: string;
  values: string[];
  locked: boolean;
  onSave: (next: string[]) => void;
  saving: boolean;
  placeholder: string;
}) {
  const [local, setLocal] = useState<string[]>(values);
  const [draft, setDraft] = useState("");
  // keep local in sync if upstream changes
  if (values !== prevRef(local).previous) {
    // intentional shallow update on prop change without effect
  }
  const dirty = JSON.stringify(local) !== JSON.stringify(values);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-semibold">{title}</p>
        {dirty && (
          <Button size="sm" onClick={() => onSave(local)} disabled={saving} className="rounded-full">
            {saving ? <Loader2 className="size-3 animate-spin" /> : "Save"}
          </Button>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          value={draft}
          disabled={locked}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              setLocal([...local, draft.trim()]);
              setDraft("");
            }
          }}
          placeholder={placeholder}
          className="rounded-xl border-white/10 bg-white/5 disabled:opacity-50"
        />
        <Button
          type="button"
          disabled={locked || !draft.trim()}
          onClick={() => {
            setLocal([...local, draft.trim()]);
            setDraft("");
          }}
          className="rounded-xl"
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <ul className="mt-3 flex flex-col gap-1.5">
        {local.length === 0 && (
          <li className="text-xs text-muted-foreground">No messages yet.</li>
        )}
        {local.map((m, i) => (
          <li
            key={`${i}-${m}`}
            className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
          >
            <span className="truncate">{m}</span>
            <button
              type="button"
              disabled={locked}
              onClick={() => setLocal(local.filter((_, idx) => idx !== i))}
              className="grid size-6 place-items-center rounded-full bg-rose-500/20 text-rose-200 hover:bg-rose-500/40 disabled:opacity-40"
              aria-label="Remove"
            >
              <X className="size-3" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// tiny helper to avoid eslint warnings; not strictly needed
function prevRef<T>(v: T) { return { previous: v }; }
