-- Sqiushy shop desk
-- Run this file in the Supabase SQL editor (or as a migration).
--
-- The safety line is fixed in the app and is intentionally not a column:
-- "Not edible. Contains toxic materials. Keep away from children and pets."
-- Do not add product copy that calls these toys edible or safe to put on or in the body.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  flavour text not null default '',
  size text not null default '',
  colour text not null default '',
  image_path text not null default '',
  stock_count integer not null default 0 check (stock_count >= 0),
  cost numeric(12, 2) not null default 0 check (cost >= 0),
  price numeric(12, 2) not null default 0 check (price >= 0),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  phone text not null default '',
  email text not null default '',
  channel text not null check (channel in ('Shopee', 'Instagram', 'TikTok Shop', 'In person', 'Other')),
  notes text not null default '',
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete restrict,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  fulfilment_status text not null default 'pending' check (fulfilment_status in ('pending', 'packed', 'shipped', 'delivered', 'cancelled')),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null check (char_length(trim(product_name)) > 0),
  flavour text not null default '',
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create index products_name_idx on public.products (name);
create index customers_name_idx on public.customers (name);
create index orders_customer_id_idx on public.orders (customer_id);
create index orders_created_at_idx on public.orders (created_at desc);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

comment on table public.products is
  'Novelty squishy toys. Safety wording is fixed in the app and is not editable here.';

alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on public.products from public, anon;
revoke all on public.customers from public, anon;
revoke all on public.orders from public, anon;
revoke all on public.order_items from public, anon;

grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;

create policy products_authenticated_all
  on public.products
  for all
  to authenticated
  using (true)
  with check (true);

create policy customers_authenticated_all
  on public.customers
  for all
  to authenticated
  using (true)
  with check (true);

create policy orders_authenticated_all
  on public.orders
  for all
  to authenticated
  using (true)
  with check (true);

create policy order_items_authenticated_all
  on public.order_items
  for all
  to authenticated
  using (true)
  with check (true);
