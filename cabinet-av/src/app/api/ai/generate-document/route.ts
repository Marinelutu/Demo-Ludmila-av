import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { detectTemplateId, generateDocument, templateTextToHtml } from '@/lib/document-templates';

const SYSTEM_PROMPT = `Ești un asistent juridic specializat în dreptul Republicii Moldova. Generezi documente juridice profesionale în limba română, conform legislației moldovenești în vigoare.

REGULI DE FORMATARE — OBLIGATORII:
- Output: EXCLUSIV HTML SEMANTIC, curat. Folosește tag-uri structurale reale (h1, h2, h3, p, ol, ul, li, table, strong, em). NU folosi stiluri inline (style="..."), NU folosi clase CSS, NU folosi <div> de layout. Formatarea vizuală (font Times New Roman, A4, centrări, spațieri) este aplicată automat de aplicație pe baza tag-urilor semantice.
- NU pune niciodată \`\`\`html sau \`\`\` în output. Doar HTML pur.
- NU pune tag-uri <html>, <head>, <body>, <style>.
- Documentul TREBUIE să aibă o structură vizibilă și ierarhică: titlu principal, secțiuni, subpuncte, liste numerotate. Niciodată "text aruncat pe pagină".

STRUCTURA OBLIGATORIE A DOCUMENTULUI JURIDIC (folosind tag-uri semantice):

1. ANTETUL INSTANȚEI — primul element, paragraf cu denumirea și adresa instanței:
   <p><strong>Denumirea instanței</strong><br>Adresa instanței</p>

2. BLOCUL PĂRȚILOR — fiecare parte pe paragraf separat, eticheta în bold:
   <p><strong>Reclamant:</strong> Nume Prenume<br>IDNP: ...<br>Domiciliu: ...</p>
   <p><strong>Pârât:</strong> Nume Prenume<br>IDNP: ...<br>Domiciliu: ...</p>

3. TITLUL DOCUMENTULUI — cu <h1> (majuscule), subtitlul cu <h2>:
   <h1>CERERE DE APEL</h1>
   <h2>conform art. ... CPC RM</h2>

4. CORPUL TEXTULUI — paragrafe normale <p>...</p>.

5. SECȚIUNILE NUMEROTATE — cu <h3>:
   <h3>I. ÎN FAPT</h3>
   <h3>II. ÎN DREPT</h3>

6. LISTELE / PETITUL — liste numerotate reale:
   <ol><li>primul capăt de cerere;</li><li>al doilea capăt de cerere;</li></ol>
   Pentru enumerări fără ordine, folosește <ul><li>...</li></ul>.

7. TABELE — când datele se pretează la tabel (ex: calcul sume, anexe), folosește <table> real cu <thead>/<tbody>, <tr>, <th>, <td>.

8. BLOCUL DE SEMNĂTURĂ — la final, paragraf cu data și semnătura:
   <p>Data: _________________</p>
   <p>Semnătura: _________________</p>

DOUĂ TIPURI DE CÂMPURI NECOMPLETATE — distincție strictă:

TIP 1 — LINIE GOALĂ (_________________):
Folosești "_________________" pentru câmpuri pe care avocatul LE VA COMPLETA MANUAL și care nu pot fi deduse din niciun context:
- Semnătura, ștampila, data semnării
- Numărul dosarului (dacă nu e furnizat)
- Date de contact (telefon, email) necunoscute
- Sume exacte nespecificate

TIP 2 — GALBEN (needs-confirmation):
Folosești <span class="needs-confirmation" data-reason="MOTIV SPECIFIC">VALOAREA PRESUPUSĂ</span> pentru orice valoare pe care TU O COMPLETEZI bazat pe context, dar care necesită verificare:
- Articole de lege pe care le-ai ales tu (ex: <span class="needs-confirmation" data-reason="Verificați dacă art. 374 CPC este aplicabil în acest caz">art. 374 CPC RM</span>)
- Instanța dedusă din adresa clientului (ex: <span class="needs-confirmation" data-reason="Instanță dedusă din adresa clientului — verificați competența teritorială">Judecătoria Centru</span>)
- Termene legale calculate de tine (ex: <span class="needs-confirmation" data-reason="Termen calculat — verificați dacă nu a expirat">30 de zile</span>)
- Calificarea juridică a faptelor (ex: <span class="needs-confirmation" data-reason="Natură juridică presupusă — confirmați cu avocatul">răspundere contractuală</span>)
- Orice sumă sau dată pe care ai estimat-o

REGULA DE AUR: Dacă AI-ul SCRIE o valoare concretă (nu lasă blank), acea valoare TREBUIE să fie galbenă dacă nu e 100% certă din datele furnizate. Nu lăsa valori scrise de AI fără marcaj galben dacă există vreo incertitudine.

REGULI JURIDICE:
1. Terminologie juridică corectă moldovenească
2. Citezi articolele exacte din codurile relevante — și le marchezi cu galben dacă nu ești sigur
3. Structura formală respectată strict, cu titluri, secțiuni și liste numerotate clar delimitate

Output: NUMAI HTML semantic (h1, h2, h3, p, ol, ul, li, table, strong, em + span.needs-confirmation). Fără stiluri inline, fără comentarii, fără explicații, fără bloc de cod markdown.`;

const CONTRACT_SYSTEM_PROMPT = `Ești un asistent juridic specializat în dreptul Republicii Moldova. Redactezi CONTRACTE între un cabinet de avocat și clientul său, în limba română, conform legislației moldovenești (Codul civil al RM, Legea cu privire la avocatură nr. 1260/2002).

REGULI DE FORMATARE — OBLIGATORII:
- Output: EXCLUSIV HTML SEMANTIC, curat. Folosește h1, h2, h3, p, ol, ul, li, table, strong, em. NU folosi stiluri inline (style="..."), NU clase CSS (excepție: span.needs-confirmation), NU <div> de layout, NU <html>/<head>/<body>/<style>.
- NU pune niciodată \`\`\`html sau \`\`\` în output. Doar HTML pur.

STRUCTURA OBLIGATORIE A CONTRACTULUI (cu tag-uri semantice):
1. TITLU — <h1>CONTRACT DE ASISTENȚĂ JURIDICĂ</h1> (sau tipul indicat), urmat de <p> cu numărul și data: <p><strong>Nr. ...</strong> din data de ...</p>
2. PĂRȚILE — două paragrafe, etichete în bold:
   <p><strong>PRESTATOR:</strong> [Cabinetul de avocat] — sediu ..., cod fiscal ..., reprezentat prin avocat ...</p>
   <p><strong>BENEFICIAR (Client):</strong> Nume Prenume, IDNP ..., domiciliu ...</p>
3. <h3>1. OBIECTUL CONTRACTULUI</h3> — descrie serviciile juridice pe baza contextului (natura cauzei, dosar). Dacă obiectul nu e clar din date, formulează generic și marchează-l galben.
4. <h3>2. ONORARIUL ȘI MODALITATEA DE PLATĂ</h3> — folosește onorariul furnizat; dacă lipsește, lasă linie goală sau marchează galben.
5. <h3>3. DREPTURILE ȘI OBLIGAȚIILE PĂRȚILOR</h3> — liste <ol>/<ul> reale, separat pentru fiecare parte.
6. <h3>4. CONFIDENȚIALITATEA</h3>
7. <h3>5. DURATA CONTRACTULUI</h3>
8. <h3>6. RĂSPUNDEREA PĂRȚILOR</h3>
9. <h3>7. SOLUȚIONAREA LITIGIILOR</h3> — instanțele RM / mediere.
10. <h3>8. DISPOZIȚII FINALE</h3> — număr de exemplare, intrare în vigoare.
11. BLOCUL DE SEMNĂTURĂ — la final, un tabel sau două coloane: PRESTATOR (semnătură, ștampilă) și BENEFICIAR (semnătură).

DOUĂ TIPURI DE CÂMPURI NECOMPLETATE:
- LINIE GOALĂ "_________________": pentru ce va completa manual avocatul (semnături, date necunoscute, sume nespecificate).
- GALBEN: <span class="needs-confirmation" data-reason="MOTIV">VALOARE PRESUPUSĂ</span> pentru orice valoare dedusă din context (obiect presupus, termene, clauze opționale). REGULA DE AUR: orice valoare scrisă de tine care nu e 100% certă din datele furnizate TREBUIE marcată galben.

Folosește DOAR datele furnizate. Nu inventa IDNP, adrese, sume. Output: NUMAI HTML semantic. Fără explicații, fără markdown.`;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'API key lipsă' }), { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { tip, clientDetails, caseDetails, descriere, mode } = await req.json();

  // Contract path: generare cu prompt dedicat de contract (părți, obiect,
  // onorariu, clauze), incluzând datele cabinetului din setări. Ocolește
  // detectarea de șabloane (care e pentru cereri/acte de instanță).
  if (mode === 'contract') {
    const settings = await prisma.appSettings.findUnique({ where: { id: 1 } }).catch(() => null);
    const cabinet = [
      settings?.numeCabinet ? `Denumire cabinet: ${settings.numeCabinet}` : '',
      settings?.adresaSediu ? `Sediu: ${settings.adresaSediu}` : '',
      settings?.codFiscal ? `Cod fiscal: ${settings.codFiscal}` : '',
      settings?.hourlyRate ? `Tarif orar de referință: ${settings.hourlyRate} lei/h` : '',
    ].filter(Boolean).join('\n');

    const contractPrompt = `Tip contract: ${tip || 'Contract de asistență juridică'}

PRESTATOR (cabinetul de avocat):
${cabinet || 'Date cabinet nespecificate'}

BENEFICIAR (clientul):
${clientDetails ? `${clientDetails.prenume || ''} ${clientDetails.nume || ''}`.trim() : 'Nespecificat'}
IDNP: ${clientDetails?.idnp || 'nespecificat'}
Domiciliu: ${clientDetails?.adresa || 'nespecificat'}
Telefon: ${clientDetails?.telefon || 'nespecificat'}
Email: ${clientDetails?.email || 'nespecificat'}

${caseDetails ? `Dosar asociat: ${caseDetails.numar || ''} — ${caseDetails.denumire || ''} (${caseDetails.tip || ''}), instanța ${caseDetails.instanta || 'nespecificată'}` : ''}

Context (obiectul serviciilor, onorariu, condiții — extras din consultații, notițe și câmpurile introduse):
${descriere || 'Fără context suplimentar.'}

Redactează contractul complet în HTML semantic.`;

    const stream = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: CONTRACT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: contractPrompt }],
      stream: true,
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
              );
            }
          }
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  // Template path: if the requested type maps to a known template, use
  // deterministic slot-extraction + render instead of free-form generation.
  const templateId = detectTemplateId(`${tip || ''} ${descriere || ''}`);
  if (templateId) {
    try {
      const context = [
        clientDetails ? `Client: ${[clientDetails.prenume, clientDetails.nume].filter(Boolean).join(' ')}` : '',
        clientDetails?.idnp ? `IDNP: ${clientDetails.idnp}` : '',
        clientDetails?.adresa ? `Domiciliu: ${clientDetails.adresa}` : '',
        clientDetails?.telefon ? `Telefon: ${clientDetails.telefon}` : '',
        clientDetails?.email ? `Email: ${clientDetails.email}` : '',
        caseDetails ? `Dosar: ${caseDetails.numar || ''} — ${caseDetails.denumire || ''} (instanța: ${caseDetails.instanta || 'necunoscută'}${caseDetails.judecator ? `, judecător: ${caseDetails.judecator}` : ''})` : '',
        caseDetails?.descriere ? `Descriere dosar: ${caseDetails.descriere}` : '',
        descriere ? `Context suplimentar: ${descriere}` : '',
      ].filter(Boolean).join('\n');

      const { text } = await generateDocument(templateId, context, anthropic);
      const html = templateTextToHtml(text);
      const payload = `data: ${JSON.stringify({ text: html })}\n\ndata: [DONE]\n\n`;
      return new Response(payload, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } catch (err) {
      console.error('template generation failed, falling back to free-form:', err);
    }
  }

  const userPrompt = `Tip document: ${tip || 'Cerere'}
Client: ${clientDetails ? `${clientDetails.prenume} ${clientDetails.nume}, IDNP ${clientDetails.idnp || 'nespecificat'}, adresa ${clientDetails.adresa || 'nespecificată'}` : 'Nespecificat'}
Dosar: ${caseDetails ? `${caseDetails.numar} la ${caseDetails.instanta || 'instanță nespecificată'}, judecător ${caseDetails.judecator || 'nespecificat'}` : 'Nespecificat'}
Context: ${descriere || 'Fără context suplimentar'}

Generează documentul complet în HTML.`;

  const stream = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
    stream: true,
  });

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
            );
          }
        }
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
