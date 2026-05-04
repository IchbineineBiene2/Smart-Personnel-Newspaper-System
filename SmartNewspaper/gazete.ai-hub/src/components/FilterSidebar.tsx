import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Filter, ChevronUp, ChevronDown, Check, SlidersHorizontal } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FilterSidebar = ({ isOpen, onClose }: FilterSidebarProps) => {
  const categories = ["Hepsi", "Siyaset", "Ekonomi", "Spor", "Magazin", "Teknoloji", "Sağlık", "Dünya"];
  const [selectedCat, setSelectedCat] = React.useState("Hepsi");

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-[320px] glass-dark z-50 p-6 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
                <h2 className="text-xl font-semibold">Filtreleme</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                id="close-sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-8">
              {/* Categories */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Kategoriler</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCat(cat)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm transition-all",
                        selectedCat === cat
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                          : "bg-white/5 text-slate-300 hover:bg-white/10"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Range */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Zaman Aralığı</h3>
                <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 transition-colors">
                  <option className="bg-[#0b0c14]">Son 24 Saat</option>
                  <option className="bg-[#0b0c14]">Son 7 Gün</option>
                  <option className="bg-[#0b0c14]">Son 30 Gün</option>
                </select>
              </div>

              {/* Sources */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Haber Kaynakları</h3>
                <div className="space-y-3">
                  {["Kanal Haber", "Global Medya", "Tekno Rehber", "Spor Vizyon"].map((source) => (
                    <label key={source} className="flex items-center gap-3 cursor-pointer group">
                      <div className="w-5 h-5 rounded border border-white/20 flex items-center justify-center group-hover:border-indigo-500 transition-colors">
                        <Check className="w-3 h-3 text-indigo-400 hidden group-has-[:checked]:block" />
                      </div>
                      <input type="checkbox" className="hidden" />
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{source}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button
               className="w-full mt-10 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
               id="apply-filters"
            >
              Filtreleri Uygula
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
