"use client";
import { useProfile } from "@/components/profile-ctx";
import { useToast } from "@/components/toast";
import {
  Badge, Button, Card, EmptyState, Input, Label, Modal, Spinner, TableWrap, Td, Th,
} from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";
import type { Customer, Sale } from "@/lib/types";
import { formatDateTime, formatRupiah, PAYMENT_LABEL, STATUS_LABEL } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const STATUS_COLOR: Record<string, "green" | "yellow" | "red" | "blue" | "gray"> = {
  lunas: "green", sebagian: "yellow", belum_lunas: "red",
  menunggu: "yellow", diproses: "blue", siap: "green", selesai: "green", batal: "gray",
};

export default function PenjualanPage() {
  const profile = useProfile();
  const { toast } = useToast();
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tab, setTab] = useState<"semua" | "piutang">("semua");
  const [payTarget, setPayTarget] = useState<Sale | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [newCustomer, setNewCustomer] = useState("");
  const [detail, setDetail] = useState<Sale | null>(null);

  const sb = getSupabase();

  const load = useCallback(async () => {
    if (!profile?.store_id) return;
    const [{ data: s }, { data: c }] = await Promise.all([
      sb.from("sales").select("*, customers(name), sales_items(*, products(name))")
        .eq("store_id", profile.store_id).order("created_at", { ascending: false }).limit(200),
      sb.from("customers").select("*").eq("store_id", profile.store_id).order("name"),
    ]);
    setSales((s as Sale[]) ?? []);
    setCustomers((c as Customer[]) ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.store_id]);

  useEffect(() => { load(); }, [load]);

  const addCustomer = async () => {
    if (!newCustomer.trim()) return;
    const { error } = await sb.from("customers").insert({ store_id: profile!.store_id, name: newCustomer.trim() });
    if (error) return toast("Gagal: " + error.message, "error");
    setNewCustomer("");
    toast("Pelanggan ditambahkan");
    load();
  };

  const payReceivable = async () => {
    if (!payTarget || payAmount <= 0) return;
    setSaving(true);
    const { error } = await sb.rpc("pay_receivable", { p_sale_id: payTarget.id, p_amount: payAmount });
    setSaving(false);
    if (error) return toast("Gagal: " + error.message, "error");
    toast("Pembayaran piutang tercatat & jurnal dibuat");
    setPayTarget(null);
    load();
  };

  if (!sales) return <Spinner />;

  const shown = tab === "piutang" ? sales.filter((s) => s.status === "belum_lunas" || s.status === "sebagian") : sales;
  const totalPiutang = sales
    .filter((s) => s.status === "belum_lunas" || s.status === "sebagian")
    .reduce((a, s) => a + (s.grand_total - s.paid_amount), 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">Penjualan & Piutang</h1>
        <div className="flex-1" />
        <div className="flex rounded-lg border">
          {(["semua", "piutang"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={
                "min-h-[44px] px-4 text-sm font-medium " +
                (tab === t ? "bg-primary text-primary-foreground" : "") +
                (t === "semua" ? " rounded-l-lg" : " rounded-r-lg")
              }>
              {t === "semua" ? "Semua Transaksi" : "Piutang"}
            </button>
          ))}
        </div>
      </div>

      {totalPiutang > 0 && (
        <Card className="mb-4 border-red-300 bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-300">
            Total piutang belum tertagih: <b className="text-lg">{formatRupiah(totalPiutang)}</b>
          </p>
        </Card>
      )}

      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <span className="text-sm font-medium">Pelanggan:</span>
        {customers.slice(0, 8).map((c) => <Badge key={c.id} color="blue">{c.name}</Badge>)}
        {customers.length > 8 && <span className="text-xs text-muted-foreground">+{customers.length - 8} lainnya</span>}
        <Input className="h-9 w-40" placeholder="Pelanggan baru" value={newCustomer}
          onChange={(e) => setNewCustomer(e.target.value)} />
        <Button size="sm" variant="outline" onClick={addCustomer}><Plus className="h-3.5 w-3.5" /> Tambah</Button>
      </Card>

      {shown.length === 0 ? (
        <Card><EmptyState title="Belum ada transaksi" hint="Transaksi dari POS dan toko online tampil di sini" /></Card>
      ) : (
        <TableWrap>
          <thead>
            <tr className="border-b">
              <Th>Invoice</Th><Th>Waktu</Th><Th>Tipe</Th><Th>Pelanggan</Th><Th>Metode</Th>
              <Th>Total</Th><Th>Terbayar</Th><Th>Status</Th><Th></Th>
            </tr>
          </thead>
          <tbody>
            {shown.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <Td className="font-mono text-xs">{s.invoice_no}</Td>
                <Td className="whitespace-nowrap text-xs">{formatDateTime(s.created_at)}</Td>
                <Td><Badge color={s.type === "online" ? "purple" : "gray"}>{s.type === "online" ? "Online" : "POS"}</Badge></Td>
                <Td>{s.customers?.name ?? (s.buyer_id ? "Pembeli online" : "Umum")}</Td>
                <Td className="text-xs">{PAYMENT_LABEL[s.payment_method]}</Td>
                <Td>{formatRupiah(s.grand_total)}</Td>
                <Td>{formatRupiah(s.paid_amount)}</Td>
                <Td><Badge color={STATUS_COLOR[s.status]}>{STATUS_LABEL[s.status] ?? s.status}</Badge></Td>
                <Td>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setDetail(s)}>Detail</Button>
                    {(s.status === "belum_lunas" || s.status === "sebagian") && (
                      <Button size="sm" variant="outline"
                        onClick={() => { setPayTarget(s); setPayAmount(s.grand_total - s.paid_amount); }}>
                        Cicil
                      </Button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {/* Detail transaksi */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Detail ${detail?.invoice_no ?? ""}`}>
        {detail && (
          <div className="space-y-2 text-sm">
            {detail.sales_items?.map((it) => (
              <div key={it.id} className="flex justify-between border-b pb-1">
                <span>{it.products?.name} × {it.qty}</span>
                <span>{formatRupiah(it.qty * it.price - it.discount)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-1"><span>Subtotal</span><span>{formatRupiah(detail.subtotal)}</span></div>
            <div className="flex justify-between"><span>Diskon</span><span>-{formatRupiah(detail.discount)}</span></div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span><span className="text-primary">{formatRupiah(detail.grand_total)}</span>
            </div>
            {profile?.role !== "kasir" && (
              <div className="flex justify-between text-muted-foreground">
                <span>Estimasi laba kotor</span>
                <span>
                  {formatRupiah(
                    (detail.sales_items ?? []).reduce((a, it) => a + it.qty * (it.price - it.buy_price) - it.discount, 0) - detail.discount
                  )}
                </span>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Cicil piutang */}
      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title={`Bayar Piutang — ${payTarget?.invoice_no ?? ""}`}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sisa piutang: <b>{formatRupiah((payTarget?.grand_total ?? 0) - (payTarget?.paid_amount ?? 0))}</b>
          </p>
          <div>
            <Label>Nominal Cicilan</Label>
            <Input type="number" min={0} value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} />
          </div>
          <Button className="w-full" onClick={payReceivable} loading={saving}>Catat Pembayaran</Button>
        </div>
      </Modal>
    </div>
  );
}
