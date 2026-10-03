"use client";
import { useProfile } from "@/components/profile-ctx";
import { useToast } from "@/components/toast";
import {
  Badge, Button, Card, EmptyState, Input, Label, Modal, Select, Spinner, TableWrap, Td, Textarea, Th,
} from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";
import type { Category, Product } from "@/lib/types";
import { formatNumber, formatRupiah, generateSku } from "@/lib/utils";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const EMPTY: Partial<Product> = {
  name: "", sku: "", barcode: "", rack: "", description: "", image_url: "",
  buy_price: 0, sell_price: 0, stock: 0, min_stock: 5, is_active: true, category_id: null,
};

export default function ProdukPage() {
  const profile = useProfile();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<Product>>(EMPTY);
  const [newCategory, setNewCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const sb = getSupabase();
  const canEdit = profile?.role === "owner" || profile?.role === "admin";
  const canDelete = profile?.role === "owner";

  const load = useCallback(async () => {
    if (!profile?.store_id) return;
    const [{ data: p }, { data: c }] = await Promise.all([
      sb.from("products").select("*, categories(name)").eq("store_id", profile.store_id).order("name"),
      sb.from("categories").select("*").eq("store_id", profile.store_id).order("name"),
    ]);
    setProducts((p as Product[]) ?? []);
    setCategories((c as Category[]) ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.store_id]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!edit.name?.trim()) return toast("Nama produk wajib diisi", "error");
    setSaving(true);
    const payload = {
      store_id: profile!.store_id,
      name: edit.name, sku: edit.sku || generateSku(edit.name),
      barcode: edit.barcode ?? "", rack: edit.rack ?? "",
      description: edit.description ?? "", image_url: edit.image_url ?? "",
      category_id: edit.category_id || null,
      buy_price: Number(edit.buy_price) || 0, sell_price: Number(edit.sell_price) || 0,
      min_stock: Number(edit.min_stock) || 0, is_active: edit.is_active ?? true,
    };
    let error;
    if (edit.id) {
      ({ error } = await sb.from("products").update(payload).eq("id", edit.id));
    } else {
      ({ error } = await sb.from("products").insert({ ...payload, stock: Number(edit.stock) || 0 }));
      if (!error && (Number(edit.stock) || 0) > 0) {
        // catat stok awal di kartu stok
        const { data: inserted } = await sb.from("products").select("id").eq("store_id", profile!.store_id)
          .eq("sku", payload.sku).single();
        if (inserted) {
          await sb.from("stock_movements").insert({
            store_id: profile!.store_id, product_id: inserted.id, type: "opname",
            qty: Number(edit.stock), stock_before: 0, stock_after: Number(edit.stock),
            note: "Stok awal produk baru", created_by: profile!.id,
          });
        }
      }
    }
    setSaving(false);
    if (error) return toast("Gagal simpan: " + error.message, "error");
    toast("Produk tersimpan");
    setOpen(false);
    load();
  };

  const remove = async (p: Product) => {
    if (!confirm(`Hapus produk "${p.name}"?`)) return;
    const { error } = await sb.from("products").delete().eq("id", p.id);
    if (error) return toast("Gagal hapus: " + error.message, "error");
    await sb.from("audit_logs").insert({
      store_id: profile!.store_id, user_id: profile!.id, action: "delete",
      entity: "products", entity_id: p.id, detail: `Menghapus produk ${p.name}`,
    });
    toast("Produk dihapus");
    load();
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    const { error } = await sb.from("categories").insert({ store_id: profile!.store_id, name: newCategory.trim() });
    if (error) return toast("Gagal: " + error.message, "error");
    setNewCategory("");
    load();
  };

  if (!products) return <Spinner />;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">Master Data Produk</h1>
        <div className="flex-1" />
        {canEdit && (
          <Button onClick={() => { setEdit(EMPTY); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Tambah Produk
          </Button>
        )}
      </div>

      {/* Kategori */}
      {canEdit && (
        <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
          <span className="text-sm font-medium">Kategori:</span>
          {categories.map((c) => <Badge key={c.id} color="blue">{c.name}</Badge>)}
          <Input className="h-9 w-40" placeholder="Kategori baru" value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)} />
          <Button size="sm" variant="outline" onClick={addCategory}>+ Tambah</Button>
        </Card>
      )}

      {products.length === 0 ? (
        <Card><EmptyState title="Belum ada produk" hint="Tambah produk pertama untuk mulai jualan" /></Card>
      ) : (
        <TableWrap>
          <thead>
            <tr className="border-b">
              <Th>SKU</Th><Th>Nama</Th><Th>Kategori</Th><Th>Rak</Th>
              {profile?.role !== "kasir" && <Th>HPP</Th>}
              <Th>Harga Jual</Th><Th>Stok</Th><Th>Status</Th>{canEdit && <Th></Th>}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <Td className="font-mono text-xs">{p.sku}</Td>
                <Td className="font-medium">{p.name}</Td>
                <Td>{p.categories?.name ?? "-"}</Td>
                <Td>{p.rack || "-"}</Td>
                {profile?.role !== "kasir" && <Td>{formatRupiah(p.buy_price)}</Td>}
                <Td>{formatRupiah(p.sell_price)}</Td>
                <Td>
                  <Badge color={p.stock <= p.min_stock ? "red" : "green"}>{formatNumber(p.stock)}</Badge>
                </Td>
                <Td>
                  <Badge color={p.is_active ? "green" : "gray"}>{p.is_active ? "Aktif" : "Nonaktif"}</Badge>
                </Td>
                {canEdit && (
                  <Td>
                    <div className="flex gap-1">
                      <button onClick={() => { setEdit(p); setOpen(true); }} className="rounded-lg p-2 hover:bg-accent" aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      {canDelete && (
                        <button onClick={() => remove(p)} className="rounded-lg p-2 text-destructive hover:bg-accent" aria-label="Hapus">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {/* Form produk */}
      <Modal open={open} onClose={() => setOpen(false)} title={edit.id ? "Edit Produk" : "Tambah Produk"} wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nama Produk *</Label>
            <Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          </div>
          <div>
            <Label>SKU</Label>
            <div className="flex gap-2">
              <Input value={edit.sku ?? ""} onChange={(e) => setEdit({ ...edit, sku: e.target.value })} placeholder="Otomatis" />
              <Button variant="outline" onClick={() => setEdit({ ...edit, sku: generateSku(edit.name ?? "") })}>Gen</Button>
            </div>
          </div>
          <div>
            <Label>Barcode</Label>
            <Input value={edit.barcode ?? ""} onChange={(e) => setEdit({ ...edit, barcode: e.target.value })} />
          </div>
          <div>
            <Label>Kategori</Label>
            <Select value={edit.category_id ?? ""} onChange={(e) => setEdit({ ...edit, category_id: e.target.value || null })}>
              <option value="">— Tanpa kategori —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div>
            <Label>Rak / Lokasi Gudang</Label>
            <Input value={edit.rack ?? ""} onChange={(e) => setEdit({ ...edit, rack: e.target.value })} placeholder="misal A-01-03" />
          </div>
          {profile?.role !== "kasir" && (
            <>
              <div>
                <Label>Harga Beli / HPP</Label>
                <Input type="number" min={0} value={edit.buy_price ?? 0} onChange={(e) => setEdit({ ...edit, buy_price: Number(e.target.value) })} />
              </div>
            </>
          )}
          <div>
            <Label>Harga Jual</Label>
            <Input type="number" min={0} value={edit.sell_price ?? 0} onChange={(e) => setEdit({ ...edit, sell_price: Number(e.target.value) })} />
          </div>
          {!edit.id && (
            <div>
              <Label>Stok Awal</Label>
              <Input type="number" min={0} value={edit.stock ?? 0} onChange={(e) => setEdit({ ...edit, stock: Number(e.target.value) })} />
            </div>
          )}
          <div>
            <Label>Min. Stok (alert)</Label>
            <Input type="number" min={0} value={edit.min_stock ?? 0} onChange={(e) => setEdit({ ...edit, min_stock: Number(e.target.value) })} />
          </div>
          <div className="sm:col-span-2">
            <Label>URL Foto Produk</Label>
            <Input value={edit.image_url ?? ""} onChange={(e) => setEdit({ ...edit, image_url: e.target.value })} placeholder="https://..." />
          </div>
          <div className="sm:col-span-2">
            <Label>Deskripsi</Label>
            <Textarea rows={2} value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={edit.is_active ?? true} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} />
            Tampilkan di toko online (aktif)
          </label>
        </div>
        <Button className="mt-4 w-full" onClick={save} loading={saving}>Simpan Produk</Button>
      </Modal>
    </div>
  );
}
