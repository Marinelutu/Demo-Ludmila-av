import type { DocumentTemplate } from './types';

export interface CerereDivortData {
  reclamant_nume: string;
  reclamant_idnp: string | null;
  reclamant_dob: string | null;
  reclamant_domiciliu: string | null;
  reclamant_telefon: string | null;
  reclamant_email: string | null;
  reclamant_reprezentant: string | null;
  reclamant_contract: string | null;

  parat_nume: string | null;
  parat_idnp: string | null;
  parat_domiciliu: string | null;

  casatorie_data: string | null;
  casatorie_nr_certificat: string | null;

  copii: Array<{
    nume_complet: string | null;
    data_nasterii: string | null;
    idnp: string | null;
    varsta: string | null;
  }>;

  bunuri_comune: Array<{
    descriere: string;
    valoare: string | null;
  }>;

  valoare_litigiu: string | null;
  motive_divort: string | null;
  situatie_procesuala: string | null;
  documente_anexate: string[];
}

const DC = '[DE COMPLETAT]';

function fmt(val: string | null | undefined): string {
  return val?.trim() || DC;
}

function renderCopii(copii: CerereDivortData['copii']): string {
  if (!copii || copii.length === 0) return `— Niciun copil minor înregistrat`;
  return copii.map((c, i) =>
    `${i + 1}. Copil minor: ${fmt(c.nume_complet)}, născut la ${fmt(c.data_nasterii)}, IDNP: ${fmt(c.idnp)}${c.varsta ? `, vârsta: ${c.varsta}` : ''}`
  ).join('\n');
}

function renderBunuri(bunuri: CerereDivortData['bunuri_comune']): string {
  if (!bunuri || bunuri.length === 0) return `— ${DC}`;
  return bunuri.map(b =>
    `— ${b.descriere}${b.valoare ? `, evaluat la ${b.valoare}` : ''}`
  ).join('\n');
}

export const cerereDivortTemplate: DocumentTemplate<CerereDivortData> = {
  id: 'cerere-divort',
  titlu: 'Cerere de divorț',
  requiredFields: ['reclamant_nume', 'reclamant_domiciliu'],

  toolSchema: {
    reclamant_nume:         { type: 'string',  description: 'Numele complet al reclamantei (prenume + nume)' },
    reclamant_idnp:         { type: 'string',  description: 'IDNP-ul reclamantei, 13 cifre', nullable: true },
    reclamant_dob:          { type: 'string',  description: 'Data nașterii reclamantei DD.MM.YYYY', nullable: true },
    reclamant_domiciliu:    { type: 'string',  description: 'Adresa domiciliului reclamantei', nullable: true },
    reclamant_telefon:      { type: 'string',  description: 'Telefonul reclamantei', nullable: true },
    reclamant_email:        { type: 'string',  description: 'Email-ul reclamantei', nullable: true },
    reclamant_reprezentant: { type: 'string',  description: 'Avocatul reprezentant (ex: Av. Ludmila Trofim)', nullable: true },
    reclamant_contract:     { type: 'string',  description: 'Numărul și data contractului de asistență juridică', nullable: true },
    parat_nume:             { type: 'string',  description: 'Numele complet al pârâtului', nullable: true },
    parat_idnp:             { type: 'string',  description: 'IDNP-ul pârâtului — caută în toate documentele dosarului', nullable: true },
    parat_domiciliu:        { type: 'string',  description: 'Domiciliul pârâtului — caută în toate documentele dosarului', nullable: true },
    casatorie_data:         { type: 'string',  description: 'Data încheierii căsătoriei DD.MM.YYYY', nullable: true },
    casatorie_nr_certificat:{ type: 'string',  description: 'Numărul certificatului de căsătorie — null dacă nu e confirmat', nullable: true },
    copii:                  { type: 'array',   description: 'Lista copiilor minori cu nume, data nașterii, IDNP, vârstă' },
    bunuri_comune:          { type: 'array',   description: 'Lista bunurilor comune cu descriere și valoare estimată' },
    valoare_litigiu:        { type: 'string',  description: 'Valoarea totală a litigiului în lei', nullable: true },
    motive_divort:          { type: 'string',  description: 'Motivele deteriorării relației, din consultații sau note', nullable: true },
    situatie_procesuala:    { type: 'string',  description: 'Stadiul procesual actual — hotărâri, apeluri existente', nullable: true },
    documente_anexate:      { type: 'array',   description: 'Lista documentelor care se anexează la cerere' },
  },

  render(data, meta) {
    const copiiSection = renderCopii(data.copii);
    const bunuriSection = renderBunuri(data.bunuri_comune);
    const nrCopii = data.copii?.length ?? 0;

    return `CERERE DE CHEMARE ÎN JUDECATĂ
privind desfacerea căsătoriei${nrCopii > 0 ? ', stabilirea domiciliului copilului minor' : ''}${data.bunuri_comune?.length > 0 ? ' și partajul bunurilor comune' : ''}

Instanța: ${meta.instanta}${meta.dosar ? `\nDosar nr.: ${meta.dosar}` : ''}${meta.judecator ? `\nJudecător: ${meta.judecator}` : ''}


I. DATELE PĂRȚILOR

RECLAMANTĂ:
Nume și prenume: ${fmt(data.reclamant_nume)}
IDNP: ${fmt(data.reclamant_idnp)}
Data nașterii: ${fmt(data.reclamant_dob)}
Domiciliu: ${fmt(data.reclamant_domiciliu)}${data.reclamant_telefon ? `\nTelefon: ${data.reclamant_telefon}` : ''}${data.reclamant_email ? `\nEmail: ${data.reclamant_email}` : ''}${data.reclamant_reprezentant ? `\nReprezentată de: ${data.reclamant_reprezentant}` : ''}${data.reclamant_contract ? `\nContract de asistență juridică: ${data.reclamant_contract}` : ''}

PÂRÂT:
Nume și prenume: ${fmt(data.parat_nume)}
IDNP: ${fmt(data.parat_idnp)}
Domiciliu: ${fmt(data.parat_domiciliu)}
Telefon: ${DC}
Email: ${DC}


II. OBIECTUL CERERII

Prezenta cerere are ca obiect:
1. Desfacerea căsătoriei înregistrate la data de ${fmt(data.casatorie_data)}, nr. certificat: ${fmt(data.casatorie_nr_certificat)};${nrCopii > 0 ? `\n2. Stabilirea domiciliului copilului/copiilor minori la domiciliul reclamantei;` : ''}${data.bunuri_comune?.length > 0 ? `\n${nrCopii > 0 ? '3' : '2'}. Partajul bunurilor comune dobândite în timpul căsătoriei;` : ''}

Valoarea litigiului: ${fmt(data.valoare_litigiu)}


III. SITUAȚIA DE FAPT

1. Reclamanta ${fmt(data.reclamant_nume)} și pârâtul ${fmt(data.parat_nume)} au încheiat căsătoria la data de ${fmt(data.casatorie_data)}, înregistrată cu nr. ${fmt(data.casatorie_nr_certificat)}.

${nrCopii > 0 ? `2. Din căsătoria părților au rezultat următorii copii minori:\n${copiiSection}\n\n3. Relațiile de familie s-au deteriorat iremediabil.${data.motive_divort ? ` ${data.motive_divort}` : ''}\n\n4. Reclamanta solicită stabilirea domiciliului copilului/copiilor minori la domiciliul său, ${fmt(data.reclamant_domiciliu)}, asigurând condițiile necesare pentru creșterea și educarea acestora.` :
`2. Relațiile de familie s-au deteriorat iremediabil.${data.motive_divort ? ` ${data.motive_divort}` : ''}`}

${data.bunuri_comune?.length > 0 ? `\n${nrCopii > 0 ? '5' : '3'}. Pe parcursul căsătoriei, soții au dobândit în comun următoarele bunuri:\n${bunuriSection}\nPârâtul contestă modalitatea de partaj, fapt ce necesită intervenția instanței.` : ''}

${data.situatie_procesuala ? `\nSituația procesuală actuală: ${data.situatie_procesuala}` : ''}


IV. TEMEIUL JURIDIC

— Art. 33 din Codul Familiei al Republicii Moldova — bunurile comune ale soților
— Art. 36 din Codul Familiei al Republicii Moldova — desfacerea căsătoriei${nrCopii > 0 ? '\n— Art. 78 din Codul Familiei al Republicii Moldova — stabilirea domiciliului copilului minor' : ''}
— Codul de Procedură Civilă al Republicii Moldova, art. 166-168


V. SOLICITĂRI

Reclamanta ${fmt(data.reclamant_nume)} solicită instanței:

1. Admiterea prezentei cereri.
2. Desfacerea căsătoriei nr. ${fmt(data.casatorie_nr_certificat)} din ${fmt(data.casatorie_data)} dintre ${fmt(data.reclamant_nume)} și ${fmt(data.parat_nume)}.${nrCopii > 0 ? `\n3. Stabilirea domiciliului copilului/copiilor minori la domiciliul reclamantei, ${fmt(data.reclamant_domiciliu)}.\n4. Obligarea pârâtului la plata pensiei de întreținere în cuantumul prevăzut de lege.` : ''}${data.bunuri_comune?.length > 0 ? `\n${nrCopii > 0 ? '5' : '3'}. Partajul bunurilor comune, cu atribuirea cotei cuvenite reclamantei.` : ''}
${data.bunuri_comune?.length > 0 ? `${nrCopii > 0 ? '6' : '4'}. Efectuarea verificărilor la registrul bunurilor imobile și mobile în vederea identificării integrale a patrimoniului comun.` : ''}
${nrCopii > 0 ? `${data.bunuri_comune?.length > 0 ? '7' : '5'}` : `${data.bunuri_comune?.length > 0 ? '5' : '3'}`}. Obligarea pârâtului la suportarea cheltuielilor de judecată.


VI. DOCUMENTE ANEXATE

${data.documente_anexate?.length > 0
  ? data.documente_anexate.map((d: unknown, i: number) => `${i + 1}. ${typeof d === 'string' ? d : (typeof d === 'object' && d !== null ? Object.values(d).join(' ') : String(d))}`).join('\n')
  : `1. Copia buletinului de identitate al reclamantei\n2. Certificatul de căsătorie\n${nrCopii > 0 ? '3. Certificatele de naștere ale copiilor minori\n4. Dovada achitării taxei de stat' : '3. Dovada achitării taxei de stat'}`}


VII. SEMNĂTURI

Data depunerii: ${DC}

Reclamantă,
${fmt(data.reclamant_nume)}
Semnătură: ___________________________

${data.reclamant_reprezentant ? `Reprezentant legal,\n${data.reclamant_reprezentant}\nCabinet individual de avocat\nSemnătură: ___________________________\nȘtampilă: ___________________________` : ''}`;
  },
};
