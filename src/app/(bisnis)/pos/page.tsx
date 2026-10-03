"use client";
import { useProfile } from "@/components/profile-ctx";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, Input, Modal, Select } from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";
import type { CartItem, Customer, Product, Sale } from "@/lib/types";
import { formatDateTime, formatRupiah, PAYMENT_LABEL } from "@/lib/utils";
import { Banknote, Package, Printer, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function PosPage() {
  const profile = useProfile();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [q, setQ] = useState("");
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [payment, setPayment] = useState<"cash" | "transfer" | "tempo">("cash");
  const [customerId, setCustomerId] = useState<string>("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<Sale | null>(null);

  const sb = getSupabase();

  const loadProducts = async () => {
    if (!profile?.store_id) return;
    const { data } = await sb
      .from("products").select("*")
      .eq("store_id", profile.store_id).eq("is_active", true)
      .order("name");
    setProducts((data as Product[]) ?? []);
  };

  useEffect(() => {
    if (!profile?.store_id) return;
    loadProducts();
    sb.from("customers").select("*").eq("store_id", profile.store_id).order("name")
      .then(({ data }) => setCustomers((data as Customer[]) ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.store_id]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s) || p.barcode.toLowerCase() === s
    );
  }, [products, q]);

  // Enter di search = barcode scan: langsung tambah kalau SKU/barcode persis cocok
  const onSearchEnter = () => {
    const exact = products.find(
      (p) => p.barcode.toLowerCase() === q.toLowerCase() || p.sku.toLowerCase() === q.toLowerCase()
    );
    if (exact) {
      addToCart(exact);
      setQ("");
    }
  };

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const found = prev.find((c) => c.product_id === p.id);
      if (found) {
        if (found.qty + 1 > p.stock) {
          toast(`Stok ${p.name} tidak cukup`, "error");
          return prev;
        }
        return prev.map((c) => (c.product_id === p.id ? { ...c, qty: c.qty + 1 } : c));
      }
      if (p.stock <= 0) {
        toast(`Stok ${p.name} habis`, "error");
        return prev;
      }
      return [...prev, { product_id: p.id, name: p.name, price: p.sell_price, qty: 1, discount: 0, stock: p.stock }];
    });
  };

  const setQty = (id: string, qty: number) =>
    setCart((prev) => prev.map((c) => (c.product_id === id ? { ...c, qty: Math.max(1, Math.min(qty, c.stock)) } : c)));
  const setItemDisc = (id: string, d: number) =>
    setCart((prev) => prev.map((c) => (c.product_id === id ? { ...c, discount: Math.max(0, d) } : c)));
  const removeItem = (id: string) => setCart((prev) => prev.filter((c) => c.product_id !== id));

  const subtotal = cart.reduce((a, c) => a + c.qty * c.price - c.discount, 0);
  const total = Math.max(subtotal - globalDiscount, 0);

  const checkout = async () => {
    setLoading(true);
    const { data, error } = await sb.rpc("create_sale", {
      p_items: cart.map((c) => ({ product_id: c.product_id, qty: c.qty, price: c.price, discount: c.discount })),
      p_payment_method: payment,
      p_discount: globalDiscount,
      p_customer_id: customerId || null,
    });
    if (error) {
      setLoading(false);
      return toast("Transaksi gagal: " + error.message, "error");
    }
    const { data: sale } = await sb
      .from("sales").select("*, sales_items(*, products(name, sku))")
      .eq("id", data).single();
    setReceipt(sale as Sale);
    setCart([]);
    setGlobalDiscount(0);
    setCheckoutOpen(false);
    setLoading(false);
    toast("Transaksi berhasil — stok & jurnal otomatis tercatat");
    loadProducts();
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">Kasir / POS</h1>
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Ketik nama / scan barcode / SKU, lalu Enter"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearchEnter()}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Katalog */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              disabled={p.stock <= 0}
              className="flex flex-col rounded-xl border bg-card p-3 text-left transition hover:shadow-md disabled:opacity-50"
            >
              <div className="mb-2 flex h-16 items-center justify-center rounded-lg bg-muted">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.name} className="h-full w-full rounded-lg object-cover" />
                ) : (
                  <Package className="h-7 w-7 text-muted-foreground/40" />
                )}
              </div>
              <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
              <p className="mt-1 text-sm font-bold text-primary">{formatRupiah(p.sell_price)}</p>
              <div className="mt-1 flex items-center gap-1">
                <Badge color={p.stock <= p.min_stock ? "red" : "gray"}>Stok {p.stock}</Badge>
                {p.rack && <Badge color="blue">Rak {p.rack}</Badge>}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
              Tidak ada produk cocok. Tambah produk dulu di menu Produk.
            </p>
          )}
        </div>

        {/* Keranjang */}
        <Card className="flex h-fit flex-col p-4 lg:sticky lg:top-4">
          <h2 className="mb-3 font-semibold">Keranjang ({cart.length})</h2>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {cart.map((c) => (
              <div key={c.product_id} className="rounded-lg border p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</p>
                  <button onClick={() => removeItem(c.product_id)} className="p-1 text-destructive" aria-label="Hapus">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number" min={1} max={c.stock} value={c.qty}
                    onChange={(e) => setQty(c.product_id, Number(e.target.value))}
                    className="h-9 w-16 rounded-lg border bg-background px-2 text-center text-sm"
                    aria-label="Qty"
                  />
                  <span className="text-xs text-muted-foreground">×</span>
                  <span className="text-sm">{formatRupiah(c.price)}</span>
                  <input
                    type="number" min={0} value={c.discount}
                    onChange={(e) => setItemDisc(c.product_id, Number(e.target.value))}
                    placeholder="Diskon"
                    className="h-9 w-20 rounded-lg border bg-background px-2 text-right text-xs"
                    aria-label="Diskon item"
                  />
                </div>
                <p className="mt-1 text-right text-sm font-semibold">
                  {formatRupiah(c.qty * c.price - c.discount)}
                </p>
              </div>
            ))}
            {cart.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Klik produk untuk menambahkan</p>
            )}
          </div>

          <div className="mt-3 space-y-2 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Diskon Global</span>
              <input
                type="number" min={0} value={globalDiscount}
                onChange={(e) => setGlobalDiscount(Math.max(0, Number(e.target.value)))}
                className="h-9 w-28 rounded-lg border bg-background px-2 text-right text-sm"
                aria-label="Diskon global"
              />
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">{formatRupiah(total)}</span>
            </div>
          </div>

          <Button className="mt-3 w-full" size="lg" disabled={cart.length === 0} onClick={() => setCheckoutOpen(true)}>
            <Banknote className="h-4 w-4" /> Bayar
          </Button>
        </Card>
      </div>

      {/* Modal pembayaran */}
      <Modal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Pembayaran">
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-sm font-medium">Metode Bayar</p>
            <div className="grid grid-cols-3 gap-2">
              {(["cash", "transfer", "tempo"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPayment(m)}
                  className={
                    "min-h-[44px] rounded-lg border-2 px-2 text-sm font-medium " +
                    (payment === m ? "border-primary bg-primary/5" : "border-border")
                  }
                >
                  {PAYMENT_LABEL[m]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Pelanggan {payment === "tempo" && "(wajib untuk tempo)"}</p>
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— Umum / tanpa nama —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted p-3">
            <span className="font-medium">Total Bayar</span>
            <span className="text-xl font-bold text-primary">{formatRupiah(total)}</span>
          </div>
          <Button
            className="w-full" size="lg" loading={loading}
            disabled={payment === "tempo" && !customerId}
            onClick={checkout}
          >
            Proses Transaksi
          </Button>
          {payment === "tempo" && (
            <p className="text-xs text-muted-foreground">
              Penjualan tempo otomatis masuk daftar Piutang dan bisa dicicil di menu Penjualan & Piutang.
            </p>
          )}
        </div>
      </Modal>

      {/* Struk */}
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Struk Transaksi">
        {receipt && (
          <div>
            <div id="struk-print" className="rounded-lg border p-4 font-mono text-sm">
              <p className="text-center font-bold">{receipt.invoice_no}</p>
              <p className="text-center text-xs text-muted-foreground">{formatDateTime(receipt.created_at)}</p>
              <div className="my-2 border-t border-dashed" />
              {receipt.sales_items?.map((it) => (
                <div key={it.id} className="flex justify-between">
                  <span>{it.products?.name} ×{it.qty}</span>
                  <span>{formatRupiah(it.qty * it.price - it.discount)}</span>
                </div>
              ))}
              <div className="my-2 border-t border-dashed" />
              <div className="flex justify-between"><span>Subtotal</span><span>{formatRupiah(receipt.subtotal)}</span></div>
              <div className="flex justify-between"><span>Diskon</span><span>-{formatRupiah(receipt.discount)}</span></div>
              <div className="flex justify-between font-bold"><span>Total</span><span>{formatRupiah(receipt.grand_total)}</span></div>
              <div className="flex justify-between text-xs">
                <span>Metode</span><span>{PAYMENT_LABEL[receipt.payment_method]}</span>
              </div>
              <p className="mt-2 text-center text-xs">— Terima kasih —</p>
            </div>
            <Button className="mt-3 w-full" variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print Struk
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
