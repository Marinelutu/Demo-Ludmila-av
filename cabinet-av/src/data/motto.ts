export const mottoZilnic = [
  { text: 'Dreptatea nu e doar o profesie, e o vocație.', autor: 'Proverb juridic' },
  { text: 'Legea trebuie să fie vocea rațiunii, nu a puterii.', autor: 'Montesquieu' },
  { text: 'Cel mai bun avocat e cel care previne procesul.', autor: 'Abraham Lincoln' },
  { text: 'Justiția fără forță e neputincioasă; forța fără justiție e tiranie.', autor: 'Blaise Pascal' },
  { text: 'Un avocat bun cunoaște legea; un avocat excelent cunoaște judecătorul.', autor: 'Proverb juridic' },
  { text: 'Dreptul este arta binelui și a echității.', autor: 'Ulpian' },
  { text: 'Nimeni nu este deasupra legii.', autor: 'Theodore Roosevelt' },
  { text: 'Fiecare zi este o oportunitate de a face dreptate.', autor: 'Ruth Bader Ginsburg' },
  { text: 'Dreptatea întârziată este dreptate refuzată.', autor: 'William Gladstone' },
  { text: 'Un avocat fără cărți e ca un muncitor fără unelte.', autor: 'Thomas Jefferson' },
  { text: 'Secretul succesului este constanța scopului.', autor: 'Benjamin Disraeli' },
  { text: 'Excelența nu este un act, ci un obicei.', autor: 'Aristotel' },
  { text: 'Legile sunt păianjeni prin care trec muștele mari.', autor: 'Honoré de Balzac' },
  { text: 'Unde nu-i lege, nu-i nici dreptate.', autor: 'Proverb românesc' },
  { text: 'Cunoașterea legii este calea spre libertate.', autor: 'Cicero' },
  { text: 'Avocatul este prima persoană care apără drepturile omului.', autor: 'Proverb juridic' },
  { text: 'Planificarea de azi este succesul de mâine.', autor: 'Alan Lakein' },
  { text: 'Nu există vânt favorabil pentru cel care nu știe unde merge.', autor: 'Seneca' },
  { text: 'Detaliile nu sunt detalii. Ele fac designul.', autor: 'Charles Eames' },
  { text: 'Simplitatea este sofisticarea supremă.', autor: 'Leonardo da Vinci' },
  { text: 'Cea mai bună modalitate de a prezice viitorul este să-l creezi.', autor: 'Peter Drucker' },
  { text: 'Succesul e suma micilor eforturi, repetate zi de zi.', autor: 'Robert Collier' },
  { text: 'Fiecare client merită toată atenția pe care o poți oferi.', autor: 'Proverb juridic' },
  { text: 'Profesionalismul este făcut din detalii.', autor: 'Proverb juridic' },
  { text: 'Legea e rațiunea fără pasiune.', autor: 'Aristotel' },
  { text: 'Un dosar bine organizat e jumătate din victorie.', autor: 'Proverb juridic' },
  { text: 'Timpul este cel mai prețios capital al unui avocat.', autor: 'Proverb juridic' },
  { text: 'Dreptatea e coloana vertebrală a societății.', autor: 'Proverb latinesc' },
  { text: 'Curajul nu înseamnă lipsa fricii, ci acțiunea în ciuda ei.', autor: 'Nelson Mandela' },
  { text: 'Fiecare proces începe cu o conversație.', autor: 'Proverb juridic' },
  { text: 'Competența inspiră încredere.', autor: 'Proverb juridic' },
  { text: 'Ordinea e prima lege a cerului.', autor: 'Alexander Pope' },
];

export function getMottoZilnic(): typeof mottoZilnic[0] {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  return mottoZilnic[dayOfYear % mottoZilnic.length];
}
