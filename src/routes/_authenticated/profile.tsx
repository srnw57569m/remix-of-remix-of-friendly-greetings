import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { CheckCircle2, Copy, ExternalLink, Sparkles, Unlink, User2 } from "lucide-react";
import { toast } from "sonner";

import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { connectHighrise, disconnectHighrise, getMyProfile } from "@/lib/profile.functions";

const ROOM_LINK = "https://high.rs/world?id=6894bd39e3e4a405517cb530";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — SonicForge" },
      { name: "description", content: "Manage your SonicForge profile and connect your Highrise account." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const getProfile = useServerFn(getMyProfile);
  const connect = useServerFn(connectHighrise);
  const disconnect = useServerFn(disconnectHighrise);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => getProfile(),
  });

  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");

  const connectMut = useMutation({
    mutationFn: (c: string) => connect({ data: { code: c } }),
    onSuccess: (res) => {
      toast.success(`Connected as ${res.highrise_username} 🎉`);
      setOpen(false);
      setCode("");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to connect"),
  });

  const disconnectMut = useMutation({
    mutationFn: () => disconnect(),
    onSuccess: () => {
      toast.success("Highrise account disconnected");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to disconnect"),
  });

  const connected = Boolean(profile?.highrise_username);

  return (
    <div className="relative min-h-screen pb-24 pt-28">
      <AnimatedBackground />
      <div className="mx-auto w-full max-w-3xl px-4">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Account</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight">My Profile</h1>
        </motion.header>

        <div className="grid gap-6">
          {/* Profile card */}
          <section className="glass-strong rounded-3xl p-6">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent">
                <User2 className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-semibold">
                  {isLoading ? "…" : profile?.username ?? "Unnamed"}
                </h2>
                <p className="truncate text-sm text-muted-foreground">{profile?.email}</p>
              </div>
              <Link
                to="/dashboard"
                className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground"
              >
                Dashboard
              </Link>
            </div>
          </section>

          {/* Highrise connection */}
          <section className="glass-strong rounded-3xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-lg font-semibold">Highrise Account</h3>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Link your in-game Highrise username so your bots can recognize you automatically.
                </p>
              </div>
              {connected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-muted-foreground">
                  Not connected
                </span>
              )}
            </div>

            {connected ? (
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Username</p>
                  <p className="font-mono text-lg">@{profile?.highrise_username}</p>
                  {profile?.highrise_connected_at && (
                    <p className="text-xs text-muted-foreground">
                      Connected {new Date(profile.highrise_connected_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => disconnectMut.mutate()}
                  disabled={disconnectMut.isPending}
                >
                  <Unlink className="mr-2 h-4 w-4" />
                  {disconnectMut.isPending ? "Disconnecting…" : "Disconnect"}
                </Button>
              </div>
            ) : (
              <div className="mt-5">
                <Button onClick={() => setOpen(true)} className="rounded-full">
                  Connect your Highrise account
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Connect your Highrise account</DialogTitle>
            <DialogDescription>Follow these steps to link your in-game identity.</DialogDescription>
          </DialogHeader>

          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/20 text-xs font-semibold text-primary">1</span>
              <div className="flex-1">
                Join our verification room:
                <a
                  href={ROOM_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-1 inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                >
                  Open Highrise room <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(ROOM_LINK);
                    toast.success("Room link copied");
                  }}
                  className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-3 w-3" /> copy
                </button>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/20 text-xs font-semibold text-primary">2</span>
              <div className="flex-1">
                In the room chat, type <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">connect</code>.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/20 text-xs font-semibold text-primary">3</span>
              <div className="flex-1">
                The bot will whisper you a code. Paste it below and click <strong>Connect</strong>.
              </div>
            </li>
          </ol>

          <div className="mt-4 space-y-2">
            <Label htmlFor="hr-code">Verification code</Label>
            <Input
              id="hr-code"
              placeholder="e.g. AB12-CD34"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
            />
          </div>

          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => connectMut.mutate(code)}
              disabled={!code.trim() || connectMut.isPending}
            >
              {connectMut.isPending ? "Connecting…" : "Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
