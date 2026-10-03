"use client";
import { useProfile } from "@/components/profile-ctx";
import { useToast } from "@/components/toast";
import {
  Badge, Button, Card, Input, Label, Modal, Select, Spinner, TableWrap, Td, Th,
} from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { formatDateTime, ROLE_LABEL } from "@/lib/utils";
import { Store, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type AuditLog = {
  id: string; action: string; entity: string; entity_id: string; detail: string;
  created_at: string; profiles?: { full_name: string } | null;
};

export default function PengaturanPage() {
  const profile = useProfile();
  const { toast } = useToast();
  const [members, setMembers] = useState<Profile[] | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [store, setStore] = useState<{ name: string; address: string; phone: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [staff, setStaff] = useState({ full_name: "", email: "", password: "", role: "kasir" });
  const [saving, setSaving] = useState(false);

  const sb = getSupabase();
  const isOwner = profile?.role === "owner";

  const load = useCallback(async () => {
    if (!profile?.store_id) return;
    const [{ data: m }, { data: l }, { data: s }] = await Promise.all([
      sb.from("profiles").select("*").eq("store_id", profile.store_id).order("created_at"),
      sb.from("audit_logs").select("*, profiles(full_name)").eq("store_id", profile.store_id)
        .order("created_at", { ascending: false }).limit(50),
      sb.from("stores").select("name, address, phone").eq("id", profile.store_id).single(),
    ]);
    setMembers((m as Profile[]) ?? []);
    setLogs((l as AuditLog[]) ?? []);
    setStore(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.store_id]);

  useEffect(() => { load(); }, [load]);

  const saveStore = async () => {
    if (!store) return;
    const { error } = await sb.from("stores").update(store).eq("id", profile!.store_id);
    if (error) return toast("Gagal: " + error.message, "error");
    toast("Info toko tersimpan");
  };

  const addStaff = async () => {
    setSaving(true);
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(staff),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) return toast("Gagal: " + json.error, "error");
    toast(`Staff ${staff.full_name} berhasil dibuat sebagai ${staff.role}`);
    setOpen(false);
    setStaff({ full_name: "", email: "", password: "", role: "kasir" });
    load();
  };

  if (!members || !store) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Pengaturan</h1>

      {/* Info toko */}
      <Card className="max-w-lg p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><Store className="h-5 w-5 text-primary" /> Info Toko</h2>
        <div className="space-y-3">
          <div>
            <Label>Nama Toko</Label>
            <Input value={store.name} disabled={!isOwner}
              onChange={(e) => setStore({ ...store, name: e.target.value })} />
          </div>
          <div>
            <Label>Alamat</Label>
            <Input value={store.address} disabled={!isOwner}
              onChange={(e) => setStore({ ...store, address: e.target.value })} />
          </div>
          <div>
            <Label>Telepon</Label>
            <Input value={store.phone} disabled={!isOwner}
              onChange={(e) => setStore({ ...store, phone: e.target.value })} />
          </div>
          {isOwner && <Button onClick={saveStore}>Simpan</Button>}
        </div>
      </Card>

      {/* User & role */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">User & Role</h2>
          {isOwner && (
            <Button size="sm" onClick={() => setOpen(true)}>
              <UserPlus className="h-4 w-4" /> Tambah Staff
            </Button>
          )}
        </div>
        <TableWrap>
          <thead><tr className="border-b"><Th>Nama</Th><Th>Role</Th><Th>Bergabung</Th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b last:border-0">
                <Td className="font-medium">{m.full_name}{m.id === profile?.id && " (Anda)"}</Td>
                <Td>
                  <Badge color={m.role === "owner" ? "purple" : m.role === "admin" ? "blue" : "green"}>
                    {ROLE_LABEL[m.role]}
                  </Badge>
                </Td>
                <Td className="text-xs">{formatDateTime(m.created_at)}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <div className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          <p><b>Owner</b>: akses penuh termasuk Laba Rugi & hapus master data.</p>
          <p><b>Admin/Finance</b>: lihat keuangan & input data, tidak bisa hapus master data.</p>
          <p><b>Kasir</b>: hanya jualan (POS), tidak bisa lihat HPP & laba.</p>
        </div>
      </Card>

      {/* Audit trail */}
      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Audit Trail (50 terakhir)</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada aktivitas tercatat.</p>
        ) : (
          <div className="space-y-1 text-sm">
            {logs.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center gap-2 border-b py-1.5 last:border-0">
                <Badge color="gray">{l.action}</Badge>
                <span>{l.detail || `${l.entity} ${l.entity_id}`}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {l.profiles?.full_name ?? "sistem"} · {formatDateTime(l.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal tambah staff */}
      <Modal open={open} onClose={() => setOpen(false)} title="Tambah Staff Baru">
        <div className="space-y-3">
          <div>
            <Label>Nama Lengkap</Label>
            <Input value={staff.full_name} onChange={(e) => setStaff({ ...staff, full_name: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={staff.email} onChange={(e) => setStaff({ ...staff, email: e.target.value })} />
          </div>
          <div>
            <Label>Password Awal</Label>
            <Input type="text" value={staff.password} onChange={(e) => setStaff({ ...staff, password: e.target.value })} placeholder="Minimal 6 karakter" />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={staff.role} onChange={(e) => setStaff({ ...staff, role: e.target.value })}>
              <option value="kasir">Kasir — hanya jualan</option>
              <option value="admin">Admin/Finance — keuangan & input data</option>
            </Select>
          </div>
          <Button className="w-full" onClick={addStaff} loading={saving}>Buat Akun Staff</Button>
        </div>
      </Modal>
    </div>
  );
}
