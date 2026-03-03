"use client";

import { useState, useRef, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/store/theme.store";

export function ThemeToggle() {
    const { theme, setTheme } = useThemeStore();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen((v) => !v)}
                className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-all text-theme-muted hover:text-indigo-400 bg-theme-element border-theme hover:border-indigo-500/50 ${isOpen ? "border-indigo-500/50 text-indigo-400" : ""}`}
                title="Theme Options"
            >
                {theme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-10 w-40 rounded-2xl border border-theme bg-theme-card shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-theme-muted px-4 pt-3 pb-2">
                        Theme
                    </p>
                    <button
                        onClick={() => { setTheme("dark"); setIsOpen(false); }}
                        className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium transition-colors ${theme === "dark" ? "text-indigo-400 bg-theme-element" : "text-theme-muted hover:bg-theme-element hover:text-indigo-400"}`}
                    >
                        <span className="flex items-center gap-2"><Moon className="w-4 h-4" /> Dark</span>
                        {theme === "dark" && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                    </button>
                    <button
                        onClick={() => { setTheme("light"); setIsOpen(false); }}
                        className={`w-full flex items-center justify-between px-4 py-2 pb-3 text-sm font-medium transition-colors ${theme === "light" ? "text-indigo-400 bg-theme-element" : "text-theme-muted hover:bg-theme-element hover:text-indigo-400"}`}
                    >
                        <span className="flex items-center gap-2"><Sun className="w-4 h-4" /> Light</span>
                        {theme === "light" && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                    </button>
                </div>
            )}
        </div>
    );
}
