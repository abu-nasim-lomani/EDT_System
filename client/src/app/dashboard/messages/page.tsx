"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
    Search, Send, Plus, Info, Hash, Lock, Check, CheckCheck, XCircle, MessageSquare, Users, UserMinus, UserPlus
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────
interface User {
    id: string;
    name: string;
    avatar?: string;
    role: string;
}

interface Message {
    id: string;
    text: string;
    createdAt: string;
    senderId: string;
    sender: { id: string; name: string; avatar?: string };
}

interface ConvMember {
    userId: string;
    role: "ADMIN" | "MEMBER";
    user: User;
}

interface Conversation {
    id: string;
    type: "DIRECT" | "GROUP";
    name?: string;
    avatar?: string;
    updatedAt: string;
    members: ConvMember[];
    messages: Message[]; // Last message preview
    // Linked context
    project?: { id: string; name: string };
    task?: { id: string; title: string };
    event?: { id: string; title: string };
    decision?: { id: string; summary: string };
}

// ─── Main Page ────────────────────────────────────────────────
export default function MessagesPage() {
    const currentUser = useAuthStore(s => s.user);
    const queryClient = useQueryClient();

    const [activeId, setActiveId] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [search, setSearch] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    // Modals & Panels
    const [showNewDirect, setShowNewDirect] = useState(false);
    const [showNewGroup, setShowNewGroup] = useState(false);
    const [showGroupInfo, setShowGroupInfo] = useState(false);

    // ─── Data Fetching ───
    const { data: convos = [], isLoading: loadingConvos } = useQuery<Conversation[]>({
        queryKey: ["conversations"],
        queryFn: async () => (await api.get("/conversations")).data.data,
        refetchInterval: 5000,
    });

    const { data: activeMessages = [], isLoading: loadingMessages } = useQuery<Message[]>({
        queryKey: ["messages", activeId],
        queryFn: async () => {
            if (!activeId) return [];
            return (await api.get(`/conversations/${activeId}/messages`)).data.data;
        },
        enabled: !!activeId,
        refetchInterval: 3000,
    });

    const activeConvo = useMemo(() => convos.find(c => c.id === activeId), [convos, activeId]);

    // Format display for sidebar
    const formattedConvos = useMemo(() => {
        return convos.map(c => {
            let displayTitle = c.name || "Group Chat";
            let initials = "GC";
            let color = "from-indigo-500 to-indigo-700";

            if (c.type === "DIRECT") {
                const other = c.members.find(m => m.userId !== currentUser?.id)?.user;
                if (other) {
                    displayTitle = other.name;
                    initials = other.name.substring(0, 2).toUpperCase();
                    // Generate color consistently based on name
                    const colors = ["from-rose-500 to-rose-700", "from-emerald-500 to-emerald-700", "from-amber-500 to-amber-700", "from-blue-500 to-blue-700", "from-violet-500 to-violet-700"];
                    color = colors[other.name.length % colors.length];
                }
            } else {
                initials = displayTitle.substring(0, 2).toUpperCase();
                color = "from-slate-600 to-slate-800";
            }

            const lastMsg = c.messages?.[0];
            let lastMsgText = "No messages yet";
            if (lastMsg) {
                lastMsgText = lastMsg.senderId === currentUser?.id ? `You: ${lastMsg.text}` : lastMsg.text;
            }

            return { ...c, displayTitle, initials, color, lastMsgText, lastTime: lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "" };
        }).filter(c => c.displayTitle.toLowerCase().includes(search.toLowerCase()));
    }, [convos, currentUser?.id, search]);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [activeMessages]);

    // Send Message
    const sendMessageMutation = useMutation({
        mutationFn: async (text: string) => {
            if (!activeId) return;
            await api.post(`/conversations/${activeId}/messages`, { text });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["messages", activeId] });
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
    });

    const handleSend = () => {
        if (!input.trim() || sendMessageMutation.isPending) return;
        const text = input.trim();
        setInput(""); // Clear immediately for instant UX
        sendMessageMutation.mutate(text);
    };

    return (
        <div className="flex h-[calc(100vh-3.5rem-3rem)] min-h-0 gap-0 rounded-2xl overflow-hidden border border-slate-800">
            {/* ── Left: Conversation List ── */}
            <div className="w-[300px] shrink-0 flex flex-col bg-[hsl(222_47%_11%)] border-r border-slate-800">
                <div className="px-4 py-4 border-b border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-white">Messages</h2>
                        <div className="flex gap-2">
                            <button onClick={() => setShowNewDirect(true)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors" title="New Direct Message">
                                <Plus className="h-4 w-4" />
                            </button>
                            <button onClick={() => setShowNewGroup(true)} className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors" title="New Group">
                                <Users className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 h-8 rounded-xl bg-slate-900/80 border border-slate-700/60">
                        <Search className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search conversations…"
                            className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-600 outline-none" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
                    {loadingConvos ? (
                        <div className="p-4 text-center text-xs text-slate-500">Loading...</div>
                    ) : formattedConvos.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center">
                            <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
                            No conversations found.
                        </div>
                    ) : (
                        formattedConvos.map(c => (
                            <button key={c.id} onClick={() => setActiveId(c.id)}
                                className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-800/40 transition-colors
                                ${activeId === c.id ? "bg-slate-800/50 border-l-2 border-indigo-500" : ""}`}>
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${c.color} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                                    {c.type === "GROUP" ? <Hash className="w-4 h-4 opacity-50 absolute" /> : null}
                                    <span className="relative z-10">{c.initials}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-white truncate flex items-center gap-1">
                                            {c.type === "GROUP" && <Lock className="w-3 h-3 text-slate-500" />} {c.displayTitle}
                                        </p>
                                        <span className="text-[10px] text-slate-600 shrink-0 ml-2">{c.lastTime}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate mt-0.5">{c.lastMsgText}</p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* ── Right: Chat Window ── */}
            <div className="flex-1 flex flex-col min-w-0 bg-[hsl(222_47%_10%)] relative">
                {!activeId || !activeConvo ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                        <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                        <p className="font-medium text-white/60">Select a conversation or start a new one</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[hsl(222_47%_11%)]">
                            <div className="flex items-center gap-3">
                                <div>
                                    <p className="text-sm font-bold text-white flex items-center gap-1.5">
                                        {activeConvo.type === "GROUP" && <Hash className="w-4 h-4 text-slate-500" />}
                                        {formattedConvos.find(c => c.id === activeId)?.displayTitle}
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        {activeConvo.type === "GROUP"
                                            ? `${activeConvo.members.length} members`
                                            : activeConvo.members.find(m => m.userId !== currentUser?.id)?.user.role?.replace("_", " ")}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {activeConvo.project && (
                                    <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-md border border-indigo-500/20 mr-2">
                                        Project: {activeConvo.project.name}
                                    </span>
                                )}
                                <button onClick={() => setShowGroupInfo(!showGroupInfo)} className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${showGroupInfo ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                                    <Info className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                            {loadingMessages ? (
                                <div className="text-center text-xs text-slate-500">Loading messages...</div>
                            ) : activeMessages.map((msg, i) => {
                                const isMine = msg.senderId === currentUser?.id;
                                const prev = activeMessages[i - 1];
                                const timeStr = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                const showAvatar = !isMine && (!prev || prev.senderId !== msg.senderId);

                                return (
                                    <div key={msg.id}>
                                        <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}>
                                            {!isMine && showAvatar && (
                                                <div className="text-[10px] text-slate-500 ml-9 mb-1 font-medium">{msg.sender.name}</div>
                                            )}
                                        </div>
                                        <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                                            {!isMine && (
                                                <div className={`w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mr-2 mt-auto opacity-${showAvatar ? '100' : '0'}`}>
                                                    {msg.sender.name.substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                            <div className={`max-w-[70%] group`}>
                                                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                                                    ${isMine
                                                        ? "bg-indigo-600 text-white rounded-br-sm"
                                                        : "bg-slate-800 text-slate-200 rounded-bl-sm"
                                                    }`}>
                                                    {msg.text}
                                                </div>
                                                <div className={`flex items-center gap-1 mt-1 px-1 ${isMine ? "justify-end" : "justify-start"}`}>
                                                    <span className="text-[10px] text-slate-600">{timeStr}</span>
                                                    {isMine && <CheckCheck className="h-3 w-3 text-indigo-400" />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={bottomRef} />
                        </div>

                        <div className="px-4 py-3 border-t border-slate-800 bg-[hsl(222_47%_11%)]">
                            <div className="flex items-end gap-3">
                                <div className="flex-1 flex items-end gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-700 focus-within:border-indigo-500/50 transition-colors">
                                    <textarea
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                        placeholder="Type a message… (Enter to send)"
                                        rows={1}
                                        className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none resize-none max-h-28"
                                    />
                                </div>
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || sendMessageMutation.isPending}
                                    className="w-10 h-10 flex items-center justify-center rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all shrink-0">
                                    {sendMessageMutation.isPending ? <span className="animate-spin text-sm">↻</span> : <Send className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    </>
                )}
                {/* Right Slide Panel for Group Info */}
                {showGroupInfo && activeConvo && (
                    <div className="absolute top-0 right-0 bottom-0 w-80 bg-slate-900 border-l border-slate-800 shadow-xl overflow-y-auto animate-in slide-in-from-right-8 z-10">
                        <GroupInfoPanel
                            conversation={activeConvo}
                            currentUser={currentUser}
                            onClose={() => setShowGroupInfo(false)}
                        />
                    </div>
                )}
            </div>

            {/* Modals */}
            {showNewDirect && <NewDirectModal onClose={() => setShowNewDirect(false)} onSelect={(id) => { setActiveId(id); setShowNewDirect(false); }} />}
            {showNewGroup && <NewGroupModal onClose={() => setShowNewGroup(false)} onCreated={(id) => { setActiveId(id); setShowNewGroup(false); }} />}
        </div>
    );
}


// ─── Modals ───

function NewDirectModal({ onClose, onSelect }: { onClose: () => void, onSelect: (id: string) => void }) {
    const { data: users = [] } = useQuery<User[]>({
        queryKey: ["users"],
        queryFn: async () => (await api.get("/users")).data.data
    });

    const mutation = useMutation({
        mutationFn: async (userId: string) => {
            return (await api.post("/conversations", { type: "DIRECT", memberIds: [userId] })).data.data.id;
        },
        onSuccess: (id) => onSelect(id)
    });

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <h2 className="text-white font-bold">New Direct Message</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><XCircle className="w-5 h-5" /></button>
                </div>
                <div className="overflow-y-auto p-2">
                    {users.map(u => (
                        <button key={u.id} onClick={() => mutation.mutate(u.id)} disabled={mutation.isPending}
                            className="w-full flex items-center gap-3 p-3 hover:bg-slate-800 rounded-xl text-left transition-colors">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex flex-col items-center justify-center text-xs font-bold text-white">
                                {u.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">{u.name}</p>
                                <p className="text-[10px] text-slate-500">{u.role}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function NewGroupModal({ onClose, onCreated }: { onClose: () => void, onCreated: (id: string) => void }) {
    const { data: users = [] } = useQuery<User[]>({
        queryKey: ["users"],
        queryFn: async () => (await api.get("/users")).data.data
    });
    const { data: projects = [] } = useQuery<{ id: string, name: string }[]>({
        queryKey: ["projects"],
        queryFn: async () => (await api.get("/projects")).data.data
    });

    const [name, setName] = useState("");
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [projectId, setProjectId] = useState("");

    const mutation = useMutation({
        mutationFn: async () => {
            return (await api.post("/conversations", {
                type: "GROUP",
                name,
                memberIds: Array.from(selectedUsers),
                projectId: projectId || undefined
            })).data.data.id;
        },
        onSuccess: (id) => onCreated(id)
    });

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <h2 className="text-white font-bold">Create Group Chat</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><XCircle className="w-5 h-5" /></button>
                </div>
                <div className="p-4 overflow-y-auto space-y-4">
                    <div>
                        <label className="text-xs text-slate-400 mb-1.5 block">Group Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Frontend Team"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
                    </div>

                    <div>
                        <label className="text-xs text-slate-400 mb-1.5 block">Link to Project (Optional)</label>
                        <select value={projectId} onChange={e => setProjectId(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none">
                            <option value="">None</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-slate-400 mb-1.5 block">Select Members ({selectedUsers.size})</label>
                        <div className="space-y-1 max-h-48 overflow-y-auto border border-slate-800 rounded-xl p-1 bg-slate-900/50">
                            {users.map(u => {
                                const isSelected = selectedUsers.has(u.id);
                                return (
                                    <button key={u.id} onClick={() => {
                                        const next = new Set(selectedUsers);
                                        if (isSelected) next.delete(u.id); else next.add(u.id);
                                        setSelectedUsers(next);
                                    }}
                                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors text-sm
                                        ${isSelected ? "bg-indigo-500/10 text-indigo-400" : "hover:bg-slate-800 text-slate-300"}`}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white">
                                                {u.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            {u.name}
                                        </div>
                                        {isSelected && <Check className="w-4 h-4" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-800">
                    <button onClick={() => mutation.mutate()} disabled={!name.trim() || selectedUsers.size === 0 || mutation.isPending}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50">
                        {mutation.isPending ? "Creating..." : "Create Group"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Group Info Panel ───
function GroupInfoPanel({ conversation, currentUser, onClose }: { conversation: Conversation, currentUser: User | null, onClose: () => void }) {
    const queryClient = useQueryClient();
    const isAdmin = conversation.members.find(m => m.userId === currentUser?.id)?.role === "ADMIN";
    const [showAddMember, setShowAddMember] = useState(false);
    const { data: users = [] } = useQuery<User[]>({
        queryKey: ["users"],
        queryFn: async () => (await api.get("/users")).data.data
    });

    // Determine users not already in group
    const availableUsers = users.filter(u => !conversation.members.some(m => m.userId === u.id));

    const addMemberMut = useMutation({
        mutationFn: async (userId: string) => {
            await api.post(`/conversations/${conversation.id}/members`, { memberId: userId });
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["conversations"] }); setShowAddMember(false); }
    });

    const removeMemberMut = useMutation({
        mutationFn: async (userId: string) => {
            await api.delete(`/conversations/${conversation.id}/members/${userId}`);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations"] })
    });

    return (
        <div className="p-5">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-400" />
                    Details
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white"><XCircle className="w-5 h-5" /></button>
            </div>

            {conversation.type === "GROUP" && (
                <div className="mb-6 space-y-4">
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-xl font-bold text-white mb-3">
                            <Hash className="w-6 h-6 opacity-50 absolute" />
                            <span className="relative z-10">{conversation.name?.substring(0, 2).toUpperCase() || "GC"}</span>
                        </div>
                        <h4 className="text-center font-semibold text-white text-lg">{conversation.name || "Group Chat"}</h4>
                        <p className="text-center text-xs text-slate-400 mt-1">{conversation.members.length} members</p>
                    </div>

                    {/* Links */}
                    {(conversation.project || conversation.task || conversation.event || conversation.decision) && (
                        <div className="space-y-2">
                            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Linked Context</h5>
                            {conversation.project && <ContextBadge label="Project" value={conversation.project.name} />}
                            {conversation.task && <ContextBadge label="Task" value={conversation.task.title} />}
                            {conversation.event && <ContextBadge label="Event" value={conversation.event.title} />}
                            {conversation.decision && <ContextBadge label="Decision" value={conversation.decision.summary} />}
                        </div>
                    )}
                    <hr className="border-slate-800" />

                    {/* Members List */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Members</h5>
                            {isAdmin && (
                                <button onClick={() => setShowAddMember(!showAddMember)} className="text-xs text-indigo-400 font-medium hover:text-indigo-300 flex items-center gap-1">
                                    <UserPlus className="w-3 h-3" /> Add
                                </button>
                            )}
                        </div>

                        {showAddMember && isAdmin && (
                            <div className="bg-slate-900 border border-slate-700 rounded-xl p-2 mb-3 max-h-40 overflow-y-auto space-y-1 shadow-lg">
                                {availableUsers.length === 0 ? <p className="text-xs text-slate-500 text-center py-2">No active users to add.</p> : null}
                                {availableUsers.map(u => (
                                    <button key={u.id} onClick={() => addMemberMut.mutate(u.id)} disabled={addMemberMut.isPending}
                                        className="w-full flex items-center justify-between p-2 hover:bg-slate-800 rounded-lg text-left text-xs transition-colors">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[8px] text-white">
                                                {u.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="text-slate-300">{u.name}</span>
                                        </div>
                                        <Plus className="w-3 h-3 text-slate-500" />
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="space-y-1">
                            {conversation.members.map(m => (
                                <div key={m.userId} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 group transition-colors">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                                            {m.user.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-300 font-medium">{m.userId === currentUser?.id ? "You" : m.user.name}</p>
                                            <p className="text-[10px] text-emerald-500">{m.role === "ADMIN" ? "Admin" : ""}</p>
                                        </div>
                                    </div>
                                    {isAdmin && m.userId !== currentUser?.id && (
                                        <button onClick={() => removeMemberMut.mutate(m.userId)} title="Remove user"
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-md transition-all">
                                            <UserMinus className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {conversation.type === "DIRECT" && (
                <div className="space-y-4">
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-center">
                        {(() => {
                            const other = conversation.members.find(m => m.userId !== currentUser?.id)?.user;
                            if (!other) return null;
                            return (
                                <>
                                    <div className="w-16 h-16 mx-auto rounded-full bg-slate-700 flex items-center justify-center text-xl font-bold text-white mb-3">
                                        {other.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <h4 className="font-semibold text-white text-lg">{other.name}</h4>
                                    <p className="text-xs text-slate-400 mt-1">{other.role}</p>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}

function ContextBadge({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex flex-col bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700/50">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">{label}</span>
            <span className="text-sm text-indigo-300 truncate" title={value}>{value}</span>
        </div>
    );
}
