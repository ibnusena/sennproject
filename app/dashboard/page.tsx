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
import { Book, Film, LogOut, Plus, Star, Loader2, Pencil, Trash2, X, Settings2, Image as ImageIcon } from "lucide-react";

interface MediaItem {
  id: string;
  type: "book" | "movie";
  title: string;
  subTitle: string; // Publisher atau Penulis
  status: "Wishlist" | "On Going" | "Selesai";
  userId: string;
  coverUrl?: string; // Cover Portrait

  // Custom Fields Buku
  currentPage?: number;
  totalPages?: number;
  kesanPesan?: string;

  // Custom Fields Tontonan
  mediaCategory?: "film" | "series";
  movieDurationMinutes?: number; // Total durasi dalam menit
  movieProgressMinutes?: number; // Progress dalam menit
  seriesSeasons?: number;
  seriesEpisodes?: number;
  seriesProgressEps?: number;
  rating?: number; // 1-5 bintang
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

  // State Modal Utama (Tambah/Edit Progress Biasa)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);

  // State Modal Khusus Edit Meta (Halaman/Durasi/Season/Eps)
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
    seriesEpisodes: 1,
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

  // Helper Format Waktu Menit ke "X j Y m"
  const formatTime = (totalMinutes: number = 0) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}m`;
    return `${hours}j ${minutes}m`;
  };

  const openModal = (itemToEdit?: MediaItem) => {
    if (itemToEdit) {
      setEditingItem(itemToEdit);
      setFormData(itemToEdit);
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
        seriesEpisodes: 1,
        seriesProgressEps: 0,
        rating: 5,
      });
    }
    setIsModalOpen(true);
  };

  const openMetaModal = (item: MediaItem) => {
    setEditingItem(item);
    setFormData(item);
    setIsMetaModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsMetaModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const payload = {
        ...formData,
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

  // Sorting: Wishlist (1) -> On Going (2) -> Selesai (3)
  const statusOrder = { Wishlist: 1, "On Going": 2, Selesai: 3 };
  const filteredItems = items
    .filter((item) => item.type === activeTab)
    .sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header Profile */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-800/40 border border-slate-800 p-6 rounded-2xl mb-8 gap-4">
          <div className="flex items-center space-x-4">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-12 h-12 rounded-full border border-indigo-500" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                {user?.displayName?.charAt(0) || "U"}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white">Halo, {user?.displayName || "User"}! 👋</h2>
              <p className="text-slate-400 text-sm">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-400 text-sm font-medium transition flex items-center space-x-1"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 mb-8 space-x-8">
          <button
            onClick={() => setActiveTab("book")}
            className={`pb-3 font-semibold flex items-center space-x-2 border-b-2 transition ${
              activeTab === "book"
                ? "text-indigo-400 border-indigo-500"
                : "text-slate-400 hover:text-white border-transparent"
            }`}
          >
            <Book className="w-4 h-4" />
            <span>Buku Bacaan</span>
          </button>
          <button
            onClick={() => setActiveTab("movie")}
            className={`pb-3 font-semibold flex items-center space-x-2 border-b-2 transition ${
              activeTab === "movie"
                ? "text-pink-400 border-pink-500"
                : "text-slate-400 hover:text-white border-transparent"
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Tontonan / Series</span>
          </button>
        </div>

        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">
            {activeTab === "book" ? "Daftar Buku Saya" : "Daftar Tontonan Saya"}
          </h3>
          <button
            onClick={() => openModal()}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition text-white ${
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
            <p className="text-slate-500">Belum ada data. Klik tombol di atas untuk menambahkan!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const progress = calculateProgress(item);
              const pubInfo = PUBLISHERS.find((p) => p.name === item.subTitle);

              return (
                <div key={item.id} className="bg-slate-800 border border-slate-700/60 p-5 rounded-xl flex gap-4 group relative overflow-hidden">
                  {/* Cover Portrait (Opsional) */}
                  {item.coverUrl && (
                    <div className="w-24 h-36 flex-shrink-0 rounded-lg overflow-hidden bg-slate-900 border border-slate-700">
                      <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      {/* Badge Status */}
                      <div className="flex justify-between items-center mb-2 gap-1 flex-wrap">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                          item.status === "Selesai" 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                            : item.status === "On Going" 
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}>
                          {item.status === "Wishlist" ? "✨ Wishlist" : item.status === "On Going" ? "📖 On Going" : "🏆 Tamat"}
                        </span>

                        {/* Badge Publisher dengan Warna */}
                        {item.type === "movie" && (
                          <span className={`text-[11px] px-2 py-0.5 rounded border font-semibold flex items-center gap-1 ${pubInfo?.color || "bg-slate-700 text-slate-300 border-slate-600"}`}>
                            <span>{pubInfo?.icon || "🎬"}</span>
                            <span>{item.subTitle}</span>
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-white text-base leading-snug line-clamp-1">{item.title}</h4>
                      {item.type === "book" && <p className="text-slate-400 text-xs mb-3">{item.subTitle}</p>}

                      {/* Progress Bar */}
                      <div className="mt-2 mb-3">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>Progress</span>
                          <span className="font-semibold text-indigo-400">{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${activeTab === "book" ? "bg-indigo-500" : "bg-pink-500"}`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>

                        <p className="text-[11px] text-slate-400 mt-1">
                          {item.type === "book" ? (
                            `${item.currentPage || 0} / ${item.totalPages || 0} hal`
                          ) : item.mediaCategory === "film" ? (
                            `${formatTime(item.movieProgressMinutes)} / ${formatTime(item.movieDurationMinutes)}`
                          ) : (
                            `${item.seriesProgressEps || 0} / ${item.seriesEpisodes || 0} eps (${item.seriesSeasons || 1} Season)`
                          )}
                        </p>
                      </div>

                      {/* Rating (Hanya Muncul Jika Selesai) */}
                      {item.type === "movie" && item.status === "Selesai" && item.rating && (
                        <div className="flex items-center space-x-1 mb-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3.5 h-3.5 ${i < (item.rating || 0) ? "text-amber-400 fill-amber-400" : "text-slate-600"}`} 
                            />
                          ))}
                        </div>
                      )}

                      {/* Kesan Pesan untuk Buku */}
                      {item.type === "book" && item.kesanPesan && (
                        <p className="text-[11px] text-slate-300 italic line-clamp-2 bg-slate-900/50 p-1.5 rounded border border-slate-700/30">
                          "{item.kesanPesan}"
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-1 pt-2 border-t border-slate-700/50 mt-2">
                      <button
                        onClick={() => openMetaModal(item)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-700 rounded transition"
                        title={activeTab === "book" ? "Edit Total Halaman" : "Edit Durasi/Season/Eps"}
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openModal(item)}
                        className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded transition"
                        title="Edit Progress / Status"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition"
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

      {/* MODAL UTAMA (TAMBAH / EDIT PROGRESS BIASA) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={closeModal} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-4">
              {editingItem ? "Edit Progress Data" : `Tambah ${activeTab === "book" ? "Buku" : "Tontonan"}`}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Judul</label>
                <input
                  type="text"
                  required
                  value={formData.title || ""}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Judul..."
                />
              </div>

              {/* Publisher / Penulis */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  {activeTab === "book" ? "Penulis" : "Publisher / Platform"}
                </label>
                {activeTab === "book" ? (
                  <input
                    type="text"
                    required
                    value={formData.subTitle || ""}
                    onChange={(e) => setFormData({ ...formData, subTitle: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Nama Penulis..."
                  />
                ) : (
                  <select
                    value={formData.subTitle || "Netflix"}
                    onChange={(e) => setFormData({ ...formData, subTitle: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {PUBLISHERS.map((p) => (
                      <option key={p.name} value={p.name}>{p.icon} {p.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Cover Image URL */}
              <div>
                <label className="block text-sm text-slate-400 mb-1 flex items-center gap-1">
                  <ImageIcon className="w-4 h-4" /> URL Cover Image (Opsional)
                </label>
                <input
                  type="url"
                  value={formData.coverUrl || ""}
                  onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                  placeholder="https://... (Link Gambar Portrait)"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Status</label>
                <select
                  value={formData.status || "Wishlist"}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Wishlist">✨ Wishlist</option>
                  <option value="On Going">📖 On Going</option>
                  <option value="Selesai">🏆 Selesai</option>
                </select>
              </div>

              {/* INPUT BUKU */}
              {activeTab === "book" && (
                <>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Halaman Sekarang</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.currentPage || 0}
                      onChange={(e) => setFormData({ ...formData, currentPage: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {!editingItem && (
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Total Halaman Awal</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.totalPages || 0}
                        onChange={(e) => setFormData({ ...formData, totalPages: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Kesan & Pesan</label>
                    <textarea
                      rows={2}
                      value={formData.kesanPesan || ""}
                      onChange={(e) => setFormData({ ...formData, kesanPesan: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs"
                      placeholder="Catatan/Insight..."
                    />
                  </div>
                </>
              )}

              {/* INPUT TONTONAN */}
              {activeTab === "movie" && (
                <>
                  {!editingItem && (
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Kategori Tontonan</label>
                      <select
                        value={formData.mediaCategory || "film"}
                        onChange={(e) => setFormData({ ...formData, mediaCategory: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="film">Film (Movie)</option>
                        <option value="series">Series / TV Show</option>
                      </select>
                    </div>
                  )}

                  {formData.mediaCategory === "film" ? (
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Progress Nonton (Dalam Menit)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.movieProgressMinutes || 0}
                        onChange={(e) => setFormData({ ...formData, movieProgressMinutes: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Episode yang Sudah Ditonton</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.seriesProgressEps || 0}
                        onChange={(e) => setFormData({ ...formData, seriesProgressEps: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  {!editingItem && (
                    formData.mediaCategory === "film" ? (
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Durasi Total (Menit)</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.movieDurationMinutes || 0}
                          onChange={(e) => setFormData({ ...formData, movieDurationMinutes: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-slate-400 mb-1">Total Season</label>
                          <input
                            type="number"
                            min="1"
                            value={formData.seriesSeasons || 1}
                            onChange={(e) => setFormData({ ...formData, seriesSeasons: Number(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400 mb-1">Total Episode</label>
                          <input
                            type="number"
                            min="1"
                            value={formData.seriesEpisodes || 1}
                            onChange={(e) => setFormData({ ...formData, seriesEpisodes: Number(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    )
                  )}

                  {/* Rating Hanya Terbuka Jika Status = Selesai */}
                  {formData.status === "Selesai" && (
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Rating Bintang</label>
                      <select
                        value={formData.rating || 5}
                        onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="5">⭐⭐⭐⭐⭐ (5 Bintang)</option>
                        <option value="4">⭐⭐⭐⭐ (4 Bintang)</option>
                        <option value="3">⭐⭐⭐ (3 Bintang)</option>
                        <option value="2">⭐⭐ (2 Bintang)</option>
                        <option value="1">⭐ (1 Bintang)</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-400 hover:text-white text-sm">
                  Batal
                </button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KHUSUS EDIT META (PENGATURAN AWAL) */}
      {isMetaModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 relative">
            <button onClick={closeModal} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-amber-400" /> Pengaturan Struktur
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === "book" ? (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Ubah Total Halaman Buku</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.totalPages || 0}
                    onChange={(e) => setFormData({ ...formData, totalPages: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ) : formData.mediaCategory === "film" ? (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Ubah Total Durasi Film (Dalam Menit)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.movieDurationMinutes || 0}
                    onChange={(e) => setFormData({ ...formData, movieDurationMinutes: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Ubah Total Season</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.seriesSeasons || 1}
                      onChange={(e) => setFormData({ ...formData, seriesSeasons: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Ubah Total Episode</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.seriesEpisodes || 1}
                      onChange={(e) => setFormData({ ...formData, seriesEpisodes: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-400 hover:text-white text-sm">
                  Batal
                </button>
                <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
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