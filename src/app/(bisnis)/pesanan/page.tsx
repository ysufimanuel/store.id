"use client";
import { useProfile } from "@/components/profile-ctx";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, EmptyState, Spinner, TableWrap, Td, Th } from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";
import type { Sale } from "@/lib/types";
import { formatDateTime, formatRupiah, STATUS_LABEL } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

const STATUS_COLOR: Record<string, "green" | "yellow" | "red" | "blue" | "gray"> = {
  menunggu: "yellow", diproses: "blue", siap: "green", selesai: "green", batal: "gray",
};

const NEXT_ACTION: Record<string, { label: string; to: string } | null> = {
  menunggu: { label: "Proses (potong stok)", to: "diproses" },
  diproses: { label: "Tandai Siap Diambil", to: "siap" },
  siap: { label: "Selesaikan", to: "selesai" },
  selesai: null,
  batal: null,
};

export default function PesananPage() {
  const profile = useProfile();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Sale[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const sb = getSupabase();

  const load = useCallback(async () => {
    if (!profile?.store_id) return;
    const { data } = await sb
      .from("sales").select("*, sales_items(*, products(name)), profiles!sales_buyer_id_fkey(full_name)")
      .eq("store_id", profile.store_id).eq("type", "online")
      .order("created_at", { ascending: false }).limit(100);
    setOrders((data as Sale[]) ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.store_id]);

  useEffect(() => {
    load();
    if (!profile?.store_id) return;
    const ch = sb
      .channel("orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => load())
      .subscribe();
    return () => { sb.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.store_id]);

  const setStatus = async (id: string, status: string) => {
    setBusy(id);
    const { error } = await sb.rpc("set_order_status", { p_sale_id: id, p_status: status });
    setBusy(null);
    if (error) return toast("Gagal: " + error.message, "error");
    toast("Status diperbarui");
    load();
  };

  if (!orders) return <Spinner />;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Pesanan Online Masuk</h1>
      {orders.length === 0 ? (
        <Card><EmptyState title="Belum ada pesanan online" hint="Pesanan dari etalase toko akan masuk ke sini" /></Card>
      ) : (
        <TableWrap>
          <thead>
            <tr className="border-b">
              <Th>Order</Th><Th>Waktu</Th><Th>Pembeli</Th><Th>Item</Th><Th>Total</Th><Th>Status</Th><Th>Aksi</Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const next = NEXT_ACTION[o.status];
              return (
                <tr key={o.id} className="border-b last:border-0">
                  <Td className="font-mono text-xs">{o.invoice_no}</Td>
                  <Td className="whitespace-nowrap text-xs">{formatDateTime(o.created_at)}</Td>
                  <Td>{o.profiles?.full_name ?? "-"}</Td>
                  <Td className="text-xs">
                    {o.sales_items?.map((it) => `${it.products?.name} ×${it.qty}`).join(", ")}
                    {o.note && <p className="mt-1 italic text-muted-foreground">"{o.note}"</p>}
                  </Td>
                  <Td>{formatRupiah(o.grand_total)}</Td>
                  <Td><Badge color={STATUS_COLOR[o.status]}>{STATUS_LABEL[o.status]}</Badge></Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {next && (
                        <Button size="sm" loading={busy === o.id} onClick={() => setStatus(o.id, next.to)}>
                          {next.label}
                        </Button>
                      )}
                      {(o.status === "menunggu" || o.status === "diproses") && (
                        <Button size="sm" variant="destructive" onClick={() => setStatus(o.id, "batal")}>
                          Batal
                        </Button>
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
