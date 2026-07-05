-- Adds a free-text notes field to shipments.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

alter table public.shipments add column notes text;
