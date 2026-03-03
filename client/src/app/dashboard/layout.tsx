import { Header } from "@/components/shared/Header";
import { Sidebar } from "@/components/shared/Sidebar";
import { AIChatbotWidget } from "@/components/shared/AIChatbotWidget";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Header title="Overview" subtitle="Real-time project & decision monitoring" />
                <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
            <AIChatbotWidget />
        </div>
    );
}
