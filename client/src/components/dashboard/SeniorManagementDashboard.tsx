"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    Briefcase,
    CheckSquare,
    AlertTriangle,
    CalendarDays,
    TrendingUp,
    CheckCircle2,
    Clock,
    AlertCircle,
    User,
    Calendar,
    Lightbulb,
    ArrowRight,
    FolderKanban
} from "lucide-react";

// Types corresponding to the API response
interface ExecutiveData {
    kpis: {
        totalProjects: number;
        runningProjects: number;
        stuckProjects: number;
        pendingProjects: number;
        completedProjects: number;
        totalActiveTasks: number;
        overdueTasks: number;
        approvalPendingEvents: number;
    };
    projectHealth: Array<{
        id: string;
        name: string;
        arr: string;
        pm: string;
        progress: number;
        status: string;
        overdueTasksCount: number;
        upcomingEventsCount: number;
        isDelayed: boolean;
    }>;
    risks: {
        overdueTasks: Array<{ id: string; title: string; project?: string }>;
        idleProjects: Array<{ id: string; name: string; daysIdle: number }>;
        conflictEvents: Array<{ id: string; title: string }>;
    };
    schedule: {
        today: { tasks: Array<{ id: string; title: string }>; events: Array<{ id: string; title: string }> };
        week: { tasks: Array<{ id: string; title: string }>; events: Array<{ id: string; title: string }> };
    };
    calendarEvents: Array<{
        id: string;
        title: string;
        startDate: string;
        endDate: string;
        hasConflict: boolean;
    }>;
    decisions: Array<{
        id: string;
        summary: string;
        eventName: string;
        projectName: string | null;
        convertedToTask: boolean;
        taskId: string | null;
        taskTitle: string | null;
        taskStatus: string | null;
        taskProgress: number | null;
        assigneeName: string | null;
        assigneeAvatar: string | null;
        createdAt: string;
    }>;
    trend: Array<{ month: string; completed: number }>;
}

export function SeniorManagementDashboard() {
    const { data: executiveData, isLoading, error } = useQuery<ExecutiveData>({
        queryKey: ["dashboard-executive"],
        queryFn: async () => {
            const res = await api.get("/dashboard/executive");
            return res.data.data;
        },
        refetchInterval: 60000, // Refresh every minute for real-time vibe
    });

    const [scheduleTab, setScheduleTab] = useState<"today" | "week">("today");

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                <span className="ml-3 text-slate-400">Loading Executive Override...</span>
            </div>
        );
    }

    if (error || !executiveData) {
        return (
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 font-medium text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Failed to fetch executive data. Please check connection.
                </p>
            </div>
        );
    }

    const { kpis, projectHealth, risks, schedule, calendarEvents, decisions, trend } = executiveData;

    return (
        <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
            {/* A. Executive KPI Summary (Top Row - Snapshot View) */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                <MetricCard title="Total Projects" value={kpis.totalProjects} icon={Briefcase} color="indigo" />
                <MetricCard title="Running" value={kpis.runningProjects} icon={TrendingUp} color="emerald" />
                <MetricCard title="Pending" value={kpis.pendingProjects} icon={Clock} color="slate" />
                <MetricCard title="Stuck" value={kpis.stuckProjects} icon={AlertTriangle} color="rose" />
                <MetricCard title="Completed" value={kpis.completedProjects} icon={CheckCircle2} color="green" />
                <MetricCard title="Active Tasks" value={kpis.totalActiveTasks} icon={CheckSquare} color="blue" />
                <MetricCard title="Overdue Tasks" value={kpis.overdueTasks} icon={AlertCircle} color="red" alert={kpis.overdueTasks > 0} />
                <MetricCard title="Pending Approv" value={kpis.approvalPendingEvents} icon={User} color="amber" alert={kpis.approvalPendingEvents > 0} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Left Column: B, F - Takes up 2/3 space on large screens */}
                <div className="xl:col-span-2 space-y-6">
                    {/* B. Project Health Overview (Critical Section) */}
                    <div className="edt-card rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/50 backdrop-blur-md shadow-xl">
                        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                                    Project Health Overview
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">Status of all monitored scopes</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-[11px] uppercase tracking-wider text-slate-500 bg-slate-900/80">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold">Project Name</th>
                                        <th className="px-6 py-3 font-semibold">ARR / PM</th>
                                        <th className="px-6 py-3 font-semibold">Status</th>
                                        <th className="px-6 py-3 font-semibold">Completion %</th>
                                        <th className="px-6 py-3 font-semibold text-right">Warnings</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {projectHealth.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-800/40 transition-colors group cursor-pointer">
                                            <td className="px-6 py-4 font-medium text-slate-200">{p.name}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-white text-xs">{p.arr}</div>
                                                <div className="text-slate-500 text-[10px] uppercase tracking-wide">{p.pm}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${p.status === 'IN_PROGRESS' ? 'bg-indigo-500/10 text-indigo-400' :
                                                    p.status === 'STUCK' ? 'bg-rose-500/10 text-rose-400' :
                                                        p.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' :
                                                            'bg-slate-500/10 text-slate-400'
                                                    }`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 max-w-[120px]">
                                                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${p.isDelayed ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${p.progress}%` }} />
                                                    </div>
                                                    <span className="text-[11px] font-mono text-slate-400">{p.progress}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {p.isDelayed && (
                                                        <span className="flex items-center gap-1 text-[10px] text-rose-400 font-medium bg-rose-500/10 px-1.5 py-0.5 rounded">
                                                            Delayed
                                                        </span>
                                                    )}
                                                    {p.overdueTasksCount > 0 && (
                                                        <span className="flex items-center gap-1 text-[10px] text-amber-400 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded" title={`${p.overdueTasksCount} overdue tasks`}>
                                                            <Clock className="w-3 h-3" /> {p.overdueTasksCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {projectHealth.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">No projects found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* F. Decision Traceability Panel */}
                    <div className="edt-card rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/50 backdrop-blur-md shadow-xl">
                        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                                    <Lightbulb className="h-4 w-4 text-amber-400" /> Decision Traceability
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">USP</span>
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">Meeting decisions → task execution chain</p>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-800/50">
                            {decisions.map(d => (
                                <div key={d.id} className="p-4 hover:bg-slate-800/20 transition-colors">
                                    {/* Decision text */}
                                    <p className="text-sm font-medium text-slate-200 line-clamp-2 mb-3">{d.summary}</p>

                                    {/* Chain: Event → Project → Task */}
                                    <div className="flex items-center gap-2 text-[11px] flex-wrap">
                                        {/* Event */}
                                        <span className="flex items-center gap-1.5 bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-700/50">
                                            <Calendar className="h-3 w-3 text-indigo-400 shrink-0" />
                                            <span className="text-slate-300 font-medium truncate max-w-[100px]">{d.eventName}</span>
                                        </span>

                                        {d.projectName && (
                                            <>
                                                <ArrowRight className="h-3 w-3 text-slate-600 shrink-0" />
                                                {/* Project */}
                                                <span className="flex items-center gap-1.5 bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-700/50">
                                                    <FolderKanban className="h-3 w-3 text-purple-400 shrink-0" />
                                                    <span className="text-slate-300 font-medium truncate max-w-[100px]">{d.projectName}</span>
                                                </span>
                                            </>
                                        )}

                                        {d.convertedToTask ? (
                                            <>
                                                <ArrowRight className="h-3 w-3 text-slate-600 shrink-0" />
                                                {/* Task */}
                                                <span className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/25">
                                                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                                                    <span className="text-emerald-300 font-medium truncate max-w-[100px]">{d.taskTitle}</span>
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <ArrowRight className="h-3 w-3 text-slate-600 shrink-0" />
                                                <span className="flex items-center gap-1.5 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/25">
                                                    <AlertCircle className="h-3 w-3 text-amber-400 shrink-0" />
                                                    <span className="text-amber-300 font-medium">No Task</span>
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Task details row */}
                                    {d.convertedToTask && (
                                        <div className="mt-3 flex items-center gap-3">
                                            {/* Progress Bar */}
                                            {d.taskProgress !== null && (
                                                <div className="flex-1 flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${d.taskStatus === 'COMPLETED' ? 'bg-emerald-500' :
                                                                    d.taskStatus === 'STUCK' ? 'bg-rose-500' : 'bg-indigo-500'
                                                                }`}
                                                            style={{ width: `${d.taskProgress}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-mono text-slate-500 shrink-0">{d.taskProgress}%</span>
                                                </div>
                                            )}

                                            {/* Status Badge */}
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${d.taskStatus === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' :
                                                    d.taskStatus === 'IN_PROGRESS' ? 'bg-indigo-500/10 text-indigo-400' :
                                                        d.taskStatus === 'STUCK' ? 'bg-rose-500/10 text-rose-400' :
                                                            'bg-slate-500/10 text-slate-400'
                                                }`}>{d.taskStatus}</span>

                                            {/* Assignee */}
                                            {d.assigneeName && (
                                                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                                    <User className="h-3 w-3" /> {d.assigneeName}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {decisions.length === 0 && (
                                <div className="p-8 flex flex-col items-center text-slate-600">
                                    <Lightbulb className="h-7 w-7 mb-2 opacity-40" />
                                    <p className="text-sm">No decisions logged yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: C, D, E */}
                <div className="space-y-6">
                    {/* C. Stuck / Risk Alert Panel */}
                    <div className="edt-card rounded-2xl overflow-hidden border border-rose-900/30 bg-rose-950/10 backdrop-blur-md shadow-xl relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-rose-500 to-amber-500" />
                        <div className="px-5 py-4 border-b border-rose-900/30 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                            <h3 className="text-sm font-semibold text-rose-400 tracking-tight">Governance Alert Zone</h3>
                        </div>
                        <div className="p-4 space-y-4">
                            {risks.overdueTasks.length > 0 && (
                                <div>
                                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Overdue Tasks ({'>'}3 Days)</h4>
                                    <div className="space-y-2">
                                        {risks.overdueTasks.slice(0, 3).map(t => (
                                            <div key={t.id} className="text-xs text-slate-300 bg-slate-900/50 p-2 rounded border border-rose-500/20">
                                                <span className="font-medium">{t.project}:</span> {t.title}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {risks.idleProjects.length > 0 && (
                                <div>
                                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Idle Projects</h4>
                                    <div className="space-y-2">
                                        {risks.idleProjects.map(p => (
                                            <div key={p.id} className="text-xs text-slate-300 bg-slate-900/50 p-2 rounded border border-amber-500/20 flex justify-between">
                                                <span>{p.name}</span>
                                                <span className="text-amber-500 font-mono">{p.daysIdle}d idle</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {risks.conflictEvents.length > 0 && (
                                <div>
                                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Conflict Events Pending</h4>
                                    <div className="space-y-2">
                                        {risks.conflictEvents.map(e => (
                                            <div key={e.id} className="text-xs text-rose-300 bg-rose-950/30 p-2 rounded border border-rose-500/30">
                                                {e.title}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {risks.overdueTasks.length === 0 && risks.idleProjects.length === 0 && risks.conflictEvents.length === 0 && (
                                <div className="text-xs text-emerald-400 p-2 text-center bg-emerald-500/10 rounded">
                                    All clear. No critical governance alerts.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* D. Today / This Week Overview */}
                    <div className="edt-card rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/50 backdrop-blur-md shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-800">
                            <button
                                onClick={() => setScheduleTab("today")}
                                className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${scheduleTab === "today" ? "text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5" : "text-slate-500 hover:text-slate-300"}`}
                            >
                                Today
                            </button>
                            <button
                                onClick={() => setScheduleTab("week")}
                                className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${scheduleTab === "week" ? "text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5" : "text-slate-500 hover:text-slate-300"}`}
                            >
                                This Week
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            {schedule[scheduleTab].events.length > 0 && (
                                <div>
                                    <h4 className="text-[11px] text-slate-500 font-medium mb-2">Events</h4>
                                    {schedule[scheduleTab].events.map((e: { id: string; title: string }) => (
                                        <div key={e.id} className="flex items-center gap-3 py-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                            <div className="text-xs text-slate-300">{e.title}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {schedule[scheduleTab].tasks.length > 0 && (
                                <div>
                                    <h4 className="text-[11px] text-slate-500 font-medium mb-2 mt-4">Deadlines</h4>
                                    {schedule[scheduleTab].tasks.map((t: { id: string; title: string }) => (
                                        <div key={t.id} className="flex items-center gap-3 py-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                            <div className="text-xs text-slate-300">{t.title}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {schedule[scheduleTab].events.length === 0 && schedule[scheduleTab].tasks.length === 0 && (
                                <div className="text-center text-xs text-slate-500 py-4">No schedule items for {scheduleTab}.</div>
                            )}
                        </div>
                    </div>

                    {/* E. Conflict Calendar Widget (Mini view) */}
                    <div className="edt-card rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/50 backdrop-blur-md shadow-xl">
                        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-white tracking-tight">Mini Calendar</h3>
                            <CalendarDays className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="p-4 grid grid-cols-7 gap-1">
                            {/* A very crude mini calendar visualization just for aesthetic/summary */}
                            {Array.from({ length: 14 }).map((_, i) => {
                                // Simulate days, mark red if it matches a conflict day count
                                const hasConflict = calendarEvents.some(e => e.hasConflict && new Date(e.startDate).getDate() === i + 1);
                                const hasEvent = calendarEvents.some(e => new Date(e.startDate).getDate() === i + 1);
                                return (
                                    <div key={i} className={`aspect-square rounded-md flex items-center justify-center text-[10px] cursor-pointer hover:scale-110 transition-transform ${hasConflict ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50' :
                                        hasEvent ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                                            'bg-slate-800/50 text-slate-500'
                                        }`}>
                                        {i + 1}
                                    </div>
                                );
                            })}
                            <div className="col-span-7 mt-3 flex items-center gap-4 justify-center text-[10px] text-slate-400 pt-2 border-t border-slate-800/50">
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-indigo-500/40 border border-indigo-500/50" /> Event</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-rose-500/40 border border-rose-500/50" /> Conflict</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* G. Project Completion Trend (Optional) */}
            <div className="edt-card rounded-2xl p-6 border border-slate-800 bg-slate-900/50 backdrop-blur-md shadow-xl flex items-end justify-between h-32">
                <div className="self-start">
                    <h3 className="text-sm font-semibold text-white">Project Completion Velocity</h3>
                    <p className="text-xs text-slate-500">Last 6 Months (Simulated Chart)</p>
                </div>
                <div className="flex items-end gap-2 h-full pt-4">
                    {trend.map((t, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 group">
                            <div className="w-12 bg-indigo-500/20 rounded-t-md relative group-hover:bg-indigo-500/40 transition-colors" style={{ height: `${Math.max(10, t.completed * 20)}px` }}>
                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                    {t.completed}
                                </div>
                            </div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest">{t.month}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ---- Sub Components ----
function MetricCard({ title, value, icon: Icon, color, alert }: { title: string; value: number | string; icon: React.ElementType; color: string; alert?: boolean }) {
    const colorMap: Record<string, string> = {
        indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
        emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
        amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        slate: "text-slate-400 bg-slate-500/10 border-slate-500/20",
        red: "text-red-500 bg-red-500/10 border-red-500/20 animate-pulse",
        green: "text-green-400 bg-green-500/10 border-green-500/20",
    };

    const cls = colorMap[color] || colorMap.slate;

    return (
        <div className={`relative p-4 rounded-2xl border bg-slate-900/40 backdrop-blur-md flex flex-col items-center justify-center text-center gap-2 transition-transform hover:scale-105 ${cls} ${alert ? "shadow-[0_0_15px_rgba(239,68,68,0.2)] border-red-500/40 ring-1 ring-red-500/20" : ""}`}>
            <Icon className="w-5 h-5 mb-1 opacity-80" />
            <div className="text-2xl font-black tracking-tighter text-white drop-shadow-md">{value}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">{title}</div>
            {alert && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-ping" />}
        </div>
    );
}
