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
import { Book, Film, LogOut, Plus, Star, Loader2, Pencil, Trash2, X } from "lucide-react";

interface MediaItem {
  id: string;
  type: "book" | "movie";
  title: string;
  subTitle: string; // Penulis atau Platform
  status: string;
  extraInfo?: string; // Rating atau Episode
  userId: string;
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
  const [formData, setFormData] = useState({
    title: "",
    subTitle: "",
    status: "Sedang Dibaca/Ditonton",
    extraInfo: "",
  });

  // 1. Check Auth & Listen Realtime Data dari Firestore
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/");
      } else {
        setUser(currentUser);
        setLoading(false);

        // Fetch data realtime spesifik punya user ini aja
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

  // 2. Open Modal (Buat Tambah atau Edit)
  const openModal = (itemToEdit?: MediaItem) => {
    if (itemToEdit) {
      setEditingItem(itemToEdit);
      setFormData({
        title: itemToEdit.title,
        subTitle: itemToEdit.subTitle,
        status: itemToEdit.status,
        extraInfo: itemToEdit.extraInfo || "",
      });
    } else {
      setEditingItem(null);
      setFormData({
        title: "",
        subTitle: "",
        status: activeTab === "book" ? "Sedang Dibaca" : "Sedang Ditonton",
        extraInfo: "",
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  // 3. Handle Submit (Simpan / Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingItem) {
        // UPDATE DATA
        const itemRef = doc(db, "media_items", editingItem.id);
        await updateDoc(itemRef, {
          title: formData.title,
          subTitle: formData.subTitle,
          status: formData.status,
          extraInfo: formData.extraInfo,
          updatedAt: serverTimestamp(),
        });
      } else {
        // TAMBAH DATA BARU
        await addDoc(collection(db, "media_items"), {
          type: activeTab,
          title: formData.title,
          subTitle: formData.subTitle,
          status: formData.status,
          extraInfo: formData.extraInfo,
          userId: user.uid,
          createdAt: serverTimestamp(),
        });
      }
      closeModal();
    } catch (error) {
      console.error("Gagal menyimpan data:", error);
      alert("Gagal menyimpan data!");
    }
  };

  // 4. Handle Delete
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

        {/* Header Section Items */}
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
            <p className="text-slate-500">Belum ada data. Klik tombol diatas buat nambahin!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-slate-800 border border-slate-700/60 p-5 rounded-xl flex flex-col justify-between group relative">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                      {item.status}
                    </span>
                    {item.extraInfo && (
                      <span className="text-xs text-amber-400 flex items-center">
                        {activeTab === "book" && <Star className="w-3 h-3 fill-amber-400 mr-1" />}
                        {item.extraInfo}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-white text-lg">{item.title}</h4>
                  <p className="text-slate-400 text-sm">{item.subTitle}</p>
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
            ))}
          </div>
        )}
      </div>

      {/* MODAL EDIT / TAMBAH DATA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 relative">
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
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Contoh: Atomic Habits"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  {activeTab === "book" ? "Penulis" : "Platform / Publisher"}
                </label>
                <input
                  type="text"
                  required
                  value={formData.subTitle}
                  onChange={(e) => setFormData({ ...formData, subTitle: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder={activeTab === "book" ? "James Clear" : "Netflix / Disney+"}
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Wishlist">Wishlist / Rencana</option>
                  <option value="Sedang Process">Sedang Dibaca / Ditonton</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  {activeTab === "book" ? "Rating (Opsional)" : "Eps / Season (Opsional)"}
                </label>
                <input
                  type="text"
                  value={formData.extraInfo}
                  onChange={(e) => setFormData({ ...formData, extraInfo: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder={activeTab === "book" ? "5/5" : "Eps 8 / Season 2"}
                />
              </div>

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