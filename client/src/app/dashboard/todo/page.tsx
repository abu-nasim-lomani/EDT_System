"use client";
import { useState } from "react";
import { Plus, CheckCircle2, Circle, Trash2, Calendar, Flag, AlignLeft } from "lucide-react";

type Priority = "High" | "Medium" | "Low";
type FilterTab = "All" | "Today" | "Upcoming" | "Completed";

interface TodoItem {
    id: string; text: string; done: boolean;
    priority: Priority; project?: string;
    dueDate?: string; notes?: string;
}

const initTodos: TodoItem[] = [
    { id: "t1", text: "Review infrastructure migration PR", done: false, priority: "High", project: "Infra Migration", dueDate: "Today", notes: "Check replication lag metrics before approving" },
    { id: "t2", text: "Approve Q3 campaign assets", done: false, priority: "High", project: "Q3 Marketing", dueDate: "Today" },
    { id: "t3", text: "Respond to TKT-003 — Android crash", done: false, priority: "High", project: "Mobile App V2", dueDate: "Today" },
    { id: "t4", text: "Prepare ARR review presentation", done: false, priority: "Medium", project: "Infra Migration", dueDate: "Mar 5" },
    { id: "t5", text: "Schedule Q2 retrospective meeting", done: false, priority: "Medium", project: undefined, dueDate: "Mar 7" },
    { id: "t6", text: "Update project charter – Web App Revamp", done: false, priority: "Low", project: "Web App Revamp", dueDate: "Mar 10" },
    { id: "t7", text: "Complete data privacy training module", done: true, priority: "High", project: "Compliance", dueDate: "Feb 28" },
    { id: "t8", text: "Send weekly status report to ARR", done: true, priority: "Medium", project: undefined, dueDate: "Mar 1" },
];

const PRIORITY_CFG: Record<Priority, { color: string; flag: string }> = {
    High: { color: "text-rose-400", flag: "text-rose-500" },
    Medium: { color: "text-amber-400", flag: "text-amber-500" },
    Low: { color: "text-slate-400", flag: "text-slate-500" },
};

export default function TodoPage() {
    const [todos, setTodos] = useState<TodoItem[]>(initTodos);
    const [filter, setFilter] = useState<FilterTab>("All");
    const [newText, setNewText] = useState("");
    const [newPriority, setNewPriority] = useState<Priority>("Medium");
    const [expanded, setExpanded] = useState<string | null>(null);

    const toggle = (id: string) =>
        setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));

    const remove = (id: string) =>
        setTodos(todos.filter(t => t.id !== id));

    const addTodo = () => {
        if (!newText.trim()) return;
        const item: TodoItem = { id: `t${Date.now()}`, text: newText.trim(), done: false, priority: newPriority, dueDate: "Today" };
        setTodos([item, ...todos]);
        setNewText("");
    };

    const filtered = todos.filter(t => {
        if (filter === "Today") return !t.done && t.dueDate === "Today";
        if (filter === "Upcoming") return !t.done && t.dueDate !== "Today";
        if (filter === "Completed") return t.done;
        return true;
    });

    const pending = todos.filter(t => !t.done).length;
    const completed = todos.filter(t => t.done).length;
    const pct = Math.round((completed / todos.length) * 100);

    const counts: Record<FilterTab, number> = {
        All: todos.length,
        Today: todos.filter(t => !t.done && t.dueDate === "Today").length,
        Upcoming: todos.filter(t => !t.done && t.dueDate !== "Today").length,
        Completed: completed,
    };

    return (
        <div className="max-w-2xl mx-auto space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">To-Do</h1>
                <p className="text-sm text-slate-500 mt-0.5">{pending} tasks remaining · {pct}% complete today</p>
            </div>

            {/* Progress bar */}
            <div className="edt-card px-5 py-4">
                <div className="flex justify-between text-xs mb-2">
                    <span className="text-slate-400 font-medium">Overall Progress</span>
                    <span className="text-indigo-400 font-bold">{pct}%</span>
                </div>
                <div className="edt-progress-track h-2.5">
                    <div className="edt-progress-fill h-2.5" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between mt-2 text-[11px] text-slate-600">
                    <span>{completed} completed</span>
                    <span>{pending} remaining</span>
                </div>
            </div>

            {/* Add task input */}
            <div className="edt-card px-4 py-3 flex items-center gap-3">
                <Plus className="h-4 w-4 text-slate-600 shrink-0" />
                <input
                    value={newText} onChange={e => setNewText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addTodo()}
                    placeholder="Add a new task… (press Enter)"
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none"
                />
                <select value={newPriority}
                    onChange={e => setNewPriority(e.target.value as Priority)}
                    className="h-7 px-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 outline-none">
                    <option>High</option><option>Medium</option><option>Low</option>
                </select>
                <button onClick={addTodo}
                    className="h-7 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-colors">
                    Add
                </button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1">
                {(["All", "Today", "Upcoming", "Completed"] as FilterTab[]).map(tab => (
                    <button key={tab} onClick={() => setFilter(tab)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${filter === tab ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-white hover:bg-slate-800"}`}>
                        {tab}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${filter === tab ? "bg-white/20" : "bg-slate-800 text-slate-600"}`}>
                            {counts[tab]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Todo list */}
            <div className="edt-card overflow-hidden divide-y divide-slate-800">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                        <CheckCircle2 className="h-8 w-8 mb-3" />
                        <p className="text-sm font-medium">All clear! 🎉</p>
                    </div>
                ) : filtered.map(todo => {
                    const pc = PRIORITY_CFG[todo.priority];
                    const isExpanded = expanded === todo.id;
                    return (
                        <div key={todo.id} className={`transition-colors ${todo.done ? "opacity-50" : ""}`}>
                            <div className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-800/30 cursor-pointer"
                                onClick={() => setExpanded(isExpanded ? null : todo.id)}>
                                {/* Checkbox */}
                                <button onClick={e => { e.stopPropagation(); toggle(todo.id); }}
                                    className="mt-0.5 shrink-0 transition-colors">
                                    {todo.done
                                        ? <CheckCircle2 className="h-5 w-5 text-indigo-400" />
                                        : <Circle className="h-5 w-5 text-slate-600 hover:text-indigo-400" />
                                    }
                                </button>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${todo.done ? "line-through text-slate-500" : "text-white"}`}>
                                        {todo.text}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        {todo.project && <span className="text-[11px] text-slate-500">{todo.project}</span>}
                                        {todo.dueDate && (
                                            <span className={`text-[11px] flex items-center gap-1 ${todo.dueDate === "Today" && !todo.done ? "text-amber-400" : "text-slate-600"}`}>
                                                <Calendar className="h-3 w-3" /> {todo.dueDate}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Right actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <Flag className={`h-3.5 w-3.5 ${pc.flag}`} />
                                    {todo.notes && <AlignLeft className="h-3.5 w-3.5 text-slate-600" />}
                                    <button onClick={e => { e.stopPropagation(); remove(todo.id); }}
                                        className="p-1 rounded-lg text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Expanded notes */}
                            {isExpanded && todo.notes && (
                                <div className="px-[52px] pb-4 -mt-1.5">
                                    <p className="text-xs text-slate-500 leading-relaxed bg-slate-800/50 px-3 py-2 rounded-xl border border-slate-800">
                                        {todo.notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
