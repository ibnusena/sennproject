"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Book, Film, LogOut, Plus, Star, Loader2 } from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"books" | "movies">("books");

  // Proteksi Route: Lempar ke landing page jika belum login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/");
      } else {
        setUser(currentUser);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

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

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* User Profile Banner */}
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 mb-8 space-x-8">
          <button
            onClick={() => setActiveTab("books")}
            className={`pb-3 font-semibold flex items-center space-x-2 border-b-2 transition ${
              activeTab === "books"
                ? "text-indigo-400 border-indigo-500"
                : "text-slate-400 hover:text-white border-transparent"
            }`}
          >
            <Book className="w-4 h-4" />
            <span>Buku Bacaan</span>
          </button>
          <button
            onClick={() => setActiveTab("movies")}
            className={`pb-3 font-semibold flex items-center space-x-2 border-b-2 transition ${
              activeTab === "movies"
                ? "text-pink-400 border-pink-500"
                : "text-slate-400 hover:text-white border-transparent"
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Tontonan / Series</span>
          </button>
        </div>

        {/* Tab Content: Books */}
        {activeTab === "books" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Daftar Buku Saya</h3>
              <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition">
                <Plus className="w-4 h-4" />
                <span>Tambah Buku</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800 border border-slate-700/60 p-5 rounded-xl">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">Selesai</span>
                  <span className="text-xs text-amber-400 flex items-center">
                    <Star className="w-3 h-3 fill-amber-400 mr-1" /> 5/5
                  </span>
                </div>
                <h4 className="font-bold text-white text-lg">Atomic Habits</h4>
                <p className="text-slate-400 text-sm">James Clear</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Movies */}
        {activeTab === "movies" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Daftar Tontonan Saya</h3>
              <button className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition">
                <Plus className="w-4 h-4" />
                <span>Tambah Tontonan</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800 border border-slate-700/60 p-5 rounded-xl">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">Sedang Ditonton</span>
                  <span className="text-xs text-slate-400">Eps 8 / Season 2</span>
                </div>
                <h4 className="font-bold text-white text-lg">Stranger Things</h4>
                <p className="text-slate-400 text-sm">Netflix Series</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}