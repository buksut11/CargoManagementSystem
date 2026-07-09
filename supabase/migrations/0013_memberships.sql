-- SaaS Phase 1 (2/5): memberships + the tenancy helper functions.
-- A membership links a user to an organization with a per-org role. This
-- replaces the global profiles.role as the source of authorization (the app
-- keeps reading profiles.role until Phase 2, so nothing breaks yet).
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

create table public.memberships (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null default 'agent'
    check (role in ('owner', 'admin', 'agent')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create index memberships_user_id_idx on public.memberships (user_id);

alter table public.memberships enable row level security;

-- ── Tenancy helper functions ───────────────────────────────────────────────
-- SECURITY DEFINER so they run as the table owner and are NOT themselves
-- filtered by RLS — this is what lets policies query memberships without
-- infinite recursion (same pattern as the existing is_admin()).

-- The caller's "current" organization. With a single membership (the common
-- case) it is simply that org; multi-org users get an explicit switcher in a
-- later phase. Used by the auto-fill triggers in 0015.
create function public.current_org()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id
  from public.memberships
  where user_id = auth.uid()
  order by created_at
  limit 1;
$$;

-- Is the caller a member of this organization at all?
create function public.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid() and org_id = p_org
  );
$$;

-- Does the caller have write authority (owner/admin) in this organization?
create function public.is_org_admin(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid()
      and org_id = p_org
      and role in ('owner', 'admin')
  );
$$;
