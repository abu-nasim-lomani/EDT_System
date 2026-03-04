"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { api } from "../../lib/api";

type Message = {
    role: "user" | "ai";
    content: string;
};

export function AIChatbotWidget() {
    const { user } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: "ai", content: "Hello! I am your AI assistant. Ask me anything about your projects, tasks, or events." }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    // Only show for authorized roles
    if (!user || (user.role !== "SENIOR_MANAGEMENT" && user.role !== "PROJECT_MANAGER")) {
        return null;
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
        setIsLoading(true);

        try {
            const res = await api.post("/ai/chat", { message: userMsg });
            if (res.data.success && res.data.data) {
                setMessages((prev) => [...prev, { role: "ai", content: res.data.data.content }]);
            } else {
                setMessages((prev) => [...prev, { role: "ai", content: "Sorry, I encountered an error." }]);
            }
        } catch (error) {
            setMessages((prev) => [...prev, { role: "ai", content: "Sorry, I could not reach the server." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Chatbot Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-105"
                >
                    <MessageSquare className="w-6 h-6" />
                </button>
            )}

            {/* Chatbot Window */}
            {isOpen && (
                <div className="w-80 sm:w-96 bg-theme-card border border-theme rounded-2xl shadow-2xl flex flex-col h-[500px] max-h-[80vh] animate-in fade-in slide-in-from-bottom-4 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-theme bg-theme-element rounded-t-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                <Bot className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm">EDT AI Assistant</h3>
                                <p className="text-xs text-theme-muted">Online</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-theme-muted hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`flex gap-2 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                    <div className={`w-6 h-6 rounded-full flex shrink-0 items-center justify-center ${msg.role === "user" ? "bg-theme-element" : "bg-indigo-500/20"}`}>
                                        {msg.role === "user" ? <User className="w-3 h-3 text-theme-muted" /> : <Bot className="w-3 h-3 text-indigo-400" />}
                                    </div>
                                    <div className={`px-4 py-2 rounded-2xl text-sm ${msg.role === "user" ? "bg-indigo-600 text-white rounded-tr-none" : "bg-theme-element text-theme-text rounded-tl-none whitespace-pre-wrap"}`}>
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="flex gap-2 max-w-[85%] flex-row">
                                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex shrink-0 items-center justify-center">
                                        <Bot className="w-3 h-3 text-indigo-400" />
                                    </div>
                                    <div className="px-4 py-3 rounded-2xl bg-theme-element rounded-tl-none flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-theme-muted animate-bounce" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-theme-muted animate-bounce" style={{ animationDelay: "0.15s" }} />
                                        <div className="w-1.5 h-1.5 rounded-full bg-theme-muted animate-bounce" style={{ animationDelay: "0.3s" }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-theme bg-theme-base rounded-b-2xl">
                        <form onSubmit={handleSend} className="relative flex items-center">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask something..."
                                className="w-full bg-theme-element border border-theme rounded-full pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="absolute right-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-theme-element disabled:text-theme-muted text-white rounded-full transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
