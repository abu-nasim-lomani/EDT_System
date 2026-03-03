"use client";
import { useState, useRef, useEffect } from "react";
import { Command, Plus, CheckSquare, StickyNote, ListTodo, Ticket, Search } from "lucide-react";
import Link from "next/link";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { MessageBell } from "@/components/shared/MessageBell";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

const QUICK_ADD_ITEMS = [
    { label: "Add Task", icon: CheckSquare, href: "/dashboard/tasks?new=1", color: "text-blue-400" },
    { label: "Add Note", icon: StickyNote, href: "/dashboard/notes?new=1", color: "text-amber-400" },
    { label: "Add To-Do", icon: ListTodo, href: "/dashboard/todo?new=1", color: "text-emerald-400" },
    { label: "Add Ticket", icon: Ticket, href: "/dashboard/tickets?new=1", color: "text-violet-400" },
];

export function Header({ title = "Overview", subtitle = "" }: { title?: string; subtitle?: string }) {
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowQuickAdd(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <header className="edt-header h-14 w-full flex items-center justify-between px-5 sticky top-0 z-30">
            {/* Page title */}
            <div>
                <h2 className="text-[14px] font-semibold text-theme-primary leading-none">{title}</h2>
                {subtitle && <p className="text-[11px] text-theme-muted mt-0.5">{subtitle}</p>}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2">
                {/* Search trigger */}
                <button className="hidden sm:flex items-center gap-2 px-3 h-8 rounded-xl bg-theme-element/80 border border-theme/60 text-theme-muted text-sm hover:border-indigo-500/50 transition-colors">
                    <Search className="h-3.5 w-3.5" />
                    <span className="text-xs text-theme-muted">Search…</span>
                    <kbd className="ml-3 flex items-center gap-0.5 rounded-md bg-theme-element px-1.5 py-0.5 text-[10px] font-medium text-theme-muted">
                        <Command className="h-2.5 w-2.5" /> K
                    </kbd>
                </button>

                <div className="h-5 w-px border-l border-theme" />

                {/* ── Theme Switcher ── */}
                <ThemeToggle />

                {/* ── Quick-Add (+ icon with dropdown) ── */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setShowQuickAdd((v) => !v)}
                        className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-all
              ${showQuickAdd
                                ? "bg-indigo-600 border-indigo-500 text-white"
                                : "bg-theme-element border-theme text-theme-muted hover:border-indigo-500/50 hover:text-indigo-400"
                            }`}
                        title="Quick Add"
                    >
                        <Plus className="h-4 w-4" />
                    </button>

                    {showQuickAdd && (
                        <div className="absolute right-0 top-10 w-44 rounded-2xl border border-theme bg-theme-card shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-theme-muted px-4 pt-3 pb-2">
                                Quick Add
                            </p>
                            {QUICK_ADD_ITEMS.map((item) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    onClick={() => setShowQuickAdd(false)}
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-theme-primary hover:bg-theme-element hover:text-indigo-400 transition-colors"
                                >
                                    <item.icon className={`h-4 w-4 shrink-0 ${item.color}`} />
                                    {item.label}
                                </Link>
                            ))}
                            <div className="h-2" />
                        </div>
                    )}
                </div>

                {/* ── Notification Bell ── */}
                <NotificationBell />

                {/* ── Message Bell (with unread count + sound) ── */}
                <MessageBell />

                <div className="h-5 w-px border-l border-theme" />

                {/* Avatar */}
                <button className="flex items-center gap-2 px-2.5 h-8 rounded-xl bg-theme-element/80 border border-theme hover:border-indigo-500/50 transition-colors">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                        JD
                    </div>
                    <span className="text-xs font-medium text-theme-primary hidden sm:block">John Doe</span>
                </button>
            </div>
        </header>
    );
}
