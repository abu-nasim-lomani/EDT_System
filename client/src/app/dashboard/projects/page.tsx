"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    Plus, Search, Filter, X, MoreHorizontal,
    TrendingUp, CalendarDays, Users, Eye, Pencil, Trash2,
    CheckCircle2, Loader2, AlertTriangle, Circle, RefreshCw
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────
type ProjectStatus = "IN_PROGRESS" | "PENDING" | "STUCK" | "COMPLETED";
type FilterTab = "All" | ProjectStatus;

interface UserOption { id: string; name: string; role: string; designation?: string; }
interface Project {
    id: string; name: string; description?: string;
    status: ProjectStatus; progress: number;
    manager: { id: string; name: string };
    arr?: { id: string; name: string; designation?: string };
    _count: { tasks: number; employees: number };
    createdAt: string;
}

// ─── Status Config ────────────────────────────────────────────
const STATUS_CFG: Record<ProjectStatus, { cls: string; icon: React.ElementType; label: string }> = {
    IN_PROGRESS: { cls: "badge-in-progress", icon: Loader2, label: "In Progress" },
    PENDING: { cls: "badge-pending", icon: Circle, label: "Pending" },
    STUCK: { cls: "badge-stuck", icon: AlertTriangle, label: "Stuck" },
    COMPLETED: { cls: "badge-completed", icon: CheckCircle2, label: "Completed" },
};
const TABS: FilterTab[] = ["All", "IN_PROGRESS", "PENDING", "STUCK", "COMPLETED"];
const TAB_LABELS: Record<FilterTab, string> = {
    All: "All", IN_PROGRESS: "In Progress", PENDING: "Pending", STUCK: "Stuck", COMPLETED: "Completed",
};

// ─── API helpers ──────────────────────────────────────────────
const fetchProjects = async (): Promise<Project[]> => (await api.get("/projects")).data.data;
const fetchUsers = async (): Promise<UserOption[]> => (await api.get("/users")).data.data;

// ─── Main Page ────────────────────────────────────────────────
export default function ProjectsPage() {
    const qc = useQueryClient();
    const router = useRouter();
    const [filter, setFilter] = useState<FilterTab>("All");
    const [search, setSearch] = useState("");
    const [menuId, setMenuId] = useState<string | null>(null);
    const [modal, setModal] = useState<{ mode: "create" | "edit"; project?: Project } | null>(null);

    const { data: projects = [], isLoading, isError, refetch } = useQuery({ queryKey: ["projects"], queryFn: fetchProjects });
    const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/projects/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
    });

    const filtered = projects.filter(p => {
        const matchStatus = filter === "All" || p.status === filter;
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.manager.name.toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchSearch;
    });

    const counts: Record<string, number> = {
        All: projects.length,
        IN_PROGRESS: projects.filter(p => p.status === "IN_PROGRESS").length,
        PENDING: projects.filter(p => p.status === "PENDING").length,
        STUCK: projects.filter(p => p.status === "STUCK").length,
        COMPLETED: projects.filter(p => p.status === "COMPLETED").length,
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm">Loading projects…</p>
        </div>
    );

    if (isError) return (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
            <AlertTriangle className="h-8 w-8 text-rose-500" />
            <p className="text-sm text-slate-400">Failed to load projects</p>
            <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold">
                <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Projects</h1>
                    <p className="text-sm text-slate-500 mt-0.5">{counts["IN_PROGRESS"]} active · {projects.length} total</p>
                </div>
                <button onClick={() => setModal({ mode: "create" })}
                    className="flex items-center gap-2 h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white transition-colors shrink-0">
                    <Plus className="h-4 w-4" /> New Project
                </button>
            </div>

            {/* Controls */}
            <div className="flex gap-3">
                <div className="flex items-center gap-2 px-3 h-9 rounded-xl bg-slate-900 border border-slate-700/60 flex-1">
                    <Search className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects or PM…"
                        className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none" />
                </div>
                <button className="flex items-center gap-2 h-9 px-4 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors">
                    <Filter className="h-3.5 w-3.5" /> Filter
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-0.5">
                {TABS.map(tab => (
                    <button key={tab} onClick={() => setFilter(tab)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all
              ${filter === tab ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-white hover:bg-slate-800"}`}>
                        {TAB_LABELS[tab]}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${filter === tab ? "bg-white/20" : "bg-slate-800 text-slate-600"}`}>
                            {counts[tab]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="edt-card">
                <div className="grid grid-cols-12 px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-slate-600 border-b border-slate-800">
                    <span className="col-span-3">Project</span>
                    <span className="col-span-2">Status</span>
                    <span className="col-span-2">Progress</span>
                    <span className="col-span-2">PM</span>
                    <span className="col-span-1">ARR</span>
                    <span className="col-span-1 text-center">Tasks</span>
                    <span className="col-span-1 text-right">Actions</span>
                </div>
                <div className="divide-y divide-slate-800">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                            <TrendingUp className="h-8 w-8 mb-3" />
                            <p className="text-sm font-medium">No projects found</p>
                        </div>
                    ) : filtered.map(p => {
                        const { cls, icon: Icon, label } = STATUS_CFG[p.status];
                        const pmInitials = p.manager.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                        const arrInitials = p.arr?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "—";
                        return (
                            <div key={p.id} className="grid grid-cols-12 items-center px-5 py-4 hover:bg-slate-800/30 transition-colors group relative">
                                <div className="col-span-3 min-w-0 pr-3">
                                    <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-500">
                                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {p._count.employees}</span>
                                        <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />
                                            {new Date(p.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                                        </span>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${cls}`}>
                                        <Icon className="h-3 w-3" /> {label}
                                    </span>
                                </div>
                                <div className="col-span-2 pr-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 edt-progress-track h-1.5">
                                            <div className="edt-progress-fill h-1.5" style={{ width: `${p.progress}%` }} />
                                        </div>
                                        <span className="text-xs font-bold text-slate-400 w-8 text-right">{p.progress}%</span>
                                    </div>
                                </div>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-400 shrink-0">{pmInitials}</div>
                                    <span className="text-xs text-slate-300 truncate">{p.manager.name}</span>
                                </div>
                                <div className="col-span-1 flex items-center gap-1.5">
                                    <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-[10px] font-bold text-rose-400 shrink-0">{arrInitials}</div>
                                    <span className="text-[11px] text-slate-500 hidden xl:block">{p.arr?.name.split(" ")[0] ?? "—"}</span>
                                </div>
                                <div className="col-span-1 text-center">
                                    <span className="text-xs font-bold text-slate-300">{p._count.tasks}</span>
                                </div>
                                <div className="col-span-1 flex justify-end relative">
                                    <button onClick={() => setMenuId(menuId === p.id ? null : p.id)}
                                        className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-600 hover:text-white hover:bg-slate-800 transition-colors">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                    {menuId === p.id && (
                                        <div className="absolute right-0 top-9 w-40 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
                                            {[
                                                { label: "View Details", icon: Eye, color: "text-slate-300", action: () => { router.push(`/dashboard/projects/${p.id}`); setMenuId(null); } },
                                                { label: "Edit", icon: Pencil, color: "text-slate-300", action: () => { setModal({ mode: "edit", project: p }); setMenuId(null); } },
                                                { label: "Delete", icon: Trash2, color: "text-rose-400", action: () => { deleteMutation.mutate(p.id); setMenuId(null); } },
                                            ].map(({ label, icon: Icon2, color, action }) => (
                                                <button key={label} onClick={action}
                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium ${color} hover:bg-slate-800 transition-colors`}>
                                                    <Icon2 className="h-3.5 w-3.5" /> {label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {modal && (
                <ProjectModal
                    mode={modal.mode}
                    project={modal.project}
                    users={users}
                    onClose={() => setModal(null)}
                    onSuccess={() => { qc.invalidateQueries({ queryKey: ["projects"] }); setModal(null); }}
                />
            )}
            {menuId && <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />}
        </div>
    );
}

// ─── Project Modal (Create + Edit) ───────────────────────────
interface ProjectModalProps {
    mode: "create" | "edit";
    project?: Project;
    users: UserOption[];
    onClose: () => void;
    onSuccess: () => void;
}

function ProjectModal({ mode, project, users, onClose, onSuccess }: ProjectModalProps) {
    const [form, setForm] = useState({
        name: project?.name ?? "",
        description: project?.description ?? "",
        status: (project?.status ?? "PENDING") as ProjectStatus,
        managerId: project?.manager?.id ?? "",
        arrId: project?.arr?.id ?? "",
        startDate: "",
        endDate: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const isEdit = mode === "edit";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError("");
        try {
            const payload = {
                name: form.name,
                description: form.description || undefined,
                managerId: form.managerId,
                arrId: form.arrId || undefined,
                startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
                endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
                ...(isEdit ? { status: form.status } : {}),
            };
            if (isEdit && project) {
                await api.patch(`/projects/${project.id}`, payload);
            } else {
                await api.post("/projects", payload);
            }
            onSuccess();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Something went wrong";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
            <form onSubmit={handleSubmit} className="edt-card w-full max-w-lg mx-4 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
                    <div>
                        <h3 className="text-base font-bold text-white">{isEdit ? "Edit Project" : "New Project"}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{isEdit ? "Update project details" : "Fill in the details below"}</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4 overflow-y-auto">
                    {error && <p className="text-xs text-rose-400 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">{error}</p>}

                    <Field label="Project Name *">
                        <input required value={form.name} onChange={e => set("name", e.target.value)}
                            placeholder="e.g. Mobile App V3"
                            className="w-full h-9 px-3 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-colors" />
                    </Field>

                    <Field label="Description">
                        <textarea rows={2} value={form.description} onChange={e => set("description", e.target.value)}
                            placeholder="Brief project scope…"
                            className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-colors resize-none" />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Start Date">
                            <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)}
                                className="w-full h-9 px-3 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]" />
                        </Field>
                        <Field label="End Date (Deadline)">
                            <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)}
                                className="w-full h-9 px-3 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]" />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Project Manager *">
                            <select required value={form.managerId} onChange={e => set("managerId", e.target.value)}
                                className="w-full h-9 px-3 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors">
                                <option value="">Select PM…</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}{u.designation ? ` (${u.designation})` : ""}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="ARR (optional)">
                            <select value={form.arrId} onChange={e => set("arrId", e.target.value)}
                                className="w-full h-9 px-3 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors">
                                <option value="">Select ARR…</option>
                                {users.filter(u => u.role === "SENIOR_MANAGEMENT").map(u => (
                                    <option key={u.id} value={u.id}>{u.name}{u.designation ? ` (${u.designation})` : ""}</option>
                                ))}
                            </select>
                        </Field>
                    </div>

                    {isEdit && (
                        <Field label="Status">
                            <select value={form.status} onChange={e => set("status", e.target.value)}
                                className="w-full h-9 px-3 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors">
                                <option value="PENDING">Pending</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="STUCK">Stuck</option>
                                <option value="COMPLETED">Completed</option>
                            </select>
                        </Field>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-800 shrink-0">
                    <button type="button" onClick={onClose}
                        className="h-9 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-300 hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button type="submit" disabled={loading}
                        className="h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-sm font-semibold text-white flex items-center gap-2 transition-colors">
                        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {loading ? "Saving…" : isEdit ? "Save Changes" : "Create Project"}
                    </button>
                </div>
            </form>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">{label}</label>
            {children}
        </div>
    );
}
