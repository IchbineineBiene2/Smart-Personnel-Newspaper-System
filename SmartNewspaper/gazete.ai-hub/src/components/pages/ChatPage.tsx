import React from "react";
import { motion } from "motion/react";
import { Send, Sparkles, MessageSquare, Bot, User, Zap } from "lucide-react";
import { cn } from "@/src/lib/utils";

export const ChatPage = () => {
    const [messages, setMessages] = React.useState([
        { role: 'bot', text: 'Merhaba! Ben GazeteAI. Bugün hangi haberleri analiz etmemi istersiniz?' }
    ]);
    const [input, setInput] = React.useState("");

    const handleSend = () => {
        if (!input.trim()) return;
        setMessages([...messages, { role: 'user', text: input }]);
        setInput("");
        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'bot', text: 'Harika bir soru! Mevcut verilerime göre bu konuyla ilgili son 24 saatte 12 önemli gelişme yaşandı. Özellikle ekonomi tarafındaki yansımaları dikkat çekici...' }]);
        }, 1000);
    };

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-200px)] flex flex-col glass rounded-[3rem] overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-indigo-600/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                        <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold">AI Haber Analisti</h2>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Çevrimiçi</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center gap-2 text-indigo-400 text-xs font-bold">
                        <Zap className="w-3 h-3" /> Ultra Hız
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                {messages.map((m, idx) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={idx}
                        className={cn(
                            "flex items-start gap-4 max-w-[80%]",
                            m.role === 'user' ? "ml-auto flex-row-reverse" : ""
                        )}
                    >
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            m.role === 'user' ? "bg-white/10" : "bg-indigo-600"
                        )}>
                            {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-white" />}
                        </div>
                        <div className={cn(
                            "p-4 rounded-2xl text-sm leading-relaxed",
                            m.role === 'user' ? "bg-white/5 text-slate-200" : "glass-dark border-indigo-500/10 text-slate-100"
                        )}>
                            {m.text}
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="p-6 border-t border-white/5 bg-black/20">
                <div className="relative">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Haberlerle ilgili bir şey sorun..." 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-6 pr-14 py-4 outline-none focus:border-indigo-500 transition-all font-medium"
                    />
                    <button 
                        onClick={handleSend}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all active:scale-95"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-[10px] text-center text-slate-600 mt-4 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                    <Sparkles className="w-3 h-3" /> Gemini 1.5 Pro tarafından desteklenmektedir
                </p>
            </div>
        </div>
    );
};
