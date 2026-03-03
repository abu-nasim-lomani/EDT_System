"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    Plus, CheckCircle2, Search,
    X, Loader2, AlertTriangle, Trash2, Pencil, User
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

// ─── Types ───────────────────────────────────────────────────
type TaskStatus = "PENDING" | "IN_PROGRESS" | "STUCK" | "COMPLETED";
type TaskPriority = "MINOR" | "MAJOR" | "HIGH" | "CRITICAL";

interface Task {
    id: string; title: string; description?: string;
    status: TaskStatus; priority: TaskPriority;
    startDate?: string; endDate?: string;
    project: { id: string; name: string };
    creator: { id: string; name: string };
    createdAt: string;
    collaborators?: { id: string; name: string }[];
    assignee?: { id: string; name: string; avatar?: string };
    type?: string;
    progress?: number;
    fileUrl?: string;
    subTasks?: Task[];
    parentTaskId?: string | null;
}
interface ProjectOpt { id: string; name: string; }
interface UserOpt { id: string; name: string; avatar?: string; }

// ─── Constants ────────────────────────────────────────────────
const STATUS_LABELS: Record<TaskStatus, string> = {
    PENDING: "Pending", IN_PROGRESS: "In Progress", STUCK: "Stuck", COMPLETED: "Completed"
};
const PRIORITY_COLORS: Record<TaskPriority, string> = {
    CRITICAL: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    MAJOR: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    MINOR: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
};

// ─── API Fetches ──────────────────────────────────────────────
const fetchTasks = async () => (await api.get("/tasks")).data.data as Task[];
const fetchProjects = async () => (await api.get("/projects")).data.data as ProjectOpt[];
const fetchUsers = async () => (await api.get("/users")).data.data as UserOpt[];

// ─── Main Page ────────────────────────────────────────────────
export default function TasksPage() {
    const qc = useQueryClient();
    const user = useAuthStore(s => s.user);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<TaskStatus | "ALL">("ALL");
    const [modal, setModal] = useState<{ mode: "create" | "edit"; task?: Task } | null>(null);

    const { data: tasks = [], isLoading, isError, refetch } = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });
    const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: fetchProjects });
    const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/tasks/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    });

    const mainTasks = tasks.filter(t => !t.parentTaskId);

    const filtered = mainTasks.filter(t => {
        const matchStatus = filterStatus === "ALL" || t.status === filterStatus;
        const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
            t.project.name.toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchSearch;
    });

    const activeCount = mainTasks.filter(t => t.status !== "COMPLETED").length;

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm">Loading tasks…</p>
        </div>
    );

    if (isError) return (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
            <AlertTriangle className="h-8 w-8 text-rose-500" />
            <p className="text-sm text-slate-400">Failed to load tasks</p>
            <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold">
                Retry
            </button>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Tasks</h1>
                    <p className="text-sm text-slate-500 mt-0.5">{activeCount} active · {mainTasks.length} total tasks</p>
                </div>
                {user?.role !== "EMPLOYEE" && (
                    <button onClick={() => setModal({ mode: "create" })}
                        className="flex items-center gap-2 h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white transition-colors shrink-0 shadow-lg shadow-indigo-900/20">
                        <Plus className="h-4 w-4" /> Create Task
                    </button>
                )}
            </div>

            {/* Controls */}
            <div className="flex gap-3">
                <div className="flex items-center gap-2 px-3 h-9 rounded-xl bg-slate-900 border border-slate-700/60 flex-1">
                    <Search className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks or projects…"
                        className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none" />
                </div>
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700/60 overflow-x-auto shrink-0 hide-scrollbar">
                    {(["ALL", "PENDING", "IN_PROGRESS", "STUCK", "COMPLETED"] as (TaskStatus | "ALL")[]).map(tab => (
                        <button key={tab} onClick={() => setFilterStatus(tab)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap
                                ${filterStatus === tab ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"}`}>
                            {tab === "ALL" ? "All Tasks" : STATUS_LABELS[tab]}
                        </button>
                    ))}
                </div>
            </div>

            {/* List / Table */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-600 bg-slate-900/30 rounded-3xl border border-slate-800 border-dashed">
                    <CheckCircle2 className="h-10 w-10 mb-4 opacity-50" />
                    <p className="text-sm font-medium">No tasks found matching criteria</p>
                </div>
            ) : (
                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden overflow-x-auto shadow-2xl">
                    <table className="w-full text-left border-collapse min-w-[1500px]">
                        <thead>
                            <tr className="bg-slate-900 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                                <th className="px-4 py-4 w-[15%]">Title</th>
                                <th className="px-4 py-4">Start Date</th>
                                <th className="px-4 py-4">Deadline</th>
                                <th className="px-4 py-4">Related To</th>
                                <th className="px-4 py-4">Assign To</th>
                                <th className="px-4 py-4">Collaborators</th>
                                <th className="px-4 py-4">Status</th>
                                <th className="px-4 py-4">Type</th>
                                <th className="px-4 py-4">Completion %</th>
                                <th className="px-4 py-4">Priority</th>
                                <th className="px-4 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {filtered.map(t => (
                                <TaskRow key={t.id} task={t}
                                    onEdit={() => setModal({ mode: "edit", task: t })}
                                    onDelete={() => deleteMutation.mutate(t.id)}
                                    canEdit={user?.role !== "EMPLOYEE"}
                                    onStatusChange={async (status) => {
                                        await api.patch(`/tasks/${t.id}`, { status });
                                        refetch();
                                    }}
                                    onProgressChange={async (progress) => {
                                        await api.patch(`/tasks/${t.id}`, { progress });
                                        refetch();
                                    }}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {modal && (
                <TaskModal
                    mode={modal.mode} task={modal.task} projects={projects} users={users}
                    onClose={() => setModal(null)}
                    onSuccess={() => { qc.invalidateQueries({ queryKey: ["tasks"] }); setModal(null); }}
                />
            )}
        </div>
    );
}

// ─── Task Row Component ─────────────────────────────────────────
function TaskRow({ task, onEdit, onDelete, canEdit, onStatusChange, onProgressChange }: { task: Task; onEdit: () => void; onDelete: () => void; canEdit: boolean; onStatusChange: (status: TaskStatus) => void; onProgressChange: (p: number) => void; }) {
    const isDone = task.status === "COMPLETED";
    const router = useRouter();
    const [isEditingProgress, setIsEditingProgress] = useState(false);
    const [tempProgress, setTempProgress] = useState(task.progress?.toString() || "0");
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Deadline check
    const isOverdue = !isDone && task.endDate && new Date(task.endDate).getTime() < new Date().getTime();

    // Progress calculation
    const progressPercent = task.progress || 0;

    const startEditingProgress = () => {
        if (!canEdit || task.subTasks?.length) return;
        setTempProgress(progressPercent.toString());
        setIsEditingProgress(true);
    };

    const handleProgressSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsEditingProgress(false);
        const val = parseInt(tempProgress, 10);
        if (isNaN(val) || val < 0 || val > 100) {
            setTempProgress(progressPercent.toString());
            return;
        }

        if (val === 100 && task.status !== "COMPLETED") {
            setShowConfirmModal(true);
        } else if (val !== progressPercent) {
            onProgressChange(val);
        }
    };

    return (
        <tr className={`group hover:bg-slate-800/30 transition-colors ${isDone ? "opacity-60" : ""}`}>
            {/* Title */}
            <td className="px-4 py-4 align-middle">
                <div className="flex items-center gap-2">
                    {task.parentTaskId && (
                        <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0" title="This is a sub-task belonging to a main task">
                            Sub-Task
                        </span>
                    )}
                    <button onClick={() => router.push(`/dashboard/tasks/${task.id}`)} className={`text-sm font-bold text-left leading-tight hover:text-indigo-400 transition-colors ${isDone ? "text-slate-500 line-through decoration-slate-600" : "text-slate-100"}`}>
                        {task.title}
                    </button>
                </div>
            </td>

            {/* Start Date */}
            <td className="px-4 py-4 align-middle text-sm text-slate-300">
                {task.startDate ? new Date(task.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "-"}
            </td>

            {/* Deadline */}
            <td className={`px-4 py-4 align-middle text-sm ${isOverdue ? "text-rose-400 font-bold" : "text-slate-300"}`}>
                {task.endDate ? new Date(task.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "-"}
            </td>

            {/* Related to (Project) */}
            <td className="px-4 py-4 align-middle">
                <span className="bg-slate-900 border border-slate-700/60 px-2 py-1 rounded text-[11px] font-medium text-slate-400 whitespace-nowrap">
                    {task.project.name}
                </span>
            </td>

            {/* Assign To */}
            <td className="px-4 py-4 align-middle">
                <div className="flex items-center gap-2 text-sm text-slate-200">
                    <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                        {task.assignee?.avatar ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={task.assignee.avatar} alt={task.assignee.name} className="w-full h-full rounded-full object-cover" />
                        ) : <User className="h-3 w-3 text-slate-400" />}
                    </div>
                    <span className="truncate max-w-[120px]">{task.assignee?.name || "Unassigned"}</span>
                </div>
            </td>

            {/* Collaborators */}
            <td className="px-4 py-4 align-middle text-sm text-slate-400">
                {task.collaborators && task.collaborators.length > 0 ? (
                    <div className="flex -space-x-2">
                        {task.collaborators.slice(0, 3).map((c, i) => (
                            <div key={c.id} className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] uppercase font-bold text-white z-10" style={{ zIndex: 10 - i }} title={c.name}>
                                {c.name.slice(0, 2)}
                            </div>
                        ))}
                        {task.collaborators.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-[10px] font-bold text-white z-0">
                                +{task.collaborators.length - 3}
                            </div>
                        )}
                    </div>
                ) : "-"}
            </td>

            {/* Status */}
            <td className="px-4 py-4 align-middle">
                <select value={task.status} onChange={(e) => onStatusChange(e.target.value as TaskStatus)} disabled={!canEdit}
                    className={`text-xs font-bold px-2 py-1 rounded-md border outline-none appearance-none cursor-pointer transition-colors
                        ${task.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            task.status === "STUCK" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                                task.status === "IN_PROGRESS" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                                    "bg-slate-800 text-slate-300 border-slate-700"}`}>
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="STUCK">Stuck</option>
                    <option value="COMPLETED">Completed</option>
                </select>
            </td>

            {/* Type */}
            <td className="px-4 py-4 align-middle">
                {task.type ? (
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide whitespace-nowrap">
                        {task.type}
                    </span>
                ) : "-"}
            </td>

            {/* Task Completion % */}
            <td className="px-4 py-4 align-middle relative">
                {showConfirmModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-in zoom-in-95 fade-in duration-200">
                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                <CheckCircle2 className="h-6 w-6 text-emerald-500" /> Task Completed?
                            </h3>
                            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                                You have updated the progress to <strong>100%</strong>. Do you want to mark this task&apos;s status as <strong>Completed</strong>?
                            </p>
                            <div className="flex justify-end gap-3 font-semibold">
                                <button onClick={() => {
                                    setShowConfirmModal(false);
                                    setTempProgress(progressPercent.toString());
                                }} className="px-4 py-2 rounded-xl text-sm text-white bg-slate-800 hover:bg-slate-700 transition-colors">
                                    No, Cancel
                                </button>
                                <button autoFocus onClick={() => {
                                    setShowConfirmModal(false);
                                    if (task.status !== "COMPLETED") onStatusChange("COMPLETED");
                                    onProgressChange(100);
                                }} className="px-4 py-2 rounded-xl text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-lg shadow-emerald-900/20">
                                    Yes, mark Completed
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`flex flex-col w-[120px] ${task.subTasks?.length ? 'opacity-90' : 'group/progress'}`} onClick={(!isEditingProgress && !task.subTasks?.length) ? startEditingProgress : undefined}>
                    {!isEditingProgress ? (
                        <div className={`flex flex-col gap-1.5 ${(canEdit && !task.subTasks?.length) ? 'cursor-pointer' : ''}`} title={canEdit && !task.subTasks?.length ? "Click to edit progress" : task.subTasks?.length ? "Auto-calculated from sub-tasks" : ""}>
                            <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                                <span>{progressPercent}%</span>
                                {canEdit && !task.subTasks?.length && <span className="text-[9px] text-indigo-400 uppercase tracking-wide opacity-0 group-hover/progress:opacity-100 transition-opacity">Click to edit</span>}
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${isDone ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${progressPercent}%` }} />
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleProgressSubmit} className="flex items-center gap-2 w-full animate-in fade-in zoom-in-95 duration-100" onClick={e => e.stopPropagation()}>
                            <input autoFocus type="number" min="0" max="100"
                                value={tempProgress}
                                onChange={e => setTempProgress(e.target.value)}
                                className="w-[60px] h-8 px-2 rounded-lg bg-slate-950 border border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 text-sm font-bold text-white outline-none placeholder:text-slate-600 transition-all text-center"
                                placeholder={"%"}
                            />
                            <button type="submit" className="h-8 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors shadow-lg shadow-indigo-900/20">
                                <CheckCircle2 className="h-4 w-4" />
                            </button>
                        </form>
                    )}
                </div>
            </td>

            {/* Priority */}
            <td className="px-4 py-4 align-middle">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${PRIORITY_COLORS[task.priority]}`}>
                    {task.priority}
                </span>
            </td>

            {/* Actions */}
            <td className="px-4 py-4 align-middle text-center">
                {canEdit && (
                    <div className="flex justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={onEdit} title="Edit Task" className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-md transition-colors"><Pencil className="h-4 w-4" /></button>
                        <button onClick={onDelete} title="Delete Task" className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-rose-500/10 rounded-md transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                )}
            </td>
        </tr>
    );
}

// ─── Modal Form ────────────────────────────────────────────────
function TaskModal({ mode, task, projects, users, onClose, onSuccess }: { mode: "create" | "edit"; task?: Task; projects: ProjectOpt[]; users: UserOpt[]; onClose: () => void; onSuccess: () => void }) {
    const isEdit = mode === "edit";
    const [form, setForm] = useState({
        title: task?.title ?? "",
        type: task?.type ?? "GENERAL",
        description: task?.description ?? "",
        projectId: task?.project.id ?? "",
        assigneeId: task?.assignee?.id ?? "",
        collaboratorIds: task?.collaborators?.map((c: { id: string }) => c.id) ?? [] as string[],
        priority: task?.priority ?? "MINOR",
        status: task?.status ?? "PENDING",
        startDate: task?.startDate ? task.startDate.split('T')[0] : "",
        endDate: task?.endDate ? task.endDate.split('T')[0] : "",
        fileUrl: task?.fileUrl ?? "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError("");
        try {
            const payload = {
                title: form.title,
                type: form.type,
                description: form.description || undefined,
                projectId: form.projectId,
                assigneeId: form.assigneeId || undefined,
                collaboratorIds: form.collaboratorIds,
                priority: form.priority,
                status: form.status,
                startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
                endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
                fileUrl: form.fileUrl || undefined,
            };

            if (isEdit && task) await api.patch(`/tasks/${task.id}`, payload);
            else await api.post("/tasks", payload);

            onSuccess();
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const apiErr = err as { response?: { data?: { message?: string } } };
                setError(apiErr.response?.data?.message || "Something went wrong saving the task.");
            } else {
                setError("Something went wrong saving the task.");
            }
        } finally {
            setLoading(false);
        }
    };

    const set = (k: string, v: string | string[]) => setForm(f => ({ ...f, [k]: v }));

    const toggleCollab = (id: string) => {
        setForm(f => ({
            ...f,
            collaboratorIds: f.collaboratorIds.includes(id)
                ? f.collaboratorIds.filter((c: string) => c !== id)
                : [...f.collaboratorIds, id]
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-150 p-4">
            <form onSubmit={handleSubmit} className="edt-card w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
                    <div>
                        <h3 className="text-base font-bold text-white">{isEdit ? "Edit Task" : "Create Task"}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{isEdit ? "Update task information" : "Add a new task to a project"}</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4 overflow-y-auto">
                    {error && <p className="text-xs text-rose-400 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">{error}</p>}

                    {!isEdit && (
                        <Field label="Project *">
                            <select required value={form.projectId} onChange={e => set("projectId", e.target.value)}
                                className="w-full h-9 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors">
                                <option value="">Select a project…</option>
                                {projects.map((p: ProjectOpt) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </Field>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Task Title *">
                            <input required value={form.title} onChange={e => set("title", e.target.value)}
                                placeholder="What needs to be done?"
                                className="w-full h-9 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-colors" />
                        </Field>
                        <Field label="Task Type">
                            <div className="flex gap-2 items-center">
                                <select value={["GENERAL", "FEATURE", "BUG", "MEETING"].includes(form.type) ? form.type : "CUSTOM"}
                                    onChange={e => {
                                        if (e.target.value === "CUSTOM") set("type", "OTHER");
                                        else set("type", e.target.value);
                                    }}
                                    className="w-1/2 h-9 px-3 flex-1 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors">
                                    <option value="GENERAL">General Task</option>
                                    <option value="FEATURE">Feature</option>
                                    <option value="BUG">Bug Fix</option>
                                    <option value="MEETING">Meeting</option>
                                    <option value="CUSTOM">Custom...</option>
                                </select>
                                {!["GENERAL", "FEATURE", "BUG", "MEETING"].includes(form.type) && (
                                    <input value={form.type} onChange={e => set("type", e.target.value)}
                                        placeholder="Custom type" autoFocus
                                        className="w-1/2 h-9 px-3 flex-1 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors" />
                                )}
                            </div>
                        </Field>
                    </div>

                    <Field label="Description">
                        <textarea rows={3} value={form.description} onChange={e => set("description", e.target.value)}
                            placeholder="Add details…"
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500 resize-none transition-colors" />
                    </Field>

                    <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-4">
                        <Field label="Assign To *">
                            <select required value={form.assigneeId} onChange={e => set("assigneeId", e.target.value)}
                                className="w-full h-9 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors">
                                <option value="">Select Assignee…</option>
                                {users.map((u: UserOpt) => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Collaborators">
                            <div className="relative group z-50">
                                <div className="w-full h-9 px-3 rounded-xl bg-slate-900 border border-slate-700 flex items-center text-sm text-slate-400 cursor-pointer">
                                    {form.collaboratorIds.length} selected
                                </div>
                                <div className="absolute top-full pt-1 left-0 w-full z-50 hidden group-hover:block">
                                    <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 max-h-[200px] overflow-y-auto">
                                        {users.filter((u: UserOpt) => u.id !== form.assigneeId).length === 0 ? (
                                            <div className="text-xs text-slate-400 text-center py-2">No other users</div>
                                        ) : (
                                            users.filter((u: UserOpt) => u.id !== form.assigneeId).map((u: UserOpt) => (
                                                <label key={u.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-700 rounded cursor-pointer">
                                                    <input type="checkbox" checked={form.collaboratorIds.includes(u.id)} onChange={() => toggleCollab(u.id)}
                                                        className="rounded bg-slate-900 border-slate-600 text-indigo-500 focus:ring-indigo-500" />
                                                    <span className="text-sm text-slate-200">{u.name}</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Priority">
                            <select value={form.priority} onChange={e => set("priority", e.target.value)}
                                className="w-full h-9 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors">
                                <option value="MINOR">Minor</option>
                                <option value="MAJOR">Major</option>
                                <option value="HIGH">High</option>
                                <option value="CRITICAL">Critical</option>
                            </select>
                        </Field>
                        <Field label="Status">
                            <select value={form.status} onChange={e => set("status", e.target.value)}
                                className="w-full h-9 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors">
                                <option value="PENDING">Pending</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="STUCK">Stuck</option>
                                <option value="COMPLETED">Completed</option>
                            </select>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Start Date">
                            <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)}
                                className="w-full h-9 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]" />
                        </Field>
                        <Field label="End Date (Deadline)">
                            <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)}
                                className="w-full h-9 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]" />
                        </Field>
                    </div>

                    <Field label="Attachment URL (Upload)">
                        <input type="url" value={form.fileUrl} onChange={e => set("fileUrl", e.target.value)}
                            placeholder="https://drive.google.com/..."
                            className="w-full h-9 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-colors" />
                    </Field>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-800 shrink-0">
                    <button type="button" onClick={onClose}
                        className="h-9 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-300 hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button type="submit" disabled={loading}
                        className="h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-sm font-semibold text-white flex items-center justify-center min-w-[100px] transition-colors">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Save Changes" : "Create Task"}
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
