import React from "react";
import { motion } from "motion/react";
import { Archive, ChevronRight, Filter, BookOpen } from "lucide-react";
import { MOCK_ARCHIVE } from "@/src/constants";

export const ArchivePage = () => {
  return (
    <div className="max-w-5xl mx-auto py-8">
      <header className="mb-10">
        <h2 className="text-3xl font-bold mb-2">Geçmiş Edisyonlar</h2>
        <p className="text-slate-400">Daha önce oluşturulmuş kişisel gazeteleriniz</p>
      </header>

      <div className="grid gap-4">
        {MOCK_ARCHIVE.map((item, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={item.id}
            className="group p-6 glass rounded-3xl hover:bg-white/10 transition-all cursor-pointer flex items-center gap-6"
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <BookOpen className="w-6 h-6" />
            </div>
            
            <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                <p className="text-slate-400 text-sm line-clamp-1">{item.summary}</p>
                <div className="flex gap-2 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-500">Teknoloji</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-500">Spor</span>
                </div>
            </div>

            <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-slate-300">{item.count} makale</div>
                <div className="text-xs text-slate-500">{item.date}</div>
            </div>

            <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </motion.div>
        ))}
      </div>
      
      <button className="w-full mt-8 py-4 border-2 border-dashed border-white/10 rounded-3xl text-slate-500 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2">
          <Filter className="w-4 h-4" /> Tüm Arşivi Filtrele
      </button>
    </div>
  );
};
