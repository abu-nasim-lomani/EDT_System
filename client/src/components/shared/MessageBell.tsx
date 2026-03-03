"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { MessageSquare } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

interface MsgNotification {
    id: string;
    type: string;
    title: string;
    body: string;
    link?: string;
    isRead: boolean;
    createdAt: string;
}

// Utility: time-ago string — defined outside component to avoid "impure call in render" lint
function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${hours}h ago`;
}

// Tiny beep using Web Audio API — no external file needed
function playNotificationSound() {
    try {
        const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch {
        // silently fail if audio context not available
    }
}

export function MessageBell() {
    const router = useRouter();
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const prevUnreadRef = useRef<number>(0);
    const originalTitle = useRef<string>("");

    const { data } = useQuery({
        queryKey: ["msg-notifications"],
        queryFn: async () => {
            const res = await api.get("/notifications/messages");
            const notifications: MsgNotification[] = res.data.data ?? [];
            const unreadCount: number = res.data.unreadCount ?? 0;
            return { notifications, unreadCount };
        },
        refetchInterval: 5000,
    });

    const notifications = data?.notifications ?? [];
    const unreadCount = data?.unreadCount ?? 0;

    const markRead = useMutation({
        mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["msg-notifications"] });
            qc.invalidateQueries({ queryKey: ["notifications"] });
        },
    });

    const markAllRead = useMutation({
        mutationFn: () => api.patch("/notifications/read-all"),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["msg-notifications"] });
            qc.invalidateQueries({ queryKey: ["notifications"] });
        },
    });

    // Sound + browser title on new message
    const isFirstRender = useRef(true);
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!originalTitle.current) originalTitle.current = document.title.replace(/^\(\d+\)\s*/, "");

        if (isFirstRender.current) {
            // Skip sound on initial load — only play on subsequent increases
            isFirstRender.current = false;
            prevUnreadRef.current = unreadCount;
        } else if (unreadCount > prevUnreadRef.current) {
            playNotificationSound();
            prevUnreadRef.current = unreadCount;
        } else {
            prevUnreadRef.current = unreadCount;
        }

        if (unreadCount > 0) {
            document.title = `(${unreadCount}) ${originalTitle.current}`;
        } else {
            document.title = originalTitle.current;
        }
    }, [unreadCount]);

    // Close on outside click
    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const handleClick = useCallback((n: MsgNotification) => {
        if (!n.isRead) markRead.mutate(n.id);
        setOpen(false);
        if (n.link) router.push(n.link);
    }, [markRead, router]);

    return (
        <div className="relative" ref={panelRef}>
            {/* Message icon button */}
            <button
                onClick={() => setOpen(v => !v)}
                className={`relative w-8 h-8 flex items-center justify-center rounded-xl border transition-all
                    ${open
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-theme-element border-theme text-theme-muted hover:border-indigo-500/50 hover:text-indigo-400"
                    }`}
                title="Messages"
            >
                <MessageSquare className="h-4 w-4" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-indigo-500 border border-[hsl(222,47%,10%)] text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div className="absolute right-0 top-10 w-80 rounded-2xl border border-theme bg-theme-card shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-theme">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="h-3.5 w-3.5 text-theme-muted" />
                            <span className="text-sm font-semibold text-theme-primary">Messages</span>
                            {unreadCount > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllRead.mutate()}
                                    className="text-[10px] font-medium text-indigo-400 hover:text-indigo-300 px-1.5 py-1 rounded-lg hover:bg-theme-element transition-colors"
                                >
                                    Mark all read
                                </button>
                            )}
                            <button
                                onClick={() => { setOpen(false); router.push("/dashboard/messages"); }}
                                className="text-[10px] text-theme-muted hover:text-theme-primary px-1.5 py-1 rounded-lg hover:bg-theme-element transition-colors"
                            >
                                Open all
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="max-h-[320px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-theme-muted gap-2">
                                <MessageSquare className="h-6 w-6 opacity-30" />
                                <p className="text-xs">No message notifications</p>
                            </div>
                        ) : (
                            notifications.slice(0, 15).map(n => (
                                <button
                                    key={n.id}
                                    onClick={() => handleClick(n)}
                                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-theme-element border-b border-theme last:border-0
                                        ${!n.isRead ? "bg-indigo-500/5" : ""}`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                                        <MessageSquare className="h-3.5 w-3.5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-1">
                                            <p className="text-xs font-semibold text-theme-primary leading-snug">{n.title}</p>
                                            {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1" />}
                                        </div>
                                        <p className="text-[11px] text-theme-muted mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                                        <p className="text-[10px] text-theme-muted mt-1">{timeAgo(n.createdAt)}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
