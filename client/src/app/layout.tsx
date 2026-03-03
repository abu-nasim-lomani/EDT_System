import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryProvider } from "@/providers/QueryProvider"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Event Decision Tracker (EDT)",
  description: "Monitor and manage projects, tasks, and events with precision.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-indigo-500 selection:text-white">
        <QueryProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
