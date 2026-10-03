"use client";
import { Button, Card, Input, Label } from "@/components/ui";
import { useToast } from "@/components/toast";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ShoppingBag, Store, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [accountType, setAccountType] = useState<"user" | "bisnis">("user");
  const [fullName, setFullName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) return toast("Supabase belum dikonfigurasi", "error");
    if (accountType === "bisnis" && !storeName.trim()) {
      return toast("Nama toko wajib diisi untuk akun bisnis", "error");
    }
    setLoading(true);
    const { error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          account_type: accountType,
          store_name: accountType === "bisnis" ? storeName : undefined,
        },
      },
    });
    setLoading(false);
    if (error) return toast("Registrasi gagal: " + error.message, "error");
    toast("Akun berhasil dibuat! Silakan masuk.");
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 text-xl font-bold">
          <Store className="h-7 w-7 text-primary" /> ERP Mini
        </Link>
        <h1 className="mb-4 text-center text-lg font-semibold">Buat Akun Baru</h1>

        {/* Pilih tipe akun */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAccountType("user")}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition",
              accountType === "user" ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
            )}
          >
            <UserRound className="h-7 w-7 text-primary" />
            <span className="font-semibold">User</span>
            <span className="text-center text-xs text-muted-foreground">
              Belanja, chat penjual, kasih rating
            </span>
          </button>
          <button
            type="button"
            onClick={() => setAccountType("bisnis")}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition",
              accountType === "bisnis" ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
            )}
          >
            <ShoppingBag className="h-7 w-7 text-primary" />
            <span className="font-semibold">Bisnis</span>
            <span className="text-center text-xs text-muted-foreground">
              Semua fitur: POS, stok, keuangan
            </span>
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nama Lengkap</Label>
            <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nama Anda" />
          </div>
          {accountType === "bisnis" && (
            <div>
              <Label htmlFor="store">Nama Toko / Usaha</Label>
              <Input id="store" required value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Toko Berkah Jaya" />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" />
          </div>
          <Button type="submit" className="w-full" loading={loading}>
            Daftar sebagai {accountType === "user" ? "User" : "Bisnis"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Masuk
          </Link>
        </p>
      </Card>
    </div>
  );
}
