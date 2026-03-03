"use client";
import { useState } from "react";
import {
    Plus, Search, Filter, X, Clock, ChevronRight,
    AlertTriangle, CheckCircle2, Loader2, XCircle,
    MessageSquare, Paperclip, Send, User, CalendarDays, Ticket
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────
type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";
type TicketPriority = "Critical" | "High" | "Medium" | "Low";

interface Comment { id: string; author: string; initials: string; time: string; text: string; }
interface TicketItem {
    id: string; title: string; description: string;
    status: TicketStatus; priority: TicketPriority;
    project: string; task?: string;
    raisedBy: string; raisedByInitials: string;
    assignedTo: string; assignedToInitials: string;
    date: string; updatedAt: string;
    comments: Comment[];
    escalated?: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────
const TICKETS: TicketItem[] = [
    {
        id: "TKT-001", title: "Infrastructure migration stuck at DB replication",
        description: "The PostgreSQL replication between primary and secondary nodes failed during the migration. We have tried restarting the replication slot but the lag keeps growing beyond acceptable limits.",
        status: "In Progress", priority: "Critical", project: "Infra Migration", task: "DB Replication Setup",
        raisedBy: "Chris Brown", raisedByInitials: "CB", assignedTo: "John Doe", assignedToInitials: "JD",
        date: "2026-02-28", updatedAt: "1 hour ago", escalated: true,
        comments: [
            { id: "c1", author: "John Doe", initials: "JD", time: "2h ago", text: "Looking into the WAL configuration. Possible network latency issue between nodes." },
            { id: "c2", author: "Chris Brown", initials: "CB", time: "1h ago", text: "Confirmed — there is a firewall rule blocking port 5432 between the new instances." },
        ],
    },
    {
        id: "TKT-002", title: "Q3 marketing assets not approved before campaign start",
        description: "Creative assets for the Q3 campaign were not reviewed by the ARR in time. Campaign launch date is approaching and we need urgent sign-off.",
        status: "Open", priority: "High", project: "Q3 Marketing", task: undefined,
        raisedBy: "Bob Jones", raisedByInitials: "BJ", assignedTo: "Sarah Lee", assignedToInitials: "SL",
        date: "2026-03-01", updatedAt: "3 hours ago", escalated: false,
        comments: [],
    },
    {
        id: "TKT-003", title: "Mobile app login crash on Android 14",
        description: "Users on Android 14 are experiencing a crash on the login screen after the latest build. Issue is reproducible on Pixel 8 and Samsung S24.",
        status: "Open", priority: "Critical", project: "Mobile App V2", task: "Auth Module",
        raisedBy: "Diana White", raisedByInitials: "DW", assignedTo: "Unassigned", assignedToInitials: "??",
        date: "2026-03-02", updatedAt: "30 min ago", escalated: false,
        comments: [],
    },
    {
        id: "TKT-004", title: "Web app performance degradation on dashboard load",
        description: "Dashboard load time increased from ~400ms to ~3.2s after the latest deploy. Possible N+1 query issue introduced in the analytics endpoint.",
        status: "Resolved", priority: "High", project: "Web App Revamp", task: "Dashboard API",
        raisedBy: "Alice Smith", raisedByInitials: "AS", assignedTo: "Tom Green", assignedToInitials: "TG",
        date: "2026-02-25", updatedAt: "2 days ago", escalated: false,
        comments: [
            { id: "c3", author: "Tom Green", initials: "TG", time: "2d ago", text: "Root cause identified — eager loading missing on the projects relation. Fixed in patch v2.1.4." },
        ],
    },
    {
        id: "TKT-005", title: "Compliance training completion report missing",
        description: "The data privacy training completion report for Q1 cannot be exported. The export button returns a 500 error.",
        status: "Closed", priority: "Medium", project: "Compliance", task: "Training Reports",
        raisedBy: "Eve Davis", raisedByInitials: "ED", assignedTo: "Tom Green", assignedToInitials: "TG",
        date: "2026-02-20", updatedAt: "5 days ago", escalated: false,
        comments: [],
    },
];

// ─── Config maps ──────────────────────────────────────────────
const STATUS_CFG: Record<TicketStatus, { cls: string; icon: React.ElementType; label: string }> = {
    "Open": { cls: "badge-stuck", icon: AlertTriangle, label: "Open" },
    "In Progress": { cls: "badge-in-progress", icon: Loader2, label: "In Progress" },
    "Resolved": { cls: "badge-completed", icon: CheckCircle2, label: "Resolved" },
    "Closed": { cls: "badge-pending", icon: XCircle, label: "Closed" },
};
const PRIORITY_CFG: Record<TicketPriority, { cls: string }> = {
    Critical: { cls: "priority-critical" },
    High: { cls: "priority-high" },
    Medium: { cls: "priority-major" },
    Low: { cls: "priority-minor" },
};

const STATUS_TABS: (TicketStatus | "All")[] = ["All", "Open", "In Progress", "Resolved", "Closed"];

// ─── Main Page ────────────────────────────────────────────────
export default function TicketsPage() {
    const [activeStatus, setActiveStatus] = useState<TicketStatus | "All">("All");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<TicketItem | null>(null);
    const [showRaise, setShowRaise] = useState(false);
    const [comment, setComment] = useState("");

    const filtered = TICKETS.filter((t) => {
        const matchStatus = activeStatus === "All" || t.status === activeStatus;
        const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
            t.id.toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchSearch;
    });

    const counts: Record<string, number> = {
        All: TICKETS.length,
        Open: TICKETS.filter(t => t.status === "Open").length,
        "In Progress": TICKETS.filter(t => t.status === "In Progress").length,
        Resolved: TICKETS.filter(t => t.status === "Resolved").length,
        Closed: TICKETS.filter(t => t.status === "Closed").length,
    };

    return (
        <div className="flex gap-4 h-[calc(100vh-3.5rem-3rem)] min-h-0">
            {/* ── Left Panel: Ticket List ── */}
            <div className={`edt-card overflow-hidden flex flex-col transition-all duration-300 ${selected ? "hidden xl:flex xl:w-[420px] shrink-0" : "flex-1"}`}>
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-base font-bold text-white">Tickets</h1>
                            <p className="text-xs text-slate-500 mt-0.5">{TICKETS.filter(t => t.status === "Open" || t.status === "In Progress").length} active issues</p>
                        </div>
                        <button onClick={() => setShowRaise(true)}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-colors shrink-0">
                            <Plus className="h-3.5 w-3.5" /> Raise Ticket
                        </button>
                    </div>
                    {/* Search */}
                    <div className="flex items-center gap-2 px-3 h-9 rounded-xl bg-slate-900/80 border border-slate-700/60">
                        <Search className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search tickets…"
                            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none" />
                    </div>
                    {/* Status tabs */}
                    <div className="flex gap-1 overflow-x-auto pb-0.5">
                        {STATUS_TABS.map((tab) => (
                            <button key={tab} onClick={() => setActiveStatus(tab)}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all
                  ${activeStatus === tab ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-white hover:bg-slate-800"}`}>
                                {tab}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
                  ${activeStatus === tab ? "bg-white/20 text-white" : "bg-slate-800 text-slate-500"}`}>
                                    {counts[tab]}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Ticket rows */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                            <Ticket className="h-8 w-8 mb-3" />
                            <p className="text-sm font-medium">No tickets found</p>
                        </div>
                    ) : filtered.map((t) => {
                        const sc = STATUS_CFG[t.status];
                        const pc = PRIORITY_CFG[t.priority];
                        const Icon = sc.icon;
                        return (
                            <button key={t.id} onClick={() => setSelected(t)}
                                className={`w-full text-left px-5 py-4 hover:bg-slate-800/40 transition-colors
                  ${selected?.id === t.id ? "bg-slate-800/50 border-l-2 border-indigo-500" : ""}
                  ${t.priority === "Critical" && t.status !== "Resolved" && t.status !== "Closed" ? "border-l-2 border-rose-500" : ""}`}>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-mono text-slate-600">{t.id}</span>
                                            {t.escalated && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/25 uppercase tracking-wide">Escalated</span>}
                                        </div>
                                        <p className="text-sm font-semibold text-white leading-snug line-clamp-1">{t.title}</p>
                                        <p className="text-xs text-slate-500 mt-1">{t.project}{t.task ? ` · ${t.task}` : ""}</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-slate-700 mt-0.5 shrink-0" />
                                </div>
                                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pc.cls}`}>{t.priority}</span>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${sc.cls}`}>
                                        <Icon className="h-2.5 w-2.5" /> {sc.label}
                                    </span>
                                    <span className="text-[10px] text-slate-600 ml-auto">{t.updatedAt}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Right Panel: Ticket Detail ── */}
            {selected && (
                <div className="flex-1 edt-card overflow-hidden flex flex-col min-w-0">
                    {/* Detail Header */}
                    <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-800">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-slate-600">{selected.id}</span>
                                {selected.escalated && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/25 uppercase tracking-wide">Escalated</span>}
                            </div>
                            <h2 className="text-base font-bold text-white leading-snug">{selected.title}</h2>
                        </div>
                        <button onClick={() => setSelected(null)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors shrink-0">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {/* Meta grid */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-6 py-5 border-b border-slate-800">
                            {[
                                { label: "Status", val: <StatusPill status={selected.status} /> },
                                { label: "Priority", val: <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_CFG[selected.priority].cls}`}>{selected.priority}</span> },
                                { label: "Project", val: <span className="text-sm text-white">{selected.project}</span> },
                                { label: "Raised By", val: <AvatarLabel initials={selected.raisedByInitials} name={selected.raisedBy} /> },
                                { label: "Assigned To", val: <AvatarLabel initials={selected.assignedToInitials} name={selected.assignedTo} /> },
                                { label: "Raised On", val: <span className="text-sm text-slate-400">{selected.date}</span> },
                            ].map(({ label, val }) => (
                                <div key={label}>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-1">{label}</p>
                                    {val}
                                </div>
                            ))}
                        </div>

                        {/* Description */}
                        <div className="px-6 py-5 border-b border-slate-800">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2">Description</p>
                            <p className="text-sm text-slate-300 leading-relaxed">{selected.description}</p>
                        </div>

                        {/* Action buttons */}
                        <div className="px-6 py-4 border-b border-slate-800 flex gap-2 flex-wrap">
                            {selected.status === "Open" && (
                                <ActionBtn label="Mark In Progress" color="bg-blue-500/15 text-blue-400 border-blue-500/25 hover:bg-blue-500/25" />
                            )}
                            {selected.status === "In Progress" && (
                                <ActionBtn label="Mark Resolved" color="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/25" />
                            )}
                            {selected.status === "Resolved" && (
                                <ActionBtn label="Close Ticket" color="bg-slate-700/50 text-slate-400 border-slate-600 hover:bg-slate-700" />
                            )}
                            {(selected.status === "Open" || selected.status === "In Progress") && !selected.escalated && (
                                <ActionBtn label="Escalate to SM" color="bg-rose-500/15 text-rose-400 border-rose-500/25 hover:bg-rose-500/25" />
                            )}
                            <ActionBtn label={<><Paperclip className="h-3.5 w-3.5" /> Attach File</>} color="bg-slate-800 text-slate-400 border-slate-700 hover:text-white" />
                        </div>

                        {/* Comments */}
                        <div className="px-6 py-5">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-4">
                                <MessageSquare className="h-3 w-3 inline mr-1.5" />
                                Comments ({selected.comments.length})
                            </p>
                            <div className="space-y-4 mb-5">
                                {selected.comments.length === 0 ? (
                                    <p className="text-xs text-slate-600 italic">No comments yet. Be the first to respond.</p>
                                ) : selected.comments.map((c) => (
                                    <div key={c.id} className="flex gap-3">
                                        <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-400 shrink-0">{c.initials}</div>
                                        <div className="flex-1 bg-slate-800/50 rounded-xl px-4 py-3">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="text-xs font-semibold text-white">{c.author}</span>
                                                <span className="text-[10px] text-slate-600">{c.time}</span>
                                            </div>
                                            <p className="text-sm text-slate-300 leading-relaxed">{c.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Comment input */}
                            <div className="flex gap-3">
                                <div className="w-7 h-7 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-[10px] font-bold text-rose-400 shrink-0">JD</div>
                                <div className="flex-1 flex items-end gap-2 bg-slate-900/80 border border-slate-700/60 rounded-xl px-4 py-2.5">
                                    <textarea value={comment} onChange={e => setComment(e.target.value)}
                                        placeholder="Add a comment…"
                                        rows={2}
                                        className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none resize-none" />
                                    <button className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shrink-0">
                                        <Send className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Raise Ticket Modal ── */}
            {showRaise && <RaiseTicketModal onClose={() => setShowRaise(false)} />}
        </div>
    );
}

// ─── Helper Components ────────────────────────────────────────

function StatusPill({ status }: { status: TicketStatus }) {
    const { cls, icon: Icon, label } = STATUS_CFG[status];
    return (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${cls}`}>
            <Icon className="h-3 w-3" /> {label}
        </span>
    );
}

function AvatarLabel({ initials, name }: { initials: string; name: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-300">{initials}</div>
            <span className="text-sm text-white">{name}</span>
        </div>
    );
}

function ActionBtn({ label, color }: { label: React.ReactNode; color: string }) {
    return (
        <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${color}`}>
            {label}
        </button>
    );
}

function RaiseTicketModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="edt-card w-full max-w-lg mx-4 overflow-hidden shadow-2xl shadow-black/60">
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <div>
                        <h3 className="text-base font-bold text-white">Raise a Ticket</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Escalate an issue for review</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Form */}
                <div className="px-6 py-5 space-y-4">
                    <Field label="Title">
                        <input placeholder="Short, descriptive title…"
                            className="w-full h-9 px-3 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-colors" />
                    </Field>
                    <Field label="Description">
                        <textarea rows={3} placeholder="Describe the issue in detail…"
                            className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-colors resize-none" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Priority">
                            <select className="w-full h-9 px-3 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors">
                                <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
                            </select>
                        </Field>
                        <Field label="Project">
                            <select className="w-full h-9 px-3 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors">
                                <option>Infra Migration</option><option>Web App Revamp</option><option>Mobile App V2</option><option>Q3 Marketing</option>
                            </select>
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Related Task (optional)">
                            <input placeholder="Task name…"
                                className="w-full h-9 px-3 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-colors" />
                        </Field>
                        <Field label="Assign To">
                            <select className="w-full h-9 px-3 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors">
                                <option>John Doe (ARR)</option><option>Sarah Lee (PM)</option><option>Tom Green (PM)</option>
                            </select>
                        </Field>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-800">
                    <button onClick={onClose}
                        className="h-9 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-300 hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button className="h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white transition-colors">
                        Raise Ticket
                    </button>
                </div>
            </div>
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
