"use client";
import { useProfile } from "@/components/profile-ctx";
import { useToast } from "@/components/toast";
import {
  Badge, Button, Card, EmptyState, Input, Label, Modal, Select, Spinner, TableWrap, Td, Th,
} from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";
import type { Account, JournalEntry } from "@/lib/types";
import { formatDate, formatDateTime, formatRupiah } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Tab = "labarugi" | "jurnal" | "bukubesar" | "coa";
type JL = { account_id: string; debit: number; credit: number };

const TYPE_LABEL: Record<string, string> = {
  asset: "Asset", liability: "Liability", equity: "Equity", revenue: "Revenue", expense: "Expense",
};

export default function KeuanganPage() {
  const profile = useProfile();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("labarugi");
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [ledgerAcc, setLedgerAcc] = useState("");
  const [openJournal, setOpenJournal] = useState(false);
  const [jDesc, setJDesc] = useState("");
  const [jLines, setJLines] = useState<JL[]>([
    { account_id: "", debit: 0, credit: 0 },
    { account_id: "", debit: 0, credit: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [openCoa, setOpenCoa] = useState(false);
  const [newAcc, setNewAcc] = useState({ code: "", name: "", type: "asset" });

  const sb = getSupabase();

  const load = useCallback(async () => {
    if (!profile?.store_id) return;
    const [{ data: a }, { data: e }] = await Promise.all([
      sb.from("accounts").select("*").eq("store_id", profile.store_id).order("code"),
      sb.from("journal_entries").select("*, journal_lines(*, accounts(code, name, type))")
        .eq("store_id", profile.store_id).order("entry_date", { ascending: false })
        .order("created_at", { ascending: false }).limit(300),
    ]);
    setAccounts((a as Account[]) ?? []);
    setEntries((e as JournalEntry[]) ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.store_id]);

  useEffect(() => { load(); }, [load]);

  if (!accounts) return <Spinner />;

  // ===== Laba Rugi (dari jurnal) =====
  const lines = entries.flatMap((e) => e.journal_lines ?? []);
  const sumBy = (pred: (t: string, code: string) => boolean, dc: "d" | "c") =>
    lines.reduce((a, l) => {
      const t = l.accounts?.type ?? "";
      const code = l.accounts?.code ?? "";
      if (!pred(t, code)) return a;
      return a + (dc === "d" ? l.debit - l.credit : l.credit - l.debit);
    }, 0);
  const pendapatan = sumBy((t) => t === "revenue", "c");
  const hpp = sumBy((_, c) => c === "501", "d");
  const beban = sumBy((t, c) => t === "expense" && c !== "501", "d");
  const labaKotor = pendapatan - hpp;
  const labaBersih = labaKotor - beban;

  // ===== Buku besar =====
  const ledger = entries
    .filter((e) => (e.journal_lines ?? []).some((l) => l.account_id === ledgerAcc))
    .map((e) => ({
      ...e,
      journal_lines: (e.journal_lines ?? []).filter((l) => l.account_id === ledgerAcc),
    }));
  let running = 0;
  const acc = accounts.find((a) => a.id === ledgerAcc);
  const normalDebit = acc ? ["asset", "expense"].includes(acc.type) : true;

  const saveJournal = async () => {
    if (!jDesc.trim()) return toast("Deskripsi jurnal wajib diisi", "error");
    if (jLines.some((l) => !l.account_id)) return toast("Pilih akun untuk semua baris", "error");
    setSaving(true);
    const { error } = await sb.rpc("create_manual_journal", {
      p_desc: jDesc,
      p_lines: jLines.map((l) => ({ account_id: l.account_id, debit: l.debit, credit: l.credit })),
    });
    setSaving(false);
    if (error) return toast("Gagal: " + error.message, "error");
    toast("Jurnal tersimpan");
    setOpenJournal(false);
    setJDesc("");
    setJLines([{ account_id: "", debit: 0, credit: 0 }, { account_id: "", debit: 0, credit: 0 }]);
    load();
  };

  const saveAccount = async () => {
    if (!newAcc.code.trim() || !newAcc.name.trim()) return toast("Kode & nama akun wajib diisi", "error");
    const { error } = await sb.from("accounts").insert({
      store_id: profile!.store_id, code: newAcc.code.trim(), name: newAcc.name.trim(), type: newAcc.type,
    });
    if (error) return toast("Gagal: " + error.message, "error");
    toast("Akun ditambahkan");
    setOpenCoa(false);
    setNewAcc({ code: "", name: "", type: "asset" });
    load();
  };

  const removeAccount = async (a: Account) => {
    if (!confirm(`Hapus akun ${a.code} ${a.name}?`)) return;
    const { error } = await sb.from("accounts").delete().eq("id", a.id);
    if (error) return toast("Gagal: " + error.message, "error");
    load();
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "labarugi", label: "Laba Rugi" },
    { key: "jurnal", label: "Jurnal Umum" },
    { key: "bukubesar", label: "Buku Besar" },
    { key: "coa", label: "Chart of Accounts" },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">Keuangan</h1>
        <div className="flex-1" />
        <Button variant="outline" onClick={() => setOpenJournal(true)}>
          <Plus className="h-4 w-4" /> Jurnal Manual
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 overflow-x-auto rounded-lg border p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={
              "min-h-[40px] flex-1 whitespace-nowrap rounded-lg px-3 text-sm font-medium " +
              (tab === t.key ? "bg-primary text-primary-foreground" : "hover:bg-accent")
            }>
            {t.label}
          </button>
        ))}
      </div>

      {/* ============ LABA RUGI ============ */}
      {tab === "labarugi" && (
        <Card className="max-w-lg p-5">
          <h2 className="mb-4 text-center text-lg font-bold">Laporan Laba Rugi</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Pendapatan (Revenue)</span><b>{formatRupiah(pendapatan)}</b></div>
            <div className="flex justify-between"><span>HPP</span><b className="text-red-600">({formatRupiah(hpp)})</b></div>
            <div className="flex justify-between border-t pt-2"><span>Laba Kotor</span><b>{formatRupiah(labaKotor)}</b></div>
            <div className="flex justify-between"><span>Beban Operasional & Lainnya</span><b className="text-red-600">({formatRupiah(beban)})</b></div>
            <div className="flex justify-between border-t pt-2 text-lg">
              <span>Laba Bersih</span>
              <b className={labaBersih >= 0 ? "text-green-600" : "text-red-600"}>{formatRupiah(labaBersih)}</b>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Dihitung otomatis dari semua jurnal: penjualan, pembelian, opname, dan jurnal manual.
          </p>
        </Card>
      )}

      {/* ============ JURNAL UMUM ============ */}
      {tab === "jurnal" && (
        entries.length === 0 ? (
          <Card><EmptyState title="Belum ada jurnal" hint="Jurnal dibuat otomatis dari transaksi, atau input manual" /></Card>
        ) : (
          <div className="space-y-3">
            {entries.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{e.description}</span>
                  {e.ref_type && <Badge color="blue">{e.ref_type}</Badge>}
                  <span className="ml-auto text-xs text-muted-foreground">{formatDate(e.entry_date)}</span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {(e.journal_lines ?? []).map((l) => (
                      <tr key={l.id} className="border-b last:border-0">
                        <td className="py-1.5">
                          <span className="font-mono text-xs text-muted-foreground">{l.accounts?.code}</span>{" "}
                          {l.accounts?.name}
                        </td>
                        <td className="py-1.5 text-right">{l.debit > 0 ? formatRupiah(l.debit) : ""}</td>
                        <td className="py-1.5 text-right">{l.credit > 0 ? formatRupiah(l.credit) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th></th><th className="text-right">Debit</th><th className="text-right">Kredit</th>
                    </tr>
                  </thead>
                </table>
              </Card>
            ))}
          </div>
        )
      )}

      {/* ============ BUKU BESAR ============ */}
      {tab === "bukubesar" && (
        <div>
          <Select className="mb-3 max-w-sm" value={ledgerAcc} onChange={(e) => setLedgerAcc(e.target.value)}>
            <option value="">— Pilih akun —</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </Select>
          {!ledgerAcc ? (
            <Card><EmptyState title="Pilih akun untuk melihat buku besar" /></Card>
          ) : ledger.length === 0 ? (
            <Card><EmptyState title="Belum ada mutasi untuk akun ini" /></Card>
          ) : (
            <TableWrap>
              <thead>
                <tr className="border-b"><Th>Tanggal</Th><Th>Keterangan</Th><Th>Debit</Th><Th>Kredit</Th><Th>Saldo</Th></tr>
              </thead>
              <tbody>
                {ledger.map((e) => {
                  const l = e.journal_lines![0];
                  running += normalDebit ? l.debit - l.credit : l.credit - l.debit;
                  return (
                    <tr key={e.id} className="border-b last:border-0">
                      <Td className="whitespace-nowrap text-xs">{formatDate(e.entry_date)}</Td>
                      <Td>{e.description}</Td>
                      <Td>{l.debit > 0 ? formatRupiah(l.debit) : ""}</Td>
                      <Td>{l.credit > 0 ? formatRupiah(l.credit) : ""}</Td>
                      <Td className="font-medium">{formatRupiah(running)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </div>
      )}

      {/* ============ COA ============ */}
      {tab === "coa" && (
        <div>
          <div className="mb-3 flex justify-end">
            <Button size="sm" onClick={() => setOpenCoa(true)}><Plus className="h-4 w-4" /> Akun Baru</Button>
          </div>
          <TableWrap>
            <thead>
              <tr className="border-b"><Th>Kode</Th><Th>Nama Akun</Th><Th>Tipe</Th><Th></Th></tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <Td className="font-mono">{a.code}</Td>
                  <Td className="font-medium">{a.name}</Td>
                  <Td><Badge color="blue">{TYPE_LABEL[a.type]}</Badge></Td>
                  <Td>
                    {!a.is_system && profile?.role === "owner" && (
                      <button onClick={() => removeAccount(a)} className="rounded-lg p-2 text-destructive hover:bg-accent" aria-label="Hapus akun">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </div>
      )}

      {/* Modal jurnal manual */}
      <Modal open={openJournal} onClose={() => setOpenJournal(false)} title="Jurnal Manual / Penyesuaian" wide>
        <div className="space-y-3">
          <div>
            <Label>Deskripsi</Label>
            <Input value={jDesc} onChange={(e) => setJDesc(e.target.value)} placeholder="misal: Beban listrik Oktober" />
          </div>
          {jLines.map((l, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border p-2">
              <div className="min-w-44 flex-1">
                <Label>Akun</Label>
                <Select value={l.account_id}
                  onChange={(e) => setJLines(jLines.map((x, xi) => xi === i ? { ...x, account_id: e.target.value } : x))}>
                  <option value="">— Pilih —</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </Select>
              </div>
              <div className="w-28">
                <Label>Debit</Label>
                <Input type="number" min={0} value={l.debit}
                  onChange={(e) => setJLines(jLines.map((x, xi) => xi === i ? { ...x, debit: Number(e.target.value) } : x))} />
              </div>
              <div className="w-28">
                <Label>Kredit</Label>
                <Input type="number" min={0} value={l.credit}
                  onChange={(e) => setJLines(jLines.map((x, xi) => xi === i ? { ...x, credit: Number(e.target.value) } : x))} />
              </div>
              {jLines.length > 2 && (
                <button onClick={() => setJLines(jLines.filter((_, xi) => xi !== i))}
                  className="mb-1 rounded-lg p-2 text-destructive hover:bg-accent" aria-label="Hapus baris">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm"
            onClick={() => setJLines([...jLines, { account_id: "", debit: 0, credit: 0 }])}>
            <Plus className="h-4 w-4" /> Tambah Baris
          </Button>
          <div className="flex justify-between rounded-lg bg-muted p-3 text-sm">
            <span>Total Debit: <b>{formatRupiah(jLines.reduce((a, l) => a + l.debit, 0))}</b></span>
            <span>Total Kredit: <b>{formatRupiah(jLines.reduce((a, l) => a + l.credit, 0))}</b></span>
          </div>
          <Button className="w-full" onClick={saveJournal} loading={saving}>Simpan Jurnal</Button>
        </div>
      </Modal>

      {/* Modal akun baru */}
      <Modal open={openCoa} onClose={() => setOpenCoa(false)} title="Akun Baru (COA)">
        <div className="space-y-3">
          <div><Label>Kode</Label>
            <Input value={newAcc.code} onChange={(e) => setNewAcc({ ...newAcc, code: e.target.value })} placeholder="misal 603" /></div>
          <div><Label>Nama Akun</Label>
            <Input value={newAcc.name} onChange={(e) => setNewAcc({ ...newAcc, name: e.target.value })} placeholder="misal Beban Gaji" /></div>
          <div><Label>Tipe</Label>
            <Select value={newAcc.type} onChange={(e) => setNewAcc({ ...newAcc, type: e.target.value })}>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select></div>
          <Button className="w-full" onClick={saveAccount}>Simpan Akun</Button>
        </div>
      </Modal>
    </div>
  );
}
