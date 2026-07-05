# CargoBook — personal cargo tracker

A simple, single-user app to track your cargo shipments and get paid:

- **Shipments** — description, weight (kg), destination, status (pending → shipped → delivered), price (either weight × rate-per-kg, or a manual total)
- **Destinations** — your own list of the places you ship to
- **Invoices** — group uninvoiced shipments into an invoice, with a clean **printable view** (Print / Save as PDF from the browser)
- **Payments** — record payments against invoices, see paid / partial / unpaid status and remaining balances
- **Dashboard** — total shipments, total kg, invoiced amount, outstanding balance

Built with Next.js + Tailwind CSS, data stored in [Supabase](https://supabase.com) (free tier is plenty).

## One-time setup (~10 minutes)

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free account → New project).
2. **Create the database tables:** in the Supabase dashboard open **SQL Editor**, paste the contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and click **Run**.
3. **Create your login user:** dashboard → **Authentication → Users → Add user** — enter your email and a password (tick "Auto confirm user").
4. **Connect the app:** copy `.env.example` to `.env.local`, then fill in the two values from dashboard → **Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL` — the Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the `anon` / `public` key

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the user you created in step 3.

## Everyday flow

1. Add your **destinations** once (Destinations page).
2. Add a **shipment**: description, kg, destination, and either a rate per kg (total is computed) or type the total yourself.
3. When it's time to bill, create an **invoice**: pick the uninvoiced shipments, click **Print** for a PDF to send.
4. When money arrives, open the invoice and **record the payment** — the balance and paid/partial/unpaid badge update automatically.

## Tweaks

- **Currency:** edit `CURRENCY` in [`lib/format.ts`](lib/format.ts) (default `USD`).
- The old full airline-operations spec and build plans were removed; see git history on `main` if you ever want them back.
