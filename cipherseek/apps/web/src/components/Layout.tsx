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
  const location = useLocation();

  const navItems = [
    { to: "/", label: "Overview", icon: Activity },
    { to: "/add", label: "Add Document", icon: FilePlus },
    { to: "/vault", label: "Document Vault", icon: FileLock },
    { to: "/search", label: "Private Search", icon: Search },
    { to: "/verification", label: "Verification Center", icon: CheckCircle },
    { to: "/audit", label: "Privacy Audit", icon: ShieldCheck },
    { to: "/benchmarks", label: "Benchmarks", icon: BarChart },
    { to: "/threat-model", label: "Threat Model", icon: BookOpen },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-64 border-r border-border bg-background flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <ShieldCheck className="h-6 w-6 text-primary mr-2" />
          <span className="text-lg font-semibold tracking-tight text-foreground">CipherSeek</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={clsx(
                      "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-8 bg-background/95">
        {children}
      </main>
    </div>
  );
}
