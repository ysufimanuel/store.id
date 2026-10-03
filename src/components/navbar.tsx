"use client";
import { ThemeToggle } from "@/components/theme";
import { useCart } from "@/components/cart";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { LayoutDashboard, LogOut, MessageCircle, ShoppingCart, Store, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function Navbar() {
  const { count } = useCart();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabase();
    sb.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      sb.from("profiles").select("*").eq("id", data.user.id).single()
        .then(({ data: p }) => setProfile(p as Profile | null));
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      if (!session) setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await getSupabase().auth.signOut();
    setProfile(null);
    router.push("/");
    router.refresh();
  };

  const isBusiness = profile && profile.role !== "user";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Store className="h-6 w-6 text-primary" />
          <span className="hidden sm:inline">ERP Mini</span>
        </Link>
        <div className="flex-1" />
        {isBusiness && (
          <Link
            href="/dashboard"
            className="flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm font-medium hover:bg-accent"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard Bisnis</span>
          </Link>
        )}
        {profile && !isBusiness && (
          <Link
            href="/pesanan-saya"
            className="hidden min-h-[44px] items-center rounded-lg px-3 text-sm font-medium hover:bg-accent sm:flex"
          >
            Pesanan Saya
          </Link>
        )}
        {profile && (
          <Link
            href="/chat"
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent"
            aria-label="Chat"
          >
            <MessageCircle className="h-5 w-5" />
          </Link>
        )}
        <Link href="/keranjang" className="relative flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent" aria-label="Keranjang">
          <ShoppingCart className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Link>
        <ThemeToggle />
        {profile ? (
          <div className="flex items-center gap-1">
            <span className="hidden max-w-28 truncate text-sm text-muted-foreground md:inline">
              {profile.full_name}
            </span>
            <button onClick={logout} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent" aria-label="Keluar">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            <UserRound className="h-4 w-4" />
            Masuk
          </Link>
        )}
      </div>
    </header>
  );
}
