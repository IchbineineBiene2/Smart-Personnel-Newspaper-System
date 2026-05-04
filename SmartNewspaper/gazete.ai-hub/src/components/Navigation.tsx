import React from "react";
import { motion } from "motion/react";
import { 
  LayoutGrid, 
  Search, 
  Calendar, 
  MessageSquare, 
  Archive, 
  User,
  LogOut,
  Newspaper
} from "lucide-react";
import { cn } from "@/src/lib/utils";

interface NavigationProps {
  activePage: string;
  onPageChange: (page: string) => void;
}

export const Navigation = ({ activePage, onPageChange }: NavigationProps) => {
  const menuItems = [
    { id: "ana-sayfa", label: "Ana Sayfa", icon: LayoutGrid },
    { id: "arama", label: "Arama", icon: Search },
    { id: "etkinlikler", label: "Etkinlikler", icon: Calendar },
    { id: "ai-chat", label: "AI Chat", icon: MessageSquare },
    { id: "arsiv", label: "Arşiv", icon: Archive },
    { id: "profil", label: "Profil", icon: User },
  ];

  return (
    <aside className="fixed bottom-0 left-0 w-full lg:static lg:w-72 lg:h-screen glass-dark border-r border-white/5 flex flex-col z-50">
      <div className="hidden lg:flex items-center gap-3 p-8 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary">
            <Newspaper className="w-6 h-6 text-white" />
        </div>
        <div className="flex flex-col">
            <span className="font-black text-lg tracking-tight">GAZETE<span className="text-primary">.AI</span></span>
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none">Dashboard</span>
        </div>
      </div>

      <nav className="flex-1 p-4 lg:p-6 flex lg:flex-col items-center lg:items-stretch justify-around lg:justify-start gap-3 h-20 lg:h-auto overflow-x-auto no-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={cn(
                "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group relative",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-slate-500 hover:text-white hover:bg-white/5"
              )}
            >
                {isActive && (
                    <motion.div 
                        layoutId="nav-active"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-r-full hidden lg:block shadow-lg shadow-primary"
                    />
                )}
                <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "group-hover:scale-110 transition-transform")} />
                <span className="hidden lg:block font-bold text-xs uppercase tracking-widest">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="hidden lg:block p-6 border-t border-white/5 space-y-4">
          <div className="p-5 rounded-3xl bg-primary/5 border border-primary/10">
              <p className="text-[10px] uppercase font-black text-primary mb-2 tracking-widest">Bugün</p>
              <p className="text-xs text-slate-400 leading-relaxed italic font-medium">"AI analize hazır, yeni gelişmeleri keşfedin."</p>
          </div>
          <button className="flex items-center gap-3 px-5 py-4 rounded-2xl text-rose-500 hover:bg-rose-500/5 transition-all w-full text-left">
              <LogOut className="w-5 h-5" />
              <span className="font-bold text-xs uppercase tracking-widest">Çıkış Yap</span>
          </button>
      </div>
    </aside>
  );
};
