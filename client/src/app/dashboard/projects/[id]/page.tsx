"use client";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    ArrowLeft, CalendarDays, Users,
    CheckSquare, Activity, Loader2, AlertTriangle,
    Clock
} from "lucide-react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────
interface ProjectDetails {
    id: string;
    name: string;
    description?: string;
    status: "IN_PROGRESS" | "PENDING" | "STUCK" | "COMPLETED";
    progress: number;
    startDate?: string;
    endDate?: string;
    manager: { id: string; name: string; avatar?: string };
    arr?: { id: string; name: string; designation?: string };
    employees: Array<{ user: { id: string; name: string; role: string; avatar?: string } }>;
    tasks: Array<{ id: string; title: string; status: string; priority: string }>;
    events: Array<{ id: string; title: string; startDate: string; status: string }>;
}

const fetchProject = async (id: string): Promise<ProjectDetails> => {
    const res = await api.get(`/projects/${id}`);
    return res.data.data;
};

const STATUS_COLORS = {
    IN_PROGRESS: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    PENDING: "text-slate-400 bg-slate-500/10 border-slate-500/20",
    STUCK: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    COMPLETED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};
const STATUS_LABELS = { IN_PROGRESS: "In Progress", PENDING: "Pending", STUCK: "Stuck", COMPLETED: "Completed" };

export default function ProjectDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { data: project, isLoading, isError } = useQuery({
        queryKey: ["project", id],
        queryFn: () => fetchProject(id),
    });

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm">Loading project details…</p>
        </div>
    );

    if (isError || !project) return (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
            <AlertTriangle className="h-8 w-8 text-rose-500" />
            <p className="text-sm text-slate-400">Failed to load project details</p>
            <button onClick={() => router.back()} className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm">
                Go Back
            </button>
        </div>
    );

    const pmInitials = project.manager.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    const arrInitials = project.arr?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "—";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
                <button onClick={() => router.back()}
                    className="mt-1 p-2 rounded-xl bg-slate-900 border border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight text-white">{project.name}</h1>
                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${STATUS_COLORS[project.status]}`}>
                            {STATUS_LABELS[project.status]}
                        </span>
                    </div>
                    {project.description && (
                        <p className="text-sm text-slate-400 mt-2 max-w-3xl leading-relaxed">{project.description}</p>
                    )}
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard icon={CheckSquare} label="Tasks Overview" value={`${project.tasks.filter(t => t.status === 'COMPLETED').length}/${project.tasks.length} Done`} />
                <StatCard icon={CalendarDays} label="Timeline" value={project.startDate ? `${new Date(project.startDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} - ${project.endDate ? new Date(project.endDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) : 'TBD'}` : "Not set"} />
                <StatCard icon={Users} label="Team Size" value={`${project.employees.length + 1} Members`} />
                <StatCard icon={Activity} label="Overall Progress" value={`${project.progress}%`} isProgress progress={project.progress} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left Column - Main Details */}
                <div className="xl:col-span-2 space-y-6">
                    {/* Tasks Preview */}
                    <div className="edt-card p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <CheckSquare className="h-4 w-4 text-indigo-400" /> Recent Tasks
                            </h3>
                            <Link href="/dashboard/tasks" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">View All</Link>
                        </div>
                        <div className="space-y-2">
                            {project.tasks.length === 0 ? (
                                <p className="text-sm text-slate-500 py-4 text-center">No tasks assigned yet.</p>
                            ) : project.tasks.slice(0, 5).map(task => (
                                <div key={task.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800/60">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${task.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                                        <span className={`text-sm font-medium ${task.status === 'COMPLETED' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                            {task.title}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 py-1 rounded bg-slate-800">
                                        {task.priority}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Events Preview */}
                    <div className="edt-card p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-emerald-400" /> Linked Events
                            </h3>
                            <Link href="/dashboard/events" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">View All</Link>
                        </div>
                        <div className="space-y-2">
                            {project.events.length === 0 ? (
                                <p className="text-sm text-slate-500 py-4 text-center">No events scheduled.</p>
                            ) : project.events.slice(0, 3).map(event => (
                                <div key={event.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800/60">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex flex-col items-center justify-center shrink-0">
                                            <span className="text-[9px] font-bold text-slate-500 uppercase leading-none">{new Date(event.startDate).toLocaleDateString('en-GB', { month: 'short' })}</span>
                                            <span className="text-xs font-bold text-white leading-none mt-0.5">{new Date(event.startDate).getDate()}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-200">{event.title}</p>
                                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                <Clock className="h-3 w-3" /> {new Date(event.startDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${event.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                        {event.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column - Team & Info */}
                <div className="space-y-6">
                    <div className="edt-card p-5">
                        <h3 className="text-sm font-bold text-white mb-4">Leadership</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-sm font-bold text-indigo-400 shrink-0">
                                    {pmInitials}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">{project.manager.name}</p>
                                    <p className="text-[11px] text-slate-500">Project Manager</p>
                                </div>
                            </div>
                            {project.arr && (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-sm font-bold text-rose-400 shrink-0">
                                        {arrInitials}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">{project.arr.name}</p>
                                        <p className="text-[11px] text-slate-500">ARR · {project.arr.designation}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="edt-card p-5">
                        <h3 className="text-sm font-bold text-white mb-4">Team Members ({project.employees.length})</h3>
                        <div className="space-y-3">
                            {project.employees.length === 0 ? (
                                <p className="text-sm text-slate-500">No employees assigned.</p>
                            ) : project.employees.map(({ user }) => {
                                const initials = user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                                return (
                                    <div key={user.id} className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                                            {initials}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-200 truncate">{user.name}</p>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user.role}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, isProgress, progress }: { icon: React.ElementType; label: string; value: string; isProgress?: boolean; progress?: number }) {
    return (
        <div className="edt-card p-4 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-slate-800">
                    <Icon className="h-4 w-4 text-indigo-400" />
                </div>
                <p className="text-xs font-semibold text-slate-400">{label}</p>
            </div>
            <p className="text-xl font-bold text-white tracking-tight">{value}</p>
            {isProgress && progress !== undefined && (
                <div className="mt-3 flex-1 edt-progress-track h-1.5 w-full">
                    <div className="edt-progress-fill h-1.5" style={{ width: `${progress}%` }} />
                </div>
            )}
        </div>
    );
}
