"use client";
import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    Briefcase, CheckSquare, AlertTriangle, CalendarDays,
    Clock, ArrowRight, ChevronRight, Plus,
    CheckCircle2,
    CalendarCheck, CalendarX, Loader2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────────
type TaskFilter = "today" | "week" | "overdue" | "critical";

interface PMProject {
    id: string; name: string; status: string;
    progress: number; endDate: string | null;
    overdueTasks: number; totalTasks: number;
}

interface PMTask {
    id: string; title: string; priority: string; status: string;
    progress: number; endDate: string | null;
    isOverdue: boolean;
    project: { id: string; name: string } | null;
    assignee: { id: string; name: string; avatar: string | null } | null;
    subtaskCount: number; subtaskDone: number; subtaskPct: number | null;
}

interface PMEvent {
    id: string; title: string; type: string;
    startDate: string; endDate: string | null;
    project: { id: string; name: string } | null;
    myStatus: string; declineReason: string | null;
}

interface PMData {
    kpis: { myProjects: number; pendingTasks: number; overdueTasks: number; todayEvents: number };
    myProjects: PMProject[];
    myTasks: PMTask[];
    myEvents: { upcoming: PMEvent[]; pendingApproval: PMEvent[]; declined: PMEvent[] };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
    IN_PROGRESS: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    PENDING: "text-slate-400 bg-slate-500/10 border-slate-500/20",
    STUCK: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    COMPLETED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

const PRIORITY_COLOR: Record<string, { dot: string; label: string }> = {
    CRITICAL: { dot: "bg-rose-500", label: "Critical" },
    HIGH: { dot: "bg-orange-400", label: "High" },
    MAJOR: { dot: "bg-amber-400", label: "Major" },
    MINOR: { dot: "bg-slate-500", label: "Minor" },
};

function fmtDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function fmtTime(d: string) {
    return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function daysLeft(d: string | null): string {
    if (!d) return "";
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    if (diff === 0) return "due today";
    return `${diff}d left`;
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ title, value, sub, icon: Icon, accent, pulse }:
    { title: string; value: number; sub: string; icon: React.ElementType; accent: string; pulse?: boolean }) {
    return (
        <div className="edt-card p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${accent}`}>
                <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">{title}</p>
                <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold text-white ${pulse && value > 0 ? "text-rose-400" : ""}`}>{value}</span>
                    <span className="text-[11px] text-slate-500">{sub}</span>
                </div>
            </div>
        </div>
    );
}

// ── Project Card ──────────────────────────────────────────────────────────────
function ProjectCard({ p }: { p: PMProject }) {
    const statusCls = STATUS_COLOR[p.status] ?? STATUS_COLOR.PENDING;
    return (
        <Link href={`/dashboard/projects/${p.id}`}
            className="group flex items-center gap-4 p-4 rounded-xl border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/40 transition-all">
            {/* Progress ring */}
            <div className="relative w-10 h-10 shrink-0">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#6366f1" strokeWidth="3"
                        strokeDasharray={`${(p.progress / 100) * 94.2} 94.2`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
                    {p.progress}%
                </span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">{p.name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${statusCls}`}>
                        {p.status.replace("_", " ")}
                    </span>
                    {p.overdueTasks > 0 && (
                        <span className="text-[10px] font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle className="h-2.5 w-2.5" />{p.overdueTasks} overdue
                        </span>
                    )}
                    {p.endDate && (
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />{fmtDate(p.endDate)}
                        </span>
                    )}
                </div>
            </div>
            <div className="text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0">
                <ChevronRight className="h-4 w-4" />
            </div>
        </Link>
    );
}

// ── Task Row ──────────────────────────────────────────────────────────────────
function TaskRow({ t }: { t: PMTask }) {
    const pri = PRIORITY_COLOR[t.priority] ?? PRIORITY_COLOR.MINOR;
    const daysStr = daysLeft(t.endDate);
    return (
        <Link href={`/dashboard/tasks/${t.id}`}
            className="group flex items-start gap-3 p-3.5 rounded-xl border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/30 transition-all">
            {/* Priority dot */}
            <div className="mt-1 shrink-0 flex flex-col items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${pri.dot}`} title={pri.label} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white">{t.title}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {t.project && (
                        <span className="text-[10px] text-indigo-400 truncate max-w-[120px]">{t.project.name}</span>
                    )}
                    {t.subtaskPct !== null && (
                        <span className="text-[10px] text-slate-500">
                            subtasks {t.subtaskDone}/{t.subtaskCount} ({t.subtaskPct}%)
                        </span>
                    )}
                </div>
                {/* Progress bar */}
                {t.progress > 0 && (
                    <div className="mt-2 h-1 w-full rounded-full bg-slate-800">
                        <div className="h-1 rounded-full bg-indigo-500 transition-all"
                            style={{ width: `${t.progress}%` }} />
                    </div>
                )}
            </div>
            <div className="text-right shrink-0 min-w-[60px]">
                <span className={`text-[10px] font-medium ${t.isOverdue ? "text-rose-400" : "text-slate-500"}`}>
                    {daysStr || fmtDate(t.endDate)}
                </span>
                {t.assignee && (
                    <div className="mt-1 flex items-center justify-end gap-1">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-[7px] font-bold text-white">
                            {t.assignee.name.charAt(0)}
                        </div>
                    </div>
                )}
            </div>
        </Link>
    );
}

// ── Event Row ─────────────────────────────────────────────────────────────────
function EventRow({ e, variant }: { e: PMEvent; variant: "upcoming" | "pending" | "declined" }) {
    return (
        <Link href={`/dashboard/events`}
            className="group flex items-center gap-3 p-3.5 rounded-xl border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/30 transition-all">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0
                ${variant === "upcoming" ? "bg-blue-500/10 text-blue-400" :
                    variant === "pending" ? "bg-amber-500/10 text-amber-400" :
                        "bg-rose-500/10 text-rose-400"}`}>
                {variant === "upcoming" ? <CalendarCheck className="h-4 w-4" /> :
                    variant === "pending" ? <Clock className="h-4 w-4" /> :
                        <CalendarX className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white">{e.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500">{fmtDate(e.startDate)} · {fmtTime(e.startDate)}</span>
                    {e.project && <span className="text-[10px] text-indigo-400 truncate">{e.project.name}</span>}
                </div>
                {variant === "declined" && e.declineReason && (
                    <p className="text-[10px] text-rose-400 mt-0.5 italic truncate">&ldquo;{e.declineReason}&rdquo;</p>
                )}
            </div>
            <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0" />
        </Link>
    );
}

// ── Quick Create FAB ──────────────────────────────────────────────────────────
function QuickCreate() {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    return (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
            {open && (
                <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <button onClick={() => { setOpen(false); router.push("/dashboard/tasks?new=1"); }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-sm font-medium text-white hover:border-indigo-500/50 hover:bg-slate-700 transition-all shadow-xl">
                        <CheckSquare className="h-4 w-4 text-indigo-400" /> Create Task
                    </button>
                    <button onClick={() => { setOpen(false); router.push("/dashboard/events?new=1"); }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-sm font-medium text-white hover:border-indigo-500/50 hover:bg-slate-700 transition-all shadow-xl">
                        <CalendarDays className="h-4 w-4 text-blue-400" /> Create Event
                    </button>
                </div>
            )}
            <button onClick={() => setOpen(v => !v)}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-200
                    ${open ? "bg-rose-500 border-rose-400 rotate-45" : "bg-indigo-600 border-indigo-500 hover:bg-indigo-500"} border text-white`}>
                <Plus className="h-5 w-5" />
            </button>
        </div>
    );
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ title, sub, href }: { title: string; sub?: string; href?: string }) {
    return (
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div>
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
            </div>
            {href && (
                <Link href={href} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            )}
        </div>
    );
}

// ── Filter Tab ────────────────────────────────────────────────────────────────
function FilterTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all
                ${active ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
            {label}
        </button>
    );
}

const TASK_FILTERS: { key: TaskFilter; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "overdue", label: "Overdue" },
    { key: "critical", label: "Critical" },
];

type EventTab = "upcoming" | "pendingApproval" | "declined";
const EVENT_TABS: { key: EventTab; label: string; icon: React.ElementType }[] = [
    { key: "upcoming", label: "Upcoming", icon: CalendarCheck },
    { key: "pendingApproval", label: "Pending", icon: Clock },
    { key: "declined", label: "Declined", icon: CalendarX },
];

// ── Main Component ────────────────────────────────────────────────────────────
export function ProjectManagerDashboard() {
    const [taskFilter, setTaskFilter] = useState<TaskFilter>("week");
    const [eventTab, setEventTab] = useState<EventTab>("upcoming");

    const { data, isLoading, isError } = useQuery({
        queryKey: ["pm-dashboard", taskFilter],
        queryFn: async () => {
            const res = await api.get(`/dashboard/pm?filter=${taskFilter}`);
            return res.data.data as PMData;
        },
        refetchInterval: 30000,
    });

    const handleTaskFilter = useCallback((f: TaskFilter) => setTaskFilter(f), []);

    if (isLoading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
        </div>
    );

    if (isError || !data) return (
        <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
            Failed to load dashboard data.
        </div>
    );

    const { kpis, myProjects, myTasks, myEvents } = data;
    const currentEvents = myEvents[eventTab] ?? [];

    return (
        <div className="space-y-6 pb-20">

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <KpiCard title="My Projects" value={kpis.myProjects} sub="assigned" icon={Briefcase} accent="text-indigo-400 bg-indigo-500/10" />
                <KpiCard title="Pending Tasks" value={kpis.pendingTasks} sub="active" icon={CheckSquare} accent="text-emerald-400 bg-emerald-500/10" />
                <KpiCard title="Overdue Tasks" value={kpis.overdueTasks} sub="late" icon={AlertTriangle} accent="text-rose-400 bg-rose-500/10" pulse />
                <KpiCard title="Today's Events" value={kpis.todayEvents} sub="today" icon={CalendarDays} accent="text-blue-400 bg-blue-500/10" />
            </div>

            {/* ── 3-column grid: Projects + Tasks + Events ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

                {/* ── A. My Projects Snapshot ── */}
                <div className="edt-card overflow-hidden">
                    <SectionHeader title="My Projects" sub={`${myProjects.length} assigned`} href="/dashboard/projects" />
                    <div className="p-4 space-y-2 max-h-[420px] overflow-y-auto">
                        {myProjects.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-600 gap-2">
                                <Briefcase className="h-6 w-6 opacity-30" />
                                <p className="text-xs">No projects assigned yet</p>
                            </div>
                        ) : (
                            myProjects.map(p => <ProjectCard key={p.id} p={p} />)
                        )}
                    </div>
                </div>

                {/* ── B. My Tasks ── */}
                <div className="edt-card overflow-hidden">
                    <SectionHeader title="My Tasks" sub="Filtered by deadline" href="/dashboard/tasks" />
                    {/* Filter tabs */}
                    <div className="flex items-center gap-1 px-4 py-2.5 border-b border-slate-800">
                        {TASK_FILTERS.map(f => (
                            <FilterTab key={f.key} label={f.label} active={taskFilter === f.key}
                                onClick={() => handleTaskFilter(f.key)} />
                        ))}
                    </div>
                    <div className="p-4 space-y-2 max-h-[360px] overflow-y-auto">
                        {myTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-600 gap-2">
                                <CheckCircle2 className="h-6 w-6 opacity-30" />
                                <p className="text-xs">No tasks for this filter</p>
                            </div>
                        ) : (
                            myTasks.map(t => <TaskRow key={t.id} t={t} />)
                        )}
                    </div>
                </div>

                {/* ── C. My Events ── */}
                <div className="edt-card overflow-hidden">
                    <SectionHeader title="My Events" sub="Your schedule" href="/dashboard/events" />
                    {/* Event tabs */}
                    <div className="flex items-center border-b border-slate-800">
                        {EVENT_TABS.map(tab => {
                            const count = myEvents[tab.key]?.length ?? 0;
                            return (
                                <button key={tab.key} onClick={() => setEventTab(tab.key)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all border-b-2
                                        ${eventTab === tab.key
                                            ? "text-indigo-400 border-indigo-500"
                                            : "text-slate-500 border-transparent hover:text-white"}`}>
                                    <tab.icon className="h-3.5 w-3.5" />
                                    {tab.label}
                                    {count > 0 && (
                                        <span className={`min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center
                                            ${eventTab === tab.key ? "bg-indigo-500 text-white" : "bg-slate-700 text-slate-400"}`}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <div className="p-4 space-y-2 max-h-[360px] overflow-y-auto">
                        {currentEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-600 gap-2">
                                <CalendarDays className="h-6 w-6 opacity-30" />
                                <p className="text-xs">No {eventTab} events</p>
                            </div>
                        ) : (
                            currentEvents.map(e => (
                                <EventRow key={e.id} e={e}
                                    variant={eventTab === "pendingApproval" ? "pending" :
                                        eventTab === "declined" ? "declined" : "upcoming"} />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ── D. Floating Quick Create Button ── */}
            <QuickCreate />
        </div>
    );
}
