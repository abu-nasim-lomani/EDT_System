"use client";
import { useState } from "react";
import {
    TrendingUp, TrendingDown, Briefcase, CheckSquare,
    CalendarDays, AlertTriangle, Download, Filter
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────
type Period = "7d" | "30d" | "90d" | "all";

type ReportData = {
    kpis: {
        completionRate: number;
        completedTasks: number;
        totalTasks: number;
        activeProjects: number;
        totalEvents: number;
        conflictRate: number;
        conflictCount: number;
    };
    projectStatus: { label: string; status: string; color: string; value: number; pct: number }[];
    taskTrend: { label: string; date: string; total: number; done: number }[];
    eventTypes: { label: string; count: number; color: string }[];
    teamPerformance: { name: string; initials: string; tasks: number; completion: number; color: string }[];
};

// ─── Donut Chart (pure SVG) ────────────────────────────────────
function DonutChart({ segments }: { segments: ReportData["projectStatus"] }) {
    const total = segments.reduce((s, i) => s + i.value, 0);
    const r = 54; const cx = 64; const cy = 64;
    const circumference = 2 * Math.PI * r;
    const gap = 3;
    let offset = 0;

    return (
        <svg viewBox="0 0 128 128" className="w-full h-full">
            {segments.map((seg, i) => {
                const pct = seg.value / total;
                const dash = circumference * pct - gap;
                const el = (
                    <circle
                        key={i}
                        cx={cx} cy={cy} r={r}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="16"
                        strokeDasharray={`${dash} ${circumference - dash}`}
                        strokeDashoffset={-offset * circumference / (2 * Math.PI * r) - circumference * 0.25}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dasharray 0.6s ease" }}
                    />
                );
                offset += dash + gap;
                return el;
            })}
            <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize="18" fontWeight="700">{total}</text>
            <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b" fontSize="8" fontWeight="500">PROJECTS</text>
        </svg>
    );
}

// ─── Bar Chart (pure SVG) ──────────────────────────────────────
function BarChart({ data }: { data: ReportData["taskTrend"] }) {
    const maxVal = Math.max(...data.map((d) => d.total));
    const W = 520; const H = 140; const barW = 40; const gap = 34;

    return (
        <svg viewBox={`0 0 ${W} ${H + 28}`} className="w-full" preserveAspectRatio="none" style={{ height: 160 }}>
            {data.map((d, i) => {
                const x = i * (barW + gap) + 18;
                const totalH = (d.total / maxVal) * H;
                const doneH = (d.done / maxVal) * H;
                const pct = Math.round((d.done / d.total) * 100);
                return (
                    <g key={i}>
                        {/* Background bar */}
                        <rect x={x} y={H - totalH} width={barW} height={totalH} rx="6" fill="hsl(217 33% 18%)" />
                        {/* Done bar */}
                        <rect x={x} y={H - doneH} width={barW} height={doneH} rx="6" fill="url(#barGrad)" style={{ transition: "height 0.5s ease" }} />
                        {/* Pct label */}
                        <text x={x + barW / 2} y={H - doneH - 6} textAnchor="middle" fill="#a5b4fc" fontSize="9" fontWeight="600">
                            {pct}%
                        </text>
                        {/* Day label */}
                        <text x={x + barW / 2} y={H + 18} textAnchor="middle" fill="#475569" fontSize="10">
                            {d.label}
                        </text>
                    </g>
                );
            })}
            <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#4f46e5" />
                </linearGradient>
            </defs>
        </svg>
    );
}

// ─── Main Page Component ───────────────────────────────────────
export default function ReportsPage() {
    const [period, setPeriod] = useState<Period>("30d");

    const { data: reportData, isLoading } = useQuery<ReportData>({
        queryKey: ["reports", period],
        queryFn: async () => {
            const res = await api.get(`/dashboard/reports?period=${period}`);
            return res.data.data;
        }
    });

    if (isLoading || !reportData) {
        return (
            <div className="flex h-[calc(100vh-100px)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    const { kpis, projectStatus, taskTrend, eventTypes, teamPerformance } = reportData;

    return (
        <div className="space-y-5">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Reports</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Decision-level analytics for senior management.</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Period selector */}
                    <div className="flex gap-1 bg-slate-900/80 rounded-xl p-1 border border-slate-800">
                        {(["7d", "30d", "90d", "all"] as Period[]).map((p) => (
                            <button key={p} onClick={() => setPeriod(p)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${period === p ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-white"}`}>
                                {p === "all" ? "All Time" : p}
                            </button>
                        ))}
                    </div>
                    <button className="flex items-center gap-2 h-9 px-4 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white hover:border-indigo-500/50 transition-colors">
                        <Filter className="h-3.5 w-3.5" /> Filter
                    </button>
                    <button className="flex items-center gap-2 h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-colors">
                        <Download className="h-3.5 w-3.5" /> Export
                    </button>
                </div>
            </div>

            {/* ── KPI Row ── */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <KPICard title="Task Completion Rate" value={`${kpis.completionRate}%`} sub={`${kpis.completedTasks}/${kpis.totalTasks} tasks`} trend="Based on period" up={kpis.completionRate > 50} icon={CheckSquare} cls="metric-icon-emerald" />
                <KPICard title="Active Projects" value={kpis.activeProjects} sub="Currently running" trend="Total in-progress" up icon={Briefcase} cls="metric-icon-indigo" />
                <KPICard title="Events Held" value={kpis.totalEvents} sub="This period" trend="Scheduled events" up icon={CalendarDays} cls="metric-icon-amber" />
                <KPICard title="Conflict Rate" value={`${kpis.conflictRate}%`} sub={`${kpis.conflictCount} active conflicts`} trend="Pending resolution" up={kpis.conflictRate < 10} icon={AlertTriangle} cls="metric-icon-rose" />
            </div>

            {/* ── Middle Row: Donut + Bar ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

                {/* Project Status Donut */}
                <div className="edt-card p-5">
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold text-white">Project Status</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Distribution across all projects</p>
                    </div>
                    {projectStatus.reduce((s, p) => s + p.value, 0) === 0 ? (
                        <div className="flex items-center justify-center h-48 text-sm text-slate-500">No projects data</div>
                    ) : (
                        <div className="flex items-center gap-5">
                            <div className="w-32 h-32 shrink-0">
                                <DonutChart segments={projectStatus} />
                            </div>
                            <div className="flex-1 space-y-2.5">
                                {projectStatus.map((seg) => (
                                    <div key={seg.label} className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
                                            <span className="text-xs text-slate-400">{seg.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-20 h-1 rounded-full bg-slate-800 overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${seg.pct}%`, background: seg.color }} />
                                            </div>
                                            <span className="text-xs font-bold text-white w-3 text-right">{seg.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Task Completion Bar Chart */}
                <div className="xl:col-span-2 edt-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-semibold text-white">Task Completion Trend</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Daily completed vs total tasks</p>
                        </div>
                        <div className="flex items-center gap-3 text-[11px]">
                            <span className="flex items-center gap-1.5 text-slate-500"><span className="w-2 h-2 rounded-sm bg-slate-700" /> Total</span>
                            <span className="flex items-center gap-1.5 text-indigo-400"><span className="w-2 h-2 rounded-sm bg-indigo-500" /> Completed</span>
                        </div>
                    </div>
                    {taskTrend.reduce((s, t) => s + t.total, 0) === 0 ? (
                        <div className="flex items-center justify-center h-40 text-sm text-slate-500">No tasks data in this period</div>
                    ) : (
                        <BarChart data={taskTrend} />
                    )}
                </div>
            </div>

            {/* ── Bottom Row: Event Breakdown + Team Performance ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

                {/* Event Type Breakdown */}
                <div className="edt-card p-5">
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold text-white">Event Breakdown</h3>
                        <p className="text-xs text-slate-500 mt-0.5">By type — {kpis.totalEvents} total events</p>
                    </div>
                    {eventTypes.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-sm text-slate-500">No events found</div>
                    ) : (
                        <div className="space-y-4">
                            {eventTypes.map((e) => {
                                const pct = Math.round((e.count / kpis.totalEvents) * 100);
                                return (
                                    <div key={e.label}>
                                        <div className="flex justify-between mb-1.5 text-xs">
                                            <span className="text-slate-300 font-medium">{e.label}</span>
                                            <span className="font-bold text-white">{e.count} <span className="text-slate-500 font-normal">({pct}%)</span></span>
                                        </div>
                                        <div className="edt-progress-track h-2">
                                            <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: e.color, transition: "width 0.6s ease" }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Team Performance */}
                <div className="edt-card overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-800">
                        <h3 className="text-sm font-semibold text-white">Team Performance</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Task completion rate by user</p>
                    </div>
                    {teamPerformance.length === 0 ? (
                        <div className="flex items-center justify-center p-8 text-sm text-slate-500">No active users found</div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {teamPerformance.map((team, i) => (
                                <div key={team.name} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-800/30 transition-colors">
                                    <span className="text-xs text-slate-600 w-4 font-mono">#{i + 1}</span>
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: team.color + "33", border: `1px solid ${team.color}44`, color: team.color }}>
                                        {team.initials}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-white">{team.name}</p>
                                        <p className="text-xs text-slate-500">{team.tasks} tasks assigned</p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                            <div className="h-full rounded-full" style={{ width: `${team.completion}%`, background: team.color, transition: "width 0.6s ease" }} />
                                        </div>
                                        <span className="text-sm font-bold text-white w-10 text-right">{team.completion}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

// ─── KPI Card ─────────────────────────────────────────────────
interface KPIProps {
    title: string; value: string | number; sub: string;
    trend: string; up: boolean; icon: React.ElementType;
    cls: string;
}
function KPICard({ title, value, sub, trend, up, icon: Icon, cls }: KPIProps) {
    return (
        <div className="edt-card-glass p-4 space-y-3">
            <div className="flex items-start justify-between">
                <span className={`inline-flex p-2 rounded-lg ${cls}`}>
                    <Icon className="h-4 w-4" />
                </span>
                <span className={`text-xs font-medium flex items-center gap-1 ${up ? "text-emerald-400" : "text-rose-400"}`}>
                    {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                </span>
            </div>
            <div>
                <div className="text-2xl font-bold tracking-tight text-white">{value}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{title}</div>
                <div className={`text-[11px] mt-1 font-medium ${up ? "text-emerald-400" : "text-rose-400"}`}>{trend}</div>
            </div>
        </div>
    );
}
