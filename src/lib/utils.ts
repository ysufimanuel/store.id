import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatRupiah(n: number | null | undefined) {
  return "Rp" + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n ?? 0);
}

export function formatNumber(n: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n ?? 0);
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function generateSku(name: string) {
  const prefix = name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "PRD";
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${rand}`;
}

export const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash",
  transfer: "Transfer",
  tempo: "Piutang (Tempo)",
};

export const STATUS_LABEL: Record<string, string> = {
  lunas: "Lunas",
  sebagian: "Sebagian",
  belum_lunas: "Belum Lunas",
  menunggu: "Menunggu Konfirmasi",
  diproses: "Diproses",
  siap: "Siap Diambil",
  selesai: "Selesai",
  batal: "Dibatalkan",
};

export const ROLE_LABEL: Record<string, string> = {
  user: "User (Pembeli)",
  owner: "Owner",
  admin: "Admin / Finance",
  kasir: "Kasir",
};
