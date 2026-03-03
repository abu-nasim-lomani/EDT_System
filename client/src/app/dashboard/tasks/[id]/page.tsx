"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    ArrowLeft, Activity, Loader2, AlertTriangle,
    CheckCircle2, Paperclip, Settings, Edit, Copy, X, CalendarIcon
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface TaskActivity {
    id: string;
    content: string;
    type: string;
    creator: { id: string; name: string; avatar?: string };
    createdAt: string;
}

// ─── Types ───────────────────────────────────────────────────
interface ProjectOpt { id: string; name: string }
interface UserOpt { id: string; name: string; avatar?: string; role?: string }

interface TaskDetails {
    id: string;
    title: string;
    description?: string;
    status: "PENDING" | "IN_PROGRESS" | "STUCK" | "COMPLETED";
    priority: "CRITICAL" | "HIGH" | "MAJOR" | "MINOR";
    type?: string;
    progress: number;
    startDate?: string;
    endDate?: string;
    fileUrl?: string;
    fileName?: string;
    creator: { id: string; name: string; avatar?: string };
    assignee?: { id: string; name: string; avatar?: string };
    collaborators: Array<{ id: string; name: string; avatar?: string }>;
    project: { id: string; name: string };
    subTasks: Array<{ id: string; title: string; status: string; priority: string; progress: number; assignee?: { id: string; name: string; avatar?: string }; startDate?: string; endDate?: string; description?: string }>;
    checklist: Array<{ id: string; title: string; isDone: boolean; }>;
    activities: TaskActivity[];
    assigneeId?: string | null;
    parentTaskId?: string | null;
}

const fetchTask = async (id: string): Promise<TaskDetails> => {
    const res = await api.get(`/tasks/${id}`);
    return res.data.data;
};

const PRIORITY_COLORS = {
    CRITICAL: "text-rose-400",
    HIGH: "text-orange-400",
    MAJOR: "text-amber-400",
    MINOR: "text-slate-400",
};

export default function TaskDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const queryClient = useQueryClient();

    const [showMenu, setShowMenu] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
    const [newComment, setNewComment] = useState("");

    const [isAddingSubtask, setIsAddingSubtask] = useState(false);
    const [subtaskForm, setSubtaskForm] = useState({ title: '', description: '', startDate: '', endDate: '' });

    const [isEditingProgress, setIsEditingProgress] = useState(false);
    const [tempProgress, setTempProgress] = useState("");

    const { data: task, isLoading, isError } = useQuery({
        queryKey: ["task", id],
        queryFn: () => fetchTask(id),
    });

    const { data: projects = [] } = useQuery({
        queryKey: ["projects"],
        queryFn: async () => (await api.get("/projects")).data.data,
    });

    const { data: users = [] } = useQuery({
        queryKey: ["users"],
        queryFn: async () => (await api.get("/users")).data.data,
    });

    const toggleChecklist = useMutation({
        mutationFn: async ({ itemId, isDone }: { itemId: string, isDone: boolean }) => {
            await api.patch(`/tasks/checklist/${itemId}`, { isDone });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task", id] })
    });

    const addChecklist = useMutation({
        mutationFn: async (title: string) => {
            await api.post(`/tasks/${id}/checklist`, { title });
        },
        onSuccess: () => {
            setNewSubtaskTitle(""); // Reusing state for the input
            queryClient.invalidateQueries({ queryKey: ["task", id] });
        }
    });


    const addSubtask = useMutation({
        mutationFn: async (data: { title: string, description?: string, startDate?: string, endDate?: string }) => {
            await api.post(`/tasks`, { ...data, parentTaskId: id, projectId: task?.project.id });
        },
        onSuccess: () => {
            setIsAddingSubtask(false);
            setSubtaskForm({ title: '', description: '', startDate: '', endDate: '' });
            queryClient.invalidateQueries({ queryKey: ["task", id] });
            if (task?.parentTaskId) {
                queryClient.invalidateQueries({ queryKey: ["task", task.parentTaskId] });
            }
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        }
    });

    const addComment = useMutation({
        mutationFn: async (content: string) => {
            await api.post(`/tasks/${id}/activities`, { content, type: "COMMENT" });
        },
        onSuccess: () => {
            setNewComment("");
            queryClient.invalidateQueries({ queryKey: ["task", id] });
        }
    });

    const updateTask = useMutation({
        mutationFn: async (updates: Partial<TaskDetails>) => {
            await api.patch(`/tasks/${id}`, updates);
        },
        onSuccess: () => {
            setIsEditingProgress(false);
            queryClient.invalidateQueries({ queryKey: ["task", id] });
            if (task?.parentTaskId) {
                queryClient.invalidateQueries({ queryKey: ["task", task.parentTaskId] });
            }
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        }
    });

    const handleProgressSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const p = parseInt(tempProgress);
        if (isNaN(p) || p < 0 || p > 100) return;

        // Auto-complete if 100%
        if (p === 100 && task?.status !== "COMPLETED") {
            const confirmComplete = window.confirm("You have set progress to 100%. Mark task as COMPLETED?");
            if (confirmComplete) {
                updateTask.mutate({ progress: p, status: "COMPLETED" });
            } else {
                setIsEditingProgress(false);
            }
            return;
        }
        updateTask.mutate({ progress: p });
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm">Loading task info…</p>
        </div>
    );

    if (isError || !task) return (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
            <AlertTriangle className="h-8 w-8 text-rose-500" />
            <p className="text-sm text-slate-400">Failed to load task info</p>
            <button onClick={() => router.back()} className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm">
                Go Back
            </button>
        </div>
    );

    return (
        <div className="pb-12 max-w-7xl mx-auto space-y-6">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-semibold text-slate-200 flex items-center gap-3">
                            {task.parentTaskId ? "Sub-Task info" : "Task info"} <span className="text-slate-500">#{task.id.slice(0, 6)}</span>
                            {task.parentTaskId && (
                                <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ml-1">
                                    Sub-Task
                                </span>
                            )}
                        </h1>
                    </div>
                </div>
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="px-4 py-2 border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors">
                        <Settings className="h-4 w-4" /> Actions <span className="text-[10px] ml-1">▼</span>
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                            <button
                                onClick={() => {
                                    setIsEditModalOpen(true);
                                    setShowMenu(false);
                                }}
                                className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center gap-3 transition-colors">
                                <Edit className="h-4 w-4" /> Edit Task
                            </button>
                            <button className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center gap-3 transition-colors border-t border-slate-700/50">
                                <Copy className="h-4 w-4" /> Clone Task
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
                {/* Left Column (Content) */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Title & Description */}
                    <div>
                        <h2 className="text-lg font-bold text-white mb-4 leading-snug">{task.title}</h2>
                        <div className="text-[15px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {task.description || <span className="text-slate-500 italic">No description provided for this task.</span>}
                        </div>
                    </div>

                    {/* Checklist (Restored original simple view) */}
                    <div className="pt-8 border-t border-slate-800/60">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[15px] font-bold text-slate-200 flex items-center gap-3">
                                Checklist <span className="text-slate-400 font-normal">{task.checklist?.filter(t => t.isDone).length || 0}/{task.checklist?.length || 0}</span>
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                Sortable <div className="w-8 h-4 bg-slate-800 rounded-full flex items-center px-0.5"><div className="w-3 h-3 bg-slate-500 rounded-full"></div></div>
                            </div>
                        </div>

                        <div className="space-y-1.5 border border-slate-800/60 rounded-xl p-1.5 bg-slate-900/30">
                            {(!task.checklist || task.checklist.length === 0) ? null : task.checklist.map(st => (
                                <div key={st.id} className="group flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/80 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => toggleChecklist.mutate({ itemId: st.id, isDone: !st.isDone })}
                                            disabled={toggleChecklist.isPending}
                                            className="focus:outline-none"
                                        >
                                            {st.isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-600 hover:border-indigo-400 transition-colors" />}
                                        </button>
                                        <span className={`text-[15px] ${st.isDone ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                            {st.title}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            <div className="mt-2 p-2.5 rounded-lg flex items-center gap-3 text-slate-500 cursor-text bg-slate-800/30 border-2 border-transparent focus-within:border-slate-700 transition-colors">
                                <input
                                    type="text"
                                    placeholder="Add item"
                                    value={newSubtaskTitle}
                                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newSubtaskTitle.trim() && !addChecklist.isPending) {
                                            addChecklist.mutate(newSubtaskTitle.trim());
                                        }
                                    }}
                                    disabled={addChecklist.isPending}
                                    className="bg-transparent border-0 outline-none w-full text-[15px] text-slate-200 placeholder:text-slate-500 disabled:opacity-50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Comments & Activity Feed UI */}
                    <div className="pt-8 pb-4">
                        {/* Input Area */}
                        <div className="flex gap-4 mb-8 relative z-20">
                            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-400 shrink-0">
                                ME
                            </div>
                            <div className="flex-1 bg-slate-900/80 border border-slate-800 rounded-xl focus-within:border-indigo-500/50 transition-colors overflow-hidden">
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    className="w-full bg-transparent border-0 p-4 text-[15px] text-slate-200 placeholder:text-slate-500 resize-none outline-none focus:ring-0 min-h-[100px]"
                                    placeholder="Write a comment..."
                                />
                                <div className="flex items-center justify-between bg-slate-900/40 px-3 py-2 border-t border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors text-xs font-semibold border border-slate-700/50 bg-slate-800/30">
                                            <Paperclip className="h-3.5 w-3.5" /> Upload File
                                        </button>
                                        <button className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 transition-colors">
                                            <div className="w-3.5 h-3.5 rounded-full border-2 border-current flex items-center justify-center">
                                                <div className="w-1 h-1.5 bg-current rounded-t-full"></div>
                                            </div>
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (newComment.trim() && !addComment.isPending) {
                                                addComment.mutate(newComment.trim());
                                            }
                                        }}
                                        disabled={addComment.isPending || !newComment.trim()}
                                        className="px-5 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white text-[13px] font-semibold flex items-center gap-2 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {addComment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5 rotate-45" />} Post Comment
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Sub-tasks */}
                        <div className="pt-8 pb-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[15px] font-bold text-slate-200 flex items-center gap-3">
                                    Sub-Tasks <span className="text-slate-400 font-normal">{task.subTasks?.length || 0}</span>
                                </h3>
                            </div>

                            <div className="space-y-3">
                                {(!task.subTasks || task.subTasks.length === 0) ? (
                                    <p className="text-sm text-slate-500 italic px-2">No sub-tasks available.</p>
                                ) : task.subTasks.map(st => (
                                    <div key={st.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-semibold text-slate-200 text-[15px] leading-snug">{st.title}</h4>
                                                    <span className={`whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full ${st.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : st.status === 'IN_PROGRESS' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                                                        {st.status.replace("_", " ")}
                                                    </span>
                                                </div>
                                                {st.description && <p className="text-sm text-slate-400 line-clamp-2 mt-1">{st.description}</p>}

                                                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1.5"><CalendarIcon className="h-3.5 w-3.5" /> {(st.startDate || st.endDate) ? `${st.startDate ? format(new Date(st.startDate), "MMM d") : "?"} - ${st.endDate ? format(new Date(st.endDate), "MMM d") : "?"}` : "No dates set"}</span>
                                                    <div className="flex items-center gap-2 w-32">
                                                        <span className="font-medium text-slate-300 w-8">{st.progress}%</span>
                                                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${st.progress}%` }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <Link href={`/dashboard/tasks/${st.id}`} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                                                <ArrowLeft className="h-4 w-4 rotate-135" />
                                            </Link>
                                        </div>
                                    </div>
                                ))}

                                {!isAddingSubtask ? (
                                    <button onClick={() => setIsAddingSubtask(true)} className="w-full mt-2 py-3 border border-dashed border-slate-700 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800/50 transition-all flex items-center justify-center gap-2">
                                        <span className="text-lg leading-none mb-0.5">+</span> Add new sub-task
                                    </button>
                                ) : (
                                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mt-2 mb-4 animate-in fade-in slide-in-from-top-2">
                                        <h4 className="text-sm font-bold text-white mb-4">Create Sub-task</h4>
                                        <div className="space-y-4">
                                            <div>
                                                <input
                                                    type="text" placeholder="Sub-task title"
                                                    value={subtaskForm.title} onChange={e => setSubtaskForm({ ...subtaskForm, title: e.target.value })}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <textarea
                                                    placeholder="Description (optional)"
                                                    value={subtaskForm.description} onChange={e => setSubtaskForm({ ...subtaskForm, description: e.target.value })}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 resize-none h-16"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Start Date</label>
                                                    <input type="date" value={subtaskForm.startDate} onChange={e => setSubtaskForm({ ...subtaskForm, startDate: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300" />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">End Date</label>
                                                    <input type="date" value={subtaskForm.endDate} onChange={e => setSubtaskForm({ ...subtaskForm, endDate: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300" />
                                                </div>
                                            </div>
                                            <div className="flex gap-2 pt-2">
                                                <button onClick={() => setIsAddingSubtask(false)} className="flex-1 px-4 py-2 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                                                <button
                                                    onClick={() => {
                                                        if (!subtaskForm.title.trim()) return;
                                                        addSubtask.mutate({
                                                            title: subtaskForm.title.trim(),
                                                            description: subtaskForm.description || undefined,
                                                            startDate: subtaskForm.startDate ? new Date(subtaskForm.startDate).toISOString() : undefined,
                                                            endDate: subtaskForm.endDate ? new Date(subtaskForm.endDate).toISOString() : undefined,
                                                        });
                                                    }}
                                                    disabled={addSubtask.isPending || !subtaskForm.title.trim()}
                                                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    {addSubtask.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Activity Feed */}
                        <div className="space-y-6 select-none relative before:absolute before:inset-0 before:left-[17px] before:w-px before:bg-slate-800">

                            {(!task.activities || task.activities.length === 0) ? (
                                <p className="text-sm text-slate-500 text-center py-4 italic bg-slate-950 relative z-10 w-fit mx-auto px-4 rounded-full">No recent activity.</p>
                            ) : task.activities.map(activity => (
                                <div key={activity.id} className="flex gap-4">
                                    <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-400 shrink-0 ring-4 ring-[#0f172a] overflow-hidden">
                                        {activity.creator.avatar ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img src={activity.creator.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : activity.creator.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-[14px] font-semibold text-slate-200">{activity.creator.name}</span>
                                            <span className="text-xs text-slate-500">{new Date(activity.createdAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(",", "")}</span>
                                        </div>
                                        <div className="text-[14.5px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                                            {activity.type === "ACTIVITY" ? (
                                                <span className="text-slate-400 italic">{activity.content}</span>
                                            ) : activity.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Right Column - Sidebar */}
                <div className="space-y-8 pt-2">

                    {/* Assignee & Progress */}
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden shadow-xl">
                                {task.assignee?.avatar ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={task.assignee.avatar} alt="Assignee" className="w-full h-full object-cover" />
                                ) : task.assignee?.name.slice(0, 2).toUpperCase() || "UN"}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px] font-semibold rounded">1</span>
                                <select
                                    value={task.status}
                                    onChange={(e) => {
                                        const newStatus = e.target.value as "PENDING" | "IN_PROGRESS" | "STUCK" | "COMPLETED";
                                        updateTask.mutate({ status: newStatus, progress: newStatus === 'COMPLETED' ? 100 : task.progress });
                                    }}
                                    disabled={updateTask.isPending}
                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer outline-none appearance-none disabled:opacity-50 ${task.status === "COMPLETED" ? "bg-emerald-500 text-black hover:bg-emerald-400" : task.status === "IN_PROGRESS" ? "bg-amber-500 text-black hover:bg-amber-400" : "bg-slate-700 text-slate-200 hover:bg-slate-600"} transition-colors`}
                                >
                                    <option value="PENDING" className="bg-slate-800 text-white font-medium">To do</option>
                                    <option value="IN_PROGRESS" className="bg-slate-800 text-white font-medium">In progress</option>
                                    <option value="STUCK" className="bg-slate-800 text-white font-medium">Stuck</option>
                                    <option value="COMPLETED" className="bg-slate-800 text-white font-medium">Completed</option>
                                </select>
                                {updateTask.isPending && <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />}
                            </div>
                        </div>
                    </div>

                    <div className={`pt-2 flex flex-col gap-2 relative ${task.subTasks?.length ? 'opacity-90' : 'group/progress cursor-pointer'}`} onClick={() => {
                        if (task.subTasks?.length) return; // Disable manual progress if there are subtasks
                        setTempProgress(task.progress.toString());
                        setIsEditingProgress(true);
                    }}>
                        <div className="flex justify-between items-center text-[13px] text-slate-400 font-medium">
                            <span>{task.progress}% {task.subTasks?.length ? 'Completed (Auto-calculated)' : 'Completed'}</span>
                            {!task.subTasks?.length && !isEditingProgress && <span className="text-[10px] text-indigo-400 uppercase tracking-wide opacity-0 group-hover/progress:opacity-100 transition-opacity flex items-center gap-1"><Edit className="h-3 w-3" /> Edit</span>}
                        </div>

                        {!isEditingProgress ? (
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden cursor-pointer">
                                <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${task.progress}%`, backgroundColor: task.progress === 100 ? '#10b981' : '#cbd5e1' }} />
                            </div>
                        ) : (
                            <form onSubmit={handleProgressSubmit} className="flex items-center gap-2 w-full animate-in fade-in zoom-in-95 duration-100" onClick={e => e.stopPropagation()}>
                                <input autoFocus type="number" min="0" max="100"
                                    value={tempProgress}
                                    onChange={e => setTempProgress(e.target.value)}
                                    onBlur={() => setIsEditingProgress(false)}
                                    className="w-full h-8 px-3 rounded-lg bg-slate-950 border border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 text-sm font-bold text-white outline-none placeholder:text-slate-600 transition-all text-center"
                                    placeholder="Enter progress (0-100)%"
                                />
                                <button type="submit" onMouseDown={(e) => e.preventDefault()} disabled={updateTask.isPending} className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors shadow-lg shadow-indigo-900/20 disabled:opacity-50">
                                    {updateTask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Metadata Details List */}
                    <div className="space-y-5 text-[15px]">
                        <div className="flex gap-2">
                            <span className="text-slate-200 font-bold w-32 shrink-0">Project:</span>
                            <Link href={`/dashboard/projects/${task.project.id}`} className="text-indigo-400 hover:text-indigo-300 transition-colors">
                                {task.project.name}
                            </Link>
                        </div>
                        <div className="flex gap-2">
                            <span className="text-slate-200 font-bold w-32 shrink-0">Start date:</span>
                            <span className="text-indigo-400">
                                {task.startDate ? <span className="text-slate-300">{new Date(task.startDate).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(",", "")}</span> : <span className="cursor-pointer hover:underline">Add date</span>}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <span className="text-slate-200 font-bold w-32 shrink-0">Deadline:</span>
                            <span className="text-indigo-400">
                                {task.endDate ? <span className="text-slate-300">{new Date(task.endDate).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(",", "")}</span> : <span className="cursor-pointer hover:underline">Add End time</span>}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <span className="text-slate-200 font-bold w-32 shrink-0">Priority:</span>
                            <span className={`cursor-pointer hover:underline ${task.priority ? PRIORITY_COLORS[task.priority] : "text-indigo-400"}`}>
                                {task.priority ? task.priority.charAt(0) + task.priority.slice(1).toLowerCase() : "Add Priority"}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <span className="text-slate-200 font-bold w-32 shrink-0">Type:</span>
                            <span className="text-indigo-400 cursor-pointer hover:underline">
                                {task.type ? <span className="text-slate-400">{task.type}</span> : "Add Type"}
                            </span>
                        </div>
                    </div>

                    {/* Collaborators */}
                    <div className="space-y-3 pt-2">
                        <span className="text-slate-200 font-bold text-[15px] block">Collaborators:</span>
                        <div className="flex flex-wrap gap-2">
                            {task.collaborators.length === 0 ? (
                                <span className="text-sm text-slate-500">None</span>
                            ) : task.collaborators.map((user) => {
                                const initials = user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                                return (
                                    <div key={user.id} className="w-10 h-10 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0 overflow-hidden shadow-lg" title={user.name}>
                                        {user.avatar ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                        ) : initials}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 space-y-6">
                        <div className="space-y-1">
                            <span className="text-slate-200 font-bold text-[15px]">Reminders (Private):</span>
                        </div>
                    </div>
                </div>
            </div>

            {isEditModalOpen && task && (
                <TaskModal
                    mode="edit"
                    task={task as TaskDetails}
                    projects={projects}
                    users={users}
                    onClose={() => setIsEditModalOpen(false)}
                    onSuccess={() => {
                        setIsEditModalOpen(false);
                        queryClient.invalidateQueries({ queryKey: ["task", id] });
                    }}
                />
            )}
        </div>
    );
}

// ─── Modal Form ────────────────────────────────────────────────
function TaskModal({ mode, task, projects, users, onClose, onSuccess }: { mode: "create" | "edit"; task?: TaskDetails; projects: ProjectOpt[]; users: UserOpt[]; onClose: () => void; onSuccess: () => void }) {
    const isEdit = mode === "edit";
    const [form, setForm] = useState({
        title: task?.title ?? "",
        type: task?.type ?? "GENERAL",
        description: task?.description ?? "",
        projectId: task?.project.id ?? "",
        assigneeId: task?.assignee?.id ?? "",
        collaboratorIds: task?.collaborators?.map((c: { id: string }) => c.id) ?? [] as string[],
        priority: task?.priority ?? "MINOR",
        status: task?.status ?? "PENDING",
        startDate: task?.startDate ? task.startDate.split('T')[0] : "",
        endDate: task?.endDate ? task.endDate.split('T')[0] : "",
        fileUrl: task?.fileUrl ?? "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError("");
        try {
            const payload = {
                title: form.title,
                type: form.type,
                description: form.description || undefined,
                projectId: form.projectId,
                assigneeId: form.assigneeId || undefined,
                collaboratorIds: form.collaboratorIds,
                priority: form.priority,
                status: form.status,
                startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
                endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
                fileUrl: form.fileUrl || undefined,
            };

            if (isEdit && task) await api.patch(`/tasks/${task.id}`, payload);
            else await api.post("/tasks", payload);

            onSuccess();
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const apiErr = err as { response?: { data?: { message?: string } } };
                setError(apiErr.response?.data?.message || "Something went wrong saving the task.");
            } else {
                setError("Something went wrong saving the task.");
            }
        } finally {
            setLoading(false);
        }
    };

    const set = (k: string, v: string | string[]) => setForm(f => ({ ...f, [k]: v }));

    const toggleCollab = (id: string) => {
        setForm(f => ({
            ...f,
            collaboratorIds: f.collaboratorIds.includes(id)
                ? f.collaboratorIds.filter((c: string) => c !== id)
                : [...f.collaboratorIds, id]
        }));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-150 p-4 font-sans text-left">
            <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700 w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] rounded-2xl mx-auto my-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
                    <div>
                        <h3 className="text-base font-bold text-white mb-0.5">{isEdit ? "Edit Task Info" : "Create Task"}</h3>
                        <p className="text-xs text-slate-500">{isEdit ? "Update task information" : "Add a new task to a project"}</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4 overflow-y-auto">
                    {error && <p className="text-xs text-rose-400 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">{error}</p>}

                    {!isEdit && (
                        <Field label="Project *">
                            <select required value={form.projectId} onChange={e => set("projectId", e.target.value)}
                                className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors hover:border-slate-600">
                                <option value="">Select a project…</option>
                                {projects.map((p: ProjectOpt) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </Field>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Task Title *">
                            <input required value={form.title} onChange={e => set("title", e.target.value)}
                                placeholder="What needs to be done?"
                                className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-colors hover:border-slate-600" />
                        </Field>
                        <Field label="Task Type">
                            <div className="flex gap-2 items-center">
                                <select value={["GENERAL", "FEATURE", "BUG", "MEETING"].includes(form.type) ? form.type : "CUSTOM"}
                                    onChange={e => {
                                        if (e.target.value === "CUSTOM") set("type", "OTHER");
                                        else set("type", e.target.value);
                                    }}
                                    className="w-1/2 h-9 px-3 flex-1 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors hover:border-slate-600">
                                    <option value="GENERAL">General Task</option>
                                    <option value="FEATURE">Feature</option>
                                    <option value="BUG">Bug Fix</option>
                                    <option value="MEETING">Meeting</option>
                                    <option value="CUSTOM">Custom...</option>
                                </select>
                                {!["GENERAL", "FEATURE", "BUG", "MEETING"].includes(form.type) && (
                                    <input value={form.type} onChange={e => set("type", e.target.value)}
                                        placeholder="Custom type" autoFocus
                                        className="w-1/2 h-9 px-3 flex-1 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors hover:border-slate-600" />
                                )}
                            </div>
                        </Field>
                    </div>

                    <Field label="Description">
                        <textarea rows={3} value={form.description} onChange={e => set("description", e.target.value)}
                            placeholder="Add details…"
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500 resize-none transition-colors hover:border-slate-600" />
                    </Field>

                    <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-4">
                        <Field label="Assign To *">
                            <select required value={form.assigneeId} onChange={e => set("assigneeId", e.target.value)}
                                className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors hover:border-slate-600">
                                <option value="">Select Assignee…</option>
                                {users.map((u: UserOpt) => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Collaborators">
                            <div className="relative group z-50">
                                <div className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-700 flex items-center text-sm text-slate-400 cursor-pointer hover:border-slate-600 transition-colors">
                                    {form.collaboratorIds.length} selected
                                </div>
                                <div className="absolute top-full pt-1 left-0 w-full z-50 hidden group-hover:block">
                                    <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 max-h-[200px] overflow-y-auto">
                                        {users.filter((u: UserOpt) => u.id !== form.assigneeId).length === 0 ? (
                                            <div className="text-xs text-slate-400 text-center py-2">No other users</div>
                                        ) : (
                                            users.filter((u: UserOpt) => u.id !== form.assigneeId).map((u: UserOpt) => (
                                                <label key={u.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-700/50 rounded cursor-pointer transition-colors">
                                                    <input type="checkbox" checked={form.collaboratorIds.includes(u.id)} onChange={() => toggleCollab(u.id)}
                                                        className="rounded bg-slate-950 border-slate-600 text-indigo-500 focus:ring-indigo-500" />
                                                    <span className="text-sm text-slate-200">{u.name}</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Priority">
                            <select value={form.priority} onChange={e => set("priority", e.target.value)}
                                className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors hover:border-slate-600">
                                <option value="MINOR">Minor</option>
                                <option value="MAJOR">Major</option>
                                <option value="HIGH">High</option>
                                <option value="CRITICAL">Critical</option>
                            </select>
                        </Field>
                        <Field label="Status">
                            <select value={form.status} onChange={e => set("status", e.target.value)}
                                className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors hover:border-slate-600">
                                <option value="PENDING">Pending</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="STUCK">Stuck</option>
                                <option value="COMPLETED">Completed</option>
                            </select>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Start Date">
                            <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)}
                                className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors hover:border-slate-600 [color-scheme:dark]" />
                        </Field>
                        <Field label="End Date (Deadline)">
                            <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)}
                                className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 transition-colors hover:border-slate-600 [color-scheme:dark]" />
                        </Field>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800 shrink-0 bg-slate-900/50">
                    <button type="button" onClick={onClose}
                        className="h-10 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-300 hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button type="submit" disabled={loading}
                        className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-semibold text-white flex items-center justify-center min-w-[120px] transition-colors shadow-lg shadow-indigo-900/20">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Save Changes" : "Create Task"}
                    </button>
                </div>
            </form>
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
