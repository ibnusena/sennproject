"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp 
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { 
  Book, 
  Film, 
  LogOut, 
  Plus, 
  Star, 
  Loader2, 
  Pencil, 
  Trash2, 
  X, 
  Settings2, 
  Image as ImageIcon, 
  User as UserIcon, 
  Filter,
  Tv,
  Play,
  Video,
  Clapperboard,
  Globe
} from "lucide-react";

type ItemStatus = "Wishlist" | "On Going" | "Selesai" | "Dihentikan";

interface SeasonDetail {
  seasonNumber: number;
  episodesCount: number;
  episodesWatched: number;
  status: ItemStatus;
  rating?: number;
  isOngoing: boolean;
}

interface MediaItem {
  id: string;
  type: "book" | "movie";
  title: string;
  subTitle: string; // Penulis (Buku) / Platform (Movie)
  status: ItemStatus;
  userId: string;
  coverUrl?: string;

  // Custom Fields Buku
  bookCategory?: string;
  currentPage?: number;
  totalPages?: number;
  kesanPesan?: string;

  // Custom Fields Tontonan
  mediaCategory?: "film" | "series";
  movieDurationMinutes?: number;
  movieProgressMinutes?: number;

  // Custom Fields Series Per-Season
  seriesSeasonsDetails?: SeasonDetail[];

  // Field agregat
  seriesSeasons?: number;
  seriesEpisodes?: number;
  seriesProgressEps?: number;
  rating?: number;
}

// Daftar Platform dengan Logo Ikon
const PLATFORM_OPTIONS = [
  { name: "Netflix", icon: Play, color: "text-red-500" },
  { name: "Disney+", icon: Tv, color: "text-blue-400" },
  { name: "HBO", icon: Video, color: "text-purple-400" },
  { name: "Prime Video", icon: Video, color: "text-sky-400" },
  { name: "Vidio", icon: Play, color: "text-red-400" },
  { name: "Viu", icon: Tv, color: "text-amber-400" },
  { name: "Apple TV+", icon: Tv, color: "text-slate-200" },
  { name: "YouTube", icon: Play, color: "text-red-600" },
  { name: "Cinema XXI", icon: Clapperboard, color: "text-amber-500" },
  { name: "Lainnya", icon: Globe, color: "text-slate-400" },
];

const BOOK_CATEGORIES = [
  "Fiksi / Novel",
  "Non-Fiksi / Self-Help",
  "Komik / Manga / Manhwa",
  "Biografi / Otobiografi",
  "Sains & Teknologi",
  "Bisnis & Keuangan",
  "Pelajaran / Akademik",
  "Agama & Spiritual",
  "Lainnya",
];

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"book" | "movie">("book");
  const [items, setItems] = useState<MediaItem[]>([]);

  // Filter Status
  const [statusFilter, setStatusFilter] = useState<"Semua" | ItemStatus>("Semua");

  // Profile Menu State
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);

  // Durasi Movie
  const [movieTotalHours, setMovieTotalHours] = useState(0);
  const [movieTotalMins, setMovieTotalMins] = useState(0);
  const [movieProgHours, setMovieProgHours] = useState(0);
  const [movieProgMins, setMovieProgMins] = useState(0);

  // Form State
  const [formData, setFormData] = useState<Partial<MediaItem>>({
    title: "",
    subTitle: "Netflix",
    status: "Wishlist",
    coverUrl: "",
    bookCategory: "Fiksi / Novel",
    currentPage: 0,
    totalPages: 0,
    kesanPesan: "",
    mediaCategory: "film",
    movieDurationMinutes: 0,
    movieProgressMinutes: 0,
    seriesSeasonsDetails: [
      { seasonNumber: 1, episodesCount: 12, episodesWatched: 0, status: "Wishlist", rating: 5, isOngoing: false }
    ],
    rating: 5,
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/");
      } else {
        setUser(currentUser);
        setLoading(false);

        const q = query(
          collection(db, "media_items"),
          where("userId", "==", currentUser.uid)
        );

        const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
          const list: MediaItem[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<MediaItem, "id">),
          }));
          setItems(list);
        });

        return () => unsubscribeFirestore();
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  const formatTime = (totalMinutes: number = 0) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}m`;
    return `${hours}j ${minutes}m`;
  };

  const handleSeasonCountChange = (count: number) => {
    const current = formData.seriesSeasonsDetails || [];
    let updated: SeasonDetail[] = [...current];

    if (count > current.length) {
      for (let i = current.length; i < count; i++) {
        updated.push({
          seasonNumber: i + 1,
          episodesCount: 12,
          episodesWatched: 0,
          status: "Wishlist",
          rating: 5,
          isOngoing: false,
        });
      }
    } else {
      updated = updated.slice(0, count);
    }

    setFormData({ ...formData, seriesSeasonsDetails: updated });
  };

  const updateSeasonDetail = (index: number, key: keyof SeasonDetail, val: any) => {
    const details = [...(formData.seriesSeasonsDetails || [])];
    if (!details[index]) return;

    details[index] = { ...details[index], [key]: val };

    if (key === "episodesWatched" && details[index].isOngoing) {
      if (details[index].episodesWatched > details[index].episodesCount) {
        details[index].episodesCount = details[index].episodesWatched;
      }
    }

    if (key === "status" && val === "Selesai") {
      details[index].episodesWatched = details[index].episodesCount;
    }

    setFormData({ ...formData, seriesSeasonsDetails: details });
  };

  const toggleOngoingSeason = (index: number) => {
    const details = [...(formData.seriesSeasonsDetails || [])];
    const newOngoing = !details[index].isOngoing;
    details[index].isOngoing = newOngoing;

    if (newOngoing && details[index].episodesWatched > details[index].episodesCount) {
      details[index].episodesCount = details[index].episodesWatched;
    }

    setFormData({ ...formData, seriesSeasonsDetails: details });
  };

  const openModal = (itemToEdit?: MediaItem) => {
    if (itemToEdit) {
      setEditingItem(itemToEdit);
      
      const defaultSeasons: SeasonDetail[] = itemToEdit.seriesSeasonsDetails || [
        {
          seasonNumber: 1,
          episodesCount: itemToEdit.seriesEpisodes || 12,
          episodesWatched: itemToEdit.seriesProgressEps || 0,
          status: itemToEdit.status || "Wishlist",
          rating: itemToEdit.rating || 5,
          isOngoing: false,
        }
      ];

      setFormData({
        ...itemToEdit,
        bookCategory: itemToEdit.bookCategory || "Fiksi / Novel",
        seriesSeasonsDetails: defaultSeasons,
      });

      const totalMin = itemToEdit.movieDurationMinutes || 0;
      setMovieTotalHours(Math.floor(totalMin / 60));
      setMovieTotalMins(totalMin % 60);

      const progMin = itemToEdit.movieProgressMinutes || 0;
      setMovieProgHours(Math.floor(progMin / 60));
      setMovieProgMins(progMin % 60);
    } else {
      setEditingItem(null);
      setFormData({
        title: "",
        subTitle: activeTab === "book" ? "" : "Netflix",
        status: "Wishlist",
        coverUrl: "",
        bookCategory: "Fiksi / Novel",
        currentPage: 0,
        totalPages: 0,
        kesanPesan: "",
        mediaCategory: "film",
        movieDurationMinutes: 0,
        movieProgressMinutes: 0,
        seriesSeasonsDetails: [
          { seasonNumber: 1, episodesCount: 12, episodesWatched: 0, status: "Wishlist", rating: 5, isOngoing: false }
        ],
        rating: 5,
      });

      setMovieTotalHours(0);
      setMovieTotalMins(0);
      setMovieProgHours(0);
      setMovieProgMins(0);
    }
    setIsModalOpen(true);
  };

  const openMetaModal = (item: MediaItem) => {
    setEditingItem(item);
    setFormData({
      ...item,
      bookCategory: item.bookCategory || "Fiksi / Novel",
      seriesSeasonsDetails: item.seriesSeasonsDetails || [
        { seasonNumber: 1, episodesCount: 12, episodesWatched: 0, status: item.status || "Wishlist", rating: 5, isOngoing: false }
      ],
    });

    const totalMin = item.movieDurationMinutes || 0;
    setMovieTotalHours(Math.floor(totalMin / 60));
    setMovieTotalMins(totalMin % 60);

    setIsMetaModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsMetaModalOpen(false);
    setEditingItem(null);
  };

  const handleGlobalStatusChange = (newStatus: ItemStatus) => {
    if (newStatus === "Selesai") {
      setFormData((prev) => ({
        ...prev,
        status: newStatus,
        currentPage: prev.totalPages || prev.currentPage,
        movieProgressMinutes: prev.movieDurationMinutes || prev.movieProgressMinutes,
        seriesSeasonsDetails: prev.seriesSeasonsDetails?.map((s) => ({
          ...s,
          status: "Selesai",
          episodesWatched: s.episodesCount,
        })),
      }));
    } else {
      setFormData((prev) => ({ ...prev, status: newStatus }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const calculatedTotalMinutes = (movieTotalHours * 60) + movieTotalMins;
      const calculatedProgMinutes = (movieProgHours * 60) + movieProgMins;

      let finalData = { 
        ...formData,
        movieDurationMinutes: calculatedTotalMinutes,
        movieProgressMinutes: calculatedProgMinutes,
      };

      if (finalData.mediaCategory === "series" && finalData.seriesSeasonsDetails) {
        const details = finalData.seriesSeasonsDetails;
        
        const totalEps = details.reduce((acc, curr) => {
          const target = curr.isOngoing ? Math.max(curr.episodesCount, curr.episodesWatched) : curr.episodesCount;
          return acc + Number(target || 0);
        }, 0);

        const watchedEps = details.reduce((acc, curr) => acc + Number(curr.episodesWatched || 0), 0);

        finalData.seriesSeasons = details.length;
        finalData.seriesEpisodes = totalEps;
        finalData.seriesProgressEps = watchedEps;

        const allFinished = details.every((s) => s.status === "Selesai");
        const anyDropped = details.some((s) => s.status === "Dihentikan");
        const anyOngoing = details.some((s) => s.status === "On Going" || s.isOngoing || s.episodesWatched > 0);

        if (allFinished) {
          finalData.status = "Selesai";
        } else if (anyDropped && !anyOngoing) {
          finalData.status = "Dihentikan";
        } else if (anyOngoing) {
          finalData.status = "On Going";
        }
      }

      if (finalData.status === "Selesai") {
        if (activeTab === "book") {
          finalData.currentPage = finalData.totalPages || finalData.currentPage;
        } else if (finalData.mediaCategory === "film") {
          finalData.movieProgressMinutes = finalData.movieDurationMinutes || finalData.movieProgressMinutes;
        }
      }

      const payload = {
        ...finalData,
        type: activeTab,
        userId: user.uid,
        updatedAt: serverTimestamp(),
      };

      if (editingItem) {
        await updateDoc(doc(db, "media_items", editingItem.id), payload);
      } else {
        await addDoc(collection(db, "media_items"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      closeModal();
    } catch (error) {
      console.error("Gagal menyimpan data:", error);
      alert("Gagal menyimpan data!");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Yakin mau hapus data ini?")) {
      try {
        await deleteDoc(doc(db, "media_items", id));
      } catch (error) {
        console.error("Gagal menghapus:", error);
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  // Kalkulasi Persentase Progress
  const calculateProgress = (item: MediaItem) => {
    if (item.status === "Selesai") return 100;

    let pct = 0;
    if (item.type === "book") {
      if (!item.totalPages || item.totalPages === 0) return 0;
      pct = Math.round(((item.currentPage || 0) / item.totalPages) * 100);
    } else {
      if (item.mediaCategory === "film") {
        if (!item.movieDurationMinutes || item.movieDurationMinutes === 0) return 0;
        pct = Math.round(((item.movieProgressMinutes || 0) / item.movieDurationMinutes) * 100);
      } else {
        if (!item.seriesEpisodes || item.seriesEpisodes === 0) return 0;
        const targetEpisodes = Math.max(item.seriesEpisodes, item.seriesProgressEps || 0);
        pct = Math.round(((item.seriesProgressEps || 0) / targetEpisodes) * 100);
      }
    }

    // CEK PERSISTENSI MASIH TAYANG / ONGOING (Batas Maksimal 99%)
    const hasAnyOngoingSeason = item.seriesSeasonsDetails?.some((s) => s.isOngoing || s.status === "On Going");
    const isStillOngoing = item.status === "On Going" || hasAnyOngoingSeason;

    if (isStillOngoing && pct >= 100) {
      return 99;
    }

    return Math.min(100, Math.max(0, pct));
  };

  // Render Platform Badge + Icon
  const renderPlatformBadge = (platformName: string) => {
    const matched = PLATFORM_OPTIONS.find((p) => p.name.toLowerCase() === platformName?.toLowerCase()) || PLATFORM_OPTIONS[PLATFORM_OPTIONS.length - 1];
    const IconComponent = matched.icon;

    return (
      <span className="text-[10px] px-2 py-0.5 rounded-md border font-semibold bg-slate-800 text-slate-300 border-slate-700 flex items-center space-x-1">
        <IconComponent className={`w-3 h-3 ${matched.color}`} />
        <span>{matched.name}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const filteredItems = items
    .filter((item) => item.type === activeTab)
    .filter((item) => (statusFilter === "Semua" ? true : item.status === statusFilter));

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen font-sans pb-24 md:pb-8 p-3 sm:p-4 md:p-8 select-none">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Bar */}
        <div className="flex justify-between items-center mb-5 relative">
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold text-white tracking-tight">
              Mark Your Progress! 🚀
            </h2>
            <p className="text-xs text-slate-400">Kelola wishlist & progress harian kamu.</p>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-10 h-10 md:w-11 md:h-11 rounded-full border border-indigo-500/50 p-0.5 bg-slate-800 flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="User Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                <UserIcon className="w-5 h-5 text-indigo-400" />
              )}
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-4 z-50">
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-700/60 mb-3">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-10 h-10 rounded-full border border-indigo-500" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                      {user?.displayName?.charAt(0) || "U"}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-white truncate">{user?.displayName || "User"}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar Akun</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Switcher - Desktop */}
        <div className="hidden md:flex border-b border-slate-800 mb-6 space-x-8">
          <button
            onClick={() => setActiveTab("book")}
            className={`pb-3 font-semibold flex items-center space-x-2 border-b-2 transition ${
              activeTab === "book" ? "text-indigo-400 border-indigo-500" : "text-slate-400 hover:text-white border-transparent"
            }`}
          >
            <Book className="w-4 h-4" />
            <span>Buku Bacaan</span>
          </button>
          <button
            onClick={() => setActiveTab("movie")}
            className={`pb-3 font-semibold flex items-center space-x-2 border-b-2 transition ${
              activeTab === "movie" ? "text-pink-400 border-pink-500" : "text-slate-400 hover:text-white border-transparent"
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Tontonan / Series</span>
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <h3 className="text-base md:text-xl font-bold text-white">
            {activeTab === "book" ? "Daftar Buku Saya" : "Daftar Tontonan Saya"}
          </h3>

          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            {(["Semua", "Wishlist", "On Going", "Selesai", "Dihentikan"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium whitespace-nowrap transition border ${
                  statusFilter === st
                    ? "bg-slate-700 text-white border-slate-500 shadow-sm"
                    : "bg-slate-800/60 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
              >
                {st === "Wishlist" ? "✨ Wishlist" : st === "On Going" ? "📖 On Going" : st === "Selesai" ? "🏆 Selesai" : st === "Dihentikan" ? "🛑 Dihentikan" : "Semua"}
              </button>
            ))}
          </div>

          <button
            onClick={() => openModal()}
            className={`hidden md:flex px-4 py-2 rounded-lg text-sm font-medium items-center space-x-2 transition text-white ${
              activeTab === "book" ? "bg-indigo-600 hover:bg-indigo-500" : "bg-pink-600 hover:bg-pink-500"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Tambah {activeTab === "book" ? "Buku" : "Tontonan"}</span>
          </button>
        </div>

        {/* Grid List Data */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/20 border border-dashed border-slate-800 rounded-2xl">
            <p className="text-slate-500 text-xs sm:text-sm">Tidak ada data untuk filter ini. Klik `+` untuk menambahkan!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {filteredItems.map((item) => {
              const progress = calculateProgress(item);

              return (
                <div key={item.id} className="bg-slate-800/90 border border-slate-700/60 p-3.5 sm:p-4 rounded-2xl flex gap-3 group relative overflow-hidden shadow-md">
                  {item.coverUrl && (
                    <div className="w-20 sm:w-24 h-28 sm:h-36 flex-shrink-0 rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
                      <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1.5 gap-1 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                          item.status === "Selesai" 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                            : item.status === "On Going" 
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                            : item.status === "Dihentikan"
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}>
                          {item.status === "Wishlist" ? "✨ Wishlist" : item.status === "On Going" ? "📖 On Going" : item.status === "Dihentikan" ? "🛑 Dihentikan" : "🏆 Tamat"}
                        </span>

                        {item.type === "movie" ? (
                          renderPlatformBadge(item.subTitle)
                        ) : (
                          item.bookCategory && (
                            <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5 rounded font-medium">
                              {item.bookCategory}
                            </span>
                          )
                        )}
                      </div>

                      <h4 className="font-bold text-white text-sm sm:text-base leading-snug line-clamp-1">{item.title}</h4>
                      {item.type === "book" && <p className="text-slate-400 text-xs mb-1 line-clamp-1">oleh {item.subTitle}</p>}

                      {/* Progress Bar */}
                      <div className="mt-2 mb-2">
                        <div className="flex justify-between text-[10px] sm:text-[11px] text-slate-400 mb-1">
                          <span>Progress Total</span>
                          <span className="font-semibold text-indigo-400">{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${activeTab === "book" ? "bg-indigo-500" : "bg-pink-500"}`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>

                        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
                          {item.type === "book" ? (
                            `${item.status === "Selesai" ? item.totalPages : item.currentPage || 0} / ${item.totalPages || 0} hal`
                          ) : item.mediaCategory === "film" ? (
                            `${formatTime(item.status === "Selesai" ? item.movieDurationMinutes : item.movieProgressMinutes)} / ${formatTime(item.movieDurationMinutes)}`
                          ) : (
                            `${item.status === "Selesai" ? item.seriesEpisodes : item.seriesProgressEps || 0} / ${item.seriesEpisodes || 0} eps (${item.seriesSeasons || 1} Season)`
                          )}
                        </p>
                      </div>

                      {/* Rating (HANYA KALO SUDAH SELESAI) */}
                      {item.type === "movie" && item.mediaCategory === "film" && item.status === "Selesai" && item.rating && (
                        <div className="flex items-center space-x-0.5 mb-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < (item.rating || 0) ? "text-amber-400 fill-amber-400" : "text-slate-600"}`} 
                            />
                          ))}
                        </div>
                      )}

                      {item.type === "book" && item.kesanPesan && (
                        <p className="text-[10px] text-slate-300 italic line-clamp-2 bg-slate-900/50 p-1.5 rounded border border-slate-700/30">
                          "{item.kesanPesan}"
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end space-x-1 pt-1.5 border-t border-slate-700/50 mt-1">
                      <button
                        onClick={() => openMetaModal(item)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 active:bg-slate-700 rounded transition"
                        title="Edit Total"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openModal(item)}
                        className="p-1.5 text-slate-400 hover:text-indigo-400 active:bg-slate-700 rounded transition"
                        title="Edit Progress"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 active:bg-slate-700 rounded transition"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB Mobile */}
      <button
        onClick={() => openModal()}
        className={`md:hidden fixed bottom-20 right-4 z-40 p-3.5 rounded-full text-white shadow-2xl transition active:scale-95 ${
          activeTab === "book" ? "bg-indigo-600 shadow-indigo-600/50" : "bg-pink-600 shadow-pink-600/50"
        }`}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Bottom Navbar Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-40 px-6 py-2.5 flex justify-around items-center">
        <button
          onClick={() => setActiveTab("book")}
          className={`flex flex-col items-center space-y-1 transition ${
            activeTab === "book" ? "text-indigo-400 font-bold" : "text-slate-500"
          }`}
        >
          <Book className="w-5 h-5" />
          <span className="text-[10px]">Buku</span>
        </button>
        <button
          onClick={() => setActiveTab("movie")}
          className={`flex flex-col items-center space-y-1 transition ${
            activeTab === "movie" ? "text-pink-400 font-bold" : "text-slate-500"
          }`}
        >
          <Film className="w-5 h-5" />
          <span className="text-[10px]">Tontonan</span>
        </button>
      </div>

      {/* MODAL EDIT/TAMBAH PROGRESS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-slate-800 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 relative max-h-[88vh] sm:max-h-[90vh] overflow-y-auto">
            <button onClick={closeModal} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base sm:text-lg font-bold text-white mb-4">
              {editingItem ? "Edit Progress Data" : `Tambah ${activeTab === "book" ? "Buku" : "Tontonan"}`}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Judul</label>
                <input
                  type="text"
                  required
                  value={formData.title || ""}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Judul..."
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {activeTab === "book" ? "Penulis" : "Platform / Layanan Tontonan"}
                </label>
                {activeTab === "book" ? (
                  <input
                    type="text"
                    required
                    value={formData.subTitle || ""}
                    onChange={(e) => setFormData({ ...formData, subTitle: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Nama Penulis..."
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {PLATFORM_OPTIONS.map((plat) => {
                      const IconComp = plat.icon;
                      const isSelected = (formData.subTitle || "Netflix") === plat.name;

                      return (
                        <button
                          key={plat.name}
                          type="button"
                          onClick={() => setFormData({ ...formData, subTitle: plat.name })}
                          className={`flex items-center space-x-2 p-2 rounded-xl border text-xs text-left transition ${
                            isSelected 
                              ? "bg-slate-700 border-indigo-500 text-white font-bold ring-1 ring-indigo-500" 
                              : "bg-slate-900 border-slate-700/80 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <IconComp className={`w-4 h-4 ${plat.color}`} />
                          <span className="truncate">{plat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {activeTab === "book" && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Kategori Buku</label>
                  <select
                    value={formData.bookCategory || "Fiksi / Novel"}
                    onChange={(e) => setFormData({ ...formData, bookCategory: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    {BOOK_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" /> URL Cover Image (Opsional)
                </label>
                <input
                  type="url"
                  value={formData.coverUrl || ""}
                  onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                  placeholder="https://... (Link Gambar)"
                />
              </div>

              {/* Status Global */}
              {(activeTab === "book" || formData.mediaCategory === "film") && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Status Progress</label>
                  <select
                    value={formData.status || "Wishlist"}
                    onChange={(e) => handleGlobalStatusChange(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Wishlist">✨ Wishlist</option>
                    <option value="On Going">📖 On Going</option>
                    <option value="Selesai">🏆 Selesai</option>
                    <option value="Dihentikan">🛑 Dihentikan</option>
                  </select>
                </div>
              )}

              {/* BUKU FORM */}
              {activeTab === "book" && (
                <>
                  {formData.status !== "Selesai" && (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Halaman Dibaca Saat Ini</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.currentPage ?? 0}
                        onChange={(e) => setFormData({ ...formData, currentPage: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Kesan & Pesan</label>
                    <textarea
                      rows={2}
                      value={formData.kesanPesan || ""}
                      onChange={(e) => setFormData({ ...formData, kesanPesan: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                      placeholder="Catatan/Insight..."
                    />
                  </div>
                </>
              )}

              {/* MOVIE / SERIES FORM */}
              {activeTab === "movie" && (
                <>
                  {!editingItem && (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Kategori Tontonan</label>
                      <select
                        value={formData.mediaCategory || "film"}
                        onChange={(e) => setFormData({ ...formData, mediaCategory: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                      >
                        <option value="film">Film (Movie)</option>
                        <option value="series">Series / TV Show</option>
                      </select>
                    </div>
                  )}

                  {formData.mediaCategory === "film" ? (
                    <>
                      {formData.status !== "Selesai" && (
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Progress Nonton Saat Ini</label>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5">
                              <input
                                type="number"
                                min="0"
                                value={movieProgHours}
                                onChange={(e) => setMovieProgHours(Number(e.target.value))}
                                className="w-full bg-transparent text-white text-sm focus:outline-none"
                              />
                              <span className="text-xs text-slate-400">Jam</span>
                            </div>
                            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5">
                              <input
                                type="number"
                                min="0"
                                max="59"
                                value={movieProgMins}
                                onChange={(e) => setMovieProgMins(Number(e.target.value))}
                                className="w-full bg-transparent text-white text-sm focus:outline-none"
                              />
                              <span className="text-xs text-slate-400">Menit</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* RATING HANYA MUNCUL KALO STATUS SELESAI */}
                      {formData.status === "Selesai" && (
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Rating Film</label>
                          <select
                            value={formData.rating || 5}
                            onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                          >
                            <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                            <option value="4">⭐⭐⭐⭐ (4)</option>
                            <option value="3">⭐⭐⭐ (3)</option>
                            <option value="2">⭐⭐ (2)</option>
                            <option value="1">⭐ (1)</option>
                          </select>
                        </div>
                      )}
                    </>
                  ) : (
                    /* PANEL EDIT PER-SEASON SERIES */
                    <div className="space-y-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-700/60">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                        <label className="block text-xs font-bold text-pink-400">Pengaturan Per-Season</label>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-400">Total Season:</span>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={formData.seriesSeasonsDetails?.length || 1}
                            onChange={(e) => handleSeasonCountChange(Math.max(1, Number(e.target.value)))}
                            className="w-12 bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-0.5 text-white text-xs text-center focus:outline-none focus:border-pink-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                        {formData.seriesSeasonsDetails?.map((season, idx) => {
                          return (
                            <div key={idx} className="bg-slate-800 p-3 rounded-xl border border-slate-700/80 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-white font-bold">Season {season.seasonNumber}</span>

                                <label className="flex items-center space-x-1.5 text-[10px] text-amber-400 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={season.isOngoing}
                                    onChange={() => toggleOngoingSeason(idx)}
                                    className="rounded border-slate-700 bg-slate-900 text-pink-500 focus:ring-0"
                                  />
                                  <span>Masih Tayang</span>
                                </label>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] text-slate-400 mb-0.5">Sudah Ditonton</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={season.episodesWatched}
                                    onChange={(e) => updateSeasonDetail(idx, "episodesWatched", Number(e.target.value))}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-pink-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] text-slate-400 mb-0.5">
                                    {season.isOngoing ? "Total Eps (Otomatis)" : "Total Episode"}
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    disabled={season.isOngoing}
                                    value={season.isOngoing ? Math.max(season.episodesCount, season.episodesWatched) : season.episodesCount}
                                    onChange={(e) => updateSeasonDetail(idx, "episodesCount", Number(e.target.value))}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-pink-500 disabled:opacity-40"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] text-slate-400 mb-0.5">Status Season</label>
                                  <select
                                    value={season.status}
                                    onChange={(e) => updateSeasonDetail(idx, "status", e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-pink-500"
                                  >
                                    <option value="Wishlist">✨ Wishlist</option>
                                    <option value="On Going">📖 On Going</option>
                                    <option value="Selesai">🏆 Selesai</option>
                                    <option value="Dihentikan">🛑 Dihentikan</option>
                                  </select>
                                </div>

                                {/* RATING HANYA JIKA SEASON SELESAI */}
                                {season.status === "Selesai" ? (
                                  <div>
                                    <label className="block text-[10px] text-slate-400 mb-0.5">Rating Season</label>
                                    <select
                                      value={season.rating || 5}
                                      onChange={(e) => updateSeasonDetail(idx, "rating", Number(e.target.value))}
                                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-pink-500"
                                    >
                                      <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                                      <option value="4">⭐⭐⭐⭐ (4)</option>
                                      <option value="3">⭐⭐⭐ (3)</option>
                                      <option value="2">⭐⭐ (2)</option>
                                      <option value="1">⭐ (1)</option>
                                    </select>
                                  </div>
                                ) : (
                                  <div className="flex items-end pb-1">
                                    <span className="text-[10px] text-slate-500 italic">Rating saat selesai</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-700">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-400 hover:text-white text-sm">
                  Batal
                </button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-sm font-medium">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT META (TOTAL HALAMAN / DURASI) */}
      {isMetaModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-slate-800 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 relative">
            <button onClick={closeModal} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-amber-400" /> Edit Total Struktur
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === "book" ? (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Total Halaman Buku</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.totalPages ?? 0}
                    onChange={(e) => setFormData({ ...formData, totalPages: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ) : formData.mediaCategory === "film" ? (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Durasi Total Film</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5">
                      <input
                        type="number"
                        min="0"
                        value={movieTotalHours}
                        onChange={(e) => setMovieTotalHours(Number(e.target.value))}
                        className="w-full bg-transparent text-white text-sm focus:outline-none"
                      />
                      <span className="text-xs text-slate-400">Jam</span>
                    </div>
                    <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={movieTotalMins}
                        onChange={(e) => setMovieTotalMins(Number(e.target.value))}
                        className="w-full bg-transparent text-white text-sm focus:outline-none"
                      />
                      <span className="text-xs text-slate-400">Menit</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-700/50">
                  <p>Struktur total episode & season untuk Series dikelola langsung dari modal edit utama.</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-400 hover:text-white text-sm">
                  Batal
                </button>
                <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 rounded-xl text-sm font-medium">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}