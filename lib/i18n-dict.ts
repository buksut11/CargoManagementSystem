// Translation tables for CargoBook.
//
// The key is the English source string exactly as it appears in the UI; the
// value is the translation. English needs no table (a missing key falls back to
// the key itself — see lib/i18n.tsx `translate`). Add new locales as extra
// entries in DICTIONARIES.
//
// Placeholders use {name} and are filled by `translate(..., vars)`, e.g.
//   t("Sent reset link to {email}", { email })

export type Dictionary = Record<string, string>;

// ── Somali (Soomaali) ───────────────────────────────────────────────────────
const so: Dictionary = {
  // App / brand
  CargoBook: "CargoBook",
  "Loading…": "Waa la soo dejinayaa…",
  "Loading": "Soo dejinaya",

  // ── Navigation (sidebar) ──────────────────────────────────────────────────
  Dashboard: "Dashboodhka",
  Shipments: "Shixnadaha",
  Invoices: "Qaansheegadaha",
  Customers: "Macaamiisha",
  Statement: "Bayaanka",
  Payments: "Lacag-bixinnada",
  Expenses: "Kharashaadka",
  Destinations: "Meelaha",
  "Audit trail": "Raadraaca hawlaha",
  Members: "Xubnaha",
  Settings: "Dejinta",
  "Contact Us": "Nala soo xiriir",

  // Flight module nav
  "Flight Dashboard": "Dashboodhka Duulimaadka",
  Bookings: "Buugaynta",
  "Booking Seats": "Kuraasta la buugay",
  Airlines: "Shirkadaha Duulista",
  "Airline statement": "Bayaanka shirkadda",
  Receipts: "Rasiidyada",
  Payables: "Deymaha la bixinayo",
  Ledger: "Diiwaanka xisaabta",
  Reports: "Warbixinnada",
  Activity: "Dhaqdhaqaaqa",

  // Sidebar section labels
  "Cargo Section": "Qaybta Xamuulka",
  "Flight Booking Section": "Qaybta Buugaynta Duulimaadka",

  // Sidebar / shell chrome
  "Sign out": "Ka bax",
  "Dark mode": "Habka madow",
  "Light mode": "Habka iftiinka",
  "Switch light/dark mode": "Beddel habka iftiinka/madowga",
  Language: "Luqadda",
  "Open menu": "Fur menu-ka",
  "Close menu": "Xir menu-ka",

  // No-organization screen
  "No organization yet": "Weli urur ma jiro",
  "Your account isn’t part of any organization. Ask an admin to invite you, then sign in again.":
    "Akoonkaagu qayb kama aha wax urur ah. Weydiiso maamule inuu ku casumo, kadibna mar kale gal.",

  // ── Roles ─────────────────────────────────────────────────────────────────
  owner: "milkiile",
  admin: "maamule sare",
  manager: "maareeye",
  agent: "wakiil",

  // ── Login ─────────────────────────────────────────────────────────────────
  "Welcome back": "Ku soo dhawoow",
  "Sign in to continue to CargoBook":
    "Gal si aad u sii wadato CargoBook",
  "Sign in": "Gal",
  "Signing in…": "Waa la gelayaa…",
  Email: "Iimaylka",
  Password: "Furaha sirta ah",
  "Remember me": "I xasuuso",
  "Forgot password?": "Furaha ma illowday?",
  "Show password": "Muuji furaha sirta ah",
  "Hide password": "Qari furaha sirta ah",
  "Track Every Shipment, From Port to Door":
    "La soco Shixnad kasta, Deked ilaa Albaab",
  "Shipments, invoices and payments — organised in one clean, fast dashboard built for the way you work.":
    "Shixnado, qaansheegyo iyo lacag-bixinno — oo lagu habeeyay hal dashboodh nadiif ah, dhaqso leh oo loo dhisay sida aad u shaqeyso.",
  "Enter your email above first, then tap “Forgot password”.":
    "Marka hore geli iimaylkaaga kore, kadibna taabo “Furaha ma illowday”.",
  "We’ve sent a password reset link to {email}.":
    "Waxaan u dirnay xiriiriye dib-u-dejin furaha oo loo diray {email}.",
  "Supabase is not configured yet — copy .env.example to .env.local and fill in your project keys (see README).":
    "Supabase weli lama habayn — koobiyeeg .env.example una beddel .env.local kadibna buuxi furayaasha mashruucaaga (fiiri README).",

  // ── Common actions / buttons ──────────────────────────────────────────────
  Save: "Kaydi",
  "Save changes": "Kaydi isbeddellada",
  Saving: "Waa la kaydinayaa",
  "Saving…": "Waa la kaydinayaa…",
  Cancel: "Jooji",
  Delete: "Tirtir",
  "Deleting…": "Waa la tirtirayaa…",
  Edit: "Wax ka beddel",
  Add: "Ku dar",
  "Add new": "Ku dar mid cusub",
  New: "Cusub",
  Remove: "Ka saar",
  Search: "Raadi",
  "Search…": "Raadi…",
  "Type to search…": "Qor si aad u raadiso…",
  Filter: "Shaandhee",
  Print: "Daabac",
  Export: "Dhoofi",
  "Export CSV": "Dhoofi CSV",
  Close: "Xir",
  Back: "Dib u noqo",
  Next: "Xiga",
  Previous: "Hore",
  Confirm: "Xaqiiji",
  Update: "Cusboonaysii",
  Create: "Abuur",
  Submit: "Gudbi",
  Send: "Dir",
  Sending: "Waa la dirayaa",
  "Sending…": "Waa la dirayaa…",
  View: "Fiiri",
  Open: "Fur",
  Download: "Soo dejiso",
  Upload: "Soo geli",
  Clear: "Nadiifi",
  Reset: "Dib u deji",
  Apply: "Codso",
  Done: "Dhammeystiran",
  All: "Dhammaan",
  None: "Midna",
  Yes: "Haa",
  No: "Maya",
  "No matches": "Wax u dhigma lama helin",

  // ── Common field labels ───────────────────────────────────────────────────
  Name: "Magaca",
  Phone: "Telefoon",
  Address: "Cinwaanka",
  Country: "Wadanka",
  Date: "Taariikhda",
  Description: "Sharaxaad",
  Notes: "Faallo",
  Note: "Faallo",
  Amount: "Qadarka",
  Total: "Wadarta",
  Status: "Xaaladda",
  Actions: "Falal",
  Type: "Nooca",
  Method: "Habka",
  Weight: "Miisaanka",
  "Weight (kg)": "Miisaanka (kg)",
  Price: "Qiimaha",
  Rate: "Qiimaha halkiiba",
  Balance: "Hadhaaga",
  Profit: "Faaiidada",
  Category: "Qaybta",
  Optional: "Ikhtiyaari",
  Required: "Loo baahan yahay",

  // ── Statuses ──────────────────────────────────────────────────────────────
  Pending: "Sugaya",
  Shipped: "La diray",
  Delivered: "La gaarsiiyay",
  Paid: "La bixiyay",
  Partial: "Qayb ahaan",
  Unpaid: "Aan la bixin",

  // ── Common domain nouns (singular) ────────────────────────────────────────
  Shipment: "Shixnad",
  Invoice: "Qaansheeg",
  Payment: "Lacag-bixin",
  Customer: "Macmiil",
  Destination: "Meesha loo diro",
  Expense: "Kharash",
  Booking: "Buuging",
  Supplier: "Alaab-qeybiye",
  Airline: "Shirkad Duulis",

  // ── Common messages ───────────────────────────────────────────────────────
  "Are you sure?": "Ma hubtaa?",
  "This action cannot be undone.": "Ficilkan dib looma celin karo.",
  "No results": "Wax natiijo ah lama helin",
  "Nothing here yet": "Weli waxba halkan ma jiraan",
  "Something went wrong.": "Wax baa qaldamay.",

  // ── Dashboard ─────────────────────────────────────────────────────────────
  "Total weight": "Wadarta miisaanka",
  Invoiced: "La qaansheegay",
  Outstanding: "Hadhay",
  "Net profit": "Faaiidada saafiga ah",
  "Kg shipped per month": "Kg la diray bishiiba",
  "this month": "bishaan",
  "Payment status": "Xaaladda lacag-bixinta",
  "Nothing invoiced yet — create your first invoice to see paid vs. due here.":
    "Weli waxba lama qaansheegin — abuur qaansheegkaagii ugu horreeyay si aad halkan ugu aragto wixii la bixiyay iyo wixii la sugayo.",
  "Received per month": "La helay bishiiba",
  "Recent shipments": "Shixnadihii ugu dambeeyay",
  "View all →": "Fiiri dhammaan →",
  Ref: "Tixraac",
  "No shipments yet — add your first one from the Shipments page.":
    "Weli shixnado ma jiraan — ka dar kii ugu horreeyay bogga Shixnadaha.",

  // ── Shipments list ────────────────────────────────────────────────────────
  "+ New shipment": "+ Shixnad cusub",
  "Search description, destination…": "Raadi sharaxaad, meesha loo diro…",
  "All statuses": "Dhammaan xaaladaha",
  "Exporting…": "Waa la dhoofinayaa…",
  "⬇ Export CSV": "⬇ Dhoofi CSV",
  "Bill to": "Loo dallacay",
  "not invoiced": "aan la qaansheegin",
  "Rate per kg": "Qiimaha kg-giiba",
  "Ship date": "Taariikhda dirista",
  "No shipments yet — click “New shipment” to add your first.":
    "Weli shixnado ma jiraan — guji “Shixnad cusub” si aad ugu darto kaagii ugu horreeyay.",
  "No shipments yet.": "Weli shixnado ma jiraan.",
  "No match in the loaded shipments — “Load older shipments” below widens the search.":
    "Wax u dhigma kuma jiraan shixnadaha la soo dejiyay — “Soo raro shixnadihii hore” hoose ayaa ballaadhinaya raadinta.",
  "No shipments match your search.": "Ma jiraan shixnado u dhigma raadintaada.",
  "Load older shipments": "Soo raro shixnadihii hore",
  "Showing the {count} most recent — search covers what’s loaded.":
    "Waxaa la tusayaa {count} ee ugu dambeeyay — raadintu waxay dabooshaa waxa la soo dejiyay.",

  // ── Destinations ──────────────────────────────────────────────────────────
  "Edit destination": "Wax ka beddel meesha",
  "Add a destination": "Ku dar meel",
  "Places you ship to": "Meelaha aad wax u dirto",
  "City / place": "Magaalo / meel",
  "e.g. Istanbul": "tusaale Istanbul",
  "Country (optional)": "Wadanka (ikhtiyaari)",
  "e.g. Türkiye": "tusaale Turkiga",
  "That destination already exists.": "Meeshaas hore ayay u jirtay.",
  "All destinations": "Dhammaan meelaha",
  "No country": "Wadan ma leh",
  "No destinations yet — add the places you ship to.":
    "Weli meelo ma jiraan — ku dar meelaha aad wax u dirto.",
  "Delete destination?": "Tirtir meesha?",
  "Delete \"{name}\"? Shipments using it will show no destination.":
    "Tirtir “{name}”? Shixnadaha isticmaalaya ayaan meel muujin doonin.",

  // ── Customers ─────────────────────────────────────────────────────────────
  "Edit customer": "Wax ka beddel macmiilka",
  "New customer": "Macmiil cusub",
  "People or companies you ship for": "Dadka ama shirkadaha aad u dirto",
  "e.g. Ali Trading Co.": "tusaale Ali Trading Co.",
  "Add customer": "Ku dar macmiil",
  "All customers": "Dhammaan macaamiisha",
  "Search by name or phone number…": "Ku raadi magac ama lambar telefoon…",
  "Search customers by name or phone number":
    "Ku raadi macaamiisha magac ama lambar telefoon",
  "No customers yet — they appear here as you invoice, or add them manually.":
    "Weli macaamiil ma jiraan — waxay halkan ka soo muuqdaan markaad qaansheegto, ama gacanta ku dar.",
  'No customers match "{search}".': "Ma jiraan macaamiil u dhigma “{search}”.",
  "Delete customer?": "Tirtir macmiilka?",
  'Delete "{name}"? Their invoices will keep working but show no customer.':
    "Tirtir “{name}”? Qaansheegyadooda way sii shaqayn doonaan laakiin macmiil ma muujin doonaan.",
  "Balance breakdown for {name}": "Kala-qaybinta hadhaaga ee {name}",
  "Balance due": "Hadhaaga la leeyahay",
  "made up of {count} invoice": "oo ka kooban {count} qaansheeg",
  "made up of {count} invoices": "oo ka kooban {count} qaansheeg",
  "No unpaid invoices — this balance may be from a rounding adjustment.":
    "Ma jiraan qaansheeg aan la bixin — hadhaagan wuxuu ka iman karaa hagaajin isu-ekaysiineed.",
  "{charged} charged, {paid} paid": "{charged} la dallacay, {paid} la bixiyay",
  "{charged} charged, unpaid": "{charged} la dallacay, aan la bixin",
  "Total due": "Wadarta la leeyahay",
  "Full statement": "Bayaanka buuxa",

  // ── Customer card board (shared) ──────────────────────────────────────────
  "See what makes up {name}'s balance": "Arag waxa ka kooban hadhaaga {name}",
  "See what makes up {name}'s balance of {amount}":
    "Arag waxa ka kooban hadhaaga {name} ee ah {amount}",
  "{amount} due": "{amount} la leeyahay",
  Settled: "La bixiyay",
  "View statement": "Fiiri bayaanka",
  "View {name}'s statement": "Fiiri bayaanka {name}",
  "Edit {name}": "Wax ka beddel {name}",
  "Delete {name}": "Tirtir {name}",
  "No email": "Iimayl ma leh",
  "No phone": "Telefoon ma leh",
};

export const DICTIONARIES: Record<string, Dictionary> = {
  so,
};
