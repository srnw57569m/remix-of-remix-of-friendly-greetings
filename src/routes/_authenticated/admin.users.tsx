import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, Eye, UserX, UserCheck, Trash2, Shield, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { listAllUsers, suspendUser, deleteUserAccount, grantRole } from "@/lib/admin.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Admin · Users" }] }),
  component: AdminUsers,
});

const ROLE_OPTIONS = ["moderator", "admin", "super_admin"] as const;
type RoleOption = (typeof ROLE_OPTIONS)[number];

function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<{ id: string; username: string; roles: string[] } | null>(null);

  const fetchUsers = useServerFn(listAllUsers);
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin", "users", search],
    queryFn: () => fetchUsers({ data: { search: search || undefined } }),
  });
  const suspend = useServerFn(suspendUser);
  const del = useServerFn(deleteUserAccount);
  const grant = useServerFn(grantRole);

  const suspendMut = useMutation({
    mutationFn: (v: { userId: string; suspended: boolean }) => suspend({ data: v }),
    onSuccess: () => {
      toast.success("User updated");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (userId: string) => del({ data: { userId } }),
    onSuccess: () => {
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const roleMut = useMutation({
    mutationFn: (v: { userId: string; role: RoleOption; grant: boolean }) =>
      grant({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(`${v.grant ? "Granted" : "Revoked"} ${v.role}`);
      qc.invalidateQueries({ queryKey: ["admin"] });
      // optimistically update the open dialog
      setEditUser((prev) =>
        prev && prev.id === v.userId
          ? {
              ...prev,
              roles: v.grant
                ? Array.from(new Set([...prev.roles, v.role]))
                : prev.roles.filter((r) => r !== v.role),
            }
          : prev,
      );
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
          placeholder="Search by username or email"
          className="border-0 bg-transparent focus-visible:ring-0"
        />
      </div>

      <div className="glass overflow-hidden rounded-3xl">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Username</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Bots</th>
              <th className="px-5 py-3">Roles</th>
              <th className="px-5 py-3">Highrise</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Joined</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading && (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && users.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">No users</td></tr>
            )}
            {users.map((u: any) => (
              <tr key={u.id} className="transition-colors hover:bg-white/[0.02]">
                <td className="px-5 py-3 font-medium">{u.username}</td>
                <td className="px-5 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-5 py-3">{u.bot_count}</td>
                <td className="px-5 py-3">
                  {u.roles.length ? u.roles.join(", ") : <span className="text-muted-foreground">user</span>}
                </td>
                <td className="px-5 py-3">
                  {u.highrise_username ? (
                    <span
                      title={`@${u.highrise_username}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-300"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs text-muted-foreground">
                      <Circle className="h-3.5 w-3.5" /> None
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  {u.suspended ? (
                    <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-xs text-rose-300">Suspended</span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-300">Active</span>
                  )}
                </td>
                <td className="px-5 py-3 text-xs text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-1">
                    <Link to="/admin/users/$userId" params={{ userId: u.id }}>
                      <Button size="icon" variant="ghost" title="View">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Edit roles"
                      onClick={() => setEditUser({ id: u.id, username: u.username, roles: u.roles ?? [] })}
                    >
                      <Shield className="h-4 w-4 text-primary" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title={u.suspended ? "Reactivate" : "Suspend"}
                      onClick={() => suspendMut.mutate({ userId: u.id, suspended: !u.suspended })}
                    >
                      {u.suspended ? <UserCheck className="h-4 w-4 text-emerald-400" /> : <UserX className="h-4 w-4 text-amber-400" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Delete"
                      onClick={() => {
                        if (confirm(`Permanently delete ${u.username}? This removes their account and all bots.`)) {
                          delMut.mutate(u.id);
                        }
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

      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit roles · {editUser?.username}</DialogTitle>
            <DialogDescription>
              Toggle roles to grant or revoke. Only super admins can change roles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {ROLE_OPTIONS.map((role) => {
              const has = editUser?.roles.includes(role) ?? false;
              return (
                <label
                  key={role}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 hover:bg-white/[0.04]"
                >
                  <div>
                    <p className="font-medium capitalize">{role.replace("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      {role === "super_admin"
                        ? "Full control, including role management"
                        : role === "admin"
                          ? "Manage users, bots, and platform"
                          : "Moderate users and content"}
                    </p>
                  </div>
                  <Checkbox
                    checked={has}
                    disabled={roleMut.isPending}
                    onCheckedChange={(checked) => {
                      if (!editUser) return;
                      roleMut.mutate({ userId: editUser.id, role, grant: Boolean(checked) });
                    }}
                  />
                </label>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditUser(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
