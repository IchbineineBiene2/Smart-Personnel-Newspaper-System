import React from "react";
import { User, Settings, Shield, Bell, Palette, Globe, CreditCard, Check } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { useTheme } from "@/src/context/ThemeContext";

export const ProfilePage = () => {
    const [activeTab, setActiveTab] = React.useState("Tercihler");
    const { theme, setTheme } = useTheme();

    const themes = [
        { id: "default", name: "Gece Yarısı", color: "bg-[#4f46e5]" },
        { id: "emerald", name: "Zümrüt Ormanı", color: "bg-[#10b981]" },
        { id: "mars", name: "Kızıl Mars", color: "bg-[#f43f5e]" },
        { id: "cyber", name: "Siber Punk", color: "bg-[#06b6d4]" },
    ] as const;

    const tabs = [
        { name: "Genel", icon: User },
        { name: "Tercihler", icon: Palette },
        { name: "Güvenlik", icon: Shield },
        { name: "Abonelik", icon: CreditCard },
    ];

    return (
        <div className="max-w-6xl mx-auto py-8 lg:px-6">
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left: Info Card */}
                <div className="lg:w-80 shrink-0 space-y-6">
                    <div className="glass-dark p-8 rounded-[3rem] text-center border border-white/5 shadow-2xl shadow-primary/10">
                        <div className="relative inline-block mb-4">
                            <div className="w-24 h-24 rounded-full bg-accent p-1 transition-all duration-500 shadow-lg shadow-primary/50">
                                <div className="w-full h-full rounded-full bg-main flex items-center justify-center overflow-hidden transition-colors duration-500">
                                    <User className="w-12 h-12 text-primary" />
                                </div>
                            </div>
                            <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 border-4 border-main rounded-full transition-colors duration-500 shadow-sm" />
                        </div>
                        <h3 className="text-xl font-bold">Ahmet Yüksel</h3>
                        <p className="text-sm text-slate-500 mb-6 font-medium italic">@yukselahmet740</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                <p className="text-xl font-black">58</p>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Takip</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                <p className="text-xl font-black">12</p>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Kategori</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-dark p-3 rounded-[2.5rem] space-y-1 border border-white/5">
                        {tabs.map((tab) => (
                            <button
                                key={tab.name}
                                onClick={() => setActiveTab(tab.name)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300",
                                    activeTab === tab.name 
                                        ? "bg-primary text-white shadow-lg shadow-primary" 
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span className="font-bold text-xs uppercase tracking-widest">{tab.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Settings Area */}
                <div className="flex-1 space-y-8">
                    {activeTab === "Tercihler" ? (
                        <section className="glass-dark p-10 rounded-[3.5rem] border border-white/5 animate-in fade-in slide-in-from-bottom-4">
                            <div className="mb-10">
                                <h2 className="text-3xl font-black tracking-tighter mb-2 flex items-center gap-3">
                                    <Palette className="w-8 h-8 text-primary" /> Görünüm Ayarları
                                </h2>
                                <p className="text-slate-500 font-medium">Dashboard deneyiminizi kişiselleştirin.</p>
                            </div>

                            <div className="space-y-10">
                                <div>
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Renk Teması</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {themes.map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => setTheme(t.id as any)}
                                                className={cn(
                                                    "relative flex flex-col items-center gap-4 p-6 rounded-3xl border-2 transition-all duration-300",
                                                    theme === t.id 
                                                        ? "bg-primary/10 border-primary" 
                                                        : "bg-white/5 border-transparent hover:border-white/10"
                                                )}
                                            >
                                                <div className={cn("w-12 h-12 rounded-2xl shadow-xl", t.color)} />
                                                <span className="font-bold text-xs uppercase tracking-wider">{t.name}</span>
                                                {theme === t.id && (
                                                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                                        <Check className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-6 rounded-3xl bg-indigo-600/5 border border-indigo-500/10">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-600 rounded-2xl">
                                            <Settings className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold">Otomatik Gece Modu</h4>
                                            <p className="text-sm text-slate-400">Güneş battığında koyu temaya geçiş yapar.</p>
                                        </div>
                                        <div className="ml-auto">
                                            <button className="w-12 h-6 bg-indigo-600 rounded-full relative">
                                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    ) : (
                        <section className="glass-dark p-10 rounded-[3.5rem] border border-white/5 animate-in fade-in slide-in-from-bottom-4">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <Settings className="w-6 h-6 text-indigo-400" /> Profil Ayarları
                            </h2>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-black text-slate-500 uppercase tracking-widest px-1">Görünen İsim</label>
                                    <input type="text" defaultValue="Ahmet Yüksel" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-indigo-500 outline-none transition-all font-medium" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-black text-slate-500 uppercase tracking-widest px-1">E-posta Adresi</label>
                                    <input type="email" defaultValue="yukselahmet740@gmail.com" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-indigo-500 outline-none transition-all font-medium" />
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};
