create table if not exists public.game_settings (
  key text primary key,
  target_lat double precision not null,
  target_lng double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists game_settings_set_updated_at on public.game_settings;
create trigger game_settings_set_updated_at
before update on public.game_settings
for each row
execute function public.set_updated_at();

alter table public.game_settings enable row level security;
