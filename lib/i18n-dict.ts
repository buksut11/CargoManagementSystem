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

  // ── Audit trail ───────────────────────────────────────────────────────────
  Created: "La abuuray",
  Updated: "La cusboonaysiiyay",
  Deleted: "La tirtiray",
  system: "nidaamka",
  Everyone: "Qof kasta",
  "Agents only": "Wakiillada oo keliya",
  "Admins only": "Maamulayaasha oo keliya",
  When: "Goorta",
  Who: "Cida",
  Action: "Ficil",
  Changes: "Isbeddellada",
  "No activity recorded yet — shipment changes will appear here.":
    "Weli dhaqdhaqaaq lama diiwaangelin — isbeddellada shixnadaha halkan ayay ka soo muuqan doonaan.",
  "No activity matches this filter.":
    "Ma jiro dhaqdhaqaaq u dhigma shaandhadan.",

  // ── Contact Us ────────────────────────────────────────────────────────────
  "Feature request": "Codsi astaan",
  "Problem / error": "Dhibaato / qalad",
  "Something else": "Wax kale",
  "Questions, ideas, or something not working? Get in touch — we usually reply within the same working day.":
    "Su'aalo, fikrado, ama wax aan shaqeynayn? Nala soo xiriir — sida caadiga ah waxaan ku jawaabnaa isla maalinta shaqada.",
  "Get in touch": "Nala soo xiriir",
  "Send us a message on WhatsApp — it arrives instantly":
    "Noogu soo dir fariin WhatsApp — isla markiiba way timaaddaa",
  "What is it about?": "Waa maxay arrinku?",
  "Your message": "Fariintaada",
  "Describe the feature you'd like, or the problem you ran into…":
    "Sharax astaanta aad rabto, ama dhibaatada kula kulantay…",
  "Send via WhatsApp": "Ku dir WhatsApp",
  "Opens WhatsApp with your message ready to send — your email and organization are attached automatically.":
    "Wuxuu furaa WhatsApp fariintaada oo diyaar u ah in la diro — iimaylkaaga iyo ururkaaga si toos ah ayaa loo lifaaqay.",
  "Contact information": "Macluumaadka xiriirka",
  "Reach us directly": "Si toos ah nagula soo xiriir",
  "Business hours": "Saacadaha shaqada",
  "When you can reach us": "Goorta aad nagu heli karto",
  "Saturday – Wednesday": "Sabti – Arbaco",
  Thursday: "Khamiis",
  Friday: "Jimce",
  Closed: "Xiran",
  "Thursday and Friday are non-working days.":
    "Khamiista iyo Jimcaha maalmo aan shaqo lahayn.",
  "From:": "Ka:",
  "unknown user": "isticmaale aan la aqoon",

  // ── Transport modes ───────────────────────────────────────────────────────
  "✈️ Airplane": "✈️ Diyaarad",
  "🚗 Car": "🚗 Baabuur",
  "🏍️ Motorcycle": "🏍️ Mooto",
  "📦 Other": "📦 Kale",

  // ── Expenses ──────────────────────────────────────────────────────────────
  "Income (all shipments)": "Dakhliga (dhammaan shixnadaha)",
  "Delivery expenses": "Kharashaadka gaarsiinta",
  "Add a delivery expense": "Ku dar kharash gaarsiineed",
  "Record what a delivery cost you (airplane, car, motorcycle…)":
    "Diiwaangeli waxa gaarsiintu kugu kacday (diyaarad, baabuur, mooto…)",
  "— choose shipment —": "— dooro shixnad —",
  Transport: "Gaadiid",
  Cost: "Kharashka",
  "Date (optional)": "Taariikhda (ikhtiyaari)",
  "Adding…": "Waa lagu darayaa…",
  "All expenses": "Dhammaan kharashaadka",
  "No expenses yet — record what a delivery cost you (airplane, car, motorcycle…) to see your real profit.":
    "Weli kharashaad ma jiraan — diiwaangeli waxa gaarsiintu kugu kacday (diyaarad, baabuur, mooto…) si aad u aragto faaiidadaada dhabta ah.",
  "Profit per shipment": "Faaiidada shixnadiiba",
  Income: "Dakhliga",
  "No shipments yet — profit per shipment will appear here.":
    "Weli shixnado ma jiraan — faaiidada shixnadiiba halkan ayay ka soo muuqan doontaa.",
  "Delete expense?": "Tirtir kharashka?",
  "This removes the {amount} expense. This cannot be undone.":
    "Tan waxay saaraysaa kharashka {amount}. Tan dib looma celin karo.",

  // ── Transport / expense-type dropdown ─────────────────────────────────────
  "➕ Add new type…": "➕ Ku dar nooc cusub…",
  "New transport / expense type": "Nooc gaadiid / kharash cusub",
  "It will be saved and available in this dropdown from now on.":
    "Waa la kaydin doonaa oo hadda ka dib wuu ku jiri doonaa liiskan.",
  "e.g. 🚢 Ship": "tusaale 🚢 Markab",
  "Add type": "Ku dar nooca",

  // ── Payments ──────────────────────────────────────────────────────────────
  "Total received:": "Wadarta la helay:",
  "Search invoice #, from or method…":
    "Raadi lambarka qaansheegga, cidda ama habka…",
  From: "Ka",
  "No payments yet — record them from an invoice page.":
    "Weli lacag-bixinno ma jiraan — ka diiwaangeli bogga qaansheegga.",
  "No payments match your search.":
    "Ma jiraan lacag-bixinno u dhigma raadintaada.",

  // ── Statement of account ──────────────────────────────────────────────────
  "This month": "Bishaan",
  "Last month": "Bishii hore",
  "This quarter": "Rubucaan",
  "This year": "Sanadkan",
  "All time": "Waqti kasta",
  "Customer statement": "Bayaanka macmiilka",
  "Build a statement": "Samee bayaan",
  "Pick a customer and a date range, then print or save as PDF.":
    "Dooro macmiil iyo muddo taariikheed, kadibna daabac ama u kaydi PDF.",
  "Select a customer…": "Dooro macmiil…",
  To: "Ilaa",
  Beginning: "Bilowga",
  Today: "Maanta",
  "Quick range:": "Muddo degdeg ah:",
  "🖨 Print / Save as PDF": "🖨 Daabac / U kaydi PDF",
  "← Back to customers": "← Ku noqo macaamiisha",
  "Choose a customer above to build their statement of account.":
    "Dooro macmiil kor ku yaal si aad ugu dhisto bayaanka xisaabtiisa.",
  "Statement of account": "Bayaanka xisaabta",
  "Statement for": "Bayaan loogu talagalay",
  "Period:": "Muddada:",
  "Issued:": "La soo saaray:",
  "Entries:": "Diiwaanno:",
  "Opening balance": "Hadhaaga furitaanka",
  Charges: "Lacago la dallacay",
  "Payments & credits": "Lacag-bixinno & deyn-celin",
  Charge: "Lacag la dallacay",
  "Balance brought forward": "Hadhaaga la soo gudbiyay",
  "No transactions in this date range.":
    "Ma jiraan wax dhaqdhaqaaq ah muddadan taariikheed.",
  "Total charged": "Wadarta la dallacay",
  "Total payments & credits": "Wadarta lacag-bixinno & deyn-celin",
  "Account fully settled": "Xisaabta oo dhammaystiran",
  "(credit {amount})": "(deyn-celin {amount})",
  "Balance due by age": "Hadhaaga sida uu u da' weyn yahay",
  Current: "Hadda",
  "0–30 days": "0–30 maalmood",
  "31–60 days": "31–60 maalmood",
  "61–90 days": "61–90 maalmood",
  "Over 90 days": "In ka badan 90 maalmood",
  "Generated by": "Waxaa sameeyay",
  "Cargo invoice": "Qaansheeg xamuul",
  "Payment received": "Lacag-bixin la helay",
  "All activity through {date}": "Dhammaan dhaqdhaqaaqa ilaa {date}",

  // ── Invoices list ─────────────────────────────────────────────────────────
  "+ New invoice": "+ Qaansheeg cusub",
  "Search invoice # or bill to…": "Raadi lambarka qaansheegga ama loo dallacay…",
  Issued: "La soo saaray",
  "No invoices yet — create one from your uninvoiced shipments.":
    "Weli qaansheegyo ma jiraan — mid ka samee shixnadahaaga aan la qaansheegin.",
  "No match in the loaded invoices — “Load older invoices” below widens the search.":
    "Wax u dhigma kuma jiraan qaansheegyada la soo dejiyay — “Soo raro qaansheegyadii hore” hoose ayaa ballaadhinaya raadinta.",
  "No invoices match your search.":
    "Ma jiraan qaansheegyo u dhigma raadintaada.",
  "Load older invoices": "Soo raro qaansheegyadii hore",

  // ── Shipment form ─────────────────────────────────────────────────────────
  "Shipment details": "Faahfaahinta shixnadda",
  "What is being shipped and where it's going":
    "Waxa la dirayo iyo halka uu tegayo",
  "e.g. 3 boxes of spare parts": "tusaale 3 sanduuq oo qalab dheeraad ah",
  "No destinations yet — add them on the Destinations page.":
    "Weli meelo ma jiraan — ku dar bogga Meelaha.",
  "— none —": "— midna —",
  Manage: "Maamul",
  "Weight & pricing": "Miisaanka & qiimaha",
  "Weight, rate and the price you charge":
    "Miisaanka, qiimaha halkiiba iyo qiimaha aad dalbato",
  "Rate per kg (optional)": "Qiimaha kg-giiba (ikhtiyaari)",
  "leave empty to type total": "ka tag madhan si aad wadarta u qorto",
  "Total price": "Qiimaha guud",
  "Computed from weight × rate.": "Laga xisaabiyay miisaanka × qiimaha.",
  "Notes & attachment": "Faallo & lifaaq",
  "Internal notes and an optional parcel or receipt photo":
    "Faallo gudaha ah iyo sawir ikhtiyaari ah oo baakidhka ama rasiidka",
  "Notes (optional)": "Faallo (ikhtiyaari)",
  "Shown on the printed shipment receipt.":
    "Waxaa lagu tusayaa rasiidka shixnadda ee la daabaco.",
  "e.g. fragile — handle with care": "tusaale jajab — si taxadar leh u qabo",
  "Attachment image": "Sawirka lifaaqa",
  "(optional)": "(ikhtiyaari)",
  "Agents can view it but not change it.":
    "Wakiillada way arki karaan laakiin ma beddeli karaan.",
  "Add shipment": "Ku dar shixnad",
  "Please choose an image file.": "Fadlan dooro fayl sawir ah.",
  Replace: "Beddel",
  "Uploading…": "Waa la soo gelinayaa…",
  "Click to upload an image": "Guji si aad sawir u soo geliso",
  "PNG or JPG · parcel or receipt": "PNG ama JPG · baakidh ama rasiid",

  // ── Shipment detail ───────────────────────────────────────────────────────
  "Not invoiced": "Aan la qaansheegin",
  "Invoice total": "Wadarta qaansheegga",
  Attachment: "Lifaaq",
  "Status & notes": "Xaaladda & faallo",
  "Update status": "Cusboonaysii xaaladda",
  "Add a note about this shipment…": "Ku dar faallo ku saabsan shixnaddan…",
  "Saved.": "Waa la kaydiyay.",
  "Shipment not found.": "Shixnadda lama helin.",
  "Edit {ref}": "Wax ka beddel {ref}",
  "🖨 Print receipt": "🖨 Daabac rasiidka",
  "Delete {ref}?": "Tirtir {ref}?",
  "This permanently removes the shipment. This cannot be undone.":
    "Tan si joogto ah ayay u saartaa shixnadda. Tan dib looma celin karo.",
  "This shipment is on ": "Shixnaddani waxay ku jirtaa ",
  ". Changing its total will change that invoice’s balance.":
    ". Beddelka wadarteeda ayaa beddeli doona hadhaaga qaansheeggaas.",

  // ── Shipment expenses (detail sidebar) ────────────────────────────────────
  "Delivery expenses & profit": "Kharashaadka gaarsiinta & faaiidada",
  "Costs to deliver this shipment and the resulting net profit":
    "Kharashka lagu gaarsiiyo shixnaddan iyo faaiidada saafiga ah ee ka dhalata",
  "Note (optional)": "Faallo (ikhtiyaari)",
  "e.g. fuel to airport": "tusaale shidaal loo aado garoonka",
  "+ Add expense": "+ Ku dar kharash",

  // ── New invoice ───────────────────────────────────────────────────────────
  "New invoice": "Qaansheeg cusub",
  "Who this invoice is for": "Cida qaansheeggan loo qorayo",
  "Pick a saved customer or type a new name.":
    "Dooro macmiil la kaydiyay ama qor magac cusub.",
  "✓ Existing customer — details filled in.":
    "✓ Macmiil hore u jiray — faahfaahin la buuxiyay.",
  "New customer — will be added to your customer list.":
    "Macmiil cusub — waxaa lagu dari doonaa liiskaaga macaamiisha.",
  "Phone (optional)": "Telefoon (ikhtiyaari)",
  "Issue date": "Taariikhda soo saarista",
  "Address (optional)": "Cinwaanka (ikhtiyaari)",
  "Shown at the bottom of the printed invoice.":
    "Waxaa lagu tusayaa hoosta qaansheegga la daabaco.",
  "Shipments to include": "Shixnadaha lagu darayo",
  "Uninvoiced shipments only": "Shixnadaha aan la qaansheegin oo keliya",
  "All shipments are already invoiced — add a new shipment first.":
    "Dhammaan shixnadaha hore ayaa loo qaansheegay — marka hore ku dar shixnad cusub.",
  "Invoice total:": "Wadarta qaansheegga:",
  selected: "la doortay",
  "Creating…": "Waa la abuurayaa…",
  "Create invoice": "Abuur qaansheeg",
  "Select at least one shipment to invoice.":
    "Dooro ugu yaraan hal shixnad si aad u qaansheegto.",
  "Could not create invoice.": "Qaansheegga lama abuuri karin.",

  // ── Invoice detail ────────────────────────────────────────────────────────
  "🖨 Print": "🖨 Daabac",
  "Paid in full": "La bixiyay dhammaan",
  "No payments yet.": "Weli lacag-bixinno ma jiraan.",
  "Record a payment": "Diiwaangeli lacag-bixin",
  "Log what the customer has paid on this invoice":
    "Diiwaangeli waxa macmiilku bixiyay qaansheeggan",
  "Method (optional)": "Habka (ikhtiyaari)",
  "cash, bank transfer…": "cash, wareejin bangi…",
  "Add payment": "Ku dar lacag-bixin",
  "Fill remaining balance ({amount})": "Buuxi hadhaaga hadhay ({amount})",
  "Delete payment?": "Tirtir lacag-bixinta?",
  "This removes the {amount} payment. This cannot be undone.":
    "Tan waxay saartaa lacag-bixinta {amount}. Tan dib looma celin karo.",
  "Its payments will be deleted and its shipments become uninvoiced again. This cannot be undone.":
    "Lacag-bixinnadeeda waa la tirtiri doonaa shixnadaheeduna mar kale way noqon doonaan kuwo aan la qaansheegin. Tan dib looma celin karo.",
  "Invoice not found.": "Qaansheegga lama helin.",

  // ── Members ───────────────────────────────────────────────────────────────
  "Invite someone": "Casuun qof",
  "Add a teammate to this organization": "Ku dar saaxiib shaqo ururkan",
  Role: "Doorka",
  Agent: "Wakiil",
  Manager: "Maareeye",
  Admin: "Maamule sare",
  "Create invite link": "Samee link casuun",
  "Could not create the invite.": "Casuunta lama abuuri karin.",
  "Invite emailed — you can also share this link:":
    "Casuunta iimayl ahaan ayaa loo diray — sidoo kale wadaag linkigan:",
  "Invite link ready — share it with them:":
    "Linkiga casuunta diyaar — la wadaag iyaga:",
  Copied: "La koobiyeeyay",
  Copy: "Koobiyeeg",
  "Pending invites": "Casuumaadaha sugaya",
  Revoke: "Baabi'i",
  "(you)": "(adiga)",
  "No members yet.": "Weli xubno ma jiraan.",
  "Remove member?": "Ka saar xubinta?",
  "Remove {name} from the organization? They will lose access.":
    "Ka saar {name} ururka? Waxay lumin doonaan gelitaanka.",
  "this member": "xubintan",

  // ── Date / time picker controls ───────────────────────────────────────────
  "Pick a date": "Dooro taariikh",
  "Choose date": "Dooro taariikhda",
  "Previous month": "Bisha hore",
  "Next month": "Bisha xigta",
  "Previous year": "Sanadkii hore",
  "Next year": "Sanadka xiga",
  "Choose time": "Dooro waqtiga",
  Hour: "Saac",
  Min: "Daqiiqad",
  Time: "Waqti",
};

export const DICTIONARIES: Record<string, Dictionary> = {
  so,
};
