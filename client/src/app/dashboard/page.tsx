import {
    Briefcase, CheckSquare, AlertTriangle,
    TrendingUp, TrendingDown, ArrowRight,
    CalendarDays, CheckCircle2, Clock
} from "lucide-react";

// ---- Types ----
interface MetricCardProps {
    title: string;
    value: string | number;
    trend: string;
    trendUp?: boolean;
    icon: React.ElementType;
    iconClass: string;
    accentColor: string;
}

interface ProjectRowProps {
    name: string;
    status: "In Progress" | "Pending" | "Stuck" | "Completed";
    progress: number;
    pm: string;
    due: string;
}

interface TimelineItemProps {
    time: string;
    title: string;
    type: "meeting" | "task" | "event";
    project?: string;
}

// ---- Main Page ----
export default function DashboardPage() {
    return (
        <div className="space-y-6">

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <MetricCard
                    title="Active Projects" value="12" trend="+2 this month" trendUp
                    icon={Briefcase} iconClass="metric-icon-indigo" accentColor="hsl(239,84%,67%)"
                />
                <MetricCard
                    title="Pending Tasks" value="45" trend="-8 from last week" trendUp
                    icon={CheckSquare} iconClass="metric-icon-emerald" accentColor="hsl(142,71%,45%)"
                />
                <MetricCard
                    title="Upcoming Events" value="8" trend="3 due today" trendUp={false}
                    icon={CalendarDays} iconClass="metric-icon-amber" accentColor="hsl(45,93%,47%)"
                />
                <MetricCard
                    title="Stuck Items" value="3" trend="Needs attention" trendUp={false}
                    icon={AlertTriangle} iconClass="metric-icon-rose" accentColor="hsl(0,84%,60%)"
                />
            </div>

            {/* Main 3-column grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

                {/* Left: Project Progress – 2 cols */}
                <div className="xl:col-span-2 edt-card overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                        <div>
                            <h3 className="text-sm font-semibold text-white">Project Progress</h3>
                            <p className="text-xs text-slate-500 mt-0.5">All ongoing projects at a glance</p>
                        </div>
                        <button className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                            View all <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {/* Table header */}
                    <div className="grid grid-cols-12 px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-slate-600 border-b border-slate-800">
                        <span className="col-span-4">Project</span>
                        <span className="col-span-2">Status</span>
                        <span className="col-span-3">Progress</span>
                        <span className="col-span-2">PM</span>
                        <span className="col-span-1 text-right">Due</span>
                    </div>

                    <div className="divide-y divide-slate-800">
                        <ProjectRow name="Web App Revamp" status="In Progress" progress={78} pm="A. Smith" due="Apr 10" />
                        <ProjectRow name="Q3 Marketing Campaign" status="Pending" progress={0} pm="B. Jones" due="May 15" />
                        <ProjectRow name="Infrastructure Migration" status="Stuck" progress={45} pm="C. Brown" due="Mar 28" />
                        <ProjectRow name="Mobile App V2" status="Completed" progress={100} pm="D. White" due="Feb 28" />
                    </div>
                </div>

                {/* Right: Today's Timeline */}
                <div className="edt-card overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                        <div>
                            <h3 className="text-sm font-semibold text-white">Today&apos;s Schedule</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Mon, Mar 2 · 2026</p>
                        </div>
                        <CalendarDays className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="divide-y divide-slate-800">
                        <TimelineItem time="10:00 AM" title="Weekly ARR Sync" type="meeting" project="Web App Revamp" />
                        <TimelineItem time="01:00 PM" title="UI Design Review" type="task" project="Mobile App V2" />
                        <TimelineItem time="03:30 PM" title="Client Stakeholder Call" type="event" project="Q3 Marketing" />
                        <TimelineItem time="05:00 PM" title="Submit Infrastructure Report" type="task" project="Infra Migration" />
                    </div>
                </div>
            </div>

            {/* Bottom row: Quick stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <QuickStat label="Tasks completed today" value="7" icon={CheckCircle2} color="text-emerald-400" />
                <QuickStat label="Events this week" value="5" icon={CalendarDays} color="text-indigo-400" />
                <QuickStat label="Overdue tasks" value="2" icon={Clock} color="text-rose-400" />
            </div>

        </div>
    );
}

// ---- Helper Components ----

function MetricCard({ title, value, trend, trendUp, icon: Icon, iconClass, accentColor }: MetricCardProps) {
    return (
        <div className="edt-card-glass p-5 space-y-4" style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}>
            <div className="flex items-start justify-between">
                <span className={`inline-flex p-2 rounded-lg ${iconClass}`}>
                    <Icon className="h-5 w-5" />
                </span>
                <span className={`text-xs font-medium flex items-center gap-1 ${trendUp ? "text-emerald-400" : "text-rose-400"}`}>
                    {trendUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                </span>
            </div>
            <div>
                <div className="text-3xl font-bold tracking-tight text-white">{value}</div>
                <div className="text-xs text-slate-500 mt-1 font-medium">{title}</div>
                <div className={`text-xs mt-1 ${trendUp ? "text-emerald-400" : "text-rose-400"}`}>{trend}</div>
            </div>
        </div>
    );
}

function ProjectRow({ name, status, progress, pm, due }: ProjectRowProps) {
    const statusMap: Record<ProjectRowProps["status"], string> = {
        "In Progress": "badge-in-progress",
        "Pending": "badge-pending",
        "Stuck": "badge-stuck",
        "Completed": "badge-completed",
    };

    return (
        <div className="grid grid-cols-12 items-center px-6 py-4 hover:bg-slate-800/30 transition-colors">
            <div className="col-span-4">
                <p className="text-sm font-medium text-white">{name}</p>
            </div>
            <div className="col-span-2">
                <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusMap[status]}`}>
                    {status}
                </span>
            </div>
            <div className="col-span-3 flex items-center gap-2.5">
                <div className="edt-progress-track flex-1 h-1.5">
                    <div className="edt-progress-fill h-full" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-xs font-semibold text-slate-400">{progress}%</span>
            </div>
            <div className="col-span-2">
                <span className="text-xs text-slate-400">{pm}</span>
            </div>
            <div className="col-span-1 text-right">
                <span className="text-xs text-slate-500">{due}</span>
            </div>
        </div>
    );
}

function TimelineItem({ time, title, type, project }: TimelineItemProps) {
    const typeColor = { meeting: "bg-blue-500", task: "bg-amber-500", event: "bg-indigo-500" }[type];
    return (
        <div className="flex gap-4 px-5 py-3.5 hover:bg-slate-800/30 transition-colors">
            <div className="flex flex-col items-center gap-1 pt-1">
                <div className={`w-2 h-2 rounded-full shrink-0 ${typeColor}`} />
                <div className="w-px flex-1 bg-slate-800" />
            </div>
            <div className="pb-1 min-w-0 flex-1">
                <p className="text-sm font-medium text-white leading-snug">{title}</p>
                {project && <p className="text-xs text-slate-500 mt-0.5">{project}</p>}
                <p className="text-[11px] text-slate-600 mt-1 font-medium">{time}</p>
            </div>
        </div>
    );
}

interface QuickStatProps {
    label: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
}

function QuickStat({ label, value, icon: Icon, color }: QuickStatProps) {
    return (
        <div className="edt-card flex items-center gap-4 px-5 py-4">
            <div className="bg-slate-800 p-2.5 rounded-xl">
                <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            </div>
        </div>
    );
}
