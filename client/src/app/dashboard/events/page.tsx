"use client";
import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight, CalendarDays, Clock, Users, MapPin, MoreHorizontal, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// ---- Types ----
type EventType = "meeting" | "workshop" | "seminar" | "training";
type EventStatus = "scheduled" | "completed" | "cancelled";
type InviteStatus = "accepted" | "pending" | "declined";

interface CalendarEvent {
    id: string;
    title: string;
    project: string;
    type: EventType;
    status: EventStatus;
    date: string;    // "YYYY-MM-DD"
    time: string;    // "HH:MM"
    endTime: string;
    participants: number;
    myStatus: InviteStatus;
    hasConflict?: boolean;
}

// ---- Mock data ----
const EVENTS: CalendarEvent[] = [
    { id: "1", title: "Weekly ARR Sync", project: "Web App Revamp", type: "meeting", status: "scheduled", date: "2026-03-02", time: "10:00", endTime: "11:00", participants: 5, myStatus: "accepted", hasConflict: true },
    { id: "2", title: "Infrastructure Review", project: "Infra Migration", type: "meeting", status: "scheduled", date: "2026-03-02", time: "10:30", endTime: "11:30", participants: 4, myStatus: "pending", hasConflict: true },
    { id: "3", title: "Design Workshop", project: "Mobile App V2", type: "workshop", status: "scheduled", date: "2026-03-04", time: "09:00", endTime: "12:00", participants: 8, myStatus: "accepted" },
    { id: "4", title: "Client Stakeholder Call", project: "Q3 Marketing", type: "meeting", status: "scheduled", date: "2026-03-05", time: "14:00", endTime: "15:00", participants: 6, myStatus: "pending" },
    { id: "5", title: "Data Privacy Training", project: "Compliance", type: "training", status: "scheduled", date: "2026-03-07", time: "11:00", endTime: "13:00", participants: 20, myStatus: "accepted" },
    { id: "6", title: "Board Seminar – Strategy", project: "N/A", type: "seminar", status: "completed", date: "2026-02-25", time: "09:00", endTime: "17:00", participants: 30, myStatus: "accepted" },
];

// ---- Helpers ----
const TYPE_COLORS: Record<EventType, string> = {
    meeting: "bg-blue-500/20  text-blue-400  border border-blue-500/30",
    workshop: "bg-violet-500/20 text-violet-400 border border-violet-500/30",
    seminar: "bg-amber-500/20 text-amber-400  border border-amber-500/30",
    training: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
};
const TYPE_DOT: Record<EventType, string> = {
    meeting: "bg-blue-500", workshop: "bg-violet-500", seminar: "bg-amber-500", training: "bg-emerald-500",
};
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}

// ---- Main Component ----
export default function EventsPage() {
    const [year, setYear] = useState(2026);
    const [month, setMonth] = useState(2); // March
    const [selected, setSelected] = useState<string | null>("2026-03-02");
    const [activeTab, setActiveTab] = useState<"all" | "mine" | "pending">("all");

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = `${year}-${String(month + 1).padStart(2, "0")}`;

    const eventsForDate = (dateStr: string) =>
        EVENTS.filter((e) => e.date === dateStr);

    const filteredEvents = EVENTS.filter((e) => {
        if (activeTab === "pending") return e.myStatus === "pending";
        if (activeTab === "mine") return e.myStatus !== "declined";
        return true;
    });

    const selectedEvents = selected
        ? filteredEvents.filter((e) => e.date === selected)
        : filteredEvents;

    const navMonth = (dir: 1 | -1) => {
        const d = new Date(year, month + dir, 1);
        setYear(d.getFullYear());
        setMonth(d.getMonth());
        setSelected(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Events</h1>
                    <p className="text-sm text-slate-500 mt-1">Schedule and track meetings, workshops, seminars & trainings.</p>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shrink-0">
                    <Plus className="h-4 w-4 mr-2" /> New Event
                </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* ── Calendar ── */}
                <div className="edt-card overflow-hidden xl:col-span-1">
                    {/* Month nav */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                        <button onClick={() => navMonth(-1)} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-semibold text-white">{MONTH_NAMES[month]} {year}</span>
                        <button onClick={() => navMonth(1)} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="p-4">
                        {/* Day headers */}
                        <div className="grid grid-cols-7 mb-2">
                            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                                <div key={d} className="text-[11px] font-semibold text-slate-600 text-center py-1">{d}</div>
                            ))}
                        </div>

                        {/* Day cells */}
                        <div className="grid grid-cols-7 gap-y-1">
                            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                const dayEvts = eventsForDate(dateStr);
                                const isSelected = selected === dateStr;
                                const hasConflict = dayEvts.some((e) => e.hasConflict);

                                return (
                                    <button
                                        key={day}
                                        onClick={() => setSelected(isSelected ? null : dateStr)}
                                        className={`relative flex flex-col items-center justify-center h-9 w-full rounded-lg text-sm font-medium transition-all
                      ${isSelected
                                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40"
                                                : dayEvts.length > 0
                                                    ? "hover:bg-slate-800 text-white"
                                                    : "hover:bg-slate-800/50 text-slate-400"
                                            }`}
                                    >
                                        {day}
                                        {dayEvts.length > 0 && !isSelected && (
                                            <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5`}>
                                                {dayEvts.slice(0, 3).map((e, idx) => (
                                                    <span key={idx} className={`w-1 h-1 rounded-full ${hasConflict && e.hasConflict ? "bg-rose-500" : TYPE_DOT[e.type]}`} />
                                                ))}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="px-5 pb-4 pt-2 border-t border-slate-800 flex flex-wrap gap-3">
                        {(Object.entries(TYPE_DOT) as [EventType, string][]).map(([type, dot]) => (
                            <div key={type} className="flex items-center gap-1.5 text-[11px] text-slate-500 capitalize">
                                <span className={`w-2 h-2 rounded-full ${dot}`} /> {type}
                            </div>
                        ))}
                        <div className="flex items-center gap-1.5 text-[11px] text-rose-400">
                            <span className="w-2 h-2 rounded-full bg-rose-500" /> Conflict
                        </div>
                    </div>
                </div>

                {/* ── Event List ── */}
                <div className="xl:col-span-2 edt-card overflow-hidden flex flex-col">
                    {/* Filters */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 gap-4">
                        <div>
                            <h3 className="text-sm font-semibold text-white">
                                {selected ? `Events on ${selected}` : "All Events"}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">{selectedEvents.length} event{selectedEvents.length !== 1 ? "s" : ""}</p>
                        </div>
                        <div className="flex gap-1 bg-slate-900/80 rounded-xl p-1">
                            {(["all", "mine", "pending"] as const).map((tab) => (
                                <button key={tab} onClick={() => setActiveTab(tab)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all
                    ${activeTab === tab ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-white"}`}>
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Events */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
                        {selectedEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                                <CalendarDays className="h-8 w-8 mb-3" />
                                <p className="text-sm font-medium">No events found</p>
                            </div>
                        ) : (
                            selectedEvents.map((evt) => <EventRow key={evt.id} event={evt} />)
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Sub-components ──
function EventRow({ event }: { event: CalendarEvent }) {
    const myStatusConfig = {
        accepted: { label: "Accepted", cls: "badge-completed" },
        pending: { label: "Pending", cls: "badge-pending" },
        declined: { label: "Declined", cls: "badge-stuck" },
    };

    return (
        <div className={`flex gap-4 px-5 py-4 hover:bg-slate-800/30 transition-colors ${event.hasConflict ? "border-l-2 border-rose-500 pl-[18px]" : ""}`}>
            {/* Type dot + time column */}
            <div className="flex flex-col items-center gap-1.5 pt-1 shrink-0">
                <span className={`w-2.5 h-2.5 rounded-full ${TYPE_DOT[event.type]}`} />
                <div className="w-px flex-1 bg-slate-800" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-semibold text-white">{event.title}</h4>
                            {event.hasConflict && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/25">
                                    CONFLICT
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{event.project}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${myStatusConfig[event.myStatus].cls}`}>
                            {myStatusConfig[event.myStatus].label}
                        </span>
                        <button className="p-1 rounded-lg text-slate-600 hover:text-white hover:bg-slate-800 transition-colors">
                            <MoreHorizontal className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0" /> {event.time} – {event.endTime}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 shrink-0" /> {event.participants} participants
                    </span>
                    <span className={`capitalize flex items-center gap-1.5 ${TYPE_COLORS[event.type].split(" ").find(c => c.startsWith("text-")) ?? ""}`}>
                        <MapPin className="h-3.5 w-3.5 shrink-0" /> {event.type}
                    </span>
                </div>

                {/* Invite action buttons */}
                {event.myStatus === "pending" && (
                    <div className="flex gap-2 mt-3">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-xs font-semibold transition-colors border border-emerald-500/25">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 text-xs font-semibold transition-colors border border-rose-500/25">
                            <XCircle className="h-3.5 w-3.5" /> Decline
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
