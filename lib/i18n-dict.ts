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

  // ── Settings ──────────────────────────────────────────────────────────────
  Organization: "Ururka",
  "The logo and details below appear on your printed invoices.":
    "Astaanta iyo faahfaahinta hoose waxay ka soo muuqdaan qaansheegyadaada la daabaco.",
  "Organization logo": "Astaanta ururka",
  "No logo": "Astaan ma leh",
  "Working…": "Waa la shaqaynayaa…",
  "Replace logo": "Beddel astaanta",
  "Upload logo": "Soo geli astaan",
  Saved: "La kaydiyay",
  Modules: "Qaybaha",
  "The product areas included in your plan. Contact us to add or remove one.":
    "Qaybaha alaabta ee ku jira qorshahaaga. Nala soo xiriir si aad mid ugu darto ama uga saarto.",
  Cargo: "Xamuul",
  Flights: "Duulimaadyo",
  "Shipments, invoices, expenses & delivery tracking.":
    "Shixnado, qaansheegyo, kharashaad & raadraaca gaarsiinta.",
  "Air-ticket bookings, receivables, payables & refunds.":
    "Buugaynta tigidhada diyaaradaha, lacagaha la sugayo, deymaha & celinta lacagaha.",
  Included: "Waa ku jiraa",
  "Not included": "Kuma jiro",
  Billing: "Biilasha",
  "Backup & restore": "Kayd & soo celin",
  "Download all of this organization's data (shipments, invoices, payments, expenses, bookings, ledgers…) as a JSON file, or add the contents of a backup back in.":
    "Soo dejiso dhammaan xogta ururkan (shixnado, qaansheegyo, lacag-bixinno, kharashaad, buugaynta, xisaabaadka…) sida fayl JSON ah, ama dib ugu dar waxa ku jira kayd.",
  "Preparing…": "Waa la diyaarinayaa…",
  "⬇ Download backup": "⬇ Soo dejiso kaydka",
  "⬆ Restore from backup": "⬆ Ka soo celi kaydka",
  "Restore finished — {count} records added.":
    "Soo celintii way dhammaatay — {count} diiwaan ayaa lagu daray.",
  "Existing entries were reused for: {list}.":
    "Diiwaannada jira ayaa dib loo isticmaalay: {list}.",
  "Restore only adds — it never deletes existing data. Restoring the same backup twice will duplicate shipments, invoices and bookings.":
    "Soo celintu wax kaliya way ku dartaa — waligeed ma tirtirto xogta jirta. Soo celinta isla kaydka labo jeer waxay noqon doontaa shixnado, qaansheegyo iyo buugaynta oo laba-laab ah.",
  "Restore this backup?": "Soo celi kaydkan?",
  'Backup from {date}. Its shipments, invoices, bookings and payments will be ADDED to "{org}". Nothing is deleted, but restoring the same backup twice creates duplicates.':
    "Kayd ka yimid {date}. Shixnadaheeda, qaansheegyadeeda, buugaynteeda iyo lacag-bixinnadeeda waxaa LAGU DARI DOONAA “{org}”. Waxba lama tirtiro, laakiin soo celinta isla kaydka labo jeer waxay abuurtaa nuqullo.",
  Restore: "Soo celi",
  "Starting…": "Waa la bilaabayaa…",
  "Backup failed.": "Kaydku wuu fashilmay.",
  "This file is not a CargoBook backup.": "Faylkani maaha kayd CargoBook.",
  "Could not read the file.": "Faylka lama akhriyi karin.",
  "Restore failed.": "Soo celintii way fashilantay.",
  "this organization": "ururkan",

  // ── Billing cards ─────────────────────────────────────────────────────────
  "EVC number": "Lambarka EVC",
  "eDahab number": "Lambarka eDahab",
  "Account or phone": "Akoon ama telefoon",
  "You'll approve the payment with your PIN on this phone.":
    "Waxaad ku ansixin doontaa lacag-bixinta PIN-kaaga taleefankan.",
  "You'll confirm the payment through Premier Bank.":
    "Waxaad ku xaqiijin doontaa lacag-bixinta Premier Bank.",
  "Your organization is on the Pro plan":
    "Ururkaagu wuxuu ku jiraa qorshaha Pro",
  "Confirming…": "Waa la xaqiijinayaa…",
  "Pay {price}": "Bixi {price}",
  "A prompt was sent to {account} — approve it with your PIN.":
    "Codsi ayaa loo diray {account} — ku ansixi PIN-kaaga.",
  "Payment received — you're now on the Pro plan.":
    "Lacag-bixin la helay — hadda waxaad ku jirtaa qorshaha Pro.",
  "The payment could not be completed.":
    "Lacag-bixinta lama dhammaystiri karin.",
  "Secured · {tag}": "La sugay · {tag}",

  // ── Billing history ───────────────────────────────────────────────────────
  "Billing history": "Taariikhda biilasha",
  "Pro-plan payment attempts, most recent first.":
    "Isku dayada lacag-bixinta qorshaha Pro, kii ugu dambeeyay marka hore.",
  Approved: "La ansixiyay",
  Failed: "Fashilmay",

  // ── Print documents ───────────────────────────────────────────────────────
  "Loading invoice…": "Waa la soo dejinayaa qaansheegga…",
  "← Back to invoice": "← Ku noqo qaansheegga",
  "Shipment receipt": "Rasiidka shixnadda",
  "Loading shipment…": "Waa la soo dejinayaa shixnadda…",
  "← Back to shipment": "← Ku noqo shixnadda",
  "Loading receipt…": "Waa la soo dejinayaa rasiidka…",
  "Created {date}": "La abuuray {date}",
  "Sender signature": "Saxeexa dirayaha",
  "Receiver signature": "Saxeexa qaataha",

  // ── Invite acceptance ─────────────────────────────────────────────────────
  "Join on CargoBook": "Ku biir CargoBook",
  "Checking your invitation…": "Waa la hubinayaa casuuntaada…",
  "This invitation has already been used.":
    "Casuuntan hore ayaa loo isticmaalay.",
  "This invitation has expired. Ask for a new one.":
    "Casuuntan way dhacday. Weydiiso mid cusub.",
  "Invites aren’t fully set up yet. Ask the admin to add the SUPABASE_SERVICE_ROLE_KEY to the site’s environment.":
    "Casuumaadaha weli si buuxda looma dejin. Weydiiso maamulaha inuu SUPABASE_SERVICE_ROLE_KEY ku daro deegaanka goobta.",
  "This invitation link is invalid.": "Linkiga casuuntan ma shaqaynayo.",
  "You’ve been invited to ": "Waxaa lagugu casumay ",
  " as ": " ahaan ",
  "Choose a password": "Dooro furaha sirta ah",
  "At least 8 characters": "Ugu yaraan 8 xaraf",
  "Joining…": "Waa la biirinayaa…",
  "Accept & join": "Aqbal & ku biir",
  "Account created — please sign in from the login page.":
    "Akoon la abuuray — fadlan ka gal bogga gelitaanka.",

  // ── Pricing ───────────────────────────────────────────────────────────────
  "Simple pricing": "Qiimo fudud",
  "Track shipments, invoices and payments for your cargo business.":
    "La soco shixnado, qaansheegyo iyo lacag-bixinno ganacsigaaga xamuulka.",
  "Unlimited shipments": "Shixnado aan xadidnayn",
  "Invoices & payments": "Qaansheegyo & lacag-bixinno",
  "1 organization": "1 urur",
  "Invoices, payments & statements": "Qaansheegyo, lacag-bixinno & bayaanno",
  "Priority support": "Taageero mudnaan leh",
  "Already have an account?": "Horey ma u lahayd akoon?",

  // ── Flight statuses ───────────────────────────────────────────────────────
  Quote: "Qiimo",
  Booked: "La buugay",
  Ticketed: "Tigidh la sameeyay",
  Cancelled: "La joojiyay",
  Refunded: "La celiyay",
  Void: "Buray",

  // ── Flight dashboard ──────────────────────────────────────────────────────
  Sales: "Iibka",
  "Gross profit": "Faaiidada guud",
  "Op. expenses": "Kharashka hawlgalka",
  Received: "La helay",
  Receivable: "La sugayo",
  Payable: "La bixinayo",
  "Sales per month": "Iibka bishiiba",
  "Recent bookings": "Buugaynta ugu dambeysay",
  "No bookings yet — create your first from the Bookings page.":
    "Weli buugayn ma jirto — samee tii ugu horreysay bogga Buugaynta.",

  // ── Bookings list ─────────────────────────────────────────────────────────
  "+ New booking": "+ Buugayn cusub",
  Travel: "Safarka",
  "Sale total": "Wadarta iibka",
  "Booking date": "Taariikhda buugaynta",
  "Travel date": "Taariikhda safarka",
  "Net cost": "Kharashka saafiga",
  "Search customer name or phone number…":
    "Raadi magaca macmiilka ama lambarka telefoonka…",
  "Search bookings by customer name or phone number":
    "Ku raadi buugaynta magaca macmiilka ama lambarka telefoonka",
  "No bookings yet.": "Weli buugayn ma jirto.",
  "No bookings match this filter.": "Ma jirto buugayn u dhigma shaandhadan.",
  "made up of {count} ticket": "oo ka kooban {count} tigidh",
  "made up of {count} tickets": "oo ka kooban {count} tigidh",
  "No unpaid tickets — this balance may be from a rounding adjustment.":
    "Ma jiraan tigidh aan la bixin — hadhaagan wuxuu ka iman karaa hagaajin isu-ekaysiineed.",

  // ── Booking form ──────────────────────────────────────────────────────────
  "New booking": "Buugayn cusub",
  "Trip details": "Faahfaahinta safarka",
  "Who is flying and with which airline":
    "Cida duulaysa iyo shirkadda ay la duulayaan",
  "— Select airline —": "— Dooro shirkad duulis —",
  "— None —": "— Midna —",
  "Existing balance": "Hadhaaga jira",
  "with this ticket": "tigidhkan la socda",
  due: "ayaa la sugayo",
  "Airline booking reference / locator":
    "Tixraaca buugaynta shirkadda / raadiyaha",
  "Trip type": "Nooca safarka",
  "One-way": "Hal dhinac",
  "Round-Trip": "Laba dhinac",
  Passengers: "Rakaabka",
  "Add every traveller and their ticket price":
    "Ku dar rakaab kasta iyo qiimaha tigidhkooda",
  Passenger: "Rakaab",
  "Full name": "Magaca oo dhan",
  Adult: "Qof weyn",
  Child: "Ilmo",
  Infant: "Dhallaan",
  "Sale price": "Qiimaha iibka",
  "Flights, dates and classes — the first departure sets the travel date":
    "Duulimaadyo, taariikho iyo darajooyin — bixitaanka ugu horreeya ayaa dejiya taariikhda safarka",
  Flight: "Duulimaad",
  "From and To are the same destination — pick a different arrival city.":
    "Ka iyo Ilaa waa isku meel — dooro magaalo imaatin oo kale.",
  Departure: "Bixitaanka",
  Arrival: "Imaatinka",
  "— Classes —": "— Darajooyin —",
  Economy: "Fasalka caadiga",
  Business: "Fasalka ganacsiga",
  Pricing: "Qiimaynta",
  "What you pay the airline versus what the customer pays you":
    "Waxa aad shirkadda siiso iyo waxa macmiilku ku siiyo",
  "Net cost (to airline)": "Kharashka saafiga (shirkadda)",
  "The fare and fees you owe the airline":
    "Qiimaha iyo khidmadaha aad shirkadda ku leedahay",
  "Internal only": "Gudaha oo keliya",
  "Internal notes about this booking…":
    "Faallo gudaha ah oo ku saabsan buugayntan…",
  "{count} passenger": "{count} rakaab",
  "{count} passengers": "{count} rakaab",
  "Create booking": "Abuur buugayn",
  "Flight {number} has the same From and To destination — pick a different arrival city.":
    "Duulimaadka {number} wuxuu leeyahay Ka iyo Ilaa isku mid ah — dooro magaalo imaatin oo kale.",
  "Could not create the booking.": "Buugaynta lama abuuri karin.",
  "+ Add {item}": "+ Ku dar {item}",
  "{item} {number}": "{item} {number}",
  "Remove {item} {number}": "Ka saar {item} {number}",
  "{placeholder} time": "{placeholder} waqtiga",

  // ── Booking detail ────────────────────────────────────────────────────────
  "Booking not found.": "Buugaynta lama helin.",
  "🖨 Invoice": "🖨 Qaansheeg",
  "📄 Statement": "📄 Bayaan",
  "This permanently removes the booking and its passengers, itinerary, receipts, payments and refunds. This cannot be undone.":
    "Tan si joogto ah ayay u saartaa buugaynta iyo rakaabkeeda, jadwalka, rasiidyada, lacag-bixinnada iyo celinta lacagaha. Tan dib looma celin karo.",
  "Booking ref": "Tixraaca buugaynta",
  "Booking details": "Faahfaahinta buugaynta",
  "No segments.": "Ma jiraan qaybo.",
  "No passengers.": "Ma jiraan rakaab.",
  adult: "qof weyn",
  child: "ilmo",
  infant: "dhallaan",

  // ── Flight destinations ───────────────────────────────────────────────────
  "New destination": "Meel cusub",
  "Airports or cities you fly to": "Garoomada ama magaalooyinka aad u duusho",
  Code: "Koodh",
  "Add destination": "Ku dar meel",
  "Code is optional — the IATA / airport code.":
    "Koodhku waa ikhtiyaari — koodhka IATA / garoonka.",
  "A destination with that name already exists.":
    "Meel magacaas leh hore ayay u jirtay.",
  Airport: "Garoon",
  "No code": "Koodh ma leh",
  "No destinations yet — add the airports or cities you fly to.":
    "Weli meelo ma jiraan — ku dar garoomada ama magaalooyinka aad u duusho.",
  'Delete "{name}"? Existing bookings keep their saved itinerary.':
    "Tirtir “{name}”? Buugaynta jirta way hayn doontaa jadwalkeeda la kaydiyay.",

  // ── Flight customers / suppliers ──────────────────────────────────────────
  "People or agencies you sell tickets to":
    "Dadka ama wakaaladaha aad tigidhada ka iibiso",
  "No customers yet — add the people or agencies you sell tickets to.":
    "Weli macaamiil ma jiraan — ku dar dadka ama wakaaladaha aad tigidhada ka iibiso.",
  'Delete "{name}"? Their bookings will keep working but show no customer.':
    "Tirtir “{name}”? Buugayntooda way sii shaqayn doontaa laakiin macmiil ma muujin doonto.",

  // ── Airlines (suppliers) ──────────────────────────────────────────────────
  "Edit airline": "Wax ka beddel shirkadda",
  "New airline": "Shirkad cusub",
  "Airlines you buy tickets through": "Shirkadaha aad tigidhada ka iibsato",
  Contact: "Xiriir",
  "Phone / email / account no.": "Telefoon / iimayl / lambar akoon",
  "Add airline": "Ku dar shirkad",
  "An airline with that name already exists.":
    "Shirkad magacaas leh hore ayay u jirtay.",
  "View {name} statement": "Fiiri bayaanka {name}",
  "No airlines yet — add the airlines you buy through.":
    "Weli shirkado ma jiraan — ku dar shirkadaha aad ka iibsato.",
  "Delete airline?": "Tirtir shirkadda?",
  'Delete "{name}"? Their bookings keep working but show no airline.':
    "Tirtir “{name}”? Buugayntoodu way sii shaqaynaysaa laakiin shirkad ma muujinayaan.",

  // ── Flight expense categories ─────────────────────────────────────────────
  "👥 Staff salary": "👥 Mushahar shaqaale",
  "🏢 Rent": "🏢 Kiro",
  "💡 Electricity": "💡 Koronto",
  "➕ Add new category…": "➕ Ku dar qayb cusub…",
  "New expense category": "Qayb kharash cusub",
  "e.g. 🌐 Internet": "tusaale 🌐 Internet",
  "Add category": "Ku dar qaybta",

  // ── Flight operating expenses ─────────────────────────────────────────────
  "Operating Expenses": "Kharashka Hawlgalka",
  Staff: "Shaqaale",
  "all time": "waqti kasta",
  "Gross profit (bookings)": "Faaiidada guud (buugaynta)",
  "Operating expenses": "Kharashka hawlgalka",
  "Edit operating expense": "Wax ka beddel kharashka hawlgalka",
  "Add an operating expense": "Ku dar kharash hawlgal",
  "Overhead that keeps the office running (staff salary, rent, electricity…)":
    "Kharashka guud ee shaqada sii wada (mushahar shaqaale, kiro, koronto…)",
  "Staff name": "Magaca shaqaalaha",
  "e.g. June payroll": "tusaale mushaharka Juun",
  "Add expense": "Ku dar kharash",
  "Expenses · {month}": "Kharashaadka · {month}",
  "By category": "Qaybtii",
  "No operating expenses recorded for this month.":
    "Kharashaad hawlgal lama diiwaangelin bishaan.",
  "No operating expenses yet — record staff salary, rent, electricity and other overhead to see your true net profit.":
    "Weli kharashaad hawlgal ma jiraan — diiwaangeli mushahar shaqaale, kiro, koronto iyo kharash kale si aad u aragto faaiidadaada saafiga ah ee dhabta ah.",
  "Category totals appear here once you add expenses.":
    "Wadarta qaybaha halkan ayay ka soo muuqan doontaa marka aad kharash darto.",
  "This removes the {amount} {category} expense. This cannot be undone.":
    "Tan waxay saartaa kharashka {amount} ee {category}. Tan dib looma celin karo.",

  // ── Booking seats ─────────────────────────────────────────────────────────
  "Edit booking seats": "Wax ka beddel kuraasta",
  "New booking seats": "Kuraas cusub",
  "Seat blocks you hold with an airline": "Kuraasaha aad shirkad la hayso",
  "Air name": "Magaca shirkadda",
  City: "Magaalada",
  "Number of Seats": "Tirada Kuraasta",
  "Add booking seats": "Ku dar kuraas",
  seats: "kuraas",
  Seats: "Kuraasta",
  "No booking seats yet — add your first entry with the form.":
    "Weli kuraas ma jirto — ku dar gelitaankaaga ugu horreeya foomka.",
  "Delete booking seats?": "Tirtir kuraasta?",
  'Delete the {date} entry for "{air}"?':
    "Tirtir gelitaanka {date} ee “{air}”?",

  // ── Flight receipts / payables ────────────────────────────────────────────
  "Customer receipts": "Rasiidyada macmiilka",
  "No receipts yet — record them from a booking's page.":
    "Weli rasiidyo ma jiraan — ka diiwaangeli bogga buugaynta.",
  "Airline payments": "Lacag-bixinnada shirkadda",
  "Total paid:": "Wadarta la bixiyay:",
  "No airline payments yet — record them from a booking's page.":
    "Weli lacag-bixinno shirkadeed ma jiraan — ka diiwaangeli bogga buugaynta.",
};

export const DICTIONARIES: Record<string, Dictionary> = {
  so,
};
