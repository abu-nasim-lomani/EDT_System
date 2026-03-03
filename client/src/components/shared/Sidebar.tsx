"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard, Briefcase, CheckSquare,
    CalendarDays, AlertCircle, MessageSquare,
    BarChart2, Ticket, StickyNote,
    ListTodo, Activity, LogOut
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

const routes = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { label: "Projects", icon: Briefcase, href: "/dashboard/projects" },
    { label: "Tasks", icon: CheckSquare, href: "/dashboard/tasks" },
    { label: "Events", icon: CalendarDays, href: "/dashboard/events" },
    { label: "Conflicts", icon: AlertCircle, href: "/dashboard/conflicts" },
    { label: "Messages", icon: MessageSquare, href: "/dashboard/messages" },
    { label: "Reports", icon: BarChart2, href: "/dashboard/reports" },
    { label: "Challenges", icon: Ticket, href: "/dashboard/tickets" },
    { label: "Notes", icon: StickyNote, href: "/dashboard/notes" },
    { label: "To-Do", icon: ListTodo, href: "/dashboard/todo" },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const user = useAuthStore(s => s.user);
    const logout = useAuthStore(s => s.logout);

    const handleLogout = () => {
        logout();
        router.replace("/login");
    };

    // Derive initials and role label
    const initials = user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";
    const roleLabel = user?.role === "SENIOR_MANAGEMENT" ? "Senior Mgmt"
        : user?.role === "PROJECT_MANAGER" ? "Project Manager"
            : "Employee";

    return (
        <aside className="edt-sidebar hidden md:flex flex-col w-[220px] h-screen shrink-0 px-3 py-5 z-20">
            {/* Brand */}
            <div className="flex items-center gap-3 px-3 mb-6">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-900/40 shrink-0">
                    <Activity className="h-4 w-4 text-white" />
                </div>
                <div>
                    <p className="font-bold text-sm tracking-tight text-white leading-none">EDT System</p>
                    <p className="text-[10px] text-white/70 mt-0.5 tracking-wider uppercase font-medium">Management Portal</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-0.5 overflow-y-auto">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-white/50 px-3 mb-2">Navigation</p>
                {routes.map((route) => {
                    const isActive = pathname === route.href;
                    return (
                        <Link key={route.href} href={route.href}
                            className={`edt-nav-item ${isActive ? "active" : ""}`}>
                            <route.icon className="h-[16px] w-[16px] shrink-0" />
                            {route.label}
                            {isActive && (
                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom — User + Logout */}
            <div className="pt-3 border-t border-white/10 space-y-1">
                {/* User row */}
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{user?.name ?? "Guest"}</p>
                        <p className="text-[10px] text-white/60 truncate">{user?.designation ? `${user.designation} · ` : ""}{roleLabel}</p>
                    </div>
                </div>

                {/* Logout */}
                <button onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white/70 hover:text-rose-400 hover:bg-rose-500/10 transition-colors group">
                    <LogOut className="h-3.5 w-3.5 shrink-0 group-hover:text-rose-400" />
                    <span className="text-xs font-medium">Sign out</span>
                </button>
            </div>
        </aside>
    );
}
