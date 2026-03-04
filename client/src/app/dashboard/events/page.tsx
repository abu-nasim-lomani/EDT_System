"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, ChevronLeft, ChevronRight, CalendarDays, Clock, Users, MoreHorizontal, CheckCircle2, XCircle, AlertTriangle, Trash, CheckCircle, MessageSquare, Lightbulb, ArrowRight, Loader2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { QueryClient, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

// ---- Types ----
type EventStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";
type InviteStatus = "ACCEPTED" | "PENDING" | "DECLINED";

interface ApiEvent {
    id: string; title: string; agenda?: string; status: EventStatus;
    startDate: string; endDate: string; hasConflict?: boolean;
    project?: { id: string; name: string };
    participants: { userId: string; status: InviteStatus }[];
    creator: { id: string; name: string; avatar?: string };
}

// ---- Helpers ----
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay(); }

// ---- Main Component ----
export default function EventsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading events...</div>}>
            <EventsPageContent />
        </Suspense>
    );
}

function EventsPageContent() {
    const user = useAuthStore(s => s.user);
    const qc = useQueryClient();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth());
    const [selected, setSelected] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"all" | "pending" | "archive">("all");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [decisionsEvent, setDecisionsEvent] = useState<(ApiEvent & { date: string; time: string; endTime: string; myStatus: string; isCreator: boolean }) | null>(null);

    // Modal states
    const [rescheduleEvent, setRescheduleEvent] = useState<(ApiEvent & { date: string; time: string; endTime: string; myStatus: string; isCreator: boolean }) | null>(null);
    const [requestRescheduleEvent, setRequestRescheduleEvent] = useState<(ApiEvent & { date: string; time: string; endTime: string; myStatus: string; isCreator: boolean }) | null>(null);
    const [reviewRequestId, setReviewRequestId] = useState<string | null>(searchParams.get("reviewRequest"));

    // Sync query param -> state (for when nav link clicked while already on page)
    const reqId = searchParams.get("reviewRequest");
    const [prevReqId, setPrevReqId] = useState(reqId);
    if (reqId !== prevReqId) {
        setPrevReqId(reqId);
        if (reqId) setReviewRequestId(reqId);
    }
    const closeReviewModal = () => {
        setReviewRequestId(null);
        if (searchParams.has("reviewRequest")) {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete("reviewRequest");
            router.replace(newUrl.pathname + newUrl.search);
        }
    };

    // -- Queries --
    const { data: events = [] } = useQuery({ queryKey: ["events"], queryFn: async () => (await api.get("/events")).data.data as ApiEvent[] });
    const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: async () => (await api.get("/projects")).data.data as { id: string; name: string }[] });
    const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: async () => (await api.get("/users")).data.data as { id: string; name: string; avatar?: string }[] });

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const formattedEvents = events.map(e => {
        const d = new Date(e.startDate);
        const ed = new Date(e.endDate);
        const myPart = e.participants.find(p => p.userId === user?.id);
        return {
            ...e,
            date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
            time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
            endTime: ed.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
            myStatus: myPart?.status || "ACCEPTED", // Creators might not be in participants array explicitly with a status
            isCreator: e.creator.id === user?.id
        };
    });

    // ── Client-side Conflict Detection ──
    // Mark any two events as conflicting if the current user has ACCEPTED both
    // and their time ranges overlap.
    const acceptedEvents = formattedEvents.filter(e => e.myStatus === "ACCEPTED" && e.status !== "COMPLETED");
    for (let i = 0; i < acceptedEvents.length; i++) {
        for (let j = i + 1; j < acceptedEvents.length; j++) {
            const a = acceptedEvents[i];
            const b = acceptedEvents[j];
            const aStart = new Date(a.startDate).getTime();
            const aEnd = new Date(a.endDate).getTime();
            const bStart = new Date(b.startDate).getTime();
            const bEnd = new Date(b.endDate).getTime();
            if (aStart < bEnd && aEnd > bStart) {
                a.hasConflict = true;
                b.hasConflict = true;
            }
        }
    }

    const eventsForDate = (dateStr: string) => formattedEvents.filter((e) => e.date === dateStr);

    const filteredEvents = formattedEvents.filter((e) => {
        if (activeTab === "pending") return e.myStatus === "PENDING";
        if (activeTab === "archive") return e.status === "COMPLETED";
        return true; // all
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
                <Button onClick={() => setIsCreateModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shrink-0">
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
                                                    <span key={idx} className={`w-1 h-1 rounded-full ${hasConflict && e.hasConflict ? "bg-rose-500" : "bg-indigo-400"}`} />
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
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 capitalize">
                            <span className="w-2 h-2 rounded-full bg-indigo-400" /> Event
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-rose-400">
                            <span className="w-2 h-2 rounded-full bg-rose-500" /> Conflict
                        </div>
                    </div>
                </div>

                {/* ── Event List ── */}
                <div className="xl:col-span-2 edt-card overflow-hidden flex flex-col h-[385px] xl:h-[385px]">
                    {/* Filters */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 gap-4">
                        <div>
                            <h3 className="text-sm font-semibold text-white">
                                {selected ? `Events on ${selected}` : "All Events"}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">{selectedEvents.length} event{selectedEvents.length !== 1 ? "s" : ""}</p>
                        </div>
                        <div className="flex gap-1 bg-slate-900/80 rounded-xl p-1">
                            {(["all", "pending", "archive"] as const).map((tab) => (
                                <button key={tab} onClick={() => setActiveTab(tab)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all
                    ${activeTab === tab ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-white"}`}>
                                    {tab === "archive" ? "Archive" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
                        {selectedEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                                <CalendarDays className="h-8 w-8 mb-3" />
                                <p className="text-sm font-medium">No events found</p>
                            </div>
                        ) : (
                            selectedEvents.map((evt) => <EventRow key={evt.id} event={evt} qc={qc} onReschedule={setRescheduleEvent} onRequestReschedule={setRequestRescheduleEvent} onViewDecisions={setDecisionsEvent} />)
                        )}
                    </div>
                </div>
            </div>

            {isCreateModalOpen && (
                <CreateEventModal
                    users={users} projects={projects}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => { qc.invalidateQueries({ queryKey: ["events"] }); setIsCreateModalOpen(false); }}
                />
            )}

            {rescheduleEvent && (
                <RescheduleModal
                    event={rescheduleEvent}
                    projects={projects}
                    onClose={() => setRescheduleEvent(null)}
                    onSuccess={() => { qc.invalidateQueries({ queryKey: ["events"] }); setRescheduleEvent(null); }}
                />
            )}

            {requestRescheduleEvent && (
                <RequestRescheduleModal
                    event={requestRescheduleEvent}
                    onClose={() => setRequestRescheduleEvent(null)}
                    onSuccess={() => setRequestRescheduleEvent(null)}
                />
            )}

            {reviewRequestId && (
                <ReviewRescheduleModal
                    requestId={reviewRequestId}
                    onClose={closeReviewModal}
                    onSuccess={() => { qc.invalidateQueries({ queryKey: ["events"] }); closeReviewModal(); }}
                />
            )}

            {decisionsEvent && (
                <EventDecisionsModal
                    event={decisionsEvent}
                    projects={projects}
                    users={users}
                    onClose={() => setDecisionsEvent(null)}
                    onSuccess={() => { qc.invalidateQueries({ queryKey: ["tasks"] }); }}
                />
            )}
        </div>
    );
}

// ── Sub-components ──
function RescheduleModal({ event, projects, onClose, onSuccess }: {
    event: ApiEvent & { date: string; time: string; endTime: string };
    projects: { id: string; name: string }[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    // Derive initial date/time from existing event
    const startDt = new Date(event.startDate);
    const endDt = new Date(event.endDate);
    const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const toTimeStr = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    const [form, setForm] = useState({
        title: event.title,
        description: (event as { description?: string }).description || "",
        startDate: toDateStr(startDt),
        startTime: toTimeStr(startDt),
        endDate: toDateStr(endDt),
        endTime: toTimeStr(endDt),
        projectId: event.project?.id || "",
    });
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        setSaving(true);
        try {
            await api.patch(`/events/${event.id}`, {
                title: form.title,
                description: form.description,
                startDate: new Date(`${form.startDate}T${form.startTime}`).toISOString(),
                endDate: new Date(`${form.endDate}T${form.endTime}`).toISOString(),
                projectId: form.projectId || undefined,
            });
            onSuccess();
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/20">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Edit className="h-5 w-5 text-indigo-400" /> Edit Event
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"><XCircle className="h-5 w-5" /></button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 ml-1">Event Title</label>
                        <input autoFocus value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 ml-1">Description</label>
                        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-h-[70px]" />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 ml-1">Project Link (Optional)</label>
                        <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none">
                            <option value="">None</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 ml-1">Start Date</label>
                            <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none block" style={{ colorScheme: "dark" }} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 ml-1">Start Time</label>
                            <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none block" style={{ colorScheme: "dark" }} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 ml-1">End Date</label>
                            <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none block" style={{ colorScheme: "dark" }} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 ml-1">End Time</label>
                            <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none block" style={{ colorScheme: "dark" }} />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">Cancel</Button>
                    <Button onClick={submit} disabled={saving || !form.title} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6">
                        {saving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function CreateEventModal({ users, projects, onClose, onSuccess }: { users: { id: string; name: string; avatar?: string }[], projects: { id: string; name: string }[], onClose: () => void, onSuccess: () => void }) {
    const todayStr = new Date().toISOString().split("T")[0];
    const [form, setForm] = useState({ title: "", description: "", type: "MEETING", startDate: todayStr, startTime: "09:00", endDate: todayStr, endTime: "10:00", projectId: "", participantIds: [] as string[] });
    const [conflictWarn, setConflictWarn] = useState<{ msg: string; uids: string[] } | null>(null);

    const submitFn = async (force: boolean = false) => {
        const fullStart = new Date(`${form.startDate}T${form.startTime}`).toISOString();
        const fullEnd = new Date(`${form.endDate}T${form.endTime}`).toISOString();

        try {
            const res = await api.post("/events", { ...form, startDate: fullStart, endDate: fullEnd });
            if (res.data.conflictUserIds && !force) {
                setConflictWarn({ msg: res.data.warning, uids: res.data.conflictUserIds });
            } else {
                onSuccess();
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/20">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-indigo-400" /> New Event
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"><XCircle className="h-5 w-5" /></button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                    {conflictWarn ? (
                        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-sm">
                            <h4 className="font-bold text-orange-400 mb-1 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Scheduling Conflict</h4>
                            <p className="text-orange-200/80 mb-3">{conflictWarn.msg}. The following users already have an accepted event at this time:</p>
                            <ul className="list-disc pl-5 text-orange-300 mb-4 h-max overflow-y-auto space-y-1">
                                {conflictWarn.uids.map(uid => <li key={uid}>{users.find(u => u.id === uid)?.name || uid}</li>)}
                            </ul>
                            <div className="flex gap-2">
                                <Button onClick={() => setConflictWarn(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white">Adjust Time</Button>
                                <Button onClick={() => submitFn(true)} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white">Ignore & Schedule Anyway</Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 ml-1">Event Title</label>
                                <input autoFocus required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600" placeholder="e.g. Q3 Roadmap Review" />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 ml-1">Description</label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600 min-h-[80px]" placeholder="Briefly describe the purpose of this event..." />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 ml-1">Event Type</label>
                                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none">
                                        <option value="MEETING">Meeting</option>
                                        <option value="TRAINING">Training</option>
                                        <option value="REVIEW">Review</option>
                                        <option value="PRESENTATION">Presentation</option>
                                        <option value="WEBINAR">Webinar</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 ml-1">Project Link (Optional)</label>
                                    <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none">
                                        <option value="">None</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 ml-1">Start Date</label>
                                    <input type="date" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none block" style={{ colorScheme: "dark" }} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 ml-1">Start Time</label>
                                    <input type="time" required value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none block" style={{ colorScheme: "dark" }} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 ml-1">End Date</label>
                                    <input type="date" required value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none block" style={{ colorScheme: "dark" }} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 ml-1">End Time</label>
                                    <input type="time" required value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none block" style={{ colorScheme: "dark" }} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 ml-1">Participants</label>
                                <select multiple value={form.participantIds} onChange={(e) => {
                                    const opts = Array.from(e.target.selectedOptions, option => option.value);
                                    setForm({ ...form, participantIds: opts });
                                }} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none form-multiselect h-32 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                                    {users.map(u => <option key={u.id} value={u.id} className="py-1">{u.name}</option>)}
                                </select>
                                <p className="text-[10px] text-slate-500 mt-1.5 px-1">Hold CMD/CTRL to select multiple</p>
                            </div>
                        </>
                    )}
                </div>

                {!conflictWarn && (
                    <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
                        <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">Cancel</Button>
                        <Button onClick={() => submitFn(false)} disabled={!form.title || !form.startDate || !form.startTime || !form.endDate || !form.endTime} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6">Create Event</Button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Sub-components ──
// ── Sub-components ──

// ── Request Reschedule Modal (for participants) ──
function RequestRescheduleModal({ event, onClose, onSuccess }: {
    event: ApiEvent & { time: string; endTime: string };
    onClose: () => void;
    onSuccess: () => void;
}) {
    const startDt = new Date(event.startDate);
    const endDt = new Date(event.endDate);
    const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const toTimeStr = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    const [form, setForm] = useState({
        reason: "",
        suggestedStartDate: toDateStr(startDt),
        suggestedStartTime: toTimeStr(startDt),
        suggestedEndDate: toDateStr(endDt),
        suggestedEndTime: toTimeStr(endDt),
    });
    const [saving, setSaving] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const submit = async () => {
        if (!form.reason.trim()) return;
        setSaving(true);
        try {
            await api.post(`/events/${event.id}/reschedule-requests`, {
                reason: form.reason,
                suggestedStartDate: new Date(`${form.suggestedStartDate}T${form.suggestedStartTime}`).toISOString(),
                suggestedEndDate: new Date(`${form.suggestedEndDate}T${form.suggestedEndTime}`).toISOString(),
            });
            setSubmitted(true);
            setTimeout(onSuccess, 1500);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/20">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-indigo-400" /> Request Reschedule
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"><XCircle className="h-5 w-5" /></button>
                </div>

                {submitted ? (
                    <div className="p-10 flex flex-col items-center gap-3 text-center">
                        <CheckCircle className="h-10 w-10 text-emerald-400" />
                        <p className="text-sm font-semibold text-white">Request sent!</p>
                        <p className="text-xs text-slate-400">The organiser has been notified and will review your request.</p>
                    </div>
                ) : (
                    <>
                        <div className="p-6 space-y-4">
                            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                                <p className="text-xs text-slate-400 font-medium">Requesting reschedule for:</p>
                                <p className="text-sm font-semibold text-white mt-1">{event.title}</p>
                                <p className="text-xs text-slate-500">{event.time} – {event.endTime}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 ml-1">Reason <span className="text-rose-400">*</span></label>
                                <textarea autoFocus value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                                    placeholder="Why do you need to reschedule?"
                                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-h-[80px]" />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2 ml-1">Suggested New Time</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-[10px] text-slate-500 mb-1 ml-1">Start Date</p>
                                        <input type="date" value={form.suggestedStartDate} onChange={e => setForm({ ...form, suggestedStartDate: e.target.value })} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" style={{ colorScheme: "dark" }} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 mb-1 ml-1">Start Time</p>
                                        <input type="time" value={form.suggestedStartTime} onChange={e => setForm({ ...form, suggestedStartTime: e.target.value })} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" style={{ colorScheme: "dark" }} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 mb-1 ml-1">End Date</p>
                                        <input type="date" value={form.suggestedEndDate} onChange={e => setForm({ ...form, suggestedEndDate: e.target.value })} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" style={{ colorScheme: "dark" }} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 mb-1 ml-1">End Time</p>
                                        <input type="time" value={form.suggestedEndTime} onChange={e => setForm({ ...form, suggestedEndTime: e.target.value })} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" style={{ colorScheme: "dark" }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
                            <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">Cancel</Button>
                            <Button onClick={submit} disabled={saving || !form.reason.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6">
                                {saving ? "Sending..." : "Send Request"}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ── Review Reschedule Modal (for creator) ──
function ReviewRescheduleModal({ requestId, onClose, onSuccess }: {
    requestId: string;
    onClose: () => void;
    onSuccess: () => void;
}) {
    // We only have the request ID. We need to fetch the request to get eventId and details.
    // It's a bit of a chicken/egg problem for the route URL, so we can fetch all events and scan them,
    // or add a quick helper route. Since we already added the specific GET route `/:eventId/reschedule-requests/:reqId`
    // but building the URL requires the eventId... wait, earlier we built the route without eventId at the root?
    // Actually the router is mounted at `/api/events/:id/reschedule-requests`. To invoke `/:reqId` we need the eventId.
    // Let's use React Query to fetch `GET /api/dashboard/conflicts`? No.
    // Let's rely on the events list we already have in cache to find the event ID associated with this request.
    // Wait, the client doesn't know the request's eventId. 
    // We'll query all events, then search their reschedule requests? Not scalable.

    // Easier way: The notification gives us `/dashboard/events?reviewRequest=${reqId}`. 
    // Let's add a global fetch for the request by ID in the backend, or just pass `eventId` in the URL too!
    // But since the URL is already `?reviewRequest=ID`, let's just create a quick direct API fetch:
    const { data: reqData, isLoading, error } = useQuery({
        queryKey: ["reviewRequest", requestId],
        queryFn: async () => (await api.get(`/reschedule-requests/${requestId}`)).data.data
    });

    const approveMutation = useMutation({
        mutationFn: (eventId: string) => api.patch(`/events/${eventId}/reschedule-requests/${requestId}`, { action: "APPROVE" }),
        onSuccess: () => onSuccess()
    });

    const rejectMutation = useMutation({
        mutationFn: (eventId: string) => api.patch(`/events/${eventId}/reschedule-requests/${requestId}`, { action: "REJECT" }),
        onSuccess: () => onSuccess()
    });

    if (isLoading) return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>;
    if (error || !reqData) return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl">
                <p className="text-rose-400">Failed to load request. It may have already been resolved.</p>
                <Button onClick={onClose} className="w-full mt-4 bg-slate-800">Close</Button>
            </div>
        </div>
    );

    const sd = new Date(reqData.suggestedStartDate);
    const ed = new Date(reqData.suggestedEndDate);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/20">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-indigo-400" /> Review Reschedule Request
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"><XCircle className="h-5 w-5" /></button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            {reqData.requester.name.charAt(0)}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white">{reqData.requester.name}</p>
                            <p className="text-[11px] text-slate-400">Requested a schedule change for <span className="text-white font-medium">{reqData.event.title}</span></p>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                        <div>
                            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-1">Reason</p>
                            <p className="text-sm text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-800">{reqData.reason}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div>
                                <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-1">Current Schedule</p>
                                <p className="text-xs text-rose-300/80 line-through decoration-rose-500/50">
                                    {new Date(reqData.event.startDate).toLocaleDateString()} at {new Date(reqData.event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold tracking-wider text-indigo-400 uppercase mb-1">Suggested Schedule</p>
                                <p className="text-xs text-emerald-400 font-medium">
                                    {sd.toLocaleDateString()} at {sd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    <br />
                                    <span className="text-slate-500 text-[10px]">until {ed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={approveMutation.isPending || rejectMutation.isPending} className="text-slate-400 hover:text-white">Cancel</Button>
                    <Button onClick={() => rejectMutation.mutate(reqData.eventId)} disabled={approveMutation.isPending || rejectMutation.isPending} className="bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white">
                        {rejectMutation.isPending ? "Updating..." : "Reject Request"}
                    </Button>
                    <Button onClick={() => approveMutation.mutate(reqData.eventId)} disabled={approveMutation.isPending || rejectMutation.isPending} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                        {approveMutation.isPending ? "Updating..." : "Approve & Update Event"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function EventRow({ event, qc, onReschedule, onRequestReschedule, onViewDecisions }: {
    event: ApiEvent & { date: string, time: string, endTime: string, myStatus: string, isCreator: boolean },
    qc: QueryClient,
    onReschedule: (ev: typeof event) => void,
    onRequestReschedule: (ev: typeof event) => void,
    onViewDecisions: (ev: typeof event) => void,
}) {
    const myStatusConfig = {
        ACCEPTED: { label: "Accepted", cls: "badge-completed" },
        PENDING: { label: "Pending", cls: "badge-pending" },
        DECLINED: { label: "Declined", cls: "badge-stuck" },
    };

    const updateInvite = useMutation({
        mutationFn: (status: "ACCEPTED" | "DECLINED") => api.patch(`/events/${event.id}/invite-response`, { status }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] })
    });

    const deleteEvent = useMutation({
        mutationFn: () => api.delete(`/events/${event.id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] })
    });

    const completeEvent = useMutation({
        mutationFn: () => api.patch(`/events/${event.id}/complete`, { minutes: "Completed via Dashboard" }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] })
    });

    return (
        <div className={`flex gap-4 px-5 py-4 hover:bg-slate-800/30 transition-colors ${event.hasConflict ? "border-l-2 border-rose-500 pl-[18px]" : ""}`}>
            {/* Dot + time column */}
            <div className="flex flex-col items-center gap-1.5 pt-1 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
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
                        <p className="text-xs text-slate-500 mt-0.5">{event.project?.name || "No Project"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${myStatusConfig[event.myStatus as InviteStatus].cls}`}>
                            {myStatusConfig[event.myStatus as InviteStatus].label}
                        </span>

                        {/* Actions */}
                        <div className="shrink-0 flex items-start pl-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52 bg-slate-900 border-slate-700">
                                    {event.isCreator && event.status !== "COMPLETED" && (
                                        <DropdownMenuItem onClick={() => completeEvent.mutate()} className="text-emerald-400 focus:text-emerald-300 focus:bg-emerald-500/10 cursor-pointer">
                                            <CheckCircle className="h-4 w-4 mr-2" /> Mark Completed
                                        </DropdownMenuItem>
                                    )}
                                    {event.isCreator && event.status !== "COMPLETED" && (
                                        <DropdownMenuItem onClick={() => onReschedule(event)} className="text-indigo-400 focus:text-indigo-300 focus:bg-indigo-500/10 cursor-pointer">
                                            <Edit className="h-4 w-4 mr-2" /> Edit Event
                                        </DropdownMenuItem>
                                    )}
                                    {event.isCreator && (
                                        <DropdownMenuItem onClick={() => deleteEvent.mutate()} className="text-rose-400 focus:text-rose-300 focus:bg-rose-500/10 cursor-pointer">
                                            <Trash className="h-4 w-4 mr-2" /> Delete Event
                                        </DropdownMenuItem>
                                    )}
                                    {!event.isCreator && event.status !== "COMPLETED" && (
                                        <DropdownMenuItem onClick={() => onRequestReschedule(event)} className="text-indigo-400 focus:text-indigo-300 focus:bg-indigo-500/10 cursor-pointer">
                                            <MessageSquare className="h-4 w-4 mr-2" /> Request Reschedule
                                        </DropdownMenuItem>
                                    )}
                                    {!event.isCreator && (
                                        <DropdownMenuItem className="text-slate-300 focus:bg-slate-800 cursor-pointer">
                                            View Details
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => onViewDecisions(event)} className="text-amber-400 focus:text-amber-300 focus:bg-amber-500/10 cursor-pointer">
                                        <Lightbulb className="h-4 w-4 mr-2" /> View Decisions
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" /> {new Date(event.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – {new Date(event.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0" /> {event.time} – {event.endTime}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 shrink-0" /> {event.participants.length} participants
                    </span>
                </div>

                {/* Invite action buttons */}
                {event.myStatus === "PENDING" && !event.isCreator && (
                    <div className="flex gap-2 mt-3">
                        <button onClick={() => updateInvite.mutate("ACCEPTED")}
                            disabled={updateInvite.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-xs font-semibold transition-colors border border-emerald-500/25 disabled:opacity-50">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                        </button>
                        <button onClick={() => updateInvite.mutate("DECLINED")}
                            disabled={updateInvite.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 text-xs font-semibold transition-colors border border-rose-500/25 disabled:opacity-50">
                            <XCircle className="h-3.5 w-3.5" /> Decline
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── EventDecisionsModal ──
interface Decision {
    id: string;
    summary: string;
    eventId: string;
    taskId: string | null;
    createdAt: string;
    task?: { id: string; title: string; status: string } | null;
}

function EventDecisionsModal({ event, projects, users, onClose, onSuccess }: {
    event: ApiEvent & { date: string; time: string; endTime: string };
    projects: { id: string; name: string }[];
    users: { id: string; name: string; avatar?: string }[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [newDecision, setNewDecision] = useState("");
    const [savingDecision, setSavingDecision] = useState(false);
    const [convertDecision, setConvertDecision] = useState<Decision | null>(null);

    const [editDecisionId, setEditDecisionId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [updatingDecision, setUpdatingDecision] = useState<string | null>(null);
    const [deletingDecisionId, setDeletingDecisionId] = useState<string | null>(null);

    const { data: decisions = [], isLoading, refetch } = useQuery<Decision[]>({
        queryKey: ["event-decisions", event.id],
        queryFn: async () => (await api.get(`/events/${event.id}/decisions`)).data.data,
    });

    const addDecision = async () => {
        if (!newDecision.trim()) return;
        setSavingDecision(true);
        try {
            await api.post(`/events/${event.id}/decisions`, { summary: newDecision.trim() });
            setNewDecision("");
            refetch();
        } catch (e) { console.error(e); }
        finally { setSavingDecision(false); }
    };

    const saveEdit = async (dId: string) => {
        if (!editValue.trim()) return;
        setUpdatingDecision(dId);
        try {
            await api.patch(`/events/${event.id}/decisions/${dId}`, { summary: editValue.trim() });
            setEditDecisionId(null);
            refetch();
        } catch (e) { console.error(e); }
        finally { setUpdatingDecision(null); }
    };

    const deleteDecision = async (dId: string) => {
        if (!confirm("Are you sure you want to delete this decision?")) return;
        setDeletingDecisionId(dId);
        try {
            await api.delete(`/events/${event.id}/decisions/${dId}`);
            refetch();
        } catch (e) { console.error(e); }
        finally { setDeletingDecisionId(null); }
    };

    if (convertDecision) {
        return (
            <ConvertDecisionToTaskModal
                decision={convertDecision}
                event={event}
                projects={projects}
                users={users}
                onClose={() => setConvertDecision(null)}
                onSuccess={() => { setConvertDecision(null); refetch(); onSuccess(); }}
            />
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/20">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Lightbulb className="h-5 w-5 text-amber-400" /> Meeting Decisions
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">{event.title}</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"><XCircle className="h-5 w-5" /></button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto max-h-[55vh]">
                    {/* Add Decision */}
                    <div className="flex gap-2">
                        <input
                            value={newDecision}
                            onChange={e => setNewDecision(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") addDecision(); }}
                            placeholder="Type a decision from this meeting..."
                            className="flex-1 bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:text-slate-600"
                        />
                        <Button onClick={addDecision} disabled={savingDecision || !newDecision.trim()} className="bg-amber-600 hover:bg-amber-500 text-white shrink-0">
                            {savingDecision ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                        </Button>
                    </div>

                    {/* Decisions List */}
                    {isLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
                    ) : decisions.length === 0 ? (
                        <div className="flex flex-col items-center py-10 text-slate-600">
                            <Lightbulb className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">No decisions yet. Add one above.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {decisions.map(d => (
                                <div key={d.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 group relative">
                                    <div className="flex-1 min-w-0">
                                        {editDecisionId === d.id ? (
                                            <div className="flex gap-2">
                                                <input
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onKeyDown={e => { if (e.key === "Enter") saveEdit(d.id); if (e.key === "Escape") setEditDecisionId(null); }}
                                                    autoFocus
                                                    className="flex-1 bg-slate-950/80 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500/60 transition-all"
                                                />
                                                <Button onClick={() => saveEdit(d.id)} disabled={updatingDecision === d.id || !editValue.trim()} size="sm" className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 border border-emerald-500/30 px-3 py-0 h-8">
                                                    {updatingDecision === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                                </Button>
                                                <Button onClick={() => setEditDecisionId(null)} size="sm" variant="ghost" className="text-slate-400 hover:text-white px-2 py-0 h-8"><XCircle className="h-4 w-4" /></Button>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-sm text-slate-200 pr-12">{d.summary}</p>
                                                {d.task ? (
                                                    <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                                                        <CheckCircle className="h-3 w-3" /> Linked to: {d.task.title}
                                                        <span className="ml-1 text-[10px] text-slate-500">({d.task.status})</span>
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-slate-500 mt-1">Not yet converted to task</p>
                                                )}

                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                    <button onClick={() => { setEditDecisionId(d.id); setEditValue(d.summary); }} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors" title="Edit Decision">
                                                        <Edit className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button onClick={() => deleteDecision(d.id)} disabled={deletingDecisionId === d.id} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50" title="Delete Decision">
                                                        {deletingDecisionId === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash className="h-3.5 w-3.5" />}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    {!d.task && editDecisionId !== d.id && (
                                        <button
                                            onClick={() => setConvertDecision(d)}
                                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 text-xs font-semibold transition-colors border border-indigo-500/25 mt-0.5"
                                        >
                                            Convert <ArrowRight className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-800">
                    <Button variant="ghost" onClick={onClose} className="w-full text-slate-400 hover:text-white">Close</Button>
                </div>
            </div>
        </div>
    );
}

// ── ConvertDecisionToTaskModal ──
function ConvertDecisionToTaskModal({ decision, event, projects, users, onClose, onSuccess }: {
    decision: Decision;
    event: ApiEvent;
    projects: { id: string; name: string }[];
    users: { id: string; name: string; avatar?: string }[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [form, setForm] = useState({
        title: decision.summary,
        projectId: event.project?.id ?? "",
        assigneeId: "",
        priority: "MINOR",
        startDate: "",
        endDate: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.projectId || !form.assigneeId) {
            setError("Project and Assignee are required.");
            return;
        }
        setLoading(true); setError("");
        try {
            await api.post("/tasks", {
                title: form.title,
                projectId: form.projectId,
                assigneeId: form.assigneeId,
                priority: form.priority,
                status: "PENDING",
                startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
                endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
                decisionId: decision.id,
            });
            onSuccess();
        } catch (err: unknown) {
            const apiErr = err as { response?: { data?: { message?: string } } };
            setError(apiErr.response?.data?.message || "Failed to create task.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
            <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <ArrowRight className="h-4 w-4 text-indigo-400" /> Convert to Task
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">Creates a task linked to this decision</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white"><XCircle className="h-4 w-4" /></button>
                </div>

                <div className="p-6 space-y-4">
                    {error && <p className="text-xs text-rose-400 bg-rose-500/10 px-3 py-2 rounded-lg">{error}</p>}

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Task Title</label>
                        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required
                            className="w-full h-9 px-3 rounded-xl bg-slate-950/50 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Project *</label>
                            <select required value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}
                                className="w-full h-9 px-3 rounded-xl bg-slate-950/50 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500">
                                <option value="">Select...</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Assign To *</label>
                            <select required value={form.assigneeId} onChange={e => setForm({ ...form, assigneeId: e.target.value })}
                                className="w-full h-9 px-3 rounded-xl bg-slate-950/50 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500">
                                <option value="">Select...</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Priority</label>
                            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                                className="w-full h-9 px-3 rounded-xl bg-slate-950/50 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500">
                                <option value="MINOR">Minor</option>
                                <option value="MAJOR">Major</option>
                                <option value="HIGH">High</option>
                                <option value="CRITICAL">Critical</option>
                            </select>
                        </div>
                        <div></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Start Date</label>
                            <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                                className="w-full h-9 px-3 rounded-xl bg-slate-950/50 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 [color-scheme:dark]" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Deadline</label>
                            <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                                className="w-full h-9 px-3 rounded-xl bg-slate-950/50 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 [color-scheme:dark]" />
                        </div>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <p className="text-[11px] text-amber-400 font-medium">🔗 Decision Source: {decision.summary}</p>
                    </div>
                </div>

                <div className="flex gap-2 px-6 py-4 border-t border-slate-800">
                    <Button type="button" variant="ghost" onClick={onClose} className="flex-1 text-slate-400 hover:text-white">Cancel</Button>
                    <Button type="submit" disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Task"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
