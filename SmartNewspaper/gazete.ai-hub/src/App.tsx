/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, 
  Settings2, 
  LayoutGrid, 
  Bell, 
  Plus, 
  Newspaper, 
  Calendar, 
  Sparkles,
  Search as SearchIcon,
  SlidersHorizontal,
  Save,
  RotateCcw,
  User,
  ArrowUpRight,
  Cloud
} from "lucide-react";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/src/lib/utils";
import { Navigation } from "@/src/components/Navigation";
import { FilterSidebar } from "@/src/components/FilterSidebar";
import { Widget } from "@/src/components/Widget";
import { WidgetPicker } from "@/src/components/WidgetPicker";
import { ArchivePage } from "@/src/components/pages/ArchivePage";
import { ProfilePage } from "@/src/components/pages/ProfilePage";
import { SearchPage } from "@/src/components/pages/SearchPage";
import { ChatPage } from "@/src/components/pages/ChatPage";
import { EventsPage } from "@/src/components/pages/EventsPage";
import { WidgetConfig, DEFAULT_WIDGETS, MOCK_NEWS } from "@/src/constants";
import { ThemeProvider, useTheme } from "@/src/context/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { theme } = useTheme();
  const [widgets, setWidgets] = React.useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [activePage, setActivePage] = React.useState("ana-sayfa");
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 5,
        },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddWidget = (widgetType: any) => {
    const newWidget: WidgetConfig = {
      id: Math.random().toString(36).substr(2, 9),
      type: widgetType.type,
      title: widgetType.title,
      size: 'sm'
    };
    setWidgets([...widgets, newWidget]);
    setIsPickerOpen(false);
  };

  const handleRemoveWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };

  const handleResizeWidget = (id: string) => {
    setWidgets(widgets.map(w => {
      if (w.id === id) {
        const sizes: ("sm" | "md" | "lg")[] = ["sm", "md", "lg"];
        const currentIndex = sizes.indexOf(w.size);
        const nextIndex = (currentIndex + 1) % sizes.length;
        return { ...w, size: sizes[nextIndex] };
      }
      return w;
    }));
  };

  const renderPageContent = () => {
    switch (activePage) {
      case "ana-sayfa":
        return (
          <div className="flex-1 flex flex-col gap-8">
            {/* Featured Section */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2 relative h-[400px] rounded-[3rem] overflow-hidden group cursor-pointer shadow-2xl"
                >
                    <img 
                        src={MOCK_NEWS[0].image} 
                        alt={MOCK_NEWS[0].title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-10 space-y-4">
                        <span className="px-4 py-1.5 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-full shadow-lg shadow-primary">Manşet</span>
                        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight group-hover:text-primary transition-colors">
                            {MOCK_NEWS[0].title}
                        </h2>
                        <p className="text-slate-300 line-clamp-2 max-w-2xl text-lg font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                            {MOCK_NEWS[0].desc}
                        </p>
                    </div>
                </motion.div>

                <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest px-2">Öne Çıkanlar</h3>
                    <div className="grid gap-4">
                        {MOCK_NEWS.slice(1, 3).map((news, idx) => (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                key={news.id}
                                className="glass-dark p-6 rounded-[2rem] flex flex-col gap-3 group cursor-pointer border border-white/5 hover:border-primary/30 transition-all shadow-xl hover:shadow-primary"
                            >
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">{news.category}</span>
                                <h4 className="font-bold text-lg leading-tight group-hover:text-white transition-colors">{news.title}</h4>
                                <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                                    <span>{news.time}</span>
                                    <div className="flex items-center gap-1 group-hover:text-primary transition-colors">
                                        Detaylar <ArrowUpRight className="w-3 h-3" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Dashboard Tools */}
            <div className="flex items-center justify-between overflow-x-auto pb-4 gap-4 no-scrollbar">
              <div className="flex items-center gap-2">
                <div className="flex p-1.5 rounded-2xl bg-white/5 border border-white/5 shadow-inner">
                    {['Sizin İçin', 'Popüler', 'Analiz'].map((tab) => (
                        <button key={tab} className={cn(
                            "px-6 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
                            tab === 'Sizin İçin' ? "bg-primary text-white shadow-lg shadow-primary" : "text-slate-500 hover:text-white"
                        )}>
                            {tab}
                        </button>
                    ))}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                 <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={cn(
                        "flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-xl",
                        isEditing 
                           ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/30" 
                           : "glass-dark border border-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                    )}
                 >
                    {isEditing ? <Save className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
                    {isEditing ? "Kaydet" : "Düzenle"}
                 </button>
                 
                 {isEditing && (
                     <motion.button 
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => setIsPickerOpen(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-primary hover:opacity-90 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-primary active:scale-95 border border-white/10"
                     >
                        <Plus className="w-4 h-4" />
                        Ekle
                     </motion.button>
                 )}
              </div>
            </div>

            {/* Grid Area */}
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={widgets.map(w => w.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-max">
                  {widgets.map((widget) => (
                    <Widget 
                      key={widget.id} 
                      config={widget} 
                      isEditing={isEditing}
                      onRemove={handleRemoveWidget}
                      onResize={handleResizeWidget}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            
            {widgets.length === 0 && (
              <div className="h-64 flex flex-col items-center justify-center text-center opacity-50 border-2 border-dashed border-white/10 rounded-[3rem] mt-4">
                  <LayoutGrid className="w-12 h-12 mb-4 text-primary" />
                  <p className="text-lg font-bold">Dashboard henüz boş.</p>
                  <button 
                    onClick={() => setIsPickerOpen(true)}
                    className="text-primary font-medium hover:underline flex items-center gap-2 mt-2"
                  >
                    <Plus className="w-4 h-4" /> Yeni widget ekleyerek başlayın
                  </button>
              </div>
            )}
          </div>
        );
      case "arama":
        return <SearchPage />;
      case "etkinlikler":
        return <EventsPage />;
      case "ai-chat":
        return <ChatPage />;
      case "arsiv":
        return <ArchivePage />;
      case "profil":
        return <ProfilePage />;
      default:
        return (
          <div className="h-full flex flex-col items-center justify-center text-center py-20 grayscale opacity-40">
            <LayoutGrid className="w-20 h-20 mb-6" />
            <h2 className="text-3xl font-black italic">YAKINDA SİZLERLE</h2>
            <p className="text-slate-400 mt-2">Bu bölüm geliştirme aşamasındadır.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col lg:flex-row overflow-hidden selection:bg-primary selection:text-white transition-colors duration-500">
      {/* Sidebar Navigation */}
      <Navigation activePage={activePage} onPageChange={setActivePage} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto px-4 lg:px-10 py-8 relative">
        
        {/* Header (Contextual) */}
        {activePage === 'ana-sayfa' && (
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 shrink-0">
            <div className="animate-in fade-in slide-in-from-left-4">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-2 leading-none">
                Günaydın, <span className="text-primary italic">Ahmet.</span>
              </h1>
              <div className="flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                    <Calendar className="w-3 h-3 text-primary" />
                    3 Mayıs 2026
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                    <Cloud className="w-3 h-3 text-primary" />
                    24° İstanbul
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400 animate-pulse">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    Canlı Akış Aktif
                  </div>
              </div>
            </div>

            <div className="flex-1 max-w-xl mx-auto w-full lg:mx-0 relative group">
              <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Özel haber ağınızda keşfe çıkın..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/5 rounded-3xl pl-16 pr-6 py-5 text-sm outline-none focus:bg-white/[0.07] focus:border-primary focus:ring-[12px] focus:ring-primary/5 transition-all placeholder:text-slate-700 font-medium"
              />
            </div>

            <div className="flex items-center gap-3">
              <button className="p-5 rounded-2xl glass-dark border border-white/5 hover:bg-white/10 transition-all relative group">
                <Bell className="w-5 h-5 text-slate-400 group-hover:scale-110 transition-transform" />
                <span className="absolute top-5 right-5 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#0b0c14]" />
              </button>
              <div className="flex items-center gap-3 pl-3 border-l border-white/5">
                  <div className="hidden text-right lg:block">
                      <p className="text-xs font-black text-white leading-tight">Ahmet Y.</p>
                      <p className="text-[10px] font-bold text-primary">PRO ÜYE</p>
                  </div>
                  <button className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20 hover:bg-primary/30 transition-all">
                    <User className="w-6 h-6 text-primary" />
                  </button>
              </div>
            </div>
          </header>
        )}

        {/* Dynamic Page Content */}
        {renderPageContent()}

        {/* Footer Accent */}
        <footer className="mt-auto pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-widest gap-6 shrink-0 opacity-50 pb-20 lg:pb-8">
           <div className="flex items-center gap-8">
              <span className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-primary" /> AI Destekli Gazete</span>
              <a href="#" className="hover:text-white transition-colors">Gizlilik</a>
              <a href="#" className="hover:text-white transition-colors">Destek</a>
           </div>
           <div>© 2026 GazeteAI Hub v2.0</div>
        </footer>
      </main>

      {/* Overlays / Modals */}
      <FilterSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <WidgetPicker isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} onAdd={handleAddWidget} />

      {/* Floating Background Effects */}
      <div className="fixed -bottom-40 -left-40 w-[500px] h-[500px] bg-primary/10 blur-[120px] pointer-events-none rounded-full" />
      <div className="fixed -top-40 -right-40 w-[500px] h-[500px] bg-primary/5 blur-[120px] pointer-events-none rounded-full" />
    </div>
  );
}

