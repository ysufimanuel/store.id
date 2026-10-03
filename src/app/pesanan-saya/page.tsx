"use client";
import { Navbar } from "@/components/navbar";
import { SetupNotice } from "@/components/setup-notice";
import { Badge, Card, EmptyState, Spinner } from "@/components/ui";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Sale } from "@/lib/types";
import { formatDateTime, formatRupiah, STATUS_LABEL } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const STATUS_COLOR: Record<string, "gray" | "green" | "yellow" | "red" | "blue"> = {
  menunggu: "yellow", diproses: "blue", siap: "green", selesai: "green", batal: "red",
};

export default function PesananSayaPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabase();
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace("/login?next=/pesanan-saya");
        return;
      }
      const { data: rows } = await sb
        .from("sales")
        .select("*, sales_items(*, products(name))")
        .eq("buyer_id", data.user.id)
        .order("created_at", { ascending: false });
      setOrders((rows as Sale[]) ?? []);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isSupabaseConfigured) return <SetupNotice />;

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Pesanan Saya</h1>
        {loading ? (
          <Spinner />
        ) : orders.length === 0 ? (
          <Card><EmptyState title="Belum ada pesanan" hint="Checkout dari keranjang untuk membuat pesanan" /></Card>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Card key={o.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{o.invoice_no}</span>
                  <Badge color={STATUS_COLOR[o.status] ?? "gray"}>{STATUS_LABEL[o.status] ?? o.status}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(o.created_at)}</span>
                </div>
                <div className="mt-2 space-y-1">
                  {o.sales_items?.map((it) => (
                    <p key={it.id} className="text-sm text-muted-foreground">
                      {it.products?.name} × {it.qty} — {formatRupiah(it.qty * it.price)}
                    </p>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between border-t pt-2">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-bold text-primary">{formatRupiah(o.grand_total)}</span>
                </div>
                {o.status === "siap" && (
                  <p className="mt-2 rounded-lg bg-green-100 p-2 text-sm text-green-700 dark:bg-green-900/40 dark:text-green-300">
                    Pesananmu sudah siap diambil! 🎉
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
