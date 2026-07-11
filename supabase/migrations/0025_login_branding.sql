-- Login-page branding lookup.
-- The login screen is pre-auth, and organizations is deny-all for anon, so a
-- branded login link (/login?org={slug}) needs a narrow, safe way to resolve
-- an org's display name and logo before sign-in. This security-definer
-- function exposes exactly those two fields, keyed by the org's public slug —
-- nothing else on the row (plan, billing ids, contact details) leaks.
-- The logo itself is already publicly readable: the org-logos bucket is
-- public (migration 0021) so the stored logo_url renders for anon visitors.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

create or replace function public.login_branding(org_slug text)
returns table (name text, logo_url text)
language sql
security definer
set search_path = public
stable
as $$
  select o.name, o.logo_url
  from public.organizations o
  where o.slug = org_slug;
$$;

revoke all on function public.login_branding(text) from public;
grant execute on function public.login_branding(text) to anon, authenticated;
