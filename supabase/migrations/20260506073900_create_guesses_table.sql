create extension if not exists pgcrypto;

create table if not exists public.guesses (
  id uuid primary key default gen_random_uuid(),
  member_key text not null unique,
  member_name text not null,
  lat double precision not null,
  lng double precision not null,
  distance_km double precision not null,
  score integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guesses_score_distance_idx
  on public.guesses (score desc, distance_km asc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists guesses_set_updated_at on public.guesses;
create trigger guesses_set_updated_at
before update on public.guesses
for each row
execute function public.set_updated_at();

alter table public.guesses enable row level security;
