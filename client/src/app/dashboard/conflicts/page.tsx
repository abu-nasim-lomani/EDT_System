import { AlertTriangle, Clock, Users, CalendarDays, ArrowRight, CheckCircle2, XCircle, Info } from "lucide-react";

interface ConflictGroup {
    date: string;
    time: string;
    events: { id: string; title: string; project: string; time: string; endTime: string }[];
    severity: "high" | "medium";
}

const CONFLICTS: ConflictGroup[] = [
    {
        date: "2026-03-02",
        time: "10:00",
        severity: "high",
        events: [
            { id: "1", title: "Weekly ARR Sync", project: "Web App Revamp", time: "10:00", endTime: "11:00" },
            { id: "2", title: "Infrastructure Review", project: "Infra Migration", time: "10:30", endTime: "11:30" },
        ],
    },
    {
        date: "2026-03-09",
        time: "14:00",
        severity: "medium",
        events: [
            { id: "3", title: "Client Debrief", project: "Q3 Marketing", time: "14:00", endTime: "15:00" },
            { id: "4", title: "PM Weekly Check-in", project: "Mobile App V2", time: "14:30", endTime: "15:30" },
        ],
    },
];

export default function ConflictsPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Conflicts</h1>
                <p className="text-sm text-slate-500 mt-1">Overlapping events that require rescheduling or attendance decisions.</p>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Total Conflicts" value={CONFLICTS.length} icon={AlertTriangle} color="text-rose-400" bg="bg-rose-500/10" />
                <StatCard label="High Severity" value={CONFLICTS.filter(c => c.severity === "high").length} icon={AlertTriangle} color="text-orange-400" bg="bg-orange-500/10" />
                <StatCard label="Pending Action" value={CONFLICTS.length} icon={Clock} color="text-amber-400" bg="bg-amber-500/10" />
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-indigo-500/8 border border-indigo-500/20 text-sm text-indigo-300">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                    Conflicts are detected when you are invited to two or more overlapping events. You can <strong>Accept</strong> one and <strong>Decline</strong> the others, or ask the organiser to reschedule.
                </p>
            </div>

            {/* Conflict cards */}
            <div className="space-y-4">
                {CONFLICTS.map((conflict, idx) => (
                    <ConflictCard key={idx} conflict={conflict} />
                ))}
            </div>
        </div>
    );
}

// ── Sub-components ──

function StatCard({ label, value, icon: Icon, color, bg }: {
    label: string; value: number; icon: React.ElementType; color: string; bg: string;
}) {
    return (
        <div className="edt-card flex items-center gap-4 px-5 py-4">
            <div className={`p-2.5 rounded-xl ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            </div>
        </div>
    );
}

function ConflictCard({ conflict }: { conflict: ConflictGroup }) {
    const isHigh = conflict.severity === "high";
    return (
        <div className={`edt-card overflow-hidden border-l-2 ${isHigh ? "border-l-rose-500" : "border-l-amber-500"}`}>
            {/* Card header */}
            <div className={`flex items-center justify-between px-5 py-3.5 border-b border-slate-800 ${isHigh ? "bg-rose-500/5" : "bg-amber-500/5"}`}>
                <div className="flex items-center gap-3">
                    <AlertTriangle className={`h-4 w-4 shrink-0 ${isHigh ? "text-rose-400" : "text-amber-400"}`} />
                    <span className="text-sm font-semibold text-white">
                        Scheduling Conflict
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide
            ${isHigh ? "bg-rose-500/15 text-rose-400 border border-rose-500/25" : "bg-amber-500/15 text-amber-400 border border-amber-500/25"}`}>
                        {conflict.severity} severity
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {conflict.date} · {conflict.time}
                </div>
            </div>

            {/* Overlapping events */}
            <div className="divide-y divide-slate-800/60">
                {conflict.events.map((evt, ei) => (
                    <div key={evt.id} className="flex items-center justify-between px-5 py-4 gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                            {/* overlap indicator */}
                            <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                                <span className={`w-2 h-2 rounded-full ${ei === 0 ? "bg-blue-500" : "bg-indigo-500"}`} />
                                {ei < conflict.events.length - 1 && <div className="w-px h-4 bg-slate-700" />}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-white">{evt.title}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{evt.project}</p>
                                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{evt.time} – {evt.endTime}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-xs font-semibold transition-colors border border-emerald-500/25">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                            </button>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 text-xs font-semibold transition-colors border border-rose-500/25">
                                <XCircle className="h-3.5 w-3.5" /> Decline
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Card footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-900/30">
                <div className="flex items-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {conflict.events.length} overlapping events</span>
                </div>
                <button className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                    Request Reschedule <ArrowRight className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}
