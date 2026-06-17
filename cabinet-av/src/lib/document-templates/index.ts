import Anthropic from '@anthropic-ai/sdk';
import { cerereDivortTemplate, type CerereDivortData } from './cerere-divort';
import type { DocumentTemplate, TemplateData } from './types';

// Registry — add new templates here
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TEMPLATES: Record<string, DocumentTemplate<any>> = {
  'cerere-divort': cerereDivortTemplate,
};

// Keywords that map user input to a template id
const TEMPLATE_KEYWORDS: Array<{ keywords: string[]; id: string }> = [
  { keywords: ['divort', 'divorț', 'casatorie', 'căsătorie', 'desfacere'], id: 'cerere-divort' },
];

export function detectTemplateId(input: string): string | null {
  const lower = input.toLowerCase();
  for (const { keywords, id } of TEMPLATE_KEYWORDS) {
    if (keywords.some(k => lower.includes(k))) return id;
  }
  return null;
}

export interface GeneratedDocument {
  text: string;
  missingFields: string[];
  templateId: string;
}

/**
 * Extract slots from client data using tool_use (step E),
 * then render deterministically via template (step B).
 */
export async function generateDocument(
  templateId: string,
  clientContext: string,
  anthropic: Anthropic,
): Promise<GeneratedDocument> {
  const template = TEMPLATES[templateId];
  if (!template) throw new Error(`Template necunoscut: ${templateId}`);

  // Build tool schema for this template
  const properties: Record<string, unknown> = {};
  for (const [field, meta] of Object.entries(template.toolSchema)) {
    if (meta.type === 'array') {
      properties[field] = {
        type: 'array',
        description: meta.description,
        items: { type: 'object', additionalProperties: true },
      };
    } else if (meta.nullable) {
      properties[field] = {
        type: ['string', 'null'],
        description: meta.description,
      };
    } else {
      properties[field] = {
        type: meta.type,
        description: meta.description,
      };
    }
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    temperature: 0,
    system: `Ești un extractor de date juridice. Analizezi datele unui client și extragi câmpurile solicitate.

REGULI STRICTE:
1. Extrage DOAR valori care există EXPLICIT în datele furnizate
2. Dacă o valoare nu există sau e marcată "[DE VERIFICAT: ...]" sau "[DE COMPLETAT]" → returnează null
3. Nu inventa, nu presupune, nu completa din context general
4. Valorile marcate "[DE VERIFICAT: X]" înseamnă că X e în baza de date dar NECONFIRMAT — returnează null pentru acele câmpuri
5. Copii minori: extrage DOAR dacă există explicit nume + dată naștere. Dacă există doar vârsta, pune varsta dar null la celelalte`,
    tools: [{
      name: 'extrage_date_document',
      description: `Extrage câmpurile necesare pentru documentul: ${template.titlu}`,
      input_schema: {
        type: 'object' as const,
        properties,
        required: template.requiredFields as string[],
      },
    }],
    tool_choice: { type: 'tool', name: 'extrage_date_document' },
    messages: [{
      role: 'user',
      content: `Extrage câmpurile pentru "${template.titlu}" din datele de mai jos:\n\n${clientContext}`,
    }],
  });

  // Parse tool_use response
  const toolUse = response.content.find(b => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Modelul nu a returnat date structurate');
  }

  const extracted = toolUse.input as TemplateData;

  // Identify missing required fields
  const missingFields: string[] = [];
  for (const field of template.requiredFields as string[]) {
    if (!extracted[field]) missingFields.push(field);
  }

  // Extract meta — use explicit "judecător: X" label only, avoid matching inside "Judecătoria"
  const instanta = (clientContext.match(/instanța?:\s*([^\n]+)/i)?.[1]?.split('|')[0].trim() || 'Judecătoria competentă');
  const dosar = clientContext.match(/[Dd]osar(?:ul)?\s+(?:nr\.?\s*)?([A-Za-z0-9-]+\/\d+)/)?.[1] || undefined;
  const judecator = clientContext.match(/(?<![a-zăâîșț])judecător(?:ul)?:\s*([^\n|]+)/i)?.[1]?.trim() || undefined;

  const text = template.render(extracted as unknown as CerereDivortData, { instanta, dosar, judecator });

  return { text, missingFields, templateId };
}

export { TEMPLATES };
