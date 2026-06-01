-- =============================================
-- Arrifana Surf Academy · Schema Supabase
-- Executar no SQL Editor do Supabase
-- =============================================

-- Tabela de marcações
create table if not exists public.bookings (
  id            uuid          default gen_random_uuid() primary key,
  created_at    timestamptz   default now(),
  school_id     text          not null default 'arrifana-surf-academy',
  lesson_type   text          not null,
  booking_date  date          not null,
  booking_time  text          not null,
  num_people    int           not null default 1 check (num_people >= 1 and num_people <= 6),
  client_name   text          not null,
  client_phone  text          not null,
  client_email  text,
  notes         text,
  status        text          not null default 'pending'
                              check (status in ('pending','confirmed','completed','cancelled')),
  total_price   numeric(10,2) not null,
  language      text          default 'pt',
  booking_ref   serial
);

-- Índices
create index if not exists idx_bookings_date   on public.bookings(booking_date);
create index if not exists idx_bookings_status on public.bookings(status);
create index if not exists idx_bookings_school on public.bookings(school_id);

-- Row Level Security
alter table public.bookings enable row level security;

-- Qualquer pessoa pode inserir (formulário público)
create policy "bookings_insert_public"
  on public.bookings for insert
  to anon, authenticated
  with check (true);

-- Só autenticados podem ver
create policy "bookings_select_auth"
  on public.bookings for select
  to authenticated
  using (true);

-- Só autenticados podem actualizar
create policy "bookings_update_auth"
  on public.bookings for update
  to authenticated
  using (true)
  with check (true);

-- Função pública: disponibilidade por data (sem dados pessoais)
create or replace function public.get_slot_availability(p_date date)
returns table (slot_time text, booked_people int)
language sql security definer set search_path = public
as $$
  select
    booking_time as slot_time,
    coalesce(sum(num_people), 0)::int as booked_people
  from public.bookings
  where booking_date = p_date
    and status != 'cancelled'
  group by booking_time;
$$;

grant execute on function public.get_slot_availability(date) to anon, authenticated;
