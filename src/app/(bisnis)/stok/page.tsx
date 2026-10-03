"use client";
import { useProfile } from "@/components/profile-ctx";
import { useToast } from "@/components/toast";
import {
  Badge, Button, Card, EmptyState, Input, Label, Modal, Select, Spinner, TableWrap, Td, Textarea, Th,
} from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";
import type { Product, StockMovement } from "@/lib/types";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { AlertTriangle, ClipboardCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const TYPE_LABEL: Record<string, string> = {
  sale: "Penjualan", purchase: "Pembelian", opname: "Opname", return: "Retur", cancel: "Batal",
};
const TYPE_COLOR: Record<string, "green" | "blue" | "yellow" | "red" | "purple" | "gray"> = {
  sale: "red", purchase: "green", opname: "yellow", return: "purple", cancel: "blue",
};

export default function StokPage() {
  const profile = useProfile();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [filterProduct, setFilterProduct] = useState("");
  const [opnameOpen, setOpnameOpen] = useState(false);
  const [opnameProduct, setOpnameProduct] = useState<Product | null>(null);
  const [newStock, setNewStock] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const sb = getSupabase();
  const canOpname = profile?.role === "owner" || profile?.role === "admin";

  const load = useCallback(async () => {
    if (!profile?.store_id) return;
    const [{ data: p }, { data: m }] = await Promise.all([
      sb.from("products").select("*").eq("store_id", profile.store_id).order("name"),
      sb.from("stock_movements").select("*, products(name, sku, rack), profiles(full_name)")
        .eq("store_id", profile.store_id).order("created_at", { ascending: false }).limit(300),
    ]);
    setProducts((p as Product[]) ?? []);
    setMovements((m as StockMovement[]) ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.store_id]);

  useEffect(() => { load(); }, [load]);

  const lowStock = (products ?? []).filter((p) => p.is_active && p.stock <= p.min_stock);
  const shown = filterProduct ? movements.filter((m) => m.product_id === filterProduct) : movements;

  const doOpname = async () => {
    if (!opnameProduct) return;
    setSaving(true);
    const { error } = await sb.rpc("adjust_stock", {
      p_product_id: opnameProduct.id, p_new_stock: newStock, p_note: note,
    });
    setSaving(false);
    if (error) return toast("Gagal: " + error.message, "error");
    toast("Stok disesuaikan & jurnal penyesuaian dibuat");
    setOpnameOpen(false);
    setNote("");
    load();
  };

  if (!products) return <Spinner />;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Stok & Logistik</h1>

      {lowStock.length > 0 && (
        <Card className="mb-4 border-yellow-400 bg-yellow-50 p-4 dark:bg-yellow-900/20">
          <p className="flex items-center gap-2 font-medium text-yellow-700 dark:text-yellow-300">
            <AlertTriangle className="h-5 w-5" /> {lowStock.length} produk stoknya menipis
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {lowStock.map((p) => (
              <Badge key={p.id} color="yellow">{p.name}: sisa {formatNumber(p.stock)}</Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Ringkasan stok + rak */}
      <Card className="mb-4 overflow-x-auto p-0">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b">
              <Th>Produk</Th><Th>Rak</Th><Th>Stok</Th><Th>Min</Th>{canOpname && <Th></Th>}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <Td className="font-medium">{p.name} <span className="text-xs text-muted-foreground">({p.sku})</span></Td>
                <Td>{p.rack ? <Badge color="blue">{p.rack}</Badge> : "-"}</Td>
                <Td>
                  <Badge color={p.stock <= p.min_stock ? "red" : "green"}>{formatNumber(p.stock)}</Badge>
                </Td>
                <Td>{formatNumber(p.min_stock)}</Td>
                {canOpname && (
                  <Td>
                    <Button size="sm" variant="outline"
                      onClick={() => { setOpnameProduct(p); setNewStock(p.stock); setOpnameOpen(true); }}>
                      <ClipboardCheck className="h-3.5 w-3.5" /> Opname
                    </Button>
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Kartu stok */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Kartu Stok</h2>
        <Select className="w-64" value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}>
          <option value="">Semua produk</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      {shown.length === 0 ? (
        <Card><EmptyState title="Belum ada pergerakan stok" /></Card>
      ) : (
        <TableWrap>
          <thead>
            <tr className="border-b">
              <Th>Waktu</Th><Th>Produk</Th><Th>Tipe</Th><Th>Qty</Th><Th>Sebelum</Th><Th>Sesudah</Th><Th>Ket.</Th><Th>Oleh</Th>
            </tr>
          </thead>
          <tbody>
            {shown.map((m) => (
              <tr key={m.id} className="border-b last:border-0">
                <Td className="whitespace-nowrap text-xs">{formatDateTime(m.created_at)}</Td>
                <Td className="font-medium">{m.products?.name}</Td>
                <Td><Badge color={TYPE_COLOR[m.type]}>{TYPE_LABEL[m.type]}</Badge></Td>
                <Td className={m.qty >= 0 ? "text-green-600" : "text-red-600"}>
                  {m.qty > 0 ? "+" : ""}{formatNumber(m.qty)}
                </Td>
                <Td>{formatNumber(m.stock_before)}</Td>
                <Td>{formatNumber(m.stock_after)}</Td>
                <Td className="max-w-48 truncate text-xs text-muted-foreground">{m.note}</Td>
                <Td className="text-xs">{m.profiles?.full_name ?? "-"}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {/* Modal opname */}
      <Modal open={opnameOpen} onClose={() => setOpnameOpen(false)} title={`Stok Opname — ${opnameProduct?.name ?? ""}`}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Stok sistem: <b>{formatNumber(opnameProduct?.stock)}</b>. Masukkan jumlah fisik sebenarnya.
          </p>
          <div>
            <Label>Stok Fisik</Label>
            <Input type="number" min={0} value={newStock} onChange={(e) => setNewStock(Number(e.target.value))} />
          </div>
          <div>
            <Label>Alasan (hilang/rusak/koreksi...)</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {opnameProduct && newStock !== opnameProduct.stock && (
            <p className="text-sm">
              Selisih:{" "}
              <b className={newStock > opnameProduct.stock ? "text-green-600" : "text-red-600"}>
                {newStock > opnameProduct.stock ? "+" : ""}{formatNumber(newStock - opnameProduct.stock)}
              </b>
            </p>
          )}
          <Button className="w-full" onClick={doOpname} loading={saving}>Simpan Penyesuaian</Button>
        </div>
      </Modal>
    </div>
  );
}
