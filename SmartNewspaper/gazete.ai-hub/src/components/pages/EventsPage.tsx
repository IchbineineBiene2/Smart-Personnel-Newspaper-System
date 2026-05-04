import React from "react";
import { motion } from "motion/react";
import { Calendar as CalendarIcon, MapPin, Clock, Tag, ChevronRight } from "lucide-react";

export const EventsPage = () => {
    const events = [
        { id: 1, title: "Teknoloji ve İnovasyon Zirvesi", date: "12 Mayıs", time: "09:00", location: "Haliç Kongre Merkezi", category: "Konferans" },
        { id: 2, title: "NBA Playoff Finalleri - İzleme Partisi", date: "15 Mayıs", time: "21:30", location: "Kadıköy Sahne", category: "Spor" },
        { id: 3, title: "Modern Sanat Sergisi: 'Dijital Düşler'", date: "18 Mayıs", time: "18:00", location: "Arter", category: "Sanat" },
        { id: 4, title: "AI ve Gelecek Hackathonu", date: "22-24 Mayıs", time: "48 Saat", location: "İTÜ Arı Teknokent", category: "Teknoloji" },
    ];

    return (
        <div className="max-w-5xl mx-auto py-8">
            <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter mb-2">Yaklaşan <span className="text-indigo-500">Etkinlikler</span></h2>
                    <p className="text-slate-400 font-medium italic">Sizin için seçilmiş şehir gündemi ve global buluşmalar.</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20">Bu Hafta</button>
                    <button className="px-4 py-2 glass text-slate-400 rounded-xl text-sm font-medium hover:text-white">Takvim</button>
                </div>
            </header>

            <div className="grid gap-6">
                {events.map((event, idx) => (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={event.id}
                        className="group flex flex-col md:flex-row gap-6 p-6 glass rounded-[2.5rem] hover:bg-white/10 transition-all border border-white/5 hover:border-indigo-500/20"
                    >
                        <div className="md:w-32 flex flex-col items-center justify-center border-r border-white/5 pr-6">
                            <span className="text-3xl font-black text-indigo-400">{event.date.split(' ')[0]}</span>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{event.date.split(' ')[1]}</span>
                        </div>

                        <div className="flex-1 space-y-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-wider">{event.category}</span>
                                </div>
                                <h3 className="text-xl font-bold group-hover:text-white transition-colors">{event.title}</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                    <MapPin className="w-4 h-4 text-rose-400" />
                                    {event.location}
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                    <Clock className="w-4 h-4 text-emerald-400" />
                                    {event.time}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-center md:pl-6">
                            <button className="p-4 bg-white/5 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all text-slate-500">
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
            
            <footer className="mt-12 text-center">
                <button className="text-slate-500 hover:text-white transition-all text-sm font-bold uppercase tracking-widest border-b border-transparent hover:border-white">Daha Fazla Göster</button>
            </footer>
        </div>
    );
};
