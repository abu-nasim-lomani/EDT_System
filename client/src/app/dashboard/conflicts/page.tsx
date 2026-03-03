"use client";
import { AlertTriangle, Clock, Users, CalendarDays, ArrowRight, CheckCircle2, XCircle, Info } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

// ---- Types (matching events page) ----
type EventStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";
type InviteStatus = "ACCEPTED" | "PENDING" | "DECLINED";

interface ApiEvent {
    id: string; title: string; status: EventStatus;
    startDate: string; endDate: string;
    project?: { id: string; name: string };
    participants: { userId: string; status: InviteStatus }[];
    creator: { id: string; name: string; avatar?: string };
}

interface ConflictPair {
    a: ApiEvent & { time: string; endTime: string; myStatus: InviteStatus };
    b: ApiEvent & { time: string; endTime: string; myStatus: InviteStatus };
    overlapMinutes: number;
}

export default function ConflictsPage() {
    const { user } = useAuthStore();
    const qc = useQueryClient();

    const { data: events = [], isLoading } = useQuery({
        queryKey: ["events"],
        queryFn: async () => (await api.get("/events")).data.data as ApiEvent[]
    });

    // ── Build formatted events with time strings & myStatus
    const fmt = events.map(e => {
        const d = new Date(e.startDate);
        const ed = new Date(e.endDate);
        const myPart = e.participants.find(p => p.userId === user?.id);
        return {
            ...e,
            time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
            endTime: ed.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
            myStatus: (myPart?.status || "ACCEPTED") as InviteStatus,
            isCreator: e.creator.id === user?.id,
        };
    });

    // ── Client-side conflict detection: find all overlapping ACCEPTED pairs
    const conflictPairs: ConflictPair[] = [];
    const accepted = fmt.filter(e => e.myStatus === "ACCEPTED" && e.status === "SCHEDULED");
    for (let i = 0; i < accepted.length; i++) {
        for (let j = i + 1; j < accepted.length; j++) {
            const a = accepted[i];
            const b = accepted[j];
            const aStart = new Date(a.startDate).getTime();
            const aEnd = new Date(a.endDate).getTime();
            const bStart = new Date(b.startDate).getTime();
            const bEnd = new Date(b.endDate).getTime();
            if (aStart < bEnd && aEnd > bStart) {
                const overlapMs = Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
                const overlapMinutes = Math.round(overlapMs / 60000);
                conflictPairs.push({ a, b, overlapMinutes });
            }
        }
    }

    const pendingConflicts = conflictPairs.filter(
        p => p.a.myStatus === "PENDING" || p.b.myStatus === "PENDING" ||
            (p.a.myStatus === "ACCEPTED" && p.b.myStatus === "ACCEPTED") // both are still overlapping
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Conflicts</h1>
                <p className="text-sm text-slate-500 mt-1">Overlapping accepted events that require rescheduling or attendance decisions.</p>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Total Conflicts" value={conflictPairs.length} icon={AlertTriangle} color="text-rose-400" bg="bg-rose-500/10" />
                <StatCard label="Overlap > 30 min" value={conflictPairs.filter(p => p.overlapMinutes >= 30).length} icon={Clock} color="text-orange-400" bg="bg-orange-500/10" />
                <StatCard label="Events Affected" value={new Set(conflictPairs.flatMap(p => [p.a.id, p.b.id])).size} icon={Users} color="text-amber-400" bg="bg-amber-500/10" />
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-indigo-500/8 border border-indigo-500/20 text-sm text-indigo-300">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                    Conflicts are detected when you have two or more overlapping <strong>Accepted</strong> events.
                    Decline one of them or ask the organiser to reschedule.
                </p>
            </div>

            {/* Loading / empty / list */}
            {isLoading ? (
                <div className="edt-card p-12 flex items-center justify-center text-slate-600 text-sm">Loading…</div>
            ) : conflictPairs.length === 0 ? (
                <div className="edt-card p-16 flex flex-col items-center justify-center gap-3 text-slate-600">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500/40" />
                    <p className="text-sm font-medium text-slate-500">No conflicts found — your schedule is clear!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {conflictPairs.map((pair, idx) => (
                        <ConflictCard key={idx} pair={pair} qc={qc} />
                    ))}
                </div>
            )}
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

function ConflictCard({ pair, qc }: { pair: ConflictPair; qc: ReturnType<typeof useQueryClient> }) {
    const { a, b, overlapMinutes } = pair;
    const isHigh = overlapMinutes >= 30;

    const respond = (eventId: string, status: "ACCEPTED" | "DECLINED") =>
        api.patch(`/events/${eventId}/invite-response`, { status });

    const mutA = useMutation({ mutationFn: (s: "ACCEPTED" | "DECLINED") => respond(a.id, s), onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }) });
    const mutB = useMutation({ mutationFn: (s: "ACCEPTED" | "DECLINED") => respond(b.id, s), onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }) });

    const events = [
        { evt: a, mut: mutA },
        { evt: b, mut: mutB },
    ];

    return (
        <div className={`edt-card overflow-hidden border-l-2 ${isHigh ? "border-l-rose-500" : "border-l-amber-500"}`}>
            {/* Card header */}
            <div className={`flex items-center justify-between px-5 py-3.5 border-b border-slate-800 ${isHigh ? "bg-rose-500/5" : "bg-amber-500/5"}`}>
                <div className="flex items-center gap-3">
                    <AlertTriangle className={`h-4 w-4 shrink-0 ${isHigh ? "text-rose-400" : "text-amber-400"}`} />
                    <span className="text-sm font-semibold text-white">Scheduling Conflict</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide
                        ${isHigh ? "bg-rose-500/15 text-rose-400 border border-rose-500/25" : "bg-amber-500/15 text-amber-400 border border-amber-500/25"}`}>
                        {isHigh ? "High" : "Medium"} · {overlapMinutes} min overlap
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(a.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </div>
            </div>

            {/* Overlapping events */}
            <div className="divide-y divide-slate-800/60">
                {events.map(({ evt, mut }, ei) => (
                    <div key={evt.id} className="flex items-center justify-between px-5 py-4 gap-4 flex-wrap">
                        <div className="flex items-start gap-3 min-w-0">
                            {/* overlap indicator */}
                            <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                                <span className={`w-2 h-2 rounded-full ${ei === 0 ? "bg-blue-500" : "bg-indigo-500"}`} />
                                {ei < events.length - 1 && <div className="w-px h-4 bg-slate-700" />}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-white">{evt.title}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{evt.project?.name || "No Project"}</p>
                                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{evt.time} – {evt.endTime}</span>
                                </div>
                            </div>
                        </div>
                        {/* Only show action buttons if user is a participant (not creator) */}
                        {evt.myStatus !== "ACCEPTED" || (
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={() => mut.mutate("DECLINED")}
                                    disabled={mut.isPending}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 text-xs font-semibold transition-colors border border-rose-500/25 disabled:opacity-50">
                                    <XCircle className="h-3.5 w-3.5" /> Decline
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Card footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-900/30">
                <div className="flex items-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {a.participants.length + b.participants.length} total participants across both events
                    </span>
                </div>
                <a href="/dashboard/events" className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                    Go to Events <ArrowRight className="h-3.5 w-3.5" />
                </a>
            </div>
        </div>
    );
}
