import { Link, useLocation } from "react-router-dom";
import { 
  ShieldCheck, 
  FileLock, 
  Search, 
  CheckCircle, 
  Activity, 
  BarChart, 
  BookOpen,
  FilePlus
} from "lucide-react";
import clsx from "clsx";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="h-16 flex items-center px-6 border-b border-border bg-card">
        <ShieldCheck className="h-6 w-6 text-primary mr-2" />
        <span className="text-xl font-semibold tracking-tight text-foreground">CipherSeek</span>
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
