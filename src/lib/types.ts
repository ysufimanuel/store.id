export type Role = "user" | "owner" | "admin" | "kasir";

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  store_id: string | null;
  created_at: string;
}

export interface Store {
  id: string;
  name: string;
  owner_id: string;
  address: string;
  phone: string;
  created_at: string;
}

export interface Category {
  id: string;
  store_id: string;
  name: string;
}

export interface Product {
  id: string;
  store_id: string;
  category_id: string | null;
  sku: string;
  barcode: string;
  name: string;
  description: string;
  image_url: string;
  rack: string;
  buy_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  is_active: boolean;
  created_at: string;
  stores?: { name: string } | null;
  categories?: { name: string } | null;
}

export interface Customer {
  id: string;
  store_id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface Supplier {
  id: string;
  store_id: string;
  name: string;
  phone: string;
  address: string;
}

export interface Sale {
  id: string;
  store_id: string;
  invoice_no: string;
  type: "pos" | "online";
  customer_id: string | null;
  buyer_id: string | null;
  payment_method: "cash" | "transfer" | "tempo";
  subtotal: number;
  discount: number;
  grand_total: number;
  paid_amount: number;
  status: string;
  note: string;
  created_by: string | null;
  created_at: string;
  sales_items?: SaleItem[];
  customers?: { name: string } | null;
  profiles?: { full_name: string } | null;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  qty: number;
  price: number;
  buy_price: number;
  discount: number;
  products?: { name: string; sku: string } | null;
}

export interface Purchase {
  id: string;
  store_id: string;
  po_no: string;
  supplier_id: string | null;
  payment_method: string;
  total: number;
  paid_amount: number;
  status: string;
  created_at: string;
  suppliers?: { name: string } | null;
  purchase_items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  qty: number;
  price: number;
  products?: { name: string } | null;
}

export interface StockMovement {
  id: string;
  store_id: string;
  product_id: string;
  type: "sale" | "purchase" | "opname" | "return" | "cancel";
  qty: number;
  stock_before: number;
  stock_after: number;
  ref_id: string | null;
  note: string;
  created_at: string;
  products?: { name: string; sku: string; rack: string } | null;
  profiles?: { full_name: string } | null;
}

export interface Account {
  id: string;
  store_id: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  is_system: boolean;
}

export interface JournalEntry {
  id: string;
  store_id: string;
  entry_date: string;
  ref_type: string;
  description: string;
  created_at: string;
  journal_lines?: JournalLine[];
}

export interface JournalLine {
  id: string;
  entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  accounts?: { code: string; name: string; type: string } | null;
}

export interface Rating {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  review: string;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export interface Message {
  id: string;
  store_id: string;
  customer_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  qty: number;
  discount: number;
  stock: number;
  store_id?: string;
  image_url?: string;
}
