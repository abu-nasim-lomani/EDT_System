"use client";
import { useState, useRef, useEffect } from "react";
import {
    Search, Send, Plus, Phone, Video,
    MoreHorizontal, Check, CheckCheck,
    Paperclip, Smile, Users
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────
type MessageStatus = "sent" | "delivered" | "read";

interface Message {
    id: string; text: string; time: string;
    isMine: boolean; status?: MessageStatus;
}

interface Conversation {
    id: string; name: string; initials: string;
    role: string; online: boolean; unread: number;
    lastMsg: string; lastTime: string;
    color: string;
    messages: Message[];
}

// ─── Mock Data ────────────────────────────────────────────────
const CONVERSATIONS: Conversation[] = [
    {
        id: "c1", name: "Chris Brown", initials: "CB", role: "PM · Infra Migration", online: true,
        unread: 3, lastMsg: "The replication lag is still growing, needs escalation.", lastTime: "09:41",
        color: "from-blue-500 to-blue-700",
        messages: [
            { id: "m1", text: "Morning! Quick update on the infra migration.", time: "09:30", isMine: false },
            { id: "m2", text: "Sure, go ahead. What's the status?", time: "09:31", isMine: true, status: "read" },
            { id: "m3", text: "We hit a snag — PostgreSQL replication is failing between primary and secondary nodes.", time: "09:33", isMine: false },
            { id: "m4", text: "How bad? Can we roll back?", time: "09:34", isMine: true, status: "read" },
            { id: "m5", text: "Rollback is possible but we'd lose 6 hours of data. The lag is at 45 seconds and climbing.", time: "09:36", isMine: false },
            { id: "m6", text: "Don't roll back yet. Check if it's a network issue between nodes first.", time: "09:37", isMine: true, status: "read" },
            { id: "m7", text: "Already on it — there's a firewall rule blocking port 5432. Raising a ticket now.", time: "09:39", isMine: false },
            { id: "m8", text: "The replication lag is still growing, needs escalation.", time: "09:41", isMine: false },
        ],
    },
    {
        id: "c2", name: "Bob Jones", initials: "BJ", role: "PM · Q3 Marketing", online: true,
        unread: 1, lastMsg: "Assets are ready. Can I get your sign-off today?", lastTime: "09:15",
        color: "from-amber-500 to-amber-700",
        messages: [
            { id: "m1", text: "Hi John, the Q3 campaign assets are finalised.", time: "08:55", isMine: false },
            { id: "m2", text: "Great! Send them over for review.", time: "08:57", isMine: true, status: "read" },
            { id: "m3", text: "Also the creative brief and budget breakdown are included.", time: "09:00", isMine: false },
            { id: "m4", text: "Assets are ready. Can I get your sign-off today?", time: "09:15", isMine: false },
        ],
    },
    {
        id: "c3", name: "Diana White", initials: "DW", role: "PM · Mobile App V2", online: false,
        unread: 0, lastMsg: "TKT-003 raised. Android 14 crash is being investigated.", lastTime: "Yesterday",
        color: "from-violet-500 to-violet-700",
        messages: [
            { id: "m1", text: "John, we have a critical bug on Android 14 login.", time: "Yesterday 15:20", isMine: false },
            { id: "m2", text: "Can you reproduce it consistently?", time: "Yesterday 15:22", isMine: true, status: "read" },
            { id: "m3", text: "Yes — every time on Pixel 8 and S24. Crash on app launch.", time: "Yesterday 15:25", isMine: false },
            { id: "m4", text: "TKT-003 raised. Android 14 crash is being investigated.", time: "Yesterday 15:30", isMine: false },
        ],
    },
    {
        id: "c4", name: "Alice Smith", initials: "AS", role: "PM · Web App Revamp", online: true,
        unread: 0, lastMsg: "Dashboard load time is back to 380ms after the fix 🎉", lastTime: "Yesterday",
        color: "from-emerald-500 to-emerald-700",
        messages: [
            { id: "m1", text: "Performance issue resolved! It was an N+1 query.", time: "Yesterday 11:00", isMine: false },
            { id: "m2", text: "Excellent work. How are load times now?", time: "Yesterday 11:02", isMine: true, status: "read" },
            { id: "m3", text: "Dashboard load time is back to 380ms after the fix 🎉", time: "Yesterday 11:05", isMine: false },
        ],
    },
    {
        id: "c5", name: "EDT Team", initials: "ET", role: "Group · 12 members", online: false,
        unread: 0, lastMsg: "Next all-hands is March 7 at 10AM.", lastTime: "Feb 28",
        color: "from-rose-500 to-rose-700",
        messages: [
            { id: "m1", text: "Reminder: Monthly all-hands meeting coming up.", time: "Feb 28 09:00", isMine: false },
            { id: "m2", text: "Next all-hands is March 7 at 10AM.", time: "Feb 28 09:05", isMine: false },
        ],
    },
];

const STATUS_ICON = {
    sent: <Check className="h-3 w-3 text-slate-600" />,
    delivered: <CheckCheck className="h-3 w-3 text-slate-500" />,
    read: <CheckCheck className="h-3 w-3 text-indigo-400" />,
};

// ─── Main Page ────────────────────────────────────────────────
export default function MessagesPage() {
    const [active, setActive] = useState<Conversation>(CONVERSATIONS[0]);
    const [input, setInput] = useState("");
    const [search, setSearch] = useState("");
    const [convos, setConvos] = useState(CONVERSATIONS);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [active]);

    const sendMessage = () => {
        if (!input.trim()) return;
        const newMsg: Message = { id: `m${Date.now()}`, text: input.trim(), time: "Now", isMine: true, status: "sent" };
        const updated = convos.map(c =>
            c.id === active.id
                ? { ...c, messages: [...c.messages, newMsg], lastMsg: input.trim(), lastTime: "Now", unread: 0 }
                : c
        );
        setConvos(updated);
        setActive(updated.find(c => c.id === active.id)!);
        setInput("");
    };

    const filtered = convos.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-3.5rem-3rem)] min-h-0 gap-0 rounded-2xl overflow-hidden border border-slate-800">
            {/* ── Left: Conversation List ── */}
            <div className="w-[300px] shrink-0 flex flex-col bg-[hsl(222_47%_11%)] border-r border-slate-800">
                {/* Header */}
                <div className="px-4 py-4 border-b border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-white">Messages</h2>
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <div className="flex items-center gap-2 px-3 h-8 rounded-xl bg-slate-900/80 border border-slate-700/60">
                        <Search className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search conversations…"
                            className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-600 outline-none" />
                    </div>
                </div>

                {/* Online indicator row */}
                <div className="flex gap-3 px-4 py-3 border-b border-slate-800 overflow-x-auto">
                    {CONVERSATIONS.filter(c => c.online).map(c => (
                        <button key={c.id} onClick={() => setActive(c)} className="flex flex-col items-center gap-1 shrink-0">
                            <div className="relative">
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${c.color} flex items-center justify-center text-xs font-bold text-white`}>
                                    {c.initials}
                                </div>
                                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[hsl(222_47%_11%)]" />
                            </div>
                            <span className="text-[9px] text-slate-500 max-w-[40px] truncate">{c.name.split(" ")[0]}</span>
                        </button>
                    ))}
                </div>

                {/* Convo list */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
                    {filtered.map(c => (
                        <button key={c.id} onClick={() => setActive(c)}
                            className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-800/40 transition-colors
                ${active.id === c.id ? "bg-slate-800/50 border-l-2 border-indigo-500" : ""}`}>
                            {/* Avatar */}
                            <div className="relative shrink-0">
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${c.color} flex items-center justify-center text-xs font-bold text-white`}>
                                    {c.initials}
                                </div>
                                {c.online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[hsl(222_47%_11%)]" />}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                                    <span className="text-[10px] text-slate-600 shrink-0 ml-2">{c.lastTime}</span>
                                </div>
                                <p className="text-xs text-slate-500 truncate mt-0.5">{c.lastMsg}</p>
                            </div>
                            {c.unread > 0 && (
                                <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-[10px] font-bold text-white flex items-center justify-center mt-0.5">
                                    {c.unread}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Right: Chat Window ── */}
            <div className="flex-1 flex flex-col min-w-0 bg-[hsl(222_47%_10%)]">
                {/* Chat Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[hsl(222_47%_11%)]">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${active.color} flex items-center justify-center text-xs font-bold text-white`}>
                                {active.initials}
                            </div>
                            {active.online && <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border-2 border-[hsl(222_47%_11%)]" />}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">{active.name}</p>
                            <p className="text-[11px] text-slate-500">{active.online ? "🟢 Online" : "Last seen recently"} · {active.role}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <HeaderBtn icon={Phone} />
                        <HeaderBtn icon={Video} />
                        <HeaderBtn icon={Users} />
                        <HeaderBtn icon={MoreHorizontal} />
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                    {active.messages.map((msg, i) => {
                        const prev = active.messages[i - 1];
                        const showTime = !prev || prev.time !== msg.time;
                        return (
                            <div key={msg.id}>
                                {showTime && i > 0 && (
                                    <div className="flex justify-center my-2">
                                        <span className="text-[10px] text-slate-600 px-3 py-1 rounded-full bg-slate-800/50">{msg.time}</span>
                                    </div>
                                )}
                                <div className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}>
                                    {!msg.isMine && (
                                        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${active.color} flex items-center justify-center text-[10px] font-bold text-white shrink-0 mr-2 mt-auto`}>
                                            {active.initials}
                                        </div>
                                    )}
                                    <div className={`max-w-[70%] group`}>
                                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                      ${msg.isMine
                                                ? "bg-indigo-600 text-white rounded-br-sm"
                                                : "bg-slate-800 text-slate-200 rounded-bl-sm"
                                            }`}>
                                            {msg.text}
                                        </div>
                                        <div className={`flex items-center gap-1 mt-1 px-1 ${msg.isMine ? "justify-end" : "justify-start"}`}>
                                            <span className="text-[10px] text-slate-600">{msg.time}</span>
                                            {msg.isMine && msg.status && STATUS_ICON[msg.status]}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={bottomRef} />
                </div>

                {/* ── Input Bar ── */}
                <div className="px-4 py-3 border-t border-slate-800 bg-[hsl(222_47%_11%)]">
                    <div className="flex items-end gap-3">
                        <div className="flex-1 flex items-end gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-700 focus-within:border-indigo-500/50 transition-colors">
                            <button className="text-slate-500 hover:text-slate-300 transition-colors pb-0.5">
                                <Paperclip className="h-4 w-4" />
                            </button>
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                                placeholder="Type a message… (Enter to send)"
                                rows={1}
                                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none resize-none max-h-28"
                            />
                            <button className="text-slate-500 hover:text-slate-300 transition-colors pb-0.5">
                                <Smile className="h-4 w-4" />
                            </button>
                        </div>
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim()}
                            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all">
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function HeaderBtn({ icon: Icon }: { icon: React.ElementType }) {
    return (
        <button className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <Icon className="h-4 w-4" />
        </button>
    );
}
