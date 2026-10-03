import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// POST /api/staff — owner membuat akun staff (admin/kasir) untuk tokonya
export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 500 });
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!serviceKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY belum diisi di environment server" },
      { status: 500 }
    );
  }

  // Verifikasi pemanggil = owner
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await sb.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "owner" || !profile.store_id) {
    return NextResponse.json({ error: "Hanya owner yang bisa menambah staff" }, { status: 403 });
  }

  const { email, password, full_name, role } = await req.json();
  if (!email || !password || !full_name || !["admin", "kasir"].includes(role)) {
    return NextResponse.json({ error: "Data tidak lengkap / role tidak valid" }, { status: 400 });
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, account_type: "user" },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Trigger handle_new_user membuat profile role 'user'; upgrade jadi staff toko ini
  const { error: upErr } = await admin
    .from("profiles")
    .update({ role, store_id: profile.store_id })
    .eq("id", created.user.id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  await admin.from("audit_logs").insert({
    store_id: profile.store_id, user_id: user.id, action: "create",
    entity: "profiles", entity_id: created.user.id,
    detail: `Owner menambah staff ${full_name} sebagai ${role}`,
  });

  return NextResponse.json({ ok: true });
}
