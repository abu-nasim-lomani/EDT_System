"use client";
import { useRef, useEffect, useState } from "react";
import { Bell, CalendarDays, CheckCheck, Clock, X, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    link?: string;
    isRead: boolean;
    createdAt: string;
}

const TYPE_ICON: Record<string, { icon: React.ElementType; cls: string }> = {
    RESCHEDULE_REQUEST: { icon: CalendarDays, cls: "text-indigo-400 bg-indigo-500/10" },
    RESCHEDULE_APPROVED: { icon: CheckCircle2, cls: "text-emerald-400 bg-emerald-500/10" },
    RESCHEDULE_REJECTED: { icon: XCircle, cls: "text-rose-400 bg-rose-500/10" },
    EVENT_RESCHEDULED: { icon: CalendarDays, cls: "text-amber-400 bg-amber-500/10" },
    EVENT_INVITE: { icon: CalendarDays, cls: "text-blue-400 bg-blue-500/10" },
};

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

export function NotificationBell() {
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const qc = useQueryClient();

    const { data } = useQuery({
        queryKey: ["notifications"],
        queryFn: async () => (await api.get("/notifications")).data as { data: Notification[]; unreadCount: number },
        refetchInterval: 30000, // poll every 30 s
    });
    const notifications = data?.data ?? [];
    const unreadCount = data?.unreadCount ?? 0;

    const markRead = useMutation({
        mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    });
    const markAll = useMutation({
        mutationFn: () => api.patch("/notifications/read-all"),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    });

    // Close on outside click
    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const handleClick = (n: Notification) => {
        if (!n.isRead) markRead.mutate(n.id);
        setOpen(false);
        if (n.link) router.push(n.link);
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell trigger */}
            <button
                onClick={() => setOpen(v => !v)}
                className={`relative w-8 h-8 flex items-center justify-center rounded-xl border transition-all
                    ${open
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-slate-800/80 border-slate-700/60 text-slate-400 hover:border-indigo-500/50 hover:text-white"
                    }`}
                title="Notifications"
            >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 border border-[hsl(222,47%,10%)] text-[9px] font-bold text-white flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Panel */}
            {open && (
                <div className="absolute right-0 top-10 w-80 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                            <Bell className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-sm font-semibold text-white">Notifications</span>
                            {unreadCount > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400">{unreadCount} new</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAll.mutate()}
                                    className="flex items-center gap-1 text-[10px] font-medium text-indigo-400 hover:text-indigo-300 px-1.5 py-1 rounded-lg hover:bg-slate-800 transition-colors"
                                    title="Mark all read"
                                >
                                    <CheckCheck className="h-3 w-3" /> All read
                                </button>
                            )}
                            <button onClick={() => setOpen(false)} className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="max-h-[380px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-600 gap-2">
                                <Bell className="h-6 w-6 opacity-40" />
                                <p className="text-xs">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(n => {
                                const cfg = TYPE_ICON[n.type] ?? { icon: AlertTriangle, cls: "text-slate-400 bg-slate-500/10" };
                                const Icon = cfg.icon;
                                return (
                                    <button
                                        key={n.id}
                                        onClick={() => handleClick(n)}
                                        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-800/60 border-b border-slate-800/50 last:border-0
                                            ${!n.isRead ? "bg-indigo-500/5" : ""}`}
                                    >
                                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${cfg.cls}`}>
                                            <Icon className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-1">
                                                <p className="text-xs font-semibold text-white leading-snug">{n.title}</p>
                                                {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1" />}
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                                            <p className="text-[10px] text-slate-600 mt-1 flex items-center gap-1">
                                                <Clock className="h-2.5 w-2.5" />{timeAgo(n.createdAt)}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
