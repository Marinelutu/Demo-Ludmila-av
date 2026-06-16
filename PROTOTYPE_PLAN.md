# Plan complet de prototip — Sistem management cabinet avocatură

**Stack:** Antigravity (IDE) + Claude (cod) + Next.js 14 + shadcn/ui + SQLite/Prisma + AI APIs
**Obiectiv:** Demo vizual complet cu UX perfect, toate modulele vizibile, fluxurile AI principale 100% funcționale. Zero infrastructură de securitate/conformitate.

---

## Cuprins

1. [Filozofia prototipului — principii non-negociabile](#1-filozofia-prototipului)
2. [Stack tehnic complet cu versiuni exacte](#2-stack-tehnic-complet)
3. [Reguli universale pentru Antigravity](#3-reguli-universale-pentru-antigravity)
4. [Setup inițial — pas cu pas](#4-setup-initial)
5. [Structura proiectului](#5-structura-proiectului)
6. [Schema bazei de date (Prisma)](#6-schema-bazei-de-date)
7. [Date demo pre-populate](#7-date-demo-pre-populate)
8. [Prompturile AI exacte](#8-prompturile-ai-exacte)
9. [Specificații per pagină — UX detaliat](#9-specificatii-per-pagina)
10. [Ordinea de implementare — Faze](#10-ordinea-de-implementare)
11. [Checklist final înainte de demo](#11-checklist-final)
12. [Anti-patterns și capcane de evitat](#12-anti-patterns)

---

## 1. Filozofia prototipului

**Principiul de bază:** Avocata nu vede infrastructura — vede rezultatul. Construim ce vede, simulăm ce nu vede.

**Cele 5 reguli ale prototipării:**

1. **Validare la fiecare pas** — niciun task Antigravity nu trece la următorul fără rulare locală și verificare vizuală completă. Un bug prins imediat e ieftin de corectat. Același bug descoperit câteva task-uri mai târziu, ascuns sub cod nou construit peste el, e mult mai costisitor.

2. **UX peste tot, funcționalitate selectivă** — fiecare buton arată o stare hover, fiecare click are feedback, fiecare loading are skeleton (nu spinner). Asta vine **automat din shadcn/ui + Framer Motion** — nu construim de la zero.

3. **Date care persistă** — tot ce introduce avocata în demo rămâne între reîncărcări. SQLite local face asta gratuit.

4. **AI vizibil, AI real** — generarea documentelor, OCR-ul, chat-ul, transcrierea sunt apeluri reale. Streaming activ peste tot (text apare cuvânt cu cuvânt) — asta vinde "wow"-ul.

5. **Toate paginile există, dar nu toate sunt funcționale 100%** — UI-ul e complet (Acasă, Clienți, Dosare, Documente, Email, Conversații, Timp, Cercetare, Setări). Funcționalitatea profundă e doar pe fluxurile critice. Restul reacționează vizual fără să facă magie reală în backend.

---

## 2. Stack tehnic complet

### Frontend & Framework
```
Next.js 14.2+         (App Router, Server Components unde e static, Client Components unde e interactiv)
React 18+             
TypeScript 5+         (strict mode)
Tailwind CSS 3.4+     
shadcn/ui (latest)    — toate componentele necesare instalate
Framer Motion 11+     — micro-animații, tranziții pagini
Lucide React          — iconițe (deja inclus în shadcn)
Sonner                — toast notifications elegante
cmdk                  — Command palette (Cmd+K)
```

### Backend & Date
```
SQLite                — fișier local dev.db
Prisma 5+             — ORM, migrații, type-safe queries
Next.js API Routes    — toate endpoint-urile, fără server separat
```

### AI Providers
```
@anthropic-ai/sdk     — Claude API (generare documente, chat, structurare)
@google/generative-ai — Gemini Flash (OCR multimodal)
openai                — Whisper (transcriere audio)
```

### Document & Media
```
docx (npmjs)          — generare .docx
@tiptap/react         — editor WYSIWYG (afișare + editare documente)
@tiptap/extension-*   — extensii pentru highlight zone de confirmare
mammoth               — convertire .docx → HTML (când avocata uploadă un docx existent)
sharp                 — compresie imagini pentru OCR
pdf-lib               — afișare PDF (sau react-pdf)
```

### Telegram
```
telegraf              — bibliotecă completă Telegram bot, mai modernă decât node-telegram-bot-api
ngrok                 — expunere localhost ca URL public pentru webhook
```

### Utilities
```
date-fns              — date și ore în română
zod                   — validare schemas
react-hook-form       — formulare
zustand               — state management global (mai simplu decât Redux)
```

---

## 3. Reguli universale pentru Antigravity

**Aceste reguli se aplică la fiecare task. Antigravity le respectă pentru că le are în acest document de context.**

### R1 — Server vs Client Components
- Pagini cu interactivitate (form, click, useState, useEffect) → `"use client"` sus de tot
- Pagini cu date statice/server fetch → Server Component (default)
- Greșeala clasică: pune `"use client"` peste tot din precauție → pierzi optimizările Next.js

### R2 — Streaming pentru AI
- TOATE apelurile către Claude/GPT/Gemini folosesc streaming, nu sincron
- Pe frontend: text apare cuvânt cu cuvânt, niciodată "așteaptă 30s la spinner"
- Implementare: `streamText` din Vercel AI SDK sau direct cu `stream: true` din SDK-ul Anthropic

### R3 — File Upload Flow
- Frontend: `<input type="file">` → FormData → POST la `/api/upload/[tip]`
- API route: primește, procesează, returnează rezultat
- NICIODATĂ: trimitere directă din browser către Gemini/OpenAI (CORS eșuează silent)

### R4 — Editor de documente Tiptap
- Documentele AI-generate sunt **HTML cu span-uri marcate** pentru zone incerte
- Tiptap deschide HTML, span-urile sunt vizibile cu background galben
- Click pe span → popover cu "Confirmă valoarea" / "Editează" / "Anulează"
- Export la .docx: bibliotecă `docx` parsează HTML-ul Tiptap și generează .docx

### R5 — Output structurat de la AI
- Toate apelurile AI care întorc date structurate (OCR, generare doc cu zone incerte, structurare consultație) cer **JSON output** în prompt
- Validare cu Zod la primire
- Pe eșec parsare: retry o singură dată, apoi fallback la text simplu

### R6 — Telegram webhook
- ngrok pornit ÎNAINTE de testarea botului (port 3000)
- URL public ngrok → `setWebhook` la Telegram → primim mesaje
- La fiecare restart ngrok: URL-ul se schimbă → reset webhook
- În scriptul `dev.sh` punem ngrok + Next.js împreună

### R7 — Imagini pentru OCR
- Toate imaginile trec prin `sharp` înainte de Gemini
- Resize la max 2000px pe latura mare
- Compresie JPEG quality 85
- Asta reduce de la 5MB la ~400KB fără pierdere vizibilă

### R8 — .env și securitate (minim viabilă, pentru că tot e demo)
- `.env.local` cu cheile API
- `.gitignore` include `.env*`, `dev.db`, `node_modules`, `.next`
- Niciodată commit chei API
- Validare prezență chei la pornire: `process.env.ANTHROPIC_API_KEY ?? throw`

### R9 — Persistență optimistă
- La acțiunile rapide (creare client, editare câmp), UI-ul se actualizează imediat
- Dacă serverul returnează eroare → rollback + toast
- Asta dă senzație de "instant" chiar și pe operații care durează 200ms

### R10 — Validare la fiecare task Antigravity
- După fiecare task: `npm run dev` → click prin flux → verificare consolă (zero erori)
- Commit Git după fiecare task validat (puncte de restore)
- Dacă un task introduce regresie → `git reset --hard HEAD~1`

---

## 4. Setup inițial

**Făcut o singură dată, înainte de orice altă etapă.**

### Pas 1: Conturi & API Keys
- [ ] Cont Anthropic Console → API key Claude
- [ ] Cont Google AI Studio → API key Gemini
- [ ] Cont OpenAI → API key (pentru Whisper)
- [ ] Cont Telegram → @BotFather → 2 boți noi:
  - `cabinet_notificari_bot` (Bot 1 — notificări)
  - `cabinet_asistent_bot` (Bot 2 — comenzi)
  - Salvez ambele token-uri
- [ ] ngrok instalat: `brew install ngrok` (macOS) sau download Windows
- [ ] ngrok account → authtoken setat

### Pas 2: Proiect Next.js
```bash
npx create-next-app@latest cabinet-prototip --typescript --tailwind --app --src-dir --import-alias "@/*"
cd cabinet-prototip
```

### Pas 3: shadcn/ui setup
```bash
npx shadcn@latest init
# Style: New York
# Base color: Slate
# CSS variables: Yes
```

Componente shadcn de instalat la început (toate odată):
```bash
npx shadcn@latest add button card dialog dropdown-menu input label select \
  tabs textarea toast tooltip avatar badge command sheet skeleton \
  separator alert popover scroll-area table form switch radio-group \
  checkbox progress sonner accordion
```

### Pas 4: Dependențe principale
```bash
npm install @anthropic-ai/sdk @google/generative-ai openai
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-highlight \
  @tiptap/extension-placeholder @tiptap/pm
npm install docx mammoth sharp pdf-lib
npm install telegraf
npm install framer-motion zustand zod react-hook-form @hookform/resolvers
npm install date-fns
npm install -D prisma
npm install @prisma/client
npx prisma init --datasource-provider sqlite
```

### Pas 5: .env.local
```env
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIza...
OPENAI_API_KEY=sk-...
TELEGRAM_BOT_NOTIF_TOKEN=...
TELEGRAM_BOT_ASSIST_TOKEN=...
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Pas 6: Script dev complet
Fișier `dev.sh` în root:
```bash
#!/bin/bash
# Pornește ngrok + Next.js + setează webhook Telegram

# Pornește ngrok în background
ngrok http 3000 > /dev/null &
sleep 3

# Extrage URL public
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*ngrok[^"]*' | head -1)
echo "ngrok URL: $NGROK_URL"

# Setează webhook (rulează manual prima dată sau adaugă logică)
echo "Run manually: curl https://api.telegram.org/bot$TELEGRAM_BOT_ASSIST_TOKEN/setWebhook?url=$NGROK_URL/api/telegram/assist"

# Pornește Next.js
npm run dev
```

---

## 5. Structura proiectului

```
cabinet-prototip/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts              # Datele demo pre-populate
│   └── dev.db
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Layout principal (sidebar + topbar)
│   │   ├── page.tsx         # Pagina Acasă
│   │   ├── clienti/
│   │   │   ├── page.tsx     # Lista clienți
│   │   │   └── [id]/
│   │   │       └── page.tsx # Profil client cu tab-uri
│   │   ├── dosare/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── documente/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── email/page.tsx
│   │   ├── conversatii/page.tsx
│   │   ├── timp/page.tsx
│   │   ├── cercetare/page.tsx
│   │   ├── setari/page.tsx
│   │   ├── chat/page.tsx    # AI asistent conversațional
│   │   └── api/
│   │       ├── ai/
│   │       │   ├── generate-doc/route.ts
│   │       │   ├── chat/route.ts
│   │       │   ├── ocr/route.ts
│   │       │   └── transcribe/route.ts
│   │       ├── telegram/
│   │       │   ├── notif/route.ts
│   │       │   └── assist/route.ts
│   │       ├── clients/...
│   │       ├── cases/...
│   │       └── documents/...
│   ├── components/
│   │   ├── ui/              # shadcn components
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   └── topbar.tsx
│   │   ├── editor/
│   │   │   ├── document-editor.tsx     # Tiptap cu zone marcate
│   │   │   └── confirmation-popover.tsx
│   │   ├── ocr/
│   │   │   ├── ocr-upload.tsx
│   │   │   └── ocr-split-view.tsx
│   │   ├── chat/
│   │   │   └── ai-chat.tsx
│   │   └── shared/
│   │       ├── command-palette.tsx
│   │       ├── stat-card.tsx
│   │       └── empty-state.tsx
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── ai/
│   │   │   ├── claude.ts
│   │   │   ├── gemini.ts
│   │   │   └── whisper.ts
│   │   ├── telegram/
│   │   │   ├── notif-bot.ts
│   │   │   └── assist-bot.ts
│   │   └── utils.ts
│   ├── data/
│   │   ├── motto.ts         # Lista de motto-uri zilnice
│   │   └── templates.ts     # Șabloanele de documente
│   └── store/
│       └── app-store.ts     # Zustand
├── public/
│   ├── demo-documents/      # Documente demo pre-create
│   └── demo-images/         # Poze demo pentru OCR
├── .env.local
├── dev.sh
└── PROTOTYPE_PLAN.md        # Acest document
```

---

## 6. Schema bazei de date

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Client {
  id              String    @id @default(cuid())
  nume            String
  prenume         String
  idnp            String?   @unique
  telefon         String?
  email           String?
  adresa          String?
  note            String?
  status          String    @default("activ")  // activ | arhivat
  aiAuthorized    Boolean   @default(false)
  createdAt       DateTime  @default(now())
  
  cases           Case[]
  documents       Document[]
  emails          Email[]
  consultations   Consultation[]
  timeEntries     TimeEntry[]
  contracts       Contract[]
  notes           Note[]
  conversations   Conversation[]
}

model Case {
  id              String    @id @default(cuid())
  numar           String
  denumire        String
  clientId        String
  client          Client    @relation(fields: [clientId], references: [id])
  tip             String    // civil | penal | familial | administrativ | comercial
  instanta        String?
  judecator       String?
  stare           String    @default("deschis")  // deschis | in_curs | suspendat | in_apel | in_recurs | finalizat | arhivat
  articole        String?   // JSON array
  sumaLitigiu     Float?
  descriere       String?
  createdAt       DateTime  @default(now())
  
  documents       Document[]
  deadlines       Deadline[]
  timeEntries     TimeEntry[]
  emails          Email[]
}

model Document {
  id              String    @id @default(cuid())
  nume            String
  tip             String    // contract | cerere | hotarare | act | poza | alt
  categorie       String?   // intrare | generat | proba | citatie | hotarare | etc
  clientId        String?
  client          Client?   @relation(fields: [clientId], references: [id])
  caseId          String?
  case            Case?     @relation(fields: [caseId], references: [id])
  filePath        String?   // path local pentru fișier
  htmlContent     String?   // pentru editor Tiptap
  textContent     String?   // pentru căutare full-text
  containsSensitive Boolean @default(false)
  ocrStatus       String?   // pending | done | failed
  ocrFields       String?   // JSON cu câmpuri extrase
  createdAt       DateTime  @default(now())
}

model Deadline {
  id              String    @id @default(cuid())
  caseId          String
  case            Case      @relation(fields: [caseId], references: [id])
  tip             String    // apel | recurs | depunere | sedinta
  data            DateTime
  reminderSent3   Boolean   @default(false)
  reminderSent1   Boolean   @default(false)
  status          String    @default("activ")  // activ | trecut | indeplinit
  descriere       String?
}

model Email {
  id              String    @id @default(cuid())
  expeditor       String
  destinatar      String
  subiect         String
  continut        String
  sursa           String    // gmail | justice_md
  data            DateTime
  clientId        String?
  client          Client?   @relation(fields: [clientId], references: [id])
  caseId          String?
  case            Case?     @relation(fields: [caseId], references: [id])
  aiSummary       String?
  aiAction        String?
  status          String    @default("nou")  // nou | procesat | necategorizat
  hasAttachments  Boolean   @default(false)
  attachments     String?   // JSON array cu path-uri
}

model Consultation {
  id              String    @id @default(cuid())
  clientId        String
  client          Client    @relation(fields: [clientId], references: [id])
  transcript      String
  structuredData  String?   // JSON
  durata          Int?      // secunde
  createdAt       DateTime  @default(now())
}

model TimeEntry {
  id              String    @id @default(cuid())
  clientId        String?
  client          Client?   @relation(fields: [clientId], references: [id])
  caseId          String?
  case            Case?     @relation(fields: [caseId], references: [id])
  categorie       String    // apel | email | redactare | studiere | sedinta | etc
  descriere       String?
  startTime       DateTime
  endTime         DateTime?
  durata          Int?      // secunde, calculat automat
  automatic       Boolean   @default(false)
}

model Contract {
  id              String    @id @default(cuid())
  clientId        String
  client          Client    @relation(fields: [clientId], references: [id])
  tip             String    // consultatie | asistenta_juridica
  numar           String?
  data            DateTime
  onorariu        Float?
  filePath        String?
  status          String    @default("activ")
}

model Note {
  id              String    @id @default(cuid())
  clientId        String?
  client          Client?   @relation(fields: [clientId], references: [id])
  continut        String
  confidential    Boolean   @default(false)
  createdAt       DateTime  @default(now())
}

model Conversation {
  id              String    @id @default(cuid())
  clientId        String
  client          Client    @relation(fields: [clientId], references: [id])
  platforma       String    // whatsapp | telegram | viber | messenger
  aiAuthorized    Boolean   @default(false)
  recentMessages  String    // JSON array
  lastActiveAt    DateTime  @default(now())
}

model LegislativeAlert {
  id              String    @id @default(cuid())
  titlu           String
  descriere       String
  actNormativ     String
  articol         String?
  affectedCaseIds String    // JSON array
  status          String    @default("noua")  // noua | citita | rezolvata
  createdAt       DateTime  @default(now())
}

model AIConversation {
  id              String    @id @default(cuid())
  clientId        String?
  caseId          String?
  messages        String    // JSON array
  sursa           String    @default("dashboard")  // dashboard | telegram
  mod             String    @default("lege")  // lege | strategie
  createdAt       DateTime  @default(now())
}

model Template {
  id              String    @id @default(cuid())
  nume            String
  categorie       String    // cereri_civile | familial | penal | administrativ | etc
  continut        String    // HTML cu placeholdere {{nume_client}}
  fields          String    // JSON array cu câmpurile așteptate
  activ           Boolean   @default(true)
}
```

---

## 7. Date demo pre-populate

`prisma/seed.ts` conține următoarele date care apar imediat în demo. Aceste date sunt realiste, plauzibile pentru un cabinet din Moldova, și acoperă toate scenariile pe care le arătăm.

### 4 Clienți demo

1. **Maria Popescu** — IDNP 2002012345678, telefon +373 69 123 456, email maria.popescu@gmail.com
   - 1 dosar civil de divorț în desfășurare (Judecătoria Chișinău)
   - 5 documente: contract asistență, copie buletin, cerere chemare în judecată, hotărâre prima instanță, apel depus
   - 2 emailuri recente, 1 consultație transcrisă, 3 înregistrări de timp
   - Conversație activă pe WhatsApp, AI **autorizat**

2. **Ion Vasilescu** — IDNP 1985073456789, telefon +373 79 987 654
   - 1 dosar penal (martorul) + 1 dosar civil (recuperare datorie)
   - 4 documente, 1 consultație, AI **neautorizat**

3. **SRL "Tehnomag"** — reprezentant Andrei Munteanu, IDNP 1978041234567
   - 1 dosar comercial activ + 1 dosar comercial în apel
   - 6 documente, 8 înregistrări de timp, 3 emailuri

4. **Elena Botezatu** — IDNP 1990115678901
   - 1 dosar familial (pensie alimentară, deschis acum 2 săptămâni)
   - 2 documente, 1 consultație recentă

### 5 Dosare demo (acoperite în clienții de mai sus)

### 15 Documente demo
- Toate generate ca fișiere reale în `public/demo-documents/` (texte plauzibile, format .docx, .pdf)
- Câteva includ zone marcate "necesită confirmare" pentru a fi vizibile imediat în editor

### 8 Emailuri demo
- 3 din Gmail (un client întreabă despre statusul dosarului, un confrere despre o colaborare, un newsletter juridic)
- 2 din justice.md (citație ședință, hotărâre primă instanță)
- 3 procesate (status "procesat", asociat cu client)

### 3 Termene apropiate
- Apel Maria Popescu — peste 5 zile
- Ședință SRL Tehnomag — peste 9 zile  
- Depunere acte Elena Botezatu — peste 12 zile

### 2 Alerte legislative
- "Codul Familiei modificat la art. 78 — afectează dosarul Elena Botezatu"
- "Lege nouă privind executarea hotărârilor judecătorești — afectează dosarul Maria Popescu"

### 4 Conversații client active
- Maria Popescu pe WhatsApp (AI ON)
- Ion Vasilescu pe Telegram (AI OFF)
- SRL Tehnomag pe Viber (AI OFF)
- Elena Botezatu pe WhatsApp (AI OFF)

### Motto-uri zilnice (în `src/data/motto.ts`)
Array de 30+ citate motivaționale, profesionale, scurte. Selectat prin `motto[dayOfYear % motto.length]`.

---

## 8. Prompturile AI exacte

### 8.1 Generare document juridic (Claude)

**System prompt:**
```
Ești un asistent juridic specializat în dreptul Republicii Moldova. Generezi documente juridice profesionale în limba română, conform legislației moldovenești în vigoare.

Reguli stricte:
1. Folosești terminologia juridică corectă moldovenească
2. Citezi articolele exacte din codurile relevante
3. Documentele respectă structura formală a actelor juridice
4. Marchezi cu <span class="needs-confirmation" data-reason="MOTIV">TEXT</span> orice valoare care:
   - Lipsește din datele furnizate și ai presupus
   - Necesită verificare juridică (sumă, dată, articol incert)
   - Depinde de strategia avocatului (nu e tehnic exact)

Output: HTML curat editabil. Niciun comentariu sau explicație în afara HTML-ului.
```

**User prompt template:**
```
Tip document: {tip}
Client: {nume_client}, IDNP {idnp}, adresa {adresa}
Dosar: {numar_dosar} la {instanta}, judecător {judecator}
Context: {descriere_situatie}

Date suplimentare disponibile:
{date_json}

Generează documentul complet în HTML.
```

### 8.2 OCR document juridic (Gemini Flash)

**Prompt unic (multimodal cu imagine):**
```
Analizează acest document juridic și extrage:

1. textul_complet: tot textul vizibil în document
2. tip_document: ce este (buletin / contract / citatie / hotarare / cerere / alt)
3. campuri_identificate: array de obiecte cu:
   - nume_camp (ex: "IDNP", "nume", "data_nastere", "numar_dosar", "instanta")
   - valoare (textul extras)
   - confidence (0.0-1.0)
   - locatie (descriere zonă: "colț stânga sus", "centru pagină", etc)

Returnează STRICT JSON valid, fără markdown, fără explicații.

Format:
{
  "textul_complet": "...",
  "tip_document": "...",
  "campuri_identificate": [...]
}

Câmpurile cu confidence < 0.8 vor fi marcate ca "necesită verificare" în UI.
```

### 8.3 Chat asistent (Claude — mod Lege și mod Strategie)

**System prompt (Mod Lege):**
```
Ești asistentul juridic intern al cabinetului. Răspunzi STRICT din baza de cunoștințe locală: legislația Republicii Moldova și jurisprudența indexată.

- Citezi articole exacte cu număr
- Dacă nu ai informație în KB-ul local, spui clar: "Nu am această informație în baza locală — încercați Modul Strategie pentru căutare extinsă"
- Nu inventezi articole, nu inventezi hotărâri
- Răspunzi în română
- Streaming activ
```

**System prompt (Mod Strategie):**
```
Ești consultant strategic juridic pentru un avocat din Republica Moldova. Aduci perspective largi: practică comparată internațională, doctrină, abordări strategice.

- Folosești cunoștințe generale + web search când e disponibil
- Marchezi clar ce e specific Moldova vs ce e exemplu internațional
- Răspunzi în română
- Streaming activ
- Nu dai sfaturi finale — propui opțiuni
```

### 8.4 Structurare consultație (Claude, post-Whisper)

```
Transcript consultație juridică în română:
{transcript}

Extrage în JSON:
{
  "nume_client": string sau null,
  "natura_cazului": "civil" | "penal" | "familial" | "administrativ" | "comercial" | null,
  "fapte_cheie": string[] (max 5),
  "date_mentionate": [{"data": string, "context": string}],
  "sume_mentionate": [{"suma": number, "valuta": string, "context": string}],
  "documente_necesare": string[],
  "actiuni_agreate": string[],
  "termene_critice": string[]
}

STRICT JSON, fără explicații.
```

### 8.5 Procesare email (Claude)

```
Email primit:
De la: {expeditor}
Subiect: {subiect}
Conținut: {continut}

Lista clienților cabinetului:
{clienti_lista_json}

Returnează JSON:
{
  "client_potrivit_id": string sau null,
  "confidence": 0.0-1.0,
  "rezumat": string (2-3 propoziții),
  "actiune_necesara": string sau null,
  "este_hotarare": boolean,
  "este_citatie": boolean,
  "urgent": boolean
}
```

### 8.6 Răspuns automat client autorizat (Claude)

```
Ești avocata {nume_avocata}. Răspunzi unui client al tău pe {platforma}.

Context client:
{datele_clientului}

Dosarul activ:
{date_dosar}

Mesajele recente:
{istoric_conversatie}

Mesaj nou de la client:
{mesaj}

Reguli:
- Răspunzi ca o avocată profesionistă, calm, politicos
- NU dai sfaturi juridice noi
- NU faci promisiuni
- NU negociezi onorarii
- Dacă întrebarea cere decizie juridică → "Vă voi suna în scurt timp pentru a discuta detaliile"
- Răspunsuri scurte, naturale, ca un mesaj real (nu formal de email)

Generează doar textul mesajului, fără ghilimele.
```

---

## 9. Specificații per pagină

### 9.1 Layout principal (sidebar + topbar)

**Sidebar stânga (256px lățime, fixed):**
- Logo cabinet sus + nume avocată
- 9 link-uri navigare cu iconițe Lucide:
  - 🏠 Acasă
  - 👥 Clienți
  - 📁 Dosare
  - 📄 Documente
  - 📧 Email (cu badge număr neprocesate)
  - 💬 Conversații (cu badge mesaje noi)
  - ⏱ Timp
  - 🔍 Cercetare
  - 💭 Chat AI
  - ⚙ Setări
- Jos: avatar + nume + dropdown logout

**Topbar (fixed sus, 56px):**
- Stânga: titlu pagină curentă
- Centru: căutare globală Cmd+K (buton + shortcut vizibil)
- Dreapta: iconiță notificări (cu badge), iconiță Telegram (status conectat)

### 9.2 Pagina Acasă

**Layout grid 12 coloane:**

Sus, motto-ul zilnic:
- Card foarte subtil, italic, text mic dar vizibil
- Citat + atribuire mică
- Background ușor diferit, border subtil
- Fade-in animation la încărcare

Cifre rapide (4 card-uri pe rând):
- Dosare active: număr mare + delta față de luna trecută
- Clienți activi: număr + ↑↓ vs luna trecută
- Ore lucrate săptămâna: număr + progress bar față de target săptămânal
- Termene în 7 zile: număr + culoare warning dacă > 3

Două coloane:
- **Termene apropiate** (lista 3-5 termene cu zile rămase, click → dosar)
- **Emailuri noi** (lista 3-5 emailuri cu rezumat AI, click → email)

Banner alerte legislative (jos):
- Card portocaliu subtil
- "Atenție: 2 modificări legislative afectează dosarele tale active"
- Click → expand cu detalii

### 9.3 Pagina Clienți

**Header:**
- Titlu "Clienți" + număr total
- Buton primary "+ Client nou" (dreapta)

**Filtre rapide (tabs):**
- Toți | Activi | Arhivați | Cu dosare deschise

**Tabel:**
- Coloane: Nume | IDNP | Telefon | Email | Dosare active | Status | Acțiuni (...)
- Sortabil pe orice coloană
- Search bar deasupra (filtru live)
- Click pe rând → profil client
- Empty state dacă filtru returnează 0 (nu apare în demo, dar implementat)

**Creare client (modal):**
- Form cu validări:
  - Nume, Prenume (required)
  - IDNP (13 cifre, validare regex)
  - Telefon (format +373)
  - Email (validare)
  - Adresă (textarea)
  - Note (textarea)
- Upload opțional documente la creare (drag-drop zone)
- Buton submit "Adaugă client" → toast success + redirect profil

### 9.4 Profil client (9 tab-uri)

**Header client:**
- Avatar (inițiale colorate)
- Nume mare
- IDNP, telefon, email pe rând
- Badge status
- Buton edit (dreapta)

**Tab-uri:**

1. **Informații** — formular editabil inline, fiecare câmp click → editare
2. **Dosare** — lista dosare cu mini-card-uri, buton "+ Dosar nou"
3. **Documente** — grid cu thumbnails, grupate pe categorie, drag-drop upload
4. **Email** — lista emailuri ale clientului, scroll infinit
5. **Consultații** — lista transcrieri cu data, durata, click → full transcript + structured data
6. **Timp** — tabel înregistrări + buton "+ Înregistrare timp" + total ore
7. **Contracte** — lista contracte, buton "+ Contract nou" (consultație / asistență)
8. **Notițe** — listă notițe, buton "+ Notiță", toggle "confidențial"
9. **Activitate** — timeline cronologic (creare client, dosar deschis, document generat, email primit, etc.)

### 9.5 Dosare — listă și detalii

**Lista (similar Clienți):**
- Tabs: Toate | Deschise | În apel | Suspendate | Finalizate | Arhivate
- Tabel: Nr dosar | Denumire | Client | Tip | Instanță | Judecător | Stare | Ultima activitate
- Filtre dropdown: tip, instanță, judecător
- Buton "+ Dosar nou"

**Detalii dosar:**
- Header: nr dosar mare, denumire, badge stare colorat
- Quick info: client (link), tip, instanță, judecător, suma
- **Banner alertă** (dacă există) — portocaliu, "Articolul X invocat în acest dosar a fost modificat..."
- Layout 2 coloane:
  - Stânga (66%): Arbore documente pe categorii + timeline cronologic
  - Dreapta (33%): Panou lateral cu termene apropiate, contracte, notițe rapide
- Bara acțiuni rapide: "Generează document" | "Înregistrează timp" | "Adaugă notiță"

### 9.6 Documente — listă și editor

**Lista:**
- Filtre: client, dosar, tip, perioadă
- Search full-text bar (input mare, sus)
- Grid cu thumbnails sau listă (toggle)
- Click pe document → editor

**Editor (CRITIC pentru demo):**

Layout split:
- Stânga (sidebar 240px): meta document (tip, client, dosar, dată), butoane (Salvează, Export .docx, Export PDF)
- Centru: editor Tiptap full-screen
- Conținutul HTML are span-uri cu clasa `needs-confirmation` care apar cu background galben subtil
- Hover pe span → tooltip mic "Click pentru a verifica"
- Click pe span → popover cu:
  - "AI nu e sigur: [motiv]"
  - Valoare actuală: [input editabil]
  - 3 butoane: ✓ Confirmă | ✏ Editează | ✗ Elimină mark
- După confirmare → span devine verde subtil pentru 2 secunde apoi pierde background

**Generare document nou:**
- Modal sau pagină dedicată
- Step 1: Selectează tip document (cards cu iconițe)
- Step 2: Selectează client + dosar (autocomplete)
- Step 3: Descriere situație (textarea, opțional)
- Buton "Generează" → streaming în editor, span-urile apar progresiv

### 9.7 OCR — Digitalizare documente

**Pagina dedicată sau modal din profil client:**

Zona upload (dropzone mare):
- "Trage o poză aici sau click pentru a selecta"
- Acceptă: .jpg, .png, .heic, .pdf
- Multiple files OK

După upload:
- Loading state: progress bar + "Procesare OCR..."
- Apoi: **Vedere split**

**Vedere split OCR:**
- Stânga (50%): Imagine originală, zoom controls, pan
- Dreapta (50%): 
  - Sus: badge "Tip document detectat: BULETIN" (sau alt)
  - Lista câmpuri detectate, fiecare cu:
    - Etichetă: "IDNP", "Nume", "Data nașterii", etc.
    - Valoare extrasă (input editabil)
    - Iconiță confidence: ✓ (>0.9), ⚠ (0.7-0.9), ⚠⚠ (<0.7) cu culori
    - Câmpurile sub 0.8 cu background galben subtil
  - Buton mare jos: "Confirmă și salvează la profil client"

### 9.8 Email

**Layout:**
- Filtre sus: sursă (Gmail | justice.md | Toate), client, status
- Lista email-uri stânga (300px)
- Preview email selectat dreapta

**Lista:**
- Per email: expeditor, subiect, prima linie, badge sursă, badge status
- Email-uri nepocesate cu indicator vizual

**Preview:**
- Header email standard
- Corp email
- Atașamente inline (preview)
- **Panou AI** (subtil, dreapta sau sus):
  - "Rezumat AI: [2-3 propoziții]"
  - "Acțiune sugerată: [text]"
  - "Client identificat: [nume]" sau "Necategorizat - asociază"
- Butoane: "Marchează procesat" | "Asociază cu alt client" | "Răspunde"

### 9.9 Conversații client (mesagerie)

**Layout simplu:**
- Lista 4 conversații active (per client)
- Per conversație:
  - Avatar client + nume
  - Badge platformă (WhatsApp / Telegram / Viber)
  - Preview ultim mesaj
  - Timp ultim mesaj
  - **Toggle prominent "AI autorizat ON/OFF"** ← cea mai importantă acțiune
- Click pe conversație → drawer cu istoricul recent (10 mesaje) read-only

**Buton CRITIC pentru demo:**
- "🎬 Simulează mesaj nou de la client" (vizibil în setări demo)
- Selectează client + scrie mesaj + apasă → declanșează fluxul real:
  - Dacă AI ON: Claude generează răspuns → apare în conversație → notificare Telegram
  - Dacă AI OFF: notificare pe Bot 1 cu preview

### 9.10 Evidența timpului

**Layout:**
- Sus: butonul gigant "▶ PORNESC ÎNREGISTRAREA"
- Când e activ: timer live + selectoare client/dosar/categorie + buton roșu "■ STOP"
- Tabel jos: lista înregistrări recente
- Filtre: client, dosar, perioadă (azi, săptămâna, luna)
- Rapoarte (tab separat):
  - Total ore per client (cu sumă calculată)
  - Total ore per dosar
  - Export PDF / CSV

**Înregistrări automate vizibile:**
- "Sesiune AI dashboard: 12 min" (auto-detectată)
- "Editare document: 23 min" (auto)
- "Procesare email: 5 min" (auto)

### 9.11 Cercetare juridică

**Formular sus:**
- Textarea: "Descrie situația sau întrebarea juridică"
- Filtre opționale: judecător, instanță, tip dosar, perioadă
- Selector "Pentru dosarul:" (autocomplete)
- **Toggle prominent: Mod Lege ⚖ / Mod Strategie 🌐**
- Buton "Începe cercetarea"

**Rezultate:**
- Streaming response cu surse citate
- Card-uri pentru dosare similare găsite (link spre instance.justice.md - dar simulat în demo)
- Articole invocate frecvent
- Statistici judecător (dacă filtrat pe judecător)
- Buton "Salvează raportul în dosar"

### 9.12 Chat AI asistent

**Layout chat clasic:**
- Sidebar stânga (200px): conversații anterioare cu titluri auto-generate
- Centru: conversație activă
- Selector context sus: "Discut despre: [client] [dosar]" (autocomplete)
- Toggle Mod Lege / Strategie
- Input jos cu buton trimite + shortcut Enter
- Streaming text peste tot
- Buton mic "Salvează acest răspuns" lângă fiecare mesaj AI

### 9.13 Setări

**Tabs:**
- Profil utilizator
- Cabinet (nume, adresă, logo)
- Tarif (input pentru tarif orar - folosit la calcul onorariu)
- Integrări (toggle-uri: Gmail, Telegram, WhatsApp - majoritatea cu badge "Conectat" hardcodat pentru demo)
- Șabloane (listă șabloane cu editor)
- Notificări (preferințe)
- Demo Mode (buton "🎬 Simulează mesaj nou", reset date demo, etc.)

---

## 10. Ordinea de implementare — Faze

Fazele sunt secvențiale: fiecare se încheie cu o validare, și nu se trece la următoarea fază până validarea anterioară confirmă că totul funcționează. Nu există termen-limită pe fază — fiecare task se face complet și corect înainte de a merge mai departe. Dacă un task ia mai mult decât pare normal, nu e un semnal să-l grăbim — e un semnal că merită mai multă atenție, nu mai puțină.

### FAZA 1 — Schelet vizual complet + Date demo

**Obiectiv:** Toate paginile există, navigabile, populate cu date demo. Zero funcționalitate AI încă. Demo "static" dar coerent.

**Etapa 1.1 — Setup + Layout:**
- [ ] Setup complet (pas 1-6 din secțiunea 4)
- [ ] Prisma schema + migrare + seed
- [ ] Layout principal: sidebar + topbar (componente shadcn)
- [ ] Command palette (Cmd+K) cu shadcn `command`
- [ ] Routing toate cele 10 pagini (placeholder content)
- [ ] **Validare:** navighez prin toate paginile, sidebar funcționează, command palette se deschide

**Etapa 1.2 — Pagini list & profile:**
- [ ] Pagina Acasă completă (motto + 4 stats + termene + emailuri + alerte)
- [ ] Pagina Clienți: lista + filtre + search + creare client (modal)
- [ ] Profil client: header + cele 9 tab-uri (conținut static din DB)
- [ ] **Validare:** click pe client → profil → tab-uri funcționează → datele apar

**Etapa 1.3 — Dosare + Documente:**
- [ ] Pagina Dosare: lista + filtre + tabs stare
- [ ] Profil dosar: header + arbore + timeline + panou lateral
- [ ] Pagina Documente: grid + search + filtre
- [ ] Editor document basic (Tiptap fără zone marcate încă)
- [ ] **Validare:** generare document → editor se deschide → editez → salvez

**Etapa 1.4 — Polish final Faza 1:**
- [ ] Email, Conversații, Timp, Cercetare, Setări — toate cu UI complet
- [ ] Skeleton loading states peste tot
- [ ] Toast notifications cu sonner
- [ ] Animații Framer Motion (fade între pagini, hover scale subtle)
- [ ] **Validare finală Faza 1:** demo arată impresionant chiar și fără AI

### FAZA 2 — Toate fluxurile AI funcționale

**Obiectiv:** Generare documente cu zone confirmare, OCR cu vedere split, chat AI, transcriere consultație, procesare email.

**Etapa 2.1 — Generare documente:**
- [ ] API route `/api/ai/generate-doc` cu Claude streaming
- [ ] Prompt template din secțiunea 8.1
- [ ] Editor Tiptap cu extensie custom pentru `<span class="needs-confirmation">`
- [ ] Confirmation popover (click pe span)
- [ ] 3-4 șabloane reale: chemare în judecată, contract asistență, cerere divorț, cerere pensie alimentară
- [ ] **Validare:** generez document complet pentru Maria Popescu → văd zone galbene → click → confirm → devin verzi

**Etapa 2.2 — OCR:**
- [ ] API route `/api/ai/ocr` cu Gemini Flash multimodal
- [ ] Sharp compresie înainte de trimitere
- [ ] Vedere split UI (imagine + câmpuri)
- [ ] Câmpuri cu confidence subliniate
- [ ] Buton "Confirmă și salvează la client"
- [ ] **Validare:** uploadez 3 poze diferite (buletin, contract, citație) → extragere corectă → câmpuri editabile

**Etapa 2.3 — Chat AI + Cercetare:**
- [ ] API route `/api/ai/chat` cu streaming Claude
- [ ] Pagina Chat completă cu sidebar conversații
- [ ] Selector context (client/dosar) → context injectat în prompt
- [ ] Toggle Mod Lege / Strategie (prompturi diferite)
- [ ] Pagina Cercetare cu formular + rezultate streaming
- [ ] **Validare:** întreb "Care sunt termenele de apel în Codul de Procedură Civilă?" → răspuns precis cu citare

**Etapa 2.4 — Consultații + Email:**
- [ ] API route `/api/ai/transcribe` cu Whisper
- [ ] Înregistrare audio în browser (MediaRecorder API)
- [ ] Buton "Pornesc consultația" → înregistrare → stop → upload → Whisper → Claude structurare
- [ ] Pop-up "Adaug datele la profil?"
- [ ] Procesare email cu prompt 8.5 (background job sau la click)
- [ ] Rezumate AI vizibile pe fiecare email
- [ ] **Validare:** înregistrez 2 min de audio (simulez consultație) → transcript apare → structurare corectă

**Etapa 2.5 — Polish Faza 2:**
- [ ] Toate streamings funcționează smooth
- [ ] Error handling cu toast pentru fiecare API
- [ ] Skeleton loading state pentru fiecare AI call
- [ ] **Commit Git complet** — punct de restore solid

### FAZA 3 — Telegram + Automatizări + Polish UX final

**Obiectiv:** Boții Telegram conectați, simulare WhatsApp funcțională, alerte legislative, calcul onorariu, polish vizual peste tot.

**Etapa 3.1 — Telegram boți:**
- [ ] ngrok configurat
- [ ] Bot 1 (notificări): webhook setup, primește notificări de la sistem
- [ ] Trigger notificare la: email nou procesat, termen apropiat, alerta legislativă nouă
- [ ] Bot 2 (asistent): webhook, comenzi:
  - `/start` — meniu
  - `/document [client] [tip]` — generează document
  - `/intreaba [text]` — chat AI
  - Voice message → transcriere consultație
  - Foto → OCR
- [ ] **Validare:** trimit pe Telegram "/document Maria Popescu cerere divort" → primesc fișier .docx

**Etapa 3.2 — Simulare WhatsApp + Conversații:**
- [ ] Pagina Conversații cu cele 4 conversații demo
- [ ] Toggle AI autorizat funcțional (persistă în DB)
- [ ] Buton "🎬 Simulează mesaj nou":
  - Modal: selectez client + scriu mesaj
  - Apăs trimite → 
    - Dacă AI ON: Claude generează răspuns (prompt 8.6) → apare în conversație → notificare Bot 1
    - Dacă AI OFF: doar notificare Bot 1
- [ ] **Validare:** simulez Maria (AI ON) → văd răspuns realist + notificare Telegram

**Etapa 3.3 — Alerte legislative + Onorariu:**
- [ ] 2 alerte demo în DB, vizibile pe Acasă + pe profil dosar
- [ ] Click pe alertă → drawer cu detalii + lista dosare afectate
- [ ] Calcul onorariu din TimeEntry: total ore × tarif → afișat pe profil client + raport
- [ ] Export raport CSV (real, descărcabil)
- [ ] **Validare:** vizualizez profil Maria → tab Timp → văd total ore × 800 lei/h = sumă

**Etapa 3.4 — Polish UX final peste tot:**
- [ ] Verificare ZERO erori console
- [ ] Verificare ZERO layout shift la încărcare
- [ ] Tranziții pagini smooth (Framer Motion `<AnimatePresence>`)
- [ ] Toate butoanele cu hover state + active state
- [ ] Loading skeletons impecabile
- [ ] Empty states pentru: 0 emailuri, 0 dosare, 0 timp (deși nu apar în demo)
- [ ] Verificare responsive — chiar dacă e desktop-first, să nu se spargă pe mobile
- [ ] Performanță: build production `npm run build` + `npm start` — testez în production mode

**Etapa 3.5 — Pregătire demo:**
- [ ] Script de demo: notez ordinea exactă în care arăt fluxurile (1. Acasă overview, 2. Click client Maria, 3. Generez document, 4. Arăt zone galbene, 5. OCR pe poza X, 6. Chat AI întrebare, 7. Simulez mesaj WhatsApp, 8. Vezi Telegram notificare, 9. Vezi raport timp + onorariu calculat)
- [ ] Testez tot scriptul end-to-end de 3x
- [ ] Backup .env.local + dev.db într-un folder separat (safety net)
- [ ] Pornesc ngrok cu URL stabil (plătit?) sau notez că la prezentare repornesc

---

## 11. Checklist final înainte de demo

**Tehnic:**
- [ ] `npm run build` trece fără erori
- [ ] `npm start` rulează production build local
- [ ] ngrok pornit cu URL valid
- [ ] Webhook Telegram setat la URL ngrok curent
- [ ] Toate cheile API valide (test rapid fiecare)
- [ ] Bateria laptopului plină / cablu adaptor
- [ ] Mouse extern (clickurile sunt mai fluide decât touchpad)

**Funcțional (testez 1 dată):**
- [ ] Acasă: motto vizibil, stats reale, alerte
- [ ] Clienți → Maria Popescu → toate tab-urile populate
- [ ] Generare document nou → văd zone galbene → confirm
- [ ] Upload poză → OCR → câmpuri detectate
- [ ] Chat AI → întrebare → răspuns streaming
- [ ] Înregistrare audio → transcript apare
- [ ] Simulare mesaj WhatsApp → răspuns AI + Telegram notif
- [ ] Comanda Telegram "/document" funcționează
- [ ] Voice message Telegram → transcript primit înapoi
- [ ] Pagina Timp → raport cu onorariu calculat

**Pregătire mentală:**
- [ ] Știu ordinea exactă a demo-ului
- [ ] Am răspunsuri pregătite la 5 întrebări previzibile:
  - "Cât costă lunar AI-ul?" — ~50 USD/lună la volum mediu
  - "Datele clienților merg la OpenAI/Google?" — cu DPA-uri și opt-out training (versiunea finală), pentru prototip ignoră
  - "Pot accesa de pe telefon?" — PWA, instalabilă cu un click
  - "Cum se învață sistemul de cabinetul nostru?" — șabloane personalizate + KB local
  - "Dacă AI greșește?" — toate documentele revizuite de avocat înainte de utilizare, zone marcate galben pentru atenție

---

## 12. Anti-patterns și capcane de evitat

### Anti-patterns Antigravity

❌ **NU** dai task-uri vagi: "construiește modulul Clienți complet"
✅ **DA** dai task-uri concrete: "construiește pagina /clienti/page.tsx cu tabel shadcn, coloane [X,Y,Z], date din Prisma `prisma.client.findMany()`"

❌ **NU** lași Antigravity să schimbe stack-ul pe parcurs ("vrei să folosim tRPC?")
✅ **DA** zici "stack-ul e fix conform PROTOTYPE_PLAN.md, nu propune alternative"

❌ **NU** continui după ce un task a introdus regresie
✅ **DA** `git reset --hard HEAD~1` și o iei de la capăt cu mai mult context

### Capcane tehnice clasice

❌ **NU** uita `"use client"` pe componente cu state
❌ **NU** trimite fișiere direct din browser către Gemini (CORS fail)
❌ **NU** lăsa `console.log` în production
❌ **NU** uita să adaugi `loading.tsx` în fiecare folder de rută (Next.js 14 streaming UX)
❌ **NU** commitezi `.env.local`
❌ **NU** uita că Whisper API limitează la 25MB pe fișier audio

### Capcane UX clasice

❌ **NU** folosi spinner-uri rotative — folosește skeleton screens
❌ **NU** lăsa butoane fără feedback la click (scale 0.95 + ripple)
❌ **NU** folosi modal-uri pentru acțiuni rapide — drawer/popover mai rapid mental
❌ **NU** texte gri pe gri (contrast pierdut)
❌ **NU** lăsa empty states goale ("Nu sunt date") — empty state e ocazie de feedback ("Adaugă primul tău client")

### Capcane de demo

❌ **NU** demonstra cu date care n-au sens împreună
❌ **NU** rula demo pe ngrok free fără URL stabil (se schimbă la fiecare restart)
❌ **NU** prezenta fără să fi rulat tot scriptul end-to-end de 3 ori
❌ **NU** intra în detalii tehnice neîntrebată ("aici folosim Tiptap pentru că...") — vorbește în termeni de valoare pentru avocată

---

## Documentul închide aici. Tot ce nu e aici, întreabă înainte de a implementa.
