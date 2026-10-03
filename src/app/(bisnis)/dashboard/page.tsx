"use client";
import { useProfile } from "@/components/profile-ctx";
import { Badge, Card, EmptyState, Spinner, TableWrap, Td, Th } from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";
import type { Product, Purchase, Sale } from "@/lib/types";
import { formatNumber, formatRupiah } from "@/lib/utils";
import { AlertTriangle, TrendingUp, Wallet, Boxes } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export default function DashboardPage() {
  const profile = useProfile();
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const sb = getSupabase();

  const load = useCallback(async () => {
    if (!profile?.store_id) return;
    const since = new Date();
    since.setDate(since.getDate() - 60);
    const [{ data: s }, { data: p }, { data: pr }] = await Promise.all([
      sb.from("sales").select("*, sales_items(*, products(name))")
        .eq("store_id", profile.store_id).neq("status", "batal")
        .gte("created_at", since.toISOString()).order("created_at", { ascending: false }),
      sb.from("purchases").select("*").eq("store_id", profile.store_id)
        .neq("status", "batal").gte("created_at", since.toISOString()),
      sb.from("products").select("*").eq("store_id", profile.store_id).eq("is_active", true),
    ]);
    setSales((s as Sale[]) ?? []);
    setPurchases((p as Purchase[]) ?? []);
    setProducts((pr as Product[]) ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.store_id]);

  useEffect(() => { load(); }, [load]);

  if (!sales) return <Spinner />;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfDay - 6 * 86400000;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const omset = (sinceMs: number) =>
    sales.filter((s) => new Date(s.created_at).getTime() >= sinceMs)
      .reduce((a, s) => a + s.grand_total, 0);

  const labaKotor = sales.reduce(
    (a, s) => a + (s.sales_items ?? []).reduce((x, it) => x + it.qty * (it.price - it.buy_price) - it.discount, 0) - s.discount,
    0
  );

  // grafik 14 hari
  const chart: { tgl: string; Penjualan: number; Pembelian: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(startOfDay - i * 86400000);
    const next = d.getTime() + 86400000;
    chart.push({
      tgl: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
      Penjualan: sales.filter((s) => {
        const t = new Date(s.created_at).getTime();
        return t >= d.getTime() && t < next;
      }).reduce((a, s) => a + s.grand_total, 0),
      Pembelian: purchases.filter((p) => {
        const t = new Date(p.created_at).getTime();
        return t >= d.getTime() && t < next;
      }).reduce((a, p) => a + p.total, 0),
    });
  }

  // top & dead products
  const qtyByProduct = new Map<string, { name: string; qty: number; laba: number }>();
  sales.forEach((s) =>
    (s.sales_items ?? []).forEach((it) => {
      const cur = qtyByProduct.get(it.product_id) ?? { name: it.products?.name ?? "?", qty: 0, laba: 0 };
      cur.qty += it.qty;
      cur.laba += it.qty * (it.price - it.buy_price) - it.discount;
      qtyByProduct.set(it.product_id, cur);
    })
  );
  const top5 = [...qtyByProduct.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  const dead = products.filter((p) => !qtyByProduct.has(p.id)).slice(0, 5);
  const lowStock = products.filter((p) => p.stock <= p.min_stock);
  const nilaiStok = products.reduce((a, p) => a + p.stock * p.buy_price, 0);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Dashboard</h1>

      {/* Kartu metrik */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" /> Omset Hari Ini</p>
          <p className="mt-1 text-xl font-bold text-primary">{formatRupiah(omset(startOfDay))}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Minggu ini: {formatRupiah(omset(startOfWeek))} · Bulan ini: {formatRupiah(omset(startOfMonth))}
          </p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Wallet className="h-3.5 w-3.5" /> Laba Kotor (60 hari)</p>
          <p className="mt-1 text-xl font-bold text-green-600">{formatRupiah(labaKotor)}</p>
          <Link href="/keuangan" className="mt-1 block text-xs text-primary hover:underline">Lihat Laba Rugi →</Link>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Boxes className="h-3.5 w-3.5" /> Nilai Aset Stok</p>
          <p className="mt-1 text-xl font-bold">{formatRupiah(nilaiStok)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{products.length} produk aktif</p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5" /> Stok Menipis</p>
          <p className="mt-1 text-xl font-bold text-red-600">{lowStock.length} produk</p>
          <Link href="/stok" className="mt-1 block text-xs text-primary hover:underline">Cek stok →</Link>
        </Card>
      </div>

      {/* Grafik */}
      <Card className="mb-4 p-4">
        <h2 className="mb-3 font-semibold">Penjualan vs Pembelian (14 hari)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="tgl" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => (v >= 1_000_000 ? `${v / 1_000_000}jt` : v >= 1000 ? `${v / 1000}rb` : v)} />
              <Tooltip formatter={(v) => formatRupiah(Number(v))} />
              <Legend />
              <Bar dataKey="Penjualan" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Pembelian" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top 5 */}
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">🏆 Top 5 Barang Terlaris (60 hari)</h2>
          {top5.length === 0 ? (
            <EmptyState title="Belum ada penjualan" />
          ) : (
            <div className="space-y-2">
              {top5.map((t, i) => (
                <div key={t.name} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.name}</span>
                  <Badge color="green">{formatNumber(t.qty)} terjual</Badge>
                  <span className="text-sm font-semibold">{formatRupiah(t.laba)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Barang mati */}
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">💤 Barang Mati (tidak laku 60 hari)</h2>
          {dead.length === 0 ? (
            <EmptyState title="Semua produk ada perputaran" />
          ) : (
            <TableWrap>
              <thead><tr className="border-b"><Th>Produk</Th><Th>Stok</Th><Th>Nilai</Th></tr></thead>
              <tbody>
                {dead.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <Td className="font-medium">{p.name}</Td>
                    <Td>{formatNumber(p.stock)}</Td>
                    <Td>{formatRupiah(p.stock * p.buy_price)}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      </div>
    </div>
  );
}
