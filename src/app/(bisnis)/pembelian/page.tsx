"use client";
import { useProfile } from "@/components/profile-ctx";
import { useToast } from "@/components/toast";
import {
  Badge, Button, Card, EmptyState, Input, Label, Modal, Select, Spinner, TableWrap, Td, Th,
} from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";
import type { Product, Purchase, Supplier } from "@/lib/types";
import { formatDateTime, formatNumber, formatRupiah, PAYMENT_LABEL, STATUS_LABEL } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type PoItem = { product_id: string; qty: number; price: number };

const STATUS_COLOR: Record<string, "green" | "yellow" | "red"> = {
  lunas: "green", sebagian: "yellow", belum_lunas: "red",
};

export default function PembelianPage() {
  const profile = useProfile();
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PoItem[]>([{ product_id: "", qty: 1, price: 0 }]);
  const [supplierId, setSupplierId] = useState("");
  const [payment, setPayment] = useState<"cash" | "transfer" | "tempo">("cash");
  const [newSupplier, setNewSupplier] = useState("");
  const [saving, setSaving] = useState(false);
  const [payTarget, setPayTarget] = useState<Purchase | null>(null);
  const [payAmount, setPayAmount] = useState(0);

  const sb = getSupabase();

  const load = useCallback(async () => {
    if (!profile?.store_id) return;
    const [{ data: po }, { data: p }, { data: s }] = await Promise.all([
      sb.from("purchases").select("*, suppliers(name), purchase_items(*, products(name))")
        .eq("store_id", profile.store_id).order("created_at", { ascending: false }).limit(100),
      sb.from("products").select("*").eq("store_id", profile.store_id).eq("is_active", true).order("name"),
      sb.from("suppliers").select("*").eq("store_id", profile.store_id).order("name"),
    ]);
    setPurchases((po as Purchase[]) ?? []);
    setProducts((p as Product[]) ?? []);
    setSuppliers((s as Supplier[]) ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.store_id]);

  useEffect(() => { load(); }, [load]);

  const total = items.reduce((a, b) => a + b.qty * b.price, 0);

  const save = async () => {
    if (items.some((i) => !i.product_id || i.qty <= 0)) {
      return toast("Lengkapi item pembelian", "error");
    }
    setSaving(true);
    const { error } = await sb.rpc("create_purchase", {
      p_items: items.map((i) => ({ product_id: i.product_id, qty: i.qty, price: i.price })),
      p_supplier_id: supplierId || null,
      p_payment_method: payment,
    });
    setSaving(false);
    if (error) return toast("Gagal: " + error.message, "error");
    toast("Pembelian tersimpan — stok & HPP rata-rata otomatis diupdate");
    setOpen(false);
    setItems([{ product_id: "", qty: 1, price: 0 }]);
    load();
  };

  const addSupplier = async () => {
    if (!newSupplier.trim()) return;
    const { error } = await sb.from("suppliers").insert({ store_id: profile!.store_id, name: newSupplier.trim() });
    if (error) return toast("Gagal: " + error.message, "error");
    setNewSupplier("");
    load();
  };

  const payDebt = async () => {
    if (!payTarget || payAmount <= 0) return;
    setSaving(true);
    const { error } = await sb.rpc("pay_payable", { p_purchase_id: payTarget.id, p_amount: payAmount });
    setSaving(false);
    if (error) return toast("Gagal: " + error.message, "error");
    toast("Pembayaran hutang tercatat");
    setPayTarget(null);
    load();
  };

  if (!purchases) return <Spinner />;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">Pembelian & Supplier</h1>
        <div className="flex-1" />
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Input Pembelian</Button>
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <span className="text-sm font-medium">Supplier:</span>
        {suppliers.map((s) => <Badge key={s.id} color="blue">{s.name}</Badge>)}
        <Input className="h-9 w-40" placeholder="Supplier baru" value={newSupplier}
          onChange={(e) => setNewSupplier(e.target.value)} />
        <Button size="sm" variant="outline" onClick={addSupplier}>+ Tambah</Button>
      </Card>

      {purchases.length === 0 ? (
        <Card><EmptyState title="Belum ada pembelian" hint="Input restock barang dari supplier di sini" /></Card>
      ) : (
        <TableWrap>
          <thead>
            <tr className="border-b">
              <Th>No. PO</Th><Th>Waktu</Th><Th>Supplier</Th><Th>Item</Th><Th>Total</Th>
              <Th>Terbayar</Th><Th>Status</Th><Th></Th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((po) => (
              <tr key={po.id} className="border-b last:border-0">
                <Td className="font-mono text-xs">{po.po_no}</Td>
                <Td className="whitespace-nowrap text-xs">{formatDateTime(po.created_at)}</Td>
                <Td>{po.suppliers?.name ?? "-"}</Td>
                <Td className="text-xs">
                  {po.purchase_items?.map((it) => `${it.products?.name} ×${formatNumber(it.qty)}`).join(", ")}
                </Td>
                <Td>{formatRupiah(po.total)}</Td>
                <Td>{formatRupiah(po.paid_amount)}</Td>
                <Td>
                  <Badge color={STATUS_COLOR[po.status]}>{STATUS_LABEL[po.status]}</Badge>
                  {po.payment_method === "tempo" && (
                    <span className="ml-1 text-xs text-muted-foreground">({PAYMENT_LABEL[po.payment_method]})</span>
                  )}
                </Td>
                <Td>
                  {po.status !== "lunas" && (
                    <Button size="sm" variant="outline" onClick={() => { setPayTarget(po); setPayAmount(po.total - po.paid_amount); }}>
                      Bayar
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {/* Modal input pembelian */}
      <Modal open={open} onClose={() => setOpen(false)} title="Input Pembelian / Restock" wide>
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="flex flex-wrap items-end gap-2 rounded-lg border p-2">
              <div className="min-w-40 flex-1">
                <Label>Produk</Label>
                <Select value={it.product_id}
                  onChange={(e) => {
                    const prod = products.find((p) => p.id === e.target.value);
                    setItems(items.map((x, i) => i === idx ? { ...x, product_id: e.target.value, price: prod?.buy_price ?? x.price } : x));
                  }}>
                  <option value="">— Pilih —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (stok {formatNumber(p.stock)})</option>
                  ))}
                </Select>
              </div>
              <div className="w-20">
                <Label>Qty</Label>
                <Input type="number" min={1} value={it.qty}
                  onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, qty: Number(e.target.value) } : x))} />
              </div>
              <div className="w-32">
                <Label>Harga Beli</Label>
                <Input type="number" min={0} value={it.price}
                  onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, price: Number(e.target.value) } : x))} />
              </div>
              <button onClick={() => setItems(items.filter((_, i) => i !== idx))}
                className="mb-1 rounded-lg p-2 text-destructive hover:bg-accent" aria-label="Hapus item">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setItems([...items, { product_id: "", qty: 1, price: 0 }])}>
            <Plus className="h-4 w-4" /> Tambah Item
          </Button>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Supplier</Label>
              <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">— Tanpa supplier —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
            <div>
              <Label>Pembayaran</Label>
              <Select value={payment} onChange={(e) => setPayment(e.target.value as typeof payment)}>
                <option value="cash">Cash</option>
                <option value="transfer">Transfer</option>
                <option value="tempo">Hutang (Tempo)</option>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted p-3">
            <span className="font-medium">Total Pembelian</span>
            <span className="text-xl font-bold text-primary">{formatRupiah(total)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            HPP produk dihitung ulang otomatis (moving average) setelah pembelian disimpan.
          </p>
          <Button className="w-full" onClick={save} loading={saving}>Simpan Pembelian</Button>
        </div>
      </Modal>

      {/* Modal bayar hutang */}
      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title={`Bayar Hutang — ${payTarget?.po_no ?? ""}`}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sisa hutang: <b>{formatRupiah((payTarget?.total ?? 0) - (payTarget?.paid_amount ?? 0))}</b>
          </p>
          <div>
            <Label>Nominal Bayar</Label>
            <Input type="number" min={0} value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} />
          </div>
          <Button className="w-full" onClick={payDebt} loading={saving}>Catat Pembayaran</Button>
        </div>
      </Modal>
    </div>
  );
}
