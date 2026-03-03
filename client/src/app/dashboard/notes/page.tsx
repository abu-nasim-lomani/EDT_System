"use client";
import { useState } from "react";
import { Plus, Search, StickyNote, Pin, Tag, MoreHorizontal, X, Bold, Italic, List } from "lucide-react";

type NoteColor = "default" | "indigo" | "amber" | "emerald" | "rose";

interface Note {
    id: string; title: string; content: string;
    project?: string; tags: string[];
    color: NoteColor; pinned: boolean; date: string;
}

const NOTES: Note[] = [
    { id: "n1", title: "Infrastructure Migration — Key Decisions", content: "Decided to use pgBouncer for connection pooling. Max connections set to 100 per service. Database backups scheduled at 2AM UTC daily. Rollback plan: restore from snapshot if replication lag exceeds 30s.", project: "Infra Migration", tags: ["decision", "database"], color: "indigo", pinned: true, date: "Mar 2" },
    { id: "n2", title: "Q3 Marketing Campaign Notes", content: "Target audience: B2B SaaS companies with 50-200 employees. Key messaging: 'Automate the mundane, focus on growth'. Channels: LinkedIn, email drip, webinar. Budget allocation pending ARR approval.", project: "Q3 Marketing", tags: ["campaign", "strategy"], color: "amber", pinned: true, date: "Mar 1" },
    { id: "n3", title: "Mobile App V2 — UX Feedback", content: "User testing session revealed confusion around the onboarding flow. Users skipping the tutorial. Recommendation: add a progress indicator and reduce onboarding steps from 7 to 4.", project: "Mobile App V2", tags: ["ux", "feedback"], color: "emerald", pinned: false, date: "Feb 28" },
    { id: "n4", title: "Weekly Sync Talking Points", content: "1. Infra migration status update\n2. Q3 campaign asset approval\n3. Mobile app bug TKT-003\n4. New team member onboarding — Delta team", project: undefined, tags: ["meeting", "agenda"], color: "default", pinned: false, date: "Feb 27" },
    { id: "n5", title: "Compliance Training Notes", content: "Data privacy regulation changes effective April 1. All staff must complete updated GDPR module. Penalty for non-compliance: up to €20M or 4% of global turnover. Action: schedule mandatory training by Mar 15.", project: "Compliance", tags: ["compliance", "gdpr"], color: "rose", pinned: false, date: "Feb 25" },
];

const COLOR_MAP: Record<NoteColor, { card: string; dot: string }> = {
    default: { card: "border-slate-700", dot: "bg-slate-500" },
    indigo: { card: "border-indigo-500/40", dot: "bg-indigo-500" },
    amber: { card: "border-amber-500/40", dot: "bg-amber-500" },
    emerald: { card: "border-emerald-500/40", dot: "bg-emerald-500" },
    rose: { card: "border-rose-500/40", dot: "bg-rose-500" },
};

export default function NotesPage() {
    const [search, setSearch] = useState("");
    const [active, setActive] = useState<Note | null>(null);
    const [creating, setCreating] = useState(false);

    const filtered = NOTES.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase())
    );
    const pinned = filtered.filter(n => n.pinned);
    const unpinned = filtered.filter(n => !n.pinned);

    return (
        <div className="flex gap-4 h-[calc(100vh-3.5rem-3rem)] min-h-0">
            {/* ── Left: Note List ── */}
            <div className={`edt-card overflow-hidden flex flex-col ${active ? "hidden xl:flex xl:w-[320px] shrink-0" : "flex-1"}`}>
                <div className="px-4 py-4 border-b border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-base font-bold text-white">Notes</h1>
                            <p className="text-xs text-slate-500 mt-0.5">{NOTES.length} notes</p>
                        </div>
                        <button onClick={() => { setCreating(true); setActive(null); }}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-colors">
                            <Plus className="h-3.5 w-3.5" /> New Note
                        </button>
                    </div>
                    <div className="flex items-center gap-2 px-3 h-9 rounded-xl bg-slate-900/80 border border-slate-700/60">
                        <Search className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search notes…"
                            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {pinned.length > 0 && (
                        <>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 px-4 pt-4 pb-2 flex items-center gap-1.5">
                                <Pin className="h-3 w-3" /> Pinned
                            </p>
                            {pinned.map(n => <NoteRow key={n.id} note={n} active={active?.id === n.id} onClick={() => { setActive(n); setCreating(false); }} />)}
                        </>
                    )}
                    {unpinned.length > 0 && (
                        <>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 px-4 pt-4 pb-2">All Notes</p>
                            {unpinned.map(n => <NoteRow key={n.id} note={n} active={active?.id === n.id} onClick={() => { setActive(n); setCreating(false); }} />)}
                        </>
                    )}
                </div>
            </div>

            {/* ── Right: Note Editor / Viewer ── */}
            {(active || creating) && (
                <div className="flex-1 edt-card overflow-hidden flex flex-col min-w-0">
                    <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 gap-3">
                        {/* Toolbar */}
                        <div className="flex items-center gap-1">
                            {[Bold, Italic, List].map((Icon, i) => (
                                <button key={i} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
                                    <Icon className="h-3.5 w-3.5" />
                                </button>
                            ))}
                            <div className="w-px h-4 bg-slate-800 mx-1" />
                            {(["default", "indigo", "amber", "emerald", "rose"] as NoteColor[]).map(c => (
                                <button key={c} className={`w-4 h-4 rounded-full ${COLOR_MAP[c].dot} ${active?.color === c ? "ring-2 ring-white ring-offset-1 ring-offset-slate-900" : ""} transition-all`} />
                            ))}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button className="flex items-center gap-1.5 h-7 px-3 rounded-xl bg-indigo-600 text-xs font-semibold text-white">Save</button>
                            <button onClick={() => { setActive(null); setCreating(false); }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto px-8 py-6">
                        <input
                            defaultValue={creating ? "" : active?.title}
                            placeholder="Note title…"
                            className="w-full bg-transparent text-2xl font-bold text-white placeholder:text-slate-700 outline-none mb-4"
                        />
                        {active?.project && (
                            <span className="inline-block text-xs px-2 py-0.5 rounded-full badge-in-progress mb-4">{active.project}</span>
                        )}
                        <textarea
                            defaultValue={creating ? "" : active?.content}
                            placeholder="Start writing…"
                            className="w-full bg-transparent text-sm text-slate-300 leading-relaxed outline-none resize-none min-h-[300px] placeholder:text-slate-700"
                        />
                        {active?.tags && active.tags.length > 0 && (
                            <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800">
                                <Tag className="h-3.5 w-3.5 text-slate-600" />
                                {active.tags.map(t => (
                                    <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">#{t}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!active && !creating && (
                <div className="flex-1 edt-card flex flex-col items-center justify-center gap-3 text-slate-700">
                    <StickyNote className="h-10 w-10" />
                    <p className="text-sm font-medium text-slate-500">Select a note or create a new one</p>
                </div>
            )}
        </div>
    );
}

function NoteRow({ note, active, onClick }: { note: Note; active: boolean; onClick: () => void }) {
    const { card } = COLOR_MAP[note.color];
    return (
        <button onClick={onClick}
            className={`w-full text-left px-4 py-3 hover:bg-slate-800/40 transition-colors border-l-2 ${card} ${active ? "bg-slate-800/50" : ""}`}>
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{note.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate line-clamp-1">{note.content.slice(0, 60)}…</p>
                </div>
                <div
                    role="button"
                    tabIndex={0}
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => e.stopPropagation()}
                    className="p-1 rounded text-slate-700 hover:text-slate-400 shrink-0 cursor-pointer">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
                {note.project && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500">{note.project}</span>}
                <span className="text-[10px] text-slate-600 ml-auto">{note.date}</span>
            </div>
        </button>
    );
}
