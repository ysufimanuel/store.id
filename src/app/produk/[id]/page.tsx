"use client";
import { Navbar } from "@/components/navbar";
import { SetupNotice } from "@/components/setup-notice";
import { Badge, Button, Card, EmptyState, Spinner, Textarea } from "@/components/ui";
import { useCart } from "@/components/cart";
import { useToast } from "@/components/toast";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Product, Rating } from "@/lib/types";
import { formatDate, formatRupiah } from "@/lib/utils";
import { MessageCircle, Minus, Package, Plus, Star, Store } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { add } = useCart();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [myRating, setMyRating] = useState(5);
  const [myReview, setMyReview] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    const [{ data: p }, { data: r }, { data: u }] = await Promise.all([
      sb.from("products").select("*, stores(name)").eq("id", id).single(),
      sb.from("ratings").select("*, profiles(full_name)").eq("product_id", id).order("created_at", { ascending: false }),
      sb.auth.getUser(),
    ]);
    setProduct(p as Product | null);
    setRatings((r as Rating[]) ?? []);
    setUserId(u.user?.id ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (isSupabaseConfigured) load();
  }, [load]);

  const submitRating = async () => {
    if (!userId) return toast("Masuk dulu untuk memberi rating", "error");
    setSending(true);
    const { error } = await getSupabase().from("ratings").upsert({
      product_id: id, user_id: userId, rating: myRating, review: myReview,
    });
    setSending(false);
    if (error) return toast("Gagal: " + error.message, "error");
    toast("Rating tersimpan");
    setMyReview("");
    load();
  };

  const chatSeller = async () => {
    if (!userId) return toast("Masuk dulu untuk chat penjual", "error");
    router.push(`/chat?store=${product?.store_id}`);
  };

  if (!isSupabaseConfigured) return <SetupNotice />;
  if (loading)
    return (
      <div><Navbar /><Spinner /></div>
    );
  if (!product)
    return (
      <div><Navbar /><EmptyState title="Produk tidak ditemukan" /></div>
    );

  const avg = ratings.length ? ratings.reduce((a, b) => a + b.rating, 0) / ratings.length : 0;

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex aspect-square items-center justify-center rounded-xl bg-muted">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image_url} alt={product.name} className="h-full w-full rounded-xl object-cover" />
            ) : (
              <Package className="h-24 w-24 text-muted-foreground/40" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Store className="h-4 w-4" /> {product.stores?.name}
              {ratings.length > 0 && (
                <>
                  <span>·</span>
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  {avg.toFixed(1)} ({ratings.length} ulasan)
                </>
              )}
            </div>
            <p className="mt-4 text-3xl font-bold text-primary">{formatRupiah(product.sell_price)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Stok: {product.stock > 0 ? `${product.stock} tersedia` : "Habis"}
            </p>
            {product.description && <p className="mt-4 whitespace-pre-wrap text-sm">{product.description}</p>}

            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center rounded-lg border">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-11 w-11 items-center justify-center" aria-label="Kurangi">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center font-medium">{qty}</span>
                <button onClick={() => setQty(Math.min(product.stock, qty + 1))} className="flex h-11 w-11 items-center justify-center" aria-label="Tambah">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <Button
                className="flex-1"
                disabled={product.stock <= 0}
                onClick={() => {
                  add({ product_id: product.id, name: product.name, price: product.sell_price, stock: product.stock, store_id: product.store_id, image_url: product.image_url }, qty);
                  toast("Ditambahkan ke keranjang");
                }}
              >
                + Keranjang
              </Button>
              <Button variant="outline" onClick={chatSeller} aria-label="Chat penjual">
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Rating & ulasan */}
        <Card className="mt-8 p-5">
          <h2 className="mb-4 text-lg font-semibold">Ulasan Pembeli</h2>
          {userId && (
            <div className="mb-5 rounded-lg border p-4">
              <p className="mb-2 text-sm font-medium">Beri rating produk ini</p>
              <div className="mb-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setMyRating(n)} className="p-1" aria-label={`Rating ${n}`}>
                    <Star className={n <= myRating ? "h-6 w-6 fill-yellow-500 text-yellow-500" : "h-6 w-6 text-muted-foreground/40"} />
                  </button>
                ))}
              </div>
              <Textarea rows={2} placeholder="Tulis ulasan (opsional)..." value={myReview} onChange={(e) => setMyReview(e.target.value)} />
              <Button className="mt-2" size="sm" onClick={submitRating} loading={sending}>
                Kirim Ulasan
              </Button>
            </div>
          )}
          {ratings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada ulasan.</p>
          ) : (
            <div className="space-y-4">
              {ratings.map((r) => (
                <div key={r.id} className="border-b pb-3 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{r.profiles?.full_name ?? "Pembeli"}</span>
                    <Badge color="yellow" className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current" /> {r.rating}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                  </div>
                  {r.review && <p className="mt-1 text-sm">{r.review}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
