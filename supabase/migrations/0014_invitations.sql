-- SaaS Phase 1 (3/5): invitations (invite-only onboarding).
-- Rows here are created by org admins and redeemed by invitees in Phase 3
-- (via a server-side route handler using the service-role key). The table is
-- defined now so the tenancy foundation is complete; it stays unused until
-- the onboarding phase.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  email       text not null,
  role        text not null default 'agent' check (role in ('admin', 'agent')),
  token       text not null unique,
  invited_by  uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  created_at  timestamptz not null default now()
);

create index invitations_org_id_idx on public.invitations (org_id);
create index invitations_email_idx on public.invitations (lower(email));

alter table public.invitations enable row level security;
