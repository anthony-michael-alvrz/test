-- ============================================================================
-- Guest Guide — dashboard backend schema
-- Paste this whole file into the Supabase SQL editor and run it once.
-- ============================================================================

-- One row per rental unit, owned by a dashboard (property-owner) login.
-- `content` holds the exact config.json shape the tablet already reads, so no
-- data re-modeling is needed. `version` increments on each publish.
create table if not exists public.properties (
  id            uuid primary key default gen_random_uuid(),
  public_id     text not null unique default replace(gen_random_uuid()::text, '-', ''),
  owner_user_id uuid not null references auth.users (id),
  version       int  not null default 0,
  content       jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now()
);

-- Row-Level Security: this is what isolates one customer from another.
-- Without these policies, a logged-in user can touch only rows they own.
alter table public.properties enable row level security;

create policy "owner can read own properties"
  on public.properties for select
  using (owner_user_id = auth.uid());

create policy "owner can update own properties"
  on public.properties for update
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- NOTE: there is deliberately NO insert policy for customers. Properties are
-- provisioned only by the operator, using the service-role key (see
-- scripts/provision.mjs), which bypasses RLS entirely. A logged-in customer
-- can read and edit only the property assigned to them, never create one.

-- Keep updated_at current on every change.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists properties_touch on public.properties;
create trigger properties_touch
  before update on public.properties
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- Storage: the published JSON the tablet fetches. Public-read bucket.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('published', 'published', true)
on conflict (id) do nothing;

-- Public read is granted by the bucket being public (getPublicUrl works).
-- Writes are limited to authenticated users. NOTE: for this prototype any
-- authenticated user may write to the bucket; tighten to per-property paths
-- before real multi-customer use.
create policy "authenticated can upload published"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'published');

create policy "authenticated can update published"
  on storage.objects for update to authenticated
  using (bucket_id = 'published')
  with check (bucket_id = 'published');
