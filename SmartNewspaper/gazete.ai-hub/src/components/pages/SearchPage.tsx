import React from "react";
import { motion } from "motion/react";
import { Search, History, TrendingUp, ChevronRight, Filter } from "lucide-react";
import { MOCK_NEWS } from "@/src/constants";

export const SearchPage = () => {
    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="relative mb-8">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500" />
                <input 
                    type="text" 
                    placeholder="Tüm haber ağında keşfe çıkın..." 
                    className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] pl-16 pr-6 py-6 text-xl outline-none focus:bg-white/10 focus:border-indigo-500 transition-all shadow-2xl focus:ring-8 focus:ring-indigo-500/5 placeholder:text-slate-600"
                />
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div>
                    <h3 className="flex items-center gap-2 text-sm font-black text-slate-500 uppercase tracking-widest mb-6">
                        <History className="w-4 h-4" /> Son Aramalar
                    </h3>
                    <div className="space-y-2">
                        {["Altın Fiyatları", "Süper Lig", "Enflasyon Tahmini", "Yeni iPhone"].map(item => (
                            <button key={item} className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-left group">
                                <span className="text-slate-300 group-hover:text-white transition-colors">{item}</span>
                                <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-white transition-all" />
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="flex items-center gap-2 text-sm font-black text-slate-500 uppercase tracking-widest mb-6">
                        <TrendingUp className="w-4 h-4 text-indigo-400" /> Trend Başlıklar
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {["#Kripto", "#MilliTakım", "#YapayZeka", "#ElonMusk", "#Seçim2026", "#GüneşFırtınası"].map(tag => (
                            <button key={tag} className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-sm font-medium hover:bg-indigo-600 hover:text-white transition-all">
                                {tag}
                            </button>
                        ))}
                    </div>

                    <div className="mt-10 p-6 glass rounded-3xl">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold">Akıllı Filtreler</h4>
                            <Filter className="w-4 h-4 text-slate-500" />
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed mb-6">Aramalarınızı zamana, kaynağa veya duyarlılığa göre özelleştirin.</p>
                        <button className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-all text-slate-400 hover:text-white">Filtre Paneline Git</button>
                    </div>
                </div>
            </div>

            <div className="mt-12">
                 <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-8">Önerilen Makaleler</h3>
                 <div className="grid gap-4">
                     {MOCK_NEWS.slice(0, 3).map(news => (
                         <div key={news.id} className="p-4 glass rounded-3xl flex items-center gap-4 hover:bg-white/10 transition-all cursor-pointer group">
                             <img src={news.image} className="w-20 h-20 rounded-2xl object-cover" />
                             <div className="flex-1">
                                 <span className="text-[10px] font-bold text-indigo-400 uppercase">{news.category}</span>
                                 <h4 className="font-bold text-lg leading-tight group-hover:text-indigo-300 transition-colors">{news.title}</h4>
                             </div>
                             <ChevronRight className="w-5 h-5 text-slate-700" />
                         </div>
                     ))}
                 </div>
            </div>
        </div>
    );
};
