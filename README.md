# CargoBook — cargo tracker

A simple app to track your cargo shipments and get paid:

- **Shipments** — description, weight (kg), destination, status (pending → shipped → delivered), price (either weight × rate-per-kg, or a manual total), and an optional **attachment image** (a photo of the parcel or receipt) that admins upload and agents can view
- **Destinations** — your own list of the places you ship to
- **Invoices** — group uninvoiced shipments into an invoice, with a clean **printable view** (Print / Save as PDF from the browser); each shipment also has its own **printable receipt** with signature lines
- **CSV export** — download your shipments and payments for Excel / Google Sheets
- **Payments** — record payments against invoices, see paid / partial / unpaid status and remaining balances
- **Expenses & profit** — record what each delivery cost you (airplane, car, motorcycle, or any type you add yourself via the dropdown's "➕ Add new type…"); the app subtracts those costs from the customer's price to show the **net profit per shipment** and overall
- **Dashboard** — total shipments, total kg, invoiced amount, outstanding balance, expenses, net profit
- **Admin & Agent roles** — admins have full access; agents see the shipments list and details (item, who it's billed to, and the total price) and can only update the shipment status and notes
- **Audit trail** — admins can see who created, updated, or deleted every shipment (with the exact old → new values), recorded by a database trigger that agents cannot bypass

Built with Next.js + Tailwind CSS, data stored in [Supabase](https://supabase.com) (free tier is plenty).

## One-time setup (~10 minutes)

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free account → New project).
2. **Create the database tables:** in the Supabase dashboard open **SQL Editor**, then paste and **Run** each file in [`supabase/migrations/`](supabase/migrations/) in order (`0001_…` through `0011_…`).
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

## Roles: Admin vs. Agent

Migration `0003` adds a `profiles` table with a `role` per user:

- **Admin** — full access to everything (shipments, invoices, payments, expenses, destinations).
- **Agent** — sees the shipments list and shipment details, including who each shipment is billed to and the **total price**, and can only change a shipment's **status** (Pending / Shipped / Delivered) and its **notes**. The write restriction is enforced in the database (row-level security + a trigger), not just hidden in the UI.

Users that existed before the migration become **admins** automatically; users added afterwards default to **agent**. To change a user's role, run this in the SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'someone@example.com';
```

## Everyday flow

1. Add your **destinations** once (Destinations page).
2. Add a **shipment**: description, kg, destination, and either a rate per kg (total is computed) or type the total yourself.
3. Record the **delivery costs** for the shipment (Expenses page, or directly on the shipment) — the net profit updates automatically.
4. When it's time to bill, create an **invoice**: pick the uninvoiced shipments, click **Print** for a PDF to send.
5. When money arrives, open the invoice and **record the payment** — the balance and paid/partial/unpaid badge update automatically.

## Tweaks

- **Currency:** edit `CURRENCY` in [`lib/format.ts`](lib/format.ts) (default `USD`).
- The old full airline-operations spec and build plans were removed; see git history on `main` if you ever want them back.
