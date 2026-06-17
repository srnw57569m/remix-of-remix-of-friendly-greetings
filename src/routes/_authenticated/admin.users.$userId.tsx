import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Mail, User as UserIcon, Calendar, ShieldCheck } from "lucide-react";
import { getUserDetail } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/users/$userId")({
  head: () => ({ meta: [{ title: "User Detail · Admin" }] }),
  component: UserDetail,
});

function UserDetail() {
  const { userId } = Route.useParams();
  const fetchDetail = useServerFn(getUserDetail);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => fetchDetail({ data: { userId } }),
  });

  return (
    <div className="space-y-6">
      <Link to="/admin/users" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to users
      </Link>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {data && (
        <>
          <div className="glass-strong rounded-3xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold">{data.profile.username}</h2>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" /> {data.profile.email}
                </p>
                <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <UserIcon className="h-3 w-3" /> <span className="font-mono">{data.profile.id}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" /> Joined {new Date(data.profile.created_at).toLocaleDateString()}
                </p>
                {data.roles.length > 0 && (
                  <p className="mt-2 flex items-center justify-end gap-2 text-xs">
                    <ShieldCheck className="h-3 w-3 text-primary" />
                    {data.roles.join(", ")}
                  </p>
                )}
              </div>
            </div>
          </div>

          <section className="glass rounded-3xl p-6">
            <h3 className="mb-4 font-display text-lg font-semibold">Bots ({data.bots.length})</h3>
            <div className="space-y-2">
              {data.bots.length === 0 && <p className="text-sm text-muted-foreground">No bots</p>}
              {data.bots.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between rounded-2xl border border-white/5 px-4 py-3">
                  <div>
                    <p className="font-medium">{b.bot_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.status} · {b.subscription_status} · {new Date(b.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="glass rounded-3xl p-6">
            <h3 className="mb-4 font-display text-lg font-semibold">Activity History</h3>
            <div className="max-h-[480px] space-y-1 overflow-y-auto pr-2 font-mono text-xs">
              {data.activity.length === 0 && <p className="text-sm text-muted-foreground">No activity</p>}
              {data.activity.map((a: any) => (
                <div key={a.id} className="flex items-baseline justify-between gap-4 border-b border-white/5 py-1.5">
                  <span className="text-foreground">{a.action}</span>
                  <span className="truncate text-muted-foreground">{a.detail}</span>
                  <span className="shrink-0 text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}