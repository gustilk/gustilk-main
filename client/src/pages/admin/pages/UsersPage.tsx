import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, Crown, Shield, Ban, Trash2, Eye, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { User } from "@shared/schema";
import ConfirmDialog from "../components/ConfirmDialog";

const PAGE_SIZE = 20;

export default function UsersPage({ user: adminUser }: { user: User }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterPremium, setFilterPremium] = useState<"" | "premium" | "non_premium">("");
  const [filterCaste, setFilterCaste] = useState<"" | "sheikh" | "pir" | "murid">("");
  const [pending, setPending] = useState<null | {
    title: string; description: string;
    variant: "danger" | "warning" | "success";
    label: string; onConfirm: () => void;
  }>(null);

  const { data, isLoading } = useQuery<{ users: User[]; total: number }>({
    queryKey: ["/api/admin/users", debouncedSearch, page, filterPremium, filterCaste],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filterPremium) params.set("premium", filterPremium);
      if (filterCaste) params.set("caste", filterCaste);
      return (await fetch(`/api/admin/users?${params}`, { credentials: "include" })).json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => (await apiRequest("PATCH", `/api/admin/users/${id}`, data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "User updated" });
      setPending(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await apiRequest("DELETE", `/api/admin/users/${id}`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User deleted" });
      setPending(null);
    },
    onError: (err: Error) => { toast({ title: "Delete failed", description: err.message, variant: "destructive" }); setPending(null); },
  });

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(0);
    clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = setTimeout(() => setDebouncedSearch(val), 400);
  };

  const togglePremium = (val: "premium" | "non_premium") => {
    setFilterPremium(p => p === val ? "" : val);
    setPage(0);
  };
  const toggleCaste = (val: "sheikh" | "pir" | "murid") => {
    setFilterCaste(c => c === val ? "" : val);
    setPage(0);
  };
  const activeFilters = [filterPremium, filterCaste].filter(Boolean).length;

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const casteLabel = (c?: string | null) => ({ sheikh: "Sheikh", pir: "Pir", murid: "Mirid" }[c ?? ""] ?? c ?? "");
  const statusColor = (u: User) => {
    if (u.verificationStatus === "banned") return "#ef4444";
    if (u.isVerified) return "#10b981";
    if (u.verificationStatus === "pending") return "#fbbf24";
    return "#6b7280";
  };
  const statusLabel = (u: User) => {
    if (u.verificationStatus === "banned") return "Banned";
    if (u.isVerified) return "Verified";
    if (u.verificationStatus === "pending") return "Pending";
    return "Unverified";
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-serif text-xl text-gold font-bold">All Users</h1>
          <p className="text-cream/40 text-xs mt-0.5">{total.toLocaleString()} total users</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream/30" />
        <input value={search} onChange={e => handleSearch(e.target.value)}
          placeholder="Search by name, email, city…"
          data-testid="input-user-search"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-cream placeholder-cream/30 outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(200,0,14,0.15)" }} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-cream/30 text-[10px] font-semibold uppercase tracking-wider">Filter:</span>

        {(["premium", "non_premium"] as const).map(val => (
          <button
            key={val}
            onClick={() => togglePremium(val)}
            data-testid={`filter-${val}`}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all"
            style={{
              background: filterPremium === val ? "rgba(200,0,14,0.2)" : "rgba(255,255,255,0.05)",
              border: filterPremium === val ? "1px solid rgba(200,0,14,0.55)" : "1px solid rgba(255,255,255,0.08)",
              color: filterPremium === val ? "#c8000e" : "rgba(253,248,240,0.45)",
            }}
          >
            <Crown size={11} />
            {val === "premium" ? "Premium" : "Non-Premium"}
          </button>
        ))}

        <div className="w-px h-4 mx-0.5" style={{ background: "rgba(255,255,255,0.1)" }} />

        {([
          { val: "sheikh", label: "Sheikh" },
          { val: "pir", label: "Pir" },
          { val: "murid", label: "Mirid" },
        ] as const).map(({ val, label }) => (
          <button
            key={val}
            onClick={() => toggleCaste(val)}
            data-testid={`filter-caste-${val}`}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
            style={{
              background: filterCaste === val ? "rgba(123,63,160,0.2)" : "rgba(255,255,255,0.05)",
              border: filterCaste === val ? "1px solid rgba(123,63,160,0.55)" : "1px solid rgba(255,255,255,0.08)",
              color: filterCaste === val ? "#c8000e" : "rgba(253,248,240,0.45)",
            }}
          >
            {label}
          </button>
        ))}

        {activeFilters > 0 && (
          <button
            onClick={() => { setFilterPremium(""); setFilterCaste(""); setPage(0); }}
            data-testid="button-clear-filters"
            className="px-3 py-1 rounded-full text-xs font-semibold transition-all ml-1"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}
          >
            Clear ({activeFilters})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(200,0,14,0.12)" }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-cream/40 text-sm">Loading…</div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-cream/40 text-sm">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(200,0,14,0.1)" }}>
                  <th className="text-left px-4 py-3 text-cream/50 font-medium text-xs">User</th>
                  <th className="text-left px-4 py-3 text-cream/50 font-medium text-xs hidden sm:table-cell">Caste / Gender</th>
                  <th className="text-left px-4 py-3 text-cream/50 font-medium text-xs hidden md:table-cell">Location</th>
                  <th className="text-left px-4 py-3 text-cream/50 font-medium text-xs">Status</th>
                  <th className="text-left px-4 py-3 text-cream/50 font-medium text-xs hidden lg:table-cell">Joined</th>
                  <th className="px-4 py-3 text-cream/50 font-medium text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => (
                  <tr key={u.id} data-testid={`row-user-${u.id}`}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-gold"
                          style={{ background: "linear-gradient(135deg, #2d0f4a, #9b0010)" }}>
                          {u.mainPhotoUrl
                            ? <img src={u.mainPhotoUrl} alt="" className="w-full h-full object-cover" />
                            : (u.fullName ?? u.email ?? "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-cream text-xs font-medium">{u.fullName ?? u.firstName ?? "—"}</div>
                          <div className="text-cream/40 text-[10px]">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="text-cream/60 text-xs">{casteLabel(u.caste)} · {u.gender}</div>
                      <div className="text-cream/30 text-[10px]">{u.age} yrs</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-cream/60 text-xs">{u.city}{u.country ? `, ${u.country}` : ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${statusColor(u)}22`, color: statusColor(u) }}>
                          {statusLabel(u)}
                        </span>
                        {u.isPremium && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(200,0,14,0.15)", color: "#c8000e" }}>
                            Premium
                          </span>
                        )}
                        {u.isAdmin && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}>
                            Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-cream/40 text-xs">
                      {u.createdAt ? formatDistanceToNow(new Date(u.createdAt), { addSuffix: true }) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button onClick={() => setLocation(`/admin/users/${u.id}`)}
                          data-testid={`button-view-user-${u.id}`}
                          title="View profile"
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
                          style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>
                          <Eye size={12} />
                        </button>
                        {!u.isAdmin && (
                          <>
                            <button onClick={() => updateMutation.mutate({ id: u.id, isPremium: !u.isPremium })}
                              data-testid={`button-toggle-premium-${u.id}`}
                              title={u.isPremium ? "Remove premium" : "Grant premium"}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
                              style={{ background: "rgba(200,0,14,0.15)", color: "#c8000e" }}>
                              <Crown size={12} />
                            </button>
                            <button
                              onClick={() => setPending({
                                title: u.verificationStatus === "banned" ? `Unban ${u.fullName ?? u.email}?` : `Ban ${u.fullName ?? u.email}?`,
                                description: u.verificationStatus === "banned"
                                  ? "This will restore their access to the platform."
                                  : "They will immediately lose access and cannot log in.",
                                variant: "danger",
                                label: u.verificationStatus === "banned" ? "Unban" : "Ban",
                                onConfirm: () => updateMutation.mutate({ id: u.id, isBanned: u.verificationStatus !== "banned" }),
                              })}
                              data-testid={`button-ban-user-${u.id}`}
                              title={u.verificationStatus === "banned" ? "Unban" : "Ban"}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
                              style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                              <Ban size={12} />
                            </button>
                            <button
                              onClick={() => setPending({
                                title: `Delete ${u.fullName ?? u.email}?`,
                                description: `This is permanent and cannot be undone. All data, matches, messages and photos for ${u.fullName ?? u.email} will be erased forever.`,
                                variant: "danger",
                                label: "Delete Permanently",
                                onConfirm: () => deleteMutation.mutate(u.id),
                              })}
                              data-testid={`button-delete-user-${u.id}`}
                              title="Delete account"
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
                              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-cream/40 text-xs">Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              data-testid="button-prev-page"
              className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
              style={{ background: "rgba(255,255,255,0.06)", color: "#c8000e" }}>
              <ChevronLeft size={14} />
            </button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
              data-testid="button-next-page"
              className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
              style={{ background: "rgba(255,255,255,0.06)", color: "#c8000e" }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pending}
        title={pending?.title ?? ""}
        description={pending?.description ?? ""}
        variant={pending?.variant ?? "danger"}
        confirmLabel={pending?.label ?? "Confirm"}
        isPending={updateMutation.isPending || deleteMutation.isPending}
        onConfirm={() => pending?.onConfirm()}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
