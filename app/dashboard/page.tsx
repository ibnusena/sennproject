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
import { Book, Film, LogOut, Plus, Star, Loader2, Pencil, Trash2, X, BookmarkCheck, PlayCircle, HeartHandshake } from "lucide-react";

interface MediaItem {
  id: string;
  type: "book" | "movie";
  title: string;
  subTitle: string; // Penulis atau Publisher
  status: "Wishlist" | "On Going" | "Selesai";
  userId: string;
  
  // Custom Fields Buku
  currentPage?: number;
  totalPages?: number;
  kesanPesan?: string;

  // Custom Fields Tontonan
  mediaCategory?: "film" | "series";
  movieDuration?: number; // menit
  movieProgress?: number; // menit
  seriesSeasons?: number;
  seriesEpisodes?: number;
  seriesProgressEps?: number;
  rating?: number; // 1-5
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"book" | "movie">("book");
  const [items, setItems] = useState<MediaItem[]>([]);

  // State Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<MediaItem>>({
    title: "",
    subTitle: "",
    status: "Wishlist",
    currentPage: 0,
    totalPages: 0,
    kesanPesan: "",
    mediaCategory: "film",
    movieDuration: 0,
    movieProgress: 0,
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

  const openModal = (itemToEdit?: MediaItem) => {
    if (itemToEdit) {
      setEditingItem(itemToEdit);
      setFormData(itemToEdit);
    } else {
      setEditingItem(null);
      setFormData({
        title: "",
        subTitle: "",
        status: "Wishlist",
        currentPage: 0,
        totalPages: 0,
        kesanPesan: "",
        mediaCategory: "film",
        movieDuration: 0,
        movieProgress: 0,
        seriesSeasons: 1,
        seriesEpisodes: 1,
        seriesProgressEps: 0,
        rating: 5,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
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

  // Helper kalkulasi persentase progres
  const calculateProgress = (item: MediaItem) => {
    if (item.type === "book") {
      if (!item.totalPages || item.totalPages === 0) return 0;
      return Math.min(100, Math.round(((item.currentPage || 0) / item.totalPages) * 100));
    } else {
      if (item.mediaCategory === "film") {
        if (!item.movieDuration || item.movieDuration === 0) return 0;
        return Math.min(100, Math.round(((item.movieProgress || 0) / item.movieDuration) * 100));
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

  const filteredItems = items.filter((item) => item.type === activeTab);

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
            <p className="text-slate-500">Belum ada data. Klik tombol di atas buat nambahin!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const progress = calculateProgress(item);

              return (
                <div key={item.id} className="bg-slate-800 border border-slate-700/60 p-5 rounded-xl flex flex-col justify-between group relative">
                  <div>
                    {/* Badge Status & Kategori */}
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                        item.status === "Selesai" 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : item.status === "On Going" 
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}>
                        {item.status === "Wishlist" ? "✨ Wishlist (Ayo Baca/Tonton!)" : item.status === "On Going" ? "📖 Sedang Dibaca/Ditonton" : "✅ Selesai"}
                      </span>

                      {item.type === "movie" && (
                        <span className="text-xs uppercase px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-semibold">
                          {item.mediaCategory}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-white text-lg">{item.title}</h4>
                    <p className="text-slate-400 text-sm mb-4">{item.subTitle}</p>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Progress</span>
                        <span className="font-semibold text-indigo-400">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${activeTab === "book" ? "bg-indigo-500" : "bg-pink-500"}`}
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>

                      {/* Detail Angka Progress */}
                      <p className="text-xs text-slate-400 mt-1">
                        {item.type === "book" ? (
                          `${item.currentPage || 0} / ${item.totalPages || 0} halaman`
                        ) : item.mediaCategory === "film" ? (
                          `${item.movieProgress || 0} / ${item.movieDuration || 0} menit`
                        ) : (
                          `${item.seriesProgressEps || 0} / ${item.seriesEpisodes || 0} eps (${item.seriesSeasons || 1} Season)`
                        )}
                      </p>
                    </div>

                    {/* Rating untuk Tontonan */}
                    {item.type === "movie" && item.rating && (
                      <div className="flex items-center space-x-1 mb-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < (item.rating || 0) ? "text-amber-400 fill-amber-400" : "text-slate-600"}`} 
                          />
                        ))}
                      </div>
                    )}

                    {/* Kesan Pesan untuk Buku */}
                    {item.type === "book" && item.kesanPesan && (
                      <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/40 mt-2 text-xs text-slate-300 italic">
                        "{item.kesanPesan}"
                      </div>
                    )}
                  </div>

                  {/* Tombol Action Edit & Delete */}
                  <div className="flex justify-end space-x-2 pt-4 mt-4 border-t border-slate-700/50">
                    <button
                      onClick={() => openModal(item)}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded-lg transition"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL EDIT / TAMBAH DATA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-4">
              {editingItem ? "Edit Data" : `Tambah ${activeTab === "book" ? "Buku" : "Tontonan"}`}
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
                  placeholder="Contoh: Atomic Habits / Stranger Things"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  {activeTab === "book" ? "Penulis" : "Platform / Publisher"}
                </label>
                <input
                  type="text"
                  required
                  value={formData.subTitle || ""}
                  onChange={(e) => setFormData({ ...formData, subTitle: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder={activeTab === "book" ? "James Clear" : "Netflix"}
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Status</label>
                <select
                  value={formData.status || "Wishlist"}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Wishlist">✨ Wishlist (Rencana / Ayo Baca!)</option>
                  <option value="On Going">📖 On Going (Sedang Berjalan)</option>
                  <option value="Selesai">✅ Selesai</option>
                </select>
              </div>

              {/* INPUT SPESIFIK BUKU */}
              {activeTab === "book" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
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
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Total Halaman</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.totalPages || 0}
                        onChange={(e) => setFormData({ ...formData, totalPages: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Kesan & Pesan (Quote / Insight)</label>
                    <textarea
                      rows={3}
                      value={formData.kesanPesan || ""}
                      onChange={(e) => setFormData({ ...formData, kesanPesan: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      placeholder="Apa hal berharga yang kamu dapat dari buku ini?"
                    />
                  </div>
                </>
              )}

              {/* INPUT SPESIFIK TONTONAN */}
              {activeTab === "movie" && (
                <>
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

                  {formData.mediaCategory === "film" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Posisi Menit Ke-</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.movieProgress || 0}
                          onChange={(e) => setFormData({ ...formData, movieProgress: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Durasi Film (Menit)</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.movieDuration || 0}
                          onChange={(e) => setFormData({ ...formData, movieDuration: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Total Season</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.seriesSeasons || 1}
                          onChange={(e) => setFormData({ ...formData, seriesSeasons: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Total Eps</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.seriesEpisodes || 1}
                          onChange={(e) => setFormData({ ...formData, seriesEpisodes: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Eps Ditonton</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.seriesProgressEps || 0}
                          onChange={(e) => setFormData({ ...formData, seriesProgressEps: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Rating (1-5 Bintang)</label>
                    <select
                      value={formData.rating || 5}
                      onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
                      <option value="4">⭐⭐⭐⭐ (4/5)</option>
                      <option value="3">⭐⭐⭐ (3/5)</option>
                      <option value="2">⭐⭐ (2/5)</option>
                      <option value="1">⭐ (1/5)</option>
                    </select>
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  {editingItem ? "Update Data" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}