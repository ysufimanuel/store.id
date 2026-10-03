"use client";
import { Navbar } from "@/components/navbar";
import { SetupNotice } from "@/components/setup-notice";
import { Card, EmptyState, Input, Spinner } from "@/components/ui";
import { useCart } from "@/components/cart";
import { useToast } from "@/components/toast";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";
import { Package, Search, Star, Store } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function HomePage() {
  const { add } = useCart();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabase();
    sb.from("products")
      .select("*, stores(name)")
      .eq("is_active", true)
      .gt("stock", 0)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(async ({ data }) => {
        const rows = (data as Product[]) ?? [];
        setProducts(rows);
        if (rows.length) {
          const { data: r } = await sb
            .from("ratings")
            .select("product_id, rating")
            .in("product_id", rows.map((p) => p.id));
          const agg: Record<string, { sum: number; count: number }> = {};
          (r ?? []).forEach((x) => {
            agg[x.product_id] ??= { sum: 0, count: 0 };
            agg[x.product_id].sum += x.rating;
            agg[x.product_id].count += 1;
          });
          const out: Record<string, { avg: number; count: number }> = {};
          Object.entries(agg).forEach(([k, v]) => (out[k] = { avg: v.sum / v.count, count: v.count }));
          setRatings(out);
        }
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())),
    [products, q]
  );

  if (!isSupabaseConfigured) return <SetupNotice />;

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold">Katalog Produk</h1>
            <p className="text-sm text-muted-foreground">Belanja langsung dari toko-toko terdaftar</p>
          </div>
          <div className="relative flex-1 sm:max-w-sm sm:ml-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Cari barang..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState title="Belum ada produk" hint="Produk yang dijual toko akan tampil di sini" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((p) => (
              <Card key={p.id} className="flex flex-col overflow-hidden transition hover:shadow-md">
                <Link href={`/produk/${p.id}`}>
                  <div className="flex aspect-square items-center justify-center bg-muted">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-12 w-12 text-muted-foreground/40" />
                    )}
                  </div>
                </Link>
                <div className="flex flex-1 flex-col p-3">
                  <Link href={`/produk/${p.id}`} className="line-clamp-2 text-sm font-medium hover:underline">
                    {p.name}
                  </Link>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Store className="h-3 w-3" />
                    <span className="truncate">{p.stores?.name}</span>
                  </div>
                  {ratings[p.id] && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-yellow-500">
                      <Star className="h-3 w-3 fill-yellow-500" />
                      {ratings[p.id].avg.toFixed(1)}
                      <span className="text-muted-foreground">({ratings[p.id].count})</span>
                    </div>
                  )}
                  <div className="mt-2 flex-1" />
                  <p className="font-bold text-primary">{formatRupiah(p.sell_price)}</p>
                  <button
                    onClick={() => {
                      add({ product_id: p.id, name: p.name, price: p.sell_price, stock: p.stock, store_id: p.store_id, image_url: p.image_url });
                      toast("Ditambahkan ke keranjang");
                    }}
                    className="mt-2 min-h-[44px] rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    + Keranjang
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
