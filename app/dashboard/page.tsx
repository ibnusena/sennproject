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
import { Book, Film, LogOut, Plus, Star, Loader2, Pencil, Trash2, X, Settings2, Image as ImageIcon, User as UserIcon, ListOrdered } from "lucide-react";

interface MediaItem {
  id: string;
  type: "book" | "movie";
  title: string;
  subTitle: string;
  status: "Wishlist" | "On Going" | "Selesai";
  userId: string;
  coverUrl?: string;

  // Custom Fields Buku
  currentPage?: number;
  totalPages?: number;
  kesanPesan?: string;

  // Custom Fields Tontonan
  mediaCategory?: "film" | "series";
  movieDurationMinutes?: number;
  movieProgressMinutes?: number;
  seriesSeasons?: number;
  seriesEpisodes?: number;
  seriesEpisodesPerSeason?: number[]; // Array episode per season [12, 10, 8]
  seriesProgressEps?: number;
  rating?: number;
}

const PUBLISHERS = [
  { name: "Netflix", color: "bg-red-600/20 text-red-400 border-red-500/30", icon: "🔴" },
  { name: "Disney+", color: "bg-blue-600/20 text-blue-400 border-blue-500/30", icon: "🟦" },
  { name: "HBO", color: "bg-purple-600/20 text-purple-400 border-purple-500/30", icon: "🟣" },
  { name: "VIU", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: "🟡" },
  { name: "Vidio", color: "bg-rose-600/20 text-rose-400 border-rose-500/30", icon: "🔴" },
];

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"book" | "movie">("book");
  const [items, setItems] = useState<MediaItem[]>([]);

  // State Dropdown Profile
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // State Modal Utama
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);

  // State Modal Khusus Edit Meta
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<MediaItem>>({
    title: "",
    subTitle: "Netflix",
    status: "Wishlist",
    coverUrl: "",
    currentPage: 0,
    totalPages: 0,
    kesanPesan: "",
    mediaCategory: "film",
    movieDurationMinutes: 0,
    movieProgressMinutes: 0,
    seriesSeasons: 1,
    seriesEpisodes: 12,
    seriesEpisodesPerSeason: [12],
    seriesProgressEps: 0,
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

  // Menangani perubahan jumlah season dan menyesuaikan array episode
  const handleSeasonCountChange = (numSeasons: number) => {
    const currentList = formData.seriesEpisodesPerSeason || [12];
    let newList = [...currentList];

    if (numSeasons > newList.length) {
      for (let i = newList.length; i < numSeasons; i++) {
        newList.push(12); // Default 12 episode per season baru
      }
    } else {
      newList = newList.slice(0, numSeasons);
    }

    const totalEps = newList.reduce((a, b) => a + Number(b || 0), 0);

    setFormData({
      ...formData,
      seriesSeasons: numSeasons,
      seriesEpisodesPerSeason: newList,
      seriesEpisodes: totalEps,
    });
  };

  // Menangani perubahan jumlah episode pada season tertentu
  const handleEpisodePerSeasonChange = (index: number, val: number) => {
    const newList = [...(formData.seriesEpisodesPerSeason || [12])];
    newList[index] = val;
    const totalEps = newList.reduce((a, b) => a + Number(b || 0), 0);

    setFormData({
      ...formData,
      seriesEpisodesPerSeason: newList,
      seriesEpisodes: totalEps,
    });
  };

  const openModal = (itemToEdit?: MediaItem) => {
    if (itemToEdit) {
      setEditingItem(itemToEdit);
      setFormData({
        ...itemToEdit,
        seriesEpisodesPerSeason: itemToEdit.seriesEpisodesPerSeason || [itemToEdit.seriesEpisodes || 12],
      });
    } else {
      setEditingItem(null);
      setFormData({
        title: "",
        subTitle: activeTab === "book" ? "" : "Netflix",
        status: "Wishlist",
        coverUrl: "",
        currentPage: 0,
        totalPages: 0,
        kesanPesan: "",
        mediaCategory: "film",
        movieDurationMinutes: 0,
        movieProgressMinutes: 0,
        seriesSeasons: 1,
        seriesEpisodes: 12,
        seriesEpisodesPerSeason: [12],
        seriesProgressEps: 0,
        rating: 5,
      });
    }
    setIsModalOpen(true);
  };

  const openMetaModal = (item: MediaItem) => {
    setEditingItem(item);
    setFormData({
      ...item,
      seriesEpisodesPerSeason: item.seriesEpisodesPerSeason || [item.seriesEpisodes || 12],
    });
    setIsMetaModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsMetaModalOpen(false);
    setEditingItem(null);
  };

  const handleStatusChange = (newStatus: "Wishlist" | "On Going" | "Selesai") => {
    if (newStatus === "Selesai") {
      setFormData((prev) => ({
        ...prev,
        status: newStatus,
        currentPage: prev.totalPages || prev.currentPage,
        movieProgressMinutes: prev.movieDurationMinutes || prev.movieProgressMinutes,
        seriesProgressEps: prev.seriesEpisodes || prev.seriesProgressEps,
      }));
    } else {
      setFormData((prev) => ({ ...prev, status: newStatus }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      let finalData = { ...formData };

      if (finalData.status === "Selesai") {
        if (activeTab === "book") {
          finalData.currentPage = finalData.totalPages || finalData.currentPage;
        } else if (finalData.mediaCategory === "film") {
          finalData.movieProgressMinutes = finalData.movieDurationMinutes || finalData.movieProgressMinutes;
        } else {
          finalData.seriesProgressEps = finalData.seriesEpisodes || finalData.seriesProgressEps;
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

  const calculateProgress = (item: MediaItem) => {
    if (item.status === "Selesai") return 100;

    if (item.type === "book") {
      if (!item.totalPages || item.totalPages === 0) return 0;
      return Math.min(100, Math.round(((item.currentPage || 0) / item.totalPages) * 100));
    } else {
      if (item.mediaCategory === "film") {
        if (!item.movieDurationMinutes || item.movieDurationMinutes === 0) return 0;
        return Math.min(100, Math.round(((item.movieProgressMinutes || 0) / item.movieDurationMinutes) * 100));
      } else {
        if (!item.seriesEpisodes || item.seriesEpisodes === 0) return 0;
        return Math.min(100, Math.round(((item.seriesProgressEps || 0) / item.seriesEpisodes) * 100));
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const statusOrder = { Wishlist: 1, "On Going": 2, Selesai: 3 };
  const filteredItems = items
    .filter((item) => item.type === activeTab)
    .sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen font-sans pb-24 md:pb-8 p-4 md:p-8 select-none">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Bar */}
        <div className="flex justify-between items-center mb-6 relative">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              Mark Your Progress! 🚀
            </h2>
            <p className="text-xs md:text-sm text-slate-400">Kelola wishlist & progress harian kamu.</p>
          </div>

          {/* Profile Dropdown */}
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
              <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-4 z-50">
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
        <div className="hidden md:flex border-b border-slate-800 mb-8 space-x-8">
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

        {/* Header Section Desktop */}
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h3 className="text-lg md:text-xl font-bold text-white">
            {activeTab === "book" ? "Daftar Buku Saya" : "Daftar Tontonan Saya"}
          </h3>
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
            <p className="text-slate-500 text-sm">Belum ada data. Klik tombol `+` untuk menambahkan!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredItems.map((item) => {
              const progress = calculateProgress(item);
              const pubInfo = PUBLISHERS.find((p) => p.name === item.subTitle);

              return (
                <div key={item.id} className="bg-slate-800/90 border border-slate-700/60 p-4 md:p-5 rounded-2xl flex gap-3 md:gap-4 group relative overflow-hidden shadow-md">
                  {item.coverUrl && (
                    <div className="w-20 md:w-24 h-28 md:h-36 flex-shrink-0 rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
                      <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1.5 gap-1 flex-wrap">
                        <span className={`text-[10px] md:text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                          item.status === "Selesai" 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                            : item.status === "On Going" 
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}>
                          {item.status === "Wishlist" ? "✨ Wishlist" : item.status === "On Going" ? "📖 On Going" : "🏆 Tamat"}
                        </span>

                        {item.type === "movie" && (
                          <span className={`text-[10px] md:text-[11px] px-1.5 py-0.5 rounded border font-semibold flex items-center gap-1 ${pubInfo?.color || "bg-slate-700 text-slate-300 border-slate-600"}`}>
                            <span>{pubInfo?.icon || "🎬"}</span>
                            <span>{item.subTitle}</span>
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-white text-sm md:text-base leading-snug line-clamp-1">{item.title}</h4>
                      {item.type === "book" && <p className="text-slate-400 text-xs mb-2 line-clamp-1">{item.subTitle}</p>}

                      {/* Progress Bar */}
                      <div className="mt-2 mb-2">
                        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                          <span>Progress</span>
                          <span className="font-semibold text-indigo-400">{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${activeTab === "book" ? "bg-indigo-500" : "bg-pink-500"}`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>

                        <p className="text-[10px] md:text-[11px] text-slate-400 mt-1">
                          {item.type === "book" ? (
                            `${item.status === "Selesai" ? item.totalPages : item.currentPage || 0} / ${item.totalPages || 0} hal`
                          ) : item.mediaCategory === "film" ? (
                            `${formatTime(item.status === "Selesai" ? item.movieDurationMinutes : item.movieProgressMinutes)} / ${formatTime(item.movieDurationMinutes)}`
                          ) : (
                            `${item.status === "Selesai" ? item.seriesEpisodes : item.seriesProgressEps || 0} / ${item.seriesEpisodes || 0} eps (${item.seriesSeasons || 1} Season)`
                          )}
                        </p>
                      </div>

                      {/* Rating */}
                      {item.type === "movie" && item.status === "Selesai" && item.rating && (
                        <div className="flex items-center space-x-0.5 mb-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < (item.rating || 0) ? "text-amber-400 fill-amber-400" : "text-slate-600"}`} 
                            />
                          ))}
                        </div>
                      )}

                      {/* Kesan Pesan */}
                      {item.type === "book" && item.kesanPesan && (
                        <p className="text-[10px] md:text-[11px] text-slate-300 italic line-clamp-2 bg-slate-900/50 p-1.5 rounded border border-slate-700/30">
                          "{item.kesanPesan}"
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-1 pt-2 border-t border-slate-700/50 mt-1">
                      <button
                        onClick={() => openMetaModal(item)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 active:bg-slate-700 rounded transition"
                        title="Edit Struktur Total"
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

      {/* FAB - MOBILE */}
      <button
        onClick={() => openModal()}
        className={`md:hidden fixed bottom-20 right-5 z-40 p-4 rounded-full text-white shadow-2xl transition active:scale-95 ${
          activeTab === "book" ? "bg-indigo-600 shadow-indigo-600/50" : "bg-pink-600 shadow-pink-600/50"
        }`}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* BOTTOM NAVBAR - MOBILE */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 z-40 px-6 py-2 flex justify-around items-center">
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

      {/* MODAL UTAMA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-slate-800 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-2xl max-w-md w-full p-6 relative max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
            <button onClick={closeModal} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg sm:text-xl font-bold text-white mb-4">
              {editingItem ? "Edit Progress Data" : `Tambah ${activeTab === "book" ? "Buku" : "Tontonan"}`}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                  {activeTab === "book" ? "Penulis" : "Publisher / Platform"}
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
                  <select
                    value={formData.subTitle || "Netflix"}
                    onChange={(e) => setFormData({ ...formData, subTitle: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    {PUBLISHERS.map((p) => (
                      <option key={p.name} value={p.name}>{p.icon} {p.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" /> URL Cover Image (Opsional)
                </label>
                <input
                  type="url"
                  value={formData.coverUrl || ""}
                  onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                  placeholder="https://... (Link Gambar Portrait)"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Status</label>
                <select
                  value={formData.status || "Wishlist"}
                  onChange={(e) => handleStatusChange(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="Wishlist">✨ Wishlist</option>
                  <option value="On Going">📖 On Going</option>
                  <option value="Selesai">🏆 Selesai</option>
                </select>
              </div>

              {activeTab === "book" && (
                <>
                  {formData.status !== "Selesai" && (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Halaman Sekarang</label>
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
                    <label className="block text-xs text-slate-400 mb-1">Total Halaman Buku</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.totalPages ?? 0}
                      onChange={(e) => setFormData({ ...formData, totalPages: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

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

                  {formData.status !== "Selesai" && (
                    formData.mediaCategory === "film" ? (
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Progress Nonton (Menit)</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.movieProgressMinutes ?? 0}
                          onChange={(e) => setFormData({ ...formData, movieProgressMinutes: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Episode yang Ditonton (Total Accumulative)</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.seriesProgressEps ?? 0}
                          onChange={(e) => setFormData({ ...formData, seriesProgressEps: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )
                  )}

                  {formData.mediaCategory === "film" ? (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Durasi Total (Menit)</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.movieDurationMinutes ?? 0}
                        onChange={(e) => setFormData({ ...formData, movieDurationMinutes: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-700/50">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Jumlah Season</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={formData.seriesSeasons || 1}
                          onChange={(e) => handleSeasonCountChange(Math.max(1, Number(e.target.value)))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Input Rincian Episode per Season */}
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <label className="block text-xs font-semibold text-slate-300">Rincian Episode Tiap Season:</label>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                          {Array.from({ length: formData.seriesSeasons || 1 }).map((_, idx) => (
                            <div key={idx} className="flex items-center space-x-2 bg-slate-800 p-2 rounded-xl border border-slate-700/60">
                              <span className="text-xs text-slate-400 w-12 font-medium">S{idx + 1}:</span>
                              <input
                                type="number"
                                min="1"
                                value={formData.seriesEpisodesPerSeason?.[idx] ?? 12}
                                onChange={(e) => handleEpisodePerSeasonChange(idx, Number(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-indigo-500 text-center"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs text-pink-400 pt-2 border-t border-slate-800 font-bold">
                        <span>Total Semua Episode:</span>
                        <span>{formData.seriesEpisodes || 0} Episode</span>
                      </div>
                    </div>
                  )}

                  {formData.status === "Selesai" && (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Rating</label>
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
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
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

      {/* MODAL EDIT META (PENGATURAN STRUKTUR TOTAL) */}
      {isMetaModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-slate-800 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-2xl max-w-md w-full p-6 relative">
            <button onClick={closeModal} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-amber-400" /> Edit Pengaturan Total
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
                  <label className="block text-xs text-slate-400 mb-1">Total Durasi Film (Menit)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.movieDurationMinutes ?? 0}
                    onChange={(e) => setFormData({ ...formData, movieDurationMinutes: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ) : (
                <div className="space-y-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-700/50">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Jumlah Season</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={formData.seriesSeasons || 1}
                      onChange={(e) => handleSeasonCountChange(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <label className="block text-xs font-semibold text-slate-300">Rincian Episode Tiap Season:</label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                      {Array.from({ length: formData.seriesSeasons || 1 }).map((_, idx) => (
                        <div key={idx} className="flex items-center space-x-2 bg-slate-800 p-2 rounded-xl border border-slate-700/60">
                          <span className="text-xs text-slate-400 w-12 font-medium">S{idx + 1}:</span>
                          <input
                            type="number"
                            min="1"
                            value={formData.seriesEpisodesPerSeason?.[idx] ?? 12}
                            onChange={(e) => handleEpisodePerSeasonChange(idx, Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-indigo-500 text-center"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-amber-400 pt-2 border-t border-slate-800 font-bold">
                    <span>Total Semua Episode:</span>
                    <span>{formData.seriesEpisodes || 0} Episode</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-400 hover:text-white text-sm">
                  Batal
                </button>
                <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 rounded-xl text-sm font-medium">
                  Update Struktur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}