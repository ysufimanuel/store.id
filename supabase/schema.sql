-- ============================================================================
-- ERP MINI — POS + FINANCE + LOGISTIK + E-COMMERCE
-- Jalankan file ini di Supabase SQL Editor (sekali jalan, urut dari atas).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. TABEL UTAMA
-- ============================================================================

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null,
  address text default '',
  phone text default '',
  created_at timestamptz not null default now()
);

-- role: 'user' (pembeli) | 'owner' | 'admin' (finance) | 'kasir'
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'user' check (role in ('user','owner','admin','kasir')),
  store_id uuid references public.stores(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  sku text not null,
  barcode text default '',
  name text not null,
  description text default '',
  image_url text default '',
  rack text default '',               -- penamaan rak gudang, misal "A-01-03"
  buy_price numeric(15,2) not null default 0,   -- HPP moving average
  sell_price numeric(15,2) not null default 0,
  stock numeric(15,2) not null default 0,
  min_stock numeric(15,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (store_id, sku)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  phone text default '',
  email text default '',
  address text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  phone text default '',
  address text default '',
  created_at timestamptz not null default now()
);

-- status POS: 'lunas' | 'sebagian' | 'belum_lunas' | 'batal'
-- status online: 'menunggu' | 'diproses' | 'siap' | 'selesai' | 'batal'
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  invoice_no text not null,
  type text not null default 'pos' check (type in ('pos','online')),
  customer_id uuid references public.customers(id) on delete set null,
  buyer_id uuid references public.profiles(id) on delete set null, -- pembeli online (role user)
  payment_method text not null default 'cash' check (payment_method in ('cash','transfer','tempo')),
  subtotal numeric(15,2) not null default 0,
  discount numeric(15,2) not null default 0,
  grand_total numeric(15,2) not null default 0,
  paid_amount numeric(15,2) not null default 0,
  status text not null default 'lunas',
  note text default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists sales_store_created_idx on public.sales (store_id, created_at desc);

create table if not exists public.sales_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  qty numeric(15,2) not null,
  price numeric(15,2) not null,
  buy_price numeric(15,2) not null default 0, -- snapshot HPP saat transaksi
  discount numeric(15,2) not null default 0
);
create index if not exists sales_items_sale_idx on public.sales_items (sale_id);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  po_no text not null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  payment_method text not null default 'cash' check (payment_method in ('cash','transfer','tempo')),
  total numeric(15,2) not null default 0,
  paid_amount numeric(15,2) not null default 0,
  status text not null default 'lunas' check (status in ('lunas','sebagian','belum_lunas','batal')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid not null references public.products(id),
  qty numeric(15,2) not null,
  price numeric(15,2) not null
);

-- Kartu stok: semua pergerakan barang keluar/masuk
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id),
  type text not null check (type in ('sale','purchase','opname','return','cancel')),
  qty numeric(15,2) not null,             -- bertanda: + masuk, - keluar
  stock_before numeric(15,2) not null,
  stock_after numeric(15,2) not null,
  ref_id uuid,
  note text default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists stock_mov_product_idx on public.stock_movements (product_id, created_at desc);

-- Cicilan piutang (penjualan tempo)
create table if not exists public.receivable_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  amount numeric(15,2) not null,
  method text not null default 'cash',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Cicilan hutang (pembelian tempo)
create table if not exists public.payable_payments (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  amount numeric(15,2) not null,
  method text not null default 'cash',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 2. AKUNTANSI (COA, Jurnal, Buku Besar)
-- ============================================================================

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  code text not null,
  name text not null,
  type text not null check (type in ('asset','liability','equity','revenue','expense')),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (store_id, code)
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  entry_date date not null default current_date,
  ref_type text default '',   -- 'sale','purchase','receivable','payable','opname','manual'
  ref_id uuid,
  description text not null default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists journal_store_date_idx on public.journal_entries (store_id, entry_date desc);

create table if not exists public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id uuid not null references public.accounts(id),
  debit numeric(15,2) not null default 0,
  credit numeric(15,2) not null default 0
);
create index if not exists journal_lines_entry_idx on public.journal_lines (entry_id);

-- ============================================================================
-- 3. E-COMMERCE (rating & chat)
-- ============================================================================

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  review text default '',
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade, -- pihak pembeli
  sender_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_thread_idx on public.messages (store_id, customer_id, created_at);

-- Audit trail
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  user_id uuid references public.profiles(id),
  action text not null,        -- 'create','update','delete','sale','purchase','opname', dst.
  entity text not null,
  entity_id text default '',
  detail text default '',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 4. HELPER FUNCTIONS (dipakai RLS & RPC)
-- ============================================================================

create or replace function public.my_store_id() returns uuid
language sql stable security definer set search_path = public as $$
  select store_id from public.profiles where id = auth.uid()
$$;

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ============================================================================
-- 5. TRIGGER: user baru -> profile (+ store + COA default untuk akun bisnis)
-- ============================================================================

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_store_id uuid;
  v_type text := coalesce(new.raw_user_meta_data->>'account_type', 'user');
  v_name text := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1));
begin
  if v_type = 'bisnis' then
    insert into public.stores (name, owner_id)
      values (coalesce(nullif(new.raw_user_meta_data->>'store_name',''), 'Toko ' || v_name), new.id)
      returning id into v_store_id;
    insert into public.profiles (id, full_name, role, store_id)
      values (new.id, v_name, 'owner', v_store_id);
    -- Seed Chart of Accounts default
    insert into public.accounts (store_id, code, name, type, is_system) values
      (v_store_id, '101', 'Kas', 'asset', true),
      (v_store_id, '102', 'Bank', 'asset', true),
      (v_store_id, '103', 'Persediaan Barang', 'asset', true),
      (v_store_id, '104', 'Piutang Usaha', 'asset', true),
      (v_store_id, '201', 'Hutang Usaha', 'liability', true),
      (v_store_id, '301', 'Modal', 'equity', true),
      (v_store_id, '401', 'Penjualan', 'revenue', true),
      (v_store_id, '501', 'HPP (Harga Pokok Penjualan)', 'expense', true),
      (v_store_id, '601', 'Beban Operasional', 'expense', true),
      (v_store_id, '602', 'Penyesuaian Stok', 'expense', true);
  else
    insert into public.profiles (id, full_name, role) values (new.id, v_name, 'user');
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 6. JOURNAL POSTING HELPER
-- ============================================================================

create or replace function public.post_journal(
  p_store uuid, p_ref_type text, p_ref_id uuid, p_desc text,
  p_lines jsonb  -- [{code:'101', debit:100, credit:0}, ...]
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_entry uuid;
  v_line jsonb;
  v_acc uuid;
begin
  insert into public.journal_entries (store_id, ref_type, ref_id, description, created_by)
    values (p_store, p_ref_type, p_ref_id, p_desc, auth.uid())
    returning id into v_entry;
  for v_line in select * from jsonb_array_elements(p_lines) loop
    select id into v_acc from public.accounts
      where store_id = p_store and code = v_line->>'code';
    if v_acc is not null and (coalesce((v_line->>'debit')::numeric,0) > 0 or coalesce((v_line->>'credit')::numeric,0) > 0) then
      insert into public.journal_lines (entry_id, account_id, debit, credit)
        values (v_entry, v_acc,
                coalesce((v_line->>'debit')::numeric,0),
                coalesce((v_line->>'credit')::numeric,0));
    end if;
  end loop;
  return v_entry;
end;
$$;

-- ============================================================================
-- 7. RPC: TRANSAKSI POS (atomik: sale + items + potong stok + kartu stok + jurnal)
-- ============================================================================

create or replace function public.create_sale(
  p_items jsonb,           -- [{product_id, qty, price, discount}]
  p_payment_method text,   -- 'cash' | 'transfer' | 'tempo'
  p_discount numeric default 0,
  p_customer_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_store uuid; v_role text;
  v_sale uuid; v_invoice text;
  v_item jsonb;
  v_subtotal numeric := 0; v_hpp numeric := 0; v_total numeric;
  v_prod record;
  v_seq int;
begin
  v_store := public.my_store_id();
  v_role := public.my_role();
  if v_store is null or v_role not in ('owner','admin','kasir') then
    raise exception 'Akses ditolak';
  end if;
  if p_payment_method not in ('cash','transfer','tempo') then
    raise exception 'Metode bayar tidak valid';
  end if;

  -- validasi stok & hitung total
  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_prod from public.products
      where id = (v_item->>'product_id')::uuid and store_id = v_store for update;
    if not found then raise exception 'Produk tidak ditemukan'; end if;
    if v_prod.stock < (v_item->>'qty')::numeric then
      raise exception 'Stok % tidak cukup (sisa %)', v_prod.name, v_prod.stock;
    end if;
    v_subtotal := v_subtotal + ((v_item->>'qty')::numeric * (v_item->>'price')::numeric)
                 - coalesce((v_item->>'discount')::numeric, 0);
    v_hpp := v_hpp + (v_item->>'qty')::numeric * v_prod.buy_price;
  end loop;

  v_total := greatest(v_subtotal - coalesce(p_discount,0), 0);

  select count(*)+1 into v_seq from public.sales where store_id = v_store;
  v_invoice := 'INV-' || to_char(now(),'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0');

  insert into public.sales (store_id, invoice_no, type, customer_id, payment_method,
    subtotal, discount, grand_total, paid_amount, status, created_by)
  values (v_store, v_invoice, 'pos', p_customer_id, p_payment_method,
    v_subtotal, coalesce(p_discount,0), v_total,
    case when p_payment_method = 'tempo' then 0 else v_total end,
    case when p_payment_method = 'tempo' then 'belum_lunas' else 'lunas' end,
    auth.uid())
  returning id into v_sale;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_prod from public.products
      where id = (v_item->>'product_id')::uuid for update;
    insert into public.sales_items (sale_id, product_id, qty, price, buy_price, discount)
      values (v_sale, v_prod.id, (v_item->>'qty')::numeric, (v_item->>'price')::numeric,
              v_prod.buy_price, coalesce((v_item->>'discount')::numeric,0));
    update public.products set stock = stock - (v_item->>'qty')::numeric where id = v_prod.id;
    insert into public.stock_movements (store_id, product_id, type, qty, stock_before, stock_after, ref_id, note, created_by)
      values (v_store, v_prod.id, 'sale', -(v_item->>'qty')::numeric, v_prod.stock,
              v_prod.stock - (v_item->>'qty')::numeric, v_sale, 'Penjualan ' || v_invoice, auth.uid());
  end loop;

  -- Jurnal: Dr Kas/Bank/Piutang ; Cr Penjualan ; Dr HPP ; Cr Persediaan
  perform public.post_journal(v_store, 'sale', v_sale, 'Penjualan ' || v_invoice, jsonb_build_array(
    jsonb_build_object('code', case p_payment_method when 'cash' then '101' when 'transfer' then '102' else '104' end, 'debit', v_total),
    jsonb_build_object('code', '401', 'credit', v_total),
    jsonb_build_object('code', '501', 'debit', v_hpp),
    jsonb_build_object('code', '103', 'credit', v_hpp)
  ));

  insert into public.audit_logs (store_id, user_id, action, entity, entity_id, detail)
    values (v_store, auth.uid(), 'sale', 'sales', v_sale::text, v_invoice || ' Rp' || v_total);
  return v_sale;
end;
$$;

-- ============================================================================
-- 8. RPC: ORDER ONLINE (dari storefront oleh pembeli)
-- ============================================================================

create or replace function public.create_online_order(
  p_store_id uuid, p_items jsonb, p_note text default ''
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_sale uuid; v_invoice text; v_item jsonb;
  v_subtotal numeric := 0; v_prod record; v_seq int;
begin
  if auth.uid() is null then raise exception 'Harus login'; end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_prod from public.products
      where id = (v_item->>'product_id')::uuid and store_id = p_store_id and is_active for update;
    if not found then raise exception 'Produk tidak ditemukan'; end if;
    if v_prod.stock < (v_item->>'qty')::numeric then
      raise exception 'Stok % tidak cukup', v_prod.name;
    end if;
    v_subtotal := v_subtotal + (v_item->>'qty')::numeric * v_prod.sell_price;
  end loop;

  select count(*)+1 into v_seq from public.sales where store_id = p_store_id;
  v_invoice := 'ORD-' || to_char(now(),'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0');

  insert into public.sales (store_id, invoice_no, type, buyer_id, payment_method,
    subtotal, discount, grand_total, paid_amount, status, note, created_by)
  values (p_store_id, v_invoice, 'online', auth.uid(), 'transfer',
    v_subtotal, 0, v_subtotal, 0, 'menunggu', p_note, auth.uid())
  returning id into v_sale;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_prod from public.products where id = (v_item->>'product_id')::uuid;
    insert into public.sales_items (sale_id, product_id, qty, price, buy_price)
      values (v_sale, v_prod.id, (v_item->>'qty')::numeric, v_prod.sell_price, v_prod.buy_price);
  end loop;
  return v_sale;
end;
$$;

-- Ubah status order online: diproses (potong stok + jurnal), siap, selesai, batal
create or replace function public.set_order_status(p_sale_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_sale record; v_item record; v_prod record; v_hpp numeric := 0;
begin
  select * into v_sale from public.sales where id = p_sale_id and type = 'online' for update;
  if not found or v_sale.store_id is distinct from public.my_store_id() then
    raise exception 'Order tidak ditemukan';
  end if;
  if public.my_role() not in ('owner','admin','kasir') then raise exception 'Akses ditolak'; end if;
  if p_status not in ('diproses','siap','selesai','batal') then raise exception 'Status tidak valid'; end if;

  if p_status = 'diproses' and v_sale.status = 'menunggu' then
    -- potong stok + jurnal (baru di titik ini stok benar-benar keluar)
    for v_item in select * from public.sales_items where sale_id = v_sale.id loop
      select * into v_prod from public.products where id = v_item.product_id for update;
      if v_prod.stock < v_item.qty then raise exception 'Stok % tidak cukup', v_prod.name; end if;
      update public.products set stock = stock - v_item.qty where id = v_prod.id;
      insert into public.stock_movements (store_id, product_id, type, qty, stock_before, stock_after, ref_id, note, created_by)
        values (v_sale.store_id, v_prod.id, 'sale', -v_item.qty, v_prod.stock, v_prod.stock - v_item.qty,
                v_sale.id, 'Order online ' || v_sale.invoice_no, auth.uid());
      v_hpp := v_hpp + v_item.qty * v_item.buy_price;
    end loop;
    update public.sales set paid_amount = grand_total where id = v_sale.id;
    perform public.post_journal(v_sale.store_id, 'sale', v_sale.id, 'Order online ' || v_sale.invoice_no, jsonb_build_array(
      jsonb_build_object('code','102','debit', v_sale.grand_total),
      jsonb_build_object('code','401','credit', v_sale.grand_total),
      jsonb_build_object('code','501','debit', v_hpp),
      jsonb_build_object('code','103','credit', v_hpp)
    ));
  elsif p_status = 'batal' and v_sale.status in ('diproses','siap') then
    -- kembalikan stok + jurnal pembalik
    for v_item in select * from public.sales_items where sale_id = v_sale.id loop
      select * into v_prod from public.products where id = v_item.product_id for update;
      update public.products set stock = stock + v_item.qty where id = v_prod.id;
      insert into public.stock_movements (store_id, product_id, type, qty, stock_before, stock_after, ref_id, note, created_by)
        values (v_sale.store_id, v_prod.id, 'cancel', v_item.qty, v_prod.stock, v_prod.stock + v_item.qty,
                v_sale.id, 'Batal order ' || v_sale.invoice_no, auth.uid());
      v_hpp := v_hpp + v_item.qty * v_item.buy_price;
    end loop;
    update public.sales set paid_amount = 0 where id = v_sale.id;
    perform public.post_journal(v_sale.store_id, 'cancel', v_sale.id, 'Pembatalan ' || v_sale.invoice_no, jsonb_build_array(
      jsonb_build_object('code','401','debit', v_sale.grand_total),
      jsonb_build_object('code','102','credit', v_sale.grand_total),
      jsonb_build_object('code','103','debit', v_hpp),
      jsonb_build_object('code','501','credit', v_hpp)
    ));
  end if;

  update public.sales set status = p_status where id = v_sale.id;
end;
$$;

-- ============================================================================
-- 9. RPC: PEMBELIAN (restock, moving average HPP, hutang)
-- ============================================================================

create or replace function public.create_purchase(
  p_items jsonb,            -- [{product_id, qty, price}]
  p_supplier_id uuid default null,
  p_payment_method text default 'cash'  -- 'cash'|'transfer'|'tempo'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_store uuid; v_po uuid; v_po_no text;
  v_item jsonb; v_prod record; v_total numeric := 0; v_seq int;
  v_new_avg numeric;
begin
  v_store := public.my_store_id();
  if v_store is null or public.my_role() not in ('owner','admin') then
    raise exception 'Akses ditolak (kasir tidak bisa input pembelian)';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_total := v_total + (v_item->>'qty')::numeric * (v_item->>'price')::numeric;
  end loop;

  select count(*)+1 into v_seq from public.purchases where store_id = v_store;
  v_po_no := 'PO-' || to_char(now(),'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0');

  insert into public.purchases (store_id, po_no, supplier_id, payment_method, total, paid_amount, status, created_by)
  values (v_store, v_po_no, p_supplier_id, p_payment_method, v_total,
    case when p_payment_method = 'tempo' then 0 else v_total end,
    case when p_payment_method = 'tempo' then 'belum_lunas' else 'lunas' end,
    auth.uid())
  returning id into v_po;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_prod from public.products
      where id = (v_item->>'product_id')::uuid and store_id = v_store for update;
    if not found then raise exception 'Produk tidak ditemukan'; end if;
    insert into public.purchase_items (purchase_id, product_id, qty, price)
      values (v_po, v_prod.id, (v_item->>'qty')::numeric, (v_item->>'price')::numeric);
    -- Moving average HPP: (stok_lama*hpp_lama + qty*harga_beli) / (stok_lama + qty)
    if (v_prod.stock + (v_item->>'qty')::numeric) > 0 then
      v_new_avg := (v_prod.stock * v_prod.buy_price
                    + (v_item->>'qty')::numeric * (v_item->>'price')::numeric)
                   / (v_prod.stock + (v_item->>'qty')::numeric);
    else
      v_new_avg := (v_item->>'price')::numeric;
    end if;
    update public.products
      set stock = stock + (v_item->>'qty')::numeric, buy_price = round(v_new_avg, 2)
      where id = v_prod.id;
    insert into public.stock_movements (store_id, product_id, type, qty, stock_before, stock_after, ref_id, note, created_by)
      values (v_store, v_prod.id, 'purchase', (v_item->>'qty')::numeric, v_prod.stock,
              v_prod.stock + (v_item->>'qty')::numeric, v_po, 'Pembelian ' || v_po_no, auth.uid());
  end loop;

  perform public.post_journal(v_store, 'purchase', v_po, 'Pembelian ' || v_po_no, jsonb_build_array(
    jsonb_build_object('code','103','debit', v_total),
    jsonb_build_object('code', case p_payment_method when 'cash' then '101' when 'transfer' then '102' else '201' end, 'credit', v_total)
  ));

  insert into public.audit_logs (store_id, user_id, action, entity, entity_id, detail)
    values (v_store, auth.uid(), 'purchase', 'purchases', v_po::text, v_po_no || ' Rp' || v_total);
  return v_po;
end;
$$;

-- ============================================================================
-- 10. RPC: STOK OPNAME / PENYESUAIAN
-- ============================================================================

create or replace function public.adjust_stock(
  p_product_id uuid, p_new_stock numeric, p_note text default ''
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_store uuid; v_prod record; v_diff numeric; v_value numeric;
begin
  v_store := public.my_store_id();
  if v_store is null or public.my_role() not in ('owner','admin') then
    raise exception 'Akses ditolak';
  end if;
  select * into v_prod from public.products where id = p_product_id and store_id = v_store for update;
  if not found then raise exception 'Produk tidak ditemukan'; end if;
  if p_new_stock < 0 then raise exception 'Stok tidak boleh minus'; end if;

  v_diff := p_new_stock - v_prod.stock;
  if v_diff = 0 then return; end if;
  v_value := abs(v_diff) * v_prod.buy_price;

  update public.products set stock = p_new_stock where id = v_prod.id;
  insert into public.stock_movements (store_id, product_id, type, qty, stock_before, stock_after, note, created_by)
    values (v_store, v_prod.id, 'opname', v_diff, v_prod.stock, p_new_stock, p_note, auth.uid());

  -- Selisih kurang: Dr Penyesuaian Stok, Cr Persediaan. Selisih lebih: sebaliknya.
  if v_diff < 0 then
    perform public.post_journal(v_store, 'opname', v_prod.id, 'Stok opname: ' || v_prod.name, jsonb_build_array(
      jsonb_build_object('code','602','debit', v_value),
      jsonb_build_object('code','103','credit', v_value)
    ));
  else
    perform public.post_journal(v_store, 'opname', v_prod.id, 'Stok opname: ' || v_prod.name, jsonb_build_array(
      jsonb_build_object('code','103','debit', v_value),
      jsonb_build_object('code','602','credit', v_value)
    ));
  end if;
  insert into public.audit_logs (store_id, user_id, action, entity, entity_id, detail)
    values (v_store, auth.uid(), 'opname', 'products', v_prod.id::text,
            v_prod.name || ': ' || v_prod.stock || ' -> ' || p_new_stock || ' (' || p_note || ')');
end;
$$;

-- ============================================================================
-- 11. RPC: PEMBAYARAN PIUTANG & HUTANG (cicilan)
-- ============================================================================

create or replace function public.pay_receivable(p_sale_id uuid, p_amount numeric, p_method text default 'cash') returns void
language plpgsql security definer set search_path = public as $$
declare v_sale record;
begin
  select * into v_sale from public.sales where id = p_sale_id and store_id = public.my_store_id() for update;
  if not found then raise exception 'Piutang tidak ditemukan'; end if;
  if public.my_role() not in ('owner','admin','kasir') then raise exception 'Akses ditolak'; end if;
  if p_amount <= 0 or v_sale.paid_amount + p_amount > v_sale.grand_total then
    raise exception 'Nominal tidak valid';
  end if;
  insert into public.receivable_payments (sale_id, amount, method, created_by)
    values (p_sale_id, p_amount, p_method, auth.uid());
  update public.sales set paid_amount = paid_amount + p_amount,
    status = case when paid_amount + p_amount >= grand_total then 'lunas' else 'sebagian' end
    where id = p_sale_id;
  perform public.post_journal(v_sale.store_id, 'receivable', p_sale_id,
    'Pelunasan piutang ' || v_sale.invoice_no, jsonb_build_array(
    jsonb_build_object('code', case p_method when 'transfer' then '102' else '101' end, 'debit', p_amount),
    jsonb_build_object('code','104','credit', p_amount)
  ));
end;
$$;

create or replace function public.pay_payable(p_purchase_id uuid, p_amount numeric, p_method text default 'cash') returns void
language plpgsql security definer set search_path = public as $$
declare v_p record;
begin
  select * into v_p from public.purchases where id = p_purchase_id and store_id = public.my_store_id() for update;
  if not found then raise exception 'Hutang tidak ditemukan'; end if;
  if public.my_role() not in ('owner','admin') then raise exception 'Akses ditolak'; end if;
  if p_amount <= 0 or v_p.paid_amount + p_amount > v_p.total then raise exception 'Nominal tidak valid'; end if;
  insert into public.payable_payments (purchase_id, amount, method, created_by)
    values (p_purchase_id, p_amount, p_method, auth.uid());
  update public.purchases set paid_amount = paid_amount + p_amount,
    status = case when paid_amount + p_amount >= total then 'lunas' else 'sebagian' end
    where id = p_purchase_id;
  perform public.post_journal(v_p.store_id, 'payable', p_purchase_id,
    'Pelunasan hutang ' || v_p.po_no, jsonb_build_array(
    jsonb_build_object('code','201','debit', p_amount),
    jsonb_build_object('code', case p_method when 'transfer' then '102' else '101' end, 'credit', p_amount)
  ));
end;
$$;

-- ============================================================================
-- 12. RPC: JURNAL MANUAL (Jurnal Umum / Penyesuaian)
-- ============================================================================

create or replace function public.create_manual_journal(
  p_desc text, p_lines jsonb, p_date date default current_date
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_store uuid; v_entry uuid; v_line jsonb; v_acc uuid;
  v_debit numeric := 0; v_credit numeric := 0;
begin
  v_store := public.my_store_id();
  if v_store is null or public.my_role() not in ('owner','admin') then
    raise exception 'Akses ditolak';
  end if;
  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_debit := v_debit + coalesce((v_line->>'debit')::numeric, 0);
    v_credit := v_credit + coalesce((v_line->>'credit')::numeric, 0);
  end loop;
  if v_debit = 0 or v_debit <> v_credit then
    raise exception 'Jurnal tidak balance (debit % vs kredit %)', v_debit, v_credit;
  end if;

  insert into public.journal_entries (store_id, entry_date, ref_type, description, created_by)
    values (v_store, p_date, 'manual', p_desc, auth.uid()) returning id into v_entry;
  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_acc := (v_line->>'account_id')::uuid;
    if coalesce((v_line->>'debit')::numeric,0) > 0 or coalesce((v_line->>'credit')::numeric,0) > 0 then
      insert into public.journal_lines (entry_id, account_id, debit, credit)
        values (v_entry, v_acc, coalesce((v_line->>'debit')::numeric,0), coalesce((v_line->>'credit')::numeric,0));
    end if;
  end loop;
  return v_entry;
end;
$$;

-- ============================================================================
-- 13. VIEWS LAPORAN
-- ============================================================================

-- Laba Rugi per toko
create or replace view public.v_laba_rugi as
select
  a.store_id,
  sum(case when a.type = 'revenue' then jl.credit - jl.debit else 0 end) as pendapatan,
  sum(case when a.code = '501' then jl.debit - jl.credit else 0 end) as hpp,
  sum(case when a.type = 'expense' and a.code <> '501' then jl.debit - jl.credit else 0 end) as beban
from public.journal_lines jl
join public.accounts a on a.id = jl.account_id
group by a.store_id;

-- Nilai persediaan per toko
create or replace view public.v_nilai_stok as
select store_id, sum(stock * buy_price) as nilai_stok,
  count(*) filter (where stock <= min_stock and is_active) as produk_menipis
from public.products group by store_id;

-- ============================================================================
-- 14. ROW LEVEL SECURITY
-- ============================================================================

alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.sales enable row level security;
alter table public.sales_items enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.receivable_payments enable row level security;
alter table public.payable_payments enable row level security;
alter table public.accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;
alter table public.ratings enable row level security;
alter table public.messages enable row level security;
alter table public.audit_logs enable row level security;

-- stores: publik bisa baca (untuk etalase), owner bisa update
create policy stores_select on public.stores for select using (true);
create policy stores_update on public.stores for update using (owner_id = auth.uid());

-- profiles: baca diri sendiri + anggota satu toko
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or (store_id is not null and store_id = public.my_store_id()));
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- products: publik baca yang aktif; anggota toko baca semua; tulis owner/admin; hapus owner
create policy products_public_select on public.products for select
  using (is_active or store_id = public.my_store_id());
create policy products_insert on public.products for insert
  with check (store_id = public.my_store_id() and public.my_role() in ('owner','admin'));
create policy products_update on public.products for update
  using (store_id = public.my_store_id() and public.my_role() in ('owner','admin'));
create policy products_delete on public.products for delete
  using (store_id = public.my_store_id() and public.my_role() = 'owner');

-- categories/customers/suppliers: anggota toko; hapus hanya owner
create policy categories_select on public.categories for select using (store_id = public.my_store_id());
create policy categories_insert on public.categories for insert
  with check (store_id = public.my_store_id() and public.my_role() in ('owner','admin'));
create policy categories_update on public.categories for update
  using (store_id = public.my_store_id() and public.my_role() in ('owner','admin'));
create policy categories_delete on public.categories for delete
  using (store_id = public.my_store_id() and public.my_role() = 'owner');

create policy customers_select on public.customers for select using (store_id = public.my_store_id());
create policy customers_insert on public.customers for insert
  with check (store_id = public.my_store_id() and public.my_role() in ('owner','admin','kasir'));
create policy customers_update on public.customers for update
  using (store_id = public.my_store_id() and public.my_role() in ('owner','admin'));
create policy customers_delete on public.customers for delete
  using (store_id = public.my_store_id() and public.my_role() = 'owner');

create policy suppliers_select on public.suppliers for select using (store_id = public.my_store_id());
create policy suppliers_insert on public.suppliers for insert
  with check (store_id = public.my_store_id() and public.my_role() in ('owner','admin'));
create policy suppliers_update on public.suppliers for update
  using (store_id = public.my_store_id() and public.my_role() in ('owner','admin'));
create policy suppliers_delete on public.suppliers for delete
  using (store_id = public.my_store_id() and public.my_role() = 'owner');

-- sales: anggota toko baca; pembeli online baca miliknya
create policy sales_select on public.sales for select
  using (store_id = public.my_store_id() or buyer_id = auth.uid());
create policy sales_items_select on public.sales_items for select
  using (exists (select 1 from public.sales s where s.id = sale_id
    and (s.store_id = public.my_store_id() or s.buyer_id = auth.uid())));

-- purchases & movements: anggota toko (tulis lewat RPC security definer)
create policy purchases_select on public.purchases for select using (store_id = public.my_store_id());
create policy purchase_items_select on public.purchase_items for select
  using (exists (select 1 from public.purchases p where p.id = purchase_id and p.store_id = public.my_store_id()));
create policy movements_select on public.stock_movements for select using (store_id = public.my_store_id());
create policy recv_pay_select on public.receivable_payments for select
  using (exists (select 1 from public.sales s where s.id = sale_id and s.store_id = public.my_store_id()));
create policy pay_pay_select on public.payable_payments for select
  using (exists (select 1 from public.purchases p where p.id = purchase_id and p.store_id = public.my_store_id()));

-- akuntansi: hanya owner & admin (kasir TIDAK bisa lihat modal & laba)
create policy accounts_select on public.accounts for select
  using (store_id = public.my_store_id() and public.my_role() in ('owner','admin'));
create policy accounts_insert on public.accounts for insert
  with check (store_id = public.my_store_id() and public.my_role() in ('owner','admin'));
create policy accounts_update on public.accounts for update
  using (store_id = public.my_store_id() and public.my_role() in ('owner','admin'));
create policy accounts_delete on public.accounts for delete
  using (store_id = public.my_store_id() and public.my_role() = 'owner' and is_system = false);

create policy journal_select on public.journal_entries for select
  using (store_id = public.my_store_id() and public.my_role() in ('owner','admin'));
create policy journal_lines_select on public.journal_lines for select
  using (exists (select 1 from public.journal_entries je where je.id = entry_id
    and je.store_id = public.my_store_id() and public.my_role() in ('owner','admin')));

-- ratings: publik baca; user login tulis/ubah miliknya
create policy ratings_select on public.ratings for select using (true);
create policy ratings_insert on public.ratings for insert with check (user_id = auth.uid());
create policy ratings_update on public.ratings for update using (user_id = auth.uid());
create policy ratings_delete on public.ratings for delete using (user_id = auth.uid());

-- messages: anggota toko atau pembeli terkait
create policy messages_select on public.messages for select
  using (store_id = public.my_store_id() or customer_id = auth.uid());
create policy messages_insert on public.messages for insert
  with check (sender_id = auth.uid() and (customer_id = auth.uid() or store_id = public.my_store_id()));

-- audit logs: owner & admin
create policy audit_select on public.audit_logs for select
  using (store_id = public.my_store_id() and public.my_role() in ('owner','admin'));

-- ============================================================================
-- 15. SEED CONTOH (opsional — hapus bagian ini kalau tidak mau data demo)
-- Produk contoh hanya dibuat lewat UI setelah register akun bisnis.
-- ============================================================================
