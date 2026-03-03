"use client";
import { useState } from "react";
import {
    Upload, Search, FolderOpen, FileText, FileImage,
    FileVideo, File as FileIcon, Download, MoreHorizontal,
    Plus, Grid2X2, List, Folder
} from "lucide-react";

type ViewMode = "grid" | "list";
type FileType = "pdf" | "image" | "video" | "doc" | "other";

interface FileItem {
    id: string; name: string; type: FileType;
    size: string; project: string; uploadedBy: string;
    date: string; url?: string;
}

const FILES: FileItem[] = [
    { id: "f1", name: "Infrastructure_Migration_Plan_v3.pdf", type: "pdf", size: "2.4 MB", project: "Infra Migration", uploadedBy: "John Doe", date: "Mar 2" },
    { id: "f2", name: "Q3_Campaign_Assets_Pack.zip", type: "other", size: "45 MB", project: "Q3 Marketing", uploadedBy: "Bob Jones", date: "Mar 1" },
    { id: "f3", name: "Mobile_App_V2_Wireframes.pdf", type: "pdf", size: "8.1 MB", project: "Mobile App V2", uploadedBy: "Diana White", date: "Mar 1" },
    { id: "f4", name: "Dashboard_Design_Mockup.png", type: "image", size: "3.2 MB", project: "Web App Revamp", uploadedBy: "Alice Smith", date: "Feb 28" },
    { id: "f5", name: "Team_Training_Recording.mp4", type: "video", size: "120 MB", project: "Compliance", uploadedBy: "Eve Davis", date: "Feb 27" },
    { id: "f6", name: "Project_Charter_WebApp.docx", type: "doc", size: "1.1 MB", project: "Web App Revamp", uploadedBy: "Alice Smith", date: "Feb 26" },
    { id: "f7", name: "ARR_Review_Presentation.pdf", type: "pdf", size: "5.3 MB", project: "Infra Migration", uploadedBy: "John Doe", date: "Feb 25" },
    { id: "f8", name: "UX_Research_Photos.png", type: "image", size: "7.8 MB", project: "Mobile App V2", uploadedBy: "Diana White", date: "Feb 24" },
];

const TYPE_CFG: Record<FileType, { icon: React.ElementType; color: string; bg: string }> = {
    pdf: { icon: FileText, color: "text-rose-400", bg: "bg-rose-500/15" },
    image: { icon: FileImage, color: "text-sky-400", bg: "bg-sky-500/15" },
    video: { icon: FileVideo, color: "text-violet-400", bg: "bg-violet-500/15" },
    doc: { icon: FileText, color: "text-blue-400", bg: "bg-blue-500/15" },
    other: { icon: FileIcon, color: "text-slate-400", bg: "bg-slate-700" },
};

const PROJECTS = ["All", ...Array.from(new Set(FILES.map(f => f.project)))];

export default function FilesPage() {
    const [search, setSearch] = useState("");
    const [project, setProject] = useState("All");
    const [view, setView] = useState<ViewMode>("grid");

    const filtered = FILES.filter(f => {
        const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
        const matchProject = project === "All" || f.project === project;
        return matchSearch && matchProject;
    });

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Files</h1>
                    <p className="text-sm text-slate-500 mt-0.5">{FILES.length} files across all projects</p>
                </div>
                <button className="flex items-center gap-2 h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white transition-colors shrink-0">
                    <Upload className="h-4 w-4" /> Upload File
                </button>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-2 px-3 h-9 rounded-xl bg-slate-900 border border-slate-700/60 flex-1">
                    <Search className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search files…"
                        className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none" />
                </div>
                <div className="flex gap-2">
                    <select value={project} onChange={e => setProject(e.target.value)}
                        className="h-9 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white outline-none">
                        {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <div className="flex gap-1 bg-slate-900 border border-slate-700 rounded-xl p-1">
                        <button onClick={() => setView("grid")}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${view === "grid" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-white"}`}>
                            <Grid2X2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setView("list")}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${view === "list" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-white"}`}>
                            <List className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Project folder tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {PROJECTS.map(p => (
                    <button key={p} onClick={() => setProject(p)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all
              ${project === p
                                ? "bg-indigo-600/15 text-indigo-400 border-indigo-500/30"
                                : "bg-slate-900 text-slate-500 border-slate-800 hover:text-white hover:border-slate-700"
                            }`}>
                        <Folder className="h-3.5 w-3.5" />
                        {p}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${project === p ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-800 text-slate-600"}`}>
                            {p === "All" ? FILES.length : FILES.filter(f => f.project === p).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* File Grid */}
            {view === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                    {/* Upload drop zone */}
                    <button className="edt-card border-dashed border-slate-700 flex flex-col items-center justify-center py-8 gap-2 hover:border-indigo-500/50 hover:bg-slate-800/20 transition-all">
                        <Plus className="h-6 w-6 text-slate-600" />
                        <span className="text-xs text-slate-600">Upload file</span>
                    </button>
                    {filtered.map(f => {
                        const { icon: Icon, color, bg } = TYPE_CFG[f.type];
                        return (
                            <div key={f.id} className="edt-card p-4 flex flex-col gap-3 cursor-pointer group">
                                <div className="flex items-start justify-between">
                                    <div className={`p-2.5 rounded-xl ${bg}`}>
                                        <Icon className={`h-5 w-5 ${color}`} />
                                    </div>
                                    <button className="p-1 rounded-lg text-slate-700 hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-all">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-white truncate leading-snug">{f.name}</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">{f.size}</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-slate-600">{f.date}</span>
                                    <button className="p-1 rounded-lg text-slate-600 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all">
                                        <Download className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* File List */
                <div className="edt-card overflow-hidden">
                    <div className="grid grid-cols-12 px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-slate-600 border-b border-slate-800">
                        <span className="col-span-5">Name</span>
                        <span className="col-span-3">Project</span>
                        <span className="col-span-2">Uploaded by</span>
                        <span className="col-span-1 text-center">Size</span>
                        <span className="col-span-1 text-right">Date</span>
                    </div>
                    <div className="divide-y divide-slate-800">
                        {filtered.map(f => {
                            const { icon: Icon, color, bg } = TYPE_CFG[f.type];
                            return (
                                <div key={f.id} className="grid grid-cols-12 items-center px-5 py-3.5 hover:bg-slate-800/30 transition-colors group">
                                    <div className="col-span-5 flex items-center gap-3">
                                        <div className={`p-1.5 rounded-lg shrink-0 ${bg}`}><Icon className={`h-4 w-4 ${color}`} /></div>
                                        <span className="text-sm font-medium text-white truncate">{f.name}</span>
                                    </div>
                                    <div className="col-span-3"><span className="text-xs text-slate-400">{f.project}</span></div>
                                    <div className="col-span-2"><span className="text-xs text-slate-400">{f.uploadedBy}</span></div>
                                    <div className="col-span-1 text-center"><span className="text-xs text-slate-500">{f.size}</span></div>
                                    <div className="col-span-1 flex items-center justify-end gap-2">
                                        <span className="text-xs text-slate-500">{f.date}</span>
                                        <button className="p-1 rounded text-slate-700 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all">
                                            <Download className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
