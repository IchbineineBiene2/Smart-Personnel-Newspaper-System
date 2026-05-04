import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, Laptop, Palette, Layout, MousePointer2 } from "lucide-react";
import { AVAILABLE_WIDGETS_TYPES } from "@/src/constants";
import { cn } from "@/src/lib/utils";

interface WidgetPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (type: any) => void;
}

export const WidgetPicker = ({ isOpen, onClose, onAdd }: WidgetPickerProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-2xl glass-dark rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10"
                    >
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold mb-1">Widget Ekle</h2>
                                <p className="text-slate-400 text-sm">Giriş sayfanızı kişiselleştirmek için bir modül seçin.</p>
                            </div>
                            <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {AVAILABLE_WIDGETS_TYPES.map((item) => (
                                <button
                                    key={item.type}
                                    onClick={() => onAdd(item)}
                                    className="flex items-start gap-4 p-5 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-indigo-500/50 transition-all text-left group"
                                >
                                    <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                                        <item.icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold mb-1 group-hover:text-indigo-300 transition-colors">{item.title}</h3>
                                        <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                                    </div>
                                    <Plus className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
