import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Play, Square, RotateCw, Pause, Trash2, Search, Clock } from "lucide-react";
import { toast } from "sonner";
import { listAllBots, adminSetBotStatus, adminDeleteBot } from "@/lib/admin.functions";
import { adminGrantBotTime } from "@/lib/wallet.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";


export const Route = createFileRoute("/_authenticated/admin/bots")({
  head: () => ({ meta: [{ title: "Admin · Bots" }] }),
  component: AdminBots,
});

function AdminBots() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const fetchBots = useServerFn(listAllBots);
  const { data: bots = [], isLoading } = useQuery({
    queryKey: ["admin", "bots", search],
    queryFn: () => fetchBots({ data: { search: search || undefined } }),
  });
  const setStatus = useServerFn(adminSetBotStatus);
  const del = useServerFn(adminDeleteBot);
  const statusMut = useMutation({
    mutationFn: (v: { botId: string; action: "start" | "stop" | "restart" | "suspend" }) => setStatus({ data: v }),
    onSuccess: () => {
      toast.success("Bot updated");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (botId: string) => del({ data: { botId } }),
    onSuccess: () => {
      toast.success("Bot deleted");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const grant = useServerFn(adminGrantBotTime);
  const [grantTarget, setGrantTarget] = useState<{ id: string; name: string } | null>(null);
  const [grantHours, setGrantHours] = useState<number>(24);
  const grantMut = useMutation({
    mutationFn: (v: { botId: string; hours: number }) => grant({ data: v }),
    onSuccess: (res) => {
      toast.success(
        `Time granted · expires ${new Date(res.expiresAt ?? Date.now()).toLocaleString()}`,
      );
      qc.invalidateQueries({ queryKey: ["admin"] });
      setGrantTarget(null);
    },
    onError: (e: any) => toast.error(e.message),
  });


  return (
    <div className="space-y-4">
      <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search bots by name"
          className="border-0 bg-transparent focus-visible:ring-0"
        />
      </div>

      <div className="glass overflow-hidden rounded-3xl">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Bot</th>
              <th className="px-5 py-3">Owner</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Subscription</th>
              <th className="px-5 py-3">Created</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && bots.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">No bots</td></tr>
            )}
            {bots.map((b: any) => (
              <tr key={b.id} className="transition-colors hover:bg-white/[0.02]">
                <td className="px-5 py-3">
                  <p className="font-medium">{b.bot_name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{b.id.slice(0, 8)}…</p>
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {b.owner?.username ?? "—"}
                  <p className="text-xs">{b.owner?.email}</p>
                </td>
                <td className="px-5 py-3">
                  <StatusPill status={b.status} />
                </td>
                <td className="px-5 py-3 text-xs">{b.subscription_status}</td>
                <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" title="Start" onClick={() => statusMut.mutate({ botId: b.id, action: "start" })}>
                      <Play className="h-4 w-4 text-emerald-400" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Stop" onClick={() => statusMut.mutate({ botId: b.id, action: "stop" })}>
                      <Square className="h-4 w-4 text-slate-300" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Restart" onClick={() => statusMut.mutate({ botId: b.id, action: "restart" })}>
                      <RotateCw className="h-4 w-4 text-sky-400" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Suspend" onClick={() => statusMut.mutate({ botId: b.id, action: "suspend" })}>
                      <Pause className="h-4 w-4 text-amber-400" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Grant time"
                      onClick={() => {
                        setGrantHours(24);
                        setGrantTarget({ id: b.id, name: b.bot_name });
                      }}
                    >
                      <Clock className="h-4 w-4 text-violet-400" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Delete"
                      onClick={() => {
                        if (confirm(`Permanently delete "${b.bot_name}"?`)) delMut.mutate(b.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-rose-400" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={grantTarget !== null} onOpenChange={(o) => !o && setGrantTarget(null)}>
        <DialogContent className="glass-strong border-white/10 sm:rounded-3xl">
          <DialogHeader>
            <DialogTitle>Grant subscription time</DialogTitle>
            <DialogDescription>
              Extend <span className="font-mono text-foreground">{grantTarget?.name}</span> by a custom number of hours. Bills nothing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Hours</Label>
            <Input
              type="number"
              min={1}
              max={24 * 365 * 5}
              value={grantHours}
              onChange={(e) => setGrantHours(Math.max(1, Number(e.target.value) || 0))}
              className="font-mono"
            />
            <div className="flex flex-wrap gap-2 text-xs">
              {[1, 24, 24 * 7, 24 * 30, 24 * 365].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setGrantHours(h)}
                  className="rounded-full border border-white/10 px-3 py-1 hover:bg-white/5"
                >
                  {h === 1 ? "1h" : h === 24 ? "1d" : h === 168 ? "1w" : h === 720 ? "1mo" : "1y"}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGrantTarget(null)} disabled={grantMut.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => grantTarget && grantMut.mutate({ botId: grantTarget.id, hours: grantHours })}
              disabled={grantMut.isPending || grantHours < 1}
              className="glow-primary"
            >
              {grantMut.isPending ? "Granting…" : `Grant ${grantHours}h`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


function StatusPill({ status }: { status: string }) {
  const tone =
    status === "Online" || status === "Starting"
      ? "bg-emerald-500/15 text-emerald-300"
      : status === "Suspended"
      ? "bg-rose-500/15 text-rose-300"
      : "bg-slate-500/15 text-slate-300";
  return <span className={`rounded-full px-2.5 py-1 text-xs ${tone}`}>{status}</span>;
}