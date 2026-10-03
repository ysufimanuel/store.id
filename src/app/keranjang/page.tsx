"use client";
import { Navbar } from "@/components/navbar";
import { SetupNotice } from "@/components/setup-notice";
import { Button, Card, EmptyState, Textarea } from "@/components/ui";
import { useCart } from "@/components/cart";
import { useToast } from "@/components/toast";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/utils";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CartPage() {
  const { items, setQty, remove, clear } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured) return <SetupNotice />;

  const total = items.reduce((a, b) => a + b.qty * b.price, 0);

  const checkout = async () => {
    if (items.length === 0) return;
    const sb = getSupabase();
    const { data: u } = await sb.auth.getUser();
    if (!u.user) {
      toast("Silakan masuk dulu untuk checkout", "error");
      router.push("/login?next=/keranjang");
      return;
    }
    setLoading(true);
    // Satu order per toko
    const byStore = new Map<string, typeof items>();
    for (const it of items) {
      const sid = it.store_id ?? "";
      byStore.set(sid, [...(byStore.get(sid) ?? []), it]);
    }
    for (const [storeId, list] of byStore) {
      const { error } = await sb.rpc("create_online_order", {
        p_store_id: storeId,
        p_items: list.map((i) => ({ product_id: i.product_id, qty: i.qty })),
        p_note: note,
      });
      if (error) {
        setLoading(false);
        return toast("Checkout gagal: " + error.message, "error");
      }
    }
    setLoading(false);
    clear();
    toast("Pesanan dibuat! Toko akan mengonfirmasi pesananmu.");
    router.push("/pesanan-saya");
  };

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Keranjang Belanja</h1>
        {items.length === 0 ? (
          <Card>
            <EmptyState
              title="Keranjang kosong"
              hint="Yuk mulai belanja dari katalog"
            />
            <div className="flex justify-center pb-6">
              <Link href="/" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
                Lihat Katalog
              </Link>
            </div>
          </Card>
        ) : (
          <>
            <Card className="divide-y">
              {items.map((it) => (
                <div key={it.product_id} className="flex items-center gap-3 p-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                    {it.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" />
                    ) : (
                      <ShoppingCart className="h-6 w-6 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{it.name}</p>
                    <p className="text-sm text-primary">{formatRupiah(it.price)}</p>
                  </div>
                  <div className="flex items-center rounded-lg border">
                    <button onClick={() => setQty(it.product_id, it.qty - 1)} className="flex h-9 w-9 items-center justify-center" aria-label="Kurangi">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm">{it.qty}</span>
                    <button onClick={() => setQty(it.product_id, it.qty + 1)} className="flex h-9 w-9 items-center justify-center" aria-label="Tambah">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="w-24 text-right text-sm font-semibold">{formatRupiah(it.qty * it.price)}</p>
                  <button onClick={() => remove(it.product_id)} className="rounded-lg p-2 text-destructive hover:bg-accent" aria-label="Hapus">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </Card>

            <Card className="mt-4 p-4">
              <Textarea
                rows={2}
                placeholder="Catatan untuk penjual (opsional)..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-primary">{formatRupiah(total)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Pembayaran via transfer — penjual akan mengonfirmasi pesananmu.
              </p>
              <Button className="mt-3 w-full" size="lg" onClick={checkout} loading={loading}>
                Checkout ({items.length} barang)
              </Button>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
