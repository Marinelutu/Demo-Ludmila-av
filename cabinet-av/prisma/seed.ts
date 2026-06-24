import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL || `file:${path.join(process.cwd(), 'dev.db')}` });
const prisma = new PrismaClient({ adapter } as never);

async function main() {
  console.log('🌱 Seeding database...');

  // Curățăm baza de date
  await prisma.aIConversation.deleteMany();
  await prisma.legislativeAlert.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.note.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.consultation.deleteMany();
  await prisma.email.deleteMany();
  await prisma.deadline.deleteMany();
  await prisma.document.deleteMany();
  await prisma.case.deleteMany();
  await prisma.template.deleteMany();
  await prisma.client.deleteMany();

  // ============ CLIENȚI ============

  const maria = await prisma.client.create({
    data: {
      nume: 'Popescu',
      prenume: 'Maria',
      idnp: '2002012345678',
      telefon: '+373 69 123 456',
      email: 'maria.popescu@gmail.com',
      adresa: 'str. Ștefan cel Mare 42, ap. 15, Chișinău',
      note: 'Clientă din 2023. Dosar de divorț complex, copil minor.',
      status: 'activ',
      aiAuthorized: true,
    },
  });

  const ion = await prisma.client.create({
    data: {
      nume: 'Vasilescu',
      prenume: 'Ion',
      idnp: '1985073456789',
      telefon: '+373 79 987 654',
      email: 'ion.vasilescu@mail.md',
      adresa: 'bd. Moscova 18, ap. 3, Chișinău',
      note: 'Client din 2024. 2 dosare active.',
      status: 'activ',
      aiAuthorized: false,
    },
  });

  const tehnomag = await prisma.client.create({
    data: {
      nume: 'SRL Tehnomag',
      prenume: 'Andrei Munteanu',
      idnp: '1978041234567',
      telefon: '+373 22 345 678',
      email: 'office@tehnomag.md',
      adresa: 'str. Ismail 45, Chișinău',
      note: 'Companie IT, 2 dosare comerciale. Reprezentant Andrei Munteanu.',
      status: 'activ',
      aiAuthorized: false,
    },
  });

  const elena = await prisma.client.create({
    data: {
      nume: 'Botezatu',
      prenume: 'Elena',
      idnp: '1990115678901',
      telefon: '+373 68 456 789',
      email: 'elena.botezatu@gmail.com',
      adresa: 'str. Alecu Russo 12, Chișinău',
      note: 'Dosar pensie alimentară deschis recent.',
      status: 'activ',
      aiAuthorized: false,
    },
  });

  // ============ DOSARE ============

  const dosarMariaDivort = await prisma.case.create({
    data: {
      numar: '2-345/2024',
      denumire: 'Divorț Popescu Maria vs. Popescu Vasile',
      clientId: maria.id,
      tip: 'familial',
      instanta: 'Judecătoria Chișinău, sediul Centru',
      judecator: 'Andrei Ciobanu',
      stare: 'in_curs',
      articole: JSON.stringify(['Art. 33 Codul Familiei', 'Art. 36 Codul Familiei', 'Art. 78 Codul Familiei']),
      sumaLitigiu: 250000,
      descriere: 'Divorț cu partaj bunuri comune și stabilirea domiciliului copilului minor (5 ani). Soțul contestă partajul.',
    },
  });

  const dosarIonPenal = await prisma.case.create({
    data: {
      numar: '1-178/2024',
      denumire: 'Dosarul penal — martor Vasilescu Ion',
      clientId: ion.id,
      tip: 'penal',
      instanta: 'Judecătoria Chișinău, sediul Buiucani',
      judecator: 'Natalia Moraru',
      stare: 'deschis',
      articole: JSON.stringify(['Art. 90 Cod Procedură Penală']),
      descriere: 'Ion Vasilescu are calitatea de martor într-un dosar de fraudă. Necesită asistență juridică pentru audieri.',
    },
  });

  const dosarIonCivil = await prisma.case.create({
    data: {
      numar: '2-567/2024',
      denumire: 'Recuperare datorie Vasilescu vs. Rusu',
      clientId: ion.id,
      tip: 'civil',
      instanta: 'Judecătoria Chișinău, sediul Râșcani',
      judecator: 'Ion Popescu',
      stare: 'in_curs',
      sumaLitigiu: 85000,
      descriere: 'Recuperare creanță de 85.000 lei pe baza unui contract de împrumut. Debitorul contestă suma.',
    },
  });

  const dosarTehnomag1 = await prisma.case.create({
    data: {
      numar: '3-234/2024',
      denumire: 'SRL Tehnomag vs. SRL DataServ — neexecutare contract',
      clientId: tehnomag.id,
      tip: 'comercial',
      instanta: 'Curtea de Apel Chișinău',
      judecator: 'Serghei Balan',
      stare: 'in_curs',
      sumaLitigiu: 450000,
      descriere: 'Litigiu comercial pentru neexecutarea unui contract de furnizare echipamente IT în valoare de 450.000 lei.',
    },
  });

  const dosarTehnomag2 = await prisma.case.create({
    data: {
      numar: '3-456/2023',
      denumire: 'SRL Tehnomag vs. SRL MediaPlus — apel hotărâre',
      clientId: tehnomag.id,
      tip: 'comercial',
      instanta: 'Curtea de Apel Chișinău',
      judecator: 'Angela Damaschin',
      stare: 'in_apel',
      sumaLitigiu: 180000,
      descriere: 'Apel împotriva hotărârii Judecătoriei Chișinău de respingere a cererii de despăgubiri.',
    },
  });

  const dosarElena = await prisma.case.create({
    data: {
      numar: '2-890/2024',
      denumire: 'Pensie alimentară Botezatu Elena',
      clientId: elena.id,
      tip: 'familial',
      instanta: 'Judecătoria Chișinău, sediul Centru',
      judecator: 'Diana Cebotari',
      stare: 'deschis',
      articole: JSON.stringify(['Art. 75 Codul Familiei', 'Art. 78 Codul Familiei']),
      descriere: 'Cerere de stabilire a pensiei de întreținere pentru 2 copii minori. Tatăl refuză plata voluntară.',
    },
  });

  // ============ DOCUMENTE ============

  await prisma.document.createMany({
    data: [
      // Maria Popescu
      {
        nume: 'Contract de asistență juridică nr. 12/2024',
        tip: 'contract',
        categorie: 'intrare',
        clientId: maria.id,
        caseId: dosarMariaDivort.id,
        htmlContent: '<h1>Contract de asistență juridică nr. 12/2024</h1><p>Încheiat la data de 15.01.2024 între <strong>Av. Ludmila Trofim</strong>, cabinet individual de avocat, și <strong>Popescu Maria</strong>, IDNP 2002012345678.</p><p><strong>Obiectul contractului:</strong> Reprezentarea și asistența juridică în dosarul de divorț nr. 2-345/2024.</p><p><strong>Onorariul:</strong> <span class="needs-confirmation" data-reason="Suma trebuie confirmată cu clienta">15.000 lei</span></p>',
        textContent: 'Contract de asistență juridică nr. 12/2024. Încheiat la data de 15.01.2024 între Av. Ludmila Trofim și Popescu Maria.',
      },
      {
        nume: 'Copie buletin Maria Popescu',
        tip: 'act',
        categorie: 'proba',
        clientId: maria.id,
        caseId: dosarMariaDivort.id,
        textContent: 'Buletin de identitate Maria Popescu, IDNP 2002012345678, eliberat 12.03.2020.',
        ocrStatus: 'done',
        ocrFields: JSON.stringify([
          { nume_camp: 'IDNP', valoare: '2002012345678', confidence: 0.98 },
          { nume_camp: 'Nume', valoare: 'Popescu', confidence: 0.95 },
          { nume_camp: 'Prenume', valoare: 'Maria', confidence: 0.95 },
          { nume_camp: 'Data nașterii', valoare: '15.01.2002', confidence: 0.92 },
        ]),
      },
      {
        nume: 'Cerere de chemare în judecată — divorț',
        tip: 'cerere',
        categorie: 'generat',
        clientId: maria.id,
        caseId: dosarMariaDivort.id,
        htmlContent: '<h1>CERERE DE CHEMARE ÎN JUDECATĂ</h1><h2>privind desfacerea căsătoriei și partajul bunurilor comune</h2><p><strong>Instanța:</strong> Judecătoria Chișinău, sediul Centru</p><p><strong>Reclamant:</strong> Popescu Maria, IDNP 2002012345678, domiciliată: str. Ștefan cel Mare 42, ap. 15, Chișinău</p><p><strong>Pârât:</strong> <span class="needs-confirmation" data-reason="Verificați numele complet al soțului">Popescu Vasile, IDNP 1998053456789</span>, domiciliat: <span class="needs-confirmation" data-reason="Adresa pârâtului trebuie verificată">str. Independenței 10, Chișinău</span></p><p>În temeiul art. 33 și art. 36 din Codul Familiei al Republicii Moldova, solicit:</p><ol><li>Desfacerea căsătoriei nr. <span class="needs-confirmation" data-reason="Verificați numărul certificatului">AB-1234567</span>, înregistrată la data de 12.06.2019;</li><li>Partajul bunurilor comune;</li><li>Stabilirea domiciliului copilului minor <span class="needs-confirmation" data-reason="Numele copilului necesită confirmare">Alexandru Popescu</span>, născut la 15.03.2019, la domiciliul reclamantei.</li></ol>',
        textContent: 'Cerere de chemare în judecată privind desfacerea căsătoriei și partajul bunurilor comune.',
      },
      {
        nume: 'Hotărâre prima instanță',
        tip: 'hotarare',
        categorie: 'hotarare',
        clientId: maria.id,
        caseId: dosarMariaDivort.id,
        htmlContent: '<h1>HOTĂRÂRE</h1><p>În numele legii</p><p>Judecătoria Chișinău, sediul Centru, în componența judecătorului Andrei Ciobanu, examinând cauza civilă nr. 2-345/2024...</p><p>Admite parțial cererea reclamantei Popescu Maria. Dispune desfacerea căsătoriei. Partajul bunurilor — amânat pentru ședință separată.</p>',
        textContent: 'Hotărâre prima instanță. Admite parțial cererea reclamantei Popescu Maria.',
      },
      {
        nume: 'Cerere de apel',
        tip: 'cerere',
        categorie: 'generat',
        clientId: maria.id,
        caseId: dosarMariaDivort.id,
        htmlContent: '<h1>CERERE DE APEL</h1><p>Împotriva hotărârii Judecătoriei Chișinău din 20.09.2024 în dosarul nr. 2-345/2024.</p><p>Solicităm modificarea hotărârii în partea privind partajul bunurilor comune.</p>',
        textContent: 'Cerere de apel împotriva hotărârii din 20.09.2024.',
      },
      // Ion Vasilescu
      {
        nume: 'Contract asistență juridică Ion Vasilescu',
        tip: 'contract',
        categorie: 'intrare',
        clientId: ion.id,
        caseId: dosarIonPenal.id,
        htmlContent: '<h1>Contract de asistență juridică nr. 28/2024</h1><p>Încheiat între Av. Ludmila Trofim și Vasilescu Ion pentru asistență în dosarul penal 1-178/2024.</p>',
        textContent: 'Contract de asistență juridică nr. 28/2024 cu Vasilescu Ion.',
      },
      {
        nume: 'Declarație martor Vasilescu Ion',
        tip: 'act',
        categorie: 'proba',
        clientId: ion.id,
        caseId: dosarIonPenal.id,
        textContent: 'Declarație martor Ion Vasilescu în dosarul penal 1-178/2024.',
      },
      {
        nume: 'Contract împrumut Vasilescu-Rusu',
        tip: 'contract',
        categorie: 'proba',
        clientId: ion.id,
        caseId: dosarIonCivil.id,
        textContent: 'Contract de împrumut între Vasilescu Ion și Rusu Gheorghe, suma 85.000 lei.',
      },
      {
        nume: 'Cerere recuperare datorie',
        tip: 'cerere',
        categorie: 'generat',
        clientId: ion.id,
        caseId: dosarIonCivil.id,
        htmlContent: '<h1>CERERE DE CHEMARE ÎN JUDECATĂ</h1><p>privind recuperarea creanței</p><p>Reclamant: Vasilescu Ion. Pârât: Rusu Gheorghe. Suma: 85.000 lei.</p>',
        textContent: 'Cerere de chemare în judecată privind recuperarea creanței de 85.000 lei.',
      },
      // SRL Tehnomag
      {
        nume: 'Contract furnizare echipamente IT',
        tip: 'contract',
        categorie: 'proba',
        clientId: tehnomag.id,
        caseId: dosarTehnomag1.id,
        textContent: 'Contract de furnizare echipamente IT între SRL Tehnomag și SRL DataServ.',
      },
      {
        nume: 'Factura fiscală nr. 567/2024',
        tip: 'act',
        categorie: 'proba',
        clientId: tehnomag.id,
        caseId: dosarTehnomag1.id,
        textContent: 'Factura fiscală nr. 567/2024 pentru echipamente IT, suma 450.000 lei.',
      },
      {
        nume: 'Cerere reconvențională SRL DataServ',
        tip: 'cerere',
        categorie: 'intrare',
        clientId: tehnomag.id,
        caseId: dosarTehnomag1.id,
        textContent: 'Cerere reconvențională depusă de SRL DataServ.',
      },
      {
        nume: 'Hotărâre Judecătoria Chișinău — MediaPlus',
        tip: 'hotarare',
        categorie: 'hotarare',
        clientId: tehnomag.id,
        caseId: dosarTehnomag2.id,
        textContent: 'Hotărârea Judecătoriei Chișinău de respingere a cererii SRL Tehnomag vs SRL MediaPlus.',
      },
      {
        nume: 'Apel SRL Tehnomag vs MediaPlus',
        tip: 'cerere',
        categorie: 'generat',
        clientId: tehnomag.id,
        caseId: dosarTehnomag2.id,
        htmlContent: '<h1>CERERE DE APEL</h1><p>SRL Tehnomag contestă hotărârea Judecătoriei Chișinău în dosarul 3-456/2023.</p>',
        textContent: 'Cerere de apel SRL Tehnomag vs SRL MediaPlus.',
      },
      // Elena Botezatu
      {
        nume: 'Cerere pensie alimentară Botezatu Elena',
        tip: 'cerere',
        categorie: 'generat',
        clientId: elena.id,
        caseId: dosarElena.id,
        htmlContent: '<h1>CERERE DE CHEMARE ÎN JUDECATĂ</h1><h2>privind stabilirea pensiei de întreținere</h2><p><strong>Reclamant:</strong> Botezatu Elena, IDNP 1990115678901</p><p>Solicit stabilirea pensiei de întreținere pentru 2 copii minori conform art. 75 Codul Familiei.</p>',
        textContent: 'Cerere de stabilire a pensiei de întreținere pentru 2 copii minori.',
      },
    ],
  });

  // ============ TERMENE ============

  const now = new Date();

  await prisma.deadline.createMany({
    data: [
      {
        caseId: dosarMariaDivort.id,
        tip: 'apel',
        data: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        status: 'activ',
        descriere: 'Termen depunere motivare apel — dosar divorț Maria Popescu',
      },
      {
        caseId: dosarTehnomag1.id,
        tip: 'sedinta',
        data: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000),
        status: 'activ',
        descriere: 'Ședință de judecată — SRL Tehnomag vs SRL DataServ',
      },
      {
        caseId: dosarElena.id,
        tip: 'depunere',
        data: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
        status: 'activ',
        descriere: 'Termen depunere acte adiționale — dosar Elena Botezatu',
      },
    ],
  });

  // ============ EMAILURI ============

  await prisma.email.createMany({
    data: [
      {
        expeditor: 'maria.popescu@gmail.com',
        destinatar: 'av.ludmila@cabinet.md',
        subiect: 'Întrebare urgentă — stadiul dosarului divorț și custodia copilului',
        continut: `Bună ziua, doamnă avocat Trofim,

Vă scriu deoarece sunt extrem de îngrijorată de situația dosarului nostru de divorț. Au trecut deja 3 luni de la depunerea cererii și nu am primit nicio actualizare oficială.

Câteva întrebări urgente:
1. Soțul meu (Vasile Popescu, IDNP 2009876543210) a primit citația pentru ședința din luna aceasta? El mi-a spus că nu știe nimic, ceea ce mă face să cred că vrea să tergiverseze procesul.
2. Referitor la custodia fiului nostru Alexandru (8 ani) — avocatul lui a depus o cerere reconvențională pentru custodie comună. Ce șanse avem să obținem custodia exclusivă?
3. Am aflat că soțul a vândut mașina noastră (Skoda Octavia, nr. ABC123) în luna trecută, deși era bun comun. Putem face ceva?

Vă rog să mă contactați cât mai repede. Numărul meu de telefon este +373 79 123 456.

Cu stimă,
Maria Popescu`,
        sursa: 'gmail',
        data: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        clientId: maria.id,
        caseId: dosarMariaDivort.id,
        aiSummary: 'Clienta ridică 3 probleme: (1) confirmare citare pârât, (2) strategie custodie exclusivă vs cerere reconvențională custodie comună, (3) înstrăinare bun comun (mașină) în timpul procesului — posibil fraudă procesuală.',
        aiAction: 'Urgent: verificați dacă Vasile Popescu a fost citat; depuneți cerere de sechestru asigurator pe bunuri comune; pregătiți răspuns la cererea reconvențională de custodie.',
        status: 'procesat',
      },
      {
        expeditor: 'av.gheorghe@avocatura.md',
        destinatar: 'av.ludmila@cabinet.md',
        subiect: 'Propunere colaborare — dosar comercial complex (fond 1.2M lei)',
        continut: `Stimată colegă Ludmila,

Sper că ești bine. Îți scriu în legătură cu un dosar comercial nou pe care l-am primit și care depășește aria mea de specializare principală (drept penal).

Situația pe scurt: clientul meu, SRL Constructiv Grup, a intrat într-un litigiu cu un contractor internațional (firma austriacă Bauer GmbH) privind rezilierea unui contract de construcție în valoare de 4,2 milioane euro. Fondul de 1,2 milioane lei reprezintă penalitățile contractuale solicitate.

Complexitatea dosarului:
- Contract cu clauze de arbitraj internațional (ICC Paris), dar contractorul a ales să deschidă acțiunea la instanța din Chișinău
- Probleme de drept internațional privat — aplicabilitatea legii austriece vs. moldovenești
- Termen scurt: 15 zile pentru depunerea întâmpinării

Știind experiența ta în drept comercial și relațiile contractuale internaționale, m-am gândit că am putea colabora. Eu gestionez aspectele penale dacă apar (suspiciune de fraudă contractuală), tu preiei litigiul civil/comercial propriu-zis.

Onorariul l-am discuta împreună. Clientul are resurse și este dispus la onorariu de succes 15%.

Putem discuta joi sau vineri la cabinetul tău?

Cu colegialitate,
Av. Gheorghe Munteanu
Tel: +373 22 456 789`,
        sursa: 'gmail',
        data: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        aiSummary: 'Coleg avocat (drept penal) propune colaborare pe litigiu comercial internațional SRL Constructiv Grup vs Bauer GmbH (Austria), fond 1,2M lei penalități. Termen de 15 zile pentru întâmpinare. Onorariu de succes 15%.',
        aiAction: 'Analizați clauza de arbitraj ICC — dacă instanța RM are competență; programați întâlnire joi/vineri; solicitați copia contractului și actul de sesizare.',
        status: 'procesat',
      },
      {
        expeditor: 'grefa@judecatoria-chisinau.justice.md',
        destinatar: 'av.ludmila@cabinet.md',
        subiect: `CITAȚIE — Dosar nr. 3-234/2024 — Ședință ${new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000).toLocaleDateString('ro-RO')}`,
        continut: `JUDECĂTORIA CHIȘINĂU
Sediul Central — str. Pushkin 47, mun. Chișinău
Grefier: Olga Ciobanu | Tel: 022-221-456 | grefa@judecatoria-chisinau.justice.md

─────────────────────────────────────────────
CITAȚIE
─────────────────────────────────────────────

Dosar nr.: 3-234/2024
Reclamant: SRL TEHNOMAG, IDNO 1005600123456, repr. prin Av. Ludmila Trofim
Pârât: SRL DATASERV, IDNO 1007800987654
Obiect: Recuperare creanță — 85.000 lei + penalități contractuale

Prin prezenta vă comunicăm că ȘEDINȚA DE JUDECATĂ în dosarul menționat este programată pentru:

DATA: ${new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000).toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
ORA: 10:00
SALA: 12 (etaj II)
JUDECĂTOR: Mihail Rotaru

La ședință se vor examina:
1. Admiterea probelor suplimentare (facturile depuse de reclamant)
2. Audierea martorului Andrei Bogdan (directorul comercial SRL Tehnomag)
3. Dezbaterile pe fond dacă va fi cazul

ATENȚIE: Reprezentantul legal este obligat să se prezinte cu împuternicire notarială actualizată și legitimația de avocat.

Neprezentarea nejustificată poate atrage judecarea în lipsă conform art. 205 CPC RM.

─────────────────────────────────────────────
Grefier principal: Olga Ciobanu
Judecătoria Chișinău, Sediul Central`,
        sursa: 'justice_md',
        data: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        clientId: tehnomag.id,
        caseId: dosarTehnomag1.id,
        aiSummary: `Citație oficială pentru ședința din ${new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000).toLocaleDateString('ro-RO')}, ora 10:00, Sala 12, judecător Mihail Rotaru. Agenda: probe suplimentare (facturi) + martor Andrei Bogdan + dezbateri fond.`,
        aiAction: 'Pregătiți: (1) împuternicire notarială actualizată, (2) coordonați prezența martorului Andrei Bogdan, (3) finalizați argumentele pe fond, (4) informați clientul SRL Tehnomag.',
        status: 'nou',
        hasAttachments: false,
      },
      {
        expeditor: 'grefa@curtea-apel.justice.md',
        destinatar: 'av.ludmila@cabinet.md',
        subiect: 'Hotărâre primă instanță — dosar 2-345/2024 — Popescu M. vs Popescu V.',
        continut: `CURTEA DE APEL CHIȘINĂU
Serviciul Grefă — Secția Civilă
Tel: 022-234-567 | grefa@curtea-apel.justice.md

─────────────────────────────────────────────
COMUNICARE HOTĂRÂRE
─────────────────────────────────────────────

Dosar nr.: 2-345/2024
Instanța: Judecătoria Chișinău, Sediul Central
Data pronunțării: ${new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString('ro-RO')}

Prin prezenta vă transmitem HOTĂRÂREA JUDECĂTORIEI CHIȘINĂU în dosarul nr. 2-345/2024:

POPESCU MARIA, IDNP 2012345678901 — Reclamantă
vs.
POPESCU VASILE, IDNP 2009876543210 — Pârât

DISPOZITIV:
Instanța ADMITE PARȚIAL acțiunea reclamantei și dispune:
1. ✅ DESFACEREA CĂSĂTORIEI înregistrate la data de 12.06.2015, act nr. 123/2015
2. ✅ STABILIREA DOMICILIULUI minorului Alexandru Popescu, n. 15.03.2016, la mamă (reclamantă)
3. ✅ OBLIGAREA pârâtului la plata pensiei de întreținere în cuantum de 25% din venitul lunar, începând cu data pronunțării
4. ❌ RESPINGE cererea privind împărțirea apartamentului (str. Calea Ieșilor 5, ap. 12) — instanța apreciază că bunul a fost dobândit anterior căsătoriei (donație de la părinții pârâtului)

TERMEN DE APEL: 30 de zile de la comunicare (art. 362 CPC RM)
Hotărârea integrală este atașată în format PDF.

─────────────────────────────────────────────
Grefier: Ion Barbă | Judecătoria Chișinău`,
        sursa: 'justice_md',
        data: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        clientId: maria.id,
        caseId: dosarMariaDivort.id,
        aiSummary: 'Hotărâre admisă parțial: divorț ✅, custodie minor la mamă ✅, pensie alimentară 25% ✅, dar împărțirea apartamentului ❌ RESPINSĂ (bun personal pârât). Termen apel: 30 zile.',
        aiAction: 'URGENT: Analizați motivarea respingerii cererii privind apartamentul — dacă donația poate fi contestată; discutați cu Maria oportunitatea apelului; termen scurt de 30 zile.',
        status: 'procesat',
        hasAttachments: true,
        attachments: JSON.stringify(['hotarare_2-345-2024_integral.pdf']),
      },
      {
        expeditor: 'ion.vasilescu@mail.md',
        destinatar: 'av.ludmila@cabinet.md',
        subiect: 'Documente dosar — contractul original + dovezi plată parțială',
        continut: `Bună ziua, doamnă avocat Trofim,

Conform discuției noastre telefonice de ieri, vă trimit documentele solicitate pentru dosarul de recuperare a creanței față de Andrei Moraru.

Documentele atașate:
1. CONTRACT DE ÎMPRUMUT din 15 martie 2023 — suma totală 85.000 lei, termen rambursare 15 septembrie 2023 (semnat de ambele părți, în original scanat)
2. CHITANȚĂ nr. 1 — 20.000 lei, plătit la 01.04.2023 (Moraru a recunoscut că a primit o parte)
3. CHITANȚĂ nr. 2 — 10.000 lei, plătit la 15.05.2023
4. MESAJE WHATSAPP — conversație în care Moraru recunoaște datoria și promite rambursarea până în octombrie (screenshot-uri, 8 pagini)
5. EXTRAS CONT BANCAR — transferul inițial de 85.000 lei din contul meu în contul lui Moraru (confirmă suma împrumutată)

IMPORTANT: Am descoperit că Moraru a pus apartamentul pe numele soției lui în august 2023 (imediat după ce a expirat termenul de rambursare). Cred că a făcut asta ca să ascundă bunurile. Poate fi atacat acest transfer?

Suma rămasă nerecuperată: 55.000 lei + dobânzi contractuale 12%/an.

Vă rog să îmi confirmați primirea documentelor.

Cu respect,
Ion Vasilescu
Tel: +373 60 987 654`,
        sursa: 'gmail',
        data: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        clientId: ion.id,
        caseId: dosarIonCivil.id,
        aiSummary: 'Ion Vasilescu trimite: contract împrumut 85.000 lei, 2 chitanțe (plăți parțiale 30.000 lei), mesaje WhatsApp cu recunoaștere datorie, extras cont. Suma restantă: 55.000 lei + dobânzi 12%. Alertă: debitorul a transferat apartamentul pe soție în august 2023 — posibil actul simulat.',
        aiAction: 'Verificați data transferului apartamentului față de data scadenței — dacă e ulterioară, acțiune pauliană posibilă (art. 530 CC RM). Solicitați extras CF pentru apartamentul lui Moraru. Depuneți cerere de sechestru pe bunurile debitorului.',
        status: 'nou',
        hasAttachments: true,
        attachments: JSON.stringify(['contract_imprumut_15032023.pdf', 'chitanta_1_20000lei.jpg', 'chitanta_2_10000lei.jpg', 'whatsapp_moraru_8pag.pdf', 'extras_cont_BCR.pdf']),
      },
      {
        expeditor: 'office@tehnomag.md',
        destinatar: 'av.ludmila@cabinet.md',
        subiect: 'Facturi suplimentare + situație livrări — dosar DataServ',
        continut: `Doamnă avocat Trofim,

Conform celor discutate la ultima ședință, am efectuat un audit intern complet al relației comerciale cu SRL DataServ și am identificat documente suplimentare importante.

PROBE NOI IDENTIFICATE:

1. FACTURA nr. 568/2023 — 35.000 lei (livrare servere Dell PowerEdge, 15.08.2023) — NEPLĂTITĂ
   Aviz de însoțire semnat de directorul DataServ, Petru Oprea

2. FACTURA nr. 569/2023 — 27.500 lei (livrare echipamente rețea Cisco, 30.08.2023) — NEPLĂTITĂ
   Aviz de însoțire semnat + bon de recepție cu ștampila DataServ

3. EMAIL-URI INTERNE DataServ (obținute legal) — în care directorul Petru Oprea recunoaște că "Tehnomag a livrat tot" și că "trebuie să găsim bani" — relevante pentru demonstrarea relei credințe

4. CONTRACT CADRU 2022 cu clauza penalități 0.1%/zi întârziere — suma penalităților calculate: 18.600 lei până azi

TOTAL CREANȚĂ ACTUALIZATĂ: 85.000 lei principal + 18.600 lei penalități = 103.600 lei

Directorul nostru, dl Andrei Bogdan, este disponibil pentru audiere marți sau miercuri. Vă rugăm să îl informați despre ora exactă a ședinței.

Cu stimă,
Secretariat SRL TEHNOMAG
office@tehnomag.md | Tel: +373 22 567 890`,
        sursa: 'gmail',
        data: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        clientId: tehnomag.id,
        caseId: dosarTehnomag1.id,
        aiSummary: 'SRL Tehnomag trimite probe noi: 2 facturi neplătite (62.500 lei), email-uri interne DataServ cu recunoaștere datorie, calcul penalități 18.600 lei. Creanță totală actualizată: 103.600 lei. Directorul Andrei Bogdan disponibil pentru audiere marți/miercuri.',
        aiAction: 'Depuneți cerere de admitere probe suplimentare înainte de ședință; notificați instanța despre martorul Bogdan (disponibil mar/mie); recalculați valoarea acțiunii la 103.600 lei; verificați admisibilitatea email-urilor interne ca probă.',
        status: 'nou',
        hasAttachments: true,
        attachments: JSON.stringify(['factura_568_2023.pdf', 'factura_569_2023.pdf', 'avize_insotire.pdf', 'emailuri_interne_dataserv.pdf', 'calcul_penalitati.xlsx']),
      },
      {
        expeditor: 'elena.botezatu@gmail.com',
        destinatar: 'av.ludmila@cabinet.md',
        subiect: 'URGENT — 3 luni fără pensie alimentară, copiii suferă',
        continut: `Doamnă avocat Trofim, bună seara,

Vă scriu din nou, mai disperată ca oricând. Fostul meu soț, Alexandru Botezatu (IDNP 2001234567890), NU a plătit pensia alimentară nici în aprilie, nici în mai, nici în iunie. Este vorba de 3 luni consecutive, total neachitat: 3 × 2.400 lei = 7.200 lei.

Situația concretă:
- Hotărârea judecătorească stabilește 2.400 lei/lună (câte 1.200 lei per copil, am doi copii: Ioana 7 ani și Mihai 5 ani)
- Hotărârea a rămas definitivă din martie 2024
- El lucrează la SRL Viorela Trans (IDNO 1008900111222) ca șofer de TIR, salariu aproximativ 12.000-15.000 lei/lună
- Mi-a spus că "nu are bani" dar l-am văzut pe Facebook că și-a cumpărat o motocicletă nouă

Ce pot face? Pot fi executat silit? Poate fi reținut la frontieră? El pleacă des în România cu TIR-ul.

Copiii întreabă de mâncare și eu nu știu ce să le spun. Vă rog din suflet să mă ajutați cât mai repede.

Elena Botezatu
Tel: +373 78 234 567`,
        sursa: 'gmail',
        data: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        clientId: elena.id,
        caseId: dosarElena.id,
        aiSummary: 'Elena Botezatu raportează 3 luni pensie alimentară neachitată (7.200 lei total). Debitorul lucrează la SRL Viorela Trans, salariu ~12-15k lei, dar refuză plata — posibil tăinuire venituri. Solicită executare silită urgentă și interdicție ieșire din țară.',
        aiAction: 'URGENT: (1) Depuneți cerere executor judecătoresc pentru poprire salariu la SRL Viorela Trans; (2) Solicitați interdicție de ieșire din țară (relevanță: pleacă des în România); (3) Depuneți plângere penală art. 202 CP RM (eschivare plată pensie alimentară — 3 luni consecutive depășesc pragul).',
        status: 'nou',
      },
    ],
  });

  // ============ CONSULTAȚII ============

  await prisma.consultation.createMany({
    data: [
      {
        clientId: maria.id,
        transcript: 'Clienta Maria Popescu a venit la cabinet pentru a discuta despre procedura de divorț. A menționat că soțul refuză să părăsească domiciliul comun și că are un copil minor de 5 ani. A exprimat dorința de a obține custodia copilului. Am discutat despre posibilitatea partajului bunurilor comune, inclusiv un apartament cumpărat în timpul căsătoriei. Clienta a menționat că apartamentul este evaluat la aproximativ 1.200.000 lei. Am convenit să depunem cererea de chemare în judecată la Judecătoria Chișinău.',
        structuredData: JSON.stringify({
          nume_client: 'Maria Popescu',
          natura_cazului: 'familial',
          fapte_cheie: [
            'Soțul refuză să părăsească domiciliul comun',
            'Copil minor de 5 ani',
            'Apartament comun evaluat la ~1.200.000 lei',
            'Clienta dorește custodia copilului',
          ],
          date_mentionate: [{ data: '2019-06-12', context: 'Data căsătoriei' }],
          sume_mentionate: [{ suma: 1200000, valuta: 'MDL', context: 'Valoarea apartamentului' }],
          documente_necesare: ['Certificat de căsătorie', 'Certificat de naștere copil', 'Act de proprietate apartament'],
          actiuni_agreate: ['Depunere cerere chemare în judecată', 'Obținere act proprietate de la cadastru'],
          termene_critice: ['Termen general de 30 zile pentru apel'],
        }),
        durata: 2700,
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        clientId: ion.id,
        transcript: 'Clientul Ion Vasilescu solicită asistență juridică pentru recuperarea unui împrumut de 85.000 lei acordat lui Rusu Gheorghe. Are un contract de împrumut semnat și 3 chitanțe de plată parțială. Debitorul refuză să mai plătească. Am recomandat depunerea unei cereri de chemare în judecată la Judecătoria Chișinău.',
        structuredData: JSON.stringify({
          nume_client: 'Ion Vasilescu',
          natura_cazului: 'civil',
          fapte_cheie: [
            'Împrumut de 85.000 lei acordat lui Rusu Gheorghe',
            'Există contract de împrumut semnat',
            '3 chitanțe de plată parțială',
            'Debitorul refuză plata restului',
          ],
          sume_mentionate: [{ suma: 85000, valuta: 'MDL', context: 'Suma împrumutului' }],
          documente_necesare: ['Contract de împrumut original', 'Chitanțe de plată'],
          actiuni_agreate: ['Depunere cerere de chemare în judecată'],
          termene_critice: [],
        }),
        durata: 1800,
        createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        clientId: elena.id,
        transcript: 'Elena Botezatu a solicitat asistență juridică pentru stabilirea pensiei alimentare. Are 2 copii minori cu fostul soț care refuză plata voluntară. Am discutat despre art. 75 din Codul Familiei și cuantumul minim prevăzut de lege. Clienta a precizat că fostul soț câștigă aproximativ 25.000 lei lunar.',
        structuredData: JSON.stringify({
          nume_client: 'Elena Botezatu',
          natura_cazului: 'familial',
          fapte_cheie: [
            '2 copii minori',
            'Fostul soț refuză plata voluntară a pensiei',
            'Venitul fostului soț: ~25.000 lei/lună',
          ],
          sume_mentionate: [{ suma: 25000, valuta: 'MDL', context: 'Venitul lunar al tatălui' }],
          documente_necesare: ['Certificate de naștere copii', 'Hotărâre de divorț', 'Adeverință salariu tată'],
          actiuni_agreate: ['Depunere cerere stabilire pensie alimentară'],
          termene_critice: ['Urgent — copiii au nevoie de susținere imediată'],
        }),
        durata: 2100,
        createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // ============ ÎNREGISTRĂRI TIMP ============

  await prisma.timeEntry.createMany({
    data: [
      // Maria Popescu
      {
        clientId: maria.id,
        caseId: dosarMariaDivort.id,
        categorie: 'redactare',
        descriere: 'Redactare cerere de chemare în judecată',
        startTime: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        durata: 10800,
        automatic: false,
      },
      {
        clientId: maria.id,
        caseId: dosarMariaDivort.id,
        categorie: 'sedinta',
        descriere: 'Ședință de judecată — prima instanță',
        startTime: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        durata: 7200,
        automatic: false,
      },
      {
        clientId: maria.id,
        caseId: dosarMariaDivort.id,
        categorie: 'studiere',
        descriere: 'Studiere hotărâre primă instanță + pregătire apel',
        startTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        durata: 14400,
        automatic: false,
      },
      // SRL Tehnomag
      {
        clientId: tehnomag.id,
        caseId: dosarTehnomag1.id,
        categorie: 'redactare',
        descriere: 'Redactare întâmpinare la cererea reconvențională',
        startTime: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
        durata: 18000,
        automatic: false,
      },
      {
        clientId: tehnomag.id,
        caseId: dosarTehnomag1.id,
        categorie: 'email',
        descriere: 'Corespondență cu clientul și analiza facturi',
        startTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000),
        durata: 5400,
        automatic: false,
      },
      {
        clientId: tehnomag.id,
        caseId: dosarTehnomag2.id,
        categorie: 'redactare',
        descriere: 'Redactare cerere de apel SRL MediaPlus',
        startTime: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        durata: 14400,
        automatic: false,
      },
      {
        clientId: tehnomag.id,
        caseId: dosarTehnomag1.id,
        categorie: 'apel',
        descriere: 'Convorbire telefonică cu reprezentantul Tehnomag',
        startTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 0.5 * 60 * 60 * 1000),
        durata: 1800,
        automatic: false,
      },
      {
        clientId: tehnomag.id,
        caseId: dosarTehnomag1.id,
        categorie: 'studiere',
        descriere: 'Studiere jurisprudență relevantă cazului DataServ',
        startTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        durata: 10800,
        automatic: false,
      },
      // Auto-detected entries
      {
        clientId: maria.id,
        categorie: 'studiere',
        descriere: 'Sesiune AI dashboard: cercetare legislativă art. 78 Codul Familiei',
        startTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 12 * 60 * 1000),
        durata: 720,
        automatic: true,
      },
      {
        clientId: elena.id,
        categorie: 'redactare',
        descriere: 'Editare document: cerere pensie alimentară',
        startTime: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 12 * 60 * 60 * 1000 + 23 * 60 * 1000),
        durata: 1380,
        automatic: true,
      },
      {
        categorie: 'email',
        descriere: 'Procesare email: batch emailuri noi',
        startTime: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 4 * 60 * 60 * 1000 + 5 * 60 * 1000),
        durata: 300,
        automatic: true,
      },
    ],
  });

  // ============ CONTRACTE ============

  await prisma.contract.createMany({
    data: [
      {
        clientId: maria.id,
        tip: 'asistenta_juridica',
        numar: '12/2024',
        data: new Date(2024, 0, 15),
        onorariu: 15000,
        status: 'activ',
      },
      {
        clientId: ion.id,
        tip: 'asistenta_juridica',
        numar: '28/2024',
        data: new Date(2024, 2, 10),
        onorariu: 10000,
        status: 'activ',
      },
      {
        clientId: tehnomag.id,
        tip: 'asistenta_juridica',
        numar: '35/2024',
        data: new Date(2024, 1, 20),
        onorariu: 35000,
        status: 'activ',
      },
      {
        clientId: elena.id,
        tip: 'consultatie',
        numar: '42/2024',
        data: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        onorariu: 5000,
        status: 'activ',
      },
    ],
  });

  // ============ NOTIȚE ============

  await prisma.note.createMany({
    data: [
      {
        clientId: maria.id,
        continut: 'Maria a menționat că soțul ar putea ascunde bunuri mobile. De verificat la registrul bunurilor.',
        confidential: true,
        createdAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
      },
      {
        clientId: maria.id,
        continut: 'Clienta preferă comunicarea pe WhatsApp, nu prin email. Răspunde rapid dimineața.',
        confidential: false,
        createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        clientId: ion.id,
        continut: 'Ion are chitanțe parțiale de la debitor. Suma totală plătită: 30.000 lei din 85.000.',
        confidential: false,
        createdAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
      },
      {
        clientId: tehnomag.id,
        continut: 'Discutat cu directorul. Sunt dispuși la tranzacție dacă DataServ acceptă plata a 70% din datorie.',
        confidential: true,
        createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // ============ CONVERSAȚII CLIENT ============

  await prisma.conversation.createMany({
    data: [
      {
        clientId: maria.id,
        platforma: 'whatsapp',
        aiAuthorized: true,
        recentMessages: JSON.stringify([
          { from: 'client', text: 'Bună ziua! Am primit citația pentru ședință.', time: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString() },
          { from: 'avocat', text: 'Bună, Maria! Da, ședința e programată. Vă voi suna mâine să discutăm detaliile.', time: new Date(now.getTime() - 2.5 * 60 * 60 * 1000).toISOString() },
          { from: 'client', text: 'Mulțumesc! Trebuie să aduc ceva documente?', time: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString() },
          { from: 'ai', text: 'Bună ziua, Maria! Pentru ședință nu este necesar să aduceți documente suplimentare — am tot ce este necesar în dosar. Vă voi suna mâine pentru a discuta strategia. O zi bună!', time: new Date(now.getTime() - 1.5 * 60 * 60 * 1000).toISOString() },
        ]),
        lastActiveAt: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
      },
      {
        clientId: ion.id,
        platforma: 'telegram',
        aiAuthorized: false,
        recentMessages: JSON.stringify([
          { from: 'client', text: 'Bună ziua. Am trimis documentele pe email.', time: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString() },
          { from: 'avocat', text: 'Mulțumesc, Ion. Le voi verifica astăzi.', time: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString() },
        ]),
        lastActiveAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      },
      {
        clientId: tehnomag.id,
        platforma: 'viber',
        aiAuthorized: false,
        recentMessages: JSON.stringify([
          { from: 'client', text: 'Am găsit facturi suplimentare. Le trimit pe email.', time: new Date(now.getTime() - 7 * 60 * 60 * 1000).toISOString() },
          { from: 'avocat', text: 'Perfect, le aștept. Sunt importante pentru dosar.', time: new Date(now.getTime() - 6.5 * 60 * 60 * 1000).toISOString() },
        ]),
        lastActiveAt: new Date(now.getTime() - 6.5 * 60 * 60 * 1000),
      },
      {
        clientId: elena.id,
        platforma: 'whatsapp',
        aiAuthorized: false,
        recentMessages: JSON.stringify([
          { from: 'client', text: 'Bună ziua. Fostul soț iar nu a plătit pensia.', time: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString() },
          { from: 'avocat', text: 'Bună, Elena. Vă voi contacta mâine pentru a discuta opțiunile de executare silită.', time: new Date(now.getTime() - 2.5 * 60 * 60 * 1000).toISOString() },
        ]),
        lastActiveAt: new Date(now.getTime() - 2.5 * 60 * 60 * 1000),
      },
    ],
  });

  // ============ ALERTE LEGISLATIVE ============

  await prisma.legislativeAlert.createMany({
    data: [
      {
        titlu: 'Modificare Codul Familiei — Art. 78',
        descriere: 'Articolul 78 din Codul Familiei al Republicii Moldova a fost modificat prin Legea nr. 156/2024. Noile prevederi schimbă modul de calcul al pensiei de întreținere, introducând un cuantum minim garantat de 30% din salariul mediu pe economie. Modificarea intră în vigoare la 01.01.2025.',
        actNormativ: 'Legea nr. 156/2024 privind modificarea Codului Familiei',
        articol: 'Art. 78',
        affectedCaseIds: JSON.stringify([dosarElena.id, dosarMariaDivort.id]),
        status: 'noua',
      },
      {
        titlu: 'Lege nouă privind executarea hotărârilor judecătorești',
        descriere: 'A fost adoptată Legea nr. 201/2024 privind modificarea Codului de Executare. Noile prevederi simplifică procedura de executare silită și introduce termene mai scurte pentru executarea hotărârilor civile. Executorul judecătoresc are acum obligația de a iniția executarea în termen de 5 zile de la primirea cererii.',
        actNormativ: 'Legea nr. 201/2024 privind modificarea Codului de Executare',
        articol: 'Art. 15, Art. 22',
        affectedCaseIds: JSON.stringify([dosarMariaDivort.id, dosarIonCivil.id]),
        status: 'noua',
      },
    ],
  });

  // ============ ȘABLOANE ============

  await prisma.template.createMany({
    data: [
      {
        nume: 'Cerere de chemare în judecată — Civil',
        categorie: 'cereri_civile',
        continut: '<h1>CERERE DE CHEMARE ÎN JUDECATĂ</h1><p><strong>Instanța:</strong> {{instanta}}</p><p><strong>Reclamant:</strong> {{nume_client}}, IDNP {{idnp}}, domiciliat: {{adresa}}</p><p><strong>Pârât:</strong> {{nume_parat}}, IDNP {{idnp_parat}}, domiciliat: {{adresa_parat}}</p><p>În temeiul {{articole}}, solicit:</p><ol><li>{{pretentie_1}}</li><li>{{pretentie_2}}</li></ol><p>Motivare: {{motivare}}</p>',
        fields: JSON.stringify(['instanta', 'nume_client', 'idnp', 'adresa', 'nume_parat', 'idnp_parat', 'adresa_parat', 'articole', 'pretentie_1', 'pretentie_2', 'motivare']),
      },
      {
        nume: 'Cerere de divorț',
        categorie: 'familial',
        continut: '<h1>CERERE DE CHEMARE ÎN JUDECATĂ</h1><h2>privind desfacerea căsătoriei</h2><p><strong>Instanța:</strong> {{instanta}}</p><p><strong>Reclamant:</strong> {{nume_client}}, IDNP {{idnp}}</p><p><strong>Pârât:</strong> {{nume_sot}}, IDNP {{idnp_sot}}</p><p>Căsătoria a fost înregistrată la {{data_casatorie}}, certificat nr. {{nr_certificat}}.</p><p>Solicit desfacerea căsătoriei în temeiul art. 33-36 Codul Familiei RM.</p>',
        fields: JSON.stringify(['instanta', 'nume_client', 'idnp', 'nume_sot', 'idnp_sot', 'data_casatorie', 'nr_certificat']),
      },
      {
        nume: 'Contract de asistență juridică',
        categorie: 'contracte',
        continut: '<h1>CONTRACT DE ASISTENȚĂ JURIDICĂ</h1><p>Nr. {{numar_contract}} din {{data}}</p><p>Între <strong>Av. {{nume_avocat}}</strong>, cabinet individual, și <strong>{{nume_client}}</strong>, IDNP {{idnp}}.</p><p><strong>Obiect:</strong> {{obiect_contract}}</p><p><strong>Onorariu:</strong> {{onorariu}} lei</p>',
        fields: JSON.stringify(['numar_contract', 'data', 'nume_avocat', 'nume_client', 'idnp', 'obiect_contract', 'onorariu']),
      },
      {
        nume: 'Cerere pensie alimentară',
        categorie: 'familial',
        continut: '<h1>CERERE DE CHEMARE ÎN JUDECATĂ</h1><h2>privind stabilirea pensiei de întreținere</h2><p><strong>Instanța:</strong> {{instanta}}</p><p><strong>Reclamant:</strong> {{nume_client}}, IDNP {{idnp}}</p><p><strong>Pârât:</strong> {{nume_parat}}, IDNP {{idnp_parat}}</p><p>Solicit stabilirea pensiei de întreținere pentru {{numar_copii}} copii minori în temeiul art. 75 Codul Familiei.</p>',
        fields: JSON.stringify(['instanta', 'nume_client', 'idnp', 'nume_parat', 'idnp_parat', 'numar_copii']),
      },
    ],
  });

  // ============ CONVERSAȚII AI ============

  await prisma.aIConversation.create({
    data: {
      clientId: maria.id,
      caseId: dosarMariaDivort.id,
      messages: JSON.stringify([
        { role: 'user', content: 'Care sunt termenele de apel în dosarele civile?', time: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() },
        { role: 'assistant', content: 'Conform Codului de Procedură Civilă al Republicii Moldova (art. 362), termenul de apel este de **30 de zile** de la data pronunțării hotărârii. Dacă hotărârea a fost pronunțată în lipsa părții, termenul curge de la data comunicării hotărârii.\n\nPentru dosarul Maria Popescu (2-345/2024), hotărârea a fost pronunțată pe 20.09.2024, deci termenul de apel expiră pe 20.10.2024.', time: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 5000).toISOString() },
      ]),
      sursa: 'dashboard',
      mod: 'lege',
    },
  });

  console.log('✅ Seed complete!');
  console.log(`   📋 ${await prisma.client.count()} clienți`);
  console.log(`   📁 ${await prisma.case.count()} dosare`);
  console.log(`   📄 ${await prisma.document.count()} documente`);
  console.log(`   📧 ${await prisma.email.count()} emailuri`);
  console.log(`   ⏰ ${await prisma.deadline.count()} termene`);
  console.log(`   🔔 ${await prisma.legislativeAlert.count()} alerte legislative`);
  console.log(`   💬 ${await prisma.conversation.count()} conversații`);
  console.log(`   ⏱  ${await prisma.timeEntry.count()} înregistrări timp`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
