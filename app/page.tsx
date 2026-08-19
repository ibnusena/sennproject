"use client";

import { useEffect, useState } from "react";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Book, Film, LogOut, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push("/dashboard");
    } catch (error) {
      console.error("Gagal login dengan Google:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Glow Effect Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-500/10 via-pink-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Header / Navbar */}
      <header className="max-w-6xl w-full mx-auto p-4 sm:p-6 flex justify-between items-center z-10">
        <div className="flex items-center space-x-2">
          <div className="bg-gradient-to-r from-indigo-500 to-pink-500 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20">
            <Book className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <span className="font-bold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            MediaTracker
          </span>
        </div>

        {user ? (
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-slate-700/60 transition flex items-center space-x-2 shadow-sm active:scale-95"
          >
            <span>Buka Dashboard</span>
            <ArrowRight className="w-4 h-4 text-indigo-400" />
          </button>
        ) : (
          <button
            onClick={handleGoogleLogin}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition shadow-lg shadow-indigo-600/30 active:scale-95"
          >
            Masuk
          </button>
        )}
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 text-center my-auto py-12 sm:py-20 z-10 flex flex-col items-center">
        {/* Badge Hero */}
        <div className="inline-flex items-center space-x-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full mb-6 sm:mb-8 text-xs sm:text-sm text-indigo-400 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-400 animate-pulse" />
          <span>Kelola Semua Catatan Media Kamu</span>
        </div>

        {/* Title Main */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight sm:leading-none mb-4 sm:mb-6 text-white">
          Catat Progress <span className="bg-gradient-to-r from-indigo-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">Buku & Tontonan</span> Kamu di Satu Tempat.
        </h1>

        {/* Subtitle */}
        <p className="text-slate-400 text-sm sm:text-lg max-w-2xl mb-8 sm:mb-10 leading-relaxed px-2">
          Gak perlu bingung lagi lupa episode berapa atau halaman berapa kamu berhenti. Simpan wishlist, lacak progress, dan beri rating dengan rapi.
        </p>

        {/* Action Button */}
        {user ? (
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold px-8 py-3.5 rounded-2xl text-sm sm:text-base transition shadow-xl shadow-indigo-500/25 flex items-center justify-center space-x-2 active:scale-95"
          >
            <span>Masuk ke Dashboard Kamu</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleGoogleLogin}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 font-semibold px-6 sm:px-8 py-3.5 rounded-2xl text-sm sm:text-base transition flex items-center justify-center space-x-3 shadow-xl active:scale-95"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.6-.8-1-1.8-1-3z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
              />
            </svg>
            <span>Masuk dengan Google</span>
          </button>
        )}

        {/* Features Preview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12 sm:mt-16 w-full text-left">
          <div className="bg-slate-900/60 border border-slate-800 p-5 sm:p-6 rounded-2xl backdrop-blur-sm">
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center mb-4 border border-indigo-500/20">
              <Book className="w-5 h-5" />
            </div>
            <h3 className="text-white font-bold text-base sm:text-lg mb-1 sm:mb-2">Buku Bacaan</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Catat buku yang ingin dibaca, tandai halaman terakhir yang sudah dibaca, dan berikan kesan pesan unikmu.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 sm:p-6 rounded-2xl backdrop-blur-sm">
            <div className="w-10 h-10 bg-pink-500/10 text-pink-400 rounded-xl flex items-center justify-center mb-4 border border-pink-500/20">
              <Film className="w-5 h-5" />
            </div>
            <h3 className="text-white font-bold text-base sm:text-lg mb-1 sm:mb-2">Film & Series</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Kelola daftar film atau series favorit dari Netflix, Disney+, VIU, dll. Lengkap dengan durasi & rating bintang!
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto p-4 sm:p-6 text-center text-xs text-slate-600 z-10 border-t border-slate-900">
        &copy; {new Date().getFullYear()} MediaTracker App. Built with Next.js & Firebase.
      </footer>
    </div>
  );
}