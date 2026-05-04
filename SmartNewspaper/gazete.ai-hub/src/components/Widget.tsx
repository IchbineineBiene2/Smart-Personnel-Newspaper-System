import React from "react";
import { motion } from "motion/react";
import { Newspaper, Wallet, Trophy, Cloud, TrendingUp, GripVertical, Trash2, ArrowUpRight, ArrowDownRight, Sun, MapPin, Maximize2, Calendar, CheckCircle2, Clock } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/src/lib/utils";
import { WidgetConfig, MOCK_NEWS, MOCK_RATES } from "@/src/constants";

interface WidgetProps {
  config: WidgetConfig;
  isEditing: boolean;
  onRemove: (id: string) => void;
  onResize?: (id: string) => void;
}

export const Widget: React.FC<WidgetProps> = ({ config, isEditing, onRemove, onResize }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: config.id,
    disabled: !isEditing
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.6 : 1,
  };

  const renderContent = () => {
    switch (config.type) {
      case "news":
        return (
          <div className={cn("space-y-4", config.size === 'sm' && 'space-y-2')}>
            {MOCK_NEWS.slice(2, config.size === 'sm' ? 4 : 6).map((news) => (
              <div key={news.id} className="group cursor-pointer flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className={cn("relative shrink-0 overflow-hidden rounded-2xl", config.size === 'sm' ? 'w-12 h-12' : 'w-20 h-20')}>
                    <img src={news.image} alt={news.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">{news.category}</span>
                    <span className="w-1 h-1 bg-slate-700 rounded-full" />
                    <span className="text-[9px] text-slate-500 font-bold uppercase">{news.time}</span>
                  </div>
                  <h4 className={cn("font-bold leading-snug group-hover:text-primary transition-colors", config.size === 'sm' ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2')}>
                    {news.title}
                  </h4>
                </div>
              </div>
            ))}
            {config.size !== 'sm' && (
                <button className="w-full py-3 mt-2 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-primary transition-all">
                    Tüm Akışı Gör
                </button>
            )}
          </div>
        );
      case "currency":
        return (
          <div className={cn("grid gap-3", config.size === 'sm' ? 'grid-cols-1' : 'grid-cols-2')}>
            {MOCK_RATES.slice(0, config.size === 'sm' ? 2 : 4).map((rate) => (
              <div key={rate.name} className="p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/20 hover:bg-white/10 transition-all group">
                <p className="text-[10px] text-slate-400 mb-1 font-medium">{rate.name}</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm lg:text-lg font-black tracking-tight">{rate.value}</span>
                  <div className={cn("text-[10px] font-bold flex items-center px-1.5 py-0.5 rounded-full bg-black/20", rate.up ? "text-emerald-400" : "text-rose-400")}>
                    {rate.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {rate.change}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      case "weather":
        return (
          <div className="flex flex-col items-center justify-center h-full py-4 relative">
            {config.size !== 'sm' && <Cloud className="absolute top-0 right-0 w-12 h-12 text-white/5 -z-10" />}
            <Sun className={cn("text-amber-400 mb-2 glow-amber", config.size === 'sm' ? 'w-8 h-8' : 'w-12 h-12')} />
            <div className={cn("font-black tracking-tighter", config.size === 'sm' ? 'text-xl' : 'text-4xl')}>24°C</div>
            <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">
              <MapPin className="w-3 h-3 text-indigo-400" />
              İstanbul, TR
            </div>
            {config.size === 'lg' && (
                <div className="mt-6 grid grid-cols-3 gap-4 w-full px-4">
                    {['14:00', '15:00', '16:00'].map(h => (
                        <div key={h} className="text-center">
                            <span className="text-[9px] text-slate-500 font-bold">{h}</span>
                            <div className="text-xs font-bold mt-1">25°</div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        );
      case "sports":
        return (
          <div className="space-y-3">
             <div className="p-4 rounded-[2rem] bg-indigo-600/10 border border-indigo-500/10 flex items-center justify-between">
                <div className="flex flex-col items-center gap-2">
                   <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-[10px] font-black border border-red-500/20">GS</div>
                   <span className="text-[10px] font-bold uppercase">G.Saray</span>
                </div>
                <div className="text-2xl font-black italic tracking-tighter">3 - 1</div>
                <div className="flex flex-col items-center gap-2">
                   <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-[10px] font-black border border-white/10">BJK</div>
                    <span className="text-[10px] font-bold uppercase">Beşiktaş</span>
                </div>
             </div>
             <div className="flex items-center justify-center gap-2">
                 <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Spor Toto Süper Lig • 88' Oynanıyor</p>
             </div>
             {config.size === 'lg' && (
                 <div className="pt-4 space-y-2 border-t border-white/5">
                     <p className="text-[10px] font-bold text-slate-400 px-1">ÖNEMLİ ANLAR</p>
                     <div className="flex items-center gap-3 text-xs px-1">
                         <span className="text-indigo-400 font-bold">72'</span>
                         <span className="text-slate-300">Goal! M. Icardi</span>
                     </div>
                 </div>
             )}
          </div>
        );
      case "calendar":
        return (
          <div className="space-y-3">
             <div className="grid gap-2">
                {[
                    { time: "09:30", title: "Ekip Toplantısı", type: "work" },
                    { time: "14:00", title: "Haber Analizi", type: "news" },
                    { time: "19:00", title: "Akşam Yemeği", type: "personal" }
                ].slice(0, config.size === 'sm' ? 2 : 3).map((event, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 group/event hover:border-primary/30 transition-all">
                        <div className="flex flex-col items-center justify-center min-w-[45px] py-1 bg-primary/10 rounded-xl">
                            <span className="text-[10px] font-black text-primary leading-none">{event.time.split(':')[0]}</span>
                            <span className="text-[8px] font-bold text-primary/60 uppercase">{event.time.split(':')[1]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold truncate group-hover/event:text-white transition-colors">{event.title}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <Clock className="w-2.5 h-2.5 text-slate-600" />
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{event.time}</span>
                            </div>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-slate-800 group-hover/event:text-primary transition-colors cursor-pointer" />
                    </div>
                ))}
             </div>
             {config.size !== 'sm' && (
                 <button className="w-full py-3 mt-2 rounded-2xl border border-dashed border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary hover:border-primary/50 transition-all">
                    Yeni Görev Ekle
                 </button>
             )}
          </div>
        );
      default:
        return <div className="text-slate-500 text-sm italic">Henüz içerik bulunmuyor.</div>;
    }
  };

  const getIcon = () => {
    switch (config.type) {
      case "news": return Newspaper;
      case "currency": return Wallet;
      case "sports": return Trophy;
      case "weather": return Cloud;
      case "calendar": return Calendar;
      case "stock": return TrendingUp;
      default: return Newspaper;
    }
  };

  const Icon = getIcon();

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex flex-col glass-dark p-6 rounded-[2.5rem] transition-all duration-300 border border-white/5 hover:border-primary/30 gpu-accelerated",
        config.size === "lg" ? "col-span-1 lg:col-span-2 md:row-span-2" : (config.size === "md" ? "col-span-1 md:col-span-2 lg:col-span-1 md:row-span-1" : "col-span-1"),
        isEditing && "ring-2 ring-primary/50"
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner group-hover:bg-primary group-hover:text-white transition-all duration-300">
            <Icon className="w-5 h-5 transition-transform duration-500 group-hover:scale-110" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 group-hover:text-white transition-colors">{config.title}</h3>
            {config.size !== 'sm' && <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Update: Now</span>}
          </div>
        </div>
        
        {isEditing ? (
          <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-4">
             <button 
                onClick={() => onResize?.(config.id)}
                className="p-2 hover:bg-primary/20 text-primary rounded-xl transition-all active:scale-90"
                title="Boyutu Değiştir"
             >
                <Maximize2 className="w-4 h-4" />
             </button>
            <button
               onClick={() => onRemove(config.id)}
               className="p-2 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-all active:scale-90"
               title="Kaldır"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div 
                {...attributes}
                {...listeners}
                className="p-2 text-slate-600 cursor-grab active:cursor-grabbing hover:text-primary transition-colors"
            >
                <GripVertical className="w-4 h-4" />
            </div>
          </div>
        ) : (
          <button className="p-2.5 glass rounded-2xl text-slate-500 hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100">
            <ArrowUpRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1">
        {renderContent()}
      </div>
    </motion.div>
  );
};

