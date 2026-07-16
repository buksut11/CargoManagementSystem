-- Contact us — stores messages sent from the public /contact page form.
-- The page is reachable without signing in, so inserts are open to the anon
-- role but tightly checked (every field required, sane length caps). There is
-- deliberately NO select/update/delete policy: submitted messages are only
-- readable with the service role (Supabase dashboard → Table Editor), so a
-- visitor can never list other people's messages.
-- Written idempotently so a partially-applied run can be re-run safely.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

create table if not exists public.contact_messages (
  id         bigint generated always as identity primary key,
  name       text not null,
  phone      text not null,
  email      text not null,
  message    text not null,
  created_at timestamptz not null default now(),
  -- Keep junk out even if someone posts straight to the API: nothing blank,
  -- nothing absurdly long, and the email must at least look like one.
  constraint contact_messages_name_len    check (char_length(btrim(name))    between 1 and 200),
  constraint contact_messages_phone_len   check (char_length(btrim(phone))   between 4 and 40),
  constraint contact_messages_email_shape check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and char_length(email) <= 320),
  constraint contact_messages_message_len check (char_length(btrim(message)) between 1 and 5000)
);

create index if not exists contact_messages_created_idx
  on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

drop policy if exists "anyone can send a contact message" on public.contact_messages;
create policy "anyone can send a contact message" on public.contact_messages
  for insert to anon, authenticated
  with check (true);
