"use client";

import { useEffect, useState } from "react";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Bookmark, BookOpen, Tv, Loader2 } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Auto redirect kalau user udah posisi login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/dashboard");
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      router.push("/dashboard");
    } catch (error) {
      console.error("Login gagal:", error);
      alert("Gagal login dengan Google. Coba lagi!");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen flex flex-col justify-between font-sans">
      {/* Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur fixed w-full top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Bookmark className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-wider">
              Mark<span className="text-indigo-500">It</span>
            </span>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-700 transition font-medium text-sm"
          >
            <GoogleIcon />
            <span>Masuk</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 pt-24 pb-16">
        <section className="max-w-6xl mx-auto px-4 py-16 text-center flex flex-col items-center">
          <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase mb-6">
            Personal Book & Watchlist Tracker
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-3xl mb-6">
            Tandai Buku Bacaan & Catat Tontonan Favoritmu.
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-8 leading-relaxed">
            Jangan pusing lagi lupa progress bacaan atau episode serial favorit. Kelola semua wishlist hiburanmu dalam satu dashboard simpel.
          </p>

          <button
            onClick={handleGoogleLogin}
            className="flex items-center space-x-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold px-8 py-4 rounded-xl shadow-lg transition transform hover:-translate-y-0.5 text-lg"
          >
            <GoogleIcon />
            <span>Masuk dengan Google</span>
          </button>
        </section>

        {/* Feature Cards */}
        <section className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          <div className="bg-slate-800/50 border border-slate-700/50 p-8 rounded-2xl">
            <div className="w-12 h-12 bg-indigo-600/20 border border-indigo-500/30 rounded-xl flex items-center justify-center mb-6 text-indigo-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Marking Buku Bacaan</h3>
            <p className="text-slate-400 leading-relaxed">
              Simpan daftar buku, atur status (Wishlist, Sedang Dibaca, Selesai), dan beri rating untuk setiap buku yang udah lu tamatin.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 p-8 rounded-2xl">
            <div className="w-12 h-12 bg-pink-600/20 border border-pink-500/30 rounded-xl flex items-center justify-center mb-6 text-pink-400">
              <Tv className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Marking Tontonan</h3>
            <p className="text-slate-400 leading-relaxed">
              Catat film, anime, atau TV series. Lacak episode terakhir yang lu tonton biar nggak bingung pas mau maraton lagi.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-slate-500 text-sm">
        &copy; {new Date().getFullYear()} MarkIt App. Built with Next.js & Firebase.
      </footer>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
    </svg>
  );
}