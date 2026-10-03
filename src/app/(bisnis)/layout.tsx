"use client";
import { ProfileProvider } from "@/components/profile-ctx";
import { SetupNotice } from "@/components/setup-notice";
import { ThemeToggle } from "@/components/theme";
import { Spinner } from "@/components/ui";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Profile, Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ArrowLeftRight, Boxes, LayoutDashboard, LogOut, Menu,
  MessageCircle, PackageSearch, Settings, ShoppingBag,
  ShoppingCart, Store, Wallet, X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type MenuItem = { href: string; label: string; icon: React.ElementType; roles: Role[] };

const MENU: MenuItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["owner", "admin"] },
  { href: "/pos", label: "Kasir / POS", icon: ShoppingCart, roles: ["owner", "admin", "kasir"] },
  { href: "/pesanan", label: "Pesanan Online", icon: ShoppingBag, roles: ["owner", "admin", "kasir"] },
  { href: "/produk", label: "Produk", icon: Boxes, roles: ["owner", "admin", "kasir"] },
  { href: "/stok", label: "Stok & Logistik", icon: PackageSearch, roles: ["owner", "admin", "kasir"] },
  { href: "/pembelian", label: "Pembelian", icon: ArrowLeftRight, roles: ["owner", "admin"] },
  { href: "/penjualan", label: "Penjualan & Piutang", icon: Wallet, roles: ["owner", "admin", "kasir"] },
  { href: "/keuangan", label: "Keuangan", icon: Wallet, roles: ["owner", "admin"] },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings, roles: ["owner", "admin"] },
];

export default function BisnisLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const sb = getSupabase();
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace("/login?next=" + encodeURIComponent(pathname));
        return;
      }
      const { data: p } = await sb.from("profiles").select("*").eq("id", data.user.id).single();
      if (!p || p.role === "user" || !p.store_id) {
        router.replace("/");
        return;
      }
      setProfile(p as Profile);
      const { data: s } = await sb.from("stores").select("name").eq("id", p.store_id).single();
      if (s) setStoreName(s.name);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    await getSupabase().auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (!isSupabaseConfigured) return <SetupNotice />;
  if (loading || !profile) return <Spinner className="min-h-screen" />;

  const items = MENU.filter((m) => m.roles.includes(profile.role));

  const nav = (
    <nav className="flex flex-col gap-1">
      {items.map((m) => {
        const active = pathname.startsWith(m.href);
        return (
          <Link
            key={m.href}
            href={m.href}
            onClick={() => setMenuOpen(false)}
            className={cn(
              "flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium",
              active ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            )}
          >
            <m.icon className="h-4 w-4 shrink-0" />
            {m.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <ProfileProvider profile={profile}>
      <div className="flex min-h-screen">
        {/* Sidebar desktop */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card p-4 lg:flex">
          <Link href="/dashboard" className="mb-1 flex items-center gap-2 font-bold">
            <Store className="h-6 w-6 text-primary" />
            <span className="truncate">{storeName || "ERP Mini"}</span>
          </Link>
          <p className="mb-4 px-1 text-xs capitalize text-muted-foreground">
            {profile.full_name} · {profile.role}
          </p>
          {nav}
          <div className="mt-auto flex items-center justify-between">
            <Link href="/" className="text-sm text-muted-foreground hover:underline">
              ← Lihat Toko
            </Link>
            <div className="flex items-center">
              <ThemeToggle />
              <button onClick={logout} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent" aria-label="Keluar">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </aside>

        {/* Header mobile */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur lg:hidden">
            <button onClick={() => setMenuOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent" aria-label="Menu">
              <Menu className="h-5 w-5" />
            </button>
            <span className="truncate font-bold">{storeName || "ERP Mini"}</span>
            <div className="flex-1" />
            <Link href="/chat" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent" aria-label="Chat">
              <MessageCircle className="h-5 w-5" />
            </Link>
            <ThemeToggle />
          </div>

          {/* Drawer mobile */}
          {menuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
              <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-bold">{storeName}</span>
                  <button onClick={() => setMenuOpen(false)} className="rounded-lg p-2 hover:bg-accent" aria-label="Tutup menu">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="mb-3 px-1 text-xs capitalize text-muted-foreground">
                  {profile.full_name} · {profile.role}
                </p>
                {nav}
                <div className="mt-auto flex items-center justify-between">
                  <Link href="/" className="text-sm text-muted-foreground hover:underline" onClick={() => setMenuOpen(false)}>
                    ← Lihat Toko
                  </Link>
                  <button onClick={logout} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent" aria-label="Keluar">
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </aside>
            </div>
          )}

          <main className="flex-1 p-4 pb-safe lg:p-6">{children}</main>
        </div>
      </div>
    </ProfileProvider>
  );
}
