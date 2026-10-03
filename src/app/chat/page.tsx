"use client";
import { Navbar } from "@/components/navbar";
import { SetupNotice } from "@/components/setup-notice";
import { Button, Card, EmptyState, Input, Spinner } from "@/components/ui";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Message, Profile } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { Send, Store } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

type Thread = { customer_id: string; name: string; last: string; last_at: string };

function ChatInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [me, setMe] = useState<Profile | null>(null);
  const [storeId, setStoreId] = useState<string | null>(params.get("store"));
  const [storeName, setStoreName] = useState("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeCustomer, setActiveCustomer] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const sb = getSupabase();

  const loadThread = useCallback(async (sid: string, cid: string) => {
    const { data } = await sb
      .from("messages").select("*")
      .eq("store_id", sid).eq("customer_id", cid)
      .order("created_at", { ascending: true }).limit(200);
    setMessages((data as Message[]) ?? []);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace("/login?next=/chat");
        return;
      }
      const { data: p } = await sb.from("profiles").select("*").eq("id", data.user.id).single();
      const prof = p as Profile;
      setMe(prof);

      if (prof.role === "user") {
        // pembeli: thread dengan toko yang dipilih
        if (storeId) {
          const { data: s } = await sb.from("stores").select("name").eq("id", storeId).single();
          setStoreName(s?.name ?? "Toko");
          loadThread(storeId, prof.id);
        }
      } else if (prof.store_id) {
        // bisnis: daftar percakapan
        setStoreId(prof.store_id);
        const { data: msgs } = await sb
          .from("messages").select("customer_id, body, created_at, profiles!messages_customer_id_fkey(full_name)")
          .eq("store_id", prof.store_id)
          .order("created_at", { ascending: false }).limit(500);
        const map = new Map<string, Thread>();
        (msgs ?? []).forEach((m: any) => {
          if (!map.has(m.customer_id)) {
            map.set(m.customer_id, {
              customer_id: m.customer_id,
              name: m.profiles?.full_name ?? "Pembeli",
              last: m.body,
              last_at: m.created_at,
            });
          }
        });
        setThreads([...map.values()]);
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // realtime subscribe
  useEffect(() => {
    if (!storeId || !me) return;
    const cid = me.role === "user" ? me.id : activeCustomer;
    if (!cid) return;
    const channel = sb
      .channel("chat-" + storeId + "-" + cid)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Message;
        if (m.store_id === storeId && m.customer_id === cid) {
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
      })
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, me, activeCustomer]);

  const send = async () => {
    if (!body.trim() || !me || !storeId) return;
    const cid = me.role === "user" ? me.id : activeCustomer;
    if (!cid) return;
    const text = body.trim();
    setBody("");
    const { error } = await sb.from("messages").insert({
      store_id: storeId, customer_id: cid, sender_id: me.id, body: text,
    });
    if (error) setBody(text);
    else if (me.role === "user") loadThread(storeId, cid);
  };

  if (!isSupabaseConfigured) return <SetupNotice />;
  if (loading) return <div><Navbar /><Spinner /></div>;
  if (!me) return null;

  // ====== Tampilan pembeli ======
  if (me.role === "user") {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-4">
          <h1 className="mb-3 flex items-center gap-2 text-lg font-bold">
            <Store className="h-5 w-5 text-primary" /> Chat dengan {storeName || "Penjual"}
          </h1>
          {!storeId ? (
            <Card><EmptyState title="Pilih toko dari halaman produk" hint="Tekan ikon chat di detail produk" /></Card>
          ) : (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto rounded-xl border bg-card p-3" style={{ minHeight: "50vh" }}>
                {messages.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Mulai percakapan dengan penjual…
                  </p>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={m.sender_id === me.id ? "text-right" : "text-left"}>
                    <span className={
                      "inline-block max-w-[80%] rounded-2xl px-3 py-2 text-sm " +
                      (m.sender_id === me.id ? "bg-primary text-primary-foreground" : "bg-muted")
                    }>
                      {m.body}
                    </span>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{formatDateTime(m.created_at)}</p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="mt-3 flex gap-2">
                <Input value={body} onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Tulis pesan..." />
                <Button onClick={send} aria-label="Kirim"><Send className="h-4 w-4" /></Button>
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  // ====== Tampilan bisnis ======
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto grid w-full max-w-4xl flex-1 gap-4 px-4 py-4 md:grid-cols-[240px_1fr]">
        <Card className="h-fit max-h-[70vh] overflow-y-auto p-2">
          <p className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">Percakapan</p>
          {threads.length === 0 && (
            <p className="p-2 text-sm text-muted-foreground">Belum ada chat masuk.</p>
          )}
          {threads.map((t) => (
            <button
              key={t.customer_id}
              onClick={() => { setActiveCustomer(t.customer_id); loadThread(storeId!, t.customer_id); }}
              className={
                "w-full rounded-lg p-2 text-left hover:bg-accent " +
                (activeCustomer === t.customer_id ? "bg-accent" : "")
              }
            >
              <p className="truncate text-sm font-medium">{t.name}</p>
              <p className="truncate text-xs text-muted-foreground">{t.last}</p>
            </button>
          ))}
        </Card>
        <div className="flex flex-col">
          {!activeCustomer ? (
            <Card><EmptyState title="Pilih percakapan" /></Card>
          ) : (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto rounded-xl border bg-card p-3" style={{ minHeight: "50vh" }}>
                {messages.map((m) => (
                  <div key={m.id} className={m.sender_id === me.id ? "text-right" : "text-left"}>
                    <span className={
                      "inline-block max-w-[80%] rounded-2xl px-3 py-2 text-sm " +
                      (m.sender_id === me.id ? "bg-primary text-primary-foreground" : "bg-muted")
                    }>
                      {m.body}
                    </span>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="mt-3 flex gap-2">
                <Input value={body} onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Balas pesan..." />
                <Button onClick={send} aria-label="Kirim"><Send className="h-4 w-4" /></Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatInner />
    </Suspense>
  );
}
