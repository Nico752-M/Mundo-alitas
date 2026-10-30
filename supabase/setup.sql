-- Mundo Alitas MVP: tabla de participantes y función atómica de canje.
-- Ejecuta este archivo completo en Supabase > SQL Editor > New query.

create extension if not exists pgcrypto;

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 3 and 100),
  whatsapp text not null check (char_length(whatsapp) between 7 and 20),
  instagram text not null check (char_length(instagram) between 2 and 40),
  gift text not null check (gift in ('colanta', 'papitas', 'bebida')),
  qr_token uuid not null unique default gen_random_uuid(),
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists participants_created_at_idx
  on public.participants (created_at desc);

create index if not exists participants_redeemed_at_idx
  on public.participants (redeemed_at);

alter table public.participants enable row level security;

-- No se crean políticas públicas. El frontend nunca accede directamente a esta tabla.
-- Las rutas del servidor usan SUPABASE_SERVICE_ROLE_KEY, que no debe exponerse al navegador.

create or replace function public.redeem_participant(p_qr_token uuid)
returns table (
  status text,
  full_name text,
  whatsapp text,
  instagram text,
  gift text,
  redeemed_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.participants%rowtype;
  existing_row public.participants%rowtype;
begin
  update public.participants
     set redeemed_at = now()
   where qr_token = p_qr_token
     and redeemed_at is null
  returning * into updated_row;

  if found then
    return query select
      'redeemed'::text,
      updated_row.full_name,
      updated_row.whatsapp,
      updated_row.instagram,
      updated_row.gift,
      updated_row.redeemed_at,
      updated_row.created_at;
    return;
  end if;

  select * into existing_row
    from public.participants
   where qr_token = p_qr_token;

  if not found then
    return query select
      'not_found'::text,
      null::text, null::text, null::text, null::text,
      null::timestamptz, null::timestamptz;
    return;
  end if;

  return query select
    'already_redeemed'::text,
    existing_row.full_name,
    existing_row.whatsapp,
    existing_row.instagram,
    existing_row.gift,
    existing_row.redeemed_at,
    existing_row.created_at;
end;
$$;

revoke all on function public.redeem_participant(uuid) from public, anon, authenticated;
grant execute on function public.redeem_participant(uuid) to service_role;

-- No habilites acceso público a la tabla ni compartas la clave service_role.
