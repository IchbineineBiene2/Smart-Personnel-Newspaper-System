import { AlertCircle, TrendingUp, Newspaper, Trophy, Cloud, Wallet, Settings2, Trash2, GripVertical, ChevronRight, Search, SlidersHorizontal, Plus, Calendar } from "lucide-react";

export interface WidgetConfig {
  id: string;
  type: "news" | "currency" | "sports" | "weather" | "stock" | "calendar";
  title: string;
  size: "sm" | "md" | "lg";
}

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "1", type: "news", title: "Son Dakika", size: "lg" },
  { id: "2", type: "currency", title: "Piyasalar", size: "sm" },
  { id: "4", type: "weather", title: "Hava Durumu", size: "sm" },
  { id: "3", type: "sports", title: "Spor Dünyası", size: "md" },
];

export const AVAILABLE_WIDGETS_TYPES = [
  { type: "news", title: "Haber Modülü", icon: Newspaper, desc: "En güncel haberleri takip edin" },
  { type: "currency", title: "Altın & Döviz", icon: Wallet, desc: "Canlı piyasa değerleri" },
  { type: "sports", title: "Spor Köşesi", icon: Trophy, desc: "Maç sonuçları ve spor haberleri" },
  { type: "weather", title: "Hava Durumu", icon: Cloud, desc: "Yerel hava tahmini" },
  { type: "calendar", title: "Takvim & Etkinlik", icon: Calendar, desc: "Günlük program ve hatırlatıcılar" },
  { type: "stock", title: "Borsa", icon: TrendingUp, desc: "Hisse senedi takibi" },
];

export const MOCK_NEWS = [
  {
    id: 1,
    title: "Yapay Zeka Devrimi Gazeteciliği Yeniden Tanımlıyor",
    category: "Teknoloji",
    time: "10 dk önce",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800",
    desc: "Yeni model, önceki versiyonlara göre %40 daha hızlı ve %30 daha verimli çalışıyor. Özellikle karmaşık problem çözme yetenekleri geliştirildi. Haber merkezleri artık verileri saniyeler içinde analiz edebiliyor.",
    isFeatured: true
  },
  {
    id: 2,
    title: "Milli Takımdan Unutulmaz Galibiyet",
    category: "Spor",
    time: "1 saat önce",
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800",
    desc: "Deplasmanda oynanan zorlu mücadelede milliler, son dakika golüyle 2-1'lik skorla sahadan ayrıldı. Taraftarlar sokaklara döküldü.",
    isFeatured: true
  },
  {
    id: 3,
    title: "Ekonomide Yeni Paket Açıklandı",
    category: "Ekonomi",
    time: "2 saat önce",
    image: "https://images.unsplash.com/photo-1611974714658-45d625ee3154?auto=format&fit=crop&q=80&w=400",
    desc: "Hazine ve Maliye Bakanlığı tarafından duyurulan yeni teşvik paketi, özellikle KOBİ'lere yönelik düşük faizli kredi imkanları sunuyor.",
  },
  {
    id: 4,
    title: "Mars'ta Sıvı Su İzlerine Rastlandı",
    category: "Bilim",
    time: "4 saat önce",
    image: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&q=80&w=400",
    desc: "Gezgin robotun gönderdiği son veriler, krater tabanlarında mevsimsel olarak akan suyun kimyasal izlerini taşıyor.",
  },
  {
    id: 5,
    title: "Küresel İklim Zirvesi'nde Kritik Kararlar",
    category: "Dünya",
    time: "5 saat önce",
    image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=400",
    desc: "Liderler, karbon emisyonlarını 2030 yılına kadar %50 oranında azaltma sözü verdiler.",
  },
  {
    id: 6,
    title: "Otonom Araçlarda Güvenlik Standartları Artıyor",
    category: "Otomobil",
    time: "6 saat önce",
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400",
    desc: "Sürüş destek sistemleri için yayınlanan yeni yönetmelik, kazaları %25 oranında azaltmayı hedefliyor.",
  }
];

export const MOCK_ARCHIVE = [
  { id: "a1", date: "21 Mart 2026", title: "Kişisel Gazete - 21 Mart", summary: "Yapay zeka gelişmeleri, şampiyonluk yolunda son durum...", count: 6 },
  { id: "a2", date: "20 Mart 2026", title: "Kişisel Gazete - 20 Mart", summary: "Piyasa analizi, sağlık sektöründe yeni yaklaşımlar.", count: 5 },
  { id: "a3", date: "19 Mart 2026", title: "Kişisel Gazete - 19 Mart", summary: "Festival programı açıklandı, dijital dönüşüm gündemi.", count: 8 },
];

export const MOCK_RATES = [
  { name: "Gram Altın", value: "2.450,20", change: "+1.2%", up: true },
  { name: "USD/TRY", value: "32,45", change: "+0.1%", up: true },
  { name: "EUR/TRY", value: "35,12", change: "-0.3%", up: false },
  { name: "BIST 100", value: "9.200", change: "+0.8%", up: true },
];

