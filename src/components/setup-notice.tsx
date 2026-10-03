"use client";
import { Card } from "@/components/ui";
import { Database } from "lucide-react";

export function SetupNotice() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="max-w-lg p-6">
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-primary" />
          <h2 className="text-xl font-bold">Supabase belum dikonfigurasi</h2>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Aplikasi membutuhkan koneksi ke Supabase. Isi file{" "}
          <code className="rounded bg-muted px-1">.env.local</code> dengan:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-3 text-xs">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...`}
        </pre>
        <p className="mt-3 text-sm text-muted-foreground">
          Lalu jalankan <code className="rounded bg-muted px-1">supabase/schema.sql</code> di SQL Editor
          Supabase, dan restart server. Panduan lengkap ada di README.md.
        </p>
      </Card>
    </div>
  );
}
