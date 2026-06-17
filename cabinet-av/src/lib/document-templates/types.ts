export interface Persoana {
  nume: string;
  prenume: string;
  idnp: string | null;
  domiciliu: string | null;
  telefon?: string | null;
  email?: string | null;
  reprezentant?: string | null;
  contract_reprezentare?: string | null;
}

export interface Copil {
  nume_complet: string | null;
  data_nasterii: string | null;
  idnp: string | null;
  varsta?: string | null;
}

export interface BunComun {
  descriere: string;
  valoare: string | null;
  adresa?: string | null;
}

export interface ArticolLegal {
  cod: string;
  articol: string;
  descriere: string;
}

export type TemplateData = Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DocumentTemplate<T = any> {
  id: string;
  titlu: string;
  // Fields the LLM must extract — null = not found in data
  toolSchema: Record<string, { type: string; description: string; nullable?: boolean }>;
  requiredFields: (keyof T)[];
  render: (data: T, meta: { instanta: string; judecator?: string; dosar?: string }) => string;
}
