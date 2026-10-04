"use client";
import { Button, Card, Input, Label } from "@/components/ui";
import { useToast } from "@/components/toast";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { Store } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) return toast("Supabase belum dikonfigurasi", "error");
    setLoading(true);
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      if (error.code === "email_not_confirmed") {
        return toast(
          "Email belum diverifikasi 📧 Cek inbox/spam dan klik link verifikasi dari Supabase sebelum login.",
          "error"
        );
      }
      return toast("Login gagal: " + error.message, "error");
    }
    const { data: p } = await getSupabase()
      .from("profiles").select("role").eq("id", data.user.id).single();
    toast("Berhasil masuk");
    const next = params.get("next");
    router.push(next || (p && p.role !== "user" ? "/dashboard" : "/"));
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 text-xl font-bold">
          <Store className="h-7 w-7 text-primary" /> ERP Mini
        </Link>
        <h1 className="mb-4 text-center text-lg font-semibold">Masuk ke Akun</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full" loading={loading}>
            Masuk
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Belum punya akun?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Daftar sekarang
          </Link>
        </p>
        <p className="mt-2 text-center text-sm">
          <Link href="/" className="text-muted-foreground hover:underline">
            ← Kembali ke toko
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
